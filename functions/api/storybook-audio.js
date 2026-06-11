import { requireUser } from "../_lib/auth.js";
import { json } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const id = String(new URL(request.url).searchParams.get("id") || "").trim().slice(0, 120);
    if (!id) return json({ ok: false, error: "Audio file not found." }, 404);
    const record = await env.OPREALM_DB.prepare(`
      SELECT r2_key FROM storybook_audio_beats
      WHERE id = ? AND web_user_id = ? AND status = 'ready'
      LIMIT 1
    `).bind(id, user.id).first();
    if (!record?.r2_key || !env.OPREALM_ASSETS) return json({ ok: false, error: "Audio file not found." }, 404);
    const object = await env.OPREALM_ASSETS.get(record.r2_key);
    if (!object) return json({ ok: false, error: "Audio file not found." }, 404);
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "audio/mpeg",
        "content-length": String(object.size),
        "cache-control": "private, max-age=3600",
        "accept-ranges": "bytes",
      },
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "Audio file could not be loaded." }, error.status || 500);
  }
}
