export async function onRequestGet({ request, env }) {
  const auth = await resolveAudioLibraryAccess(request, env);

  return json({
    ok: true,
    authenticated: auth.authenticated,
    canAccess: auth.canAccess,
    canModerate: auth.canModerate,
    tier: auth.tier || null,
    alias: auth.alias || null,
    reason: auth.reason || null,
  });
}

async function resolveAudioLibraryAccess(request, env) {
  const auth = request.headers.get("authorization") || "";

  if (env.OPREALM_WEBHOOK_SECRET && auth === `Bearer ${env.OPREALM_WEBHOOK_SECRET}`) {
    return { authenticated: true, canAccess: true, canModerate: true, tier: "admin", alias: "Admin" };
  }

  if (!env.OPREALM_DB) {
    return { authenticated: false, canAccess: false, canModerate: false, reason: "database_missing" };
  }

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sessionId = cookies.oprealm_audio_session;

  if (!sessionId) {
    return { authenticated: false, canAccess: false, canModerate: false, reason: "not_logged_in" };
  }

  const session = await env.OPREALM_DB.prepare(
    `
      SELECT * FROM audio_library_sessions
      WHERE id = ?
        AND expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(sessionId)
    .first();

  if (!session) {
    return { authenticated: false, canAccess: false, canModerate: false, reason: "session_expired" };
  }

  const member = await env.OPREALM_DB.prepare(
    "SELECT tier, alias FROM members WHERE discord_user_id = ? AND guild_id = ? LIMIT 1",
  )
    .bind(session.discord_user_id, session.guild_id)
    .first();

  const tier = member?.tier || "explorer";
  const canAccess = tier === "pro" || tier === "elite";

  return {
    authenticated: true,
    canAccess,
    canModerate: false,
    tier,
    alias: member?.alias || `Creator-${session.discord_user_id.slice(-4)}`,
    reason: canAccess ? null : "upgrade_required",
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
