const storyTabs = document.querySelectorAll("[data-story-tab]");
const storyPanels = document.querySelectorAll("[data-story-panel]");
const storyCharacterForm = document.querySelector("#storyCharacterForm");
const storyCharacterDrawingForm = document.querySelector("#storyCharacterDrawingForm");
const characterMethodPanel = document.querySelector("#characterMethodPanel");
const characterDrawingInput = document.querySelector("#characterDrawingInput");
const characterDrawingPreview = document.querySelector("#characterDrawingPreview");
const characterDrawingNotes = document.querySelector("#characterDrawingNotes");
const characterDrawingStyle = document.querySelector("#characterDrawingStyle");
const useDrawingAsPromptButton = document.querySelector("#useDrawingAsPromptButton");
const storySceneForm = document.querySelector("#storySceneForm");
const storyBannerForm = document.querySelector("#storyBannerForm");
const bannerWorkspace = document.querySelector("#bannerWorkspace");
const bannerPreviewResizer = document.querySelector("#bannerPreviewResizer");
const characterPromptButton = document.querySelector("#characterPromptButton");
const scenePromptButton = document.querySelector("#scenePromptButton");
const generateSceneImagesButton = document.querySelector("#generateSceneImagesButton");
const sceneImageStatus = document.querySelector("#sceneImageStatus");
const createNextSceneButton = document.querySelector("#createNextSceneButton");
const recreateSceneImagesButton = document.querySelector("#recreateSceneImagesButton");
const clearSceneCardsButton = document.querySelector("#clearSceneCardsButton");
const characterPreviewName = document.querySelector("#characterPreviewName");
const characterPreviewBody = document.querySelector("#characterPreviewBody");
const characterPreviewType = document.querySelector("#characterPreviewType");
const characterPreviewStyle = document.querySelector("#characterPreviewStyle");
const characterPreviewStatus = document.querySelector("#characterPreviewStatus");
const generateCharacterImageButton = document.querySelector("#generateCharacterImageButton");
const characterImageStatus = document.querySelector("#characterImageStatus");
const characterImageFrame = document.querySelector("#characterImageFrame");
const saveCharacterPreviewButton = document.querySelector("#saveCharacterPreviewButton");
const createCharacterVariationButton = document.querySelector("#createCharacterVariationButton");
const addSecondHeroButton = document.querySelector("#addSecondHeroButton");
const clearCharactersButton = document.querySelector("#clearCharactersButton");
const heroSlotRow = document.querySelector("#heroSlotRow");
const sceneCardList = document.querySelector("#sceneCardList");
const storyMapShell = document.querySelector("#storyMapShell");
const storyMapBoard = document.querySelector("#storyMapBoard");
const toggleStoryMapSize = document.querySelector("#toggleStoryMapSize");
const mapToolButtons = document.querySelectorAll("[data-map-tool]");
const addSceneOnMapButton = document.querySelector("#addSceneOnMapButton");
const clearExtraScenesButton = document.querySelector("#clearExtraScenesButton");
const storyRouteForm = document.querySelector("#storyRouteForm");
const routeSourceScene = document.querySelector("#routeSourceScene");
const routeChoiceIndex = document.querySelector("#routeChoiceIndex");
const routeTargetScene = document.querySelector("#routeTargetScene");
const selectedSceneLabel = document.querySelector("#selectedSceneLabel");
const selectedSceneTitle = document.querySelector("#selectedSceneTitle");
const selectedScenePrompt = document.querySelector("#selectedScenePrompt");
const selectedSceneType = document.querySelector("#selectedSceneType");
const selectedSceneChoices = document.querySelector("#selectedSceneChoices");
const updateSelectedSceneButton = document.querySelector("#updateSelectedSceneButton");
const deleteSelectedSceneButton = document.querySelector("#deleteSelectedSceneButton");
const storyPreviewTitle = document.querySelector("#storyPreviewTitle");
const storyPreviewText = document.querySelector("#storyPreviewText");
const storyPreviewChoices = document.querySelector("#storyPreviewChoices");
const webScenePreviewTitle = document.querySelector("#webScenePreviewTitle");
const webScenePreviewText = document.querySelector("#webScenePreviewText");
const sceneStyleSelect = document.querySelector("#sceneStyleSelect");
const sceneStyleLockNote = document.querySelector("#sceneStyleLockNote");
const bannerDesignPreview = document.querySelector("#bannerDesignPreview");
const bannerDesignText = document.querySelector("#bannerDesignText");
const bannerTextInput = document.querySelector("#bannerTextInput");
const bannerTextCount = document.querySelector("#bannerTextCount");
const bannerStyleSelect = document.querySelector("#bannerStyleSelect");
const uiThemeSelect = document.querySelector("#uiThemeSelect");
const uiOverlaySelect = document.querySelector("#uiOverlaySelect");
const uiButtonSelect = document.querySelector("#uiButtonSelect");
const uiOverlaySizeRange = document.querySelector("#uiOverlaySizeRange");
const uiOverlaySizeValue = document.querySelector("#uiOverlaySizeValue");
const uiButtonSizeRange = document.querySelector("#uiButtonSizeRange");
const uiButtonSizeValue = document.querySelector("#uiButtonSizeValue");
const uiFontSelect = document.querySelector("#uiFontSelect");
const uiTextSizeSelect = document.querySelector("#uiTextSizeSelect");
const uiTextColorSelect = document.querySelector("#uiTextColorSelect");
const uiTextAlignSelect = document.querySelector("#uiTextAlignSelect");
const uiTextWidthRange = document.querySelector("#uiTextWidthRange");
const uiTextWidthValue = document.querySelector("#uiTextWidthValue");
const uiKitOverlayImage = document.querySelector("#uiKitOverlayImage");
const uiKitButtonImage = document.querySelector("#uiKitButtonImage");
const uiKitSceneStack = document.querySelector("#uiKitSceneStack");
const applyScenePromptToBannerButton = document.querySelector("#applyScenePromptToBannerButton");
const addBannerSceneToMapButton = document.querySelector("#addBannerSceneToMapButton");
const imageLightbox = document.querySelector("#imageLightbox");
const imageLightboxImage = document.querySelector("#imageLightboxImage");
const imageLightboxTitle = document.querySelector("#imageLightboxTitle");
const imageLightboxDownload = document.querySelector("[data-download-scene-image='lightbox']");
const checkCharacter = document.querySelector("#checkCharacter");
const checkScenes = document.querySelector("#checkScenes");

let storyProject = loadStoryProject();
let selectedSceneIndex = 0;
let activeHeroIndex = 0;
let activeCharacterMethod = "chooser";
let activeMapTool = "select";
let draggedScene = null;
let activeLightboxImageSrc = "";
let activeLightboxDownloadName = "oprealm-scene-card.png";
let storyUiKits = [];
let draggingBannerLayer = null;
let draggingPreviewColumn = false;
const STORY_IMAGE_REF_PREFIX = "story-image:";
const BANNER_PREVIEW_WIDTH_KEY = "oprealm_story_banner_preview_width";

function saveStoryProject() {
  try {
    localStorage.removeItem("oprealm_story_game_project");
    localStorage.setItem("oprealm_story_game_project", JSON.stringify(storyProject));
  } catch (error) {
    console.error("Story project save failed", error);
    const compactProject = compactStoryProjectForStorage(storyProject);
    try {
      localStorage.removeItem("oprealm_story_game_project");
      localStorage.setItem("oprealm_story_game_project", JSON.stringify(compactProject));
      storyProject = compactProject;
    } catch (fallbackError) {
      console.error("Compact story project save failed", fallbackError);
    }
    if (characterImageStatus) {
      characterImageStatus.textContent = "Project storage was full, so oversized draft images were removed. Please regenerate the latest image if needed.";
    }
  }
}

function applyBannerPreviewColumnWidth(width) {
  if (!bannerWorkspace) return;
  const nextWidth = Math.max(320, Math.min(820, Number(width) || 520));
  bannerWorkspace.style.setProperty("--preview-column-width", `${Math.round(nextWidth)}px`);
}

function loadBannerPreviewColumnWidth() {
  try {
    applyBannerPreviewColumnWidth(localStorage.getItem(BANNER_PREVIEW_WIDTH_KEY) || 520);
  } catch (error) {
    applyBannerPreviewColumnWidth(520);
  }
}

function resizeBannerPreviewColumn(event) {
  if (!bannerWorkspace) return;
  const rect = bannerWorkspace.getBoundingClientRect();
  const gap = 42;
  const minFormWidth = 360;
  const minPreviewWidth = 320;
  const maxPreviewWidth = Math.min(920, rect.width - minFormWidth - gap);
  if (maxPreviewWidth < minPreviewWidth) return;
  const previewWidth = Math.max(minPreviewWidth, Math.min(maxPreviewWidth, rect.right - event.clientX));
  applyBannerPreviewColumnWidth(previewWidth);
  try {
    localStorage.setItem(BANNER_PREVIEW_WIDTH_KEY, String(Math.round(previewWidth)));
  } catch (error) {
    console.warn("Could not save preview column width", error);
  }
}

