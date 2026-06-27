import { cleanText, enumValue, requireMinText } from "./validate.js";

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer", "client", "friend"];
export const WORKSPACE_TYPES = ["personal", "business", "friend", "client", "admin"];
export const INVITE_STATUSES = ["pending", "accepted", "expired", "revoked"];
export const ASSET_TYPES = [
  "image",
  "video",
  "audio",
  "document",
  "logo",
  "product_image",
  "source_video",
  "generated_image",
  "generated_video",
  "thumbnail",
  "export_package",
];
export const ASSET_VISIBILITIES = ["private", "workspace", "public_link", "archived"];
export const TOKEN_TRANSACTION_TYPES = [
  "purchase",
  "admin_grant",
  "reservation",
  "reservation_release",
  "spend",
  "refund",
  "adjustment",
];
export const TOKEN_RESERVATION_STATUSES = [
  "created",
  "reserved",
  "partially_spent",
  "spent",
  "released",
  "refunded",
  "failed",
];

const DEFAULT_TOKEN_PACKS = [
  {
    id: "starter-1000",
    name: "Starter 1,000",
    tokens: 1000,
    price_cents: 1900,
    currency: "AUD",
    active: 1,
    metadata_json: JSON.stringify({ phase: "foundation", description: "Starter OPREALM token pack" }),
  },
  {
    id: "growth-5000",
    name: "Growth 5,000",
    tokens: 5000,
    price_cents: 7900,
    currency: "AUD",
    active: 1,
    metadata_json: JSON.stringify({ phase: "foundation", description: "Growth OPREALM token pack" }),
  },
  {
    id: "studio-12000",
    name: "Studio 12,000",
    tokens: 12000,
    price_cents: 14900,
    currency: "AUD",
    active: 1,
    metadata_json: JSON.stringify({ phase: "foundation", description: "Studio OPREALM token pack" }),
  },
];

