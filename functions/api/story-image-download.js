export async function onRequestPost({ request }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response("Invalid download request.", { status: 400 });
  }

  const filename = safeFilename(form.get("filename") || "oprealm-scene-card.png");
  const imageDataUrl = String(form.get("imageDataUrl") || "");
  const match = imageDataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) return new Response("Invalid image data.", { status: 400 });

  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (!bytes.length || bytes.length > 15 * 1024 * 1024) {
    return new Response("Image download is too large.", { status: 413 });
  }

  return new Response(bytes, {
    headers: {
      "content-type": match[1],
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function safeFilename(value) {
  const clean = String(value || "oprealm-scene-card.png")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return clean.toLowerCase().endsWith(".png") ? clean : `${clean || "oprealm-scene-card"}.png`;
}
