import { fail, getFoundation } from "../../../_lib/content-api.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const asset = await services.getAsset(user, params.assetId);
    const key = storageKey(asset.storageUrl);
    if (!key || !env.OPREALM_ASSETS) return new Response("Not found", { status: 404 });
    const object = await env.OPREALM_ASSETS.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=3600");
    return new Response(object.body, { headers });
  } catch (error) {
    return fail(error, "Could not load asset file.");
  }
}

function storageKey(value) {
  const text = String(value || "");
  const prefix = "r2://oprealm-assets/";
  return text.startsWith(prefix) ? text.slice(prefix.length) : "";
}
