import { fail, getFoundation, ok, readBody } from "../../_lib/content-api.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    return ok({ asset: await services.getAsset(user, params.assetId) });
  } catch (error) {
    return fail(error, "Could not load asset.");
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const asset = await services.updateAsset(user, params.assetId, await readBody(request));
    return ok({ asset });
  } catch (error) {
    return fail(error, "Could not update asset.");
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const asset = await services.archiveAsset(user, params.assetId);
    return ok({ asset });
  } catch (error) {
    return fail(error, "Could not archive asset.");
  }
}