function compactStoryProjectForStorage(project) {
  return JSON.parse(JSON.stringify(project, (key, value) => {
    if (typeof value === "string" && value.startsWith("data:image/")) return "";
    return value;
  }));
}

function loadStoryProject() {
  try {
    return JSON.parse(localStorage.getItem("oprealm_story_game_project") || "{}");
  } catch {
    localStorage.removeItem("oprealm_story_game_project");
    return {};
  }
}

function openStoryImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("oprealm_story_assets", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("images");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveStoryImage(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image/")) return dataUrl;
  const db = await openStoryImageDb();
  const id = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`;
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite");
    transaction.objectStore("images").put(dataUrl, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return `${STORY_IMAGE_REF_PREFIX}${id}`;
}

async function loadStoryImage(value) {
  if (!value || !String(value).startsWith(STORY_IMAGE_REF_PREFIX)) return value || "";
  const id = String(value).slice(STORY_IMAGE_REF_PREFIX.length);
  const db = await openStoryImageDb();
  const image = await new Promise((resolve, reject) => {
    const transaction = db.transaction("images", "readonly");
    const request = transaction.objectStore("images").get(id);
    request.onsuccess = () => resolve(request.result || "");
    request.onerror = () => reject(request.error);
  });
  db.close();
  return image;
}

function imageMarkup(value, alt, className = "") {
  if (!value) return "";
  if (String(value).startsWith(STORY_IMAGE_REF_PREFIX)) {
    return `<img class="${className}" data-story-image-ref="${escapeHtml(value)}" alt="${escapeHtml(alt)}" />`;
  }
  return `<img class="${className}" src="${value}" alt="${escapeHtml(alt)}" />`;
}

async function hydrateStoryImages(root = document) {
  const images = [...root.querySelectorAll("[data-story-image-ref]")];
  await Promise.all(images.map(async (image) => {
    const src = await loadStoryImage(image.dataset.storyImageRef);
    if (src) image.src = src;
  }));
  const downloadLinks = [...root.querySelectorAll("[data-download-image-ref]")];
  await Promise.all(downloadLinks.map(async (link) => {
    const src = await loadStoryImage(link.dataset.downloadImageRef);
    if (src) {
      link.dataset.imageSrc = src;
      link.hidden = false;
    }
  }));
}

async function setFrameImageFromStoredValue(frame, value) {
  if (!frame) return;
  const imageDataUrl = await loadStoryImage(value);
  frame.style.backgroundImage = imageDataUrl
    ? `linear-gradient(180deg, rgba(3, 9, 21, 0.08), rgba(3, 9, 21, 0.74)), url("${imageDataUrl}")`
    : "";
  frame.classList.toggle("has-generated-image", Boolean(imageDataUrl));
  const enlargeButton = frame.querySelector("[data-enlarge-scene-preview]");
  if (enlargeButton) {
    enlargeButton.hidden = !imageDataUrl;
    enlargeButton.dataset.imageSrc = imageDataUrl || "";
  }
  const downloadButton = frame.querySelector("[data-download-scene-image]");
  if (downloadButton) {
    downloadButton.hidden = !imageDataUrl;
    if (imageDataUrl) {
      downloadButton.dataset.imageSrc = imageDataUrl;
      downloadButton.dataset.downloadName = "oprealm-scene-preview.png";
    } else {
      delete downloadButton.dataset.imageSrc;
      delete downloadButton.dataset.downloadName;
    }
  }
}

async function migrateStoryImagesToIndexedDb() {
  let changed = false;
  if (storyProject.character?.imageDataUrl?.startsWith?.("data:image/")) {
    storyProject.character.imageDataUrl = await saveStoryImage(storyProject.character.imageDataUrl);
    changed = true;
  }
  if (storyProject.characterDraft?.imageDataUrl?.startsWith?.("data:image/")) {
    storyProject.characterDraft.imageDataUrl = await saveStoryImage(storyProject.characterDraft.imageDataUrl);
    changed = true;
  }
  for (const character of storyProject.characters || []) {
    if (character?.imageDataUrl?.startsWith?.("data:image/")) {
      character.imageDataUrl = await saveStoryImage(character.imageDataUrl);
      changed = true;
    }
  }
  for (const draft of storyProject.characterDrafts || []) {
    if (draft?.imageDataUrl?.startsWith?.("data:image/")) {
      draft.imageDataUrl = await saveStoryImage(draft.imageDataUrl);
      changed = true;
    }
  }
  if (storyProject.sceneDraftImages?.webImageDataUrl?.startsWith?.("data:image/")) {
    storyProject.sceneDraftImages.webImageDataUrl = await saveStoryImage(storyProject.sceneDraftImages.webImageDataUrl);
    changed = true;
  }
  for (const scene of storyProject.scenes || []) {
    if (scene.webImageDataUrl?.startsWith?.("data:image/")) {
      scene.webImageDataUrl = await saveStoryImage(scene.webImageDataUrl);
      changed = true;
    }
  }
  if (changed) saveStoryProject();
}

function resetOversizedStoryProject() {
  localStorage.removeItem("oprealm_story_game_project");
  storyProject = {};
  selectedSceneIndex = 0;
  activeHeroIndex = 0;
  renderStoryDashboard();
}

function normalizeStoryCharacters() {
  if (!Array.isArray(storyProject.characters)) {
    storyProject.characters = storyProject.character?.name || storyProject.character?.prompt
      ? [storyProject.character]
      : [];
  }
  if (storyProject.characterDraft && !storyProject.characterDrafts) {
    storyProject.characterDrafts = [storyProject.characterDraft];
    delete storyProject.characterDraft;
  }
  if (!Array.isArray(storyProject.characterDrafts)) storyProject.characterDrafts = [];
  if (activeHeroIndex > 1) activeHeroIndex = 1;
  if (activeHeroIndex < 0) activeHeroIndex = 0;
}

async function loadStoryUiKits() {
  try {
    const response = await fetch("/assets/ui-kits/story-ui-kits.json");
    storyUiKits = response.ok ? await response.json() : [];
  } catch (error) {
    console.error("Story UI kit manifest failed to load", error);
    storyUiKits = [];
  }
  renderUiKitControls();
  renderBannerPreview();
}

function getSelectedUiKit() {
  return storyUiKits.find((kit) => kit.id === (uiThemeSelect?.value || storyProject.banner?.uiTheme)) || storyUiKits[0] || null;
}

function getKitAsset(kit, assetId) {
  if (!kit || !assetId) return null;
  return kit.assets.find((asset) => asset.id === assetId) || null;
}

function renderUiKitControls() {
  if (!uiThemeSelect || !storyUiKits.length) return;
  const currentBanner = { ...(storyProject.banner || {}), ...(storyProject.bannerDraft || {}) };
  const selectedTheme = currentBanner.uiTheme || uiThemeSelect.value || storyUiKits[0].id;
  uiThemeSelect.innerHTML = storyUiKits
    .map((kit) => `<option value="${escapeHtml(kit.id)}">${escapeHtml(kit.name)}</option>`)
    .join("");
  uiThemeSelect.value = storyUiKits.some((kit) => kit.id === selectedTheme) ? selectedTheme : storyUiKits[0].id;

  const kit = getSelectedUiKit();
  const overlays = kit.assets.filter((asset) => ["banner", "panel", "frame"].includes(asset.type));
  const buttons = kit.assets.filter((asset) => asset.type === "button");
  uiOverlaySelect.innerHTML = [`<option value="">No overlay</option>`]
    .concat(overlays.map((asset) => `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.label)}</option>`))
    .join("");
  uiButtonSelect.innerHTML = [`<option value="">No button</option>`]
    .concat(buttons.map((asset) => `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.label)}</option>`))
    .join("");
  uiOverlaySelect.value = overlays.some((asset) => asset.id === currentBanner.uiOverlay) ? currentBanner.uiOverlay : overlays[0]?.id || "";
  uiButtonSelect.value = buttons.some((asset) => asset.id === currentBanner.uiButton) ? currentBanner.uiButton : "";
  if (uiOverlaySizeRange) uiOverlaySizeRange.value = currentBanner.uiOverlaySize || 66;
  if (uiOverlaySizeValue) uiOverlaySizeValue.textContent = `${uiOverlaySizeRange?.value || currentBanner.uiOverlaySize || 66}%`;
  if (uiButtonSizeRange) uiButtonSizeRange.value = currentBanner.uiButtonSize || 22;
  if (uiButtonSizeValue) uiButtonSizeValue.textContent = `${uiButtonSizeRange?.value || currentBanner.uiButtonSize || 22}%`;
  if (uiFontSelect) uiFontSelect.value = currentBanner.uiFont || kit.font || "Inter";
  if (uiTextSizeSelect) uiTextSizeSelect.value = currentBanner.uiTextSize || "large";
  if (uiTextColorSelect) uiTextColorSelect.value = currentBanner.uiTextColor || "white";
  if (uiTextAlignSelect) uiTextAlignSelect.value = currentBanner.uiTextAlign || "left";
  if (uiTextWidthRange) uiTextWidthRange.value = currentBanner.uiTextWidth || 56;
  if (uiTextWidthValue) uiTextWidthValue.textContent = `${uiTextWidthRange?.value || currentBanner.uiTextWidth || 56}%`;
}

function renderHeroSlots(characters) {
  if (!heroSlotRow) return;
  const slots = [0, 1].map((index) => {
    const hero = characters[index] || storyProject.characterDrafts?.[index] || {};
    const label = hero.name || `Hero ${index + 1}`;
    const state = hero.name || hero.prompt ? "Ready" : index === 1 ? "Optional" : "Needed";
    return `<button class="hero-slot ${index === activeHeroIndex ? "is-active" : ""}" type="button" data-hero-slot="${index}">
      <span>Hero ${index + 1}</span>
      <strong>${escapeHtml(label)}</strong>
      <em>${state}</em>
    </button>`;
  }).join("");
  heroSlotRow.innerHTML = slots;
}

function renderStoryDashboard() {
  normalizeStoryCharacters();
  const characters = storyProject.characters || [];
  const character = characters[0] || storyProject.character || {};
  const characterDraft = storyProject.characterDrafts?.[activeHeroIndex] || null;
  const previewCharacter = characterDraft || characters[activeHeroIndex] || {};
  const scenes = ensureSceneLayout(storyProject.scenes || []);
  if (selectedSceneIndex >= scenes.length) selectedSceneIndex = Math.max(scenes.length - 1, 0);

  characterPreviewStatus.textContent = characterDraft ? `Generated Hero ${activeHeroIndex + 1} draft` : `Hero ${activeHeroIndex + 1}`;
  characterPreviewName.textContent = previewCharacter.name || `No Hero ${activeHeroIndex + 1} yet`;
  characterPreviewBody.textContent = previewCharacter.prompt || "Add a character to begin the AI Story Game flow.";
  characterPreviewType.textContent = previewCharacter.type || "Type";
  characterPreviewStyle.textContent = previewCharacter.style || "Style";
  characterImageFrame.innerHTML = previewCharacter.imageDataUrl
    ? imageMarkup(previewCharacter.imageDataUrl, previewCharacter.name || "Generated story character")
    : "<span>No image yet</span>";
  createCharacterVariationButton.disabled = !previewCharacter.name && !previewCharacter.prompt;
  if (addSecondHeroButton) addSecondHeroButton.disabled = !characters[0]?.name && !storyProject.characterDrafts?.[0]?.name;
  renderHeroSlots(characters);
  renderCharacterMethod();

  sceneCardList.innerHTML = scenes.length
    ? scenes
      .map(
        (scene, index) => `
          <article class="scene-card">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(scene.title)}</strong>
              ${scene.webImageDataUrl ? `
                <div class="scene-card-thumbs">
                  <div class="scene-card-thumb">
                    ${imageMarkup(scene.webImageDataUrl, `${scene.title} web preview`)}
                    <button
                      class="scene-enlarge-button scene-card-enlarge-button"
                      type="button"
                      data-enlarge-scene-preview="saved"
                      data-image-ref="${escapeHtml(scene.webImageDataUrl)}"
                      data-lightbox-title="${escapeHtml(`Scene ${index + 1}: ${scene.title || "Scene card preview"}`)}"
                    >Enlarge</button>
                    <button
                      class="scene-image-download-button scene-card-download-button"
                      type="button"
                      data-download-scene-image="saved"
                      data-download-image-ref="${escapeHtml(scene.webImageDataUrl)}"
                      data-download-name="${escapeHtml(downloadFileName(`oprealm-scene-${index + 1}-${scene.title || "scene-card"}`))}"
                      aria-label="Download scene ${index + 1} image"
                      hidden
                    >&#8595;</button>
                  </div>
                </div>
              ` : ""}
              <p>${escapeHtml(scene.prompt)}</p>
              <small>${escapeHtml(scene.camera)} - ${escapeHtml(scene.background)} - ${escapeHtml(scene.type)}</small>
              <div class="scene-format-row">
                <em>16:9 scene card ready</em>
                ${scene.banner?.bannerText ? `<em>${escapeHtml(scene.banner.bannerStyle || "glass")} banner ready</em>` : ""}
              </div>
            </div>
          </article>
        `,
      )
      .join("")
    : `<article class="scene-card empty"><strong>No scene cards yet</strong><p>Create the start scene first.</p></article>`;

  storyMapBoard.classList.toggle("is-move-mode", activeMapTool === "move");
  storyMapBoard.classList.toggle("is-connect-mode", activeMapTool === "connect");
  storyMapBoard.style.minHeight = scenes.length
    ? `${Math.max(340, ...scenes.map((scene) => Number(scene.y || 0) + 170))}px`
    : "340px";
  storyMapBoard.innerHTML = scenes.length
    ? scenes
      .map(
        (scene, index) => `
          <article class="story-node ${index === selectedSceneIndex ? "is-selected" : ""}" style="left:${Number(scene.x || 40)}px; top:${Number(scene.y || 40)}px;" data-scene-index="${index}">
            <button class="node-port port-up" type="button" data-connect-scene="${index}" data-direction="up" aria-label="Add one branch above"></button>
            <button class="node-port port-right" type="button" data-connect-scene="${index}" data-direction="right" aria-label="Add one branch right"></button>
            <button class="node-port port-down" type="button" data-connect-scene="${index}" data-direction="down" aria-label="Add one branch below"></button>
            <button class="node-port port-left" type="button" data-connect-scene="${index}" data-direction="left" aria-label="Add one branch left"></button>
            <span>${index === 0 ? "Start" : `Scene ${index + 1}`}</span>
            <strong>${escapeHtml(scene.title)}</strong>
            <p>${escapeHtml(scene.type)}</p>
            <div class="node-mini-actions">
              <button type="button" data-edit-scene="${index}">Edit</button>
              ${index === 0 ? "" : `<button type="button" data-delete-scene="${index}">Delete</button>`}
            </div>
            ${renderRouteChips(scene)}
          </article>
        `,
      )
      .join("")
    : `<article class="story-node"><span>Start</span><strong>Blank Scene Card</strong><p>Add your first scene to begin the map.</p></article>`;

  renderRouteControls(scenes);
  renderSelectedSceneEditor(scenes);
  if (storyBannerForm) {
    const banner = storyProject.banner || {};
    storyBannerForm.elements.bannerText.value = banner.bannerText || "";
    storyBannerForm.elements.bannerStyle.value = banner.bannerStyle || "glass";
    storyBannerForm.elements.bannerTone.value = banner.bannerTone || "Question";
  }

  const firstScene = scenes[0];
  storyPreviewTitle.textContent = firstScene?.title || "Your story will appear here";
  storyPreviewText.textContent = firstScene?.prompt || "Create a character and at least one scene card to preview the pick-a-path flow.";
  storyPreviewChoices.innerHTML = firstScene
    ? Array.from({ length: choiceCountForScene(firstScene) }, (_, index) => `<button class="button button-secondary" type="button">${choiceLabel(index)}</button>`).join("")
    : "";

  checkCharacter.textContent = character.name ? `${characters.filter((item) => item?.name).length || 1} hero character${characters.filter((item) => item?.name).length === 1 ? "" : "s"} ready` : "Not ready yet";
  checkScenes.textContent = scenes.length >= 3 ? "Ready for preview" : `Add ${Math.max(3 - scenes.length, 0)} more scene card${3 - scenes.length === 1 ? "" : "s"}`;
  renderSceneFormPreview();
  renderBannerPreview();
  hydrateStoryImages();
}

function renderCharacterMethod() {
  const hasAnyCharacter = Boolean(storyProject.characters?.length || storyProject.characterDrafts?.length);
  const showChooser = activeCharacterMethod === "chooser" && !hasAnyCharacter;
  const showDrawing = activeCharacterMethod === "drawing";
  if (characterMethodPanel) characterMethodPanel.classList.toggle("is-hidden", !showChooser);
  if (storyCharacterDrawingForm) storyCharacterDrawingForm.classList.toggle("is-hidden", !showDrawing);
  if (storyCharacterForm) storyCharacterForm.classList.toggle("is-hidden", showChooser || showDrawing);
}

function ensureSceneLayout(scenes) {
  let changed = false;
  const nextScenes = scenes.map((scene, index) => {
    if (typeof scene.x === "number" && typeof scene.y === "number") return scene;
    changed = true;
    return {
      ...scene,
      x: 40 + (index % 3) * 260,
      y: 40 + Math.floor(index / 3) * 190,
    };
  });
  storyProject.scenes = nextScenes;
  if (changed) saveStoryProject();
  return nextScenes;
}

function renderRouteChips(scene) {
  const routes = scene.routes || [];
  if (!routes.length) return `<div class="route-chip-row"><small>No routes yet</small></div>`;
  return `
    <div class="route-chip-row">
      ${routes
      .map((route) => `<small class="route-chip">${escapeHtml(choiceLabel(route.choiceIndex))} ${arrowForDirection(route.direction)} Scene ${Number(route.targetIndex) + 1}</small>`)
      .join("")}
    </div>
  `;
}

function renderRouteControls(scenes) {
  const sceneOptions = scenes
    .map((scene, index) => `<option value="${index}">Scene ${index + 1}: ${escapeHtml(scene.title)}</option>`)
    .join("");

  routeSourceScene.innerHTML = sceneOptions || `<option value="">Add scenes first</option>`;
  routeTargetScene.innerHTML = sceneOptions || `<option value="">Add scenes first</option>`;
  renderChoiceOptions();
}

function renderSelectedSceneEditor(scenes) {
  const scene = scenes[selectedSceneIndex];
  const hasScene = Boolean(scene);
  selectedSceneLabel.textContent = hasScene ? `Editing Scene ${selectedSceneIndex + 1}` : "Select a scene card";
  selectedSceneTitle.value = scene?.title || "";
  selectedScenePrompt.value = scene?.prompt || "";
  selectedSceneType.value = scene?.type || "Choice moment";
  selectedSceneChoices.value = scene?.choices || "2 choices";
  [selectedSceneTitle, selectedScenePrompt, selectedSceneType, selectedSceneChoices, updateSelectedSceneButton, deleteSelectedSceneButton].forEach((field) => {
    field.disabled = !hasScene;
  });
  deleteSelectedSceneButton.disabled = !hasScene || selectedSceneIndex === 0;
}

function renderChoiceOptions() {
  const scenes = storyProject.scenes || [];
  const source = scenes[Number(routeSourceScene?.value || 0)];
  const count = choiceCountForScene(source);
  routeChoiceIndex.innerHTML = Array.from({ length: count }, (_, index) => `<option value="${index}">${choiceLabel(index)}</option>`).join("");
}

function choiceCountForScene(scene) {
  if (!scene) return 2;
  return Number(String(scene.choices || "2").match(/\d/)?.[0] || 2);
}

function choiceLabel(index) {
  return `Choice ${String.fromCharCode(65 + Number(index || 0))}`;
}

function arrowForDirection(direction) {
  return { up: "^", right: "->", down: "v", left: "<-" }[direction] || "->";
}

function addRoute(sourceIndex, choiceIndex, targetIndex, direction = "right") {
  const scenes = storyProject.scenes || [];
  if (!scenes[sourceIndex] || !scenes[targetIndex]) return;
  const routes = scenes[sourceIndex].routes || [];
  const existingIndex = routes.findIndex((route) => Number(route.choiceIndex) === Number(choiceIndex));
  const nextRoute = { choiceIndex: Number(choiceIndex), targetIndex: Number(targetIndex), direction };
  if (existingIndex >= 0) routes[existingIndex] = nextRoute;
  else routes.push(nextRoute);
  scenes[sourceIndex].routes = routes;
  storyProject.scenes = scenes;
  saveStoryProject();
  renderStoryDashboard();
}

function addConnectedScene(sourceIndex, direction) {
  const scenes = storyProject.scenes || [];
  const source = scenes[sourceIndex];
  if (!source) return;
  const targetIndex = scenes.length;
  const routeCount = (source.routes || []).length;
  const offset = {
    up: { x: 0, y: -170 },
    right: { x: 270, y: 0 },
    down: { x: 0, y: 170 },
    left: { x: -270, y: 0 },
  }[direction] || { x: 270, y: 0 };
  scenes.push({
    title: `${choiceLabel(routeCount)} Branch`,
    prompt: `A new ${direction} branch from ${source.title}.`,
    camera: "Wide cinematic reveal",
    background: source.background || "Custom background",
    character: "Use saved character",
    mood: source.mood || "Curious",
    type: "Choice moment",
    choices: "2 choices",
    x: Math.max(24, Number(source.x || 40) + offset.x),
    y: Math.max(24, Number(source.y || 40) + offset.y),
    routes: [],
  });
  storyProject.scenes = scenes;
  selectedSceneIndex = targetIndex;
  addRoute(sourceIndex, Math.min(routeCount, choiceCountForScene(source) - 1), targetIndex, direction);
}

function addBlankScene() {
  const scenes = storyProject.scenes || [];
  scenes.push({
    title: scenes.length ? `Scene ${scenes.length + 1}` : "Start Scene",
    prompt: "Describe what happens in this scene.",
    camera: "Wide cinematic reveal",
    background: "Custom background",
    character: "Use saved character",
    mood: "Curious",
    type: scenes.length ? "Choice moment" : "Start scene",
    choices: "2 choices",
    x: 60 + (scenes.length % 3) * 270,
    y: 60 + Math.floor(scenes.length / 3) * 190,
    routes: [],
  });
  storyProject.scenes = scenes;
  selectedSceneIndex = scenes.length - 1;
  saveStoryProject();
  renderStoryDashboard();
}

function resetSceneBuilderForNext() {
  if (storyProject.sceneDraftImages?.webImageDataUrl || currentSceneFormData().prompt?.trim()) {
    addSceneFromCurrentPreview({ stayOnSceneTab: true, prepareNext: true });
    return;
  }
  delete storyProject.sceneDraftImages;
  delete storyProject.bannerDraft;
  storySceneForm.reset();
  if (storyBannerForm) storyBannerForm.reset();
  saveStoryProject();
  renderStoryDashboard();
  switchStoryTab("scene");
  storySceneForm.querySelector("[name='prompt']")?.focus();
}

function clearSceneCards() {
  if (!window.confirm("Clear all saved scene cards from this story project? Characters and banner styles will stay saved.")) return;
  storyProject.scenes = [];
  delete storyProject.sceneDraftImages;
  delete storyProject.bannerDraft;
  selectedSceneIndex = 0;
  storySceneForm.reset();
  if (storyBannerForm) storyBannerForm.reset();
  saveStoryProject();
  renderStoryDashboard();
  switchStoryTab("scene");
  sceneImageStatus.textContent = "Saved scene cards cleared. Characters were left untouched.";
}

function addSceneFromCurrentPreview({ stayOnSceneTab = true, prepareNext = false } = {}) {
  const data = currentSceneFormData();
  const banner = currentBannerFormData();
  const draftImages = storyProject.sceneDraftImages || {};
  const scenes = storyProject.scenes || [];
  const nextIndex = scenes.length;
  scenes.push({
    ...data,
    ...draftImages,
    banner,
    title: titleFromPrompt(data.prompt, nextIndex ? `Scene ${nextIndex + 1}` : "Start Scene"),
    routes: [],
    x: 60 + (nextIndex % 3) * 270,
    y: 60 + Math.floor(nextIndex / 3) * 190,
  });
  storyProject.scenes = scenes;
  delete storyProject.sceneDraftImages;
  delete storyProject.bannerDraft;
  selectedSceneIndex = scenes.length - 1;
  saveStoryProject();
  storySceneForm.reset();
  if (storyBannerForm) storyBannerForm.reset();
  renderStoryDashboard();
  switchStoryTab(stayOnSceneTab ? "scene" : "map");
  sceneImageStatus.textContent = prepareNext
    ? `Scene ${scenes.length} saved. Blank next scene is ready.`
    : `Scene ${scenes.length} saved. Create the next scene when ready.`;
  if (prepareNext) storySceneForm.querySelector("[name='prompt']")?.focus();
}

function deleteScene(index) {
  const scenes = storyProject.scenes || [];
  if (index <= 0 || !scenes[index]) return;
  scenes.splice(index, 1);
  scenes.forEach((scene) => {
    scene.routes = (scene.routes || [])
      .filter((route) => Number(route.targetIndex) !== index)
      .map((route) => ({
        ...route,
        targetIndex: Number(route.targetIndex) > index ? Number(route.targetIndex) - 1 : Number(route.targetIndex),
      }));
  });
  storyProject.scenes = scenes;
  selectedSceneIndex = Math.max(0, Math.min(index - 1, scenes.length - 1));
  saveStoryProject();
  renderStoryDashboard();
}

function clearExtraScenes() {
  const scenes = storyProject.scenes || [];
  if (scenes.length <= 1) return;
  const keep = {
    ...scenes[0],
    routes: [],
    x: 40,
    y: 40,
  };
  storyProject.scenes = [keep];
  selectedSceneIndex = 0;
  saveStoryProject();
  renderStoryDashboard();
}

function updateSelectedScene() {
  const scenes = storyProject.scenes || [];
  const scene = scenes[selectedSceneIndex];
  if (!scene) return;
  scenes[selectedSceneIndex] = {
    ...scene,
    title: selectedSceneTitle.value.trim() || scene.title,
    prompt: selectedScenePrompt.value.trim() || scene.prompt,
    type: selectedSceneType.value,
    choices: selectedSceneChoices.value,
  };
  storyProject.scenes = scenes;
  saveStoryProject();
  renderStoryDashboard();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function titleFromPrompt(prompt, fallback) {
  const clean = String(prompt || "").trim().replace(/\s+/g, " ");
  if (!clean) return fallback;
  return clean.split(/[.!?]/)[0].slice(0, 42) || fallback;
}

function currentCharacterFormData() {
  return Object.fromEntries(new FormData(storyCharacterForm).entries());
}

function fillCharacterForm(character = {}) {
  if (!storyCharacterForm) return;
  storyCharacterForm.elements.name.value = character.name || "";
  storyCharacterForm.elements.prompt.value = character.prompt || "";
  storyCharacterForm.elements.type.value = character.type || "Custom";
  storyCharacterForm.elements.personality.value = character.personality || "Brave and kind";
  storyCharacterForm.elements.style.value = character.style || "Bright 3D game mascot";
  storyCharacterForm.elements.safety.value = character.safety || "Friendly and safe for all ages";
}

function switchHeroSlot(index) {
  normalizeStoryCharacters();
  activeCharacterMethod = "prompt";
  activeHeroIndex = Math.max(0, Math.min(Number(index) || 0, 1));
  const character = storyProject.characterDrafts?.[activeHeroIndex] || storyProject.characters?.[activeHeroIndex] || {};
  fillCharacterForm(character);
  renderStoryDashboard();
}

function chooseCharacterMethod(method) {
  activeCharacterMethod = method === "drawing" ? "drawing" : "prompt";
  renderStoryDashboard();
}

function clearSavedCharacters() {
  if (!window.confirm("Clear all saved heroes and character drafts from this story project?")) return;
  storyProject.characters = [];
  storyProject.character = {};
  storyProject.characterDrafts = [];
  delete storyProject.characterDraft;
  delete storyProject.characterDrawingDraft;
  activeHeroIndex = 0;
  activeCharacterMethod = "chooser";
  storyCharacterForm.reset();
  if (storyCharacterDrawingForm) storyCharacterDrawingForm.reset();
  if (characterDrawingPreview) characterDrawingPreview.innerHTML = "<span>No drawing uploaded yet</span>";
  saveStoryProject();
  renderStoryDashboard();
  characterImageStatus.textContent = "Saved characters cleared. Scenes and story map were left untouched.";
}

function currentSceneFormData() {
  const data = Object.fromEntries(new FormData(storySceneForm).entries());
  data.lockCharacterStyle = Boolean(new FormData(storySceneForm).get("lockCharacterStyle"));
  data.lockSceneContinuity = Boolean(new FormData(storySceneForm).get("lockSceneContinuity"));
  return data;
}

async function buildSceneReferenceBundle() {
  const data = currentSceneFormData();
  if (!data.lockSceneContinuity) {
    return { referenceImages: [], continuityBrief: "Scene continuity references are off for this image." };
  }

  normalizeStoryCharacters();
  const references = [];
  const addReference = async (label, value) => {
    if (!value || references.some((item) => item.label === label)) return;
    const imageDataUrl = await loadStoryImage(value);
    if (!imageDataUrl?.startsWith?.("data:image/")) return;
    references.push({ label, imageDataUrl });
  };

  const characters = storyProject.characters || [];
  await addReference("Hero 1 locked character portrait", characters[0]?.imageDataUrl);
  await addReference("Hero 2 locked character portrait", characters[1]?.imageDataUrl);

  const scenes = storyProject.scenes || [];
  if (scenes[0]?.webImageDataUrl) {
    await addReference("Scene 1 style anchor", scenes[0].webImageDataUrl);
  }
  const previousScene = scenes[scenes.length - 1];
  if (previousScene?.webImageDataUrl && previousScene !== scenes[0]) {
    await addReference(`Previous approved scene ${scenes.length}`, previousScene.webImageDataUrl);
  }

  return {
    referenceImages: references.slice(0, 4),
    continuityBrief: buildContinuityBrief(characters, scenes),
  };
}

function buildContinuityBrief(characters, scenes) {
  const heroLines = characters
    .filter((item) => item?.name || item?.prompt)
    .slice(0, 2)
    .map((character, index) => [
      `Hero ${index + 1}: ${character.name || "Unnamed hero"}`,
      `type ${character.type || "original hero"}`,
      `style ${character.style || "locked project style"}`,
      `personality ${character.personality || "kid-friendly"}`,
      `visual bible ${character.prompt || "preserve the saved hero portrait exactly"}`,
    ].join("; "));

  const sceneLines = scenes
    .slice(-3)
    .map((scene, index) => `Prior scene ${Math.max(1, scenes.length - 2 + index)}: ${scene.title || titleFromPrompt(scene.prompt, "Untitled scene")} | ${scene.prompt || "No prompt saved"} | ${scene.camera || ""} | ${scene.background || ""} | ${scene.mood || ""}`);

  return [
    "Continue the same story sequence instead of restarting the visual design.",
    "Use the reference images as hard anchors for identity, costume, palette, rendering style, lighting language, and overall game art direction.",
    heroLines.join("\n"),
    sceneLines.join("\n"),
  ].filter(Boolean).join("\n");
}

function currentBannerFormData() {
  if (!storyBannerForm) return {};
  const data = Object.fromEntries(new FormData(storyBannerForm).entries());
  data.bannerText = String(data.bannerText || "").trim().slice(0, 180);
  data.bannerStyle = data.bannerStyle || "glass";
  data.uiTheme = data.uiTheme || uiThemeSelect?.value || storyUiKits[0]?.id || "";
  data.uiOverlay = data.uiOverlay || "";
  data.uiButton = data.uiButton || "";
  data.uiOverlaySize = Math.max(32, Math.min(140, Number(data.uiOverlaySize || storyProject.bannerDraft?.uiOverlaySize || storyProject.banner?.uiOverlaySize || 66)));
  data.uiButtonSize = Math.max(8, Math.min(46, Number(data.uiButtonSize || storyProject.bannerDraft?.uiButtonSize || storyProject.banner?.uiButtonSize || 22)));
  data.uiFont = data.uiFont || uiFontSelect?.value || "Inter";
  data.uiTextSize = data.uiTextSize || uiTextSizeSelect?.value || "large";
  data.uiTextColor = data.uiTextColor || uiTextColorSelect?.value || "white";
  data.uiTextAlign = data.uiTextAlign || uiTextAlignSelect?.value || "left";
  data.uiTextWidth = Math.max(24, Math.min(84, Number(data.uiTextWidth || storyProject.bannerDraft?.uiTextWidth || storyProject.banner?.uiTextWidth || 56)));
  data.textX = Number(storyProject.bannerDraft?.textX ?? storyProject.banner?.textX ?? 50);
  data.textY = Number(storyProject.bannerDraft?.textY ?? storyProject.banner?.textY ?? 72);
  data.overlayX = Number(storyProject.bannerDraft?.overlayX ?? storyProject.banner?.overlayX ?? 50);
  data.overlayY = Number(storyProject.bannerDraft?.overlayY ?? storyProject.banner?.overlayY ?? 78);
  data.buttonX = Number(storyProject.bannerDraft?.buttonX ?? storyProject.banner?.buttonX ?? 78);
  data.buttonY = Number(storyProject.bannerDraft?.buttonY ?? storyProject.banner?.buttonY ?? 78);
  return data;
}

function saveBannerConfig(message = "") {
  storyProject.banner = currentBannerFormData();
  delete storyProject.bannerDraft;
  saveStoryProject();
  renderBannerPreview();
  if (message && sceneImageStatus) sceneImageStatus.textContent = message;
}

function renderSceneFormPreview() {
  if (!storySceneForm) return;
  normalizeStoryCharacters();
  const data = currentSceneFormData();
  const draft = storyProject.sceneDraftImages || {};
  const title = titleFromPrompt(data.prompt, "Scene preview");
  const text = data.prompt || "Fill in the scene prompt to preview the moment.";
  const details = [data.camera, data.background, data.mood].filter(Boolean).join(" | ");
  const character = storyProject.characters?.[0] || storyProject.character || storyProject.characterDraft || {};
  const characters = storyProject.characters || [];
  const heroCount = characters.filter((item) => item?.name || item?.prompt).length;
  const inheritedStyle = character.style || "the saved character style";
  const sceneStyle = data.sceneStyle === "inherit" ? inheritedStyle : data.sceneStyle;
  if (sceneStyleLockNote) {
    const continuity = data.lockSceneContinuity ? " Previous scenes and saved hero images will be used as visual anchors." : "";
    sceneStyleLockNote.textContent = data.lockCharacterStyle
      ? `Scene images will lock to: ${sceneStyle || inheritedStyle}${heroCount > 1 ? ` with ${heroCount} heroes` : ""}.${continuity}`
      : `Scene images may use: ${sceneStyle || inheritedStyle}.${continuity}`;
  }
  webScenePreviewTitle.textContent = title;
  webScenePreviewText.textContent = details ? `${text} ${details} | Style: ${sceneStyle}` : `${text} | Style: ${sceneStyle}`;
  setScenePreviewImage("web", draft.webImageDataUrl);
  renderBannerPreview();
}

function renderBannerPreview() {
  const banner = {
    bannerStyle: "glass",
    bannerText: "Write your story question in the Banner UI step.",
    textX: 50,
    textY: 72,
    overlayX: 50,
    overlayY: 78,
    buttonX: 78,
    buttonY: 78,
    uiOverlaySize: 66,
    uiButtonSize: 22,
    uiTextSize: "large",
    uiTextColor: "white",
    uiTextAlign: "left",
    uiTextWidth: 56,
    ...(storyProject.banner || {}),
    ...(storyProject.bannerDraft || {}),
    ...currentBannerFormData(),
  };
  const kit = storyUiKits.find((item) => item.id === banner.uiTheme) || storyUiKits[0] || null;
  const overlayAsset = getKitAsset(kit, banner.uiOverlay);
  const buttonAsset = getKitAsset(kit, banner.uiButton);
  const text = banner.bannerText || "Write your story question in the Banner UI step.";
  [bannerDesignText].forEach((element) => {
    if (!element) return;
    element.textContent = text;
    element.className = overlayAsset
      ? "scene-banner-overlay banner-style-ui-kit-text"
      : `scene-banner-overlay banner-style-${banner.bannerStyle || "glass"}`;
    element.style.left = `${Math.max(8, Math.min(92, Number(banner.textX || 50)))}%`;
    element.style.top = `${Math.max(12, Math.min(88, Number(banner.textY || 72)))}%`;
    element.style.width = `${Math.max(24, Math.min(84, Number(banner.uiTextWidth || 56)))}%`;
    element.style.fontFamily = banner.uiFont || kit?.font || "Inter";
    element.style.textAlign = banner.uiTextAlign || "left";
    element.dataset.size = banner.uiTextSize || "large";
    element.dataset.color = banner.uiTextColor || "white";
  });
  if (uiTextWidthValue) uiTextWidthValue.textContent = `${Math.max(24, Math.min(84, Number(banner.uiTextWidth || 56)))}%`;
  if (uiKitOverlayImage) {
    uiKitOverlayImage.src = overlayAsset?.src || "";
    uiKitOverlayImage.hidden = !overlayAsset;
    uiKitOverlayImage.className = `ui-kit-overlay-image ui-kit-overlay-${overlayAsset?.type || "none"}`;
    if (overlayAsset?.type === "frame") {
      uiKitOverlayImage.style.left = "";
      uiKitOverlayImage.style.top = "";
      uiKitOverlayImage.style.width = "";
    } else {
      uiKitOverlayImage.style.left = `${Math.max(0, Math.min(100, Number(banner.overlayX || 50)))}%`;
      uiKitOverlayImage.style.top = `${Math.max(0, Math.min(100, Number(banner.overlayY || 78)))}%`;
      uiKitOverlayImage.style.width = `${Math.max(32, Math.min(140, Number(banner.uiOverlaySize || 66)))}%`;
    }
  }
  if (uiOverlaySizeValue) uiOverlaySizeValue.textContent = `${Math.max(32, Math.min(140, Number(banner.uiOverlaySize || 66)))}%`;
  if (uiKitButtonImage) {
    uiKitButtonImage.src = buttonAsset?.src || "";
    uiKitButtonImage.hidden = !buttonAsset;
    uiKitButtonImage.style.left = `${Math.max(0, Math.min(100, Number(banner.buttonX || 78)))}%`;
    uiKitButtonImage.style.top = `${Math.max(0, Math.min(100, Number(banner.buttonY || 78)))}%`;
    uiKitButtonImage.style.width = `${Math.max(8, Math.min(46, Number(banner.uiButtonSize || 22)))}%`;
  }
  if (uiButtonSizeValue) uiButtonSizeValue.textContent = `${Math.max(8, Math.min(46, Number(banner.uiButtonSize || 22)))}%`;
  if (bannerDesignPreview) {
    bannerDesignPreview.classList.toggle("has-generated-image", Boolean(storyProject.sceneDraftImages?.webImageDataUrl));
    bannerDesignPreview.classList.toggle("has-ui-kit", Boolean(overlayAsset || buttonAsset));
    const previewScene = storyProject.scenes?.[selectedSceneIndex] || storyProject.scenes?.[0] || {};
    setFrameImageFromStoredValue(bannerDesignPreview, storyProject.sceneDraftImages?.webImageDataUrl || previewScene.webImageDataUrl);
  }
  if (bannerTextCount && bannerTextInput) {
    bannerTextCount.textContent = `${bannerTextInput.value.length} / 180 characters`;
  }
  renderUiKitSceneStack();
}

function setScenePreviewImage(format, imageDataUrl) {
  const frame = document.querySelector(".web-view");
  setFrameImageFromStoredValue(frame, imageDataUrl);
}

function renderUiKitSceneStack() {
  if (!uiKitSceneStack) return;
  const scenes = storyProject.scenes || [];
  uiKitSceneStack.innerHTML = scenes.length
    ? scenes.map((scene, index) => `
      <button class="ui-kit-scene-thumb ${index === selectedSceneIndex ? "is-active" : ""}" type="button" data-ui-scene-index="${index}">
        ${scene.webImageDataUrl ? imageMarkup(scene.webImageDataUrl, `Scene ${index + 1} thumbnail`) : `<span>${index + 1}</span>`}
        <strong>${String(index + 1).padStart(2, "0")}</strong>
      </button>
    `).join("")
    : `<p class="form-note">Saved scene cards will stack here.</p>`;
  hydrateStoryImages(uiKitSceneStack);
}

function bannerPointerPercent(event) {
  if (!bannerDesignPreview || !storyBannerForm) return;
  const rect = bannerDesignPreview.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

function updateBannerLayerPositionFromPointer(event, layer) {
  const point = bannerPointerPercent(event);
  if (!point) return;
  const nextDraft = { ...currentBannerFormData() };
  if (layer === "text") {
    nextDraft.textX = Math.max(8, Math.min(92, point.x));
    nextDraft.textY = Math.max(12, Math.min(88, point.y));
  }
  if (layer === "overlay") {
    nextDraft.overlayX = Math.max(0, Math.min(100, point.x));
    nextDraft.overlayY = Math.max(0, Math.min(100, point.y));
  }
  if (layer === "button") {
    nextDraft.buttonX = Math.max(0, Math.min(100, point.x));
    nextDraft.buttonY = Math.max(0, Math.min(100, point.y));
  }
  storyProject.bannerDraft = nextDraft;
  renderBannerPreview();
}

function openImageLightbox(src, title, filename = "") {
  if (!src || !imageLightbox || !imageLightboxImage || !imageLightboxTitle) return;
  imageLightboxImage.src = src;
  imageLightboxImage.alt = title;
  imageLightboxTitle.textContent = title;
  activeLightboxImageSrc = src;
  activeLightboxDownloadName = filename || downloadFileName(title || "oprealm-scene-card");
  if (imageLightboxDownload) {
    imageLightboxDownload.dataset.imageSrc = src;
    imageLightboxDownload.dataset.downloadName = activeLightboxDownloadName;
    imageLightboxDownload.hidden = false;
  }
  imageLightbox.classList.add("is-open");
  imageLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeImageLightbox() {
  if (!imageLightbox || !imageLightboxImage) return;
  imageLightbox.classList.remove("is-open");
  imageLightbox.setAttribute("aria-hidden", "true");
  imageLightboxImage.removeAttribute("src");
  if (imageLightboxDownload) {
    delete imageLightboxDownload.dataset.imageSrc;
    delete imageLightboxDownload.dataset.downloadName;
    imageLightboxDownload.hidden = true;
  }
  activeLightboxImageSrc = "";
  activeLightboxDownloadName = "oprealm-scene-card.png";
  document.body.classList.remove("lightbox-open");
}

function downloadFileName(value) {
  const clean = String(value || "oprealm-scene-card")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${clean || "oprealm-scene-card"}.png`;
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: match[1] });
}

