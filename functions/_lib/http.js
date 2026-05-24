export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readJson(request, errorMessage = "Invalid JSON request.") {
  try {
    return await request.json();
  } catch {
    const error = new Error(errorMessage);
    error.status = 400;
    throw error;
  }
}
