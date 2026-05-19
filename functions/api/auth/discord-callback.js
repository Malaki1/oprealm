export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request.headers.get("cookie") || "");

  if (!code || !state || state !== cookies.oprealm_oauth_state) {
    return redirect("/audio-library.html?login=failed");
  }

  if (!env.DISCORD_CLIENT_SECRET || !env.OPREALM_DB) {
    return redirect("/audio-library.html?login=not-configured");
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/discord-callback`;
  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.DISCORD_APPLICATION_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return redirect("/audio-library.html?login=token-failed");
  }

  const token = await tokenResponse.json();
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!userResponse.ok) {
    return redirect("/audio-library.html?login=user-failed");
  }

  const user = await userResponse.json();
  const guildId = env.DISCORD_GUILD_ID || "unknown";
  const sessionId = crypto.randomUUID();

  await env.OPREALM_DB.prepare(
    `
      INSERT INTO audio_library_sessions (id, discord_user_id, guild_id, expires_at, created_at)
      VALUES (?, ?, ?, datetime('now', '+30 days'), datetime('now'))
    `,
  )
    .bind(sessionId, user.id, guildId)
    .run();

  const headers = new Headers({ location: "/audio-library.html?login=success" });
  headers.append("set-cookie", cookie("oprealm_audio_session", sessionId, 30 * 24 * 60 * 60));
  headers.append("set-cookie", cookie("oprealm_oauth_state", "", 0));

  return new Response(null, {
    status: 302,
    headers,
  });
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

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { location },
  });
}
