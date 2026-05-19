const DISCORD_API = "https://discord.com/api/v10";

export async function onRequestPost({ request, env }) {
  try {
    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.DISCORD_BOT_TOKEN) {
      return json({ ok: false, error: "DISCORD_BOT_TOKEN is missing" }, { status: 500 });
    }

    const payload = await request.json();
    const guildId = payload.guildId || env.DISCORD_GUILD_ID;
    const targetUserId = String(payload.discordUserId || "");
    const targetRoleId = payload.roleId || env.SAFETY_COMPLETED_ROLE_ID;

    if (!guildId || !targetUserId || !targetRoleId) {
      return json({ ok: false, error: "guildId, discordUserId and roleId are required" }, { status: 400 });
    }

    const botUser = await discordFetch(env, "/users/@me");
    const botMember = await discordFetch(env, `/guilds/${guildId}/members/${botUser.id}`);
    const targetMemberResult = await discordFetchMaybe(env, `/guilds/${guildId}/members/${targetUserId}`);
    const roles = await discordFetch(env, `/guilds/${guildId}/roles`);
    const targetRole = roles.find((role) => role.id === targetRoleId);
    const botRoles = roles.filter((role) => botMember.roles.includes(role.id));
    const botHighestRole = botRoles.sort((a, b) => b.position - a.position)[0] || null;

    return json({
      ok: true,
      guildId,
      bot: {
        id: botUser.id,
        username: botUser.username,
        roleIds: botMember.roles,
        highestRole: botHighestRole ? summarizeRole(botHighestRole) : null,
      },
      targetUser: {
        id: targetUserId,
        existsInServer: targetMemberResult.ok,
        status: targetMemberResult.status,
        body: targetMemberResult.ok ? undefined : targetMemberResult.body,
      },
      targetRole: targetRole ? summarizeRole(targetRole) : null,
      canBotManageTargetRole: Boolean(botHighestRole && targetRole && botHighestRole.position > targetRole.position && !targetRole.managed),
      nearbyRoles: roles
        .filter((role) => targetRole && Math.abs(role.position - targetRole.position) <= 5)
        .sort((a, b) => b.position - a.position)
        .map(summarizeRole),
    });
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      error: "Discord diagnostics failed",
      detail: error.message || "Unknown error",
    }, { status: 500 });
  }
}

async function discordFetch(env, path) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Discord API failed ${path}: ${response.status} ${text}`);
  }

  return JSON.parse(text);
}

async function discordFetchMaybe(env, path) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body: text ? safeJson(text) : null,
  };
}

function summarizeRole(role) {
  return {
    id: role.id,
    name: role.name,
    position: role.position,
    managed: role.managed,
    permissions: role.permissions,
    tags: role.tags || null,
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isAuthorized(request, env) {
  const auth = request.headers.get("authorization") || "";
  return Boolean(env.OPREALM_WEBHOOK_SECRET && auth === `Bearer ${env.OPREALM_WEBHOOK_SECRET}`);
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...(init.headers || {}),
    },
  });
}
