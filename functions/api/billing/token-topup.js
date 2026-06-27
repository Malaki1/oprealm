import { fail, getFoundation, ok, readBody } from "../../_lib/content-api.js";
import {
  createTokenTopupCheckoutSession,
  ensureStripeTokenTopupSchema,
} from "../../_lib/stripe-token-topups.js";

export async function onRequestPost({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    await ensureStripeTokenTopupSchema(env);
    const result = await createTokenTopupCheckoutSession({
      user,
      services,
      body: await readBody(request),
      env,
      fetchImpl: fetch,
    });
    return ok(result, 201);
  } catch (error) {
    return fail(error, "Could not create token top-up checkout.");
  }
}
