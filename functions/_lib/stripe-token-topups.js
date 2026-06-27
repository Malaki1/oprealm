import { cleanText } from "./validate.js";

export const STRIPE_TOPUP_SOURCE = "oprealm_token_topup";

const WEBHOOK_STATUSES = {
  RECEIVED: "received",
  PROCESSED: "processed",
  IGNORED: "ignored",
  FAILED: "failed",
};

export async function ensureStripeTokenTopupSchema(env) {
  const db = requiredDb(env);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      id TEXT PRIMARY KEY,
      stripe_event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      checkout_session_id TEXT,
      payment_intent_id TEXT,
      user_id TEXT,
      token_pack_id TEXT,
      tokens INTEGER,
      payload_json TEXT NOT NULL,
      error_message TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_checkout_session_id ON stripe_webhook_events(checkout_session_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_payment_intent_id ON stripe_webhook_events(payment_intent_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_user_id ON stripe_webhook_events(user_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at)").run();
  await db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_token_transactions_unique_stripe_checkout_session
    ON token_transactions(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL
  `).run();
}

export async function createTokenTopupCheckoutSession({ user, services, body = {}, env = {}, fetchImpl = fetch }) {
  if (!user?.id) throw httpError("Please log in before buying tokens.", 401);
  const tokenPackId = cleanRequiredText(body.tokenPackId || body.token_pack_id, "Token pack id", 160);
  const pack = await services.getTokenPack(tokenPackId);
  if (!pack || !pack.active) throw httpError("Token pack is not available for purchase.", 400);
  if (!Number.isInteger(pack.tokens) || pack.tokens <= 0 || !Number.isInteger(pack.priceCents) || pack.priceCents <= 0) {
    throw httpError("Token pack is not configured for checkout.", 500);
  }

  const stripeSecretKey = serverSecret(env.STRIPE_SECRET_KEY, "Stripe secret key");
  const appUrl = cleanAppUrl(env.APP_URL);
  const session = await createStripeCheckoutSession({
    stripeSecretKey,
    appUrl,
    pack,
    userId: user.id,
    fetchImpl,
  });
  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export async function createStripeCheckoutSession({ stripeSecretKey, appUrl, pack, userId, fetchImpl = fetch }) {
  const currency = cleanCurrency(pack.currency);
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("line_items[0][price_data][currency]", currency);
  body.set("line_items[0][price_data][product_data][name]", pack.name);
  body.set("line_items[0][price_data][unit_amount]", String(pack.priceCents));
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${appUrl}/billing/cancelled`);
  body.set("metadata[userId]", userId);
  body.set("metadata[tokenPackId]", pack.id);
  body.set("metadata[tokens]", String(pack.tokens));
  body.set("metadata[source]", STRIPE_TOPUP_SOURCE);

  let response;
  try {
    response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    throw httpError("Could not reach Stripe Checkout.", 502);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw httpError("Could not create Stripe Checkout session.", 502);
  }
  if (!payload?.id || !payload?.url) {
    throw httpError("Stripe Checkout session response was invalid.", 502);
  }
  return payload;
}

export async function handleStripeWebhook({ rawBody, signature, services, env = {}, nowMs = Date.now() }) {
  const webhookSecret = serverSecret(env.STRIPE_WEBHOOK_SECRET, "Stripe webhook secret");
  const event = await constructStripeWebhookEvent(rawBody, signature, webhookSecret, { nowMs });
  return processStripeWebhookEvent({ services, event, rawBody });
}

export async function constructStripeWebhookEvent(rawBody, signature, webhookSecret, options = {}) {
  await verifyStripeWebhookSignature(rawBody, signature, webhookSecret, options);
  try {
    return JSON.parse(rawBody);
  } catch {
    throw httpError("Stripe webhook payload is invalid.", 400);
  }
}

export async function verifyStripeWebhookSignature(rawBody, signatureHeader, webhookSecret, {
  nowMs = Date.now(),
  toleranceSeconds = 300,
} = {}) {
  if (!rawBody) throw httpError("Stripe webhook body is required.", 400);
  if (!signatureHeader) throw httpError("Stripe signature is required.", 400);
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) throw httpError("Stripe signature is invalid.", 400);
  if (Math.abs(Math.floor(nowMs / 1000) - parsed.timestamp) > toleranceSeconds) {
    throw httpError("Stripe signature timestamp is outside the tolerance window.", 400);
  }
  const expected = await hmacSha256Hex(webhookSecret, `${parsed.timestamp}.${rawBody}`);
  if (!parsed.signatures.some((signature) => timingSafeEqualHex(signature, expected))) {
    throw httpError("Stripe signature is invalid.", 400);
  }
  return true;
}

export async function signStripeWebhookPayload(rawBody, webhookSecret, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = await hmacSha256Hex(webhookSecret, `${timestamp}.${rawBody}`);
  return `t=${timestamp},v1=${signature}`;
}

export async function processStripeWebhookEvent({ services, event, rawBody }) {
  const stripeEventId = cleanRequiredText(event?.id, "Stripe event id", 160);
  const eventType = cleanRequiredText(event?.type, "Stripe event type", 160);

  const existingEvent = await services.getStripeWebhookEvent(stripeEventId);
  if (existingEvent && existingEvent.status !== WEBHOOK_STATUSES.RECEIVED) {
    return {
      received: true,
      duplicateEvent: true,
      status: existingEvent.status,
    };
  }

  if (!existingEvent) {
    await services.recordStripeWebhookEvent({
      stripeEventId,
      eventType,
      status: WEBHOOK_STATUSES.RECEIVED,
      payloadJson: rawBody || JSON.stringify(event),
    });
  }

  if (eventType !== "checkout.session.completed") {
    await markWebhook(services, stripeEventId, {
      status: WEBHOOK_STATUSES.IGNORED,
      processedAt: nowIso(),
    });
    return { received: true, ignored: true };
  }

  const session = event?.data?.object || {};
  const metadata = session.metadata || {};
  const checkoutSessionId = cleanText(session.id || "", 160);
  const paymentIntentId = cleanText(
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
    160,
  );
  const userId = cleanText(metadata.userId || "", 160);
  const tokenPackId = cleanText(metadata.tokenPackId || "", 160);
  const metadataTokens = Math.trunc(Number(metadata.tokens || 0));

  const baseEventUpdates = {
    checkoutSessionId,
    paymentIntentId,
    userId,
    tokenPackId,
    tokens: Number.isFinite(metadataTokens) ? metadataTokens : null,
  };

  if (
    metadata.source !== STRIPE_TOPUP_SOURCE
    || !checkoutSessionId
    || !userId
    || !tokenPackId
    || !Number.isInteger(metadataTokens)
    || metadataTokens <= 0
  ) {
    await markWebhook(services, stripeEventId, {
      ...baseEventUpdates,
      status: WEBHOOK_STATUSES.FAILED,
      errorMessage: "Missing or invalid token top-up metadata.",
      processedAt: nowIso(),
    });
    return { received: true, failed: true };
  }

  if (session.payment_status && session.payment_status !== "paid") {
    await markWebhook(services, stripeEventId, {
      ...baseEventUpdates,
      status: WEBHOOK_STATUSES.FAILED,
      errorMessage: "Checkout Session payment is not paid.",
      processedAt: nowIso(),
    });
    return { received: true, failed: true };
  }

  let pack = null;
  try {
    pack = await services.getTokenPack(tokenPackId);
  } catch {
    pack = null;
  }
  if (!pack || !pack.active || pack.tokens !== metadataTokens) {
    await markWebhook(services, stripeEventId, {
      ...baseEventUpdates,
      status: WEBHOOK_STATUSES.FAILED,
      errorMessage: "Token pack metadata does not match an active server pack.",
      processedAt: nowIso(),
    });
    return { received: true, failed: true };
  }

  const credited = await services.getPurchaseTransactionByStripeCheckoutSessionId(checkoutSessionId);
  if (credited) {
    await markWebhook(services, stripeEventId, {
      ...baseEventUpdates,
      status: WEBHOOK_STATUSES.PROCESSED,
      processedAt: nowIso(),
    });
    return { received: true, duplicateCheckoutSession: true };
  }

  const purchase = await services.creditPurchaseTokens({
    userId,
    amount: pack.tokens,
    stripeCheckoutSessionId: checkoutSessionId,
    stripePaymentIntentId: paymentIntentId,
    metadata: {
      tokenPackId,
      stripeEventId,
      source: "stripe_checkout",
      currency: session.currency || pack.currency,
      amountTotal: Number(session.amount_total ?? pack.priceCents),
      paymentStatus: session.payment_status || "paid",
    },
  });

  await markWebhook(services, stripeEventId, {
    ...baseEventUpdates,
    status: WEBHOOK_STATUSES.PROCESSED,
    processedAt: nowIso(),
  });
  return { received: true, processed: true, duplicateCheckoutSession: purchase.duplicate };
}

async function markWebhook(services, stripeEventId, updates) {
  return services.updateStripeWebhookEvent(stripeEventId, updates);
}

function requiredDb(env) {
  if (!env?.OPREALM_DB) throw httpError("OPRealm database is not connected.", 500);
  return env.OPREALM_DB;
}

function serverSecret(value, label) {
  const secret = String(value || "").trim();
  if (!secret) throw httpError(`${label} is not configured.`, 500);
  return secret;
}

function cleanAppUrl(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+/i.test(text)) throw httpError("APP_URL is not configured.", 500);
  return text;
}

function cleanCurrency(value) {
  const currency = cleanText(value || "AUD", 12).toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw httpError("Stripe currency is invalid.", 500);
  return currency;
}

function cleanRequiredText(value, label, maxLength) {
  const text = cleanText(value || "", maxLength);
  if (!text) throw httpError(`${label} is required.`, 400);
  return text;
}

function parseStripeSignatureHeader(header) {
  const parsed = { timestamp: 0, signatures: [] };
  for (const part of String(header || "").split(",")) {
    const [key, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (key === "t") parsed.timestamp = Math.trunc(Number(value || 0));
    if (key === "v1" && value) parsed.signatures.push(value);
  }
  return parsed;
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function nowIso() {
  return new Date().toISOString();
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
