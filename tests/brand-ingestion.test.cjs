const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

let foundation;
let brandFoundation;
let brandIngestion;

const USERS = [
  { id: "owner-1", email: "owner@example.com", display_name: "Owner" },
  { id: "member-1", email: "member@example.com", display_name: "Member" },
  { id: "viewer-1", email: "viewer@example.com", display_name: "Viewer" },
  { id: "outsider-1", email: "outsider@example.com", display_name: "Outsider" },
];

test.before(async () => {
  foundation = await import(pathToFileURL(path.resolve("functions/_lib/content-foundation.js")));
  brandFoundation = await import(pathToFileURL(path.resolve("functions/_lib/brand-foundation.js")));
  brandIngestion = await import(pathToFileURL(path.resolve("functions/_lib/brand-ingestion.js")));
});

function makeHarness(fetchImpl = async () => new Response("ok", { headers: { "content-type": "text/plain" } })) {
  const contentStore = foundation.createMemoryFoundationStore({ users: USERS });
  const contentServices = foundation.createFoundationServices(contentStore);
  const brandStore = brandIngestion.createMemoryBrandIngestionStore({ contentStore });
  const brandServices = brandFoundation.createBrandServices(brandStore);
  const ingestionServices = brandIngestion.createBrandIngestionServices(brandStore, { fetchImpl });
  return {
    contentStore,
    contentServices,
    brandStore,
    brandServices,
    ingestionServices,
    owner: USERS[0],
    member: USERS[1],
    viewer: USERS[2],
    outsider: USERS[3],
  };
}

async function createWorkspaceWithRoles(harness, name = "Ingestion Workspace") {
  const workspace = await harness.contentServices.createWorkspace(harness.owner, { name });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.member.id, role: "member" });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.viewer.id, role: "viewer" });
  return workspace;
}

async function createBrandAndUrlSource(harness, url = "https://example.com/") {
  const workspace = await createWorkspaceWithRoles(harness);
  const brand = await harness.brandServices.createBrand(harness.owner, {
    workspaceId: workspace.id,
    name: "Example Business",
  });
  const source = await harness.brandServices.createBrandSource(harness.owner, brand.id, {
    sourceType: "website_page",
    sourceUrl: url,
    title: "Website",
  });
  return { workspace, brand, source };
}

async function assertRejectStatus(promise, status) {
  await assert.rejects(promise, (error) => error.status === status);
}

test("ingests a valid HTML source, extracts readable text, metadata, links, and records a succeeded attempt", async () => {
  const fetchCalls = [];
  const html = `<!doctype html>
    <html>
      <head>
        <title>Example Business</title>
        <meta name="description" content="Trusted solar installs in Brisbane.">
        <link rel="canonical" href="https://example.com/about">
        <script>window.secret = "do not store";</script>
      </head>
      <body>
        <h1>Brisbane solar installs</h1>
        <h2>Lower power bills</h2>
        <p>We install residential solar for families who want reliable savings.</p>
        <a href="/contact">Contact us</a>
        <a href="https://partner.example.net/proof">Partner proof</a>
      </body>
    </html>`;
  const h = makeHarness(async (url, init) => {
    fetchCalls.push({ url, init });
    if (url === "https://example.com/") {
      return new Response("", { status: 301, headers: { location: "https://example.com/about" } });
    }
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  });
  const { brand, source } = await createBrandAndUrlSource(h);

  const result = await h.ingestionServices.ingestBrandSource(h.owner, brand.id, source.id);

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[0].init.headers["user-agent"], "OPREALM-BrandIngestion/1.0");
  assert.equal(result.source.status, "active");
  assert.equal(result.source.title, "Example Business");
  assert.match(result.source.rawText, /Brisbane solar installs/);
  assert.match(result.source.rawText, /reliable savings/);
  assert.doesNotMatch(result.source.rawText, /do not store/);
  assert.equal(result.source.metadata.finalUrl, "https://example.com/about");
  assert.equal(result.source.metadata.httpStatus, 200);
  assert.equal(result.source.metadata.metaDescription, "Trusted solar installs in Brisbane.");
  assert.equal(result.source.metadata.canonicalUrl, "https://example.com/about");
  assert.deepEqual(result.source.metadata.headings.map((item) => item.text), ["Brisbane solar installs", "Lower power bills"]);
  assert.ok(result.source.metadata.links.includes("https://example.com/contact"));
  assert.ok(result.source.metadata.externalLinks.includes("https://partner.example.net/proof"));
  assert.equal(result.attempt.status, "succeeded");
  assert.equal(result.attempt.httpStatus, 200);
  assert.equal(result.attempt.title, "Example Business");

  const attempts = await h.ingestionServices.listBrandIngestionAttempts(h.member, brand.id, source.id);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "succeeded");
});

