export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("authorization") || "";
  const expected = env.OPREALM_WEBHOOK_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const action = String(body?.action || "");
  const type = body?.type === "music" ? "music" : "sfx";
  const table = type === "music" ? "music_assets" : "sfx_assets";

  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    return json({ ok: false, error: "Invalid asset id" }, 400);
  }

  const updates = {
    approve: {
      review_status: "approved",
      visibility: "shared",
      approved_at: "datetime('now')",
    },
    reject: {
      review_status: "rejected",
      visibility: "private",
      approved_at: "NULL",
    },
    feature: {
      review_status: "featured",
      visibility: "shared",
      approved_at: "datetime('now')",
    },
    delete: {
      review_status: "deleted",
      visibility: "deleted",
      approved_at: "NULL",
    },
  };

  const update = updates[action];

  if (!update) {
    return json({ ok: false, error: "Unsupported moderation action" }, 400);
  }

  const result = await env.OPREALM_DB.prepare(
    `
      UPDATE ${table}
      SET review_status = ?,
          visibility = ?,
          approved_at = ${update.approved_at},
          approved_by = 'admin'
      WHERE id = ?
    `,
  )
    .bind(update.review_status, update.visibility, id)
    .run();

  return json({
    ok: true,
    id,
    action,
    changes: result.meta?.changes || 0,
  });
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
