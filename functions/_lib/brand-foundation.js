import { ensureContentFoundationSchema } from "./content-foundation.js";
import { cleanText, enumValue, requireMinText } from "./validate.js";

export const BRAND_STATUSES = ["draft", "active", "archived"];
export const BRAND_SOURCE_TYPES = [
  "website_page",
  "manual_note",
  "uploaded_document",
  "source_video",
  "product_image",
  "logo",
  "testimonial",
  "faq",
  "existing_ad",
  "competitor_reference",
  "youtube_url",
  "social_profile",
  "other",
];
export const BRAND_SOURCE_STATUSES = ["pending", "ingesting", "active", "archived", "failed"];
export const BRAND_READ_ROLES = ["owner", "admin", "member", "viewer", "client", "friend"];
export const BRAND_WRITE_ROLES = ["owner", "admin", "member", "client", "friend"];

const URL_SOURCE_TYPES = new Set(["website_page", "youtube_url", "social_profile", "competitor_reference"]);

export async function ensureBrandFoundationSchema(env) {
  await ensureContentFoundationSchema(env);
  const db = requiredDb(env);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      website TEXT,
      industry TEXT,
      business_type TEXT,
      product_or_service TEXT,
      offer TEXT,
      primary_cta TEXT,
      target_audience TEXT,
      tone_of_voice TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      brand_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (created_by_user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brands_workspace_status ON brands(workspace_id, status)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brands_created_by_user ON brands(created_by_user_id)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS brand_sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_url TEXT,
      asset_id TEXT,
      title TEXT,
      raw_text TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      last_ingested_at TEXT,
      last_ingestion_attempt_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (created_by_user_id) REFERENCES web_users(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_sources_brand_status ON brand_sources(brand_id, status)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_sources_workspace ON brand_sources(workspace_id, status)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_sources_asset ON brand_sources(asset_id)").run();
  await addColumnIfMissing(db, "brand_sources", "last_ingested_at TEXT");
  await addColumnIfMissing(db, "brand_sources", "last_ingestion_attempt_id TEXT");

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS brand_brains (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      brand_id TEXT NOT NULL UNIQUE,
      brain_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (brand_id) REFERENCES brands(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_brand_brains_workspace ON brand_brains(workspace_id)").run();
}

export function createD1BrandStore(db) {
  if (!db) throw httpError("OPRealm database is not connected.", 500);
  return {
    async transaction(callback) {
      return callback(this);
    },
    async getWorkspaceMember(workspaceId, userId) {
      return db.prepare("SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1")
        .bind(workspaceId, userId)
        .first();
    },
    async getAsset(id) {
      return db.prepare("SELECT * FROM assets WHERE id = ? LIMIT 1").bind(id).first();
    },
    async insertBrand(row) {
      await db.prepare(`
        INSERT INTO brands (
          id, workspace_id, created_by_user_id, name, website, industry, business_type,
          product_or_service, offer, primary_cta, target_audience, tone_of_voice,
          status, brand_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        row.id,
        row.workspace_id,
        row.created_by_user_id,
        row.name,
        row.website || null,
        row.industry || null,
        row.business_type || null,
        row.product_or_service || null,
        row.offer || null,
        row.primary_cta || null,
        row.target_audience || null,
        row.tone_of_voice || null,
        row.status,
        row.brand_json,
      ).run();
      return this.getBrand(row.id);
    },
    async getBrand(id) {
      return db.prepare("SELECT * FROM brands WHERE id = ? LIMIT 1").bind(id).first();
    },
    async listBrands(workspaceId, { status = "", includeArchived = false } = {}) {
      if (status) {
        const rows = await db.prepare(`
          SELECT * FROM brands
          WHERE workspace_id = ? AND status = ?
          ORDER BY updated_at DESC, created_at DESC
        `).bind(workspaceId, status).all();
        return rows.results || [];
      }
      if (includeArchived) {
        const rows = await db.prepare(`
          SELECT * FROM brands
          WHERE workspace_id = ?
          ORDER BY updated_at DESC, created_at DESC
        `).bind(workspaceId).all();
        return rows.results || [];
      }
      const rows = await db.prepare(`
        SELECT * FROM brands
        WHERE workspace_id = ? AND status != 'archived'
        ORDER BY updated_at DESC, created_at DESC
      `).bind(workspaceId).all();
      return rows.results || [];
    },
    async updateBrand(id, updates) {
      const existing = await this.getBrand(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE brands
        SET name = ?,
            website = ?,
            industry = ?,
            business_type = ?,
            product_or_service = ?,
            offer = ?,
            primary_cta = ?,
            target_audience = ?,
            tone_of_voice = ?,
            status = ?,
            brand_json = ?,
            updated_at = datetime('now'),
            archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, datetime('now')) ELSE NULL END
        WHERE id = ?
      `).bind(
        next.name,
        next.website || null,
        next.industry || null,
        next.business_type || null,
        next.product_or_service || null,
        next.offer || null,
        next.primary_cta || null,
        next.target_audience || null,
        next.tone_of_voice || null,
        next.status,
        next.brand_json,
        next.status,
        id,
      ).run();
      return this.getBrand(id);
    },
    async insertBrandSource(row) {
      await db.prepare(`
        INSERT INTO brand_sources (
          id, workspace_id, brand_id, created_by_user_id, source_type, source_url,
          asset_id, title, raw_text, metadata_json, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        row.id,
        row.workspace_id,
        row.brand_id,
        row.created_by_user_id,
        row.source_type,
        row.source_url || null,
        row.asset_id || null,
        row.title || null,
        row.raw_text || null,
        row.metadata_json,
        row.status,
      ).run();
      return this.getBrandSource(row.id);
    },
    async getBrandSource(id) {
      return db.prepare("SELECT * FROM brand_sources WHERE id = ? LIMIT 1").bind(id).first();
    },
    async listBrandSources(brandId, { status = "", includeArchived = false } = {}) {
      if (status) {
        const rows = await db.prepare(`
          SELECT * FROM brand_sources
          WHERE brand_id = ? AND status = ?
          ORDER BY updated_at DESC, created_at DESC
        `).bind(brandId, status).all();
        return rows.results || [];
      }
      if (includeArchived) {
        const rows = await db.prepare(`
          SELECT * FROM brand_sources
          WHERE brand_id = ?
          ORDER BY updated_at DESC, created_at DESC
        `).bind(brandId).all();
        return rows.results || [];
      }
      const rows = await db.prepare(`
        SELECT * FROM brand_sources
        WHERE brand_id = ? AND status != 'archived'
        ORDER BY updated_at DESC, created_at DESC
      `).bind(brandId).all();
      return rows.results || [];
    },
    async updateBrandSource(id, updates) {
      const existing = await this.getBrandSource(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE brand_sources
        SET source_type = ?,
            source_url = ?,
            asset_id = ?,
            title = ?,
            raw_text = ?,
            metadata_json = ?,
            status = ?,
            last_ingested_at = ?,
            last_ingestion_attempt_id = ?,
            updated_at = datetime('now'),
            archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, datetime('now')) ELSE NULL END
        WHERE id = ?
      `).bind(
        next.source_type,
        next.source_url || null,
        next.asset_id || null,
        next.title || null,
        next.raw_text || null,
        next.metadata_json,
        next.status,
        next.last_ingested_at || null,
        next.last_ingestion_attempt_id || null,
        next.status,
        id,
      ).run();
      return this.getBrandSource(id);
    },
    async insertBrandBrain(row) {
      await db.prepare(`
        INSERT OR IGNORE INTO brand_brains (id, workspace_id, brand_id, brain_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(row.id, row.workspace_id, row.brand_id, row.brain_json).run();
      return this.getBrandBrainByBrandId(row.brand_id);
    },
    async getBrandBrainByBrandId(brandId) {
      return db.prepare("SELECT * FROM brand_brains WHERE brand_id = ? LIMIT 1").bind(brandId).first();
    },
    async updateBrandBrain(id, updates) {
      const existing = await db.prepare("SELECT * FROM brand_brains WHERE id = ? LIMIT 1").bind(id).first();
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE brand_brains
        SET brain_json = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(next.brain_json, id).run();
      return this.getBrandBrainByBrandId(next.brand_id);
    },
  };
}

export function createMemoryBrandStore(seed = {}) {
  const contentState = seed.contentStore?.state || seed.foundationStore?.state || seed.contentState || null;
  const state = {
    workspaceMembers: new Map((seed.workspaceMembers || []).map((row) => [`${row.workspace_id}:${row.user_id}`, { ...row }])),
    assets: new Map((seed.assets || []).map((row) => [row.id, { ...row }])),
    brands: new Map((seed.brands || []).map((row) => [row.id, { ...row }])),
    brandSources: new Map((seed.brandSources || []).map((row) => [row.id, { ...row }])),
    brandBrains: new Map((seed.brandBrains || []).map((row) => [row.id, { ...row }])),
  };
  return {
    state,
    async transaction(callback) {
      return callback(this);
    },
    async getWorkspaceMember(workspaceId, userId) {
      const source = contentState?.workspaceMembers || state.workspaceMembers;
      return clone(source.get(`${workspaceId}:${userId}`));
    },
    async getAsset(id) {
      const source = contentState?.assets || state.assets;
      return clone(source.get(id));
    },
    async insertBrand(row) {
      const stored = stamp(row);
      state.brands.set(stored.id, stored);
      return clone(stored);
    },
    async getBrand(id) {
      return clone(state.brands.get(id));
    },
    async listBrands(workspaceId, { status = "", includeArchived = false } = {}) {
      return [...state.brands.values()]
        .filter((brand) => brand.workspace_id === workspaceId)
        .filter((brand) => (status ? brand.status === status : includeArchived || brand.status !== "archived"))
        .sort(sortNewestFirst)
        .map(clone);
    },
    async updateBrand(id, updates) {
      const existing = state.brands.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      stored.archived_at = stored.status === "archived" ? stored.archived_at || nowIso() : null;
      state.brands.set(id, stored);
      return clone(stored);
    },
    async insertBrandSource(row) {
      const stored = stamp(row);
      state.brandSources.set(stored.id, stored);
      return clone(stored);
    },
    async getBrandSource(id) {
      return clone(state.brandSources.get(id));
    },
    async listBrandSources(brandId, { status = "", includeArchived = false } = {}) {
      return [...state.brandSources.values()]
        .filter((source) => source.brand_id === brandId)
        .filter((source) => (status ? source.status === status : includeArchived || source.status !== "archived"))
        .sort(sortNewestFirst)
        .map(clone);
    },
    async updateBrandSource(id, updates) {
      const existing = state.brandSources.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      stored.archived_at = stored.status === "archived" ? stored.archived_at || nowIso() : null;
      state.brandSources.set(id, stored);
      return clone(stored);
    },
    async insertBrandBrain(row) {
      const existing = [...state.brandBrains.values()].find((brain) => brain.brand_id === row.brand_id);
      if (existing) return clone(existing);
      const stored = stamp(row);
      state.brandBrains.set(stored.id, stored);
      return clone(stored);
    },
    async getBrandBrainByBrandId(brandId) {
      return clone([...state.brandBrains.values()].find((brain) => brain.brand_id === brandId));
    },
    async updateBrandBrain(id, updates) {
      const existing = state.brandBrains.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      state.brandBrains.set(id, stored);
      return clone(stored);
    },
  };
}

export function createBrandServices(store) {
  if (!store) throw httpError("Brand foundation store is not available.", 500);
  return {
    createBrand: (user, input) => createBrand(store, user, input),
    listBrands: (user, input) => listBrands(store, user, input),
    getBrand: (user, brandId) => getBrand(store, user, brandId),
    updateBrand: (user, brandId, input) => updateBrand(store, user, brandId, input),
    archiveBrand: (user, brandId) => archiveBrand(store, user, brandId),
    createBrandSource: (user, brandId, input) => createBrandSource(store, user, brandId, input),
    listBrandSources: (user, brandId, input) => listBrandSources(store, user, brandId, input),
    getBrandSource: (user, brandId, sourceId) => getBrandSource(store, user, brandId, sourceId),
    updateBrandSource: (user, brandId, sourceId, input) => updateBrandSource(store, user, brandId, sourceId, input),
    archiveBrandSource: (user, brandId, sourceId) => archiveBrandSource(store, user, brandId, sourceId),
    getOrCreateBrandBrain: (user, brandId) => getOrCreateBrandBrain(store, user, brandId),
    updateBrandBrain: (user, brandId, input) => updateBrandBrain(store, user, brandId, input),
  };
}

export async function createBrand(store, user, input = {}) {
  requireIdentity(user);
  const workspaceId = cleanId(input.workspaceId || input.workspace_id);
  await requireWorkspaceRole(store, workspaceId, user.id, BRAND_WRITE_ROLES);
  const brandJson = await normalizeBrandJson(input.brandJson ?? input.brand_json ?? {}, store, workspaceId);
  const brand = await store.insertBrand({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    created_by_user_id: user.id,
    name: requireMinText(input.name || input.businessName || input.business_name, "Brand name", 1, 120),
    website: cleanOptionalWebUrl(input.website ?? input.websiteUrl ?? input.website_url, "Brand website"),
    industry: cleanOptionalText(input.industry, 160),
    business_type: cleanOptionalText(input.businessType || input.business_type, 160),
    product_or_service: cleanOptionalText(input.productOrService || input.product_or_service, 600),
    offer: cleanOptionalText(input.offer, 1000),
    primary_cta: cleanOptionalText(input.primaryCTA || input.primaryCta || input.primary_cta, 240),
    target_audience: cleanOptionalText(input.targetAudience || input.target_audience, 1000),
    tone_of_voice: cleanOptionalText(input.toneOfVoice || input.tone_of_voice, 600),
    status: enumValue(input.status || "draft", BRAND_STATUSES, "draft"),
    brand_json: JSON.stringify(brandJson),
  });
  await store.insertBrandBrain({
    id: crypto.randomUUID(),
    workspace_id: brand.workspace_id,
    brand_id: brand.id,
    brain_json: JSON.stringify(defaultBrainJson(brand, brandJson)),
  });
  return shapeBrand(brand);
}

export async function listBrands(store, user, input = {}) {
  requireIdentity(user);
  const workspaceId = cleanId(input.workspaceId || input.workspace_id);
  await requireWorkspaceMember(store, workspaceId, user.id);
  const status = cleanOptionalEnum(input.status, BRAND_STATUSES, "Brand status");
  const includeArchived = parseBoolean(input.includeArchived ?? input.include_archived);
  return (await store.listBrands(workspaceId, { status, includeArchived })).map(shapeBrand);
}

export async function getBrand(store, user, brandId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  return shapeBrand(brand);
}

export async function updateBrand(store, user, brandId, input = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  const updates = {};
  if ("name" in input) updates.name = requireMinText(input.name, "Brand name", 1, 120);
  if ("website" in input || "websiteUrl" in input || "website_url" in input) {
    updates.website = cleanOptionalWebUrl(input.website ?? input.websiteUrl ?? input.website_url, "Brand website");
  }
  if ("industry" in input) updates.industry = cleanOptionalText(input.industry, 160);
  if ("businessType" in input || "business_type" in input) {
    updates.business_type = cleanOptionalText(input.businessType || input.business_type, 160);
  }
  if ("productOrService" in input || "product_or_service" in input) {
    updates.product_or_service = cleanOptionalText(input.productOrService || input.product_or_service, 600);
  }
  if ("offer" in input) updates.offer = cleanOptionalText(input.offer, 1000);
  if ("primaryCTA" in input || "primaryCta" in input || "primary_cta" in input) {
    updates.primary_cta = cleanOptionalText(input.primaryCTA || input.primaryCta || input.primary_cta, 240);
  }
  if ("targetAudience" in input || "target_audience" in input) {
    updates.target_audience = cleanOptionalText(input.targetAudience || input.target_audience, 1000);
  }
  if ("toneOfVoice" in input || "tone_of_voice" in input) {
    updates.tone_of_voice = cleanOptionalText(input.toneOfVoice || input.tone_of_voice, 600);
  }
  if ("status" in input) {
    updates.status = enumValue(input.status, BRAND_STATUSES, "");
    if (!updates.status) throw httpError("Brand status is invalid.", 400);
  }
  if ("brandJson" in input || "brand_json" in input) {
    updates.brand_json = JSON.stringify(await normalizeBrandJson(input.brandJson ?? input.brand_json, store, brand.workspace_id));
  }
  return shapeBrand(await store.updateBrand(brand.id, updates));
}

export async function archiveBrand(store, user, brandId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  return shapeBrand(await store.updateBrand(brand.id, { status: "archived" }));
}

export async function createBrandSource(store, user, brandId, input = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  const sourceType = cleanSourceType(input.sourceType || input.source_type || input.type);
  const assetId = await cleanAndAuthorizeAssetId(input.assetId || input.asset_id, store, brand.workspace_id);
  const sourceUrl = cleanOptionalWebUrl(input.sourceUrl || input.source_url || input.url || input.uri, "Brand source URL");
  validateSourcePayload(sourceType, { sourceUrl, assetId, rawText: input.rawText || input.raw_text });
  const status = "status" in input
    ? cleanSourceStatus(input.status)
    : (URL_SOURCE_TYPES.has(sourceType) ? "pending" : "active");
  const source = await store.insertBrandSource({
    id: crypto.randomUUID(),
    workspace_id: brand.workspace_id,
    brand_id: brand.id,
    created_by_user_id: user.id,
    source_type: sourceType,
    source_url: sourceUrl,
    asset_id: assetId,
    title: cleanOptionalText(input.title, 240),
    raw_text: cleanOptionalLongText(input.rawText || input.raw_text, 20000),
    metadata_json: JSON.stringify(parseInputObject(input.metadata ?? input.metadataJson ?? input.metadata_json ?? {}, "Brand source metadata")),
    status,
  });
  return shapeBrandSource(source);
}

export async function listBrandSources(store, user, brandId, input = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  const status = cleanOptionalEnum(input.status, BRAND_SOURCE_STATUSES, "Brand source status");
  const includeArchived = parseBoolean(input.includeArchived ?? input.include_archived);
  return (await store.listBrandSources(brand.id, { status, includeArchived })).map(shapeBrandSource);
}

export async function getBrandSource(store, user, brandId, sourceId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  return shapeBrandSource(await requireBrandSource(store, brand, sourceId));
}

export async function updateBrandSource(store, user, brandId, sourceId, input = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  const source = await requireBrandSource(store, brand, sourceId);
  const updates = {};
  const nextType = "sourceType" in input || "source_type" in input || "type" in input
    ? cleanSourceType(input.sourceType || input.source_type || input.type)
    : source.source_type;
  updates.source_type = nextType;
  if ("sourceUrl" in input || "source_url" in input || "url" in input || "uri" in input) {
    updates.source_url = cleanOptionalWebUrl(input.sourceUrl || input.source_url || input.url || input.uri, "Brand source URL");
  }
  if ("assetId" in input || "asset_id" in input) {
    updates.asset_id = await cleanAndAuthorizeAssetId(input.assetId || input.asset_id, store, brand.workspace_id);
  }
  if ("title" in input) updates.title = cleanOptionalText(input.title, 240);
  if ("rawText" in input || "raw_text" in input) {
    updates.raw_text = cleanOptionalLongText(input.rawText || input.raw_text, 20000);
  }
  if ("metadata" in input || "metadataJson" in input || "metadata_json" in input) {
    updates.metadata_json = JSON.stringify(parseInputObject(input.metadata ?? input.metadataJson ?? input.metadata_json, "Brand source metadata"));
  }
  if ("status" in input) updates.status = cleanSourceStatus(input.status);
  validateSourcePayload(nextType, {
    sourceUrl: updates.source_url ?? source.source_url,
    assetId: updates.asset_id ?? source.asset_id,
    rawText: updates.raw_text ?? source.raw_text,
  });
  return shapeBrandSource(await store.updateBrandSource(source.id, updates));
}

export async function archiveBrandSource(store, user, brandId, sourceId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  const source = await requireBrandSource(store, brand, sourceId);
  return shapeBrandSource(await store.updateBrandSource(source.id, { status: "archived" }));
}

export async function getOrCreateBrandBrain(store, user, brandId) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  return shapeBrandBrain(await getOrCreateBrandBrainRow(store, brand));
}

export async function updateBrandBrain(store, user, brandId, input = {}) {
  requireIdentity(user);
  const brand = await requireBrand(store, user, brandId);
  await requireWorkspaceRole(store, brand.workspace_id, user.id, BRAND_WRITE_ROLES);
  const existing = await getOrCreateBrandBrainRow(store, brand);
  const current = parseStoredObject(existing.brain_json);
  const patch = ("brainJson" in input || "brain_json" in input)
    ? parseInputObject(input.brainJson ?? input.brain_json, "Brand Brain JSON")
    : parseInputObject(input, "Brand Brain JSON");
  const next = await normalizeBrainJson(deepMerge(current, patch), store, brand);
  return shapeBrandBrain(await store.updateBrandBrain(existing.id, { brain_json: JSON.stringify(next) }));
}

async function getOrCreateBrandBrainRow(store, brand) {
  const existing = await store.getBrandBrainByBrandId(brand.id);
  if (existing) return existing;
  return store.insertBrandBrain({
    id: crypto.randomUUID(),
    workspace_id: brand.workspace_id,
    brand_id: brand.id,
    brain_json: JSON.stringify(defaultBrainJson(brand, parseStoredObject(brand.brand_json))),
  });
}

async function requireBrand(store, user, brandId) {
  const brand = await store.getBrand(cleanId(brandId));
  if (!brand || brand.status === "archived") throw httpError("Brand not found.", 404);
  await requireWorkspaceMember(store, brand.workspace_id, user.id);
  return brand;
}

async function requireBrandSource(store, brand, sourceId) {
  const source = await store.getBrandSource(cleanId(sourceId));
  if (!source || source.status === "archived" || source.brand_id !== brand.id || source.workspace_id !== brand.workspace_id) {
    throw httpError("Brand source not found.", 404);
  }
  return source;
}

async function requireWorkspaceMember(store, workspaceId, userId) {
  const member = await store.getWorkspaceMember(cleanId(workspaceId), cleanId(userId));
  if (!member) throw httpError("Workspace not found or access denied.", 404);
  if (!BRAND_READ_ROLES.includes(member.role)) throw httpError("You do not have permission for this workspace.", 403);
  return member;
}

async function requireWorkspaceRole(store, workspaceId, userId, roles) {
  const member = await requireWorkspaceMember(store, workspaceId, userId);
  if (!roles.includes(member.role)) throw httpError("You do not have permission for this workspace.", 403);
  return member;
}

async function normalizeBrandJson(value, store, workspaceId) {
  const input = parseInputObject(value, "Brand JSON");
  const visualIdentity = await normalizeVisualIdentity(input.visualIdentity || input.visual_identity || {}, store, workspaceId);
  return {
    ...cleanJsonObject(input),
    painPoints: cleanStringArray(input.painPoints || input.pain_points),
    desiredOutcomes: cleanStringArray(input.desiredOutcomes || input.desired_outcomes),
    objections: cleanStringArray(input.objections),
    proofPoints: cleanStringArray(input.proofPoints || input.proof_points),
    testimonials: cleanStringArray(input.testimonials),
    faqs: cleanStringArray(input.faqs || input.FAQs),
    brandWords: cleanStringArray(input.brandWords || input.brand_words),
    avoidWords: cleanStringArray(input.avoidWords || input.avoid_words),
    visualIdentity,
    notes: cleanOptionalLongText(input.notes, 4000) || "",
  };
}

async function normalizeBrainJson(value, store, brand) {
  const input = parseInputObject(value, "Brand Brain JSON");
  const visualIdentity = await normalizeVisualIdentity(input.visualIdentity || input.visual_identity || {}, store, brand.workspace_id);
  const sourceIds = cleanStringArray(input.sourceIds || input.source_ids);
  await validateSourceIds(store, brand, sourceIds);
  return {
    ...cleanJsonObject(input),
    summary: cleanOptionalLongText(input.summary, 2000) || "",
    offer: cleanOptionalLongText(input.offer, 1000) || "",
    primaryCTA: cleanOptionalText(input.primaryCTA || input.primaryCta || input.primary_cta, 240) || "",
    audience: cleanOptionalLongText(input.audience || input.targetAudience || input.target_audience, 1000) || "",
    painPoints: cleanStringArray(input.painPoints || input.pain_points),
    objections: cleanStringArray(input.objections),
    desiredOutcomes: cleanStringArray(input.desiredOutcomes || input.desired_outcomes),
    proofPoints: cleanStringArray(input.proofPoints || input.proof_points),
    testimonials: cleanStringArray(input.testimonials),
    faqs: cleanStringArray(input.faqs || input.FAQs),
    toneOfVoice: cleanOptionalLongText(input.toneOfVoice || input.tone_of_voice, 600) || "",
    brandWords: cleanStringArray(input.brandWords || input.brand_words),
    avoidWords: cleanStringArray(input.avoidWords || input.avoid_words),
    visualIdentity,
    contentNotes: cleanOptionalLongText(input.contentNotes || input.content_notes, 4000) || "",
    agencyNotes: cleanOptionalLongText(input.agencyNotes || input.agency_notes, 4000) || "",
    sourceIds,
  };
}

function defaultBrandJson() {
  return {
    painPoints: [],
    desiredOutcomes: [],
    objections: [],
    proofPoints: [],
    testimonials: [],
    faqs: [],
    brandWords: [],
    avoidWords: [],
    visualIdentity: defaultVisualIdentity(),
    notes: "",
  };
}

function defaultVisualIdentity() {
  return {
    colours: [],
    fonts: [],
    logoAssetIds: [],
    imageStyle: "",
    videoStyle: "",
  };
}

function defaultBrainJson(brand = {}, brandJson = {}) {
  const normalizedBrandJson = { ...defaultBrandJson(), ...cleanJsonObject(brandJson) };
  return {
    summary: "",
    offer: brand.offer || "",
    primaryCTA: brand.primary_cta || "",
    audience: brand.target_audience || "",
    painPoints: normalizedBrandJson.painPoints || [],
    objections: normalizedBrandJson.objections || [],
    desiredOutcomes: normalizedBrandJson.desiredOutcomes || [],
    proofPoints: normalizedBrandJson.proofPoints || [],
    testimonials: normalizedBrandJson.testimonials || [],
    faqs: normalizedBrandJson.faqs || [],
    toneOfVoice: brand.tone_of_voice || "",
    brandWords: normalizedBrandJson.brandWords || [],
    avoidWords: normalizedBrandJson.avoidWords || [],
    visualIdentity: normalizedBrandJson.visualIdentity || defaultVisualIdentity(),
    contentNotes: "",
    agencyNotes: "",
    sourceIds: [],
  };
}

async function normalizeVisualIdentity(value, store, workspaceId) {
  const input = parseInputObject(value || {}, "Brand visual identity");
  const logoAssetIds = cleanStringArray(input.logoAssetIds || input.logo_asset_ids);
  for (const assetId of logoAssetIds) {
    await requireWorkspaceAsset(store, assetId, workspaceId);
  }
  return {
    ...cleanJsonObject(input),
    colours: cleanStringArray(input.colours || input.colors),
    fonts: cleanStringArray(input.fonts),
    logoAssetIds,
    imageStyle: cleanOptionalLongText(input.imageStyle || input.image_style, 1000) || "",
    videoStyle: cleanOptionalLongText(input.videoStyle || input.video_style, 1000) || "",
  };
}

async function validateSourceIds(store, brand, sourceIds) {
  for (const sourceId of sourceIds) {
    const source = await store.getBrandSource(sourceId);
    if (!source || source.status === "archived" || source.workspace_id !== brand.workspace_id || source.brand_id !== brand.id) {
      throw httpError("Brand Brain sourceIds must reference active sources for this brand.", 400);
    }
  }
}

async function cleanAndAuthorizeAssetId(value, store, workspaceId) {
  const assetId = cleanOptionalId(value);
  if (!assetId) return null;
  await requireWorkspaceAsset(store, assetId, workspaceId);
  return assetId;
}

async function requireWorkspaceAsset(store, assetId, workspaceId) {
  const asset = await store.getAsset(cleanId(assetId));
  if (!asset || asset.workspace_id !== workspaceId || asset.visibility === "archived") {
    throw httpError("Asset not found or access denied.", 404);
  }
  return asset;
}

function validateSourcePayload(sourceType, { sourceUrl, assetId, rawText }) {
  if (URL_SOURCE_TYPES.has(sourceType) && !sourceUrl) {
    throw httpError("This brand source type requires a URL.", 400);
  }
  if (sourceType === "manual_note" && !cleanOptionalLongText(rawText, 20000)) {
    throw httpError("Manual note sources require raw text.", 400);
  }
  if (["uploaded_document", "source_video", "product_image", "logo"].includes(sourceType) && !assetId) {
    throw httpError("This brand source type requires a workspace asset.", 400);
  }
}

function shapeBrand(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    createdByUserId: row.created_by_user_id,
    name: row.name,
    website: row.website || null,
    industry: row.industry || null,
    businessType: row.business_type || null,
    productOrService: row.product_or_service || null,
    offer: row.offer || null,
    primaryCTA: row.primary_cta || null,
    targetAudience: row.target_audience || null,
    toneOfVoice: row.tone_of_voice || null,
    status: row.status,
    brandJson: { ...defaultBrandJson(), ...parseStoredObject(row.brand_json) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at || null,
  };
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

function shapeBrandBrain(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    brandId: row.brand_id,
    brainJson: { ...defaultBrainJson(), ...parseStoredObject(row.brain_json) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseInputObject(value, label) {
  if (value == null || value === "") return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
      return parsed;
    } catch {
      throw httpError(`${label} must be a JSON object.`, 400);
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) throw httpError(`${label} must be a JSON object.`, 400);
  return value;
}

function parseStoredObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return cleanJsonObject(value);
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? cleanJsonObject(parsed) : {};
  } catch {
    return {};
  }
}

function cleanJsonObject(value, depth = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 4) return {};
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 80)) {
    const cleanKey = cleanText(key, 100);
    if (!cleanKey) continue;
    output[cleanKey] = cleanJsonValue(item, depth + 1);
  }
  return output;
}

function cleanJsonValue(value, depth) {
  if (typeof value === "string") return cleanText(value, 4000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => cleanJsonValue(item, depth + 1));
  if (typeof value === "object") return cleanJsonObject(value, depth);
  return null;
}

function cleanStringArray(value, maxItems = 80, maxLength = 500) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function cleanSourceType(value) {
  const sourceType = enumValue(value || "manual_note", BRAND_SOURCE_TYPES, "");
  if (!sourceType) throw httpError("Brand source type is invalid.", 400);
  return sourceType;
}

function cleanSourceStatus(value) {
  const status = enumValue(value || "active", BRAND_SOURCE_STATUSES, "");
  if (!status) throw httpError("Brand source status is invalid.", 400);
  return status;
}

function cleanOptionalEnum(value, allowed, label) {
  const text = cleanText(value || "", 120);
  if (!text) return "";
  if (!allowed.includes(text)) throw httpError(`${label} is invalid.`, 400);
  return text;
}

function cleanOptionalText(value, maxLength = 500) {
  const text = cleanText(value || "", maxLength);
  return text || null;
}

function cleanOptionalLongText(value, maxLength = 4000) {
  const text = cleanText(value || "", maxLength);
  return text || null;
}

function cleanId(value) {
  const text = cleanText(value || "", 160);
  if (!text) throw httpError("Missing id.", 400);
  return text;
}

function cleanOptionalId(value) {
  const text = cleanText(value || "", 160);
  return text || null;
}

function cleanOptionalWebUrl(value, label) {
  const text = cleanText(value || "", 1600);
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw httpError(`${label} is invalid.`, 400);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw httpError(`${label} must use http or https.`, 400);
  return url.toString();
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  return false;
}

function requireIdentity(user) {
  if (!user?.id) throw httpError("Please log in before using this tool.", 401);
}

function deepMerge(base, patch) {
  const output = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && output[key]
      && typeof output[key] === "object"
      && !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
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
  return String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || ""));
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function requiredDb(env) {
  if (!env?.OPREALM_DB) throw httpError("OPRealm database is not connected.", 500);
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

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
