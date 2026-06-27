import { fail, getFoundation, ok } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ wallet: await services.getWallet(user.id) });
  } catch (error) {
    return fail(error, "Could not load token wallet.");
  }
}
