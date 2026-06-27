import { fail, getFoundation, ok } from "../../../../../_lib/content-api.js";
import {
  createBrandIngestionServices,
  createD1BrandIngestionStore,
  ensureBrandIngestionSchema,
} from "../../../../../_lib/brand-ingestion.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await ingestionServices(env);
    const attempts = await services.listBrandIngestionAttempts(user, params.brandId, params.sourceId);
    return ok({ attempts });
  } catch (error) {
    return fail(error, "Could not load brand ingestion attempts.");
  }
}

async function ingestionServices(env) {
  await ensureBrandIngestionSchema(env);
  return createBrandIngestionServices(createD1BrandIngestionStore(env.OPREALM_DB));
}
