export async function onRequestGet({ env }) {
  return json({
    ok: true,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
    paypalClientId: env.PAYPAL_CLIENT_ID || "",
    currency: env.OPREALM_CURRENCY || "AUD",
    paymentsEnabled: Boolean(env.STRIPE_SECRET_KEY || (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET)),
  });
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
