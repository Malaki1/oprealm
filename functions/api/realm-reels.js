import { requireUser } from "../_lib/auth.js";
import { readJson } from "../_lib/http.js";
import {
  analyticsEvent,
  createMockExport,
  enhanceReel,
  generateRealmReel,
  reelSeedToStorySeed,
  storyToMarketingReels,
  validateReel,
} from "../_lib/realm-reels.mjs";

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 401);
  }
  const url = new URL(request.url);
  const id = cleanId(url.searchParams.get("id"));
  if (id) {
    const row = await env.OPREALM_DB.prepare(
      "SELECT * FROM realm_reels WHERE id = ? AND creator_id = ? LIMIT 1",
    ).bind(id, user.id).first();
    if (!row) return json({ ok: false, error: "RealmReel not found." }, 404);
    return json({ ok: true, reel: rowToReel(row) });
  }

  const status = cleanText(url.searchParams.get("status"), 30);
  const rows = status
    ? await env.OPREALM_DB.prepare(
      "SELECT * FROM realm_reels WHERE creator_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 100",
    ).bind(user.id, status).all()
    : await env.OPREALM_DB.prepare(
      "SELECT * FROM realm_reels WHERE creator_id = ? ORDER BY updated_at DESC LIMIT 100",
    ).bind(user.id).all();
  return json({ ok: true, reels: (rows.results || []).map(rowToReel) });
}

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  let user;
  let body;
  try {
    user = await requireUser(request, env);
    body = await readJson(request, "Invalid RealmReels request.", 512 * 1024);
  } catch (error) {
    return json({ ok: false, error: error.message || "Invalid RealmReels request." }, error.status || 400);
  }

  const action = cleanText(body.action, 40);
  if (action === "create") return createReel(env, user, body);
  if (action === "save") return saveReel(env, user, body.reel);
  if (action === "enhance") return enhance(env, user, body);
  if (action === "export") return exportReel(env, user, body);
  if (action === "analytics") return trackEvent(env, user, body);
  if (action === "expand") return expandReel(env, user, body);
  if (action === "story_to_reels") return createMarketingReels(env, user, body);
  if (action === "delete") return deleteReel(env, user, body);
  return json({ ok: false, error: "Unsupported RealmReels action." }, 400);
}

async function createReel(env, user, body) {
  const reel = generateRealmReel({
    ...body.settings,
    creatorId: user.id,
    sourceType: body.sourceType,
    sourceId: body.sourceId,
  });
  const validation = validateReel(reel);
  if (!validation.valid) return json({ ok: false, error: validation.errors.join(" ") }, 400);
  await persistReel(env, reel);
  await storeEvent(env, analyticsEvent(reel.id, "reel_generated", { genre: reel.seed.genre, templateId: reel.seed.templateId }), user.id);
  return json({ ok: true, reel }, 201);
}

async function saveReel(env, user, input) {
  const id = cleanId(input?.id);
  const existing = id
    ? await env.OPREALM_DB.prepare("SELECT id FROM realm_reels WHERE id = ? AND creator_id = ? LIMIT 1").bind(id, user.id).first()
    : null;
  if (!existing) return json({ ok: false, error: "RealmReel not found." }, 404);
  const reel = sanitizeReel(input, user.id);
  const validation = validateReel(reel);
  if (!validation.valid) return json({ ok: false, error: validation.errors.join(" ") }, 400);
  await persistReel(env, reel);
  return json({ ok: true, reel });
}

async function enhance(env, user, body) {
  const reel = await ownedReel(env, user.id, body.reelId);
  if (!reel) return json({ ok: false, error: "RealmReel not found." }, 404);
  const action = cleanText(body.enhancement, 30);
  const enhanced = enhanceReel(reel, action);
  await persistReel(env, enhanced);
  await storeEvent(env, analyticsEvent(reel.id, "enhance_button_clicked", { enhancement: action }), user.id);
  return json({ ok: true, reel: enhanced });
}

