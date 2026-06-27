import { fail, getFoundation, ok, readBody } from "../../../_lib/content-api.js";
import {
  createBrandServices,
  createD1BrandStore,
  ensureBrandFoundationSchema,
} from "../../../_lib/brand-foundation.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    return ok({ brain: await services.getOrCreateBrandBrain(user, params.brandId) });
  } catch (error) {
    return fail(error, "Could not load Brand Brain.");
  }
}

export async function onRequestPut({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const brain = await services.updateBrandBrain(user, params.brandId, await readBody(request));
    return ok({ brain });
  } catch (error) {
    return fail(error, "Could not update Brand Brain.");
  }
}

async function brandServices(env) {
  await ensureBrandFoundationSchema(env);
  return createBrandServices(createD1BrandStore(env.OPREALM_DB));
}
