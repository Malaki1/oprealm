const storyTabs = document.querySelectorAll("[data-story-tab]");
const storyPanels = document.querySelectorAll("[data-story-panel]");
const storyCharacterForm = document.querySelector("#storyCharacterForm");
const storySceneForm = document.querySelector("#storySceneForm");
const characterPromptButton = document.querySelector("#characterPromptButton");
const scenePromptButton = document.querySelector("#scenePromptButton");
const generateSceneImagesButton = document.querySelector("#generateSceneImagesButton");
const sceneImageStatus = document.querySelector("#sceneImageStatus");
const addPreviewToMapButton = document.querySelector("#addPreviewToMapButton");
const recreateSceneImagesButton = document.querySelector("#recreateSceneImagesButton");
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
const mobileScenePreviewTitle = document.querySelector("#mobileScenePreviewTitle");
const mobileScenePreviewText = document.querySelector("#mobileScenePreviewText");
const webScenePreviewTitle = document.querySelector("#webScenePreviewTitle");
const webScenePreviewText = document.querySelector("#webScenePreviewText");
const sceneStyleSelect = document.querySelector("#sceneStyleSelect");
const sceneStyleLockNote = document.querySelector("#sceneStyleLockNote");
const imageLightbox = document.querySelector("#imageLightbox");
const imageLightboxImage = document.querySelector("#imageLightboxImage");
const imageLightboxTitle = document.querySelector("#imageLightboxTitle");
const checkCharacter = document.querySelector("#checkCharacter");
const checkScenes = document.querySelector("#checkScenes");

let storyProject = loadStoryProject();
let selectedSceneIndex = 0;
let activeMapTool = "select";
let draggedScene = null;
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
  if (storyProject.sceneDraftImages?.mobileImageDataUrl?.startsWith?.("data:image/")) {
    storyProject.sceneDraftImages.mobileImageDataUrl = await saveStoryImage(storyProject.sceneDraftImages.mobileImageDataUrl);
    changed = true;
  }
  if (storyProject.sceneDraftImages?.webImageDataUrl?.startsWith?.("data:image/")) {
    storyProject.sceneDraftImages.webImageDataUrl = await saveStoryImage(storyProject.sceneDraftImages.webImageDataUrl);
    changed = true;
  }
  for (const scene of storyProject.scenes || []) {
    if (scene.mobileImageDataUrl?.startsWith?.("data:image/")) {
      scene.mobileImageDataUrl = await saveStoryImage(scene.mobileImageDataUrl);
      changed = true;
    }
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
  renderStoryDashboard();
}

