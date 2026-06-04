export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("authorization") || "";
  const expected = env.OPREALM_WEBHOOK_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const url = new URL(request.url);
  const days = clampNumber(Number(url.searchParams.get("days") || 30), 1, 365);

  const summary = await env.OPREALM_DB.prepare(
    `
      SELECT
        COUNT(*) AS total_requests,
        COALESCE(SUM(credits_used), 0) AS total_creator_credits,
        COALESCE(SUM(provider_units), 0) AS total_provider_units,
        COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd
      FROM ai_usage
      WHERE created_at >= datetime('now', ?)
    `,
  )
    .bind(`-${days} days`)
    .first();

  const byTool = await env.OPREALM_DB.prepare(
    `
      SELECT
        tool,
        provider,
        model,
        quality,
        COUNT(*) AS requests,
        COALESCE(SUM(credits_used), 0) AS creator_credits,
        COALESCE(SUM(provider_units), 0) AS provider_units,
        COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd
      FROM ai_usage
      WHERE created_at >= datetime('now', ?)
      GROUP BY tool, provider, model, quality
      ORDER BY estimated_cost_usd DESC, requests DESC
    `,
  )
    .bind(`-${days} days`)
    .all();

  const daily = await env.OPREALM_DB.prepare(
    `
      SELECT
        date(created_at) AS day,
        COUNT(*) AS requests,
        COALESCE(SUM(credits_used), 0) AS creator_credits,
        COALESCE(SUM(provider_units), 0) AS provider_units,
        COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd
      FROM ai_usage
      WHERE created_at >= datetime('now', ?)
      GROUP BY date(created_at)
      ORDER BY day ASC
    `,
  )
    .bind(`-${days} days`)
    .all();

  const recent = await env.OPREALM_DB.prepare(
    `
      SELECT
        created_at,
        discord_user_id,
        tool,
        credits_used,
        provider,
        model,
        quality,
        provider_units,
        estimated_cost_usd,
        substr(prompt, 1, 120) AS prompt_preview
      FROM ai_usage
      ORDER BY created_at DESC
      LIMIT 25
    `,
  ).all();

  const members = await safeFirst(env.OPREALM_DB, 
    `
      SELECT
        COUNT(*) AS total_members,
        COALESCE(SUM(credits_remaining), 0) AS credits_remaining
      FROM members
    `,
  );

  const webMembers = await safeFirst(env.OPREALM_DB,
    `
      SELECT
        COUNT(*) AS total_web_users,
        COALESCE(SUM(credits_remaining), 0) AS credits_remaining,
        SUM(CASE WHEN tier = 'explorer' THEN 1 ELSE 0 END) AS explorer_count,
        SUM(CASE WHEN tier = 'creator' THEN 1 ELSE 0 END) AS creator_count,
        SUM(CASE WHEN tier IN ('pro', 'elite') THEN 1 ELSE 0 END) AS elite_count
      FROM web_users
    `,
  );

  const webLeaderboard = await safeAll(env.OPREALM_DB,
    `
      SELECT
        web_users.id,
        web_users.display_name,
        web_users.tier,
        web_users.credits_remaining,
        web_users.created_at,
        COUNT(ai_usage.created_at) AS requests,
        COALESCE(SUM(ai_usage.credits_used), 0) AS credits_used,
        COALESCE(SUM(ai_usage.estimated_cost_usd), 0) AS estimated_cost_usd,
        MAX(ai_usage.created_at) AS last_activity
      FROM web_users
      LEFT JOIN ai_usage
        ON ai_usage.discord_user_id = 'web:' || web_users.id
        AND ai_usage.created_at >= datetime('now', ?)
      GROUP BY web_users.id
      ORDER BY credits_used DESC, requests DESC, web_users.created_at ASC
      LIMIT 12
    `,
    [`-${days} days`],
  );

  const rewardRows = (webLeaderboard.results || []).map((row, index) => {
    const progress = calculateCreatorProgress(row);
    return {
      rank: index + 1,
      displayName: row.display_name || "OPREALM Creator",
      tier: row.tier || "explorer",
      creditsRemaining: Number(row.credits_remaining || 0),
      creditsUsed: Number(row.credits_used || 0),
      requests: Number(row.requests || 0),
      estimatedCostUsd: Number(row.estimated_cost_usd || 0),
      lastActivity: row.last_activity || null,
      points: progress.points,
      level: progress.level,
      streakEstimate: progress.streakEstimate,
      badges: progress.badges,
    };
  });

  const totalWebUsers = Number(webMembers.total_web_users || 0);
  const activeUsers = rewardRows.filter((row) => row.requests > 0).length;
  const totalPoints = rewardRows.reduce((sum, row) => sum + row.points, 0);
  const unlockedBadges = rewardRows.reduce((sum, row) => sum + row.badges.length, 0);

  const estimatedRevenueValueUsd = Number(summary.total_creator_credits || 0) * 0.01;
  const estimatedCostUsd = Number(summary.estimated_cost_usd || 0);

  return json({
    ok: true,
    windowDays: days,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequests: Number(summary.total_requests || 0),
      totalCreatorCredits: Number(summary.total_creator_credits || 0),
      totalProviderUnits: Number(summary.total_provider_units || 0),
      estimatedCostUsd,
      estimatedRevenueValueUsd,
      estimatedGrossMarginUsd: estimatedRevenueValueUsd - estimatedCostUsd,
    },
    members: {
      totalMembers: Number(members.total_members || 0) + totalWebUsers,
      discordMembers: Number(members.total_members || 0),
      webUsers: totalWebUsers,
      creditsRemaining: Number(members.credits_remaining || 0) + Number(webMembers.credits_remaining || 0),
      webCreditsRemaining: Number(webMembers.credits_remaining || 0),
      byTier: {
        explorer: Number(webMembers.explorer_count || 0),
        creator: Number(webMembers.creator_count || 0),
        elite: Number(webMembers.elite_count || 0),
      },
    },
    rewards: {
      activeUsers,
      totalPoints,
      unlockedBadges,
      averagePoints: rewardRows.length ? Math.round(totalPoints / rewardRows.length) : 0,
      topLevel: rewardRows.reduce((max, row) => Math.max(max, row.level), 0),
    },
    leaderboard: rewardRows,
    byTool: byTool.results || [],
    daily: daily.results || [],
    recent: recent.results || [],
    notes: [
      "Image and sprite costs are estimated from configured per-generation rates.",
      "Idea, sound, music, and trailer tools log text token usage when OpenAI returns usage data.",
      "OpenAI invoices remain the source of truth for actual billed spend.",
    ],
  });
}

