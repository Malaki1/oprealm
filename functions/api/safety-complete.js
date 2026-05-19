const DISCORD_API = "https://discord.com/api/v10";

export async function onRequestPost({ request, env }) {
  try {
    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const discordUserId = String(payload.discordUserId || "");
    const tier = normalizeTier(payload.tier || "explorer");
    const ageBand = normalizeAgeBand(payload.ageBand || payload.age_band || "junior");
    const course = normalizeCourse(payload.course || "roblox");
    const guildId = payload.guildId || env.DISCORD_GUILD_ID;

    if (!discordUserId || !guildId) {
      return json({ error: "discordUserId and guildId are required" }, { status: 400 });
    }

    if (!env.DISCORD_BOT_TOKEN || !env.SAFETY_COMPLETED_ROLE_ID) {
      return json({ error: "Discord bot token or Safety Completed role is missing" }, { status: 500 });
    }

    const alias = payload.alias || createSafeAlias(tier, discordUserId);

    await addRole(env, guildId, discordUserId, env.SAFETY_COMPLETED_ROLE_ID, "Safety Completed");

    const rolesToAssign = [
      roleForTier(env, tier),
      roleForAgeBand(env, ageBand),
      ...rolesForCourseAccess(env, tier, course),
      roleForAiAccess(env, tier),
    ].filter(Boolean);

    for (const roleId of new Set(rolesToAssign)) {
      await addRole(env, guildId, discordUserId, roleId, roleNameForId(env, roleId));
    }

    await setNickname(env, guildId, discordUserId, alias);

    if (env.OPREALM_DB) {
      await env.OPREALM_DB.prepare(
        `
          INSERT INTO members (discord_user_id, guild_id, tier, credits_remaining, safety_completed, alias, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
          ON CONFLICT(discord_user_id, guild_id)
          DO UPDATE SET tier = excluded.tier,
            credits_remaining = excluded.credits_remaining,
            safety_completed = 1,
            alias = excluded.alias,
            updated_at = datetime('now')
        `,
      )
        .bind(discordUserId, guildId, tier, monthlyCredits(tier), alias)
        .run();
    }

    return json({
      ok: true,
      discordUserId,
      tier,
      ageBand,
      course,
      alias,
      safetyCompleted: true,
    });
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      error: "Safety unlock failed",
      detail: error.message || "Unknown error",
    }, { status: 500 });
  }
}

function isAuthorized(request, env) {
  const auth = request.headers.get("authorization") || "";
  return Boolean(env.OPREALM_WEBHOOK_SECRET && auth === `Bearer ${env.OPREALM_WEBHOOK_SECRET}`);
}

