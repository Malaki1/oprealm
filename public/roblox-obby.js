const obbyForm = document.querySelector("#obbyForm");
const obbyPrompt = document.querySelector("#obbyPrompt");
const obbyTitleInput = document.querySelector("#obbyTitleInput");
const obbyThemeSelect = document.querySelector("#obbyThemeSelect");
const obbyDifficulty = document.querySelector("#obbyDifficulty");
const wallpaperAssetId = document.querySelector("#wallpaperAssetId");
const obbyVoiceButton = document.querySelector("#obbyVoiceButton");
const copyObbyJsonButton = document.querySelector("#copyObbyJsonButton");
const clearObbyJsonButton = document.querySelector("#clearObbyJsonButton");
const obbyStatus = document.querySelector("#obbyStatus");
const obbyJsonExportWrap = document.querySelector("#obbyJsonExportWrap");
const obbyJsonExport = document.querySelector("#obbyJsonExport");
const obbyTitle = document.querySelector("#obbyTitle");
const obbyTheme = document.querySelector("#obbyTheme");
const obbyDifficultyLabel = document.querySelector("#obbyDifficultyLabel");
const obbySections = document.querySelector("#obbySections");
const obbyTrack = document.querySelector("#obbyTrack");
const obbySectionList = document.querySelector("#obbySectionList");
const wallpaperForm = document.querySelector("#wallpaperForm");
const wallpaperTheme = document.querySelector("#wallpaperTheme");
const wallpaperDetail = document.querySelector("#wallpaperDetail");
const wallpaperNotes = document.querySelector("#wallpaperNotes");
const wallpaperStatus = document.querySelector("#wallpaperStatus");
const downloadWallpaperButton = document.querySelector("#downloadWallpaperButton");
const wallpaperTilePreview = document.querySelector("#wallpaperTilePreview");
const wallpaperImagePreview = document.querySelector("#wallpaperImagePreview");
const wallpaperPreviewTitle = document.querySelector("#wallpaperPreviewTitle");

let obbyProject = loadObbyProject();
let obbyJsonVisible = false;

function saveObbyProject() {
  localStorage.setItem("oprealm_roblox_obby_project", JSON.stringify(obbyProject || {}));
}

function loadObbyProject() {
  try {
    return JSON.parse(localStorage.getItem("oprealm_roblox_obby_project") || "{}");
  } catch {
    return {};
  }
}

function renderObbyDashboard() {
  const plan = obbyProject?.plan;
  const obby = plan?.obby;
  const sections = obby?.sections || [];

  obbyTitle.textContent = obby?.title || "No obby yet";
  obbyTheme.textContent = plan?.theme || "Theme";
  obbyDifficultyLabel.textContent = plan?.difficulty || "Difficulty";
  obbySections.textContent = `${sections.length} section${sections.length === 1 ? "" : "s"}`;

  obbyTrack.innerHTML = sections.length
    ? [
      `<span>Spawn</span>`,
      ...sections.map((section, index) => `<span title="${escapeHtml(section.label)}">${String(index + 1).padStart(2, "0")}</span>`),
      `<span>Finish</span>`,
    ].join("")
    : `<span>Spawn</span><span>Checkpoint</span><span>Finish</span>`;

  obbySectionList.innerHTML = sections.length
    ? sections.map((section) => `
        <article>
          <strong>${escapeHtml(section.label)}</strong>
          <p>${escapeHtml(section.obstacle)} - ${escapeHtml(section.intensity)} - max gap ${escapeHtml(section.playabilityRules?.maxJumpGapStuds)} studs</p>
          <small>${(section.themeDressing || []).map(escapeHtml).join(" / ")}</small>
        </article>
      `).join("")
    : `<article><strong>Waiting for an idea</strong><p>The first version creates deterministic JSON for the Roblox plugin.</p></article>`;

  renderJsonExport();
}

function renderJsonExport() {
  const payload = pluginPayloadForCurrentPlan();
  if (!obbyJsonExportWrap || !obbyJsonExport) return;
  obbyJsonExportWrap.hidden = !payload || !obbyJsonVisible;
  obbyJsonExport.value = payload && obbyJsonVisible ? JSON.stringify(payload, null, 2) : "";
}

