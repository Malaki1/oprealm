import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import {
  analyseForgeProject,
  buildExportManifest,
  createAssetPlan,
  createForgeProject,
  optimizeAssetRecord,
  scoreAssetQuality,
  validateForgeProject,
} from "../_lib/asset-forge.mjs";
import { createStoredZip } from "../_lib/simple-zip.mjs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const allowedMime = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"]);

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const id = cleanId(url.searchParams.get("id"));
    if (id) {
      const project = await ownedProject(env, user.id, id);
      return project ? json({ ok: true, project: withUrls(project) }) : json({ ok: false, error: "Project not found." }, 404);
    }
    const rows = await env.OPREALM_DB.prepare(
      "SELECT snapshot_json FROM asset_forge_projects WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100",
    ).bind(user.id).all();
    return json({ ok: true, projects: (rows.results || []).map((row) => withUrls(parse(row.snapshot_json))).filter(Boolean) });
  } catch (error) {
    return json({ ok: false, error: error.message || "Unable to load Asset Forge." }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(request, env);
    const body = await readJson(request, "Invalid Asset Forge request.", 22 * 1024 * 1024);
    const action = text(body.action, 40);
    await assertRateLimit(env, user.id, `asset_forge_${action}`, { limit: action === "generate" ? 12 : 80, windowSeconds: 60 });
    if (action === "create") return createProject(env, user, body);
    if (action === "upload") return uploadMockup(env, user, body);
    if (action === "analyse") return analyseProject(env, user, body);
    if (action === "save") return saveProject(env, user, body.project);
    if (action === "add_asset") return addAsset(env, user, body);
    if (action === "generate") return generateAsset(env, user, body);
    if (action === "validate") return validateAsset(env, user, body);
    if (action === "optimize") return optimizeAsset(env, user, body);
    if (action === "export") return exportProject(env, user, body);
    if (action === "delete") return deleteProject(env, user, body);
    return json({ ok: false, error: "Unsupported Asset Forge action." }, 400);
  } catch (error) {
    return json({ ok: false, error: error.message || "Asset Forge request failed." }, error.status || 500);
  }
}

async function createProject(env, user, body) {
  const project = createForgeProject({ ownerId: user.id, name: body.name, description: body.description });
  await persistProject(env, project);
  return json({ ok: true, project }, 201);
}

async function uploadMockup(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const upload = decodeDataUrl(body.dataUrl);
  if (!allowedMime.has(upload.mime)) throw bad("Unsupported upload type. Use PNG, JPG, WEBP, SVG or PDF.");
  if (upload.bytes.length > MAX_UPLOAD_BYTES) throw Object.assign(new Error("Upload is larger than 15 MB."), { status: 413 });
  const fileName = safeName(body.fileName || `mockup.${extension(upload.mime)}`);
  const key = `asset-forge/${user.id}/${project.id}/mockups/${crypto.randomUUID()}-${fileName}`;
  await env.OPREALM_ASSETS.put(key, upload.bytes, { httpMetadata: { contentType: upload.mime } });
  project.mockups.push({
    id: crypto.randomUUID(), name: fileName, key, mime: upload.mime, byteLength: upload.bytes.length,
    width: clamp(body.width, 0, 12000), height: clamp(body.height, 0, 12000), uploadedAt: new Date().toISOString(),
  });
  project.status = "uploaded"; project.progress = 14; project.updatedAt = new Date().toISOString();
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project) });
}

async function analyseProject(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const mockup = project.mockups.at(-1);
  if (!mockup) throw bad("Upload a mockup before analysis.");
  let ai = {};
  if (hasOpenAiKey(env) && mockup.mime.startsWith("image/")) {
    try { ai = await visionAnalysis(env, mockup, body, user.id); } catch { ai = {}; }
  }
  const analysed = analyseForgeProject(project, {
    fileName: mockup.name, width: mockup.width, height: mockup.height,
    ...ai,
  });
  await persistProject(env, analysed);
  return json({ ok: true, project: withUrls(analysed), analysisMode: Object.keys(ai).length ? "ai_vision" : "adaptive_fallback" });
}

async function saveProject(env, user, input) {
  const existing = await requiredProject(env, user.id, input?.id);
  const project = sanitizeProject({ ...existing, ...input, ownerId: user.id });
  const validation = validateForgeProject(project);
  if (!validation.valid) throw bad(validation.errors.join(" "));
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project) });
}

