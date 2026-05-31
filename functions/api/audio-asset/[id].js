export async function onRequestGet({ params, request, env }) {
  const access = await resolveAudioLibraryAccess(request, env);

  if (!access.canAccess) {
    return json({ ok: false, error: "Elite membership is required" }, 403);
  }

  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const id = params.id;
  let asset = await env.OPREALM_DB.prepare(
    "SELECT id, r2_key, discord_attachment_url FROM sfx_assets WHERE id = ? LIMIT 1",
  )
    .bind(id)
    .first();

  if (!asset) {
    asset = await env.OPREALM_DB.prepare(
      "SELECT id, r2_key, discord_attachment_url FROM music_assets WHERE id = ? LIMIT 1",
    )
      .bind(id)
      .first();
  }

  if (!asset) {
    return json({ ok: false, error: "Audio asset not found" }, 404);
  }

  if (asset.r2_key && env.OPREALM_ASSETS) {
    const object = await env.OPREALM_ASSETS.get(asset.r2_key);

    if (object) {
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || "audio/mpeg",
          "cache-control": "private, max-age=300",
        },
      });
    }
  }

  if (asset.discord_attachment_url) {
    return Response.redirect(asset.discord_attachment_url, 302);
  }

  return json({ ok: false, error: "Audio file is not available" }, 404);
}

async function resolveAudioLibraryAccess(request, env) {
  const auth = request.headers.get("authorization") || "";

  if (env.OPREALM_WEBHOOK_SECRET && auth === `Bearer ${env.OPREALM_WEBHOOK_SECRET}`) {
    return { authenticated: true, canAccess: true, canModerate: true, tier: "admin" };
  }

  if (!env.OPREALM_DB) {
    return { authenticated: false, canAccess: false, canModerate: false };
  }

  const sessionId = parseCookies(request.headers.get("cookie") || "").oprealm_audio_session;
  if (!sessionId) return { authenticated: false, canAccess: false, canModerate: false };

  const session = await env.OPREALM_DB.prepare(
    "SELECT * FROM audio_library_sessions WHERE id = ? AND expires_at > datetime('now') LIMIT 1",
  )
    .bind(sessionId)
    .first();

  if (!session) return { authenticated: false, canAccess: false, canModerate: false };

  const member = await env.OPREALM_DB.prepare(
    "SELECT tier FROM members WHERE discord_user_id = ? AND guild_id = ? LIMIT 1",
  )
    .bind(session.discord_user_id, session.guild_id)
    .first();

  const tier = member?.tier || "explorer";
  return {
    authenticated: true,
    canAccess: tier === "pro" || tier === "elite",
    canModerate: false,
    tier,
  };
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
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