function submitSceneImageDownload(dataUrl, filename = "oprealm-scene-card.png") {
  if (!dataUrlToBlob(dataUrl)) return false;
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/story-image-download";
  form.target = "_blank";
  form.style.display = "none";

  const filenameInput = document.createElement("input");
  filenameInput.type = "hidden";
  filenameInput.name = "filename";
  filenameInput.value = filename;

  const imageInput = document.createElement("input");
  imageInput.type = "hidden";
  imageInput.name = "imageDataUrl";
  imageInput.value = dataUrl;

  form.append(filenameInput, imageInput);
  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 1000);
  return true;
}

document.addEventListener("click", (event) => {
  const enlargeButton = event.target.closest("[data-enlarge-scene-preview]");
  if (enlargeButton) {
    event.preventDefault();
    const imageSrc = enlargeButton.dataset.imageSrc
      || (enlargeButton.dataset.imageRef ? "" : "");
    const title = enlargeButton.dataset.lightboxTitle || "16:9 scene card preview";
    const filename = enlargeButton.dataset.downloadName || downloadFileName(title);
    if (imageSrc) {
      openImageLightbox(imageSrc, title, filename);
      return;
    }
    if (enlargeButton.dataset.imageRef) {
      loadStoryImage(enlargeButton.dataset.imageRef)
        .then((src) => openImageLightbox(src, title, filename))
        .catch(() => {
          if (sceneImageStatus) sceneImageStatus.textContent = "Could not open that saved scene image.";
        });
    }
    return;
  }

  const downloadButton = event.target.closest("[data-download-scene-image]");
  if (downloadButton) {
    event.preventDefault();
    const filename = downloadButton.dataset.downloadName || "oprealm-scene-card.png";
    if (downloadButton.dataset.downloadSceneImage === "lightbox") {
      const started = submitSceneImageDownload(activeLightboxImageSrc, activeLightboxDownloadName || filename);
      if (!started && sceneImageStatus) sceneImageStatus.textContent = "Could not start that image download.";
      return;
    }
    if (downloadButton.dataset.imageSrc) {
      const started = submitSceneImageDownload(downloadButton.dataset.imageSrc, filename);
      if (!started && sceneImageStatus) sceneImageStatus.textContent = "Could not start that image download.";
      return;
    }
    if (downloadButton.dataset.imageRef) {
      loadStoryImage(downloadButton.dataset.imageRef)
        .then((src) => {
          const started = submitSceneImageDownload(src, filename);
          if (!started && sceneImageStatus) sceneImageStatus.textContent = "Could not start that image download.";
        })
        .catch(() => {
          if (sceneImageStatus) sceneImageStatus.textContent = "Could not download that saved scene image.";
        });
    }
    return;
  }

  if (event.target.closest("[data-close-lightbox]")) {
    closeImageLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeImageLightbox();
});

storyTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchStoryTab(tab.dataset.storyTab);
  });
});