function renderStoryDashboard() {
  const character = storyProject.character || {};
  const characterDraft = storyProject.characterDraft || null;
  const previewCharacter = characterDraft || character;
  const scenes = ensureSceneLayout(storyProject.scenes || []);
  if (selectedSceneIndex >= scenes.length) selectedSceneIndex = Math.max(scenes.length - 1, 0);

  characterPreviewStatus.textContent = characterDraft ? "Generated character draft" : "Saved character";
  characterPreviewName.textContent = previewCharacter.name || "No character yet";
  characterPreviewBody.textContent = previewCharacter.prompt || "Add a character to begin the AI Story Game flow.";
  characterPreviewType.textContent = previewCharacter.type || "Type";
  characterPreviewStyle.textContent = previewCharacter.style || "Style";
  characterImageFrame.innerHTML = previewCharacter.imageDataUrl
    ? imageMarkup(previewCharacter.imageDataUrl, previewCharacter.name || "Generated story character")
    : "<span>No image yet</span>";
  createCharacterVariationButton.disabled = !previewCharacter.name && !previewCharacter.prompt;

  sceneCardList.innerHTML = scenes.length
    ? scenes
      .map(
        (scene, index) => `
          <article class="scene-card">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(scene.title)}</strong>
              ${scene.mobileImageDataUrl || scene.webImageDataUrl ? `
                <div class="scene-card-thumbs">
                  ${scene.mobileImageDataUrl ? imageMarkup(scene.mobileImageDataUrl, `${scene.title} mobile preview`) : ""}
                  ${scene.webImageDataUrl ? imageMarkup(scene.webImageDataUrl, `${scene.title} web preview`) : ""}
                </div>
              ` : ""}
              <p>${escapeHtml(scene.prompt)}</p>
              <small>${escapeHtml(scene.camera)} - ${escapeHtml(scene.background)} - ${escapeHtml(scene.type)}</small>
              <div class="scene-format-row">
                <em>9:16 mobile ready</em>
                <em>16:9 web ready</em>
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

  const firstScene = scenes[0];
  storyPreviewTitle.textContent = firstScene?.title || "Your story will appear here";
  storyPreviewText.textContent = firstScene?.prompt || "Create a character and at least one scene card to preview the pick-a-path flow.";
  storyPreviewChoices.innerHTML = firstScene
    ? Array.from({ length: choiceCountForScene(firstScene) }, (_, index) => `<button class="button button-secondary" type="button">${choiceLabel(index)}</button>`).join("")
    : "";

  checkCharacter.textContent = character.name ? "Ready" : "Not ready yet";
  checkScenes.textContent = scenes.length >= 3 ? "Ready for preview" : `Add ${Math.max(3 - scenes.length, 0)} more scene card${3 - scenes.length === 1 ? "" : "s"}`;
  renderSceneFormPreview();
  hydrateStoryImages();
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

function addSceneFromCurrentPreview() {
  const data = currentSceneFormData();
  const draftImages = storyProject.sceneDraftImages || {};
  const scenes = storyProject.scenes || [];
  const nextIndex = scenes.length;
  scenes.push({
    ...data,
    ...draftImages,
    title: titleFromPrompt(data.prompt, nextIndex ? `Scene ${nextIndex + 1}` : "Start Scene"),
    routes: [],
    x: 60 + (nextIndex % 3) * 270,
    y: 60 + Math.floor(nextIndex / 3) * 190,
  });
  storyProject.scenes = scenes;
  delete storyProject.sceneDraftImages;
  selectedSceneIndex = scenes.length - 1;
  saveStoryProject();
  storySceneForm.reset();
  renderStoryDashboard();
  switchStoryTab("map");
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

function currentSceneFormData() {
  const data = Object.fromEntries(new FormData(storySceneForm).entries());
  data.lockCharacterStyle = Boolean(new FormData(storySceneForm).get("lockCharacterStyle"));
  return data;
}

function renderSceneFormPreview() {
  if (!storySceneForm) return;
  const data = currentSceneFormData();
  const draft = storyProject.sceneDraftImages || {};
  const title = titleFromPrompt(data.prompt, "Scene preview");
  const text = data.prompt || "Fill in the scene prompt to preview the moment.";
  const details = [data.camera, data.background, data.mood].filter(Boolean).join(" | ");
  const character = storyProject.character || storyProject.characterDraft || {};
  const inheritedStyle = character.style || "the saved character style";
  const sceneStyle = data.sceneStyle === "inherit" ? inheritedStyle : data.sceneStyle;
  if (sceneStyleLockNote) {
    sceneStyleLockNote.textContent = data.lockCharacterStyle
      ? `Scene images will lock to: ${sceneStyle || inheritedStyle}.`
      : `Scene images may use: ${sceneStyle || inheritedStyle}.`;
  }
  mobileScenePreviewTitle.textContent = title;
  mobileScenePreviewText.textContent = details ? `${text} ${details} | Style: ${sceneStyle}` : `${text} | Style: ${sceneStyle}`;
  webScenePreviewTitle.textContent = title;
  webScenePreviewText.textContent = details ? `${text} ${details} | Style: ${sceneStyle}` : `${text} | Style: ${sceneStyle}`;
  setScenePreviewImage("mobile", draft.mobileImageDataUrl);
  setScenePreviewImage("web", draft.webImageDataUrl);
}

function setScenePreviewImage(format, imageDataUrl) {
  const frame = document.querySelector(format === "mobile" ? ".mobile-view" : ".web-view");
  setFrameImageFromStoredValue(frame, imageDataUrl);
}

function openImageLightbox(src, title) {
  if (!src || !imageLightbox || !imageLightboxImage || !imageLightboxTitle) return;
  imageLightboxImage.src = src;
  imageLightboxImage.alt = title;
  imageLightboxTitle.textContent = title;
  imageLightbox.classList.add("is-open");
  imageLightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeImageLightbox() {
  if (!imageLightbox || !imageLightboxImage) return;
  imageLightbox.classList.remove("is-open");
  imageLightbox.setAttribute("aria-hidden", "true");
  imageLightboxImage.removeAttribute("src");
  document.body.classList.remove("lightbox-open");
}

document.addEventListener("click", (event) => {
  const enlargeButton = event.target.closest("[data-enlarge-scene-preview]");
  if (enlargeButton) {
    const format = enlargeButton.dataset.enlargeScenePreview;
    const title = format === "mobile" ? "Mobile 9:16 scene preview" : "Web 16:9 scene preview";
    openImageLightbox(enlargeButton.dataset.imageSrc, title);
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
  saveCharacterFromForm("Character saved to this story project.");
});

function saveCharacterFromForm(message) {
  const data = currentCharacterFormData();
  const draft = storyProject.characterDraft || {};
  storyProject.character = {
    ...(storyProject.character || {}),
    ...draft,
    ...data,
  };
  delete storyProject.characterDraft;
  saveStoryProject();
  renderStoryDashboard();
  if (message) characterImageStatus.textContent = message;
  return data;
}

async function generateCharacterImage({ variation = false } = {}) {
  const data = currentCharacterFormData();
  storyProject.characterDraft = {
    ...(storyProject.character || {}),
    ...(storyProject.characterDraft || {}),
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

    storyProject.characterDraft = {
      ...(storyProject.characterDraft || {}),
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
  saveCharacterFromForm("Character saved to this story project.");
});

createCharacterVariationButton.addEventListener("click", () => generateCharacterImage({ variation: true }));

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
  const character = storyProject.character || {};
  sceneImageStatus.textContent = "Generating mobile and web scene images...";
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
        sceneStyle: data.sceneStyle || "inherit",
        lockCharacterStyle: Boolean(data.lockCharacterStyle),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Scene image generation failed.");
    }

    storyProject.sceneDraftImages = {
      mobileImageDataUrl: await saveStoryImage(result.mobileImageDataUrl),
      webImageDataUrl: await saveStoryImage(result.webImageDataUrl),
      sourcePrompt: data.prompt || "",
    };
    saveStoryProject();
    renderSceneFormPreview();
    sceneImageStatus.textContent = `Scene images generated. Credits used: ${result.creditsUsed}.`;
  } catch (error) {
    sceneImageStatus.textContent = error.message || "Could not generate scene images.";
  } finally {
    generateSceneImagesButton.disabled = false;
    recreateSceneImagesButton.disabled = false;
  }
}

generateSceneImagesButton.addEventListener("click", generateSceneImages);
recreateSceneImagesButton.addEventListener("click", generateSceneImages);
addPreviewToMapButton.addEventListener("click", addSceneFromCurrentPreview);

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
