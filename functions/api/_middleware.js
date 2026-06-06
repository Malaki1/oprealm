const WINDOW_SECONDS = 15 * 60;
const GENERAL_LIMIT = 120;
const MUTATION_LIMIT = 60;
const LOGIN_LIMIT = 5;
const ROUTE_MUTATION_LIMITS = new Map([
  ["/api/story-character-image", 180],
  ["/api/story-scene-images", 180],
  ["/api/story-game-cover", 120],
  ["/api/story-generator", 60],
  ["/api/story-image-download", 240],
  ["/api/roblox-wallpaper", 120],
]);
const DEFAULT_MAX_BODY_BYTES = 256 * 1024;
const LARGE_BODY_MAX_BYTES = 14 * 1024 * 1024;
const LARGE_BODY_PATHS = new Set([
  "/api/story-scene-images",
  "/api/story-character-image",
  "/api/story-game-cover",
  "/api/story-image-download",
]);

export async function onRequest(context) {
  const { request, env } = context;
  try {
    await validateRequestShape(request);
    await enforceRateLimits(request, env);
    return await context.next();
  } catch (error) {
    return json(
      { ok: false, error: error.message || "Request rejected." },
      error.status || 400,
      error.retryAfter ? { "retry-after": String(error.retryAfter) } : {},
    );
  }
}

async function validateRequestShape(request) {
  const url = new URL(request.url);
  if (url.pathname.length > 240 || url.search.length > 2048) {
    throw httpError("Request URL is too large.", 414);
  }

  for (const [key, value] of url.searchParams.entries()) {
    validateSafeString(key, { label: "Query key", maxLength: 80 });
    validateSafeString(value, { label: "Query value", maxLength: 1000 });
  }

  if (!["POST", "PUT", "PATCH"].includes(request.method)) return;

  const maxBodyBytes = LARGE_BODY_PATHS.has(url.pathname) ? LARGE_BODY_MAX_BYTES : DEFAULT_MAX_BODY_BYTES;
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength && declaredLength > maxBodyBytes) {
    throw httpError("Request body is too large.", 413);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return;

  const rawBody = await request.clone().text();
  if (byteLength(rawBody) > maxBodyBytes) throw httpError("Request body is too large.", 413);

  let body;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw httpError("Malformed JSON request.", 400);
  }
  validateJsonValue(body, { path: "body", depth: 0, dataUrlCount: { value: 0 } });
}

async function enforceRateLimits(request, env) {
  if (!env.OPREALM_DB) return;

  await ensureRateLimitTable(env);
  const url = new URL(request.url);
  const ip = clientIp(request);
  const routeKey = `${request.method}:${url.pathname}`;
  const generalLimit = request.method === "GET"
    ? GENERAL_LIMIT
    : ROUTE_MUTATION_LIMITS.get(url.pathname) || MUTATION_LIMIT;

  await hitRateLimit(env, `ip:${ip}:route:${routeKey}`, generalLimit, WINDOW_SECONDS);

  if (request.method === "POST" && url.pathname === "/api/account") {
    const body = await safeJson(request);
    const action = String(body.action || "").toLowerCase();
    if (["login", "register", "request_reset", "reset_password"].includes(action)) {
      const email = normalizeEmail(body.email || body.parentEmail || body.parent_email || "");
      await hitRateLimit(env, `ip:${ip}:account:${action}`, LOGIN_LIMIT, WINDOW_SECONDS);
      if (email) await hitRateLimit(env, `acct:${action}:${email}`, LOGIN_LIMIT, WINDOW_SECONDS);
    }
  }
}

async function safeJson(request) {
  try {
    return await request.clone().json();
  } catch {
    return {};
  }
}

async function ensureRateLimitTable(env) {
  await env.OPREALM_DB.prepare(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
  await env.OPREALM_DB.prepare("CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset ON api_rate_limits(reset_at)").run();
}

async function hitRateLimit(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const existing = await env.OPREALM_DB.prepare("SELECT count, reset_at FROM api_rate_limits WHERE key = ? LIMIT 1")
    .bind(key)
    .first();

  if (!existing || Number(existing.reset_at) <= now) {
    await env.OPREALM_DB.prepare(
      "INSERT OR REPLACE INTO api_rate_limits (key, count, reset_at, updated_at) VALUES (?, 1, ?, datetime('now'))",
    )
      .bind(key, now + windowSeconds)
      .run();
    return;
  }

  if (Number(existing.count) >= limit) {
    const retryAfter = Math.max(1, Number(existing.reset_at) - now);
    const error = httpError(`Too many requests. Try again in ${Math.ceil(retryAfter / 60)} minutes.`, 429);
    error.retryAfter = retryAfter;
    throw error;
  }

  await env.OPREALM_DB.prepare("UPDATE api_rate_limits SET count = count + 1, updated_at = datetime('now') WHERE key = ?")
    .bind(key)
    .run();
}

function validateJsonValue(value, context) {
  if (context.depth > 9) throw httpError("Request body is too deeply nested.", 400);
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw httpError(`${context.path} must be a finite number.`, 400);
    return;
  }
  if (typeof value === "string") {
    validateSafeString(value, { label: context.path, maxLength: stringLimit(value), dataUrlCount: context.dataUrlCount });
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 64) throw httpError(`${context.path} has too many items.`, 400);
    value.forEach((item, index) =>
      validateJsonValue(item, { ...context, path: `${context.path}[${index}]`, depth: context.depth + 1 }),
    );
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > 80) throw httpError(`${context.path} has too many fields.`, 400);
    for (const [key, item] of entries) {
      validateSafeString(key, { label: `${context.path} key`, maxLength: 80 });
      if (!/^[A-Za-z0-9_.:-]+$/.test(key)) throw httpError(`${context.path} contains an invalid field name.`, 400);
      validateJsonValue(item, { ...context, path: `${context.path}.${key}`, depth: context.depth + 1 });
    }
    return;
  }
  throw httpError(`${context.path} contains an unsupported value.`, 400);
}

function validateSafeString(value, { label, maxLength, dataUrlCount }) {
  if (value.length > maxLength) throw httpError(`${label} is too large.`, 413);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    throw httpError(`${label} contains invalid control characters.`, 400);
  }
  if (isDataImage(value)) {
    if (dataUrlCount) dataUrlCount.value += 1;
    if (dataUrlCount?.value > 4) throw httpError("Too many reference images were supplied.", 413);
    return;
  }
  if (/<\s*script|javascript:|data:text\/html/i.test(value)) {
    throw httpError(`${label} contains unsafe markup or script content.`, 400);
  }
}

function stringLimit(value) {
  if (isDataImage(value)) return 8 * 1024 * 1024;
  return 5000;
}

function isDataImage(value) {
  return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value);
}

function clientIp(request) {
  const raw = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return raw.split(",")[0].trim().slice(0, 80) || "unknown";
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 160) : "";
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}