async function addAsset(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  if (!project.styleAnalysis || !project.designSystem) throw bad("Analyse the mockup before adding an asset.");
  project.assets.push(createAssetPlan({
    projectId: project.id, name: body.name || "New Asset", category: body.category || "icons",
    purpose: body.purpose, index: project.assets.length,
    canvasWidth: project.mockups[0]?.width, canvasHeight: project.mockups[0]?.height,
    styleAnalysis: project.styleAnalysis, designSystem: project.designSystem,
  }));
  project.updatedAt = new Date().toISOString();
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project) });
}

async function generateAsset(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const asset = project.assets.find((item) => item.id === body.assetId);
  if (!asset) throw bad("Asset not found.", 404);
  asset.status = "generating";
  const job = { id: crypto.randomUUID(), projectId: project.id, assetId: asset.id, status: "processing", progress: 15, jobType: "generate" };
  project.queue = [job, ...(project.queue || []).filter((item) => item.assetId !== asset.id)].slice(0, 40);
  await persistProject(env, project);
  let generated;
  try {
    generated = hasOpenAiKey(env) ? await generateImage(env, asset) : fallbackSvg(asset, project);
  } catch {
    generated = fallbackSvg(asset, project);
  }
  const key = `asset-forge/${user.id}/${project.id}/assets/${asset.id}.${generated.extension}`;
  await env.OPREALM_ASSETS.put(key, generated.bytes, { httpMetadata: { contentType: generated.mime } });
  asset.outputKey = key;
  asset.outputUrl = fileUrl(key);
  asset.thumbnailUrl = asset.outputUrl;
  asset.status = "complete";
  asset.quality = scoreAssetQuality(asset, { byteLength: generated.bytes.length });
  if (asset.quality.productionReady) asset.status = "approved";
  Object.assign(job, { status: "complete", progress: 100 });
  project.progress = Math.max(project.progress, 72);
  project.updatedAt = new Date().toISOString();
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project), asset });
}

async function validateAsset(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const asset = project.assets.find((item) => item.id === body.assetId);
  if (!asset) throw bad("Asset not found.", 404);
  asset.quality = scoreAssetQuality(asset);
  asset.status = asset.quality.productionReady ? "approved" : "needs_revision";
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project), asset });
}

async function optimizeAsset(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const index = project.assets.findIndex((item) => item.id === body.assetId);
  if (index < 0) throw bad("Asset not found.", 404);
  project.assets[index] = optimizeAssetRecord(project.assets[index]);
  project.progress = Math.max(project.progress, 88);
  await persistProject(env, project);
  return json({ ok: true, project: withUrls(project), asset: project.assets[index] });
}

async function exportProject(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  const manifest = buildExportManifest(project);
  const files = [
    { name: "style-profile.json", data: JSON.stringify(project.styleProfile || {}, null, 2) },
    { name: "design-system.json", data: JSON.stringify(project.designSystem || {}, null, 2) },
    { name: "asset-manifest.json", data: JSON.stringify(manifest, null, 2) },
    { name: "prompts.json", data: JSON.stringify(manifest.prompts, null, 2) },
    { name: "quality-report.json", data: JSON.stringify(manifest.qualityReport, null, 2) },
    { name: "README.txt", data: `${project.name}\nGenerated by Mockup Asset Forge.\n\nThis pack contains the design rulebook, manifest, prompts and approved asset references.` },
  ];
  for (const asset of project.assets.filter((item) => item.outputKey)) {
    const object = await env.OPREALM_ASSETS.get(asset.outputKey);
    if (object) files.push({ name: `assets/${asset.category}/${asset.slug}.${asset.outputKey.split(".").pop()}`, data: new Uint8Array(await object.arrayBuffer()) });
  }
  const zip = createStoredZip(files);
  const exportId = crypto.randomUUID();
  const fileName = `${slug(project.name)}-asset-pack.zip`;
  const key = `asset-forge/${user.id}/${project.id}/exports/${exportId}-${fileName}`;
  await env.OPREALM_ASSETS.put(key, zip, { httpMetadata: { contentType: "application/zip", contentDisposition: `attachment; filename="${fileName}"` } });
  project.exports.unshift({ id: exportId, fileName, key, url: fileUrl(key), createdAt: new Date().toISOString(), assetCount: manifest.files.length });
  project.status = "exported"; project.progress = 100;
  await persistProject(env, project);
  await env.OPREALM_DB.prepare(
    "INSERT INTO asset_forge_exports (id, project_id, owner_id, status, storage_key, file_name, manifest_json) VALUES (?, ?, ?, 'complete', ?, ?, ?)",
  ).bind(exportId, project.id, user.id, key, fileName, JSON.stringify(manifest)).run();
  return json({ ok: true, project: withUrls(project), export: project.exports[0] });
}