export async function ensureContentFoundationSchema(env) {
  const db = requiredDb(env);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'business',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS friend_invites (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'friend',
      token_grant_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by_user_id TEXT NOT NULL,
      accepted_by_user_id TEXT,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (invited_by_user_id) REFERENCES web_users(id),
      FOREIGN KEY (accepted_by_user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_friend_invites_workspace ON friend_invites(workspace_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_friend_invites_email_status ON friend_invites(email, status)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      brand_id TEXT,
      campaign_id TEXT,
      media_job_id TEXT,
      asset_type TEXT NOT NULL,
      title TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      thumbnail_url TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (user_id) REFERENCES web_users(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id, visibility)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS token_wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      reserved_balance INTEGER NOT NULL DEFAULT 0,
      lifetime_purchased INTEGER NOT NULL DEFAULT 0,
      lifetime_spent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES web_users(id)
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS token_reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'reserved',
      amount_reserved INTEGER NOT NULL,
      amount_spent INTEGER NOT NULL DEFAULT 0,
      amount_released INTEGER NOT NULL DEFAULT 0,
      amount_refunded INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES web_users(id),
      FOREIGN KEY (wallet_id) REFERENCES token_wallets(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_token_reservations_user ON token_reservations(user_id, status)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS token_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reserved_balance_after INTEGER NOT NULL,
      related_reservation_id TEXT,
      related_media_job_id TEXT,
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES web_users(id),
      FOREIGN KEY (wallet_id) REFERENCES token_wallets(id),
      FOREIGN KEY (related_reservation_id) REFERENCES token_reservations(id)
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id, created_at)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type, created_at)").run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS token_packs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'AUD',
      active INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  for (const pack of DEFAULT_TOKEN_PACKS) {
    await db.prepare(`
      INSERT OR IGNORE INTO token_packs (id, name, tokens, price_cents, currency, active, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
      .bind(pack.id, pack.name, pack.tokens, pack.price_cents, pack.currency, pack.active, pack.metadata_json)
      .run();
  }
}

export function isAdminRequest(request, env) {
  const auth = request.headers.get("authorization") || "";
  const expected = env.OPREALM_ADMIN_SECRET || env.OPREALM_WEBHOOK_SECRET || "";
  return Boolean(expected && auth === `Bearer ${expected}`);
}

export function createD1FoundationStore(db) {
  if (!db) throw httpError("OPRealm database is not connected.", 500);
  return {
    async transaction(callback) {
      return callback(this);
    },
    async getUserById(id) {
      return db.prepare("SELECT * FROM web_users WHERE id = ? LIMIT 1").bind(id).first();
    },
    async getUserByEmail(email) {
      return db.prepare("SELECT * FROM web_users WHERE email = ? LIMIT 1").bind(email).first();
    },
    async insertWorkspace(row) {
      await db.prepare(`
        INSERT INTO workspaces (id, owner_user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(row.id, row.owner_user_id, row.name, row.type).run();
      return this.getWorkspace(row.id);
    },
    async getWorkspace(id) {
      return db.prepare("SELECT * FROM workspaces WHERE id = ? LIMIT 1").bind(id).first();
    },
    async insertWorkspaceMember(row) {
      await db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(workspace_id, user_id)
        DO UPDATE SET role = excluded.role, updated_at = datetime('now')
      `).bind(row.id, row.workspace_id, row.user_id, row.role).run();
      return this.getWorkspaceMember(row.workspace_id, row.user_id);
    },
    async getWorkspaceMember(workspaceId, userId) {
      return db.prepare("SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1")
        .bind(workspaceId, userId)
        .first();
    },
    async listWorkspacesForUser(userId) {
      const rows = await db.prepare(`
        SELECT workspaces.*, workspace_members.role AS member_role
        FROM workspaces
        JOIN workspace_members ON workspace_members.workspace_id = workspaces.id
        WHERE workspace_members.user_id = ?
        ORDER BY workspaces.updated_at DESC, workspaces.created_at DESC
      `).bind(userId).all();
      return rows.results || [];
    },
    async listMembers(workspaceId) {
      const rows = await db.prepare(`
        SELECT workspace_members.*, web_users.email, web_users.display_name
        FROM workspace_members
        JOIN web_users ON web_users.id = workspace_members.user_id
        WHERE workspace_members.workspace_id = ?
        ORDER BY workspace_members.created_at ASC
      `).bind(workspaceId).all();
      return rows.results || [];
    },
    async insertInvite(row) {
      await db.prepare(`
        INSERT INTO friend_invites (
          id, workspace_id, email, role, token_grant_amount, status, invited_by_user_id, expires_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))
      `).bind(row.id, row.workspace_id, row.email, row.role, row.token_grant_amount, row.invited_by_user_id, row.expires_at).run();
      return this.getInvite(row.id);
    },
    async getInvite(id) {
      return db.prepare("SELECT * FROM friend_invites WHERE id = ? LIMIT 1").bind(id).first();
    },
    async updateInvite(id, updates) {
      const existing = await this.getInvite(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE friend_invites
        SET status = ?,
            accepted_by_user_id = ?,
            accepted_at = ?,
            revoked_at = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(next.status, next.accepted_by_user_id || null, next.accepted_at || null, next.revoked_at || null, id).run();
      return this.getInvite(id);
    },
    async listInvites(workspaceId) {
      const rows = await db.prepare("SELECT * FROM friend_invites WHERE workspace_id = ? ORDER BY created_at DESC")
        .bind(workspaceId)
        .all();
      return rows.results || [];
    },
    async insertAsset(row) {
      await db.prepare(`
        INSERT INTO assets (
          id, workspace_id, user_id, brand_id, campaign_id, media_job_id, asset_type, title,
          storage_url, thumbnail_url, visibility, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        row.id,
        row.workspace_id,
        row.user_id,
        row.brand_id || null,
        row.campaign_id || null,
        row.media_job_id || null,
        row.asset_type,
        row.title,
        row.storage_url,
        row.thumbnail_url || null,
        row.visibility,
        row.metadata_json || null,
      ).run();
      return this.getAsset(row.id);
    },
    async getAsset(id) {
      return db.prepare("SELECT * FROM assets WHERE id = ? LIMIT 1").bind(id).first();
    },
    async listAssetsForUser(userId, workspaceId = "") {
      const params = [userId];
      let workspaceFilter = "";
      if (workspaceId) {
        workspaceFilter = "AND assets.workspace_id = ?";
        params.push(workspaceId);
      }
      const rows = await db.prepare(`
        SELECT assets.*
        FROM assets
        JOIN workspace_members ON workspace_members.workspace_id = assets.workspace_id
        WHERE workspace_members.user_id = ?
          AND assets.visibility != 'archived'
          ${workspaceFilter}
        ORDER BY assets.updated_at DESC, assets.created_at DESC
      `).bind(...params).all();
      return rows.results || [];
    },
    async updateAsset(id, updates) {
      const existing = await this.getAsset(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE assets
        SET title = ?,
            storage_url = ?,
            thumbnail_url = ?,
            visibility = ?,
            metadata_json = ?,
            updated_at = datetime('now'),
            archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, datetime('now')) ELSE archived_at END
        WHERE id = ?
      `).bind(
        next.title,
        next.storage_url,
        next.thumbnail_url || null,
        next.visibility,
        next.metadata_json || null,
        next.visibility,
        id,
      ).run();
      return this.getAsset(id);
    },
    async getWallet(userId) {
      return db.prepare("SELECT * FROM token_wallets WHERE user_id = ? LIMIT 1").bind(userId).first();
    },
    async insertWallet(row) {
      await db.prepare(`
        INSERT OR IGNORE INTO token_wallets (
          id, user_id, balance, reserved_balance, lifetime_purchased, lifetime_spent, created_at, updated_at
        )
        VALUES (?, ?, 0, 0, 0, 0, datetime('now'), datetime('now'))
      `).bind(row.id, row.user_id).run();
      return this.getWallet(row.user_id);
    },
    async updateWallet(wallet) {
      const next = normalizeWalletRow(wallet);
      await db.prepare(`
        UPDATE token_wallets
        SET balance = ?,
            reserved_balance = ?,
            lifetime_purchased = ?,
            lifetime_spent = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        next.balance,
        next.reserved_balance,
        next.lifetime_purchased,
        next.lifetime_spent,
        next.id,
      ).run();
      return this.getWallet(next.user_id);
    },
    async insertTransaction(row) {
      await db.prepare(`
        INSERT INTO token_transactions (
          id, user_id, wallet_id, type, amount, balance_after, reserved_balance_after,
          related_reservation_id, related_media_job_id, stripe_checkout_session_id,
          stripe_payment_intent_id, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        row.id,
        row.user_id,
        row.wallet_id,
        row.type,
        row.amount,
        row.balance_after,
        row.reserved_balance_after,
        row.related_reservation_id || null,
        row.related_media_job_id || null,
        row.stripe_checkout_session_id || null,
        row.stripe_payment_intent_id || null,
        row.metadata_json || null,
      ).run();
      return row;
    },
    async listTransactions(userId, limit = 100) {
      const rows = await db.prepare(`
        SELECT *
        FROM token_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(userId, limit).all();
      return rows.results || [];
    },
    async getPurchaseTransactionByStripeCheckoutSessionId(checkoutSessionId) {
      return db.prepare(`
        SELECT *
        FROM token_transactions
        WHERE type = 'purchase'
          AND stripe_checkout_session_id = ?
        LIMIT 1
      `).bind(checkoutSessionId).first();
    },
    async insertReservation(row) {
      await db.prepare(`
        INSERT INTO token_reservations (
          id, user_id, wallet_id, status, amount_reserved, amount_spent, amount_released,
          amount_refunded, reason, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, datetime('now'), datetime('now'))
      `).bind(row.id, row.user_id, row.wallet_id, row.status, row.amount_reserved, row.reason || null, row.metadata_json || null).run();
      return this.getReservation(row.id);
    },
    async getReservation(id) {
      return db.prepare("SELECT * FROM token_reservations WHERE id = ? LIMIT 1").bind(id).first();
    },
    async updateReservation(reservation) {
      await db.prepare(`
        UPDATE token_reservations
        SET status = ?,
            amount_spent = ?,
            amount_released = ?,
            amount_refunded = ?,
            metadata_json = ?,
            updated_at = datetime('now'),
            completed_at = ?
        WHERE id = ?
      `).bind(
        reservation.status,
        reservation.amount_spent,
        reservation.amount_released,
        reservation.amount_refunded,
        reservation.metadata_json || null,
        reservation.completed_at || null,
        reservation.id,
      ).run();
      return this.getReservation(reservation.id);
    },
    async listTokenPacks() {
      const rows = await db.prepare("SELECT * FROM token_packs WHERE active = 1 ORDER BY tokens ASC").all();
      return rows.results || [];
    },
    async getTokenPack(id) {
      return db.prepare("SELECT * FROM token_packs WHERE id = ? LIMIT 1").bind(id).first();
    },
    async listAllTransactions(limit = 100) {
      const rows = await db.prepare(`
        SELECT token_transactions.*, web_users.email, web_users.display_name
        FROM token_transactions
        LEFT JOIN web_users ON web_users.id = token_transactions.user_id
        ORDER BY token_transactions.created_at DESC
        LIMIT ?
      `).bind(limit).all();
      return rows.results || [];
    },
    async getStripeWebhookEvent(stripeEventId) {
      return db.prepare("SELECT * FROM stripe_webhook_events WHERE stripe_event_id = ? LIMIT 1").bind(stripeEventId).first();
    },
    async insertStripeWebhookEvent(row) {
      await db.prepare(`
        INSERT OR IGNORE INTO stripe_webhook_events (
          id, stripe_event_id, event_type, status, checkout_session_id, payment_intent_id,
          user_id, token_pack_id, tokens, payload_json, error_message, processed_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        row.id,
        row.stripe_event_id,
        row.event_type,
        row.status || "received",
        row.checkout_session_id || null,
        row.payment_intent_id || null,
        row.user_id || null,
        row.token_pack_id || null,
        Number.isFinite(Number(row.tokens)) ? Number(row.tokens) : null,
        row.payload_json,
        row.error_message || null,
        row.processed_at || null,
      ).run();
      return this.getStripeWebhookEvent(row.stripe_event_id);
    },
    async updateStripeWebhookEvent(stripeEventId, updates) {
      const existing = await this.getStripeWebhookEvent(stripeEventId);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      await db.prepare(`
        UPDATE stripe_webhook_events
        SET status = ?,
            checkout_session_id = ?,
            payment_intent_id = ?,
            user_id = ?,
            token_pack_id = ?,
            tokens = ?,
            payload_json = ?,
            error_message = ?,
            processed_at = ?,
            updated_at = datetime('now')
        WHERE stripe_event_id = ?
      `).bind(
        next.status,
        next.checkout_session_id || null,
        next.payment_intent_id || null,
        next.user_id || null,
        next.token_pack_id || null,
        Number.isFinite(Number(next.tokens)) ? Number(next.tokens) : null,
        next.payload_json,
        next.error_message || null,
        next.processed_at || null,
        stripeEventId,
      ).run();
      return this.getStripeWebhookEvent(stripeEventId);
    },
  };
}

export function createMemoryFoundationStore(seed = {}) {
  const state = {
    users: new Map((seed.users || []).map((user) => [user.id, { ...user }])),
    workspaces: new Map(),
    workspaceMembers: new Map(),
    invites: new Map(),
    assets: new Map(),
    wallets: new Map(),
    transactions: new Map(),
    reservations: new Map(),
    tokenPacks: new Map(DEFAULT_TOKEN_PACKS.map((pack) => [pack.id, { ...pack }])),
    stripeWebhookEvents: new Map(),
  };
  for (const row of seed.workspaces || []) state.workspaces.set(row.id, { ...row });
  for (const row of seed.workspaceMembers || []) state.workspaceMembers.set(`${row.workspace_id}:${row.user_id}`, { ...row });
  for (const row of seed.tokenPacks || []) state.tokenPacks.set(row.id, { ...row });
  return {
    state,
    async transaction(callback) {
      return callback(this);
    },
    async getUserById(id) {
      return clone(state.users.get(id));
    },
    async getUserByEmail(email) {
      const normalized = normalizeEmail(email);
      return clone([...state.users.values()].find((user) => normalizeEmail(user.email) === normalized));
    },
    async insertWorkspace(row) {
      const stored = stamp({ ...row });
      state.workspaces.set(stored.id, stored);
      return clone(stored);
    },
    async getWorkspace(id) {
      return clone(state.workspaces.get(id));
    },
    async insertWorkspaceMember(row) {
      const key = `${row.workspace_id}:${row.user_id}`;
      const existing = state.workspaceMembers.get(key);
      const stored = stamp({ ...(existing || row), ...row });
      state.workspaceMembers.set(key, stored);
      return clone(stored);
    },
    async getWorkspaceMember(workspaceId, userId) {
      return clone(state.workspaceMembers.get(`${workspaceId}:${userId}`));
    },
    async listWorkspacesForUser(userId) {
      return [...state.workspaceMembers.values()]
        .filter((member) => member.user_id === userId)
        .map((member) => ({ ...state.workspaces.get(member.workspace_id), member_role: member.role }))
        .filter((item) => item.id)
        .map(clone);
    },
    async listMembers(workspaceId) {
      return [...state.workspaceMembers.values()]
        .filter((member) => member.workspace_id === workspaceId)
        .map((member) => {
          const user = state.users.get(member.user_id) || {};
          return clone({ ...member, email: user.email, display_name: user.display_name });
        });
    },
    async insertInvite(row) {
      const stored = stamp({ ...row, status: "pending", accepted_by_user_id: null, accepted_at: null, revoked_at: null });
      state.invites.set(stored.id, stored);
      return clone(stored);
    },
    async getInvite(id) {
      return clone(state.invites.get(id));
    },
    async updateInvite(id, updates) {
      const existing = state.invites.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      state.invites.set(id, stored);
      return clone(stored);
    },
    async listInvites(workspaceId) {
      return [...state.invites.values()].filter((invite) => invite.workspace_id === workspaceId).map(clone);
    },
    async insertAsset(row) {
      const stored = stamp(row);
      state.assets.set(stored.id, stored);
      return clone(stored);
    },
    async getAsset(id) {
      return clone(state.assets.get(id));
    },
    async listAssetsForUser(userId, workspaceId = "") {
      const allowed = new Set([...state.workspaceMembers.values()]
        .filter((member) => member.user_id === userId)
        .map((member) => member.workspace_id));
      return [...state.assets.values()]
        .filter((asset) => allowed.has(asset.workspace_id))
        .filter((asset) => !workspaceId || asset.workspace_id === workspaceId)
        .filter((asset) => asset.visibility !== "archived")
        .map(clone);
    },
    async updateAsset(id, updates) {
      const existing = state.assets.get(id);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      if (stored.visibility === "archived" && !stored.archived_at) stored.archived_at = nowIso();
      state.assets.set(id, stored);
      return clone(stored);
    },
    async getWallet(userId) {
      return clone([...state.wallets.values()].find((wallet) => wallet.user_id === userId));
    },
    async insertWallet(row) {
      const existing = await this.getWallet(row.user_id);
      if (existing) return existing;
      const stored = stamp({
        id: row.id,
        user_id: row.user_id,
        balance: 0,
        reserved_balance: 0,
        lifetime_purchased: 0,
        lifetime_spent: 0,
      });
      state.wallets.set(stored.id, stored);
      return clone(stored);
    },
    async updateWallet(wallet) {
      const stored = stamp(normalizeWalletRow(wallet));
      state.wallets.set(stored.id, stored);
      return clone(stored);
    },
    async insertTransaction(row) {
      const stored = { ...row, created_at: row.created_at || nowIso() };
      state.transactions.set(stored.id, stored);
      return clone(stored);
    },
    async listTransactions(userId, limit = 100) {
      return [...state.transactions.values()]
        .filter((transaction) => transaction.user_id === userId)
        .slice(-limit)
        .reverse()
        .map(clone);
    },
    async getPurchaseTransactionByStripeCheckoutSessionId(checkoutSessionId) {
      return clone([...state.transactions.values()].find((transaction) => (
        transaction.type === "purchase"
          && transaction.stripe_checkout_session_id === checkoutSessionId
      )));
    },
    async insertReservation(row) {
      const stored = stamp({
        ...row,
        amount_spent: 0,
        amount_released: 0,
        amount_refunded: 0,
        completed_at: null,
      });
      state.reservations.set(stored.id, stored);
      return clone(stored);
    },
    async getReservation(id) {
      return clone(state.reservations.get(id));
    },
    async updateReservation(reservation) {
      const stored = stamp(reservation);
      state.reservations.set(stored.id, stored);
      return clone(stored);
    },
    async listTokenPacks() {
      return [...state.tokenPacks.values()].filter((pack) => Number(pack.active) === 1).sort((a, b) => a.tokens - b.tokens).map(clone);
    },
    async getTokenPack(id) {
      return clone(state.tokenPacks.get(id));
    },
    async listAllTransactions(limit = 100) {
      return [...state.transactions.values()].slice(-limit).reverse().map(clone);
    },
    async getStripeWebhookEvent(stripeEventId) {
      return clone(state.stripeWebhookEvents.get(stripeEventId));
    },
    async insertStripeWebhookEvent(row) {
      if (state.stripeWebhookEvents.has(row.stripe_event_id)) return clone(state.stripeWebhookEvents.get(row.stripe_event_id));
      const stored = stamp({
        ...row,
        status: row.status || "received",
        checkout_session_id: row.checkout_session_id || null,
        payment_intent_id: row.payment_intent_id || null,
        user_id: row.user_id || null,
        token_pack_id: row.token_pack_id || null,
        tokens: Number.isFinite(Number(row.tokens)) ? Number(row.tokens) : null,
        error_message: row.error_message || null,
        processed_at: row.processed_at || null,
      });
      state.stripeWebhookEvents.set(stored.stripe_event_id, stored);
      return clone(stored);
    },
    async updateStripeWebhookEvent(stripeEventId, updates) {
      const existing = state.stripeWebhookEvents.get(stripeEventId);
      if (!existing) return null;
      const stored = stamp({ ...existing, ...updates });
      state.stripeWebhookEvents.set(stripeEventId, stored);
      return clone(stored);
    },
  };
}

export function createFoundationServices(store) {
  if (!store) throw httpError("Foundation store is not available.", 500);
  return {
    createWorkspace: (user, input) => createWorkspace(store, user, input),
    listWorkspaces: (user) => listWorkspaces(store, user),
    getWorkspace: (user, workspaceId) => getWorkspace(store, user, workspaceId),
    addWorkspaceMember: (user, workspaceId, input) => addWorkspaceMember(store, user, workspaceId, input),
    listWorkspaceMembers: (user, workspaceId) => listWorkspaceMembers(store, user, workspaceId),
    createFriendInvite: (user, workspaceId, input) => createFriendInvite(store, user, workspaceId, input),
    listFriendInvites: (user, workspaceId) => listFriendInvites(store, user, workspaceId),
    acceptFriendInvite: (user, inviteId) => acceptFriendInvite(store, user, inviteId),
    revokeFriendInvite: (user, inviteId) => revokeFriendInvite(store, user, inviteId),
    createAsset: (user, input) => createAsset(store, user, input),
    listAssets: (user, input) => listAssets(store, user, input),
    getAsset: (user, assetId) => getAsset(store, user, assetId),
    updateAsset: (user, assetId, input) => updateAsset(store, user, assetId, input),
    archiveAsset: (user, assetId) => archiveAsset(store, user, assetId),
    getOrCreateWallet: (userId) => getOrCreateWallet(store, userId),
    getWallet: (userId) => getWallet(store, userId),
    listTransactions: (userId, limit) => listTransactions(store, userId, limit),
    adminGrantTokens: (userId, amount, reason, adminUserId, metadata) => adminGrantTokens(store, userId, amount, reason, adminUserId, metadata),
    creditPurchaseTokens: (input) => creditPurchaseTokens(store, input),
    getPurchaseTransactionByStripeCheckoutSessionId: (checkoutSessionId) => getPurchaseTransactionByStripeCheckoutSessionId(store, checkoutSessionId),
    reserveTokens: (userId, amount, metadata) => reserveTokens(store, userId, amount, metadata),
    spendReservedTokens: (reservationId, amount, metadata, userId) => spendReservedTokens(store, reservationId, amount, metadata, userId),
    releaseReservation: (reservationId, metadata, userId) => releaseReservation(store, reservationId, metadata, userId),
    refundReservation: (reservationId, metadata, userId) => refundReservation(store, reservationId, metadata, userId),
    listTokenPacks: async () => (await store.listTokenPacks()).map(shapeTokenPack),
    getTokenPack: (id) => getTokenPack(store, id),
    listAllTransactions: async (limit) => (await store.listAllTransactions(clampInt(limit, 1, 200))).map(shapeAdminTransaction),
    getStripeWebhookEvent: (stripeEventId) => getStripeWebhookEvent(store, stripeEventId),
    recordStripeWebhookEvent: (input) => recordStripeWebhookEvent(store, input),
    updateStripeWebhookEvent: (stripeEventId, updates) => updateStripeWebhookEvent(store, stripeEventId, updates),
  };
}

export async function createWorkspace(store, user, input = {}) {
  requireIdentity(user);
  const name = requireMinText(input.name, "Workspace name", 2, 80);
  const type = enumValue(input.type || "business", WORKSPACE_TYPES, "business");
  const workspace = await store.insertWorkspace({
    id: crypto.randomUUID(),
    owner_user_id: user.id,
    name,
    type,
  });
  await store.insertWorkspaceMember({
    id: crypto.randomUUID(),
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });
  return shapeWorkspace({ ...workspace, member_role: "owner" });
}

export async function listWorkspaces(store, user) {
  requireIdentity(user);
  return (await store.listWorkspacesForUser(user.id)).map(shapeWorkspace);
}

export async function getWorkspace(store, user, workspaceId) {
  requireIdentity(user);
  const member = await requireWorkspaceMember(store, workspaceId, user.id);
  const workspace = await store.getWorkspace(workspaceId);
  if (!workspace) throw httpError("Workspace not found.", 404);
  return shapeWorkspace({ ...workspace, member_role: member.role });
}

export async function addWorkspaceMember(store, user, workspaceId, input = {}) {
  requireIdentity(user);
  await requireWorkspaceRole(store, workspaceId, user.id, ["owner", "admin"]);
  const role = enumValue(input.role || "member", WORKSPACE_ROLES, "member");
  if (role === "owner") throw httpError("Use workspace transfer tooling to add another owner.", 400);

  const target = await resolveUser(store, input.userId || input.user_id, input.email);
  if (!target) throw httpError("Member user was not found.", 404);

  const member = await store.insertWorkspaceMember({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    user_id: target.id,
    role,
  });
  return shapeMember({ ...member, email: target.email, display_name: target.display_name });
}

export async function listWorkspaceMembers(store, user, workspaceId) {
  requireIdentity(user);
  await requireWorkspaceMember(store, workspaceId, user.id);
  return (await store.listMembers(workspaceId)).map(shapeMember);
}

export async function createFriendInvite(store, user, workspaceId, input = {}) {
  requireIdentity(user);
  await requireWorkspaceRole(store, workspaceId, user.id, ["owner", "admin"]);
  const email = normalizeEmail(input.email);
  if (!email) throw httpError("Invite email is invalid.", 400);
  const role = enumValue(input.role || "friend", WORKSPACE_ROLES, "friend");
  if (role === "owner") throw httpError("Friend invites cannot grant owner access.", 400);
  const tokenGrantAmount = cleanTokenAmount(input.tokenGrantAmount ?? input.token_grant_amount ?? 0, { allowZero: true });
  const expiresAt = normalizeFutureDate(input.expiresAt || input.expires_at, 30);
  const invite = await store.insertInvite({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    email,
    role,
    token_grant_amount: tokenGrantAmount,
    invited_by_user_id: user.id,
    expires_at: expiresAt,
  });
  return shapeInvite(invite);
}

export async function listFriendInvites(store, user, workspaceId) {
  requireIdentity(user);
  await requireWorkspaceRole(store, workspaceId, user.id, ["owner", "admin"]);
  return (await store.listInvites(workspaceId)).map((invite) => shapeInvite(expireInviteIfNeeded(invite)));
}

export async function acceptFriendInvite(store, user, inviteId) {
  requireIdentity(user);
  return store.transaction(async (tx) => {
    const invite = expireInviteIfNeeded(await tx.getInvite(cleanId(inviteId)));
    validateAcceptableInvite(invite, user);

    const updated = await tx.updateInvite(invite.id, {
      status: "accepted",
      accepted_by_user_id: user.id,
      accepted_at: nowIso(),
    });
    await tx.insertWorkspaceMember({
      id: crypto.randomUUID(),
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    });
    let grant = null;
    if (Number(invite.token_grant_amount || 0) > 0) {
      grant = await adminGrantTokens(
        tx,
        user.id,
        Number(invite.token_grant_amount),
        `Friend invite ${invite.id}`,
        invite.invited_by_user_id,
        { source: "friend_invite", inviteId: invite.id, workspaceId: invite.workspace_id },
      );
    }
    return { invite: shapeInvite(updated), tokenGrant: grant?.transaction || null };
  });
}

export async function revokeFriendInvite(store, user, inviteId) {
  requireIdentity(user);
  const invite = await store.getInvite(cleanId(inviteId));
  if (!invite) throw httpError("Invite not found.", 404);
  await requireWorkspaceRole(store, invite.workspace_id, user.id, ["owner", "admin"]);
  if (invite.status !== "pending") throw httpError("Only pending invites can be revoked.", 400);
  return shapeInvite(await store.updateInvite(invite.id, { status: "revoked", revoked_at: nowIso() }));
}

export async function createAsset(store, user, input = {}) {
  requireIdentity(user);
  const workspaceId = cleanId(input.workspaceId || input.workspace_id);
  await requireWorkspaceMember(store, workspaceId, user.id);
  const assetType = enumValue(input.assetType || input.asset_type || "document", ASSET_TYPES, "");
  if (!assetType) throw httpError("Asset type is invalid.", 400);
  const title = requireMinText(input.title || "Untitled asset", "Asset title", 1, 120);
  const storageUrl = cleanAssetUrl(input.storageUrl || input.storage_url || input.localPath || input.local_path);
  const visibility = enumValue(input.visibility || "private", ASSET_VISIBILITIES, "private");
  const asset = await store.insertAsset({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    user_id: user.id,
    brand_id: cleanOptionalId(input.brandId || input.brand_id),
    campaign_id: cleanOptionalId(input.campaignId || input.campaign_id),
    media_job_id: cleanOptionalId(input.mediaJobId || input.media_job_id),
    asset_type: assetType,
    title,
    storage_url: storageUrl,
    thumbnail_url: cleanOptionalUrl(input.thumbnailUrl || input.thumbnail_url),
    visibility,
    metadata_json: stringifyMetadata(input.metadata || input.metadata_json || {}),
  });
  return shapeAsset(asset);
}

export async function listAssets(store, user, input = {}) {
  requireIdentity(user);
  const workspaceId = cleanOptionalId(input.workspaceId || input.workspace_id);
  if (workspaceId) await requireWorkspaceMember(store, workspaceId, user.id);
  return (await store.listAssetsForUser(user.id, workspaceId)).map(shapeAsset);
}

export async function getAsset(store, user, assetId) {
  requireIdentity(user);
  const asset = await store.getAsset(cleanId(assetId));
  if (!asset || asset.visibility === "archived") throw httpError("Asset not found.", 404);
  await requireWorkspaceMember(store, asset.workspace_id, user.id);
  return shapeAsset(asset);
}

export async function updateAsset(store, user, assetId, input = {}) {
  const asset = await getAsset(store, user, assetId);
  const updates = {};
  if ("title" in input) updates.title = requireMinText(input.title, "Asset title", 1, 120);
  if ("storageUrl" in input || "storage_url" in input) {
    updates.storage_url = cleanAssetUrl(input.storageUrl || input.storage_url);
  }
  if ("thumbnailUrl" in input || "thumbnail_url" in input) {
    updates.thumbnail_url = cleanOptionalUrl(input.thumbnailUrl || input.thumbnail_url);
  }
  if ("visibility" in input) updates.visibility = enumValue(input.visibility, ASSET_VISIBILITIES, asset.visibility);
  if ("metadata" in input || "metadata_json" in input) updates.metadata_json = stringifyMetadata(input.metadata || input.metadata_json || {});
  return shapeAsset(await store.updateAsset(asset.id, updates));
}

export async function archiveAsset(store, user, assetId) {
  const asset = await getAsset(store, user, assetId);
  return shapeAsset(await store.updateAsset(asset.id, { visibility: "archived" }));
}

export async function getOrCreateWallet(store, userId) {
  return shapeWallet(await getOrCreateWalletRow(store, userId));
}

async function getOrCreateWalletRow(store, userId) {
  const cleanUserId = cleanId(userId);
  if (!cleanUserId) throw httpError("Missing user id.", 400);
  const existing = await store.getWallet(cleanUserId);
  if (existing) return normalizeWalletRow(existing);
  return normalizeWalletRow(await store.insertWallet({ id: crypto.randomUUID(), user_id: cleanUserId }));
}

export async function getWallet(store, userId) {
  return getOrCreateWallet(store, userId);
}

export async function listTransactions(store, userId, limit = 100) {
  return (await store.listTransactions(cleanId(userId), clampInt(limit, 1, 200))).map(shapeTransaction);
}

export async function getTokenPack(store, tokenPackId) {
  const pack = await store.getTokenPack(cleanId(tokenPackId));
  if (!pack) throw httpError("Token pack not found.", 404);
  return shapeTokenPack(pack);
}

export async function getPurchaseTransactionByStripeCheckoutSessionId(store, checkoutSessionId) {
  const cleanCheckoutSessionId = cleanId(checkoutSessionId);
  return shapeTransaction(await store.getPurchaseTransactionByStripeCheckoutSessionId(cleanCheckoutSessionId));
}

export async function adminGrantTokens(store, userId, amount, reason = "", adminUserId = "system", metadata = {}) {
  const cleanUserId = cleanId(userId);
  const tokens = cleanTokenAmount(amount);
  const user = await store.getUserById(cleanUserId);
  if (!user) throw httpError("User not found.", 404);
  const wallet = await getOrCreateWalletRow(store, cleanUserId);
  const nextWallet = await store.updateWallet({
    ...wallet,
    balance: wallet.balance + tokens,
  });
  const transaction = await recordTransaction(store, nextWallet, {
    type: "admin_grant",
    amount: tokens,
    metadata: { reason: cleanText(reason || "Admin token grant", 240), adminUserId: cleanId(adminUserId) || "system", ...safeMetadata(metadata) },
  });
  return { wallet: shapeWallet(nextWallet), transaction: shapeTransaction(transaction) };
}

export async function creditPurchaseTokens(store, input = {}) {
  const cleanUserId = cleanId(input.userId || input.user_id);
  const tokens = cleanTokenAmount(input.amount ?? input.tokens);
  const checkoutSessionId = cleanId(input.stripeCheckoutSessionId || input.stripe_checkout_session_id);
  const paymentIntentId = cleanOptionalId(input.stripePaymentIntentId || input.stripe_payment_intent_id);
  const metadata = safeMetadata(input.metadata || {});

  return store.transaction(async (tx) => {
    const existingTransaction = await tx.getPurchaseTransactionByStripeCheckoutSessionId(checkoutSessionId);
    if (existingTransaction) {
      return {
        wallet: shapeWallet(await tx.getWallet(cleanUserId)),
        transaction: shapeTransaction(existingTransaction),
        duplicate: true,
      };
    }

    const user = await tx.getUserById(cleanUserId);
    if (!user) throw httpError("User not found.", 404);

    const wallet = await getOrCreateWalletRow(tx, cleanUserId);
    const nextWallet = await tx.updateWallet({
      ...wallet,
      balance: wallet.balance + tokens,
      lifetime_purchased: wallet.lifetime_purchased + tokens,
    });
    const transaction = await recordTransaction(tx, nextWallet, {
      type: "purchase",
      amount: tokens,
      stripeCheckoutSessionId: checkoutSessionId,
      stripePaymentIntentId: paymentIntentId,
      metadata: {
        source: "stripe_checkout",
        ...metadata,
      },
    });
    return { wallet: shapeWallet(nextWallet), transaction: shapeTransaction(transaction), duplicate: false };
  });
}

export async function reserveTokens(store, userId, amount, metadata = {}) {
  const tokens = cleanTokenAmount(amount);
  return store.transaction(async (tx) => {
    const wallet = await getOrCreateWalletRow(tx, userId);
    if (wallet.balance < tokens) throw httpError("Not enough tokens available.", 402);
    const nextWallet = await tx.updateWallet({
      ...wallet,
      balance: wallet.balance - tokens,
      reserved_balance: wallet.reserved_balance + tokens,
    });
    const reservation = await tx.insertReservation({
      id: crypto.randomUUID(),
      user_id: wallet.user_id,
      wallet_id: wallet.id,
      status: "reserved",
      amount_reserved: tokens,
      reason: cleanText(metadata.reason || "Token reservation", 160),
      metadata_json: stringifyMetadata(metadata),
    });
    const transaction = await recordTransaction(tx, nextWallet, {
      type: "reservation",
      amount: -tokens,
      relatedReservationId: reservation.id,
      metadata,
    });
    return { wallet: shapeWallet(nextWallet), reservation: shapeReservation(reservation), transaction: shapeTransaction(transaction) };
  });
}

export async function spendReservedTokens(store, reservationId, amount, metadata = {}, userId = "") {
  const tokens = cleanTokenAmount(amount);
  return store.transaction(async (tx) => {
    const reservation = await requireReservation(tx, reservationId);
    requireReservationOwner(reservation, userId);
    const wallet = await requireWalletByUser(tx, reservation.user_id);
    const remainingReserved = reservedRemaining(reservation);
    if (tokens > remainingReserved) throw httpError("Cannot spend more than the reserved token amount.", 400);
    const nextSpent = Number(reservation.amount_spent || 0) + tokens;
    const nextReservation = await tx.updateReservation({
      ...reservation,
      amount_spent: nextSpent,
      status: nextSpent >= Number(reservation.amount_reserved || 0) - Number(reservation.amount_released || 0) - Number(reservation.amount_refunded || 0)
        ? "spent"
        : "partially_spent",
      completed_at: nextSpent >= Number(reservation.amount_reserved || 0) - Number(reservation.amount_released || 0) - Number(reservation.amount_refunded || 0) ? nowIso() : null,
      metadata_json: mergeMetadata(reservation.metadata_json, metadata),
    });
    const nextWallet = await tx.updateWallet({
      ...wallet,
      reserved_balance: wallet.reserved_balance - tokens,
      lifetime_spent: wallet.lifetime_spent + tokens,
    });
    const transaction = await recordTransaction(tx, nextWallet, {
      type: "spend",
      amount: -tokens,
      relatedReservationId: reservation.id,
      metadata,
    });
    return { wallet: shapeWallet(nextWallet), reservation: shapeReservation(nextReservation), transaction: shapeTransaction(transaction) };
  });
}

export async function releaseReservation(store, reservationId, metadata = {}, userId = "") {
  return store.transaction(async (tx) => {
    const reservation = await requireReservation(tx, reservationId);
    requireReservationOwner(reservation, userId);
    const wallet = await requireWalletByUser(tx, reservation.user_id);
    const tokens = reservedRemaining(reservation);
    if (tokens <= 0) throw httpError("No reserved tokens are available to release.", 400);
    const nextReservation = await tx.updateReservation({
      ...reservation,
      amount_released: Number(reservation.amount_released || 0) + tokens,
      status: "released",
      completed_at: nowIso(),
      metadata_json: mergeMetadata(reservation.metadata_json, metadata),
    });
    const nextWallet = await tx.updateWallet({
      ...wallet,
      balance: wallet.balance + tokens,
      reserved_balance: wallet.reserved_balance - tokens,
    });
    const transaction = await recordTransaction(tx, nextWallet, {
      type: "reservation_release",
      amount: tokens,
      relatedReservationId: reservation.id,
      metadata,
    });
    return { wallet: shapeWallet(nextWallet), reservation: shapeReservation(nextReservation), transaction: shapeTransaction(transaction) };
  });
}

export async function refundReservation(store, reservationId, metadata = {}, userId = "") {
  return store.transaction(async (tx) => {
    const reservation = await requireReservation(tx, reservationId);
    requireReservationOwner(reservation, userId);
    const wallet = await requireWalletByUser(tx, reservation.user_id);
    const totalRefundable = Number(reservation.amount_reserved || 0)
      - Number(reservation.amount_released || 0)
      - Number(reservation.amount_refunded || 0);
    if (totalRefundable <= 0) throw httpError("No tokens are available to refund.", 400);
    const remainingReserved = reservedRemaining(reservation);
    const spentRefund = Math.max(0, totalRefundable - remainingReserved);
    const nextReservation = await tx.updateReservation({
      ...reservation,
      amount_refunded: Number(reservation.amount_refunded || 0) + totalRefundable,
      status: "refunded",
      completed_at: nowIso(),
      metadata_json: mergeMetadata(reservation.metadata_json, metadata),
    });
    const nextWallet = await tx.updateWallet({
      ...wallet,
      balance: wallet.balance + totalRefundable,
      reserved_balance: wallet.reserved_balance - remainingReserved,
      lifetime_spent: Math.max(0, wallet.lifetime_spent - spentRefund),
    });
    const transaction = await recordTransaction(tx, nextWallet, {
      type: "refund",
      amount: totalRefundable,
      relatedReservationId: reservation.id,
      metadata,
    });
    return { wallet: shapeWallet(nextWallet), reservation: shapeReservation(nextReservation), transaction: shapeTransaction(transaction) };
  });
}

export async function getStripeWebhookEvent(store, stripeEventId) {
  const cleanStripeEventId = cleanId(stripeEventId);
  return shapeStripeWebhookEvent(await store.getStripeWebhookEvent(cleanStripeEventId));
}

export async function recordStripeWebhookEvent(store, input = {}) {
  const stripeEventId = cleanId(input.stripeEventId || input.stripe_event_id);
  const eventType = requireMinText(input.eventType || input.event_type, "Stripe event type", 3, 160);
  const payloadJson = cleanPayloadJson(input.payloadJson || input.payload_json);
  return shapeStripeWebhookEvent(await store.insertStripeWebhookEvent({
    id: crypto.randomUUID(),
    stripe_event_id: stripeEventId,
    event_type: eventType,
    status: enumValue(input.status || "received", ["received", "processed", "ignored", "failed"], "received"),
    checkout_session_id: cleanOptionalId(input.checkoutSessionId || input.checkout_session_id),
    payment_intent_id: cleanOptionalId(input.paymentIntentId || input.payment_intent_id),
    user_id: cleanOptionalId(input.userId || input.user_id),
    token_pack_id: cleanOptionalId(input.tokenPackId || input.token_pack_id),
    tokens: Number.isFinite(Number(input.tokens)) ? Math.trunc(Number(input.tokens)) : null,
    payload_json: payloadJson,
    error_message: cleanOptionalLongText(input.errorMessage || input.error_message),
    processed_at: input.processedAt || input.processed_at || null,
  }));
}

export async function updateStripeWebhookEvent(store, stripeEventId, updates = {}) {
  const cleanStripeEventId = cleanId(stripeEventId);
  const next = {};
  if ("status" in updates) next.status = enumValue(updates.status, ["received", "processed", "ignored", "failed"], "received");
  if ("checkoutSessionId" in updates || "checkout_session_id" in updates) next.checkout_session_id = cleanOptionalId(updates.checkoutSessionId || updates.checkout_session_id);
  if ("paymentIntentId" in updates || "payment_intent_id" in updates) next.payment_intent_id = cleanOptionalId(updates.paymentIntentId || updates.payment_intent_id);
  if ("userId" in updates || "user_id" in updates) next.user_id = cleanOptionalId(updates.userId || updates.user_id);
  if ("tokenPackId" in updates || "token_pack_id" in updates) next.token_pack_id = cleanOptionalId(updates.tokenPackId || updates.token_pack_id);
  if ("tokens" in updates) next.tokens = Number.isFinite(Number(updates.tokens)) ? Math.trunc(Number(updates.tokens)) : null;
  if ("payloadJson" in updates || "payload_json" in updates) next.payload_json = cleanPayloadJson(updates.payloadJson || updates.payload_json);
  if ("errorMessage" in updates || "error_message" in updates) next.error_message = cleanOptionalLongText(updates.errorMessage || updates.error_message);
  if ("processedAt" in updates || "processed_at" in updates) next.processed_at = updates.processedAt || updates.processed_at || null;
  return shapeStripeWebhookEvent(await store.updateStripeWebhookEvent(cleanStripeEventId, next));
}

async function recordTransaction(store, wallet, input) {
  const nextWallet = normalizeWalletRow(wallet);
  const type = enumValue(input.type, TOKEN_TRANSACTION_TYPES, "");
  if (!type) throw httpError("Token transaction type is invalid.", 400);
  return store.insertTransaction({
    id: crypto.randomUUID(),
    user_id: nextWallet.user_id,
    wallet_id: nextWallet.id,
    type,
    amount: Math.trunc(Number(input.amount || 0)),
    balance_after: Number(nextWallet.balance || 0),
    reserved_balance_after: Number(nextWallet.reserved_balance || 0),
    related_reservation_id: cleanOptionalId(input.relatedReservationId || input.related_reservation_id),
    related_media_job_id: cleanOptionalId(input.relatedMediaJobId || input.related_media_job_id),
    stripe_checkout_session_id: cleanOptionalId(input.stripeCheckoutSessionId || input.stripe_checkout_session_id),
    stripe_payment_intent_id: cleanOptionalId(input.stripePaymentIntentId || input.stripe_payment_intent_id),
    metadata_json: stringifyMetadata(input.metadata || {}),
  });
}

async function resolveUser(store, userId, email) {
  const id = cleanOptionalId(userId);
  if (id) return store.getUserById(id);
  const cleanEmailValue = normalizeEmail(email);
  if (cleanEmailValue) return store.getUserByEmail(cleanEmailValue);
  throw httpError("Provide a user id or email.", 400);
}

async function requireWorkspaceMember(store, workspaceId, userId) {
  const cleanWorkspaceId = cleanId(workspaceId);
  const member = await store.getWorkspaceMember(cleanWorkspaceId, cleanId(userId));
  if (!member) throw httpError("Workspace not found or access denied.", 404);
  return member;
}

async function requireWorkspaceRole(store, workspaceId, userId, roles) {
  const member = await requireWorkspaceMember(store, workspaceId, userId);
  if (!roles.includes(member.role)) throw httpError("You do not have permission for this workspace.", 403);
  return member;
}

async function requireReservation(store, reservationId) {
  const reservation = await store.getReservation(cleanId(reservationId));
  if (!reservation) throw httpError("Token reservation not found.", 404);
  if (!["reserved", "partially_spent", "spent"].includes(reservation.status)) {
    throw httpError("Token reservation is not active.", 400);
  }
  return reservation;
}

function requireReservationOwner(reservation, userId) {
  const actorUserId = cleanOptionalId(userId);
  if (actorUserId && reservation.user_id !== actorUserId) {
    throw httpError("Token reservation not found.", 404);
  }
}

async function requireWalletByUser(store, userId) {
  const wallet = await store.getWallet(cleanId(userId));
  if (!wallet) throw httpError("Token wallet not found.", 404);
  return normalizeWalletRow(wallet);
}

function validateAcceptableInvite(invite, user) {
  if (!invite) throw httpError("Invite not found.", 404);
  if (invite.status !== "pending") throw httpError("Invite has already been used or revoked.", 400);
  if (isExpired(invite.expires_at)) throw httpError("Invite has expired.", 400);
  if (normalizeEmail(invite.email) !== normalizeEmail(user.email)) {
    throw httpError("Invite email does not match this account.", 403);
  }
}

function expireInviteIfNeeded(invite) {
  if (!invite || invite.status !== "pending" || !isExpired(invite.expires_at)) return invite;
  return { ...invite, status: "expired" };
}

function reservedRemaining(reservation) {
  return Math.max(
    0,
    Number(reservation.amount_reserved || 0)
      - Number(reservation.amount_spent || 0)
      - Number(reservation.amount_released || 0)
      - Number(reservation.amount_refunded || 0),
  );
}

function shapeWorkspace(row) {
  return row && {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    type: row.type,
    role: row.member_role || row.role || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shapeMember(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    email: row.email || null,
    displayName: row.display_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shapeInvite(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    tokenGrantAmount: Number(row.token_grant_amount || 0),
    status: row.status,
    invitedByUserId: row.invited_by_user_id,
    acceptedByUserId: row.accepted_by_user_id || null,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at || null,
    revokedAt: row.revoked_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shapeAsset(row) {
  return row && {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    brandId: row.brand_id || null,
    campaignId: row.campaign_id || null,
    mediaJobId: row.media_job_id || null,
    assetType: row.asset_type,
    title: row.title,
    storageUrl: row.storage_url,
    thumbnailUrl: row.thumbnail_url || null,
    visibility: row.visibility,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at || null,
  };
}

function shapeWallet(row) {
  const wallet = normalizeWalletRow(row);
  return row && {
    id: wallet.id,
    userId: wallet.user_id,
    balance: wallet.balance,
    reservedBalance: wallet.reserved_balance,
    lifetimePurchased: wallet.lifetime_purchased,
    lifetimeSpent: wallet.lifetime_spent,
    createdAt: wallet.created_at,
    updatedAt: wallet.updated_at,
  };
}

function normalizeWalletRow(row) {
  if (!row) return row;
  return {
    ...row,
    user_id: row.user_id || row.userId,
    balance: Number(row.balance ?? 0),
    reserved_balance: Number(row.reserved_balance ?? row.reservedBalance ?? 0),
    lifetime_purchased: Number(row.lifetime_purchased ?? row.lifetimePurchased ?? 0),
    lifetime_spent: Number(row.lifetime_spent ?? row.lifetimeSpent ?? 0),
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  };
}

function shapeReservation(row) {
  return row && {
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id,
    status: row.status,
    amountReserved: Number(row.amount_reserved || 0),
    amountSpent: Number(row.amount_spent || 0),
    amountReleased: Number(row.amount_released || 0),
    amountRefunded: Number(row.amount_refunded || 0),
    reason: row.reason || null,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
  };
}

function shapeTransaction(row) {
  return row && {
    id: row.id,
    userId: row.user_id || row.userId,
    walletId: row.wallet_id || row.walletId,
    type: row.type,
    amount: Number(row.amount || 0),
    balanceAfter: Number(row.balance_after ?? row.balanceAfter ?? 0),
    reservedBalanceAfter: Number(row.reserved_balance_after ?? row.reservedBalanceAfter ?? 0),
    relatedReservationId: row.related_reservation_id || row.relatedReservationId || null,
    relatedMediaJobId: row.related_media_job_id || row.relatedMediaJobId || null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id || row.stripeCheckoutSessionId || null,
    stripePaymentIntentId: row.stripe_payment_intent_id || row.stripePaymentIntentId || null,
    metadata: parseMetadata(row.metadata_json ?? row.metadata),
    createdAt: row.created_at || row.createdAt,
  };
}

function shapeAdminTransaction(row) {
  const transaction = shapeTransaction(row);
  return transaction && {
    ...transaction,
    email: row.email || null,
    displayName: row.display_name || row.displayName || null,
  };
}

function shapeTokenPack(row) {
  return row && {
    id: row.id,
    name: row.name,
    tokens: Number(row.tokens ?? row.tokenAmount ?? 0),
    priceCents: Number(row.price_cents ?? row.priceCents ?? 0),
    currency: row.currency || "AUD",
    active: Boolean(row.active ?? true),
    metadata: parseMetadata(row.metadata_json ?? row.metadata),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function shapeStripeWebhookEvent(row) {
  return row && {
    id: row.id,
    stripeEventId: row.stripe_event_id,
    eventType: row.event_type,
    status: row.status,
    checkoutSessionId: row.checkout_session_id || null,
    paymentIntentId: row.payment_intent_id || null,
    userId: row.user_id || null,
    tokenPackId: row.token_pack_id || null,
    tokens: Number.isFinite(Number(row.tokens)) ? Number(row.tokens) : null,
    errorMessage: row.error_message || null,
    processedAt: row.processed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requiredDb(env) {
  if (!env?.OPREALM_DB) throw httpError("OPRealm database is not connected.", 500);
  return env.OPREALM_DB;
}

function requireIdentity(user) {
  if (!user?.id) throw httpError("Please log in before using this tool.", 401);
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

function cleanOptionalLongText(value) {
  const text = cleanText(value || "", 1000);
  return text || null;
}

function cleanPayloadJson(value) {
  const text = String(value || "").trim();
  if (!text) throw httpError("Stripe webhook payload is required.", 400);
  if (new TextEncoder().encode(text).length > 256 * 1024) {
    throw httpError("Stripe webhook payload is too large.", 413);
  }
  try {
    JSON.parse(text);
  } catch {
    throw httpError("Stripe webhook payload must be JSON.", 400);
  }
  return text;
}

function cleanAssetUrl(value) {
  const text = cleanText(value || "", 1600);
  if (!text) throw httpError("Asset storage URL or path is required.", 400);
  if (!/^(https?:\/\/|\/|r2:\/\/|asset:|local:)/i.test(text)) {
    throw httpError("Asset storage URL or path is invalid.", 400);
  }
  return text;
}

function cleanOptionalUrl(value) {
  if (!value) return null;
  return cleanAssetUrl(value);
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 160) : "";
}

function normalizeFutureDate(value, defaultDays) {
  const date = value ? new Date(value) : new Date(Date.now() + defaultDays * 86400000);
  if (Number.isNaN(date.getTime())) throw httpError("Expiration date is invalid.", 400);
  if (date.getTime() <= Date.now()) throw httpError("Expiration date must be in the future.", 400);
  return date.toISOString();
}

function isExpired(value) {
  return value && new Date(value).getTime() <= Date.now();
}

function cleanTokenAmount(value, { allowZero = false } = {}) {
  const amount = Math.trunc(Number(value || 0));
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount <= 0)) {
    throw httpError("Token amount must be a positive whole number.", 400);
  }
  if (amount > 10_000_000) throw httpError("Token amount is too large.", 400);
  return amount;
}

function clampInt(value, min, max) {
  const number = Math.trunc(Number(value || min));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function stringifyMetadata(value) {
  return JSON.stringify(safeMetadata(value)).slice(0, 6000);
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === "object") return safeMetadata(value);
  try {
    return safeMetadata(JSON.parse(value));
  } catch {
    return {};
  }
}

function safeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 40)) {
    const cleanKey = cleanText(key, 80);
    if (!cleanKey) continue;
    if (typeof item === "string") output[cleanKey] = cleanText(item, 1000);
    else if (typeof item === "number" && Number.isFinite(item)) output[cleanKey] = item;
    else if (typeof item === "boolean" || item === null) output[cleanKey] = item;
    else if (Array.isArray(item)) output[cleanKey] = item.slice(0, 20).map((entry) => cleanText(entry, 200));
    else if (typeof item === "object") output[cleanKey] = JSON.parse(JSON.stringify(item).slice(0, 1000));
  }
  return output;
}

function mergeMetadata(existingJson, next) {
  return stringifyMetadata({ ...parseMetadata(existingJson), ...safeMetadata(next) });
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

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