function switchStoryTab(tabName) {
  storyTabs.forEach((item) => item.classList.toggle("is-active", item.dataset.storyTab === tabName));
  storyPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.storyPanel === tabName));
}

toggleStoryMapSize.addEventListener("click", () => {
  storyMapShell.classList.toggle("is-expanded");
  document.body.classList.toggle("story-map-open", storyMapShell.classList.contains("is-expanded"));
  toggleStoryMapSize.textContent = storyMapShell.classList.contains("is-expanded") ? "Minimize Map" : "Expand Map";
});

mapToolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeMapTool = button.dataset.mapTool || "select";
    mapToolButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderStoryDashboard();
  });
});

addSceneOnMapButton.addEventListener("click", addBlankScene);

clearExtraScenesButton.addEventListener("click", () => {
  if (window.confirm("Clear all extra branch scenes and keep only the first scene?")) {
    clearExtraScenes();
  }
});

storyMapBoard.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-scene]");
  if (deleteButton) {
    deleteScene(Number(deleteButton.dataset.deleteScene));
    return;
  }

  const editButton = event.target.closest("[data-edit-scene]");
  if (editButton) {
    selectedSceneIndex = Number(editButton.dataset.editScene);
    renderStoryDashboard();
    selectedSceneTitle.focus();
    return;
  }

  const button = event.target.closest("[data-connect-scene]");
  if (button) {
    if (activeMapTool === "connect") {
      addConnectedScene(Number(button.dataset.connectScene), button.dataset.direction || "right");
    }
    return;
  }

  const node = event.target.closest("[data-scene-index]");
  if (!node) return;
  selectedSceneIndex = Number(node.dataset.sceneIndex);
  renderStoryDashboard();
});

