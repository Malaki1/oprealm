import { fail, getFoundation, ok } from "../../../../../_lib/content-api.js";
import {
  createBrandIngestionServices,
  createD1BrandIngestionStore,
  ensureBrandIngestionSchema,
} from "../../../../../_lib/brand-ingestion.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await ingestionServices(env);
    const result = await services.ingestBrandSource(user, params.brandId, params.sourceId);
    return ok(result);
  } catch (error) {
    return fail(error, "Could not ingest brand source.");
  }
}

async function ingestionServices(env) {
  await ensureBrandIngestionSchema(env);
  return createBrandIngestionServices(createD1BrandIngestionStore(env.OPREALM_DB));
}