async function deleteProject(env, user, body) {
  const project = await requiredProject(env, user.id, body.projectId);
  await env.OPREALM_DB.batch([
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_assets WHERE project_id = ? AND owner_id = ?").bind(project.id, user.id),
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_jobs WHERE project_id = ? AND owner_id = ?").bind(project.id, user.id),
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_exports WHERE project_id = ? AND owner_id = ?").bind(project.id, user.id),
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_projects WHERE id = ? AND owner_id = ?").bind(project.id, user.id),
  ]);
  return json({ ok: true });
}

async function persistProject(env, project) {
  project.updatedAt = new Date().toISOString();
  const first = project.mockups?.[0] || {};
  const statements = [
    env.OPREALM_DB.prepare(
      `INSERT INTO asset_forge_projects (id, owner_id, name, description, status, progress, source_key, source_name, source_type, source_width, source_height, snapshot_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, status=excluded.status, progress=excluded.progress,
       source_key=excluded.source_key, source_name=excluded.source_name, source_type=excluded.source_type, source_width=excluded.source_width,
       source_height=excluded.source_height, snapshot_json=excluded.snapshot_json, updated_at=excluded.updated_at`,
    ).bind(project.id, project.ownerId, project.name, project.description, project.status, project.progress, first.key || null, first.name || null,
      first.mime || null, first.width || null, first.height || null, JSON.stringify(project), project.createdAt, project.updatedAt),
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_assets WHERE project_id = ?").bind(project.id),
    env.OPREALM_DB.prepare("DELETE FROM asset_forge_jobs WHERE project_id = ?").bind(project.id),
  ];
  for (const asset of project.assets || []) statements.push(env.OPREALM_DB.prepare(
    `INSERT INTO asset_forge_assets (id, project_id, owner_id, name, category, status, priority, export_format, width, height, background, prompt, negative_prompt, output_key, thumbnail_key, quality_json, snapshot_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(asset.id, project.id, project.ownerId, asset.name, asset.category, asset.status, asset.priority, asset.exportFormat,
    asset.sizing.exportWidth, asset.sizing.exportHeight, asset.background, asset.prompt, asset.negativePrompt, asset.outputKey || null,
    asset.thumbnailKey || null, JSON.stringify(asset.quality), JSON.stringify(asset), asset.createdAt, asset.updatedAt));
  for (const job of project.queue || []) statements.push(env.OPREALM_DB.prepare(
    "INSERT INTO asset_forge_jobs (id, project_id, asset_id, owner_id, job_type, status, progress, error_text, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(job.id, project.id, job.assetId || null, project.ownerId, job.jobType || "generate", job.status, job.progress || 0, job.error || null, JSON.stringify(job)));
  await env.OPREALM_DB.batch(statements);
}

async function ownedProject(env, ownerId, id) {
  const row = await env.OPREALM_DB.prepare("SELECT snapshot_json FROM asset_forge_projects WHERE id = ? AND owner_id = ? LIMIT 1").bind(cleanId(id), ownerId).first();
  return row ? parse(row.snapshot_json) : null;
}
async function requiredProject(env, ownerId, id) {
  const project = await ownedProject(env, ownerId, id);
  if (!project) throw bad("Project not found.", 404);
  return project;
}

async function visionAnalysis(env, mockup, body, seed) {
  const object = await env.OPREALM_ASSETS.get(mockup.key);
  if (!object) return {};
  const base64 = bytesToBase64(new Uint8Array(await object.arrayBuffer()));
  const response = await openAiFetch(env, "/v1/responses", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4",
      reasoning: { effort: "low" },
      input: [{ role: "user", content: [
        { type: "input_text", text: "Act as a screenshot asset-localization system. Analyse the entire interface at native resolution. Return JSON only with styleName, styleSummary, audience, complexityLevel, designLanguage, visualMood, palette (six hex colors), and detectedAssets. Each detected asset must be one specific visible reusable visual item. For every detectedAssets object return name, category, purpose, and sourceRegion with x, y, width, height, unit:'percent', and confidence. Coordinates are percentages from the original image top-left and must tightly enclose the visible pixels of that exact named asset. First identify the asset center, then measure its left, top, right and bottom edges. Icons, badges and avatars require small tight boxes. Thumbnail boxes must cover only the image area, excluding captions and neighbouring cards. Buttons must cover the button only. Do not return panels, columns, text blocks, navigation groups, form sections, or empty areas. Do not overlap unrelated assets. Omit any item below 0.8 confidence. Return at most 36 assets." },
        { type: "input_image", image_url: `data:${mockup.mime};base64,${base64}`, detail: "original" },
      ] }],
      text: { format: { type: "json_object" } },
    }),
  }, { seed, timeoutMs: 90000, retries: 1 });
  const data = await response.json();
  if (!response.ok) return {};
  const output = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  return parse(output) || {};
}

async function generateImage(env, asset) {
  const response = await openAiFetch(env, "/v1/images/generations", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1-mini", quality: "low", size: "1024x1024", background: asset.background === "transparent" ? "transparent" : "opaque", n: 1, prompt: `${asset.prompt} ${asset.negativePrompt}` }),
  }, { seed: asset.id, timeoutMs: 120000, retries: 1 });
  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!response.ok || !b64) throw new Error(data.error?.message || "Asset generation failed.");
  return { bytes: Uint8Array.from(atob(b64), (char) => char.charCodeAt(0)), mime: "image/png", extension: "png" };
}

function fallbackSvg(asset, project) {
  const colors = project.designSystem?.colors?.map((item) => item.value) || ["#8b3dff", "#2c8cff"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.sizing.exportWidth}" height="${asset.sizing.exportHeight}" viewBox="0 0 512 512"><defs><radialGradient id="g"><stop stop-color="${colors[1] || colors[0]}"/><stop offset="1" stop-color="${colors[0]}"/></radialGradient><filter id="s"><feGaussianBlur stdDeviation="12"/></filter></defs><circle cx="256" cy="256" r="180" fill="${colors[0]}" opacity=".25" filter="url(#s)"/><rect x="96" y="96" width="320" height="320" rx="96" fill="url(#g)"/><path d="M176 244h160M256 164v160" stroke="white" stroke-width="38" stroke-linecap="round"/></svg>`;
  return { bytes: new TextEncoder().encode(svg), mime: "image/svg+xml", extension: "svg" };
}

function sanitizeProject(project) {
  project.name = text(project.name, 100); project.description = text(project.description, 400);
  project.assets = Array.isArray(project.assets) ? project.assets.slice(0, 300) : [];
  project.regions = Array.isArray(project.regions) ? project.regions.slice(0, 300) : [];
  return project;
}
function withUrls(project) {
  if (!project) return project;
  for (const mockup of project.mockups || []) mockup.url = fileUrl(mockup.key);
  for (const asset of project.assets || []) {
    if (asset.outputKey) asset.outputUrl = fileUrl(asset.outputKey);
    if (asset.thumbnailKey) asset.thumbnailUrl = fileUrl(asset.thumbnailKey);
  }
  for (const item of project.exports || []) if (item.key) item.url = fileUrl(item.key);
  return project;
}
function fileUrl(key) { return `/api/asset-forge-file?key=${encodeURIComponent(key)}`; }
function decodeDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw bad("Invalid uploaded file.");
  return { mime: match[1].toLowerCase(), bytes: Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0)) };
}
function bytesToBase64(bytes) { let out = ""; for (let index = 0; index < bytes.length; index += 0x8000) out += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(out); }
function parse(value) { try { return JSON.parse(value || ""); } catch { return null; } }
function safeName(value) { return text(value, 120).replace(/[^a-zA-Z0-9._-]+/g, "-") || "mockup.png"; }
function extension(mime) { return { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf" }[mime] || "bin"; }
function cleanId(value) { return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80); }
function text(value, max) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, max); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value || 0))); }
function slug(value) { return text(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"; }
function bad(message, status = 400) { return Object.assign(new Error(message), { status }); }