storyMapBoard.addEventListener("pointerdown", (event) => {
  if (activeMapTool !== "move") return;
  if (event.target.closest("button")) return;
  const node = event.target.closest("[data-scene-index]");
  if (!node) return;
  selectedSceneIndex = Number(node.dataset.sceneIndex);
  const scene = storyProject.scenes?.[selectedSceneIndex];
  if (!scene) return;
  const boardRect = storyMapBoard.getBoundingClientRect();
  draggedScene = {
    index: selectedSceneIndex,
    offsetX: event.clientX - boardRect.left - Number(scene.x || 0),
    offsetY: event.clientY - boardRect.top - Number(scene.y || 0),
  };
  node.setPointerCapture(event.pointerId);
  storyMapBoard.querySelectorAll(".story-node").forEach((item) => item.classList.remove("is-selected"));
  node.classList.add("is-selected");
});

storyMapBoard.addEventListener("pointermove", (event) => {
  if (!draggedScene) return;
  const scenes = storyProject.scenes || [];
  const scene = scenes[draggedScene.index];
  if (!scene) return;
  const boardRect = storyMapBoard.getBoundingClientRect();
  scene.x = Math.max(16, Math.min(boardRect.width - 230, event.clientX - boardRect.left - draggedScene.offsetX));
  scene.y = Math.max(16, event.clientY - boardRect.top - draggedScene.offsetY);
  storyProject.scenes = scenes;
  const node = storyMapBoard.querySelector(`[data-scene-index="${draggedScene.index}"]`);
  if (node) {
    node.style.left = `${scene.x}px`;
    node.style.top = `${scene.y}px`;
    node.classList.add("is-selected");
  }
});