test("re-ingestion creates another attempt and updates stored source text", async () => {
  let version = 0;
  const h = makeHarness(async () => {
    version += 1;
    return new Response(`<html><head><title>Version ${version}</title></head><body><h1>Version ${version}</h1><p>Body ${version}</p></body></html>`, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  });
  const { brand, source } = await createBrandAndUrlSource(h);

  await h.ingestionServices.ingestBrandSource(h.owner, brand.id, source.id);
  const result = await h.ingestionServices.reingestBrandSource(h.owner, brand.id, source.id);
  const attempts = await h.ingestionServices.listBrandIngestionAttempts(h.owner, brand.id, source.id);

  assert.equal(result.source.status, "active");
  assert.equal(result.source.title, "Version 2");
  assert.match(result.source.rawText, /Body 2/);
  assert.equal(attempts.length, 2);
  assert.equal(attempts.filter((attempt) => attempt.status === "succeeded").length, 2);
});

test("rejects unsafe and unsupported ingestion URLs", () => {
  assert.throws(() => brandIngestion.validateIngestionUrl("file:///etc/passwd"), (error) => error.status === 400 && error.code === "unsupported_url_protocol");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://localhost:8788"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://127.0.0.1"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://10.0.0.1"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://172.16.5.10"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://192.168.1.1"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://169.254.169.254"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
  assert.throws(() => brandIngestion.validateIngestionUrl("http://metadata.google.internal"), (error) => error.status === 400 && error.code === "unsafe_ingestion_target");
});

test("failed ingestion marks the source and attempt failed without losing the source record", async () => {
  const h = makeHarness(async () => new Response("pdf", {
    status: 200,
    headers: { "content-type": "application/pdf" },
  }));
  const { brand, source } = await createBrandAndUrlSource(h);

  await assertRejectStatus(h.ingestionServices.ingestBrandSource(h.owner, brand.id, source.id), 415);

  const storedSource = await h.brandServices.getBrandSource(h.owner, brand.id, source.id);
  const attempts = await h.ingestionServices.listBrandIngestionAttempts(h.owner, brand.id, source.id);
  assert.equal(storedSource.status, "failed");
  assert.equal(storedSource.metadata.lastIngestionError.code, "unsupported_content_type");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "failed");
  assert.match(attempts[0].errorMessage, /unsupported_content_type/);
});

test("invalid source URLs are recorded as failed attempts after access checks", async () => {
  const h = makeHarness();
  const { brand, source } = await createBrandAndUrlSource(h, "http://localhost/private");

  await assertRejectStatus(h.ingestionServices.ingestBrandSource(h.owner, brand.id, source.id), 400);

  const storedSource = await h.brandServices.getBrandSource(h.owner, brand.id, source.id);
  const attempts = await h.ingestionServices.listBrandIngestionAttempts(h.owner, brand.id, source.id);
  assert.equal(storedSource.status, "failed");
  assert.equal(storedSource.metadata.lastIngestionError.code, "unsafe_ingestion_target");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "failed");
});

test("brand ingestion preserves workspace access controls", async () => {
  const h = makeHarness(async () => new Response("<html><body>ok</body></html>", { headers: { "content-type": "text/html" } }));
  const { workspace, brand, source } = await createBrandAndUrlSource(h);
  const otherBrand = await h.brandServices.createBrand(h.owner, {
    workspaceId: workspace.id,
    name: "Other Brand",
  });

  await assertRejectStatus(h.ingestionServices.ingestBrandSource(h.viewer, brand.id, source.id), 403);
  await assertRejectStatus(h.ingestionServices.ingestBrandSource(h.outsider, brand.id, source.id), 404);
  await assertRejectStatus(h.ingestionServices.ingestBrandSource(h.owner, otherBrand.id, source.id), 404);
  await assertRejectStatus(h.ingestionServices.listBrandIngestionAttempts(h.outsider, brand.id, source.id), 404);
});
