const cmState = {
  user: null,
  workspaces: [],
  selectedWorkspaceId: localStorage.getItem("oprealm_content_workspace") || "",
  wallet: null,
  tokenPacks: [],
  transactions: [],
  brands: [],
  assets: [],
  sourcesByBrand: new Map(),
  selectedBrandId: localStorage.getItem("oprealm_content_brand") || "",
  selectedBrand: null,
  brain: null,
  sources: [],
  section: location.hash?.replace("#", "") || "dashboard",
};

const sourceTypes = [
  ["manual_note", "Manual note"],
  ["website_page", "Website URL record"],
  ["uploaded_document", "Uploaded document"],
  ["source_video", "Source video"],
  ["product_image", "Product image"],
  ["logo", "Logo"],
  ["testimonial", "Testimonial"],
  ["faq", "FAQ"],
  ["existing_ad", "Existing ad"],
  ["competitor_reference", "Competitor reference"],
  ["youtube_url", "YouTube URL record"],
  ["social_profile", "Social profile"],
  ["other", "Other"],
];

const readinessItems = [
  ["Workspace selected", () => Boolean(cmState.selectedWorkspaceId)],
  ["Token wallet visible", () => Boolean(cmState.wallet)],
  ["Brand foundation records available", () => cmState.brands.length > 0],
  ["Brand Brain placeholder editable", () => Boolean(cmState.brain)],
  ["Source library ready", () => cmState.sources.length > 0],
  ["Website source ingestion ready", () => true],
  ["Campaign Engine locked", () => true],
  ["Agency QA locked", () => true],
  ["AI Brand Brain extraction locked", () => true],
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  bindUi();
  renderSourceTypeOptions();
  loadAll();
});

function bindUi() {
  $$("#workspaceSelect").forEach((select) => select.addEventListener("change", async () => {
    cmState.selectedWorkspaceId = select.value;
    localStorage.setItem("oprealm_content_workspace", cmState.selectedWorkspaceId);
    cmState.selectedBrandId = "";
    localStorage.removeItem("oprealm_content_brand");
    await loadWorkspaceData();
    renderAll();
  }));

  $("#workspaceForm")?.addEventListener("submit", createWorkspace);
  $("#brandForm")?.addEventListener("submit", createBrand);
  $("#brandUpdateForm")?.addEventListener("submit", updateBrand);
  $("#brainForm")?.addEventListener("submit", updateBrain);
  $("#sourceForm")?.addEventListener("submit", createSource);
  $("#brandAssetFiles")?.addEventListener("change", renderBrandUploadPreview);
  $("#brandSearch")?.addEventListener("input", renderBrands);
  $("#brandStatusFilter")?.addEventListener("change", async () => {
    await loadWorkspaceData();
    renderAll();
  });

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-scroll-target], [data-brand-id], [data-ingest-source], [data-archive-source], [data-token-pack], [data-cm-nav]");
    if (!target) return;
    if (target.dataset.scrollTarget) {
      event.preventDefault();
      document.getElementById(target.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (target.dataset.brandId) {
      event.preventDefault();
      await selectBrand(target.dataset.brandId);
    }
    if (target.dataset.archiveSource) {
      event.preventDefault();
      await archiveSource(target.dataset.archiveSource);
    }
    if (target.dataset.ingestSource) {
      event.preventDefault();
      await ingestSource(target.dataset.ingestSource);
    }
    if (target.dataset.tokenPack) {
      event.preventDefault();
      await startTokenTopup(target.dataset.tokenPack);
    }
    if (target.dataset.cmNav) {
      cmState.section = target.dataset.cmNav;
      renderNavigation();
    }
  });

  window.addEventListener("hashchange", () => {
    cmState.section = location.hash?.replace("#", "") || "dashboard";
    renderNavigation();
  });
}

