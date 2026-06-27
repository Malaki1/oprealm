import { fail, getFoundation, ok } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { services } = await getFoundation(request, env);
    return ok({ tokenPacks: await services.listTokenPacks() });
  } catch (error) {
    return fail(error, "Could not load token packs.");
  }
}