function finishDraggingScene() {
  if (!draggedScene) return;
  draggedScene = null;
  saveStoryProject();
  renderStoryDashboard();
}

storyMapBoard.addEventListener("pointerup", finishDraggingScene);
storyMapBoard.addEventListener("pointercancel", finishDraggingScene);
window.addEventListener("pointerup", finishDraggingScene);

routeSourceScene.addEventListener("change", renderChoiceOptions);

updateSelectedSceneButton.addEventListener("click", updateSelectedScene);

deleteSelectedSceneButton.addEventListener("click", () => deleteScene(selectedSceneIndex));

storyRouteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(storyRouteForm).entries());
  addRoute(Number(data.sourceScene), Number(data.choiceIndex), Number(data.targetScene), data.direction);
});

storyCharacterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCharacterFromForm(`Hero ${activeHeroIndex + 1} saved to this story project.`);
});

if (storyBannerForm) {
  storyBannerForm.addEventListener("input", () => {
    storyProject.bannerDraft = currentBannerFormData();
    renderBannerPreview();
  });

  storyBannerForm.addEventListener("change", () => {
    if (uiThemeSelect && document.activeElement === uiThemeSelect) {
      storyProject.bannerDraft = { ...currentBannerFormData(), uiTheme: uiThemeSelect.value, uiOverlay: "", uiButton: "" };
      renderUiKitControls();
    } else {
      storyProject.bannerDraft = currentBannerFormData();
    }
    renderBannerPreview();
  });

  storyBannerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveBannerConfig("Banner style saved to this story project.");
  });
}

