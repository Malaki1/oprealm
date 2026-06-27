const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

let foundation;
let brandFoundation;

const USERS = [
  { id: "owner-1", email: "owner@example.com", display_name: "Owner" },
  { id: "member-1", email: "member@example.com", display_name: "Member" },
  { id: "viewer-1", email: "viewer@example.com", display_name: "Viewer" },
  { id: "client-1", email: "client@example.com", display_name: "Client" },
  { id: "friend-1", email: "friend@example.com", display_name: "Friend" },
  { id: "outsider-1", email: "outsider@example.com", display_name: "Outsider" },
];

test.before(async () => {
  foundation = await import(pathToFileURL(path.resolve("functions/_lib/content-foundation.js")));
  brandFoundation = await import(pathToFileURL(path.resolve("functions/_lib/brand-foundation.js")));
});

function makeHarness() {
  const contentStore = foundation.createMemoryFoundationStore({ users: USERS });
  const contentServices = foundation.createFoundationServices(contentStore);
  const brandStore = brandFoundation.createMemoryBrandStore({ contentStore });
  const brandServices = brandFoundation.createBrandServices(brandStore);
  return {
    contentStore,
    contentServices,
    brandStore,
    brandServices,
    owner: USERS[0],
    member: USERS[1],
    viewer: USERS[2],
    client: USERS[3],
    friend: USERS[4],
    outsider: USERS[5],
  };
}

async function createWorkspaceWithRoles(harness, name = "Brand Workspace") {
  const workspace = await harness.contentServices.createWorkspace(harness.owner, { name });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.member.id, role: "member" });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.viewer.id, role: "viewer" });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.client.id, role: "client" });
  await harness.contentServices.addWorkspaceMember(harness.owner, workspace.id, { userId: harness.friend.id, role: "friend" });
  return workspace;
}

async function createAsset(harness, user, workspaceId, input = {}) {
  return harness.contentServices.createAsset(user, {
    workspaceId,
    assetType: input.assetType || "logo",
    title: input.title || "Logo",
    storageUrl: input.storageUrl || `r2://oprealm/${crypto.randomUUID()}.png`,
    ...input,
  });
}

async function assertRejectStatus(promise, status) {
  await assert.rejects(promise, (error) => error.status === status);
}

test("brands create, list, update, archive, and enforce workspace roles", async () => {
  const h = makeHarness();
  const workspace = await createWorkspaceWithRoles(h);
  const logo = await createAsset(h, h.owner, workspace.id, { assetType: "logo", title: "Primary logo" });

  const brand = await h.brandServices.createBrand(h.owner, {
    workspaceId: workspace.id,
    name: "Brisbane Solar Co",
    website: "https://example.com",
    industry: "Solar",
    productOrService: "Residential solar installs",
    offer: "Free savings assessment",
    primaryCTA: "Book a quote",
    targetAudience: "Home owners in Brisbane",
    toneOfVoice: "Clear and helpful",
    brandJson: {
      painPoints: ["High power bills"],
      visualIdentity: { logoAssetIds: [logo.id], colours: ["#ffcc00"] },
    },
  });

  assert.equal(brand.workspaceId, workspace.id);
  assert.equal(brand.status, "draft");
  assert.equal(brand.website, "https://example.com/");
  assert.deepEqual(brand.brandJson.painPoints, ["High power bills"]);
  assert.deepEqual(brand.brandJson.visualIdentity.logoAssetIds, [logo.id]);

  assert.deepEqual((await h.brandServices.listBrands(h.viewer, { workspaceId: workspace.id })).map((item) => item.id), [brand.id]);
  assert.equal((await h.brandServices.getBrand(h.member, brand.id)).id, brand.id);
  await assertRejectStatus(h.brandServices.getBrand(h.outsider, brand.id), 404);

  const updated = await h.brandServices.updateBrand(h.client, brand.id, {
    status: "active",
    toneOfVoice: "Confident but plainspoken",
  });
  assert.equal(updated.status, "active");
  assert.equal(updated.toneOfVoice, "Confident but plainspoken");

  await assertRejectStatus(h.brandServices.updateBrand(h.viewer, brand.id, { name: "Viewer Edit" }), 403);

  const archived = await h.brandServices.archiveBrand(h.friend, brand.id);
  assert.equal(archived.status, "archived");
  assert.equal((await h.brandServices.listBrands(h.owner, { workspaceId: workspace.id })).length, 0);
  assert.equal((await h.brandServices.listBrands(h.owner, { workspaceId: workspace.id, includeArchived: true })).length, 1);
  await assertRejectStatus(h.brandServices.getBrand(h.owner, brand.id), 404);
});

