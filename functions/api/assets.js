import { fail, getFoundation, ok, query } from "../_lib/content-api.js";
import { readJson } from "../_lib/http.js";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 12 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function onRequestGet({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const params = query(request);
    const assets = await services.listAssets(user, { workspaceId: params.get("workspaceId") || params.get("workspace_id") || "" });
    return ok({ assets });
  } catch (error) {
    return fail(error, "Could not load assets.");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { user, services } = await getFoundation(request, env);
    const body = await readJson(request, "Invalid asset request.", MAX_UPLOAD_BODY_BYTES);
    const upload = body.dataUrl ? decodeDataUrl(body.dataUrl) : null;
    if (upload) {
      if (!env.OPREALM_ASSETS) throw Object.assign(new Error("Asset storage is not connected."), { status: 500 });
      if (!ALLOWED_UPLOAD_MIME.has(upload.mime)) throw Object.assign(new Error("Upload a PNG, JPG, WEBP, GIF or SVG image."), { status: 400 });
      if (upload.bytes.length > MAX_UPLOAD_BYTES) throw Object.assign(new Error("Upload is larger than 8 MB."), { status: 413 });
      const fileName = safeFileName(body.fileName || body.file_name || `brand-asset.${extensionFor(upload.mime)}`);
      const workspaceId = cleanPathPart(body.workspaceId || body.workspace_id || "workspace");
      const key = `content-machine/${user.id}/${workspaceId}/brand-assets/${crypto.randomUUID()}-${fileName}`;
      await env.OPREALM_ASSETS.put(key, upload.bytes, {
        httpMetadata: { contentType: upload.mime, cacheControl: "private, max-age=3600" },
      });
      body.storageUrl = `r2://oprealm-assets/${key}`;
      body.thumbnailUrl = body.thumbnailUrl || body.thumbnail_url || "";
      body.metadata = {
        ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}),
        originalFileName: fileName,
        mime: upload.mime,
        byteLength: upload.bytes.length,
        source: "content-machine-brand-upload",
      };
      delete body.dataUrl;
    }
    let asset = await services.createAsset(user, body);
    if (upload && !asset.thumbnailUrl) {
      asset = await services.updateAsset(user, asset.id, { thumbnailUrl: `/api/assets/${encodeURIComponent(asset.id)}/file` });
    }
    return ok({ asset }, 201);
  } catch (error) {
    return fail(error, "Could not create asset.");
  }
}

function decodeDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw Object.assign(new Error("Invalid uploaded image."), { status: 400 });
  return {
    mime: match[1].toLowerCase(),
    bytes: Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0)),
  };
}

function safeFileName(value) {
  const cleaned = String(value || "brand-asset")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return cleaned || "brand-asset";
}

function cleanPathPart(value) {
  return String(value || "")
    .replace(/[^a-z0-9_-]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "workspace";
}

function extensionFor(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  return mime.split("/").pop() || "png";
}
