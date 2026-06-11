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
const bannerScaleInput = document.querySelector("#bannerScaleInput");
const applyScenePromptToBannerButton = document.querySelector("#applyScenePromptToBannerButton");
const addBannerSceneToMapButton = document.querySelector("#addBannerSceneToMapButton");
const imageLightbox = document.querySelector("#imageLightbox");
const imageLightboxImage = document.querySelector("#imageLightboxImage");
const imageLightboxTitle = document.querySelector("#imageLightboxTitle");
const imageLightboxDownload = document.querySelector("[data-download-scene-image='lightbox']");
const checkCharacter = document.querySelector("#checkCharacter");
const checkScenes = document.querySelector("#checkScenes");
const referenceCharacterInput = document.querySelector("#referenceCharacterInput");
const referenceEnvironmentInput = document.querySelector("#referenceEnvironmentInput");
const referenceObjectInput = document.querySelector("#referenceObjectInput");
const referenceCharacterPreview = document.querySelector("#referenceCharacterPreview");
const referenceEnvironmentPreview = document.querySelector("#referenceEnvironmentPreview");
const referenceObjectPreview = document.querySelector("#referenceObjectPreview");
const useSavedCharacterReference = document.querySelector("#useSavedCharacterReference");
const referenceBoardType = document.querySelector("#referenceBoardType");
const referenceVisualStyle = document.querySelector("#referenceVisualStyle");
const referenceProjectTitle = document.querySelector("#referenceProjectTitle");
const referenceBoardPrompt = document.querySelector("#referenceBoardPrompt");
const generateReferenceBoardButton = document.querySelector("#generateReferenceBoardButton");
const clearReferenceBoardButton = document.querySelector("#clearReferenceBoardButton");
const referenceBoardStatus = document.querySelector("#referenceBoardStatus");
const referenceBoardPreview = document.querySelector("#referenceBoardPreview");
const referenceBoardList = document.querySelector("#referenceBoardList");
const enlargeReferenceBoardButton = document.querySelector("#enlargeReferenceBoardButton");
const downloadReferenceBoardButton = document.querySelector("#downloadReferenceBoardButton");

