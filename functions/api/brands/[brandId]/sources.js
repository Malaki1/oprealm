import { fail, getFoundation, ok, query, readBody } from "../../../_lib/content-api.js";
import {
  createBrandServices,
} from "../../../_lib/brand-foundation.js";
import {
  createBrandIngestionServices,
  createD1BrandIngestionStore,
  ensureBrandIngestionSchema,
} from "../../../_lib/brand-ingestion.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const search = query(request);
    const sources = await services.listBrandSources(user, params.brandId, {
      status: search.get("status") || "",
      includeArchived: search.get("includeArchived") || search.get("include_archived") || "",
    });
    return ok({ sources });
  } catch (error) {
    return fail(error, "Could not load brand sources.");
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const { user } = await getFoundation(request, env);
    const body = await readBody(request);
    const services = await brandServices(env);
    const source = await services.createBrandSource(user, params.brandId, body);
    if (body.ingestNow || body.ingest_now || body.ingest === true) {
      const ingestion = await ingestionServices(env);
      const result = await ingestion.ingestBrandSource(user, params.brandId, source.id);
      return ok(result, 201);
    }
    return ok({ source }, 201);
  } catch (error) {
    return fail(error, "Could not create brand source.");
  }
}

async function brandServices(env) {
  await ensureBrandIngestionSchema(env);
  return createBrandServices(createD1BrandIngestionStore(env.OPREALM_DB));
}

async function ingestionServices(env) {
  await ensureBrandIngestionSchema(env);
  return createBrandIngestionServices(createD1BrandIngestionStore(env.OPREALM_DB));
}
