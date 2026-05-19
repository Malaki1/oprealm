export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/discord-callback`;
  const clientId = env.DISCORD_APPLICATION_ID;

  if (!clientId) {
    return new Response("Discord application is not configured", { status: 500 });
  }

  const state = crypto.randomUUID();
  const discordUrl = new URL("https://discord.com/oauth2/authorize");
  discordUrl.searchParams.set("client_id", clientId);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("redirect_uri", redirectUri);
  discordUrl.searchParams.set("scope", "identify");
  discordUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: discordUrl.toString(),
      "set-cookie": cookie("oprealm_oauth_state", state, 10 * 60),
    },
  });
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
