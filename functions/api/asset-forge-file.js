import { requireUser } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!key.startsWith(`asset-forge/${user.id}/`)) return new Response("Not found", { status: 404 });
    const object = await env.OPREALM_ASSETS.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", key.includes("/exports/") ? "private, no-store" : "private, max-age=3600");
    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(error.message || "Unauthorized", { status: error.status || 401 });
  }
}