[
  [bannerDesignText, "text"],
  [uiKitOverlayImage, "overlay"],
  [uiKitButtonImage, "button"],
].forEach(([element, layer]) => {
  if (!element) return;
  element.addEventListener("pointerdown", (event) => {
    if (element.hidden) return;
    if (element.classList.contains("ui-kit-overlay-frame")) return;
    event.preventDefault();
    draggingBannerLayer = layer;
    element.setPointerCapture(event.pointerId);
    updateBannerLayerPositionFromPointer(event, layer);
  });
  element.addEventListener("pointermove", (event) => {
    if (draggingBannerLayer !== layer) return;
    updateBannerLayerPositionFromPointer(event, layer);
  });
  element.addEventListener("pointerup", () => {
    if (draggingBannerLayer !== layer) return;
    draggingBannerLayer = null;
    saveStoryProject();
  });
  element.addEventListener("pointercancel", () => {
    if (draggingBannerLayer === layer) draggingBannerLayer = null;
  });
});

if (uiKitSceneStack) {
  uiKitSceneStack.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-ui-scene-index]");
    if (!thumb) return;
    selectedSceneIndex = Number(thumb.dataset.uiSceneIndex);
    renderStoryDashboard();
  });
}

if (applyScenePromptToBannerButton && bannerTextInput) {
  applyScenePromptToBannerButton.addEventListener("click", () => {
    const scene = currentSceneFormData();
    bannerTextInput.value = (scene.prompt || "").trim().slice(0, 180);
    storyProject.bannerDraft = currentBannerFormData();
    renderBannerPreview();
  });
}

function saveCharacterFromForm(message) {
  normalizeStoryCharacters();
  const data = currentCharacterFormData();
  const draft = storyProject.characterDrafts?.[activeHeroIndex] || {};
  storyProject.characters[activeHeroIndex] = {
    ...(storyProject.characters[activeHeroIndex] || {}),
    ...draft,
    ...data,
  };
  storyProject.character = storyProject.characters[0] || {};
  storyProject.characterDrafts.splice(activeHeroIndex, 1);
  saveStoryProject();
  renderStoryDashboard();
  if (message) characterImageStatus.textContent = message;
  return data;
}

