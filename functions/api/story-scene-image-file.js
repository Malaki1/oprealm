import { requireUser } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB || !env.OPREALM_ASSETS) return text("Scene image storage is unavailable.", 500);

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return text(error.message || "Please log in to view this scene image.", error.status || 401);
  }

  const jobId = new URL(request.url).searchParams.get("jobId") || "";
  if (!/^[a-f0-9-]{36}$/i.test(jobId)) return text("Invalid scene image.", 400);

  const job = await env.OPREALM_DB.prepare(
    "SELECT web_user_id, result_json FROM generation_jobs WHERE id = ? AND tool = 'story_scene_images' AND status = 'completed' LIMIT 1",
  )
    .bind(jobId)
    .first();
  if (!job || job.web_user_id !== user.id) return text("Scene image not found.", 404);

  const result = safeJson(job.result_json);
  if (!result?.r2Key) return text("Scene image not found.", 404);
  const object = await env.OPREALM_ASSETS.get(result.r2Key);
  if (!object) return text("Scene image not found.", 404);

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "image/png",
      "cache-control": "private, max-age=31536000, immutable",
      "content-length": String(object.size),
      "x-content-type-options": "nosniff",
    },
  });
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function text(message, status) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
