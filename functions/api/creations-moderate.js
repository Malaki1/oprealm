export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const auth = request.headers.get("authorization") || "";
  if (!env.OPREALM_WEBHOOK_SECRET || auth !== `Bearer ${env.OPREALM_WEBHOOK_SECRET}`) {
    return json({ ok: false, error: "Moderator access is required." }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const id = String(body.id || "").trim();
  const status = sanitizeChoice(body.status, ["approved", "featured", "rejected", "deleted"], "approved");

  if (!id) {
    return json({ ok: false, error: "Missing creation id" }, 400);
  }

  const visibility = status === "deleted" || status === "rejected" ? "hidden" : "public";
  const approvedAt = status === "approved" || status === "featured" ? "datetime('now')" : "NULL";

  const result = await env.OPREALM_DB.prepare(
    `
      UPDATE public_creations
      SET
        review_status = ?,
        visibility = ?,
        approved_at = ${approvedAt},
        updated_at = datetime('now')
      WHERE id = ?
    `,
  )
    .bind(status, visibility, id)
    .run();

  if (!result.meta?.changes) {
    return json({ ok: false, error: "Creation not found" }, 404);
  }

  return json({ ok: true, id, reviewStatus: status });
}

function sanitizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
