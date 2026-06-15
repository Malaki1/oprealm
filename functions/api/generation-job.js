import { requireUser } from "../_lib/auth.js";
import { jobResponse } from "../_lib/generation-jobs.js";
import { json } from "../_lib/http.js";

const SCENE_IMAGE_TOOL = "story_scene_images";
const STALE_PROCESSING_MINUTES = 6;
const STALE_QUEUED_MINUTES = 15;

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
  const error = job.status === "processing"
    ? "Image generation stopped before completion. Press Try Again when you are ready."
    : "The image request waited too long in the queue. Press Try Again when you are ready.";
  const result = await env.OPREALM_DB.prepare(
    `
      UPDATE generation_jobs
      SET status = 'failed',
          error = ?,
          updated_at = datetime('now'),
          completed_at = datetime('now')
      WHERE id = ?
        AND status = ?
        AND updated_at <= datetime('now', ?)
    `,
  )
    .bind(error, job.id, job.status, `-${staleMinutes} minutes`)
    .run();

  if (!result.meta?.changes) return job;
  return { ...job, status: "failed", error, completed_at: new Date().toISOString() };
}
