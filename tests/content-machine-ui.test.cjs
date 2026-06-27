const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("Content Machine UI shell exposes the Phase 3 private dashboard", () => {
  const html = read("public/content-machine.html");
  const css = read("public/content-machine.css");

  assert.match(html, /OPREALM Content Machine/);
  assert.match(html, /Brand Brain/);
  assert.match(html, /Creative source library/);
  assert.match(html, /Upload brand evidence/);
  assert.match(html, /brandAssetFiles/);
  assert.match(html, /Save Existing Brand/);
  assert.match(html, /Deploy Readiness/);
  assert.match(html, /Campaign Engine/);
  assert.match(html, /Coming soon/);
  assert.match(css, /\.cm-card/);
  assert.match(css, /\.cm-upload-preview/);
  assert.match(css, /@media \(max-width: 820px\)/);
});

test("Content Machine UI calls real foundation APIs instead of fake persistence", () => {
  const js = read("public/content-machine.js");
  const requiredEndpoints = [
    "/api/workspaces",
    "/api/billing/wallet",
    "/api/billing/token-packs",
    "/api/billing/token-topup",
    "/api/brands",
    "/api/assets",
  ];

  for (const endpoint of requiredEndpoints) {
    assert.match(js, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(js, /fetch\(path, request\)/);
  assert.match(js, /uploadBrandAssets/);
  assert.match(js, /attachBrandEvidenceSources/);
  assert.match(js, /fileToDataUrl/);
  assert.match(js, /throw error/);
  assert.doesNotMatch(js, /localStorage\.setItem\([^)]*brand.*JSON/i);
});

test("Brand asset uploads are stored privately and served through authenticated asset files", () => {
  const assetsApi = read("functions/api/assets.js");
  const assetFileApi = read("functions/api/assets/[assetId]/file.js");

  assert.match(assetsApi, /dataUrl/);
  assert.match(assetsApi, /OPREALM_ASSETS\.put/);
  assert.match(assetsApi, /content-machine/);
  assert.match(assetsApi, /content-machine-brand-upload/);
  assert.match(assetsApi, /\/api\/assets\/\$\{encodeURIComponent\(asset\.id\)\}\/file/);
  assert.match(assetFileApi, /services\.getAsset\(user, params\.assetId\)/);
  assert.match(assetFileApi, /OPREALM_ASSETS\.get/);
});

test("Brands entry point and account routes use the Content Machine shell", () => {
  const brandsHtml = read("public/brands.html");
  const account = read("public/account.html");

  assert.match(brandsHtml, /content-machine#brands/);
  assert.match(account, /\/content-machine/);
});