async function loadAll() {
  setStatus("Loading workspace, wallet and brand foundation...", "info");
  try {
    const account = await api("/api/account", { allowAnonymous: true });
    cmState.user = account.authenticated ? account.user : null;
    if (!cmState.user) {
      renderUnauthenticated();
      setStatus("Log in to access the private Content Machine workspace.", "error");
      return;
    }

    const [workspaces, wallet, tokenPacks, transactions] = await Promise.all([
      api("/api/workspaces"),
      api("/api/billing/wallet"),
      api("/api/billing/token-packs"),
      api("/api/billing/transactions?limit=8"),
    ]);
    cmState.workspaces = workspaces.workspaces || [];
    cmState.wallet = wallet.wallet || null;
    cmState.tokenPacks = tokenPacks.tokenPacks || [];
    cmState.transactions = transactions.transactions || [];

    if (!cmState.workspaces.some((workspace) => workspace.id === cmState.selectedWorkspaceId)) {
      cmState.selectedWorkspaceId = cmState.workspaces[0]?.id || "";
    }
    if (cmState.selectedWorkspaceId) {
      localStorage.setItem("oprealm_content_workspace", cmState.selectedWorkspaceId);
      await loadWorkspaceData();
    }
    renderAll();
    setStatus("Content Machine foundation loaded.", "success");
  } catch (error) {
    if (error.status === 401) renderUnauthenticated();
    setStatus(error.message || "Content Machine could not load.", "error");
  }
}

async function loadWorkspaceData() {
  cmState.brands = [];
  cmState.assets = [];
  cmState.sourcesByBrand = new Map();
  cmState.selectedBrand = null;
  cmState.brain = null;
  cmState.sources = [];

  if (!cmState.selectedWorkspaceId) return;

  const status = $("#brandStatusFilter")?.value || "";
  const query = new URLSearchParams({ workspaceId: cmState.selectedWorkspaceId });
  if (status) query.set("status", status);
  if (status === "archived") query.set("includeArchived", "true");

  const [brandResult, assetResult] = await Promise.all([
    api(`/api/brands?${query.toString()}`),
    api(`/api/assets?workspaceId=${encodeURIComponent(cmState.selectedWorkspaceId)}`).catch(() => ({ assets: [] })),
  ]);
  cmState.brands = brandResult.brands || [];
  cmState.assets = assetResult.assets || [];

  await loadSourceCounts();

  if (!cmState.brands.some((brand) => brand.id === cmState.selectedBrandId)) {
    cmState.selectedBrandId = cmState.brands[0]?.id || "";
  }
  if (cmState.selectedBrandId) await loadBrandDetail(cmState.selectedBrandId);
}

async function loadSourceCounts() {
  await Promise.all(cmState.brands.map(async (brand) => {
    try {
      const result = await api(`/api/brands/${encodeURIComponent(brand.id)}/sources?includeArchived=true`);
      cmState.sourcesByBrand.set(brand.id, result.sources || []);
    } catch {
      cmState.sourcesByBrand.set(brand.id, []);
    }
  }));
}

async function loadBrandDetail(brandId) {
  const brand = cmState.brands.find((item) => item.id === brandId);
  if (!brand) return;
  const [brain, sources] = await Promise.all([
    api(`/api/brands/${encodeURIComponent(brand.id)}/brain`),
    api(`/api/brands/${encodeURIComponent(brand.id)}/sources?includeArchived=true`),
  ]);
  cmState.selectedBrandId = brand.id;
  cmState.selectedBrand = brand;
  cmState.brain = brain.brain || null;
  cmState.sources = sources.sources || [];
  cmState.sourcesByBrand.set(brand.id, cmState.sources);
  localStorage.setItem("oprealm_content_brand", brand.id);
}

