import {
  createD1FoundationStore,
  createFoundationServices,
  ensureContentFoundationSchema,
} from "../../_lib/content-foundation.js";
import { json } from "../../_lib/http.js";
import {
  ensureStripeTokenTopupSchema,
  handleStripeWebhook,
} from "../../_lib/stripe-token-topups.js";

export async function onRequestPost({ request, env }) {
  try {
    await ensureContentFoundationSchema(env);
    await ensureStripeTokenTopupSchema(env);
    const services = createFoundationServices(createD1FoundationStore(env.OPREALM_DB));
    const result = await handleStripeWebhook({
      rawBody: await request.text(),
      signature: request.headers.get("stripe-signature"),
      services,
      env,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ ok: false, error: error.message || "Stripe webhook failed." }, error.status || 500);
  }
}
