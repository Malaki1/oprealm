const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

let forge;
let zip;

test.before(async () => {
  forge = await import(pathToFileURL(path.resolve("functions/_lib/asset-forge.mjs")));
  zip = await import(pathToFileURL(path.resolve("functions/_lib/simple-zip.mjs")));
});

test("creates and analyses a universal mockup project", () => {
  const project = forge.createForgeProject({ ownerId: "user-1", name: "Fintech Dashboard" });
  const analysed = forge.analyseForgeProject(project, { width: 1440, height: 960, fileName: "dashboard.png" });
  assert.equal(analysed.status, "analysed");
  assert.ok(analysed.styleAnalysis.styleName);
  assert.ok(analysed.designSystem.colors.length >= 6);
  assert.ok(analysed.assets.length >= 20);
});

test("asset plans include smart sizing, formats and prompt safeguards", () => {
  const project = forge.analyseForgeProject(forge.createForgeProject({ name: "Fantasy Game UI" }), { width: 1600, height: 1000 });
  const icon = project.assets.find((asset) => asset.category === "icons");
  assert.equal(icon.exportFormat, "svg");
  assert.ok(icon.sizing.exportWidth > icon.sizing.displayWidth);
  assert.match(icon.prompt, /reusable production-quality/i);
  assert.match(icon.negativePrompt, /watermark/i);
});

test("vision asset bounds are preserved and clamped to the mockup", () => {
  const project = forge.analyseForgeProject(forge.createForgeProject({ name: "Mapped UI" }), {
    width: 1000,
    height: 500,
    detectedAssets: [
      { name: "Profile Avatar", category: "avatars", sourceRegion: { x: 90, y: 4, width: 8, height: 16, unit: "percent", confidence: 0.97 } },
      { name: "Edge Icon", category: "icons", sourceRegion: { x: 98, y: 96, width: 10, height: 12, unit: "percent" } },
    ],
  });
  assert.deepEqual(
    project.regions.map(({ x, y, width, height }) => ({ x, y, width, height })),
    [{ x: 908, y: 38, width: 65, height: 45 }, { x: 935, y: 455, width: 65, height: 45 }],
  );
  assert.equal(project.regions[0].assetId, project.assets[0].id);
});

test("quality scoring and optimization produce production records", () => {
  const project = forge.analyseForgeProject(forge.createForgeProject({ name: "Mobile App" }), {});
  const asset = project.assets[0];
  const quality = forge.scoreAssetQuality(asset, { byteLength: 2048 });
  assert.ok(quality.overallScore >= 78 && quality.overallScore <= 100);
  const optimized = forge.optimizeAssetRecord({ ...asset, outputUrl: "/asset.png" });
  assert.equal(optimized.status, "optimized");
  assert.equal(optimized.optimized.retina, "/asset.png");
});

test("export manifest contains rulebooks, prompts and approved files", () => {
  const project = forge.analyseForgeProject(forge.createForgeProject({ name: "SaaS UI" }), {});
  project.assets[0].status = "approved";
  project.assets[0].outputUrl = "/asset.svg";
  const manifest = forge.buildExportManifest(project);
  assert.equal(manifest.files.length, 1);
  assert.equal(manifest.prompts.length, 1);
  assert.ok(manifest.designSystem.colors.length);
});

test("stored ZIP writer creates a valid ZIP container", () => {
  const bytes = zip.createStoredZip([{ name: "manifest.json", data: "{\"ok\":true}" }, { name: "README.txt", data: "Asset Forge" }]);
  assert.equal(Buffer.from(bytes.subarray(0, 4)).toString("hex"), "504b0304");
  assert.ok(Buffer.from(bytes).includes(Buffer.from("manifest.json")));
  assert.ok(Buffer.from(bytes).includes(Buffer.from("README.txt")));
});

test("Asset Forge batches every selected asset through the background queue", () => {
  const ui = fs.readFileSync(path.resolve("public/asset-forge.js"), "utf8");
  const api = fs.readFileSync(path.resolve("functions/api/asset-forge.js"), "utf8");
  const worker = fs.readFileSync(path.resolve("workers/image-queue/src/index.js"), "utf8");
  assert.match(ui, /action:"generate_batch"/);
  assert.doesNotMatch(ui, /generateBatch\([^)]*slice\(0,\s*[68]\)/);
  assert.match(api, /processQueuedAssetForgeBatch/);
  assert.match(worker, /asset_forge_batch/);
});