async function generateCharacterImage({ variation = false } = {}) {
  normalizeStoryCharacters();
  const data = currentCharacterFormData();
  storyProject.characterDrafts[activeHeroIndex] = {
    ...(storyProject.characters[activeHeroIndex] || {}),
    ...(storyProject.characterDrafts[activeHeroIndex] || {}),
    ...data,
  };
  saveStoryProject();
  renderStoryDashboard();

  characterImageStatus.textContent = variation ? "Creating a new character look..." : "Generating your character image...";
  generateCharacterImageButton.disabled = true;
  createCharacterVariationButton.disabled = true;

  try {
    const response = await fetch("/api/story-character-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...data,
        variation,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Character image generation failed.");
    }

    storyProject.characterDrafts[activeHeroIndex] = {
      ...(storyProject.characterDrafts[activeHeroIndex] || {}),
      ...data,
      imageDataUrl: await saveStoryImage(result.imageDataUrl),
    };
    saveStoryProject();
    renderStoryDashboard();
    characterImageStatus.textContent = `${variation ? "New character look created" : "Character image generated"}. Credits used: ${result.creditsUsed}.`;
  } catch (error) {
    characterImageStatus.textContent = error.message || "Could not generate the character image.";
  } finally {
    generateCharacterImageButton.disabled = false;
    createCharacterVariationButton.disabled = false;
  }
}

generateCharacterImageButton.addEventListener("click", () => generateCharacterImage());

saveCharacterPreviewButton.addEventListener("click", () => {
  saveCharacterFromForm(`Hero ${activeHeroIndex + 1} saved to this story project.`);
});

createCharacterVariationButton.addEventListener("click", () => generateCharacterImage({ variation: true }));

if (addSecondHeroButton) {
  addSecondHeroButton.addEventListener("click", () => {
    switchHeroSlot(1);
    characterImageStatus.textContent = "Hero 2 is ready to create. Hero 1 stays locked in your project.";
  });
}

if (clearCharactersButton) {
  clearCharactersButton.addEventListener("click", clearSavedCharacters);
}

if (heroSlotRow) {
  heroSlotRow.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-hero-slot]");
    if (!slot) return;
    switchHeroSlot(Number(slot.dataset.heroSlot));
  });
}

document.querySelectorAll("[data-character-method]").forEach((button) => {
  button.addEventListener("click", () => chooseCharacterMethod(button.dataset.characterMethod));
});

if (characterDrawingInput) {
  characterDrawingInput.addEventListener("change", () => {
    const file = characterDrawingInput.files?.[0];
    if (!file) {
      characterDrawingPreview.innerHTML = "<span>No drawing uploaded yet</span>";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      storyProject.characterDrawingDraft = {
        imageDataUrl: reader.result,
        notes: characterDrawingNotes?.value || "",
        style: characterDrawingStyle?.value || "Fantasy RPG",
      };
      characterDrawingPreview.innerHTML = `<img src="${reader.result}" alt="Uploaded character drawing" />`;
    };
    reader.readAsDataURL(file);
  });
}

if (useDrawingAsPromptButton) {
  useDrawingAsPromptButton.addEventListener("click", () => {
    const notes = characterDrawingNotes?.value?.trim() || "";
    const style = characterDrawingStyle?.value || "Fantasy RPG";
    storyCharacterForm.elements.prompt.value = [
      "Use the uploaded drawing as the core reference for this hero.",
      "Keep the final character recognisable from the drawing: same silhouette, colours, labels, outfit ideas and key details.",
      notes ? `Creator notes: ${notes}` : "",
    ].filter(Boolean).join(" ");
    storyCharacterForm.elements.style.value = style;
    activeCharacterMethod = "prompt";
    renderStoryDashboard();
    characterImageStatus.textContent = "Drawing details copied into the prompt builder. Image-to-image generation comes next.";
  });
}

function clearSceneDraftAndPreview() {
  delete storyProject.sceneDraftImages;
  saveStoryProject();
  renderSceneFormPreview();
}

storySceneForm.addEventListener("input", clearSceneDraftAndPreview);
storySceneForm.addEventListener("change", clearSceneDraftAndPreview);

if (sceneStyleSelect) {
  sceneStyleSelect.addEventListener("change", renderSceneFormPreview);
}

async function generateSceneImages() {
  const data = currentSceneFormData();
  normalizeStoryCharacters();
  const characters = storyProject.characters || [];
  const character = characters[0] || storyProject.character || {};
  const secondCharacter = characters[1] || {};
  const continuity = await buildSceneReferenceBundle();
  const referenceCount = continuity.referenceImages.length;
  sceneImageStatus.textContent = referenceCount
    ? `Generating 16:9 scene card image with ${referenceCount} visual continuity reference${referenceCount === 1 ? "" : "s"}...`
    : "Generating 16:9 scene card image...";
  generateSceneImagesButton.disabled = true;
  recreateSceneImagesButton.disabled = true;

  try {
    const response = await fetch("/api/story-scene-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...data,
        characterName: character.name || "",
        characterPrompt: character.prompt || "",
        characterType: character.type || "",
        characterPersonality: character.personality || "",
        characterStyle: character.style || "",
        characterSafety: character.safety || "",
        secondCharacterName: secondCharacter.name || "",
        secondCharacterPrompt: secondCharacter.prompt || "",
        secondCharacterType: secondCharacter.type || "",
        secondCharacterPersonality: secondCharacter.personality || "",
        secondCharacterStyle: secondCharacter.style || "",
        secondCharacterSafety: secondCharacter.safety || "",
        sceneStyle: data.sceneStyle || "inherit",
        lockCharacterStyle: Boolean(data.lockCharacterStyle),
        lockSceneContinuity: Boolean(data.lockSceneContinuity),
        continuityBrief: continuity.continuityBrief,
        referenceImages: continuity.referenceImages,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Scene image generation failed.");
    }

    storyProject.sceneDraftImages = {
      webImageDataUrl: await saveStoryImage(result.webImageDataUrl),
      sourcePrompt: data.prompt || "",
    };
    saveStoryProject();
    renderSceneFormPreview();
    const modelNote = [result.model, result.quality, result.generationMode].filter(Boolean).join(" / ");
    const referenceNote = Number(result.referenceCount || 0)
      ? ` Used ${result.referenceCount} visual reference${Number(result.referenceCount) === 1 ? "" : "s"}.`
      : "";
    sceneImageStatus.textContent = `Scene image generated${modelNote ? ` with ${modelNote}` : ""}. Credits used: ${result.creditsUsed}.${referenceNote}`;
  } catch (error) {
    sceneImageStatus.textContent = error.message || "Could not generate the scene image.";
  } finally {
    generateSceneImagesButton.disabled = false;
    recreateSceneImagesButton.disabled = false;
  }
}

generateSceneImagesButton.addEventListener("click", generateSceneImages);
recreateSceneImagesButton.addEventListener("click", generateSceneImages);
if (createNextSceneButton) {
  createNextSceneButton.addEventListener("click", resetSceneBuilderForNext);
}
if (clearSceneCardsButton) {
  clearSceneCardsButton.addEventListener("click", clearSceneCards);
}
if (addBannerSceneToMapButton) {
  addBannerSceneToMapButton.addEventListener("click", addSceneFromCurrentPreview);
}

if (bannerPreviewResizer) {
  bannerPreviewResizer.addEventListener("pointerdown", (event) => {
    if (!bannerWorkspace) return;
    event.preventDefault();
    draggingPreviewColumn = true;
    bannerPreviewResizer.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-preview");
    resizeBannerPreviewColumn(event);
  });
  bannerPreviewResizer.addEventListener("pointermove", (event) => {
    if (!draggingPreviewColumn) return;
    resizeBannerPreviewColumn(event);
  });
  bannerPreviewResizer.addEventListener("pointerup", () => {
    if (!draggingPreviewColumn) return;
    draggingPreviewColumn = false;
    document.body.classList.remove("is-resizing-preview");
  });
  bannerPreviewResizer.addEventListener("pointercancel", () => {
    draggingPreviewColumn = false;
    document.body.classList.remove("is-resizing-preview");
  });
}

storySceneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addSceneFromCurrentPreview();
});

characterPromptButton.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(storyCharacterForm).entries());
  navigator.clipboard?.writeText([
    "Create a safe OPREALM AI Story Game character.",
    `Name: ${data.name || "New character"}`,
    `Type: ${data.type}`,
    `Personality: ${data.personality}`,
    `Visual style: ${data.style}`,
    `Safety tone: ${data.safety}`,
    `Prompt: ${data.prompt || "Beginner-friendly pick-a-path hero."}`,
  ].join("\n"));
});

scenePromptButton.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(storySceneForm).entries());
  navigator.clipboard?.writeText([
    "Create a safe OPREALM pick-a-path scene card.",
    `Scene prompt: ${data.prompt || "A new choice moment begins."}`,
    `Camera angle: ${data.camera}`,
    `Background: ${data.background}`,
    `Character: ${data.character}`,
    `Mood: ${data.mood}`,
    `Scene type: ${data.type}`,
    `Choice count: ${data.choices}`,
  ].join("\n"));
});

migrateStoryImagesToIndexedDb()
  .catch((error) => console.error("Story image migration failed", error))
  .finally(() => {
    loadBannerPreviewColumnWidth();
    renderStoryDashboard();
    loadStoryUiKits();
  });