async function exportReel(env, user, body) {
  const reel = await ownedReel(env, user.id, body.reelId);
  if (!reel) return json({ ok: false, error: "RealmReel not found." }, 404);
  const exportJob = createMockExport(reel);
  await env.OPREALM_DB.batch([
    env.OPREALM_DB.prepare(
      "INSERT INTO reel_exports (id, reel_id, status, output_url, aspect_ratio, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(exportJob.id, reel.id, exportJob.status, exportJob.outputUrl, exportJob.aspectRatio, exportJob.durationSeconds, exportJob.createdAt),
    env.OPREALM_DB.prepare(
      "UPDATE realm_reels SET status = 'exported', export_url = ?, updated_at = datetime('now') WHERE id = ? AND creator_id = ?",
    ).bind(exportJob.outputUrl, reel.id, user.id),
    env.OPREALM_DB.prepare(
      "UPDATE reel_analytics SET exports = exports + 1, updated_at = datetime('now') WHERE reel_id = ?",
    ).bind(reel.id),
  ]);
  await storeEvent(env, analyticsEvent(reel.id, "reel_exported", { exportId: exportJob.id }), user.id);
  return json({ ok: true, exportJob });
}

async function trackEvent(env, user, body) {
  const reelId = cleanId(body.reelId);
  if (reelId && !(await ownedReel(env, user.id, reelId))) return json({ ok: false, error: "RealmReel not found." }, 404);
  const eventType = safeEvent(body.eventType);
  const event = analyticsEvent(reelId, eventType, sanitizeMetadata(body.metadata));
  await storeEvent(env, event, user.id);
  if (reelId) await updateAggregate(env, reelId, eventType);
  return json({ ok: true, event });
}

async function expandReel(env, user, body) {
  const reel = await ownedReel(env, user.id, body.reelId);
  if (!reel) return json({ ok: false, error: "RealmReel not found." }, 404);
  const storySeed = reelSeedToStorySeed(reel.seed);
  await env.OPREALM_DB.prepare(
    "UPDATE reel_analytics SET story_expansions = story_expansions + 1, updated_at = datetime('now') WHERE reel_id = ?",
  ).bind(reel.id).run();
  await storeEvent(env, analyticsEvent(reel.id, "full_story_created_from_reel", { target: cleanText(body.target, 30) || "storybook" }), user.id);
  return json({ ok: true, storySeed });
}

async function createMarketingReels(env, user, body) {
  const story = sanitizeMetadata(body.story);
  const generated = storyToMarketingReels(story, {
    generateCount: body.generateCount,
    reelTypes: Array.isArray(body.reelTypes) ? body.reelTypes.slice(0, 7) : [],
  }, body.sourceType === "storybook" ? "storybook" : "story_game");
  for (const reel of generated) {
    reel.creatorId = user.id;
    reel.seed.creatorId = user.id;
    await persistReel(env, reel);
    await storeEvent(env, analyticsEvent(reel.id, "story_created_to_reel", { sourceId: story.id || "" }), user.id);
  }
  return json({ ok: true, reels: generated }, 201);
}

async function deleteReel(env, user, body) {
  const id = cleanId(body.reelId);
  const result = await env.OPREALM_DB.prepare(
    "DELETE FROM realm_reels WHERE id = ? AND creator_id = ?",
  ).bind(id, user.id).run();
  return result.meta?.changes
    ? json({ ok: true })
    : json({ ok: false, error: "RealmReel not found." }, 404);
}

async function persistReel(env, reel) {
  const snapshot = JSON.stringify(reel);
  const statements = [
    env.OPREALM_DB.prepare(
      `INSERT INTO realm_reels (
        id, creator_id, title, genre, template_id, source_type, source_id, status,
        duration_seconds, aspect_ratio, thumbnail_url, preview_url, export_url,
        cta_type, cta_target_url, snapshot_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, genre = excluded.genre, template_id = excluded.template_id,
        status = excluded.status, duration_seconds = excluded.duration_seconds,
        thumbnail_url = excluded.thumbnail_url, preview_url = excluded.preview_url,
        export_url = excluded.export_url, cta_type = excluded.cta_type,
        cta_target_url = excluded.cta_target_url, snapshot_json = excluded.snapshot_json,
        updated_at = excluded.updated_at`,
    ).bind(
      reel.id, reel.creatorId, cleanText(reel.title, 100), reel.seed.genre, reel.seed.templateId,
      reel.seed.sourceType, reel.seed.sourceId || null, reel.status || "draft",
      reel.durationSeconds, "9:16", reel.storyboard?.[0]?.imageUrl || "",
      `/realmreels/preview/${reel.id}`, reel.exportUrl || "",
      reel.cta?.type || "", reel.cta?.targetUrl || "", snapshot,
      reel.createdAt || new Date().toISOString(), new Date().toISOString(),
    ),
    env.OPREALM_DB.prepare(
      `INSERT INTO reel_seeds (id, reel_id, seed_json, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET seed_json = excluded.seed_json, updated_at = datetime('now')`,
    ).bind(reel.seed.id, reel.id, JSON.stringify(reel.seed)),
    env.OPREALM_DB.prepare(
      `INSERT INTO reel_decision_trees (id, reel_id, tree_json, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET tree_json = excluded.tree_json, updated_at = datetime('now')`,
    ).bind(reel.decisionTree.id, reel.id, JSON.stringify(reel.decisionTree)),
    env.OPREALM_DB.prepare(
      `INSERT INTO reel_analytics (reel_id, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(reel_id) DO NOTHING`,
    ).bind(reel.id),
  ];
  statements.push(env.OPREALM_DB.prepare("DELETE FROM reel_storyboard_frames WHERE reel_id = ?").bind(reel.id));
  for (const frame of reel.storyboard || []) {
    statements.push(env.OPREALM_DB.prepare(
      `INSERT INTO reel_storyboard_frames (
        id, reel_id, order_index, frame_type, duration_seconds, headline_text, caption_text,
        narration_text, image_prompt, image_url, video_prompt, video_url, transition, audio_cue,
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    ).bind(
      frame.id, reel.id, frame.order, frame.frameType, frame.durationSeconds,
      frame.headlineText, frame.captionText || "", frame.narrationText || "",
      frame.imagePrompt || "", frame.imageUrl || "", frame.videoPrompt || "",
      frame.videoUrl || "", frame.transition || "cut", frame.audioCue || "",
      JSON.stringify(frame.metadata || {}),
    ));
  }
  await env.OPREALM_DB.batch(statements);
}

async function ownedReel(env, userId, id) {
  const clean = cleanId(id);
  if (!clean) return null;
  const row = await env.OPREALM_DB.prepare(
    "SELECT * FROM realm_reels WHERE id = ? AND creator_id = ? LIMIT 1",
  ).bind(clean, userId).first();
  return row ? rowToReel(row) : null;
}

function rowToReel(row) {
  try {
    return JSON.parse(row.snapshot_json || "{}");
  } catch {
    return null;
  }
}

function sanitizeReel(input, creatorId) {
  const reel = structuredClone(input || {});
  reel.id = cleanId(reel.id);
  reel.creatorId = creatorId;
  reel.title = cleanText(reel.title, 100);
  reel.updatedAt = new Date().toISOString();
  reel.storyboard = Array.isArray(reel.storyboard) ? reel.storyboard.slice(0, 24).map((frame, order) => ({
    ...frame,
    id: cleanText(frame.id, 80),
    order,
    durationSeconds: clamp(Number(frame.durationSeconds), 2, 12),
    headlineText: cleanText(frame.headlineText, 80),
    captionText: cleanText(frame.captionText, 180),
    narrationText: cleanText(frame.narrationText, 500),
    imagePrompt: cleanText(frame.imagePrompt, 2400),
    videoPrompt: cleanText(frame.videoPrompt, 2400),
    imageUrl: cleanUrl(frame.imageUrl),
    videoUrl: cleanUrl(frame.videoUrl),
    transition: cleanText(frame.transition, 20),
    audioCue: cleanText(frame.audioCue, 20),
  })) : [];
  return reel;
}

async function storeEvent(env, event, creatorId) {
  await env.OPREALM_DB.prepare(
    "INSERT INTO reel_analytics_events (id, reel_id, creator_id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(event.id, event.reelId || null, creatorId, event.eventType, JSON.stringify(event.metadata || {}), event.createdAt).run();
}

async function updateAggregate(env, reelId, eventType) {
  const field = {
    reel_previewed: "views",
    cta_clicked: "click_through_rate",
    reel_shared: "shares",
    reel_liked: "likes",
  }[eventType];
  if (!field) return;
  if (field === "click_through_rate") {
    await env.OPREALM_DB.prepare(
      "UPDATE reel_analytics SET click_through_rate = click_through_rate + 1, updated_at = datetime('now') WHERE reel_id = ?",
    ).bind(reelId).run();
  } else {
    await env.OPREALM_DB.prepare(
      `UPDATE reel_analytics SET ${field} = ${field} + 1, updated_at = datetime('now') WHERE reel_id = ?`,
    ).bind(reelId).run();
  }
}

function safeEvent(value) {
  const allowed = ["reel_generated", "reel_previewed", "reel_exported", "cta_clicked", "full_story_created_from_reel", "story_created_to_reel", "template_selected", "genre_selected", "enhance_button_clicked", "reel_shared", "reel_liked"];
  return allowed.includes(value) ? value : "reel_previewed";
}

function sanitizeMetadata(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).slice(0, 20).map(([key, value]) => [
    cleanText(key, 40),
    typeof value === "string" ? cleanText(value, 500) : typeof value === "number" || typeof value === "boolean" ? value : "",
  ]));
}

function cleanText(value, max) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
function cleanId(value) { const id = String(value || "").trim(); return /^[a-f0-9-]{36}$/i.test(id) ? id : ""; }
function cleanUrl(value) { const raw = String(value || ""); if (raw.startsWith("/")) return raw.slice(0, 600); try { const url = new URL(raw); return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 600) : ""; } catch { return ""; } }
function clamp(value, min, max) { return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