let storyProject = loadStoryProject();
let selectedSceneIndex = 0;
let activeHeroIndex = 0;
let activeCharacterMethod = "chooser";
let activeMapTool = "select";
let draggedScene = null;
let activeLightboxImageSrc = "";
let activeLightboxDownloadName = "oprealm-scene-card.png";
const referenceSourceImages = {
  character: "",
  environment: "",
  object: "",
};
const STORY_IMAGE_REF_PREFIX = "story-image:";

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
  for (const board of storyProject.referenceBoards || []) {
    if (board.imageDataUrl?.startsWith?.("data:image/")) {
      board.imageDataUrl = await saveStoryImage(board.imageDataUrl);
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
  const characterImage = previewCharacter.imageDataUrl || "";
  const characterImageTitle = previewCharacter.name ? `${previewCharacter.name} character image` : `Hero ${activeHeroIndex + 1} character image`;
  const characterDownloadName = downloadFileName(characterImageTitle);
  const characterImageActionAttrs = characterImage.startsWith(STORY_IMAGE_REF_PREFIX)
    ? `data-image-ref="${escapeHtml(characterImage)}"`
    : `data-image-src="${escapeHtml(characterImage)}"`;
  characterImageFrame.innerHTML = characterImage
    ? `
      ${imageMarkup(characterImage, characterImageTitle)}
      <button class="scene-enlarge-button character-image-action" type="button" data-enlarge-scene-preview="character" ${characterImageActionAttrs} data-lightbox-title="${escapeHtml(characterImageTitle)}" data-download-name="${escapeHtml(characterDownloadName)}">Enlarge</button>
      <button class="scene-image-download-button character-image-action" type="button" data-download-scene-image="character" ${characterImageActionAttrs} data-download-name="${escapeHtml(characterDownloadName)}" aria-label="Download character image">&#8595;</button>
    `
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
              <strong>${escapeHtml(scene.title)} ${index === 0 ? `<em class="locked-scene-label">Opening scene locked</em>` : ""}</strong>
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
                <em>${index === 0 ? "Opening scene" : "16:9 scene card ready"}</em>
                ${scene.banner?.bannerText ? `<em>game artist banner ready</em>` : ""}
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
            <span>${index === 0 ? "Locked Start" : `Scene ${index + 1}`}</span>
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
    storyBannerForm.elements.bannerScale.value = banner.bannerScale || "100";
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
  renderReferenceForge();
  renderSceneFormPreview();
  renderBannerPreview();
  hydrateStoryImages();
}

function renderReferenceForge() {
  renderReferenceSource("character", referenceCharacterPreview, "Use saved hero or upload");
  renderReferenceSource("environment", referenceEnvironmentPreview, "Upload world or scene");
  renderReferenceSource("object", referenceObjectPreview, "Upload prop or item");

  const boards = storyProject.referenceBoards || [];
  const latest = boards[0];
  if (referenceBoardPreview) {
    referenceBoardPreview.innerHTML = latest?.imageDataUrl
      ? imageMarkup(latest.imageDataUrl, latest.title || "OPREALM reference board")
      : "<span>No board generated yet</span>";
  }
  if (enlargeReferenceBoardButton) {
    enlargeReferenceBoardButton.hidden = !latest?.imageDataUrl;
    enlargeReferenceBoardButton.dataset.imageRef = latest?.imageDataUrl || "";
    enlargeReferenceBoardButton.dataset.lightboxTitle = latest?.title || "OPREALM reference board";
    enlargeReferenceBoardButton.dataset.downloadName = downloadFileName(latest?.title || "oprealm-reference-board");
  }
  if (downloadReferenceBoardButton) {
    downloadReferenceBoardButton.hidden = !latest?.imageDataUrl;
    downloadReferenceBoardButton.dataset.imageRef = latest?.imageDataUrl || "";
    downloadReferenceBoardButton.dataset.downloadName = downloadFileName(latest?.title || "oprealm-reference-board");
  }
  if (referenceBoardList) {
    referenceBoardList.innerHTML = boards.length
      ? boards.map((board, index) => `
        <article class="reference-board-chip">
          ${board.imageDataUrl ? imageMarkup(board.imageDataUrl, board.title || "Saved reference board") : ""}
          <div>
            <strong>${escapeHtml(board.title || "Reference Board")}</strong>
            <span>${escapeHtml(board.typeLabel || "Story reference")} &middot; ${escapeHtml(board.style || "Matched style")}</span>
          </div>
          <button type="button" data-open-reference-board="${index}">Open</button>
        </article>
      `).join("")
      : `<article class="reference-board-chip empty"><strong>No saved boards yet</strong><span>Create one to lock characters, locations, objects or shot planning.</span></article>`;
  }
  hydrateStoryImages(referenceBoardList || document);
  hydrateStoryImages(referenceBoardPreview || document);
}

function renderReferenceSource(key, frame, emptyText) {
  if (!frame) return;
  const value = referenceSourceImages[key];
  frame.innerHTML = value
    ? `<img src="${value}" alt="${key} reference source" /><em>${key}</em>`
    : `<span>${emptyText}</span>`;
  frame.classList.toggle("has-reference", Boolean(value));
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
    const lockedOpening = index === 0;
    const nextScene = {
      ...scene,
      ...(lockedOpening
        ? {
          isOpeningScene: true,
          locked: true,
          type: "Start scene",
          x: 40,
          y: 40,
        }
        : {
          x: typeof scene.x === "number" ? scene.x : 40 + (index % 3) * 260,
          y: typeof scene.y === "number" ? scene.y : 40 + Math.floor(index / 3) * 190,
        }),
    };
    if (
      nextScene.x !== scene.x ||
      nextScene.y !== scene.y ||
      nextScene.isOpeningScene !== scene.isOpeningScene ||
      nextScene.locked !== scene.locked ||
      nextScene.type !== scene.type
    ) {
      changed = true;
    }
    return nextScene;
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
  selectedSceneLabel.textContent = hasScene
    ? selectedSceneIndex === 0 ? "Editing Locked Opening Scene" : `Editing Scene ${selectedSceneIndex + 1}`
    : "Select a scene card";
  selectedSceneTitle.value = scene?.title || "";
  selectedScenePrompt.value = scene?.prompt || "";
  selectedSceneType.value = selectedSceneIndex === 0 ? "Start scene" : scene?.type || "Choice moment";
  selectedSceneChoices.value = scene?.choices || "2 choices";
  [selectedSceneTitle, selectedScenePrompt, selectedSceneType, selectedSceneChoices, updateSelectedSceneButton, deleteSelectedSceneButton].forEach((field) => {
    field.disabled = !hasScene;
  });
  selectedSceneType.disabled = !hasScene || selectedSceneIndex === 0;
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
  const nextIndex = scenes.length;
  scenes.push({
    title: nextIndex ? `Scene ${nextIndex + 1}` : "Opening Scene",
    prompt: nextIndex ? "Describe what happens in this scene." : "Describe the first moment players see.",
    camera: "Wide cinematic reveal",
    background: "Custom background",
    character: "Use saved character",
    mood: "Curious",
    type: nextIndex ? "Choice moment" : "Start scene",
    choices: "2 choices",
    x: nextIndex ? 60 + (nextIndex % 3) * 270 : 40,
    y: nextIndex ? 60 + Math.floor(nextIndex / 3) * 190 : 40,
    isOpeningScene: nextIndex === 0,
    locked: nextIndex === 0,
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
  const scenes = storyProject.scenes || [];
  const hasOpeningScene = Boolean(scenes[0]);
  const message = hasOpeningScene
    ? "Clear all branch scenes and keep the locked opening scene?"
    : "Clear all saved scene cards from this story project? Characters and game text banners will stay saved.";
  if (!window.confirm(message)) return;
  storyProject.scenes = hasOpeningScene
    ? [{ ...scenes[0], routes: [], isOpeningScene: true, locked: true, type: "Start scene", x: 40, y: 40 }]
    : [];
  delete storyProject.sceneDraftImages;
  delete storyProject.bannerDraft;
  selectedSceneIndex = 0;
  storySceneForm.reset();
  if (storyBannerForm) storyBannerForm.reset();
  saveStoryProject();
  renderStoryDashboard();
  switchStoryTab("scene");
  sceneImageStatus.textContent = hasOpeningScene
    ? "Branch scenes cleared. Your locked opening scene was kept."
    : "Saved scene cards cleared. Characters were left untouched.";
}

function addSceneFromCurrentPreview({ stayOnSceneTab = true, prepareNext = false } = {}) {
  const data = currentSceneFormData();
  const banner = currentBannerFormData();
  const draftImages = storyProject.sceneDraftImages || {};
  const scenes = storyProject.scenes || [];
  const nextIndex = scenes.length;
  const isOpeningScene = nextIndex === 0;
  scenes.push({
    ...data,
    ...draftImages,
    banner,
    title: titleFromPrompt(data.prompt, isOpeningScene ? "Opening Scene" : `Scene ${nextIndex + 1}`),
    type: isOpeningScene ? "Start scene" : data.type,
    isOpeningScene,
    locked: isOpeningScene,
    routes: [],
    x: isOpeningScene ? 40 : 60 + (nextIndex % 3) * 270,
    y: isOpeningScene ? 40 : 60 + Math.floor(nextIndex / 3) * 190,
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
  const isOpeningScene = selectedSceneIndex === 0;
  scenes[selectedSceneIndex] = {
    ...scene,
    title: selectedSceneTitle.value.trim() || scene.title,
    prompt: selectedScenePrompt.value.trim() || scene.prompt,
    type: isOpeningScene ? "Start scene" : selectedSceneType.value,
    choices: selectedSceneChoices.value,
    isOpeningScene,
    locked: isOpeningScene || scene.locked,
    x: isOpeningScene ? 40 : scene.x,
    y: isOpeningScene ? 40 : scene.y,
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
  const previousScene = scenes[scenes.length - 1];
  if (previousScene?.webImageDataUrl && previousScene !== scenes[0]) {
    await addReference(`Previous approved scene ${scenes.length}`, previousScene.webImageDataUrl);
  }
  if (scenes[0]?.webImageDataUrl) {
    await addReference("Scene 1 style anchor", scenes[0].webImageDataUrl);
  }
  await addReference("Latest OPREALM reference board", storyProject.referenceBoards?.[0]?.imageDataUrl);

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

  const boardLines = (storyProject.referenceBoards || [])
    .slice(0, 3)
    .map((board, index) => `Reference board ${index + 1}: ${board.typeLabel || "Reference Board"} | ${board.title || "Untitled"} | style ${board.style || "locked project style"} | direction ${board.prompt || "preserve this board as the visual source of truth"}`);

  return [
    "Continue the same story sequence instead of restarting the visual design.",
    "Use the reference images as hard anchors for identity, costume, palette, rendering style, lighting language, and overall game art direction.",
    "The original locked hero portrait is the highest authority for face, hair, body, outfit construction, exact garment color placement, pockets, patches, seams, trim, armor panels and accessories. Later scenes must not overwrite or gradually drift from it.",
    "Treat clothing as a fixed production model sheet: preserve every visible color block, material boundary, pattern, pocket, patch, zipper, buckle, strap, fastener, emblem-free panel, sleeve detail and left/right placement. Do not simplify, recolor, add, remove, mirror or relocate those details.",
    heroLines.join("\n"),
    boardLines.join("\n"),
    sceneLines.join("\n"),
  ].filter(Boolean).join("\n");
}

function currentBannerFormData() {
  if (!storyBannerForm) return {};
  const data = Object.fromEntries(new FormData(storyBannerForm).entries());
  data.bannerText = String(data.bannerText || "").trim().slice(0, 140);
  data.bannerStyle = "artist";
  data.bannerScale = String(Math.max(75, Math.min(115, Number(data.bannerScale || 100))));
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
    const continuity = data.lockSceneContinuity
      ? " Saved portraits and approved scenes will lock exact clothing colours, pockets, patches, patterns, trim, accessories and left/right placement."
      : "";
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
    bannerStyle: "artist",
    bannerScale: "100",
    bannerText: "Write your story question in the Banner UI step.",
    ...(storyProject.banner || {}),
    ...(storyProject.bannerDraft || {}),
    ...currentBannerFormData(),
  };
  const text = banner.bannerText || "Write your story question in the Banner UI step.";
  [bannerDesignText].forEach((element) => {
    if (!element) return;
    element.textContent = text;
    element.className = "scene-banner-overlay artist-game-banner";
    const length = text.length;
    const fontScale = length > 120 ? 0.76 : length > 95 ? 0.84 : length > 70 ? 0.92 : 1;
    element.style.setProperty("--banner-scale", `${Number(banner.bannerScale || 100) / 100}`);
    element.style.setProperty("--banner-font-scale", String(fontScale));
  });
  if (bannerDesignPreview) {
    bannerDesignPreview.classList.toggle("has-generated-image", Boolean(storyProject.sceneDraftImages?.webImageDataUrl));
  }
  if (bannerTextCount && bannerTextInput) {
    bannerTextCount.textContent = `${bannerTextInput.value.length} / 140 characters`;
  }
  if (bannerScaleInput && bannerScaleInput.value !== String(banner.bannerScale || "100")) {
    bannerScaleInput.value = banner.bannerScale || "100";
  }
}

function setScenePreviewImage(format, imageDataUrl) {
  const frame = document.querySelector(".web-view");
  setFrameImageFromStoredValue(frame, imageDataUrl);
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
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "oprealm-scene-card.png";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
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
    const statusTarget = downloadButton.dataset.downloadSceneImage === "character" ? characterImageStatus : sceneImageStatus;
    const filename = downloadButton.dataset.downloadName || "oprealm-scene-card.png";
    if (downloadButton.dataset.downloadSceneImage === "lightbox") {
      const started = submitSceneImageDownload(activeLightboxImageSrc, activeLightboxDownloadName || filename);
      if (!started && statusTarget) statusTarget.textContent = "Could not start that image download.";
      return;
    }
    if (downloadButton.dataset.imageSrc) {
      const started = submitSceneImageDownload(downloadButton.dataset.imageSrc, filename);
      if (!started && statusTarget) statusTarget.textContent = "Could not start that image download.";
      return;
    }
    if (downloadButton.dataset.imageRef) {
      loadStoryImage(downloadButton.dataset.imageRef)
        .then((src) => {
          const started = submitSceneImageDownload(src, filename);
          if (!started && statusTarget) statusTarget.textContent = "Could not start that image download.";
        })
        .catch(() => {
          if (statusTarget) statusTarget.textContent = "Could not download that saved image.";
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
  if (selectedSceneIndex === 0) {
    renderStoryDashboard();
    return;
  }
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
    storyProject.bannerDraft = currentBannerFormData();
    renderBannerPreview();
  });

  storyBannerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveBannerConfig("Game text banner saved to this story project.");
  });
}

if (applyScenePromptToBannerButton && bannerTextInput) {
  applyScenePromptToBannerButton.addEventListener("click", () => {
    const scene = currentSceneFormData();
    bannerTextInput.value = (scene.prompt || "").trim().slice(0, 140);
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
    const result = await parseApiJson(response, "reference board generator");
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToReferenceDataUrl(file) {
  const original = await fileToDataUrl(file);
  if (!/^data:image\//i.test(original)) return original;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || maxSide, image.naturalHeight || maxSide));
      if (scale >= 1 && file.size < 1400000) {
        resolve(original);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((image.naturalWidth || maxSide) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || maxSide) * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    image.onerror = () => resolve(original);
    image.src = original;
  });
}

async function setReferenceSourceFromFile(key, input, statusText) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    if (referenceBoardStatus) referenceBoardStatus.textContent = "Please upload a PNG, JPG or WebP image.";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    if (referenceBoardStatus) referenceBoardStatus.textContent = "That image is too large. Please use an image under 12 MB.";
    return;
  }
  if (referenceBoardStatus) referenceBoardStatus.textContent = "Preparing reference image...";
  referenceSourceImages[key] = await fileToReferenceDataUrl(file);
  if (referenceBoardStatus) referenceBoardStatus.textContent = statusText;
  renderReferenceForge();
}

async function useSavedHeroAsReference() {
  normalizeStoryCharacters();
  const hero = storyProject.characters?.[activeHeroIndex] || storyProject.characters?.[0] || storyProject.characterDrafts?.[activeHeroIndex] || storyProject.characterDrafts?.[0] || {};
  const image = await loadStoryImage(hero.imageDataUrl);
  if (!image) {
    if (referenceBoardStatus) referenceBoardStatus.textContent = "Save or generate a hero image first, then use it as a reference.";
    return;
  }
  referenceSourceImages.character = image;
  if (referenceProjectTitle && !referenceProjectTitle.value) referenceProjectTitle.value = storyProject.cover?.title || `${hero.name || "Hero"} Story`;
  if (referenceBoardPrompt && !referenceBoardPrompt.value) {
    referenceBoardPrompt.value = `Lock ${hero.name || "the saved hero"} so future story, comic and trailer scenes keep the same face, outfit, colours and style.`;
  }
  if (referenceBoardStatus) referenceBoardStatus.textContent = "Saved hero loaded into Source 1.";
  renderReferenceForge();
}

function currentReferenceImages() {
  const images = [];
  if (referenceSourceImages.character) images.push({ label: "Character source", imageDataUrl: referenceSourceImages.character });
  if (referenceSourceImages.environment) images.push({ label: "Environment source", imageDataUrl: referenceSourceImages.environment });
  if (referenceSourceImages.object) images.push({ label: "Object source", imageDataUrl: referenceSourceImages.object });
  return images;
}

async function generateReferenceBoard() {
  if (!generateReferenceBoardButton) return;
  const referenceImages = currentReferenceImages();
  if (!referenceImages.length && !referenceBoardPrompt?.value.trim()) {
    referenceBoardStatus.textContent = "Add at least one image or write a reference note first.";
    return;
  }

  const boardType = referenceBoardType?.value || "character";
  const typeLabel = referenceBoardType?.selectedOptions?.[0]?.textContent || "Reference Board";
  generateReferenceBoardButton.disabled = true;
  referenceBoardStatus.textContent = `Generating ${typeLabel.toLowerCase()} from ${referenceImages.length} source image${referenceImages.length === 1 ? "" : "s"}...`;

  try {
    normalizeStoryCharacters();
    const hero = storyProject.characters?.[0] || {};
    const response = await fetch("/api/story-reference-board", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        boardType,
        projectTitle: referenceProjectTitle?.value || storyProject.cover?.title || hero.name || "Untitled OPREALM Story",
        visualStyle: referenceVisualStyle?.value || hero.style || "Premium kid-safe cinematic game art",
        prompt: referenceBoardPrompt?.value || "",
        characterBrief: hero.prompt || "",
        environmentBrief: referenceSourceImages.environment ? "Use the environment source image as the repeating world and atmosphere anchor." : "",
        objectBrief: referenceSourceImages.object ? "Use the object source image as the repeating prop or important item anchor." : "",
        referenceImages,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Reference board generation failed.");

    const savedImage = await saveStoryImage(result.imageDataUrl);
    const board = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      title: `${typeLabel} - ${referenceProjectTitle?.value || hero.name || "OPREALM Story"}`,
      type: boardType,
      typeLabel,
      style: referenceVisualStyle?.value || hero.style || "Matched style",
      prompt: referenceBoardPrompt?.value || "",
      imageDataUrl: savedImage,
      createdAt: new Date().toISOString(),
    };
    storyProject.referenceBoards = [board, ...(storyProject.referenceBoards || [])].slice(0, 12);
    saveStoryProject();
    renderStoryDashboard();
    referenceBoardStatus.textContent = `${typeLabel} generated. Credits used: ${result.creditsUsed}.`;
  } catch (error) {
    referenceBoardStatus.textContent = error.message || "Could not generate the reference board.";
  } finally {
    generateReferenceBoardButton.disabled = false;
  }
}

function clearReferenceSources() {
  referenceSourceImages.character = "";
  referenceSourceImages.environment = "";
  referenceSourceImages.object = "";
  if (referenceCharacterInput) referenceCharacterInput.value = "";
  if (referenceEnvironmentInput) referenceEnvironmentInput.value = "";
  if (referenceObjectInput) referenceObjectInput.value = "";
  if (referenceBoardStatus) referenceBoardStatus.textContent = "Sources cleared. Saved boards were kept.";
  renderReferenceForge();
}

if (referenceCharacterInput) {
  referenceCharacterInput.addEventListener("change", () => setReferenceSourceFromFile("character", referenceCharacterInput, "Character source loaded."));
}
if (referenceEnvironmentInput) {
  referenceEnvironmentInput.addEventListener("change", () => setReferenceSourceFromFile("environment", referenceEnvironmentInput, "Environment source loaded."));
}
if (referenceObjectInput) {
  referenceObjectInput.addEventListener("change", () => setReferenceSourceFromFile("object", referenceObjectInput, "Object source loaded."));
}
if (useSavedCharacterReference) useSavedCharacterReference.addEventListener("click", useSavedHeroAsReference);
if (generateReferenceBoardButton) generateReferenceBoardButton.addEventListener("click", generateReferenceBoard);
if (clearReferenceBoardButton) clearReferenceBoardButton.addEventListener("click", clearReferenceSources);
if (enlargeReferenceBoardButton) {
  enlargeReferenceBoardButton.addEventListener("click", async () => {
    const src = await loadStoryImage(enlargeReferenceBoardButton.dataset.imageRef);
    if (src) openImageLightbox(src, enlargeReferenceBoardButton.dataset.lightboxTitle || "OPREALM reference board", enlargeReferenceBoardButton.dataset.downloadName);
  });
}
if (downloadReferenceBoardButton) {
  downloadReferenceBoardButton.addEventListener("click", async () => {
    const src = await loadStoryImage(downloadReferenceBoardButton.dataset.imageRef);
    if (!submitSceneImageDownload(src, downloadReferenceBoardButton.dataset.downloadName || "oprealm-reference-board.png") && referenceBoardStatus) {
      referenceBoardStatus.textContent = "Could not download that reference board.";
    }
  });
}
if (referenceBoardList) {
  referenceBoardList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-open-reference-board]");
    if (!button) return;
    const board = storyProject.referenceBoards?.[Number(button.dataset.openReferenceBoard)];
    const src = await loadStoryImage(board?.imageDataUrl);
    if (src) openImageLightbox(src, board.title || "OPREALM reference board", downloadFileName(board.title || "oprealm-reference-board"));
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
    const result = await parseApiJson(response, "scene image generator");
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

async function parseApiJson(response, label = "OPRealm service") {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    const cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const detail = cleanText ? ` Response started with: ${cleanText.slice(0, 120)}` : "";
    throw new Error(`The ${label} returned a website page instead of data. Please deploy the latest OPRealm Functions and try again.${detail}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The ${label} returned unreadable data. Please try again.`);
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
  .finally(renderStoryDashboard);
