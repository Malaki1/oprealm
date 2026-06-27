import { fail, getFoundation, ok, readBody } from "../../../../_lib/content-api.js";
import {
  createBrandServices,
  createD1BrandStore,
  ensureBrandFoundationSchema,
} from "../../../../_lib/brand-foundation.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    return ok({ source: await services.getBrandSource(user, params.brandId, params.sourceId) });
  } catch (error) {
    return fail(error, "Could not load brand source.");
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const source = await services.updateBrandSource(user, params.brandId, params.sourceId, await readBody(request));
    return ok({ source });
  } catch (error) {
    return fail(error, "Could not update brand source.");
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const source = await services.archiveBrandSource(user, params.brandId, params.sourceId);
    return ok({ source });
  } catch (error) {
    return fail(error, "Could not archive brand source.");
  }
}

async function brandServices(env) {
  await ensureBrandFoundationSchema(env);
  return createBrandServices(createD1BrandStore(env.OPREALM_DB));
}