function pluginPayloadForCurrentPlan() {
  const plan = obbyProject?.plan;
  if (!plan) return null;
  if (plan.pluginPayload) {
    const payload = structuredCloneSafe(plan.pluginPayload);
    payload.plan = payload.plan || {};
    payload.plan.title = cleanTitle(obbyTitleInput?.value || plan.obby?.title || payload.plan.title || `${plan.theme || "Space"} Obby`);
    const assetId = cleanAssetId(wallpaperAssetId?.value || payload.plan.wallpaperAssetId || "");
    if (assetId) payload.plan.wallpaperAssetId = assetId;
    return payload;
  }

  const sections = plan.obby?.sections || [];
  const obstacles = [...new Set(sections.map((section) => section.obstacle).filter(Boolean))];
  return {
    version: "oprealm-obby-v1",
    command: "BuildObbyFromSpec",
    prefabPack: `${String(plan.theme || "Space").toLowerCase()}_starter_pack`,
    gridUnit: 12,
    maxPartsEstimate: Math.max(120, sections.length * 36),
    plan: {
      theme: plan.theme || "Space",
      difficulty: plan.difficulty || "Easy",
      obstacles,
      sectionCount: sections.length,
      seed: plan.obby?.seed || Date.now(),
      title: cleanTitle(obbyTitleInput?.value || plan.obby?.title || `${plan.theme || "Space"} Obby`),
      wallpaperAssetId: cleanAssetId(wallpaperAssetId?.value || plan.pluginPayload?.plan?.wallpaperAssetId || ""),
    },
  };
}

async function generateObbyPlan() {
  if (!obbyThemeSelect?.value) {
    throw new Error("Choose a theme first so the Roblox engine can build a stronger world.");
  }

  const payload = {
    prompt: obbyPrompt.value,
    theme: obbyThemeSelect?.value || "",
    difficulty: obbyDifficulty.value,
    idempotencyKey: crypto.randomUUID?.() || `obby-${Date.now()}`,
  };

  obbyStatus.textContent = "Generating constrained obby spec...";
  const response = await fetch("/api/roblox-obby-plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not generate the obby spec.");

  const title = cleanTitle(obbyTitleInput?.value || result.obby?.title || `${result.theme} Obby`);
  result.obby = { ...(result.obby || {}), title };
  if (result.pluginPayload?.plan) {
    result.pluginPayload.plan.title = title;
    const assetId = cleanAssetId(wallpaperAssetId?.value || "");
    if (assetId) result.pluginPayload.plan.wallpaperAssetId = assetId;
  }

  obbyProject = { plan: result, updatedAt: new Date().toISOString() };
  obbyJsonVisible = true;
  saveObbyProject();
  renderObbyDashboard();
  obbyStatus.textContent = result.cached
    ? "Loaded from cache. No credits used."
    : "Obby spec ready. No credits used in this deterministic v1.";
}

async function generateWallpaper(event) {
  event?.preventDefault();
  if (!wallpaperTheme?.value) {
    wallpaperStatus.textContent = "Choose a wallpaper theme first.";
    return;
  }

  wallpaperStatus.textContent = "Generating seamless wallpaper art...";
  const response = await fetch("/api/roblox-wallpaper", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      theme: wallpaperTheme.value,
      detail: wallpaperDetail?.value || "Detailed",
      notes: wallpaperNotes?.value || "",
    }),
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not generate the wallpaper.");

  renderWallpaper(result);
  try {
    localStorage.setItem("oprealm_latest_roblox_wallpaper", JSON.stringify({
      imageDataUrl: result.imageDataUrl,
      theme: result.theme,
      detail: result.detail,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    // Large generated images may exceed browser storage. The visible download still works.
  }
  wallpaperStatus.textContent = `Wallpaper ready. ${result.creditsUsed || 8} credits used. Download it, upload it to Roblox as an image, then paste the asset ID above.`;
}

function renderWallpaper(result) {
  const imageDataUrl = result?.imageDataUrl || "";
  if (!imageDataUrl) return;

  if (wallpaperPreviewTitle) wallpaperPreviewTitle.textContent = `${result.theme || "OPRealm"} wallpaper`;
  if (wallpaperImagePreview) {
    wallpaperImagePreview.src = imageDataUrl;
    wallpaperImagePreview.hidden = false;
  }
  if (wallpaperTilePreview) {
    wallpaperTilePreview.innerHTML = "";
    wallpaperTilePreview.style.backgroundImage = `url("${imageDataUrl}")`;
  }
  if (downloadWallpaperButton) {
    downloadWallpaperButton.href = imageDataUrl;
    downloadWallpaperButton.hidden = false;
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 401) {
      return { ok: false, error: "Please log in, then try generating again." };
    }
    return { ok: false, error: "The obby generator returned a web page instead of data. Please refresh and try again." };
  }
}

function startObbyVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    obbyStatus.textContent = "Voice input is not supported in this browser yet. Type the idea instead.";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-AU";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  obbyStatus.textContent = "Listening for your obby idea...";
  recognition.onresult = (event) => {
    obbyPrompt.value = event.results?.[0]?.[0]?.transcript || obbyPrompt.value;
    obbyStatus.textContent = "Voice idea added. Hit Generate Obby Spec.";
  };
  recognition.onerror = () => {
    obbyStatus.textContent = "Voice input stopped. You can type the idea instead.";
  };
  recognition.start();
}

