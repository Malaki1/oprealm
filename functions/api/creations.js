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
        project_snapshot_json,
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

  return json({
    ok: true,
    creations: (creations.results || []).map((creation) => {
      const snapshot = safeJson(creation.project_snapshot_json);
      const publishing = snapshot.publishing || {};
      const { project_snapshot_json: _snapshot, ...publicCreation } = creation;
      return {
        ...publicCreation,
        creator_name: cleanText(publishing.author || "", 80) || "OPREALM Creator",
        genre: cleanText(publishing.genre || snapshot.genre || "", 60),
        cover_card: {
          subtitle: cleanText(publishing.subtitle || "", 120),
          author: cleanText(publishing.author || "", 80),
          font: cleanText(publishing.coverFont || "", 24),
          colour: cleanColour(publishing.coverColour),
          effect: cleanText(publishing.coverEffect || "", 24),
          position: cleanText(publishing.coverPosition || "", 16),
        },
      };
    }),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) {
    return json({ ok: false, error: "OPRealm database is not connected" }, 500);
  }

  let user;
  let body;
  try {
    user = await requireUser(request, env);
    body = await readJson(request, "Invalid creation submission request.", 14 * 1024 * 1024);
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
  let thumbnailUrl = cleanUrl(body.thumbnailUrl || body.thumbnail_url || "");
  const projectSnapshot = JSON.stringify(body.projectSnapshot || body.project_snapshot || []).slice(0, 8000);

  if (title.length < 3 || description.length < 12) {
    return json({ ok: false, error: "Add a title and a fuller description before submitting." }, 400);
  }
  try {
    assertSafePrompt(`${title} ${description} ${cleanText(body.tags || "", 200)}`);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please remove unsafe wording before submitting." }, error.status || 400);
  }

  const requestedId = cleanId(body.creationId || body.creation_id || "");
  const existing = requestedId
    ? await env.OPREALM_DB.prepare(
      "SELECT id, owner_discord_user_id, review_status FROM public_creations WHERE id = ? AND review_status != 'deleted' LIMIT 1",
    ).bind(requestedId).first()
    : null;
  if (requestedId && (!existing || existing.owner_discord_user_id !== `web:${user.id}`)) {
    return json({ ok: false, error: "That published creation could not be updated." }, 404);
  }

  const id = existing?.id || crypto.randomUUID();
  const cover = decodeImageDataUrl(body.coverImageDataUrl || body.cover_image_data_url || "");
  if (cover) {
    if (!env.OPREALM_ASSETS) {
      return json({ ok: false, error: "RealmVerse cover storage is not connected." }, 500);
    }
    const r2Key = coverKey(user.id, id, cover.extension);
    await env.OPREALM_ASSETS.put(r2Key, cover.bytes, {
      httpMetadata: { contentType: cover.contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { userId: user.id, creationId: id, assetType: "published-cover" },
    });
    thumbnailUrl = `/api/creation-cover?id=${encodeURIComponent(id)}`;
  }

  if (existing) {
    await env.OPREALM_DB.prepare(
      `
        UPDATE public_creations
        SET title = ?, type = ?, description = ?, media_url = ?, thumbnail_url = ?,
            tags = ?, age_band = ?, project_snapshot_json = ?, updated_at = datetime('now')
        WHERE id = ? AND owner_discord_user_id = ?
      `,
    )
      .bind(title, type, description, mediaUrl, thumbnailUrl, tags, ageBand, projectSnapshot, id, `web:${user.id}`)
      .run();
    return json({ ok: true, id, reviewStatus: existing.review_status || "pending", updated: true });
  }

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

function decodeImageDataUrl(value) {
  const raw = String(value || "");
  if (!raw) return null;
  const match = raw.match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    const error = new Error("The selected cover image could not be prepared for publishing.");
    error.status = 400;
    throw error;
  }
  const contentType = `image/${match[1].toLowerCase()}`;
  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const binary = atob(match[2].replace(/\s/g, ""));
  if (binary.length > 10 * 1024 * 1024) {
    const error = new Error("The selected cover image is too large to publish.");
    error.status = 413;
    throw error;
  }
  return {
    contentType,
    extension,
    bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  };
}

function coverKey(userId, creationId, extension) {
  return `public-creations/${userId}/${creationId}/cover.${extension}`;
}

function cleanId(value) {
  const id = String(value || "").trim();
  return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
}

function cleanColour(value) {
  const colour = String(value || "").trim();
  return /^#[a-f0-9]{3,8}$/i.test(colour) ? colour : "";
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}") || {};
  } catch {
    return {};
  }
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
