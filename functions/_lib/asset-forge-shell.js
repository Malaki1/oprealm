export async function serveAssetForge(request, env) {
  const shellUrl = new URL("/asset-forge-app/", request.url);
  const response = await env.ASSETS.fetch(new Request(shellUrl, request));
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