async function copyObbyJson() {
  const payload = pluginPayloadForCurrentPlan();
  if (!payload) {
    obbyStatus.textContent = "Generate an obby spec first.";
    return;
  }

  const text = JSON.stringify(payload, null, 2);
  obbyJsonVisible = true;
  if (obbyJsonExport) {
    obbyJsonExport.value = text;
    obbyJsonExportWrap.hidden = false;
  }

  try {
    await copyTextToClipboard(text);
    selectPluginJson();
    obbyStatus.textContent = "Plugin JSON copied. Paste it into the OPREALM Roblox Studio plugin.";
  } catch (error) {
    console.error("Copy plugin JSON failed", error);
    selectPluginJson();
    obbyStatus.textContent = "Copy was blocked. The Plugin JSON box is selected, so press Ctrl+C.";
  }
}

function clearObbyJson() {
  obbyJsonVisible = false;
  if (obbyJsonExport) obbyJsonExport.value = "";
  if (obbyJsonExportWrap) obbyJsonExportWrap.hidden = true;
  obbyStatus.textContent = "Plugin JSON cleared. Generate or copy again when you need fresh code.";
}

async function copyTextToClipboard(text) {
  if (copyFromVisibleExportBox()) return;

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (!copied) throw new Error("Clipboard copy was blocked.");
}

function copyFromVisibleExportBox() {
  if (!obbyJsonExport) return false;
  selectPluginJson();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

function selectPluginJson() {
  if (!obbyJsonExport) return;
  obbyJsonExport.focus();
  obbyJsonExport.select();
  obbyJsonExport.setSelectionRange(0, obbyJsonExport.value.length);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
}

function cleanAssetId(value) {
  const text = String(value || "").trim();
  const match = text.match(/\d{6,}/);
  return match ? match[0] : "";
}

function structuredCloneSafe(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value || {}));
  }
}

obbyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await generateObbyPlan();
  } catch (error) {
    obbyStatus.textContent = error.message || "Could not generate the obby spec.";
  }
});

obbyVoiceButton.addEventListener("click", startObbyVoiceInput);
copyObbyJsonButton.addEventListener("click", copyObbyJson);
clearObbyJsonButton?.addEventListener("click", clearObbyJson);
wallpaperForm?.addEventListener("submit", async (event) => {
  try {
    await generateWallpaper(event);
  } catch (error) {
    wallpaperStatus.textContent = error.message || "Could not generate the wallpaper.";
  }
});
obbyThemeSelect?.addEventListener("change", () => {
  if (wallpaperTheme && obbyThemeSelect.value) wallpaperTheme.value = obbyThemeSelect.value;
});
wallpaperAssetId?.addEventListener("input", renderJsonExport);

try {
  const savedWallpaper = JSON.parse(localStorage.getItem("oprealm_latest_roblox_wallpaper") || "null");
  if (savedWallpaper?.imageDataUrl) renderWallpaper(savedWallpaper);
} catch {
  // Ignore broken local wallpaper previews.
}

renderObbyDashboard();
