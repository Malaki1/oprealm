import { fail, getFoundation, ok, query, readBody } from "../_lib/content-api.js";
import {
  createBrandServices,
  createD1BrandStore,
  ensureBrandFoundationSchema,
} from "../_lib/brand-foundation.js";

export async function onRequestGet({ request, env }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const params = query(request);
    const brands = await services.listBrands(user, {
      workspaceId: params.get("workspaceId") || params.get("workspace_id") || "",
      status: params.get("status") || "",
      includeArchived: params.get("includeArchived") || params.get("include_archived") || "",
    });
    return ok({ brands });
  } catch (error) {
    return fail(error, "Could not load brands.");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await getFoundation(request, env);
    const services = await brandServices(env);
    const brand = await services.createBrand(user, await readBody(request));
    return ok({ brand }, 201);
  } catch (error) {
    return fail(error, "Could not create brand.");
  }
}

async function brandServices(env) {
  await ensureBrandFoundationSchema(env);
  return createBrandServices(createD1BrandStore(env.OPREALM_DB));
}
