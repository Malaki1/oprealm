import { processQueuedSceneImageJob } from "./story-scene-images.js";
import { json } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  const suppliedSecret = request.headers.get("x-oprealm-queue-secret") || "";
  if (!env.OPREALM_QUEUE_SECRET || suppliedSecret !== env.OPREALM_QUEUE_SECRET) {
    return json({ ok: false, error: "Queue worker authentication failed." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const jobId = String(body.jobId || "").trim();
  if (!jobId) return json({ ok: false, error: "Missing queued job id." }, 400);

  try {
    const result = await processQueuedSceneImageJob(env, jobId, {
      finalAttempt: request.headers.get("x-oprealm-final-attempt") === "true",
    });
    return json(result);
  } catch (error) {
    const status = Number(error?.status || 0);
    return json({
      ok: false,
      error: error.message || "Queued scene image generation failed.",
      retryable: status === 408 || status === 409 || status === 429 || status >= 500,
    }, status || 500);
  }
}
