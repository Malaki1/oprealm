import { hasBflKey } from "../../../functions/_lib/bfl-images.js";
import { hasOpenAiKey } from "../../../functions/_lib/ai-gateway.js";
import { processQueuedSceneImageJob } from "../../../functions/api/story-scene-images.js";
import { processQueuedAssetForgeBatch } from "../../../functions/api/asset-forge.js";

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const jobId = String(message.body?.jobId || "").trim();
      if (!jobId) {
        message.ack();
        continue;
      }

      const finalAttempt = Number(message.attempts || 1) >= 5;
      const isAssetForge = message.body?.tool === "asset_forge_batch";
      if (canProcessDirectly(env, isAssetForge)) {
        try {
          const result = isAssetForge
            ? await processQueuedAssetForgeBatch(env, jobId, { finalAttempt })
            : await processQueuedSceneImageJob(env, jobId, { finalAttempt });
          if (result.ok || !result.retryable || finalAttempt) {
            if (result.ok) await clearProviderPause(env);
            message.ack();
          } else {
            retryMessage(message);
          }
        } catch (error) {
          if (isBillingError(error)) await pauseImageProvider(env, error);
          if (!isRetryable(error) || finalAttempt) {
            await failJob(env, jobId, error);
            message.ack();
          } else {
            retryMessage(message);
          }
        }
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);
      let response;
      try {
        response = await fetch(env.OPREALM_INTERNAL_IMAGE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-oprealm-queue-secret": env.OPREALM_QUEUE_SECRET,
            "x-oprealm-final-attempt": finalAttempt ? "true" : "false",
          },
          signal: controller.signal,
          body: JSON.stringify({ jobId }),
        });
      } catch {
        if (finalAttempt) {
          message.ack();
        } else {
          message.retry({ delaySeconds: Math.min(120, 15 * 2 ** Math.max(0, Number(message.attempts || 1) - 1)) });
        }
        continue;
      } finally {
        clearTimeout(timeout);
      }
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        message.ack();
        continue;
      }
      if (!result.retryable || finalAttempt) {
        message.ack();
        continue;
      }
      message.retry({ delaySeconds: Math.min(120, 15 * 2 ** Math.max(0, Number(message.attempts || 1) - 1)) });
    }
  },

  async scheduled(_controller, env) {
    if (!env.OPREALM_DB) return;
    const error = "Image generation stopped before completion. Press Try Again when you are ready.";
    await env.OPREALM_DB.batch([
      env.OPREALM_DB.prepare(
        `
          UPDATE generation_jobs
          SET status = 'failed',
              error = ?,
              updated_at = datetime('now'),
              completed_at = datetime('now')
          WHERE tool = 'story_scene_images'
            AND status = 'processing'
            AND updated_at <= datetime('now', '-6 minutes')
        `,
      ).bind(error),
      env.OPREALM_DB.prepare(
        `
          UPDATE generation_jobs
          SET status = 'failed',
              error = ?,
              updated_at = datetime('now'),
              completed_at = datetime('now')
          WHERE tool = 'story_scene_images'
            AND status = 'queued'
            AND updated_at <= datetime('now', '-15 minutes')
        `,
      ).bind("The image request waited too long in the queue. Press Try Again when you are ready."),
      env.OPREALM_DB.prepare(
        `
          UPDATE generation_jobs
          SET status = 'failed',
              error = ?,
              updated_at = datetime('now'),
              completed_at = datetime('now')
          WHERE tool = 'asset_forge_batch'
            AND status IN ('queued', 'processing')
            AND updated_at <= datetime('now', '-30 minutes')
        `,
      ).bind("The asset batch stopped before completion. Generate the remaining assets again."),
      env.OPREALM_DB.prepare(
        `
          DELETE FROM provider_generation_slots
          WHERE provider IN ('openai_images', 'bfl_images')
            AND lease_expires_at <= unixepoch()
        `,
      ),
    ]);
  },
};

function canProcessDirectly(env, isAssetForge) {
  const providerReady = isAssetForge ? hasOpenAiKey(env) : hasBflKey(env);
  return Boolean(env.OPREALM_DB && env.OPREALM_ASSETS && providerReady);
}

function retryMessage(message) {
  message.retry({
    delaySeconds: Math.min(120, 15 * 2 ** Math.max(0, Number(message.attempts || 1) - 1)),
  });
}

function isRetryable(error) {
  if (isBillingError(error)) return false;
  const status = Number(error?.status || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function isBillingError(error) {
  return /billing hard limit|billing limit|insufficient[_\s-]*(quota|credits)|not enough credits|exceeded.*quota|quota.*exceeded|check your plan and billing/i.test(
    String(error?.message || error?.providerError || ""),
  );
}

async function pauseImageProvider(env, error) {
  if (!env.OPREALM_DB) return;
  const reason = "Image generation is temporarily unavailable while OPRealm restores provider capacity. Your scenes are safe.";
  await env.OPREALM_DB.batch([
    env.OPREALM_DB.prepare(
      `
        INSERT INTO generation_provider_state (provider, status, reason, blocked_until, updated_at)
        VALUES ('bfl_images', 'paused', ?, unixepoch() + 600, datetime('now'))
        ON CONFLICT(provider) DO UPDATE SET
          status = 'paused',
          reason = excluded.reason,
          blocked_until = excluded.blocked_until,
          updated_at = datetime('now')
      `,
    ).bind(reason),
    env.OPREALM_DB.prepare(
      `
        UPDATE generation_jobs
        SET status = 'failed',
            error = ?,
            updated_at = datetime('now'),
            completed_at = datetime('now')
        WHERE tool = 'story_scene_images'
          AND status = 'queued'
      `,
    ).bind(reason),
  ]).catch(() => {});
}

async function clearProviderPause(env) {
  if (!env.OPREALM_DB) return;
  await env.OPREALM_DB.prepare(
    `
      UPDATE generation_provider_state
      SET status = 'available',
          reason = NULL,
          blocked_until = NULL,
          updated_at = datetime('now')
      WHERE provider = 'bfl_images'
    `,
  )
    .run()
    .catch(() => {});
}

async function failJob(env, jobId, error) {
  if (!env.OPREALM_DB) return;
  await env.OPREALM_DB.prepare(
    `
      UPDATE generation_jobs
      SET status = 'failed',
          error = ?,
          updated_at = datetime('now'),
          completed_at = datetime('now')
      WHERE id = ?
        AND status != 'completed'
    `,
  )
    .bind(String(error?.message || "Scene image generation failed.").slice(0, 1000), jobId)
    .run()
    .catch(() => {});
}
