import { fail, getAdminFoundation, ok, query } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { services } = await getAdminFoundation(request, env);
    const limit = Number(query(request).get("limit") || 100);
    return ok({ transactions: await services.listAllTransactions(limit) });
  } catch (error) {
    return fail(error, "Could not load admin token transactions.");
  }
}
