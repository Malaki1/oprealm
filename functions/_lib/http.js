export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readJson(request, errorMessage = "Invalid JSON request.", maxBytes = 256 * 1024) {
  try {
    const raw = await request.clone().text();
    if (new TextEncoder().encode(raw).length > maxBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    return raw ? JSON.parse(raw) : {};
  } catch (caught) {
    if (caught?.status) throw caught;
    const error = new Error(errorMessage);
    error.status = 400;
    throw error;
  }
}
