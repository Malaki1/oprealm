import { fail, getFoundation, ok, readBody } from "../../_lib/content-api.js";

export async function onRequestPost({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const body = await readBody(request);
    return ok(await services.reserveTokens(user.id, body.amount, body.metadata || body), 201);
  } catch (error) {
    return fail(error, "Could not reserve tokens.");
  }
}