async function api(path, options = {}) {
  const request = {
    method: options.method || "GET",
    headers: { accept: "application/json", ...(options.headers || {}) },
    cache: "no-store",
  };
  if (options.body) {
    request.headers["content-type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, request);
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Request failed: ${path}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function renderUnauthenticated() {
  $("#authCard").hidden = false;
  $$("[data-cm-section]").forEach((section) => {
    section.toggleAttribute("hidden", section.id !== "dashboard");
  });
  renderNavigation();
}

function renderAll() {
  $("#authCard").hidden = Boolean(cmState.user);
  renderNavigation();
  renderWorkspace();
  renderDashboard();
  renderBrands();
  renderBrandDetail();
  renderBilling();
  renderAssets();
}

function renderNavigation() {
  const section = cmState.section || "dashboard";
  $$("[data-cm-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.cmNav === section);
  });
}

function renderWorkspace() {
  const workspace = selectedWorkspace();
  const select = $("#workspaceSelect");
  if (select) {
    select.innerHTML = cmState.workspaces.length
      ? cmState.workspaces.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} (${escapeHtml(item.role || item.type || "member")})</option>`).join("")
      : '<option value="">No workspace yet</option>';
    select.value = cmState.selectedWorkspaceId || "";
  }
  $("#workspaceName").textContent = workspace?.name || "No workspace";
  $("#workspaceMeta").textContent = workspace ? `${workspace.type || "business"} workspace - role ${workspace.role || "member"}` : "Create a workspace to start.";
  $("#workspaceCreateCard").hidden = cmState.workspaces.length > 0;
}

function renderDashboard() {
  const activeBrands = cmState.brands.filter((brand) => brand.status !== "archived");
  const sourceCount = [...cmState.sourcesByBrand.values()].reduce((sum, list) => sum + list.filter((source) => source.status !== "archived").length, 0);
  $("#walletBalance").textContent = formatNumber(cmState.wallet?.balance);
  $("#reservedBalance").textContent = formatNumber(cmState.wallet?.reservedBalance);
  $("#activeBrandCount").textContent = formatNumber(activeBrands.length);
  $("#sourceRecordCount").textContent = formatNumber(sourceCount);

  const latest = [...cmState.brands]
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 5);
  $("#latestBrandList").innerHTML = latest.length
    ? latest.map((brand) => rowHtml(brand.name, `${brand.status} - updated ${formatDate(brand.updatedAt)}`, `<button class="cm-button cm-button-secondary" data-brand-id="${escapeHtml(brand.id)}">Open</button>`)).join("")
    : emptyHtml("No brand updates yet.", "Create your first brand to begin the Content Machine setup.");

  $("#readinessList").innerHTML = readinessItems.map(([label, test]) => `
    <div class="cm-check-row">
      <span class="cm-check-dot">${test() ? "✓" : "!"}</span>
      <div><strong>${escapeHtml(label)}</strong><span>${test() ? "Ready" : "Needs setup"}</span></div>
    </div>
  `).join("");
}

function renderBrands() {
  const search = ($("#brandSearch")?.value || "").trim().toLowerCase();
  const brands = cmState.brands.filter((brand) => {
    const haystack = [brand.name, brand.website, brand.industry, brand.productOrService, brand.offer, brand.primaryCTA].join(" ").toLowerCase();
    return !search || haystack.includes(search);
  });
  $("#brandGrid").innerHTML = brands.length
    ? brands.map((brand) => brandCardHtml(brand)).join("")
    : `<div class="cm-empty-state"><h3>Add your first existing brand to start building the Content Machine</h3><p>Upload logos, images and source links so later campaign strategy and QA starts from approved evidence.</p></div>`;
}

function brandCardHtml(brand) {
  const sources = cmState.sourcesByBrand.get(brand.id) || [];
  const selected = brand.id === cmState.selectedBrandId ? " is-active" : "";
  return `
    <button class="cm-brand-card${selected}" type="button" data-brand-id="${escapeHtml(brand.id)}">
      <div class="cm-brand-meta">
        <span class="cm-pill">${escapeHtml(brand.status || "draft")}</span>
        <span class="cm-pill">${sources.filter((source) => source.status !== "archived").length} sources</span>
      </div>
      <div>
        <h3>${escapeHtml(brand.name)}</h3>
        <p>${escapeHtml(brand.website || "No website yet")}</p>
      </div>
      <p><strong>Industry:</strong> ${escapeHtml(brand.industry || "Not set")}</p>
      <p><strong>Product/service:</strong> ${escapeHtml(brand.productOrService || "Not set")}</p>
      <p><strong>Offer:</strong> ${escapeHtml(brand.offer || "Not set")}</p>
      <p><strong>Primary CTA:</strong> ${escapeHtml(brand.primaryCTA || "Not set")}</p>
      <span>Updated ${formatDate(brand.updatedAt)}</span>
    </button>
  `;
}

function renderBrandDetail() {
  const hasBrand = Boolean(cmState.selectedBrand);
  $("#brandDetailEmpty").hidden = hasBrand;
  $("#brandDetailPanel").hidden = !hasBrand;
  if (!hasBrand) {
    $("#detailHeading").textContent = "Select a brand";
    $("#detailSubheading").textContent = "Choose a brand to edit overview fields, Brand Brain and creative sources.";
    $("#detailStatusPill").textContent = "No brand selected";
    return;
  }

  const brand = cmState.selectedBrand;
  const brain = cmState.brain?.brainJson || {};
  $("#detailHeading").textContent = brand.name;
  $("#detailSubheading").textContent = `${brand.industry || "Industry not set"} - ${brand.website || "No website"}`;
  $("#detailStatusPill").textContent = brand.status || "draft";
  $("#brainCompleteness").textContent = `Brain ${brainCompleteness(brain)}%`;

  fillForm($("#brandUpdateForm"), brand);
  const brainFields = {
    ...brain,
    colours: brain.visualIdentity?.colours || [],
    fonts: brain.visualIdentity?.fonts || [],
    logoAssetIds: brain.visualIdentity?.logoAssetIds || [],
    imageStyle: brain.visualIdentity?.imageStyle || "",
    videoStyle: brain.visualIdentity?.videoStyle || "",
  };
  fillForm($("#brainForm"), brainFields);
  renderSourceList();
  renderAssetOptions();
}

function renderSourceList() {
  $("#sourceList").innerHTML = cmState.sources.length
    ? cmState.sources.map((source) => `
      <article class="cm-source-card cm-source-card-${escapeHtml(source.status || "pending")}">
        <header>
          <div>
            <strong>${escapeHtml(source.title || labelForSource(source.sourceType))}</strong>
            <span>${escapeHtml(labelForSource(source.sourceType))} - ${escapeHtml(source.status)}</span>
          </div>
          <span class="cm-pill cm-source-status">${escapeHtml(source.status)}</span>
        </header>
        ${source.sourceUrl ? `<code>${escapeHtml(source.sourceUrl)}</code>` : ""}
        ${source.assetId ? `<code>Asset: ${escapeHtml(source.assetId)}</code>` : ""}
        ${sourcePreviewHtml(source)}
        ${sourceMetadataHtml(source)}
        <footer>
          <span>${source.lastIngestedAt ? `Last ingested ${formatDateTime(source.lastIngestedAt)}` : `Created ${formatDate(source.createdAt)}`}</span>
          <div class="cm-row-actions">
            ${source.sourceUrl && source.status !== "archived" ? `<button class="cm-button cm-button-secondary" type="button" data-ingest-source="${escapeHtml(source.id)}" ${source.status === "ingesting" ? "disabled" : ""}>${source.status === "active" ? "Re-ingest" : "Ingest source"}</button>` : ""}
            ${source.status !== "archived" ? `<button class="cm-button cm-button-danger" type="button" data-archive-source="${escapeHtml(source.id)}">Archive</button>` : ""}
          </div>
        </footer>
      </article>
    `).join("")
    : emptyHtml("No source records yet.", "Upload brand files, add URLs, or attach same-workspace assets. Website URLs can be ingested when you are ready.");
}

function renderAssets() {
  const list = $("#assetList");
  if (!list) return;
  list.innerHTML = cmState.assets.length
    ? cmState.assets.map((asset) => rowHtml(
      asset.title,
      `${asset.assetType} - ${asset.visibility}`,
      `<div class="cm-row-actions"><code>${escapeHtml(asset.id)}</code>${asset.thumbnailUrl ? `<a class="cm-button cm-button-secondary" href="${escapeHtml(asset.thumbnailUrl)}" target="_blank" rel="noreferrer">Preview</a>` : ""}</div>`,
    )).join("")
    : emptyHtml("No brand assets in this workspace yet.", "Upload logos or product images while adding an existing brand.");
  renderAssetOptions();
}

function renderAssetOptions() {
  const select = $("#sourceAssetSelect");
  if (!select) return;
  select.innerHTML = '<option value="">No asset link</option>' + cmState.assets
    .filter((asset) => asset.visibility !== "archived")
    .map((asset) => `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.title)} - ${escapeHtml(asset.assetType)}</option>`)
    .join("");
}

function renderBilling() {
  $("#walletAvailable").textContent = formatNumber(cmState.wallet?.balance);
  $("#walletReserved").textContent = formatNumber(cmState.wallet?.reservedBalance);
  $("#walletPurchased").textContent = formatNumber(cmState.wallet?.lifetimePurchased);
  $("#walletSpent").textContent = formatNumber(cmState.wallet?.lifetimeSpent);
  $("#tokenPackList").innerHTML = cmState.tokenPacks.length
    ? cmState.tokenPacks.map((pack) => `
      <article class="cm-pack-card">
        <span>${escapeHtml(pack.name)}</span>
        <strong>${formatNumber(pack.tokens)} tokens</strong>
        <p>${formatMoney(pack.priceCents, pack.currency)} - internal OPREALM credits.</p>
        <button class="cm-button cm-button-primary" type="button" data-token-pack="${escapeHtml(pack.id)}">Top Up</button>
      </article>
    `).join("")
    : emptyHtml("No active token packs.", "Ask an OPREALM admin to confirm token pack setup.");
  $("#transactionList").innerHTML = cmState.transactions.length
    ? cmState.transactions.map((transaction) => rowHtml(transaction.type, `${formatNumber(transaction.amount)} tokens - ${formatDate(transaction.createdAt)}`, `<span>${formatNumber(transaction.balanceAfter)} balance</span>`)).join("")
    : emptyHtml("No token transactions yet.", "Purchases, grants, reservations and refunds appear here.");
}

function renderSourceTypeOptions() {
  const select = $("#sourceTypeSelect");
  if (!select) return;
  select.innerHTML = sourceTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function sourcePreviewHtml(source) {
  if (source.rawText) {
    return `<p class="cm-source-preview">${escapeHtml(source.rawText.slice(0, 520))}${source.rawText.length > 520 ? "..." : ""}</p>`;
  }
  if (source.status === "failed") return `<p class="cm-source-preview">This source failed to ingest. Check the error details below, then adjust the URL or try again.</p>`;
  if (source.status === "ingesting") return `<p class="cm-source-preview">Reading this source now...</p>`;
  if (source.sourceUrl) return `<p class="cm-source-preview">URL saved. Ingest it to store readable text and metadata for later Brand Brain extraction.</p>`;
  return "";
}

function sourceMetadataHtml(source) {
  const metadata = source.metadata || {};
  const error = metadata.lastIngestionError;
  const headings = Array.isArray(metadata.headings) ? metadata.headings.slice(0, 3).map((item) => item.text || item).filter(Boolean) : [];
  const pieces = [
    metadata.httpStatus ? `HTTP ${metadata.httpStatus}` : "",
    metadata.contentType || "",
    metadata.fetchDurationMs ? `${metadata.fetchDurationMs} ms` : "",
    metadata.finalUrl && metadata.finalUrl !== source.sourceUrl ? `Final: ${metadata.finalUrl}` : "",
    metadata.canonicalUrl ? `Canonical: ${metadata.canonicalUrl}` : "",
  ].filter(Boolean);
  return `
    <div class="cm-source-metadata">
      ${metadata.title ? `<span>Title: ${escapeHtml(metadata.title)}</span>` : ""}
      ${metadata.metaDescription ? `<span>Description: ${escapeHtml(metadata.metaDescription)}</span>` : ""}
      ${headings.length ? `<span>Headings: ${escapeHtml(headings.join(" | "))}</span>` : ""}
      ${pieces.length ? `<span>${escapeHtml(pieces.join(" | "))}</span>` : ""}
      ${error ? `<span class="cm-source-error">Error: ${escapeHtml(error.message || "Ingestion failed.")}</span>` : ""}
    </div>
  `;
}

async function createWorkspace(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await submitAction("Creating workspace...", async () => {
    const data = formDataObject(form);
    const result = await api("/api/workspaces", { method: "POST", body: data });
    cmState.selectedWorkspaceId = result.workspace.id;
    localStorage.setItem("oprealm_content_workspace", cmState.selectedWorkspaceId);
    form.reset();
    await loadAll();
    return "Workspace created.";
  });
}

async function createBrand(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!cmState.selectedWorkspaceId) return setStatus("Create or select a workspace before creating a brand.", "error");
  await submitAction("Saving existing brand evidence...", async () => {
    const data = brandFormPayload(form);
    const raw = formDataObject(form);
    const files = selectedBrandFiles(form);
    const sourceUrls = splitList(raw.sourceUrls);
    const result = await api("/api/brands", { method: "POST", body: { workspaceId: cmState.selectedWorkspaceId, ...data } });
    const uploadedAssets = await uploadBrandAssets(result.brand, files, raw.assetUploadType);
    const sourceCount = await attachBrandEvidenceSources(result.brand, uploadedAssets, sourceUrls);
    await updateBrandBrainLogos(result.brand, uploadedAssets, splitList(raw.logoAssetIds));
    cmState.selectedBrandId = result.brand.id;
    localStorage.setItem("oprealm_content_brand", result.brand.id);
    form.reset();
    renderBrandUploadPreview();
    await loadWorkspaceData();
    renderAll();
    return `Brand saved with ${uploadedAssets.length} uploaded asset${uploadedAssets.length === 1 ? "" : "s"} and ${sourceCount} source record${sourceCount === 1 ? "" : "s"}.`;
  });
}

async function updateBrand(event) {
  event.preventDefault();
  if (!cmState.selectedBrand) return;
  await submitAction("Saving brand overview...", async () => {
    const payload = formDataObject(event.currentTarget);
    await api(`/api/brands/${encodeURIComponent(cmState.selectedBrand.id)}`, { method: "PATCH", body: payload });
    await loadWorkspaceData();
    renderAll();
    return "Brand overview saved.";
  });
}

async function updateBrain(event) {
  event.preventDefault();
  if (!cmState.selectedBrand) return;
  await submitAction("Saving Brand Brain...", async () => {
    const data = formDataObject(event.currentTarget);
    const payload = {
      summary: data.summary,
      offer: data.offer,
      primaryCTA: data.primaryCTA,
      audience: data.audience,
      painPoints: splitList(data.painPoints),
      objections: splitList(data.objections),
      desiredOutcomes: splitList(data.desiredOutcomes),
      proofPoints: splitList(data.proofPoints),
      testimonials: splitList(data.testimonials),
      faqs: splitList(data.faqs),
      toneOfVoice: data.toneOfVoice,
      brandWords: splitList(data.brandWords),
      avoidWords: splitList(data.avoidWords),
      visualIdentity: {
        colours: splitList(data.colours),
        fonts: splitList(data.fonts),
        logoAssetIds: splitList(data.logoAssetIds),
        imageStyle: data.imageStyle,
        videoStyle: data.videoStyle,
      },
      sourceIds: splitList(data.sourceIds),
      contentNotes: data.contentNotes,
      agencyNotes: data.agencyNotes,
    };
    await api(`/api/brands/${encodeURIComponent(cmState.selectedBrand.id)}/brain`, { method: "PUT", body: payload });
    await loadBrandDetail(cmState.selectedBrand.id);
    renderAll();
    return "Brand Brain saved.";
  });
}

async function createSource(event) {
  event.preventDefault();
  if (!cmState.selectedBrand) return;
  await submitAction("Adding source record...", async () => {
    const data = formDataObject(event.currentTarget);
    let metadata = {};
    if (data.metadata) {
      try {
        metadata = JSON.parse(data.metadata);
      } catch {
        throw new Error("Metadata must be valid JSON.");
      }
    }
    await api(`/api/brands/${encodeURIComponent(cmState.selectedBrand.id)}/sources`, {
      method: "POST",
      body: {
        sourceType: data.sourceType,
        title: data.title,
        sourceUrl: data.sourceUrl,
        assetId: data.assetId,
        rawText: data.rawText,
        metadata,
        ingestNow: data.ingestNow === "true",
      },
    });
    event.currentTarget.reset();
    renderSourceTypeOptions();
    renderAssetOptions();
    await loadBrandDetail(cmState.selectedBrand.id);
    renderAll();
    return data.ingestNow === "true" ? "Source added and ingested." : "Source record added.";
  });
}

async function ingestSource(sourceId) {
  if (!cmState.selectedBrand) return;
  await submitAction("Reading source page safely...", async () => {
    await api(`/api/brands/${encodeURIComponent(cmState.selectedBrand.id)}/sources/${encodeURIComponent(sourceId)}/ingest`, { method: "POST" });
    await loadBrandDetail(cmState.selectedBrand.id);
    renderAll();
    return "Source ingested.";
  });
}

async function archiveSource(sourceId) {
  if (!cmState.selectedBrand) return;
  await submitAction("Archiving source...", async () => {
    await api(`/api/brands/${encodeURIComponent(cmState.selectedBrand.id)}/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" });
    await loadBrandDetail(cmState.selectedBrand.id);
    renderAll();
    return "Source archived.";
  });
}

