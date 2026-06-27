import { fail, getAdminFoundation, ok, readBody } from "../../../../_lib/content-api.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const { services } = await getAdminFoundation(request, env);
    const body = await readBody(request);
    return ok(await services.adminGrantTokens(params.userId, body.amount, body.reason, "admin-api", body.metadata || {}), 201);
  } catch (error) {
    return fail(error, "Could not grant tokens.");
  }
}
