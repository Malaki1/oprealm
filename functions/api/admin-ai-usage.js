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

  const members = await env.OPREALM_DB.prepare(
    `
      SELECT
        COUNT(*) AS total_members,
        COALESCE(SUM(credits_remaining), 0) AS credits_remaining
      FROM members
    `,
  ).first();

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
      totalMembers: Number(members.total_members || 0),
      creditsRemaining: Number(members.credits_remaining || 0),
    },
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