async function selectBrand(brandId) {
  await submitAction("Loading brand detail...", async () => {
    await loadBrandDetail(brandId);
    cmState.section = "sources";
    history.replaceState(null, "", "#sources");
    renderAll();
    return "Brand detail loaded.";
  });
}

async function startTokenTopup(tokenPackId) {
  await submitAction("Creating secure Stripe token top-up...", async () => {
    const result = await api("/api/billing/token-topup", { method: "POST", body: { tokenPackId } });
    if (result.checkoutUrl) {
      location.href = result.checkoutUrl;
      return "Redirecting to Stripe Checkout...";
    }
    return "Token top-up created.";
  });
}

async function submitAction(loadingMessage, action) {
  setStatus(loadingMessage, "info");
  setBusy(true);
  try {
    const message = await action();
    setStatus(message, "success");
  } catch (error) {
    setStatus(error.message || "Request failed.", "error");
  } finally {
    setBusy(false);
  }
}

function brandFormPayload(form) {
  const data = formDataObject(form);
  return {
    name: data.name,
    website: data.website,
    industry: data.industry,
    businessType: data.businessType,
    productOrService: data.productOrService,
    offer: data.offer,
    primaryCTA: data.primaryCTA,
    targetAudience: data.targetAudience,
    toneOfVoice: data.toneOfVoice,
    brandJson: {
      brandWords: splitList(data.brandWords),
      avoidWords: splitList(data.avoidWords),
      notes: data.notes || "",
      visualIdentity: {
        colours: splitList(data.colours),
        fonts: splitList(data.fonts),
        logoAssetIds: splitList(data.logoAssetIds),
      },
    },
  };
}

