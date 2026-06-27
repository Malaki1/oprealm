import { fail, getFoundation, ok, query, readBody } from "../_lib/content-api.js";

export async function onRequestGet({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const params = query(request);
    const assets = await services.listAssets(user, { workspaceId: params.get("workspaceId") || params.get("workspace_id") || "" });
    return ok({ assets });
  } catch (error) {
    return fail(error, "Could not load assets.");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const asset = await services.createAsset(user, await readBody(request));
    return ok({ asset }, 201);
  } catch (error) {
    return fail(error, "Could not create asset.");
  }
}
