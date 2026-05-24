import { requireUser } from "../_lib/auth.js";
import { jobResponse } from "../_lib/generation-jobs.js";
import { json } from "../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ ok: false, error: "Missing generation job id." }, 400);

    const job = await env.OPREALM_DB.prepare(
      `
        SELECT *
        FROM generation_jobs
        WHERE id = ?
          AND web_user_id = ?
        LIMIT 1
      `,
    )
      .bind(id, user.id)
      .first();

    if (!job) return json({ ok: false, error: "Generation job was not found." }, 404);
    return json(jobResponse(job));
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not load generation job." }, error.status || 500);
  }
}
