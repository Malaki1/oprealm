import { currentUser, requireUser } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, enumValue, requireMinText } from "../_lib/validate.js";

const LISTING_TYPES = [
  "roblox_asset",
  "ui_kit",
  "sound_pack",
  "music_loop",
  "story_template",
  "game_template",
  "art_pack",
];

const LICENSES = ["personal_use", "commercial_use", "oprealm_remix"];
const CURRENCIES = ["USD", "AUD", "GBP", "EUR"];

export async function onRequestGet({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  await ensureMarketplaceTables(env);

  const url = new URL(request.url);
  const status = enumValue(url.searchParams.get("status"), ["approved", "featured", "all", "mine"], "approved");
  const type = cleanText(url.searchParams.get("type") || "all", 40);
  const query = cleanText(url.searchParams.get("q") || "", 80);
  const limit = clampNumber(Number(url.searchParams.get("limit") || 60), 1, 100);
  const user = status === "mine" ? await currentUser(request, env) : null;

  if (status === "mine" && !user) {
    return json({ ok: false, error: "Please log in to view your marketplace listings." }, 401);
  }

  const filters = [];
  const params = [];

  if (status === "all") {
    filters.push("review_status != 'deleted'");
  } else if (status === "mine") {
    filters.push("seller_web_user_id = ?");
    params.push(user.id);
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

  const listings = await env.OPREALM_DB.prepare(
    `
      SELECT
        marketplace_listings.id,
        marketplace_listings.title,
        marketplace_listings.type,
        marketplace_listings.description,
        marketplace_listings.asset_url,
        marketplace_listings.thumbnail_url,
        marketplace_listings.tags,
        marketplace_listings.price_cents,
        marketplace_listings.currency,
        marketplace_listings.license,
        marketplace_listings.review_status,
        marketplace_listings.created_at,
        marketplace_listings.approved_at,
        COALESCE(web_users.display_name, 'OPREALM Creator') AS seller_name
      FROM marketplace_listings
      LEFT JOIN web_users ON web_users.id = marketplace_listings.seller_web_user_id
      WHERE ${filters.join(" AND ")}
      ORDER BY COALESCE(approved_at, created_at) DESC
      LIMIT ?
    `,
  )
    .bind(...params, limit)
    .all();

  return json({ ok: true, listings: listings.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  await ensureMarketplaceTables(env);

  let user;
  let body;
  try {
    user = await requireUser(request, env);
    body = await readJson(request, "Invalid marketplace listing request.");
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not submit listing." }, error.status || 400);
  }

  let listing;
  try {
    listing = normalizeListing(body);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please check the listing details." }, error.status || 400);
  }

  const id = crypto.randomUUID();
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO marketplace_listings (
        id,
        seller_web_user_id,
        title,
        type,
        description,
        asset_url,
        thumbnail_url,
        tags,
        price_cents,
        currency,
        license,
        visibility,
        review_status,
        created_at,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'pending', datetime('now'), datetime('now'))
    `,
  )
    .bind(
      id,
      user.id,
      listing.title,
      listing.type,
      listing.description,
      listing.assetUrl,
      listing.thumbnailUrl,
      listing.tags,
      listing.priceCents,
      listing.currency,
      listing.license,
    )
    .run();

  return json({ ok: true, id, reviewStatus: "pending" }, 201);
}

function normalizeListing(body) {
  const title = requireMinText(body.title, "Asset title", 3, 80);
  const type = enumValue(body.type, LISTING_TYPES, "");
  const description = requireMinText(body.description, "Asset description", 16, 700);
  const assetUrl = cleanUrl(body.assetUrl || body.asset_url || "");
  const thumbnailUrl = cleanUrl(body.thumbnailUrl || body.thumbnail_url || "");
  const tags = cleanText(body.tags || "", 120);
  const license = enumValue(body.license, LICENSES, "personal_use");
  const currency = enumValue(body.currency, CURRENCIES, "USD");
  const priceCents = priceToCents(body.price);

  assertSafePrompt(`${title} ${description} ${tags}`);
  if (!type) {
    const error = new Error("Choose a valid asset type.");
    error.status = 400;
    throw error;
  }
  if (!assetUrl && !thumbnailUrl) {
    const error = new Error("Add at least a preview image URL or asset download URL for review.");
    error.status = 400;
    throw error;
  }

  return { title, type, description, assetUrl, thumbnailUrl, tags, priceCents, currency, license };
}

function cleanUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 700) {
    const error = new Error("URLs must be shorter than 700 characters.");
    error.status = 413;
    throw error;
  }
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) {
      const error = new Error("Only http or https links are allowed.");
      error.status = 400;
      throw error;
    }
    return url.toString();
  } catch {
    const error = new Error("Add a valid URL.");
    error.status = 400;
    throw error;
  }
}

function priceToCents(value) {
  const raw = String(value ?? "0").trim().replace(/[$,]/g, "");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(raw)) {
    const error = new Error("Enter a valid price from 0 to 9999.99.");
    error.status = 400;
    throw error;
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999.99) {
    const error = new Error("Enter a valid price from 0 to 9999.99.");
    error.status = 400;
    throw error;
  }
  return Math.round(amount * 100);
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

async function ensureMarketplaceTables(env) {
  await env.OPREALM_DB.batch([
    env.OPREALM_DB.prepare(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id TEXT PRIMARY KEY,
        seller_web_user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        asset_url TEXT,
        thumbnail_url TEXT,
        tags TEXT,
        price_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        license TEXT NOT NULL DEFAULT 'personal_use',
        visibility TEXT NOT NULL DEFAULT 'pending_review',
        review_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        submitted_at TEXT,
        approved_at TEXT,
        updated_at TEXT
      )
    `),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_marketplace_listings_review ON marketplace_listings(review_status, created_at)"),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON marketplace_listings(type, review_status)"),
    env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_web_user_id, created_at)"),
  ]);
}
