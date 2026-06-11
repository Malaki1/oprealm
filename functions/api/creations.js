import { requireUser } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import { assertSafePrompt } from "../_lib/validate.js";

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  const url = new URL(request.url);
  const status = sanitizeChoice(url.searchParams.get("status"), ["approved", "featured", "all"], "approved");
  const type = cleanText(url.searchParams.get("type") || "all", 32);
  const query = cleanText(url.searchParams.get("q") || "", 80);
  const limit = clampNumber(Number(url.searchParams.get("limit") || 48), 1, 100);

  const filters = [];
  const params = [];

  if (status === "all") {
    filters.push("review_status != 'deleted'");
  } else {
    filters.push("review_status = ?");
    params.push(status);
  }

  if (type !== "all") {
    filters.push("type = ?");
    params.push(type);
  }

  if (query) {
    filters.push("(title LIKE ? OR description LIKE ? OR tags LIKE ?)");
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  const creations = await env.OPREALM_DB.prepare(
    `
      SELECT
        id,
        title,
        type,
        description,
        media_url,
        thumbnail_url,
        tags,
        age_band,
        review_status,
        created_at,
        approved_at
      FROM public_creations
      WHERE ${filters.join(" AND ")}
      ORDER BY COALESCE(approved_at, created_at) DESC
      LIMIT ?
    `,
  )
    .bind(...params, limit)
    .all();

  return json({ ok: true, creations: creations.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  let user;
  let body;
  try {
    user = await requireUser(request, env);
    body = await readJson(request, "Invalid creation submission request.");
  } catch (error) {
    return json({ ok: false, error: error.message || "Invalid creation submission request." }, error.status || 400);
  }

  const title = cleanText(body.title || "", 80);
  const type = sanitizeChoice(
    body.type,
    ["web_game", "pixel_game", "story_game", "music", "sound", "trailer", "comic"],
    "web_game",
  );
  const description = cleanText(body.description || "", 600);
  const tags = cleanText(body.tags || "", 200);
  const ageBand = cleanText(body.ageBand || body.age_band || "", 24);
  const mediaUrl = cleanUrl(body.mediaUrl || body.media_url || "");
  const thumbnailUrl = cleanUrl(body.thumbnailUrl || body.thumbnail_url || "");
  const projectSnapshot = JSON.stringify(body.projectSnapshot || body.project_snapshot || []).slice(0, 8000);

  if (title.length < 3 || description.length < 12) {
    return json({ ok: false, error: "Add a title and a fuller description before submitting." }, 400);
  }
  try {
    assertSafePrompt(`${title} ${description} ${cleanText(body.tags || "", 200)}`);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please remove unsafe wording before submitting." }, error.status || 400);
  }

  const id = crypto.randomUUID();
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO public_creations (
        id,
        owner_discord_user_id,
        title,
        type,
        description,
        media_url,
        thumbnail_url,
        tags,
        age_band,
        project_snapshot_json,
        visibility,
        review_status,
        created_at,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'pending', datetime('now'), datetime('now'))
    `,
  )
    .bind(id, `web:${user.id}`, title, type, description, mediaUrl, thumbnailUrl, tags, ageBand, projectSnapshot)
    .run();

  return json({ ok: true, id, reviewStatus: "pending" }, 201);
}

function sanitizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString().slice(0, 600);
  } catch {
    return "";
  }
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