function formDataObject(form) {
  return Object.fromEntries([...new FormData(form).entries()]
    .filter(([, value]) => !(typeof File !== "undefined" && value instanceof File))
    .map(([key, value]) => [key, String(value || "").trim()]));
}

function selectedBrandFiles(form) {
  const input = $("#brandAssetFiles", form);
  return input?.files ? [...input.files].filter((file) => file.size > 0) : [];
}

function renderBrandUploadPreview() {
  const preview = $("#brandUploadPreview");
  const input = $("#brandAssetFiles");
  if (!preview || !input) return;
  const files = input.files ? [...input.files].filter((file) => file.size > 0) : [];
  preview.innerHTML = files.length
    ? files.map((file) => `<span>${escapeHtml(file.name)} <b>${formatBytes(file.size)}</b></span>`).join("")
    : "No brand files selected yet.";
}

async function uploadBrandAssets(brand, files, assetUploadType = "logo") {
  const uploaded = [];
  for (const file of files) {
    validateBrandAssetFile(file);
    const dataUrl = await fileToDataUrl(file);
    const assetType = inferAssetType(file, assetUploadType);
    const result = await api("/api/assets", {
      method: "POST",
      body: {
        workspaceId: cmState.selectedWorkspaceId,
        brandId: brand.id,
        assetType,
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        fileName: file.name,
        dataUrl,
        visibility: "private",
        metadata: {
          source: "brand_onboarding_upload",
          brandId: brand.id,
          originalFileName: file.name,
        },
      },
    });
    uploaded.push(result.asset);
  }
  return uploaded;
}

