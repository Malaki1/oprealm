import {
  BRAND_READ_ROLES,
  BRAND_WRITE_ROLES,
  createD1BrandStore,
  createMemoryBrandStore,
  ensureBrandFoundationSchema,
} from "./brand-foundation.js";

export const BRAND_INGESTION_ATTEMPT_STATUSES = ["queued", "running", "succeeded", "failed"];

const USER_AGENT = "OPREALM-BrandIngestion/1.0";
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_RAW_TEXT_CHARS = 75000;
const MAX_LINKS = 100;
const MAX_HEADINGS = 50;
const EXTRACTION_VERSION = "oprealm-readable-source-v1";
const ALLOWED_CONTENT_TYPES = new Set(["text/html", "text/plain", "application/xhtml+xml"]);

export async function ensureBrandIngestionSchema(env) {
  await ensureBrandFoundationSchema(env);
  const db = requiredDb(env);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS brand_ingestion_attempts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      source_url TEXT,
      final_url TEXT,
      http_status INTEGER,
      content_type TEXT,
      title TEXT,
      error_message TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (source_id) REFERENCES brand_sources(id),
      FOREIGN KEY (created_by_user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_workspace_id ON brand_ingestion_attempts(workspace_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_brand_id ON brand_ingestion_attempts(brand_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_source_id ON brand_ingestion_attempts(source_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_status ON brand_ingestion_attempts(status)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_ingestion_attempts_created_at ON brand_ingestion_attempts(created_at)").run();
  await addColumnIfMissing(db, "brand_sources", "last_ingested_at TEXT");
  await addColumnIfMissing(db, "brand_sources", "last_ingestion_attempt_id TEXT");
}

export function createD1BrandIngestionStore(db) {
  if (!db) throw httpError("OPRealm database is not connected.", 500, "database_unavailable");
  const base = createD1BrandStore(db);
  return {
    ...base,
    async insertBrandIngestionAttempt(row) {
      await db.prepare(`
        INSERT INTO brand_ingestion_attempts (
          id, workspace_id, brand_id, source_id, created_by_user_id, status,
          source_url, final_url, http_status, content_type, title, error_message,
          metadata_json, started_at, completed_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        row.id,
        row.workspace_id,
        row.brand_id,
        row.source_id,
        row.created_by_user_id,
        row.status || "queued",
        row.source_url || null,
        row.final_url || null,
        row.http_status || null,
        row.content_type || null,
        row.title || null,
        row.error_message || null,
        row.metadata_json || "{}",
        row.started_at || null,
        row.completed_at || null,
      ).run();
      return this.getBrandIngestionAttempt(row.id);
    },
    async getBrandIngestionAttempt(id) {
      return db.prepare("SELECT * FROM brand_ingestion_attempts WHERE id = ? LIMIT 1").bind(id).first();
    },
    async updateBrandIngestionAttempt(id, updates) {
      const existing = await this.getBrandIngestionAttempt(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE brand_ingestion_attempts
        SET status = ?,
            source_url = ?,
            final_url = ?,
            http_status = ?,
            content_type = ?,
            title = ?,
            error_message = ?,
            metadata_json = ?,
            started_at = ?,
            completed_at = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        next.status,
        next.source_url || null,
        next.final_url || null,
        next.http_status || null,
        next.content_type || null,
        next.title || null,
        next.error_message || null,
        next.metadata_json || "{}",
        next.started_at || null,
        next.completed_at || null,
        id,
      ).run();
      return this.getBrandIngestionAttempt(id);
    },
    async listBrandIngestionAttempts(sourceId) {
      const rows = await db.prepare(`
        SELECT * FROM brand_ingestion_attempts
        WHERE source_id = ?
        ORDER BY created_at DESC, updated_at DESC
      `).bind(sourceId).all();
      return rows.results || [];
    },
  };
}

export function createMemoryBrandIngestionStore(seed = {}) {
  const base = createMemoryBrandStore(seed);
  const attempts = new Map((seed.brandIngestionAttempts || []).map((row) => [row.id, { ...row }]));
  base.state.brandIngestionAttempts = attempts;
  return {
    ...base,
    async insertBrandIngestionAttempt(row) {
      const stored = stamp({ ...row, status: row.status || "queued", metadata_json: row.metadata_json || "{}" });
      attempts.set(stored.id, stored);
      return clone(stored);
    },
    async getBrandIngestionAttempt(id) {
      return clone(attempts.get(id));
    },
    async updateBrandIngestionAttempt(id, updates) {
      const existing = attempts.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      attempts.set(id, stored);
      return clone(stored);
    },
    async listBrandIngestionAttempts(sourceId) {
      return [...attempts.values()]
        .filter((attempt) => attempt.source_id === sourceId)
        .sort(sortNewestFirst)
        .map(clone);
    },
  };
}

export function createBrandIngestionServices(store, options = {}) {
  if (!store) throw httpError("Brand ingestion store is not available.", 500, "store_unavailable");
  return {
    ingestBrandSource: (user, brandId, sourceId) => ingestBrandSource(store, user, brandId, sourceId, options),
    reingestBrandSource: (user, brandId, sourceId) => reingestBrandSource(store, user, brandId, sourceId, options),
    listBrandIngestionAttempts: (user, brandId, sourceId) => listBrandIngestionAttempts(store, user, brandId, sourceId),
  };
}

export async function ingestBrandSource(store, user, brandId, sourceId, options = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId, BRAND_WRITE_ROLES);
  const source = await requireBrandSource(store, brand, sourceId);
  const attempt = await createBrandIngestionAttempt(store, {
    workspace_id: brand.workspace_id,
    brand_id: brand.id,
    source_id: source.id,
    created_by_user_id: user.id,
    source_url: source.source_url || null,
  });
  const startedAt = nowIso();
  await markBrandIngestionAttemptRunning(store, attempt.id, startedAt);
  await store.updateBrandSource(source.id, {
    status: "ingesting",
    last_ingestion_attempt_id: attempt.id,
    metadata_json: JSON.stringify({
      ...parseStoredObject(source.metadata_json),
      lastIngestionError: null,
    }),
  });

  try {
    if (!source.source_url) {
      throw httpError("missing_source_url: Source must have a website or source URL before ingestion.", 400, "missing_source_url");
    }

    const originalUrl = validateIngestionUrl(source.source_url).toString();
    const fetched = await fetchSourceUrl(originalUrl, options);
    const extracted = extractReadableSourceText(fetched.bodyText, fetched.finalUrl, fetched.contentType);
    const ingestedAt = nowIso();
    const existingMetadata = parseStoredObject(source.metadata_json);
    const metadata = compactMetadata({
      ...existingMetadata,
      originalUrl,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.httpStatus,
      contentType: fetched.contentType,
      title: extracted.title || source.title || "",
      metaDescription: extracted.metaDescription || "",
      canonicalUrl: extracted.canonicalUrl || "",
      headings: extracted.headings,
      links: extracted.links,
      sameDomainLinks: extracted.sameDomainLinks,
      externalLinks: extracted.externalLinks,
      contentLength: fetched.contentLength,
      fetchDurationMs: fetched.fetchDurationMs,
      ingestedAt,
      extractionVersion: EXTRACTION_VERSION,
      ingestionAttemptId: attempt.id,
      lastIngestionError: null,
    });
    const updatedSource = await store.updateBrandSource(source.id, {
      title: extracted.title || source.title || null,
      raw_text: extracted.rawText,
      metadata_json: JSON.stringify(metadata),
      status: "active",
      last_ingested_at: ingestedAt,
      last_ingestion_attempt_id: attempt.id,
    });
    const succeededAttempt = await markBrandIngestionAttemptSucceeded(store, attempt.id, {
      final_url: fetched.finalUrl,
      http_status: fetched.httpStatus,
      content_type: fetched.contentType,
      title: extracted.title || source.title || null,
      completed_at: ingestedAt,
      metadata_json: JSON.stringify(metadata),
    });
    return {
      source: shapeBrandSource(updatedSource),
      attempt: shapeBrandIngestionAttempt(succeededAttempt),
    };
  } catch (caught) {
    const error = normalizeIngestionError(caught);
    const completedAt = nowIso();
    const failedMetadata = compactMetadata({
      ...parseStoredObject(source.metadata_json),
      lastIngestionError: {
        code: error.code || "fetch_failed",
        message: safeErrorMessage(error),
        httpStatus: error.httpStatus || null,
        contentType: error.contentType || null,
        failedAt: completedAt,
        ingestionAttemptId: attempt.id,
      },
    });
    await store.updateBrandSource(source.id, {
      status: "failed",
      metadata_json: JSON.stringify(failedMetadata),
      last_ingestion_attempt_id: attempt.id,
    });
    await markBrandIngestionAttemptFailed(store, attempt.id, {
      error_message: safeErrorMessage(error),
      final_url: error.finalUrl || null,
      http_status: error.httpStatus || null,
      content_type: error.contentType || null,
      completed_at: completedAt,
      metadata_json: JSON.stringify({
        code: error.code || "fetch_failed",
        message: safeErrorMessage(error),
        httpStatus: error.httpStatus || null,
        contentType: error.contentType || null,
      }),
    });
    throw error;
  }
}

export async function reingestBrandSource(store, user, brandId, sourceId, options = {}) {
  return ingestBrandSource(store, user, brandId, sourceId, options);
}

export async function listBrandIngestionAttempts(store, user, brandId, sourceId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId, BRAND_READ_ROLES);
  const source = await requireBrandSource(store, brand, sourceId);
  return (await store.listBrandIngestionAttempts(source.id)).map(shapeBrandIngestionAttempt);
}

export function validateIngestionUrl(value) {
  const text = String(value || "").trim();
  if (!text) throw httpError("invalid_url: URL is required.", 400, "invalid_url");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw httpError("invalid_url: Enter a valid website URL.", 400, "invalid_url");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw httpError("unsupported_url_protocol: Brand ingestion only supports http and https URLs.", 400, "unsupported_url_protocol");
  }
  assertSafeIngestionTarget(url);
  return url;
}

export function assertSafeIngestionTarget(value) {
  const url = value instanceof URL ? value : validateIngestionUrl(value);
  const host = canonicalHostname(url.hostname);
  if (!host) throw httpError("invalid_url: URL host is required.", 400, "invalid_url");
  if (
    host === "localhost"
    || host.endsWith(".localhost")
    || host === "local"
    || host.endsWith(".local")
    || host === "localdomain"
    || host.endsWith(".localdomain")
    || host === "internal"
    || host.endsWith(".internal")
    || host === "metadata.google.internal"
    || host.endsWith(".metadata.google.internal")
  ) {
    throw httpError("unsafe_ingestion_target: URL points to a blocked private or internal host.", 400, "unsafe_ingestion_target");
  }

  const ipv4 = parseIPv4(host);
  if (ipv4 && isBlockedIPv4(ipv4)) {
    throw httpError("unsafe_ingestion_target: URL points to a blocked private IP range.", 400, "unsafe_ingestion_target");
  }

  if (looksLikeIPv6(host) && isBlockedIPv6(host)) {
    throw httpError("unsafe_ingestion_target: URL points to a blocked private IPv6 range.", 400, "unsafe_ingestion_target");
  }
}

export async function fetchSourceUrl(inputUrl, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw httpError("fetch_failed: Fetch is not available in this runtime.", 502, "fetch_failed");
  const started = Date.now();
  const originalUrl = validateIngestionUrl(inputUrl).toString();
  let currentUrl = originalUrl;

  for (let redirectCount = 0; redirectCount <= (options.maxRedirects ?? MAX_REDIRECTS); redirectCount += 1) {
    const response = await fetchWithTimeout(fetchImpl, currentUrl, options.timeoutMs ?? FETCH_TIMEOUT_MS);
    const status = response.status || 0;
    const contentType = normalizeContentType(response.headers?.get?.("content-type") || "");

    if (isRedirectStatus(status)) {
      const location = response.headers?.get?.("location");
      if (!location) throw withFetchDetails(httpError("fetch_failed: Redirect response did not include a location.", 502, "fetch_failed"), { finalUrl: currentUrl, httpStatus: status, contentType });
      if (redirectCount >= (options.maxRedirects ?? MAX_REDIRECTS)) {
        throw withFetchDetails(httpError("fetch_failed: Source redirected too many times.", 502, "fetch_failed"), { finalUrl: currentUrl, httpStatus: status, contentType });
      }
      currentUrl = validateIngestionUrl(new URL(location, currentUrl).toString()).toString();
      continue;
    }

    if (!response.ok) {
      throw withFetchDetails(httpError(`fetch_failed: Source returned HTTP ${status}.`, 502, "fetch_failed"), { finalUrl: currentUrl, httpStatus: status, contentType });
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw withFetchDetails(httpError("unsupported_content_type: Brand ingestion only accepts HTML or plain text pages.", 415, "unsupported_content_type"), { finalUrl: currentUrl, httpStatus: status, contentType });
    }

    const contentLengthHeader = Number(response.headers?.get?.("content-length") || 0);
    if (contentLengthHeader > (options.maxResponseBytes ?? MAX_RESPONSE_BYTES)) {
      throw withFetchDetails(httpError("fetch_failed: Source page is too large for this ingestion phase.", 413, "response_too_large"), { finalUrl: currentUrl, httpStatus: status, contentType });
    }
    const bodyText = await readLimitedResponseText(response, options.maxResponseBytes ?? MAX_RESPONSE_BYTES);
    return {
      originalUrl,
      finalUrl: currentUrl,
      httpStatus: status,
      contentType,
      bodyText,
      contentLength: new TextEncoder().encode(bodyText).length,
      fetchDurationMs: Date.now() - started,
    };
  }

  throw httpError("fetch_failed: Source could not be fetched.", 502, "fetch_failed");
}

export function extractReadableSourceText(sourceText, baseUrl, contentType = "text/html") {
  const text = String(sourceText || "");
  if (!contentType.includes("html") && !contentType.includes("xhtml")) {
    const rawText = capText(normalizeWhitespace(decodeHtml(text)));
    return {
      title: "",
      metaDescription: "",
      canonicalUrl: "",
      headings: [],
      links: [],
      sameDomainLinks: [],
      externalLinks: [],
      rawText,
      extractionVersion: EXTRACTION_VERSION,
    };
  }

  const withoutHidden = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ");
  const title = firstMatch(withoutHidden, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = extractMetaDescription(withoutHidden);
  const canonicalUrl = normalizeOptionalUrl(extractLinkRel(withoutHidden, "canonical"), baseUrl);
  const headings = extractHeadings(withoutHidden);
  const links = extractLinks(withoutHidden, baseUrl);
  const baseDomain = comparableDomain(baseUrl);
  const sameDomainLinks = links.filter((link) => comparableDomain(link) === baseDomain).slice(0, MAX_LINKS);
  const externalLinks = links.filter((link) => comparableDomain(link) !== baseDomain).slice(0, MAX_LINKS);
  const bodyText = withoutHidden
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|main|aside|nav|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|table|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const rawText = capText(normalizeWhitespace(decodeHtml(bodyText)));

  return {
    title: cleanTextValue(decodeHtml(title), 240),
    metaDescription: cleanTextValue(decodeHtml(metaDescription), 500),
    canonicalUrl,
    headings,
    links,
    sameDomainLinks,
    externalLinks,
    rawText,
    extractionVersion: EXTRACTION_VERSION,
  };
}

export async function createBrandIngestionAttempt(store, context) {
  return store.insertBrandIngestionAttempt({
    id: crypto.randomUUID(),
    workspace_id: context.workspace_id,
    brand_id: context.brand_id,
    source_id: context.source_id,
    created_by_user_id: context.created_by_user_id,
    status: "queued",
    source_url: context.source_url || null,
    metadata_json: "{}",
  });
}

export async function markBrandIngestionAttemptRunning(store, attemptId, startedAt = nowIso()) {
  return store.updateBrandIngestionAttempt(attemptId, {
    status: "running",
    started_at: startedAt,
  });
}

export async function markBrandIngestionAttemptSucceeded(store, attemptId, result) {
  return store.updateBrandIngestionAttempt(attemptId, {
    status: "succeeded",
    final_url: result.final_url || null,
    http_status: result.http_status || null,
    content_type: result.content_type || null,
    title: result.title || null,
    error_message: null,
    metadata_json: result.metadata_json || "{}",
    completed_at: result.completed_at || nowIso(),
  });
}

export async function markBrandIngestionAttemptFailed(store, attemptId, error) {
  return store.updateBrandIngestionAttempt(attemptId, {
    status: "failed",
    final_url: error.final_url || null,
    http_status: error.http_status || null,
    content_type: error.content_type || null,
    error_message: error.error_message || "Brand ingestion failed.",
    metadata_json: error.metadata_json || "{}",
    completed_at: error.completed_at || nowIso(),
  });
}

async function requireBrand(store, user, brandId, roles) {
  const brand = await store.getBrand(cleanId(brandId));
  if (!brand || brand.status === "archived") throw httpError("brand_not_found: Brand not found.", 404, "brand_not_found");
  const member = await store.getWorkspaceMember(brand.workspace_id, user.id);
  if (!member) throw httpError("workspace_access_denied: Workspace not found or access denied.", 404, "workspace_access_denied");
  if (!roles.includes(member.role)) throw httpError("workspace_access_denied: You do not have permission for this workspace.", 403, "workspace_access_denied");
  return brand;
}

async function requireBrandSource(store, brand, sourceId) {
  const source = await store.getBrandSource(cleanId(sourceId));
  if (!source || source.brand_id !== brand.id || source.workspace_id !== brand.workspace_id) {
    throw httpError("source_not_found: Brand source not found.", 404, "source_not_found");
  }
  if (source.status === "archived") throw httpError("source_archived: Archived sources cannot be ingested.", 409, "source_archived");
  return source;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "user-agent": USER_AGENT,
      },
      signal: controller.signal,
    });
  } catch (caught) {
    if (caught?.name === "AbortError") throw httpError("fetch_timeout: Source fetch timed out.", 504, "fetch_timeout");
    throw httpError("fetch_failed: Source fetch failed.", 502, "fetch_failed");
  } finally {
    clearTimeout(timer);
  }
}

async function readLimitedResponseText(response, maxBytes) {
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) throw httpError("fetch_failed: Source page is too large for this ingestion phase.", 413, "response_too_large");
      chunks.push(value);
    }
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(buffer);
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw httpError("fetch_failed: Source page is too large for this ingestion phase.", 413, "response_too_large");
  }
  return text;
}

function normalizeIngestionError(error) {
  if (error?.status) return error;
  return httpError("fetch_failed: Brand ingestion failed.", 502, "fetch_failed");
}

function withFetchDetails(error, details) {
  error.finalUrl = details.finalUrl;
  error.httpStatus = details.httpStatus;
  error.contentType = details.contentType;
  return error;
}

function safeErrorMessage(error) {
  return String(error?.message || "Brand ingestion failed.").slice(0, 1000);
}

function normalizeContentType(value) {
  return String(value || "text/plain").split(";")[0].trim().toLowerCase() || "text/plain";
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(Number(status));
}

function extractMetaDescription(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = attrValue(tag, "name") || attrValue(tag, "property");
    if (String(name || "").toLowerCase() === "description" || String(name || "").toLowerCase() === "og:description") {
      return attrValue(tag, "content") || "";
    }
  }
  return "";
}

function extractLinkRel(html, relName) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = String(attrValue(tag, "rel") || "").toLowerCase().split(/\s+/);
    if (rel.includes(relName)) return attrValue(tag, "href") || "";
  }
  return "";
}

function extractHeadings(html) {
  const headings = [];
  for (const match of html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = cleanTextValue(decodeHtml(match[2].replace(/<[^>]+>/g, " ")), 240);
    if (text) headings.push({ level: Number(match[1]), text });
    if (headings.length >= MAX_HEADINGS) break;
  }
  return headings;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)) {
    const rawHref = match[1].replace(/^['"]|['"]$/g, "").trim();
    const url = normalizeOptionalUrl(decodeHtml(rawHref), baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push(url);
    if (links.length >= MAX_LINKS) break;
  }
  return links;
}

function normalizeOptionalUrl(value, baseUrl) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("#")) return "";
  try {
    const url = new URL(text, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function comparableDomain(value) {
  try {
    return canonicalHostname(new URL(value).hostname).replace(/^www\./, "");
  } catch {
    return "";
  }
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1] || "";
}

function attrValue(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = String(tag || "").match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function capText(value) {
  return String(value || "").slice(0, MAX_RAW_TEXT_CHARS);
}

function cleanTextValue(value, maxLength = 500) {
  return normalizeWhitespace(value).slice(0, maxLength);
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === "#") {
      const code = key[1] === "x" ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[key] ?? match;
  });
}

function compactMetadata(value) {
  const output = {};
  for (const [key, item] of Object.entries(value || {}).slice(0, 80)) {
    if (!key) continue;
    output[String(key).slice(0, 100)] = compactMetadataValue(item, 0);
  }
  return output;
}

function compactMetadataValue(value, depth) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => compactMetadataValue(item, depth + 1));
  if (typeof value === "object" && depth < 4) {
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 80)) {
      output[String(key).slice(0, 100)] = compactMetadataValue(item, depth + 1);
    }
    return output;
  }
  return null;
}

function parseStoredObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return compactMetadata(value);
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? compactMetadata(parsed) : {};
  } catch {
    return {};
  }
}

function shapeBrandSource(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    brandId: row.brand_id,
    createdByUserId: row.created_by_user_id,
    sourceType: row.source_type,
    sourceUrl: row.source_url || null,
    assetId: row.asset_id || null,
    title: row.title || null,
    rawText: row.raw_text || null,
    metadata: parseStoredObject(row.metadata_json),
    status: row.status,
    lastIngestedAt: row.last_ingested_at || null,
    lastIngestionAttemptId: row.last_ingestion_attempt_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at || null,
  };
}

function shapeBrandIngestionAttempt(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    brandId: row.brand_id,
    sourceId: row.source_id,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    sourceUrl: row.source_url || null,
    finalUrl: row.final_url || null,
    httpStatus: row.http_status ?? null,
    contentType: row.content_type || null,
    title: row.title || null,
    errorMessage: row.error_message || null,
    metadata: parseStoredObject(row.metadata_json),
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function canonicalHostname(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}

function parseIPv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d+$/.test(part))) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => part < 0 || part > 255)) return null;
  return numbers;
}

function isBlockedIPv4([a, b]) {
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 198 && (b === 18 || b === 19))
  );
}

function looksLikeIPv6(hostname) {
  return hostname.includes(":");
}

function isBlockedIPv6(hostname) {
  const text = hostname.toLowerCase();
  if (text === "::1" || text === "0:0:0:0:0:0:0:1" || text === "::") return true;
  if (text.startsWith("fc") || text.startsWith("fd") || text.startsWith("fe80:")) return true;
  const embedded = text.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  return embedded ? isBlockedIPv4(parseIPv4(embedded) || [0, 0, 0, 0]) : false;
}

function cleanId(value) {
  const text = String(value || "").trim().slice(0, 160);
  if (!text) throw httpError("invalid_id: Missing id.", 400, "invalid_id");
  return text;
}

function requireIdentity(user) {
  if (!user?.id) throw httpError("auth_required: Please log in before using this tool.", 401, "auth_required");
}

function nowIso() {
  return new Date().toISOString();
}

function stamp(row) {
  const now = nowIso();
  return {
    ...row,
    created_at: row.created_at || now,
    updated_at: now,
  };
}

function sortNewestFirst(left, right) {
  return String(right.created_at || right.updated_at || "").localeCompare(String(left.created_at || left.updated_at || ""));
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function requiredDb(env) {
  if (!env?.OPREALM_DB) throw httpError("OPRealm database is not connected.", 500, "database_unavailable");
  return env.OPREALM_DB;
}

async function addColumnIfMissing(db, table, columnSql) {
  const columnName = columnSql.split(/\s+/)[0];
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const columns = result.results || [];
  if (!columns.some((column) => column.name === columnName)) {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnSql}`).run();
  }
}

function httpError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
