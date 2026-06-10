import { requireUser } from "../_lib/auth.js";

const SCENE_VIDEO_TOOL = "story_scene_video";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.OPREALM_DB || !env.OPREALM_ASSETS) return text("Video storage is not connected.", 500);

    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const jobId = cleanText(url.searchParams.get("id") || "", 120);
    if (!jobId) return text("Missing video id.", 400);

    const job = await env.OPREALM_DB.prepare(
      `
        SELECT result_json
        FROM generation_jobs
        WHERE id = ?
          AND web_user_id = ?
          AND tool = ?
          AND status = 'completed'
        LIMIT 1
      `,
    )
      .bind(jobId, user.id, SCENE_VIDEO_TOOL)
      .first();
    const result = safeJson(job?.result_json) || {};
    if (!result.r2Key) return text("Video was not found.", 404);

    const object = await env.OPREALM_ASSETS.get(result.r2Key);
    if (!object) return text("Video file was not found.", 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("content-type", headers.get("content-type") || "video/mp4");
    headers.set("cache-control", "private, max-age=3600");
    headers.set("accept-ranges", "bytes");
    return new Response(object.body, { headers });
  } catch (error) {
    return text(error.message || "Could not load video.", error.status || 500);
  }
}

function text(message, status) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function safeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