async function attachBrandEvidenceSources(brand, uploadedAssets, sourceUrls) {
  let count = 0;
  for (const asset of uploadedAssets) {
    await api(`/api/brands/${encodeURIComponent(brand.id)}/sources`, {
      method: "POST",
      body: {
        sourceType: sourceTypeForAsset(asset),
        assetId: asset.id,
        title: asset.title,
        metadata: { source: "brand_onboarding_upload" },
      },
    });
    count += 1;
  }
  for (const sourceUrl of sourceUrls) {
    await api(`/api/brands/${encodeURIComponent(brand.id)}/sources`, {
      method: "POST",
      body: {
        sourceType: sourceTypeForUrl(sourceUrl),
        sourceUrl,
        title: sourceTitleForUrl(sourceUrl),
        metadata: { source: "brand_onboarding_url" },
      },
    });
    count += 1;
  }
  return count;
}

async function updateBrandBrainLogos(brand, uploadedAssets, existingLogoAssetIds = []) {
  const logoAssetIds = [
    ...existingLogoAssetIds,
    ...uploadedAssets.filter((asset) => asset.assetType === "logo").map((asset) => asset.id),
  ];
  const uniqueLogoAssetIds = [...new Set(logoAssetIds.filter(Boolean))];
  if (!uniqueLogoAssetIds.length) return;
  await api(`/api/brands/${encodeURIComponent(brand.id)}/brain`, {
    method: "PUT",
    body: { visualIdentity: { logoAssetIds: uniqueLogoAssetIds } },
  });
}

