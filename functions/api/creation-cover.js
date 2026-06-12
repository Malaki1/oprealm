export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB || !env.OPREALM_ASSETS) return text("Cover storage is unavailable.", 500);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-f0-9-]{36}$/i.test(id)) return text("Invalid cover.", 400);

  const creation = await env.OPREALM_DB.prepare(
    `
      SELECT owner_discord_user_id
      FROM public_creations
      WHERE id = ? AND visibility = 'public' AND review_status IN ('approved', 'featured')
      LIMIT 1
    `,
  ).bind(id).first();
  if (!creation?.owner_discord_user_id?.startsWith("web:")) return text("Cover not found.", 404);

  const userId = creation.owner_discord_user_id.slice(4);
  let object = null;
  for (const extension of ["jpg", "png", "webp"]) {
    object = await env.OPREALM_ASSETS.get(`public-creations/${userId}/${id}/cover.${extension}`);
    if (object) break;
  }
  if (!object) return text("Cover not found.", 404);

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "image/jpeg",
      "content-length": String(object.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

function text(message, status) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
