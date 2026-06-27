import { fail, getFoundation, ok } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ workspace: await services.getWorkspace(user, params.workspaceId) });
  } catch (error) {
    return fail(error, "Could not load workspace.");
  }
}
