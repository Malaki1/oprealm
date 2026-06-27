export async function onRequest({ request, env }) {
  const shellUrl = new URL("/reels-app/", request.url);
  const shellResponse = await env.ASSETS.fetch(new Request(shellUrl, request));
  const headers = new Headers(shellResponse.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(shellResponse.body, {
    status: shellResponse.status,
    statusText: shellResponse.statusText,
    headers,
  });
}
