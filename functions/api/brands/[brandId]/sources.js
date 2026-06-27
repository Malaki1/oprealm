import { fail, getFoundation, ok, query, readBody } from "../../../_lib/content-api.js";
import {
  createBrandServices,
  createD1BrandStore,
  ensureBrandFoundationSchema,
} from "../../../_lib/brand-foundation.js";

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
    const services = await brandServices(env);
    const source = await services.createBrandSource(user, params.brandId, await readBody(request));
    return ok({ source }, 201);
  } catch (error) {
    return fail(error, "Could not create brand source.");
  }
}

async function brandServices(env) {
  await ensureBrandFoundationSchema(env);
  return createBrandServices(createD1BrandStore(env.OPREALM_DB));
}
