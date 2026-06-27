const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

let foundation;
let stripeTopups;

const USERS = [
  { id: "buyer-1", email: "buyer@example.com", display_name: "Buyer" },
  { id: "admin-1", email: "admin@example.com", display_name: "Admin" },
];

const ENV = {
  STRIPE_SECRET_KEY: "sk_test_phase2",
  STRIPE_WEBHOOK_SECRET: "whsec_phase2",
  APP_URL: "https://oprealm.com",
};

test.before(async () => {
  foundation = await import(pathToFileURL(path.resolve("functions/_lib/content-foundation.js")));
  stripeTopups = await import(pathToFileURL(path.resolve("functions/_lib/stripe-token-topups.js")));
});

function makeHarness(seed = {}) {
  const store = foundation.createMemoryFoundationStore({
    users: USERS,
    tokenPacks: [
      { id: "inactive-pack", name: "Inactive Pack", tokens: 9999, price_cents: 9999, currency: "AUD", active: 0 },
    ],
    ...seed,
  });
  return {
    store,
    services: foundation.createFoundationServices(store),
    buyer: USERS[0],
    admin: USERS[1],
  };
}

function mockCheckoutFetch({ ok = true, id = "cs_test_created", url = "https://checkout.stripe.com/c/pay/test" } = {}) {
  const calls = [];
  const fetchImpl = async (requestUrl, options) => {
    calls.push({ requestUrl, options });
    const payload = ok ? { id, url } : { error: { message: "Stripe failed" } };
    return new Response(JSON.stringify(payload), {
      status: ok ? 200 : 400,
      headers: { "content-type": "application/json" },
    });
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function checkoutEvent({
  eventId = "evt_checkout_1",
  sessionId = "cs_test_123",
  paymentIntentId = "pi_test_123",
  metadata = {
    userId: "buyer-1",
    tokenPackId: "starter-1000",
    tokens: "1000",
    source: "oprealm_token_topup",
  },
  type = "checkout.session.completed",
  paymentStatus = "paid",
} = {}) {
  return {
    id: eventId,
    type,
    data: {
      object: {
        id: sessionId,
        payment_intent: paymentIntentId,
        amount_total: 1900,
        currency: "aud",
        payment_status: paymentStatus,
        metadata,
      },
    },
  };
}

async function signedRaw(event, secret = ENV.STRIPE_WEBHOOK_SECRET, timestamp = 1800000000) {
  const rawBody = JSON.stringify(event);
  const signature = await stripeTopups.signStripeWebhookPayload(rawBody, secret, timestamp);
  return { rawBody, signature, nowMs: timestamp * 1000 };
}

async function assertRejectStatus(promise, status) {
  await assert.rejects(promise, (error) => error.status === status);
}

test("checkout session uses the active server token pack and ignores client price overrides", async () => {
  const { services, buyer } = makeHarness();
  const fetchImpl = mockCheckoutFetch();

  const result = await stripeTopups.createTokenTopupCheckoutSession({
    user: buyer,
    services,
    body: { tokenPackId: "starter-1000", tokens: 999999, priceCents: 1 },
    env: ENV,
    fetchImpl,
  });

  assert.equal(result.checkoutUrl, "https://checkout.stripe.com/c/pay/test");
  assert.equal(result.sessionId, "cs_test_created");
  assert.equal(fetchImpl.calls.length, 1);

  const request = fetchImpl.calls[0];
  assert.equal(request.requestUrl, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer sk_test_phase2");
  assert.equal(request.options.body.get("mode"), "payment");
  assert.equal(request.options.body.get("line_items[0][price_data][currency]"), "aud");
  assert.equal(request.options.body.get("line_items[0][price_data][unit_amount]"), "1900");
  assert.equal(request.options.body.get("line_items[0][price_data][product_data][name]"), "Starter 1,000");
  assert.equal(request.options.body.get("metadata[userId]"), buyer.id);
  assert.equal(request.options.body.get("metadata[tokenPackId]"), "starter-1000");
  assert.equal(request.options.body.get("metadata[tokens]"), "1000");
  assert.equal(request.options.body.get("metadata[source]"), "oprealm_token_topup");
  assert.match(request.options.body.get("success_url"), /\/billing\/success\?session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.match(request.options.body.get("cancel_url"), /\/billing\/cancelled$/);
});

test("checkout session rejects missing, unknown, inactive, unauthenticated, and provider-failed requests", async () => {
  const { services, buyer } = makeHarness();

  await assertRejectStatus(stripeTopups.createTokenTopupCheckoutSession({
    user: buyer,
    services,
    body: {},
    env: ENV,
    fetchImpl: mockCheckoutFetch(),
  }), 400);

  await assertRejectStatus(stripeTopups.createTokenTopupCheckoutSession({
    user: buyer,
    services,
    body: { tokenPackId: "missing-pack" },
    env: ENV,
    fetchImpl: mockCheckoutFetch(),
  }), 404);

  await assertRejectStatus(stripeTopups.createTokenTopupCheckoutSession({
    user: buyer,
    services,
    body: { tokenPackId: "inactive-pack" },
    env: ENV,
    fetchImpl: mockCheckoutFetch(),
  }), 400);

  await assertRejectStatus(stripeTopups.createTokenTopupCheckoutSession({
    user: null,
    services,
    body: { tokenPackId: "starter-1000" },
    env: ENV,
    fetchImpl: mockCheckoutFetch(),
  }), 401);

  await assertRejectStatus(stripeTopups.createTokenTopupCheckoutSession({
    user: buyer,
    services,
    body: { tokenPackId: "starter-1000" },
    env: ENV,
    fetchImpl: mockCheckoutFetch({ ok: false }),
  }), 502);
});

test("valid checkout.session.completed webhook credits wallet and records purchase details", async () => {
  const { services, buyer, admin } = makeHarness();
  await services.adminGrantTokens(buyer.id, 100, "Existing balance", admin.id);
  const reservation = await services.reserveTokens(buyer.id, 40, { reason: "existing_hold" });
  assert.equal(reservation.wallet.balance, 60);
  assert.equal(reservation.wallet.reservedBalance, 40);

  const event = checkoutEvent();
  const signed = await signedRaw(event);
  const result = await stripeTopups.handleStripeWebhook({
    ...signed,
    services,
    env: ENV,
  });

  assert.equal(result.processed, true);
  const wallet = await services.getWallet(buyer.id);
  assert.equal(wallet.balance, 1060);
  assert.equal(wallet.reservedBalance, 40);
  assert.equal(wallet.lifetimePurchased, 1000);

  const transactions = await services.listTransactions(buyer.id);
  const purchase = transactions.find((transaction) => transaction.type === "purchase");
  assert.ok(purchase);
  assert.equal(purchase.amount, 1000);
  assert.equal(purchase.balanceAfter, 1060);
  assert.equal(purchase.reservedBalanceAfter, 40);
  assert.equal(purchase.stripeCheckoutSessionId, "cs_test_123");
  assert.equal(purchase.stripePaymentIntentId, "pi_test_123");
  assert.equal(purchase.metadata.tokenPackId, "starter-1000");
  assert.equal(purchase.metadata.stripeEventId, "evt_checkout_1");
  assert.equal(purchase.metadata.source, "stripe_checkout");

  const webhookEvent = await services.getStripeWebhookEvent("evt_checkout_1");
  assert.equal(webhookEvent.status, "processed");
  assert.equal(webhookEvent.checkoutSessionId, "cs_test_123");
  assert.equal(webhookEvent.paymentIntentId, "pi_test_123");
});

test("duplicate Stripe event id does not double-credit", async () => {
  const { services, buyer } = makeHarness();
  const signed = await signedRaw(checkoutEvent({ eventId: "evt_duplicate_event", sessionId: "cs_duplicate_event" }));

  await stripeTopups.handleStripeWebhook({ ...signed, services, env: ENV });
  const duplicate = await stripeTopups.handleStripeWebhook({ ...signed, services, env: ENV });

  assert.equal(duplicate.duplicateEvent, true);
  const wallet = await services.getWallet(buyer.id);
  assert.equal(wallet.balance, 1000);
  const purchases = (await services.listTransactions(buyer.id)).filter((transaction) => transaction.type === "purchase");
  assert.equal(purchases.length, 1);
});

test("different Stripe events for the same checkout session do not double-credit", async () => {
  const { services, buyer } = makeHarness();
  const first = await signedRaw(checkoutEvent({ eventId: "evt_session_1", sessionId: "cs_same_session" }));
  const second = await signedRaw(checkoutEvent({ eventId: "evt_session_2", sessionId: "cs_same_session" }));

  await stripeTopups.handleStripeWebhook({ ...first, services, env: ENV });
  const duplicate = await stripeTopups.handleStripeWebhook({ ...second, services, env: ENV });

  assert.equal(duplicate.duplicateCheckoutSession, true);
  const wallet = await services.getWallet(buyer.id);
  assert.equal(wallet.balance, 1000);
  const purchases = (await services.listTransactions(buyer.id)).filter((transaction) => transaction.type === "purchase");
  assert.equal(purchases.length, 1);

  const secondEvent = await services.getStripeWebhookEvent("evt_session_2");
  assert.equal(secondEvent.status, "processed");
});

test("invalid signatures are rejected without wallet credit or webhook persistence", async () => {
  const { services, buyer } = makeHarness();
  const event = checkoutEvent({ eventId: "evt_invalid_signature" });
  const rawBody = JSON.stringify(event);
  const signature = await stripeTopups.signStripeWebhookPayload(rawBody, "wrong-secret", 1800000000);

  await assertRejectStatus(stripeTopups.handleStripeWebhook({
    rawBody,
    signature,
    nowMs: 1800000000 * 1000,
    services,
    env: ENV,
  }), 400);

  assert.equal((await services.getWallet(buyer.id)).balance, 0);
  assert.equal(await services.getStripeWebhookEvent("evt_invalid_signature"), null);
});

test("missing metadata fails safely and unknown event types are ignored", async () => {
  const { services, buyer } = makeHarness();
  const missingMetadata = await signedRaw(checkoutEvent({
    eventId: "evt_missing_metadata",
    sessionId: "cs_missing_metadata",
    metadata: {},
  }));

  const failed = await stripeTopups.handleStripeWebhook({ ...missingMetadata, services, env: ENV });
  assert.equal(failed.failed, true);
  assert.equal((await services.getWallet(buyer.id)).balance, 0);
  assert.equal((await services.getStripeWebhookEvent("evt_missing_metadata")).status, "failed");
  assert.equal((await services.listTransactions(buyer.id)).length, 0);

  const ignoredEvent = {
    id: "evt_ignored",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_ignored" } },
  };
  const ignoredSigned = await signedRaw(ignoredEvent);
  const ignored = await stripeTopups.handleStripeWebhook({ ...ignoredSigned, services, env: ENV });
  assert.equal(ignored.ignored, true);
  assert.equal((await services.getStripeWebhookEvent("evt_ignored")).status, "ignored");
  assert.equal((await services.getWallet(buyer.id)).balance, 0);
});
