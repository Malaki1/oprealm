import { fail, getFoundation, ok, query } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const limit = Number(query(request).get("limit") || 100);
    return ok({ transactions: await services.listTransactions(user.id, limit) });
  } catch (error) {
    return fail(error, "Could not load token transactions.");
  }
}
