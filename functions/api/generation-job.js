import { requireUser } from "../_lib/auth.js";
import { jobResponse } from "../_lib/generation-jobs.js";
import { json } from "../_lib/http.js";

const SCENE_IMAGE_TOOL = "story_scene_images";
const STALE_PROCESSING_MINUTES = 3;
const STALE_QUEUED_MINUTES = 5;
const MAX_RECOVERY_ATTEMPTS = 3;

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const idempotencyKey = String(url.searchParams.get("idempotencyKey") || "").trim().slice(0, 120);
    const tool = String(url.searchParams.get("tool") || "").trim().slice(0, 80);
    const sceneId = String(url.searchParams.get("sceneId") || "").trim().slice(0, 120);
    const projectFingerprint = String(url.searchParams.get("projectFingerprint") || "").trim().slice(0, 120);
    const preferCompleted = url.searchParams.get("preferCompleted") === "true";
    if (!id && (!tool || (!idempotencyKey && !sceneId))) {
      return json({ ok: false, error: "Missing generation job id." }, 400);
    }

    const job = id
      ? await env.OPREALM_DB.prepare(
        `
          SELECT *
          FROM generation_jobs
          WHERE id = ?
            AND web_user_id = ?
          LIMIT 1
        `,
      )
        .bind(id, user.id)
        .first()
      : sceneId && projectFingerprint && preferCompleted
        ? await env.OPREALM_DB.prepare(
          `
            SELECT *
            FROM generation_jobs
            WHERE web_user_id = ?
              AND tool = ?
              AND status = 'completed'
              AND result_json IS NOT NULL
              AND json_extract(metadata_json, '$.sceneId') = ?
              AND json_extract(metadata_json, '$.projectFingerprint') = ?
            ORDER BY completed_at DESC, updated_at DESC
            LIMIT 1
          `,
        )
          .bind(user.id, tool, sceneId, projectFingerprint)
          .first()
        : await env.OPREALM_DB.prepare(
        `
          SELECT *
          FROM generation_jobs
          WHERE web_user_id = ?
            AND tool = ?
            AND idempotency_key = ?
          LIMIT 1
        `,
      )
        .bind(user.id, tool, idempotencyKey)
        .first();

    if (!job) return json({ ok: false, error: "Generation job was not found." }, 404);
    const reconciledJob = await reconcileStaleSceneImageJob(env, job);
    return json(jobResponse(reconciledJob));
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not load generation job." }, error.status || 500);
  }
}

async function reconcileStaleSceneImageJob(env, job) {
  if (job.tool !== SCENE_IMAGE_TOOL || !["queued", "processing"].includes(job.status)) return job;

  const staleMinutes = job.status === "processing" ? STALE_PROCESSING_MINUTES : STALE_QUEUED_MINUTES;
  const updatedAt = Date.parse(`${job.updated_at || job.created_at || ""}Z`);
  if (Number.isFinite(updatedAt) && Date.now() - updatedAt < staleMinutes * 60 * 1000) return job;
  const metadata = safeJson(job.metadata_json);
  const recoveryAttempts = Number(metadata.recoveryAttempts || 0);
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    const error = "The image provider did not finish this scene after automatic recovery. No duplicate request was created and no Creator credits were charged.";
    await env.OPREALM_DB.prepare(
      `
        UPDATE generation_jobs
        SET status = 'failed',
            error = ?,
            updated_at = datetime('now'),
            completed_at = datetime('now')
        WHERE id = ?
          AND status IN ('queued', 'processing')
      `,
    )
      .bind(error, job.id)
      .run();
    await releaseSceneImageSlot(env, job.id);
    return { ...job, status: "failed", error, completed_at: new Date().toISOString() };
  }

  const result = await env.OPREALM_DB.prepare(
    `
      UPDATE generation_jobs
      SET status = 'queued',
          error = 'Automatically resumed after an interrupted worker.',
          metadata_json = json_set(COALESCE(metadata_json, '{}'), '$.recoveryAttempts', ?),
          updated_at = datetime('now'),
          completed_at = NULL
      WHERE id = ?
        AND status = ?
        AND updated_at <= datetime('now', ?)
    `,
  )
    .bind(recoveryAttempts + 1, job.id, job.status, `-${staleMinutes} minutes`)
    .run();

  if (!result.meta?.changes) return job;
  await releaseSceneImageSlot(env, job.id);
  if (env.OPREALM_GENERATION_QUEUE?.send) {
    await env.OPREALM_GENERATION_QUEUE.send({
      jobId: job.id,
      tool: SCENE_IMAGE_TOOL,
      userId: job.web_user_id,
      createdAt: new Date().toISOString(),
      metadata: { recovered: true },
    }).catch(() => {});
  }
  return {
    ...job,
    status: "queued",
    error: "Automatically resumed after an interrupted worker.",
    updated_at: new Date().toISOString(),
  };
}

async function releaseSceneImageSlot(env, jobId) {
  if (!env.OPREALM_DB) return;
  await env.OPREALM_DB.prepare(
    "DELETE FROM provider_generation_slots WHERE provider = 'bfl_images' AND job_id = ?",
  )
    .bind(jobId)
    .run()
    .catch(() => {});
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