function validateBrandAssetFile(file) {
  const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
  if (!allowed.has(file.type)) throw new Error(`${file.name} is not a supported image. Use PNG, JPG, WEBP, GIF or SVG.`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function inferAssetType(file, fallback = "logo") {
  const name = String(file.name || "").toLowerCase();
  if (fallback === "product_image" || name.includes("product")) return "product_image";
  if (fallback === "image") return "image";
  return "logo";
}

function sourceTypeForAsset(asset) {
  if (asset.assetType === "logo") return "logo";
  if (asset.assetType === "product_image") return "product_image";
  return "uploaded_document";
}

function sourceTypeForUrl(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("youtube.com") || text.includes("youtu.be")) return "youtube_url";
  if (text.includes("facebook.com") || text.includes("instagram.com") || text.includes("linkedin.com") || text.includes("tiktok.com")) return "social_profile";
  return "website_page";
}

function sourceTitleForUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Brand source URL";
  }
}

function fillForm(form, data) {
  if (!form) return;
  $$("input, select, textarea", form).forEach((field) => {
    const value = data?.[field.name];
    if (Array.isArray(value)) field.value = value.join("\n");
    else field.value = value ?? "";
  });
}

function splitList(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedWorkspace() {
  return cmState.workspaces.find((workspace) => workspace.id === cmState.selectedWorkspaceId) || null;
}

function labelForSource(value) {
  return sourceTypes.find(([sourceType]) => sourceType === value)?.[1] || value || "Source";
}

function brainCompleteness(brain) {
  const fields = ["summary", "offer", "primaryCTA", "audience", "toneOfVoice", "contentNotes"];
  const listFields = ["painPoints", "objections", "desiredOutcomes", "proofPoints", "brandWords", "avoidWords", "sourceIds"];
  const total = fields.length + listFields.length;
  const complete = fields.filter((field) => Boolean(String(brain?.[field] || "").trim())).length
    + listFields.filter((field) => Array.isArray(brain?.[field]) && brain[field].length > 0).length;
  return Math.round((complete / total) * 100);
}

function setStatus(message, type = "info") {
  const status = $("#cmStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
}

function setBusy(isBusy) {
  $$("button, input, select, textarea").forEach((element) => {
    if (element.closest("#authCard")) return;
    element.toggleAttribute("disabled", isBusy);
  });
}

function rowHtml(title, subtitle, action = "") {
  return `
    <div class="cm-list-row">
      <div><strong>${escapeHtml(title || "Untitled")}</strong><span>${escapeHtml(subtitle || "")}</span></div>
      <div>${action}</div>
    </div>
  `;
}

function emptyHtml(title, copy) {
  return `<div class="cm-list-row"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span></div></div>`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-AU").format(Number(value || 0));
}

function formatMoney(cents, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: currency || "AUD" }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