test("brand sources store manual notes, URLs, and workspace asset links without ingestion work", async () => {
  const h = makeHarness();
  const workspace = await createWorkspaceWithRoles(h, "Source Workspace");
  const otherWorkspace = await h.contentServices.createWorkspace(h.outsider, { name: "Other Workspace" });
  const logo = await createAsset(h, h.owner, workspace.id, { assetType: "logo", title: "Logo file" });
  const productImage = await createAsset(h, h.owner, workspace.id, { assetType: "product_image", title: "Product photo" });
  const foreignAsset = await createAsset(h, h.outsider, otherWorkspace.id, { assetType: "logo", title: "Other logo" });
  const brand = await h.brandServices.createBrand(h.owner, { workspaceId: workspace.id, name: "Source Brand" });

  const note = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "manual_note",
    title: "Founder notes",
    rawText: "We help families reduce power bills.",
    metadata: { origin: "workshop" },
  });
  assert.equal(note.status, "active");
  assert.equal(note.rawText, "We help families reduce power bills.");
  assert.equal(note.metadata.origin, "workshop");

  const page = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "website_page",
    sourceUrl: "https://example.com/about",
    title: "About page",
  });
  assert.equal(page.status, "pending");
  assert.equal(page.sourceUrl, "https://example.com/about");
  assert.equal(page.rawText, null);

  const youtube = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "youtube_url",
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
  });
  assert.equal(youtube.status, "pending");
  assert.equal(youtube.rawText, null);

  const logoSource = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "logo",
    assetId: logo.id,
    title: "Logo source",
  });
  assert.equal(logoSource.assetId, logo.id);

  const productSource = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "product_image",
    assetId: productImage.id,
  });
  assert.equal(productSource.assetId, productImage.id);

  const listed = await h.brandServices.listBrandSources(h.member, brand.id);
  assert.deepEqual(new Set(listed.map((source) => source.sourceType)), new Set(["manual_note", "website_page", "youtube_url", "logo", "product_image"]));

  const archived = await h.brandServices.archiveBrandSource(h.client, brand.id, page.id);
  assert.equal(archived.status, "archived");
  assert.equal((await h.brandServices.listBrandSources(h.owner, brand.id)).some((source) => source.id === page.id), false);
  assert.equal((await h.brandServices.listBrandSources(h.owner, brand.id, { includeArchived: true })).some((source) => source.id === page.id), true);

  await assertRejectStatus(h.brandServices.createBrandSource(h.owner, brand.id, { sourceType: "bad_type", rawText: "x" }), 400);
  await assertRejectStatus(h.brandServices.createBrandSource(h.owner, brand.id, { sourceType: "manual_note", rawText: "x", metadata: "{bad" }), 400);
  await assertRejectStatus(h.brandServices.createBrandSource(h.owner, brand.id, { sourceType: "logo", assetId: foreignAsset.id }), 404);
  await assertRejectStatus(h.brandServices.createBrandSource(h.viewer, brand.id, { sourceType: "manual_note", rawText: "Viewer note" }), 403);
});

