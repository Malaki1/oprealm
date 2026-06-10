import { CREDIT_BUNDLES, MEMBERSHIP_TIERS as TIERS } from "../_lib/creator-pricing.js";

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid payment request." }, 400);
  }

  const provider = body.provider;
  if (body.action === "capture_paypal") return capturePayPalOrder(request, env, body.orderId);

  const bundleKey = body.bundle;
  if (bundleKey) {
    const bundle = CREDIT_BUNDLES[bundleKey];
    if (!bundle) return json({ ok: false, error: "Unknown credit bundle." }, 400);
    if (provider !== "stripe") return json({ ok: false, error: "Credit top-ups are card checkout only right now." }, 400);

    const user = await currentUser(request, env);
    if (!user) return json({ ok: false, error: "Please log in before buying Creator credits." }, 401);

    const origin = new URL(request.url).origin;
    return createStripeCreditCheckout(env, origin, user, bundleKey, bundle);
  }

  const tierKey = body.tier;
  const tier = TIERS[tierKey];
  if (!tier) return json({ ok: false, error: "Unknown membership tier." }, 400);

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before starting checkout." }, 401);
  const origin = new URL(request.url).origin;

  if (provider === "stripe") return createStripeCheckout(env, origin, user, tierKey, tier);
  if (provider === "paypal") return createPayPalOrder(env, origin, user, tierKey, tier);

  return json({ ok: false, error: "Choose Stripe or PayPal." }, 400);
}

async function createStripeCreditCheckout(env, origin, user, bundleKey, bundle) {
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: "Stripe is not configured yet." }, 500);

  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/billing?credits=success`,
    cancel_url: `${origin}/billing?credits=cancelled`,
    "line_items[0][price_data][currency]": String(env.OPREALM_CURRENCY || "AUD").toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(bundle.amountCents),
    "line_items[0][price_data][product_data][name]": bundle.label,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    customer_email: user.email,
    "metadata[purchase_type]": "credit_topup",
    "metadata[bundle]": bundleKey,
    "metadata[credits]": String(bundle.credits),
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();

  if (!response.ok) return json({ ok: false, error: data.error?.message || "Stripe credit checkout failed." }, 502);

  await saveBillingEvent(env, user.id, "stripe", bundleKey, data.id, "created", bundle.amountCents, env.OPREALM_CURRENCY || "AUD", data);
  return json({ ok: true, provider: "stripe", checkoutUrl: data.url });
}

async function createStripeCheckout(env, origin, user, tierKey, tier) {
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, error: "Stripe is not configured yet." }, 500);

  const body = new URLSearchParams({
    mode: "subscription",
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    "line_items[0][price_data][currency]": String(env.OPREALM_CURRENCY || "AUD").toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(tier.amountCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": tier.label,
    "line_items[0][quantity]": "1",
    "metadata[tier]": tierKey,
  });
  if (tier.trialDays) body.set("subscription_data[trial_period_days]", String(tier.trialDays));
  body.set("subscription_data[metadata][tier]", tierKey);
  body.set("subscription_data[metadata][web_user_id]", user.id);
  if (user?.email) body.set("customer_email", user.email);
  if (user?.id) body.set("client_reference_id", user.id);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();

  if (!response.ok) return json({ ok: false, error: data.error?.message || "Stripe checkout failed." }, 502);

  await saveBillingEvent(env, user?.id || null, "stripe", tierKey, data.id, "created", tier.amountCents, env.OPREALM_CURRENCY || "AUD", data);
  return json({ ok: true, provider: "stripe", checkoutUrl: data.url });
}

async function createPayPalOrder(env, origin, user, tierKey, tier) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json({ ok: false, error: "PayPal is not configured yet." }, 500);
  }

  const currency = env.OPREALM_CURRENCY || "AUD";
  const base = env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok) return json({ ok: false, error: "PayPal authentication failed." }, 502);

  const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: tierKey,
          description: tier.label,
          amount: {
            currency_code: currency,
            value: (tier.amountCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "OPREALM",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: `${origin}/billing?paypal=approved`,
        cancel_url: `${origin}/billing?paypal=cancelled`,
      },
    }),
  });
  const order = await orderResponse.json();
  if (!orderResponse.ok) return json({ ok: false, error: order.message || "PayPal order failed." }, 502);

  await saveBillingEvent(env, user?.id || null, "paypal", tierKey, order.id, "created", tier.amountCents, currency, order);
  return json({ ok: true, provider: "paypal", orderId: order.id, approveUrl: order.links?.find((link) => link.rel === "approve")?.href || null });
}

async function capturePayPalOrder(request, env, orderId) {
  if (!orderId) return json({ ok: false, error: "Missing PayPal order id." }, 400);
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json({ ok: false, error: "PayPal is not configured yet." }, 500);
  }

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before completing PayPal checkout." }, 401);
  const event = await env.OPREALM_DB.prepare("SELECT * FROM billing_events WHERE provider = 'paypal' AND provider_reference = ? LIMIT 1")
    .bind(orderId)
    .first();
  if (!event || event.web_user_id !== user.id) {
    return json({ ok: false, error: "That PayPal order does not belong to this account." }, 403);
  }

  const base = env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok) return json({ ok: false, error: "PayPal authentication failed." }, 502);

  const captureResponse = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token.access_token}`,
      "content-type": "application/json",
    },
  });
  const capture = await captureResponse.json();
  if (!captureResponse.ok) return json({ ok: false, error: capture.message || "PayPal capture failed." }, 502);

  const tierKey = event?.tier || capture.purchase_units?.[0]?.custom_id;
  const tier = TIERS[tierKey];
  if (tier && (user?.id || event?.web_user_id)) {
    await applyMembership(env, user?.id || event.web_user_id, tierKey, tier);
  }

  await env.OPREALM_DB.prepare("UPDATE billing_events SET status = 'captured', metadata_json = ?, updated_at = datetime('now') WHERE provider = 'paypal' AND provider_reference = ?")
    .bind(JSON.stringify(capture).slice(0, 6000), orderId)
    .run();

  return json({ ok: true, provider: "paypal", status: "captured", tier: tierKey || null });
}

async function currentUser(request, env) {
  const sessionId = parseCookies(request.headers.get("cookie") || "").oprealm_session;
  if (!sessionId) return null;
  return env.OPREALM_DB.prepare(
    `
      SELECT web_users.*
      FROM web_sessions
      JOIN web_users ON web_users.id = web_sessions.web_user_id
      WHERE web_sessions.id = ?
        AND web_sessions.expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(sessionId)
    .first();
}

async function saveBillingEvent(env, webUserId, provider, tier, providerReference, status, amountCents, currency, metadata) {
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO billing_events (id, web_user_id, provider, tier, provider_reference, status, amount_cents, currency, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
  )
    .bind(crypto.randomUUID(), webUserId, provider, tier, providerReference, status, amountCents, currency, JSON.stringify(metadata).slice(0, 6000))
    .run();
}

async function applyMembership(env, webUserId, tierKey, tier) {
  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET tier = ?, credits_remaining = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(tierKey, tier.credits, webUserId)
    .run();
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
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