async function addRole(env, guildId, userId, roleId, roleName = "Unknown role") {
  const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord role add failed for ${roleName} (${roleId}): ${response.status} ${detail}`);
  }
}

function roleNameForId(env, roleId) {
  const roles = {
    [env.EXPLORER_ROLE_ID]: "Explorer Pass",
    [env.CREATOR_ROLE_ID]: "Creator Member",
    [env.CREATOR_PRO_ROLE_ID]: "Creator Pro",
    [env.ELITE_ROLE_ID]: "Elite Creator",
    [env.SAFETY_COMPLETED_ROLE_ID]: "Safety Completed",
    [env.JUNIOR_ACCESS_ROLE_ID]: "Junior Access",
    [env.CREATOR_CREW_ACCESS_ROLE_ID]: "Creator Crew Access",
    [env.TEEN_STUDIO_ACCESS_ROLE_ID]: "Teen Studio Access",
    [env.COURSE_ROBLOX_ROLE_ID]: "Course Roblox",
    [env.COURSE_MINECRAFT_ROLE_ID]: "Course Minecraft",
    [env.COURSE_WEB_GAMES_ROLE_ID]: "Course Web Games",
    [env.COURSE_2D_GAMES_ROLE_ID]: "Course 2D Games",
    [env.COURSE_AI_STORIES_ROLE_ID]: "Course AI Stories",
    [env.AI_BASIC_ACCESS_ROLE_ID]: "AI Basic Access",
    [env.AI_PRO_ACCESS_ROLE_ID]: "AI Pro Access",
  };

  return roles[roleId] || "Unknown role";
}

async function setNickname(env, guildId, userId, nickname) {
  const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ nick: nickname }),
  });

  if (!response.ok) {
    throw new Error(`Discord nickname update failed: ${response.status} ${await response.text()}`);
  }
}

function roleForTier(env, tier) {
  return {
    explorer: env.EXPLORER_ROLE_ID,
    creator: env.CREATOR_ROLE_ID,
    pro: env.CREATOR_PRO_ROLE_ID,
    elite: env.ELITE_ROLE_ID,
  }[tier];
}

function roleForAgeBand(env, ageBand) {
  return {
    junior: env.JUNIOR_ACCESS_ROLE_ID,
    crew: env.CREATOR_CREW_ACCESS_ROLE_ID,
    teen: env.TEEN_STUDIO_ACCESS_ROLE_ID,
  }[ageBand];
}

function rolesForCourseAccess(env, tier, course) {
  if (tier === "explorer") return [];
  if (tier === "pro" || tier === "elite") {
    return [
      env.COURSE_ROBLOX_ROLE_ID,
      env.COURSE_MINECRAFT_ROLE_ID,
      env.COURSE_WEB_GAMES_ROLE_ID,
      env.COURSE_2D_GAMES_ROLE_ID,
      env.COURSE_AI_STORIES_ROLE_ID,
    ];
  }

  return [roleForCourse(env, course)];
}

function roleForCourse(env, course) {
  return {
    roblox: env.COURSE_ROBLOX_ROLE_ID,
    minecraft: env.COURSE_MINECRAFT_ROLE_ID,
    web_games: env.COURSE_WEB_GAMES_ROLE_ID,
    two_d_games: env.COURSE_2D_GAMES_ROLE_ID,
    ai_stories: env.COURSE_AI_STORIES_ROLE_ID,
  }[course];
}

function roleForAiAccess(env, tier) {
  if (tier === "creator") return env.AI_BASIC_ACCESS_ROLE_ID;
  if (tier === "pro" || tier === "elite") return env.AI_PRO_ACCESS_ROLE_ID;
  return null;
}

function normalizeTier(tier) {
  const value = String(tier).toLowerCase();
  if (["explorer", "creator", "pro", "elite"].includes(value)) return value;
  return "explorer";
}

function normalizeAgeBand(ageBand) {
  const value = String(ageBand).toLowerCase().replace(/[\s-]+/g, "_");
  if (["junior", "junior_creators", "7_10"].includes(value)) return "junior";
  if (["crew", "creator_crew", "11_13"].includes(value)) return "crew";
  if (["teen", "teen_studio", "14_16"].includes(value)) return "teen";
  return "junior";
}

function normalizeCourse(course) {
  const value = String(course).toLowerCase().replace(/[\s-]+/g, "_");
  if (["roblox", "roblox_creator"].includes(value)) return "roblox";
  if (["minecraft", "minecraft_modding"].includes(value)) return "minecraft";
  if (["web", "web_games", "web_game_dev"].includes(value)) return "web_games";
  if (["2d", "2d_games", "two_d_games", "2d_game_builder"].includes(value)) return "two_d_games";
  if (["ai", "ai_stories", "ai_story_games"].includes(value)) return "ai_stories";
  return "roblox";
}

function monthlyCredits(tier) {
  return {
    explorer: 10,
    creator: 150,
    pro: 400,
    elite: 1500,
  }[tier] || 10;
}

function createSafeAlias(tier, discordUserId) {
  const prefix = {
    explorer: "Explorer",
    creator: "Creator",
    pro: "ProCreator",
    elite: "EliteCreator",
  }[tier] || "Creator";

  const suffix = discordUserId.slice(-4).padStart(4, "0");
  return `${prefix}-${suffix}`;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...(init.headers || {}),
    },
  });
}