async function safeFirst(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    return bindings.length ? await statement.bind(...bindings).first() : await statement.first();
  } catch (error) {
    console.error("Admin dashboard optional query failed", error);
    return {};
  }
}

async function safeAll(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    return bindings.length ? await statement.bind(...bindings).all() : await statement.all();
  } catch (error) {
    console.error("Admin dashboard optional query failed", error);
    return { results: [] };
  }
}

function calculateCreatorProgress(row) {
  const tierBase = { explorer: 250, creator: 1200, pro: 2100, elite: 2100 }[row.tier || "explorer"] || 250;
  const creditsUsed = Number(row.credits_used || 0);
  const requests = Number(row.requests || 0);
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const accountAgeDays = Math.max(1, Math.ceil((Date.now() - createdAt) / 86400000));
  const points = Math.max(100, tierBase + creditsUsed * 3 + requests * 12 + Math.min(accountAgeDays, 60) * 8);
  const level = Math.floor(Math.sqrt(points / 100)) + 1;
  const streakEstimate = Math.min(7, Math.max(1, Math.ceil(requests / 2)));
  const badges = [];

  if (requests > 0) badges.push("First Creation");
  if (requests >= 5) badges.push("Story Starter");
  if (creditsUsed >= 100) badges.push("Power Creator");
  if (streakEstimate >= 5) badges.push("Streak Builder");

  return { points, level, streakEstimate, badges };
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
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
