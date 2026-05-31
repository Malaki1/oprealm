const TIERS = {
  explorer: { credits: 100 },
  creator: { credits: 500 },
  pro: { credits: 1200 },
};

const CREDIT_BUNDLES = {
  mini_boost: { credits: 50 },
  creator_boost: { credits: 150 },
  pro_boost: { credits: 400 },
};

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ ok: false, error: "Stripe webhook secret is not configured." }, 500);

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  const verified = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return json({ ok: false, error: "Invalid Stripe signature." }, 400);

  const event = JSON.parse(payload);
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object || {};
    const tierKey = session.metadata?.tier;
    const tier = TIERS[tierKey];
    const bundleKey = session.metadata?.bundle;
    const bundle = CREDIT_BUNDLES[bundleKey];
    const purchaseType = session.metadata?.purchase_type;
    const webUserId = session.client_reference_id;

    if (purchaseType === "credit_topup" && bundle && webUserId) {
      await env.OPREALM_DB.prepare(
        "UPDATE web_users SET credits_remaining = credits_remaining + ?, updated_at = datetime('now') WHERE id = ?",
      )
        .bind(bundle.credits, webUserId)
        .run();
    } else if (tier && webUserId) {
      await env.OPREALM_DB.prepare(
        "UPDATE web_users SET tier = ?, credits_remaining = ?, updated_at = datetime('now') WHERE id = ?",
      )
        .bind(tierKey, tier.credits, webUserId)
        .run();
    }

    await env.OPREALM_DB.prepare(
      "UPDATE billing_events SET status = ?, metadata_json = ?, updated_at = datetime('now') WHERE provider = 'stripe' AND provider_reference = ?",
    )
      .bind("completed", JSON.stringify(session).slice(0, 6000), session.id)
      .run();
  }

  return json({ ok: true, received: true });
}

async function verifyStripeSignature(payload, signature, secret) {
  const parts = Object.fromEntries(
    signature
      .split(",")
      .map((part) => part.split("="))
      .filter((part) => part.length === 2),
  );
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, parts.v1);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
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