test("Brand Brain placeholders update source and visual identity references safely", async () => {
  const h = makeHarness();
  const workspace = await createWorkspaceWithRoles(h, "Brain Workspace");
  const otherWorkspace = await h.contentServices.createWorkspace(h.outsider, { name: "External Workspace" });
  const logo = await createAsset(h, h.owner, workspace.id, { assetType: "logo", title: "Brain logo" });
  const foreignLogo = await createAsset(h, h.outsider, otherWorkspace.id, { assetType: "logo", title: "Foreign logo" });
  const brand = await h.brandServices.createBrand(h.owner, {
    workspaceId: workspace.id,
    name: "Brain Brand",
    offer: "Free audit",
    primaryCTA: "Book now",
    targetAudience: "Local founders",
  });

  const placeholder = await h.brandServices.getOrCreateBrandBrain(h.viewer, brand.id);
  assert.equal(placeholder.brandId, brand.id);
  assert.equal(placeholder.brainJson.offer, "Free audit");
  assert.deepEqual(placeholder.brainJson.sourceIds, []);

  const note = await h.brandServices.createBrandSource(h.owner, brand.id, {
    sourceType: "manual_note",
    rawText: "Customers care about fast setup and trusted support.",
  });
  const updated = await h.brandServices.updateBrandBrain(h.friend, brand.id, {
    summary: "Solar brand for local lead generation.",
    sourceIds: [note.id],
    visualIdentity: { logoAssetIds: [logo.id], imageStyle: "Bright suburban homes" },
    contentNotes: "Keep claims specific.",
  });

  assert.equal(updated.brainJson.summary, "Solar brand for local lead generation.");
  assert.deepEqual(updated.brainJson.sourceIds, [note.id]);
  assert.deepEqual(updated.brainJson.visualIdentity.logoAssetIds, [logo.id]);
  assert.equal(updated.brainJson.visualIdentity.imageStyle, "Bright suburban homes");
  assert.equal(updated.brainJson.contentNotes, "Keep claims specific.");

  const otherBrand = await h.brandServices.createBrand(h.owner, { workspaceId: workspace.id, name: "Second Brand" });
  const otherSource = await h.brandServices.createBrandSource(h.owner, otherBrand.id, {
    sourceType: "manual_note",
    rawText: "Second brand notes.",
  });
  await assertRejectStatus(h.brandServices.updateBrandBrain(h.owner, brand.id, { sourceIds: [otherSource.id] }), 400);
  await assertRejectStatus(h.brandServices.updateBrandBrain(h.owner, brand.id, { visualIdentity: { logoAssetIds: [foreignLogo.id] } }), 404);
  await assertRejectStatus(h.brandServices.updateBrandBrain(h.viewer, brand.id, { summary: "Viewer edit" }), 403);
  await assertRejectStatus(h.brandServices.updateBrandBrain(h.owner, brand.id, { brainJson: "{bad" }), 400);
});

test("client and friend members can write, while cross-workspace access is blocked", async () => {
  const h = makeHarness();
  const workspace = await createWorkspaceWithRoles(h, "Access Workspace");
  const otherWorkspace = await h.contentServices.createWorkspace(h.outsider, { name: "Outsider Workspace" });

  const friendBrand = await h.brandServices.createBrand(h.friend, {
    workspaceId: workspace.id,
    name: "Friend Created Brand",
  });
  assert.equal(friendBrand.createdByUserId, h.friend.id);

  const clientSource = await h.brandServices.createBrandSource(h.client, friendBrand.id, {
    sourceType: "manual_note",
    rawText: "Client-provided proof point.",
  });
  assert.equal(clientSource.createdByUserId, h.client.id);

  const outsiderBrand = await h.brandServices.createBrand(h.outsider, {
    workspaceId: otherWorkspace.id,
    name: "Outsider Brand",
  });

  await assertRejectStatus(h.brandServices.listBrands(h.outsider, { workspaceId: workspace.id }), 404);
  await assertRejectStatus(h.brandServices.getBrand(h.owner, outsiderBrand.id), 404);
  await assertRejectStatus(h.brandServices.updateBrand(h.owner, outsiderBrand.id, { name: "Cross edit" }), 404);
  await assertRejectStatus(h.brandServices.createBrand(h.viewer, { workspaceId: workspace.id, name: "Viewer Brand" }), 403);
});
