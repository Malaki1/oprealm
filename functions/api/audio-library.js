export async function onRequestGet({ request, env }) {
  const access = await resolveAudioLibraryAccess(request, env);

  if (!access.canAccess) {
    return json({ ok: false, error: access.authenticated ? "Creator Pro or Elite membership is required." : "Please log in with Discord or use an admin access token." }, 403);
  }

  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "sfx";
  const query = cleanSearch(url.searchParams.get("q") || "");
  const category = url.searchParams.get("category") || "all";
  const review = url.searchParams.get("review") || "approved";
  const limit = clampNumber(Number(url.searchParams.get("limit") || 80), 1, 120);

  if (type !== "sfx" && type !== "music") {
    return json({ ok: false, error: "Unsupported audio library type" }, 400);
  }
  const table = type === "music" ? "music_assets" : "sfx_assets";

  const filters = [];
  const params = [];

  const effectiveReview = access.canModerate ? review : review === "featured" ? "featured" : "approved";

  if (effectiveReview !== "all") {
    filters.push("review_status = ?");
    params.push(effectiveReview);
  } else {
    filters.push("review_status != 'deleted'");
  }

  if (category !== "all") {
    filters.push("category = ?");
    params.push(category);
  }

  if (query) {
    filters.push("(title LIKE ? OR prompt LIKE ? OR tags LIKE ? OR course LIKE ?)");
    const q = `%${query}%`;
    params.push(q, q, q, q);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const assets = await env.OPREALM_DB.prepare(
    `
      SELECT
        id,
        title,
        prompt,
        category,
        tags,
        mood,
        course,
        age_band,
        r2_key,
        discord_attachment_url,
        duration_seconds,
        file_size,
        visibility,
        review_status,
        created_at,
        submitted_at,
        approved_at
      FROM ${table}
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `,
  )
    .bind(...params, limit)
    .all();

  const categories = await env.OPREALM_DB.prepare(
    `
      SELECT category, COUNT(*) AS count
      FROM ${table}
      ${effectiveReview === "all" ? "" : "WHERE review_status = ?"}
      GROUP BY category
      ORDER BY category ASC
    `,
  )
    .bind(...(effectiveReview === "all" ? [] : [effectiveReview]))
    .all();

  return json({
    ok: true,
    type,
    canModerate: access.canModerate,
    tier: access.tier || null,
    assets: assets.results || [],
    categories: categories.results || [],
  });
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

function cleanSearch(value) {
  return value.trim().replace(/[^\w\s-]/g, "").slice(0, 80);
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
