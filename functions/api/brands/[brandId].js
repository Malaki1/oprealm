import { fail, getFoundation, ok, readBody } from "../../_lib/content-api.js";
import {
  createBrandServices,
  createD1BrandStore,
  ensureBrandFoundationSchema,
} from "../../_lib/brand-foundation.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    return ok({ brand: await services.getBrand(user, params.brandId) });
  } catch (error) {
    return fail(error, "Could not load brand.");
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const brand = await services.updateBrand(user, params.brandId, await readBody(request));
    return ok({ brand });
  } catch (error) {
    return fail(error, "Could not update brand.");
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const brand = await services.archiveBrand(user, params.brandId);
    return ok({ brand });
  } catch (error) {
    return fail(error, "Could not archive brand.");
  }
}

async function brandServices(env) {
  await ensureBrandFoundationSchema(env);
  return createBrandServices(createD1BrandStore(env.OPREALM_DB));
}
