const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";
const REALM_SPARK_OUTPUT_KEY = window.OPREALMRealmSpark?.STORAGE?.output || "oprealm_realm_spark_output_v1";

const worldState = {
  identity: {
    name: "",
  },
  visual: {
    sourceMode: "AI Generate",
    theme: "Custom world",
    generated: false,
    generatedTheme: "",
    generatedImageUrl: "",
  },
  details: {
    mood: ["Magical", "Epic", "Mysterious"],
  },
  generation: {
    consistencyLock: true,
  },
};

const worldDescriptions = {
  "Custom world": "",
  "Magic portal studio": "A glowing portal platform with floating islands, cyan runes, neon-purple sky magic and a clean circular stage for the hero.",
  "Fantasy grove": "A bright magical grove with floating castles, waterfalls, soft clouds, flowers and a central round stone hero platform.",
  "Dark kingdom": "A moody fantasy kingdom with castle silhouettes, glowing crystals, safe mysterious lighting and a central stage for dramatic character reveals.",
  "Candy kingdom": "A sweet pastel candy kingdom with floating cake islands, rainbow bridges, balloon towers, cute shops and a central decorated platform.",
  "Dinosaur jungle": "A lush dinosaur jungle with waterfalls, ancient stone ruins, distant volcano smoke, flying pterosaurs and a circular stone platform.",
  "Sky islands": "A bright sky-island world with floating grass platforms, portal gates, clouds, waterfalls and a clean hero platform in the foreground.",
  "Enchanted forest": "A glowing enchanted forest with giant trees, lanterns, crystal mushrooms, old stone arches, soft sunlight and a central round platform.",
  "Underwater realm": "A safe underwater fantasy realm with coral towers, glowing bubbles, sea temples, blue light rays and a circular shell platform.",
  "Lava planet": "A dramatic lava planet with volcanoes, floating obsidian rocks, purple crystal towers, molten rivers and a glowing circular hero platform.",
};

const worldNameInput = document.querySelector("#worldNameInput");
const worldPromptNotes = document.querySelector("#worldPromptNotes");
const worldPreviewImage = document.querySelector("#worldPreviewImage");
const worldLiveImage = document.querySelector("#worldLiveImage");
const worldPreviewBlank = document.querySelector("#worldPreviewBlank");
const worldLiveBlank = document.querySelector("#worldLiveBlank");
const worldSummary = document.querySelector("#worldRecipeSummary");
const worldConsistencyLockInput = document.querySelector("#worldConsistencyLockInput");
const clearWorldButton = document.querySelector("#clearWorldButton");
const saveWorldButton = document.querySelector("#saveWorldButton");
const proceedToCharacterButton = document.querySelector("#proceedToCharacterButton");
const generateWorldPreviewButton = document.querySelector("#generateWorldPreviewButton");
const worldSaveStatus = document.querySelector("#worldSaveStatus");
const worldGenerationStatus = document.querySelector("#worldGenerationStatus");
const worldPromptField = worldPromptNotes?.closest(".field-stack");
const WORLD_IMAGE_TIMEOUT_MS = 210000;
let worldGenerationProgress = 0;
let worldGenerationProgressTimer = null;

function uid(prefix = "item") {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function defaultStoryboardProject() {
  return {
    id: "storyboard-local-project",
    title: "My Awesome Story",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeCharacterId: "",
    activeWorldId: "",
    characters: [],
    worlds: [],
    objects: [],
    scenes: [],
  };
}

function loadStoryboardProject() {
  try {
    return { ...defaultStoryboardProject(), ...(JSON.parse(localStorage.getItem(STORYBOARD_PROJECT_KEY) || "{}") || {}) };
  } catch {
    localStorage.removeItem(STORYBOARD_PROJECT_KEY);
    return defaultStoryboardProject();
  }
}

function saveStoryboardProject(project) {
  const next = { ...defaultStoryboardProject(), ...project, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORYBOARD_PROJECT_KEY, JSON.stringify(next));
  return next;
}

let storyboardProject = loadStoryboardProject();
let editingWorldId = new URLSearchParams(window.location.search).get("world") || "";

function selectedThemeButton() {
  return document.querySelector(`[data-world-choice="theme"][data-value="${CSS.escape(worldState.visual.theme)}"]`);
}

function selectedThemeImage() {
  if (worldState.visual.generatedImageUrl) return worldState.visual.generatedImageUrl;
  if (!worldState.visual.generated || worldState.visual.theme === "Custom world") return "";
  return selectedThemeButton()?.querySelector("img")?.getAttribute("src") || "";
}

function dataUrlSize(value = "") {
  const text = String(value || "");
  const commaIndex = text.indexOf(",");
  const payload = commaIndex >= 0 ? text.slice(commaIndex + 1) : text;
  return Math.ceil((payload.length * 3) / 4);
}

function compressImageDataUrl(dataUrl, maxWidth = 1200, maxHeight = 1800, quality = 0.9) {
  const source = String(dataUrl || "");
  if (!source.startsWith("data:image/") || dataUrlSize(source) < 450000) return Promise.resolve(source);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(source);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(source);
      }
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

function customGeneratedPlaceholder() {
  const prompt = worldDescription();
  const mood = worldState.details.mood.join(", ");
  return [
    "Custom world generated from your prompt.",
    prompt ? `Prompt: ${prompt}` : "",
    mood ? `Mood: ${mood}` : "",
  ].filter(Boolean).join(" ");
}

function imageForTheme(theme) {
  if (theme === "Custom world") return "";
  const button = document.querySelector(`[data-world-choice="theme"][data-value="${CSS.escape(theme)}"]`);
  return button?.querySelector("img")?.getAttribute("src") || "";
}

function syncInputs() {
  worldState.identity.name = cleanText(worldNameInput?.value, "").slice(0, 40);
  worldState.generation.consistencyLock = Boolean(worldConsistencyLockInput?.checked);
}

function updateCounts() {
  document.querySelectorAll("[data-count-for]").forEach((node) => {
    const input = document.querySelector(`#${node.dataset.countFor}`);
    if (!input) return;
    node.textContent = `${input.value.length}/${input.maxLength}`;
  });
}

function chips(values) {
  return values.map((value) => `<span>${escapeHtml(value)}</span>`).join("");
}

function row(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${Array.isArray(value) ? chips(value) : escapeHtml(value)}</dd></div>`;
}

function worldDescription() {
  const theme = worldState.visual.generatedTheme || worldState.visual.theme;
  const base = worldDescriptions[theme] || `${theme} with a clear central platform and layered kid-friendly detail.`;
  const notes = cleanText(worldPromptNotes?.value, "");
  return notes || base;
}

function renderWorldFrames() {
  const isGenerating = document.querySelector(".world-art-frame")?.classList.contains("is-generating-image")
    || document.querySelector(".live-world-stage")?.classList.contains("is-generating-image");
  if (isGenerating) return;
  const image = selectedThemeImage();
  const showImage = Boolean(image);
  [worldPreviewImage, worldLiveImage].forEach((img) => {
    if (!img) return;
    img.hidden = !showImage;
    if (showImage) {
      img.src = image;
      img.alt = `${worldState.visual.generatedTheme || worldState.visual.theme} world concept`;
    } else {
      img.removeAttribute("src");
    }
  });
  [worldPreviewBlank, worldLiveBlank].forEach((blank) => {
    if (!blank) return;
    blank.hidden = showImage;
    if (!showImage && worldState.visual.generated && worldState.visual.theme === "Custom world") {
      blank.innerHTML = `<strong>Custom world ready</strong><span>${escapeHtml(customGeneratedPlaceholder())}</span>`;
    } else if (!showImage) {
      const isPreview = blank.id === "worldPreviewBlank";
      blank.innerHTML = isPreview
        ? "<strong>No world image yet</strong><span>Describe your world, choose Custom or a starter, then generate.</span>"
        : "<strong>Preview will appear here</strong><span>Your generated world stays blank until you create it.</span>";
    }
  });
}

function renderSummary() {
  syncInputs();
  updateCounts();
  renderWorldFrames();
  if (!worldSummary) return;
  worldSummary.innerHTML = [
    row("World", worldState.identity.name || "Untitled custom world"),
    row("Description", worldDescription() || "Not set"),
    row("Theme", worldState.visual.generatedTheme || worldState.visual.theme),
    row("Image", worldState.visual.generated ? "Generated" : "Not generated yet"),
    row("Mood", worldState.details.mood),
    row("Memory", worldState.generation.consistencyLock ? "Locked" : "Exploring"),
  ].join("");
}

function setWorldPromptMessage(message, isError = false) {
  [worldSaveStatus, worldGenerationStatus].forEach((statusNode) => {
    if (!statusNode) return;
    statusNode.textContent = "";
    if (message) {
      const loginMatch = /log in|login|sign in/i.test(message);
      if (loginMatch) {
        statusNode.append("Please ");
        const link = document.createElement("a");
        link.href = `/login.html?return=${encodeURIComponent(location.pathname)}`;
        link.textContent = "log in";
        statusNode.append(link, " before generating a world image.");
      } else {
        statusNode.textContent = message;
      }
    }
    statusNode.classList.toggle("is-error", isError);
  });
  worldPromptField?.classList.toggle("has-error", isError);
}

function isCustomSavedWorld(world) {
  if (!world) return false;
  if (world.theme === "Custom world") return true;
  if (world.generatedImageUrl && String(world.generatedImageUrl).startsWith("data:image/")) return true;
  if (world.source === "world_creator_saved") return true;
  return false;
}

function imageLoaderMarkup(title = "Generating artwork...", detail = "OPREALM is shaping the dots into a safe creator world.", progress = 0) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return `
    <div class="scene-image-loader generator-image-loader" aria-live="polite">
      <span class="image-loader-dotfield"></span>
      <span class="image-loader-dotfield is-second"></span>
      <span class="image-loader-wave"></span>
      <div class="scene-image-progress" style="--scene-image-progress:${safeProgress * 3.6}deg;"><span>${safeProgress}%</span></div>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>`;
}

function renderWorldGenerationProgress() {
  document.querySelectorAll(".world-art-frame .scene-image-loader, .live-world-stage .scene-image-loader").forEach((loader) => {
    const ring = loader.querySelector(".scene-image-progress");
    const label = ring?.querySelector("span");
    if (ring) ring.style.setProperty("--scene-image-progress", `${worldGenerationProgress * 3.6}deg`);
    if (label) label.textContent = `${worldGenerationProgress}%`;
  });
}

function startWorldGenerationProgress() {
  window.clearInterval(worldGenerationProgressTimer);
  worldGenerationProgress = 3;
  worldGenerationProgressTimer = window.setInterval(() => {
    worldGenerationProgress = Math.min(94, worldGenerationProgress + Math.max(1, Math.ceil((94 - worldGenerationProgress) * 0.075)));
    renderWorldGenerationProgress();
    if (worldGenerationProgress >= 94) window.clearInterval(worldGenerationProgressTimer);
  }, 620);
}

function finishWorldGenerationProgress() {
  window.clearInterval(worldGenerationProgressTimer);
  worldGenerationProgress = 100;
  renderWorldGenerationProgress();
}

function setSingleChoice(group, value, button) {
  if (group === "sourceMode") worldState.visual.sourceMode = value;
  if (group === "theme") {
    worldState.visual.theme = value;
    worldState.visual.generated = false;
    worldState.visual.generatedImageUrl = "";
    worldState.visual.generatedTheme = "";
    if (value === "Custom world") {
      if (worldNameInput && worldNameInput.value === "Magic Portal Studio") worldNameInput.value = "";
      if (worldPromptNotes && worldDescriptions["Magic portal studio"] === worldPromptNotes.value) worldPromptNotes.value = "";
    } else if (worldNameInput && (!worldNameInput.value || worldNameInput.value === "Magic Portal Studio")) {
      worldNameInput.value = value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    if (value !== "Custom world" && worldPromptNotes && worldDescriptions[value]) {
      worldPromptNotes.value = worldDescriptions[value];
    }
  }
  document.querySelectorAll(`[data-world-choice="${group}"]`).forEach((item) => {
    item.classList.toggle("is-selected", item === button);
    if (group === "sourceMode") item.classList.toggle("is-active", item === button);
  });
}

function toggleMultiChoice(group, value, button) {
  const list = worldState.details[group];
  if (!Array.isArray(list)) return;
  const exists = list.includes(value);
  const next = exists ? list.filter((item) => item !== value) : [...list, value];
  if (!next.length) return;
  worldState.details[group] = next;
  button.classList.toggle("is-selected", !exists);
}

function worldIdFromName(name) {
  const slug = cleanText(name, "story-world").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `world-${slug || uid("world")}`;
}

function inferGeneratedTheme() {
  if (worldState.visual.theme !== "Custom world") return worldState.visual.theme;
  const text = [worldState.identity.name, worldPromptNotes?.value].join(" ");
  return normalizeSparkTheme(text);
}

function setWorldGenerating(isGenerating) {
  if (!generateWorldPreviewButton) return;
  generateWorldPreviewButton.disabled = isGenerating;
  generateWorldPreviewButton.textContent = isGenerating ? "Generating..." : "Generate World (20 credits)";
  document.querySelectorAll(".world-art-frame, .live-world-stage").forEach((frame) => {
    frame.classList.toggle("is-generating-image", isGenerating);
  });
  if (isGenerating) {
    startWorldGenerationProgress();
    [worldPreviewImage, worldLiveImage].forEach((img) => {
      if (img) img.hidden = true;
    });
    [worldPreviewBlank, worldLiveBlank].forEach((blank) => {
      if (!blank) return;
      blank.hidden = false;
      blank.innerHTML = imageLoaderMarkup("Generating world...", "Building a clean central platform, background depth and reusable story details.", worldGenerationProgress);
    });
  } else {
    window.clearInterval(worldGenerationProgressTimer);
  }
}

async function generateWorldPreview() {
  syncInputs();
  const promptText = cleanText(worldPromptNotes?.value, "");
  setWorldPromptMessage("", false);
  if (!promptText) {
    setWorldPromptMessage("You need to enter a world prompt before you can generate this world.", true);
    worldPromptNotes?.focus();
    return;
  }
  const theme = worldState.visual.theme === "Custom world" ? "Custom world" : worldState.visual.theme;
  worldPromptNotes?.blur();
  setWorldGenerating(true);
  setWorldPromptMessage(theme === "Custom world" ? "Generating a custom world from your prompt..." : "Using the selected preset world art.");
  try {
    worldState.visual.generated = true;
    worldState.visual.generatedTheme = theme;
    if (theme === "Custom world") {
      worldState.visual.generatedImageUrl = "";
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), WORLD_IMAGE_TIMEOUT_MS);
      const response = await fetch("/api/story-world-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: worldState.identity.name || "Custom Story World",
          prompt: cleanText(worldPromptNotes?.value, ""),
          moods: worldState.details.mood,
        }),
      }).finally(() => window.clearTimeout(timeoutId));
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new Error("Please log in before generating a world image.");
      }
      if (!response.ok || !data.ok || !data.imageDataUrl) {
        throw new Error(data.error || "World image generation failed.");
      }
      worldState.visual.generatedImageUrl = await compressImageDataUrl(data.imageDataUrl);
      if (data.elapsedMs && worldGenerationStatus) {
        worldGenerationStatus.textContent = `World generated in ${Math.max(1, Math.round(data.elapsedMs / 1000))} seconds.`;
      }
    } else {
      worldState.visual.generatedImageUrl = imageForTheme(theme);
    }
  } catch (error) {
    worldState.visual.generated = false;
    worldState.visual.generatedImageUrl = "";
    const message = error.name === "AbortError"
      ? "World image generation is taking too long. Please try again with a shorter prompt or try again in a moment."
      : error.message || "World image generation failed.";
    setWorldPromptMessage(message, true);
    setWorldGenerating(false);
    renderSummary();
    return;
  }
  if (!worldState.identity.name && worldNameInput) {
    worldNameInput.value = theme === "Custom world" ? "Custom Story World" : theme.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  if (!worldPromptNotes?.value && worldPromptNotes && worldDescriptions[theme]) {
    worldPromptNotes.value = worldDescriptions[theme];
  }
  setWorldPromptMessage(theme === "Custom world"
    ? "Custom world generated from your prompt. Review it, adjust details, then save it for character creation."
    : "Preset world preview loaded. Review it, adjust details, then save it for character creation.");
  finishWorldGenerationProgress();
  window.setTimeout(() => {
    setWorldGenerating(false);
    renderSummary();
  }, 280);
}

function worldRecordFromState({ keepExistingId = true } = {}) {
  syncInputs();
  const existing = storyboardProject.worlds.find((world) => world.id === editingWorldId) || {};
  const name = worldState.identity.name || "Custom Story World";
  const id = keepExistingId && existing.id ? existing.id : worldIdFromName(name);
  return {
    ...existing,
    id,
    name,
    hook: worldDescription().slice(0, 100),
    imageUrl: selectedThemeImage(),
    description: worldDescription(),
    styleNotes: [
      `Theme: ${worldState.visual.generatedTheme || worldState.visual.theme}`,
      `Mood: ${worldState.details.mood.join(", ")}`,
    ],
    sourceMode: worldState.visual.sourceMode,
    source: "world_creator_saved",
    theme: worldState.visual.theme,
    generatedTheme: worldState.visual.generatedTheme,
    generatedImageUrl: worldState.visual.generatedImageUrl,
    generated: worldState.visual.generated,
    mood: [...worldState.details.mood],
    consistencyLocked: worldState.generation.consistencyLock,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function saveWorld({ navigateToCharacter = false } = {}) {
  const world = worldRecordFromState();
  const worlds = storyboardProject.worlds.filter((item) => item.id !== world.id);
  const scenes = (storyboardProject.scenes || []).map((scene) => ({
    ...scene,
    selectedWorldId: world.id,
    status: scene.generatedImageUrl ? "complete" : scene.status || "draft",
  }));
  storyboardProject = saveStoryboardProject({
    ...storyboardProject,
    activeWorldId: world.id,
    worlds: [world, ...worlds],
    scenes,
  });
  editingWorldId = world.id;
  if (worldSaveStatus) worldSaveStatus.textContent = `${world.name} saved. It is ready for character creation and scene prompts.`;
  window.OPREALMRefreshCreatorSteps?.();
  if (proceedToCharacterButton) {
    proceedToCharacterButton.disabled = false;
    proceedToCharacterButton.setAttribute("aria-disabled", "false");
  }
  if (navigateToCharacter) window.location.href = "/storyboard-character.html";
}

function applyWorldToForm(world) {
  if (!world) return;
  worldState.identity.name = world.name || worldState.identity.name;
  worldState.visual.sourceMode = world.sourceMode || worldState.visual.sourceMode;
  worldState.visual.theme = world.theme || world.name || worldState.visual.theme;
  worldState.visual.generatedTheme = world.generatedTheme || "";
  worldState.visual.generatedImageUrl = world.generatedImageUrl || world.imageUrl || "";
  worldState.visual.generated = Boolean(world.generated || world.imageUrl);
  worldState.details.mood = world.mood || worldState.details.mood;
  worldState.generation.consistencyLock = Boolean(world.consistencyLocked ?? true);
  if (worldNameInput) worldNameInput.value = worldState.identity.name;
  if (worldPromptNotes) worldPromptNotes.value = world.description || worldDescription();
  if (worldConsistencyLockInput) worldConsistencyLockInput.checked = worldState.generation.consistencyLock;
  refreshChoiceUi();
}

function resetWorldCreator() {
  const clearedWorldId = editingWorldId || storyboardProject.activeWorldId || "";
  if (clearedWorldId) {
    storyboardProject = saveStoryboardProject({
      ...storyboardProject,
      activeWorldId: storyboardProject.activeWorldId === clearedWorldId ? "" : storyboardProject.activeWorldId,
      worlds: (storyboardProject.worlds || []).filter((world) => world.id !== clearedWorldId),
      scenes: (storyboardProject.scenes || []).map((scene) => ({
        ...scene,
        selectedWorldId: scene.selectedWorldId === clearedWorldId ? "" : scene.selectedWorldId,
      })),
    });
  } else if (storyboardProject.activeWorldId) {
    storyboardProject = saveStoryboardProject({
      ...storyboardProject,
      activeWorldId: "",
    });
  }

  editingWorldId = "";
  worldState.identity.name = "";
  worldState.visual.sourceMode = "AI Generate";
  worldState.visual.theme = "Custom world";
  worldState.visual.generated = false;
  worldState.visual.generatedTheme = "";
  worldState.visual.generatedImageUrl = "";
  worldState.details.mood = ["Magical", "Epic", "Mysterious"];
  worldState.generation.consistencyLock = true;
  if (worldNameInput) worldNameInput.value = "";
  if (worldPromptNotes) worldPromptNotes.value = "";
  if (worldConsistencyLockInput) worldConsistencyLockInput.checked = true;
  if (proceedToCharacterButton) {
    proceedToCharacterButton.disabled = true;
    proceedToCharacterButton.setAttribute("aria-disabled", "true");
  }
  setWorldPromptMessage("", false);
  if (worldSaveStatus) worldSaveStatus.textContent = "World cleared. Describe a new world when you are ready.";
  refreshChoiceUi();
  renderSummary();
}

function refreshChoiceUi() {
  document.querySelectorAll("[data-world-choice]").forEach((button) => {
    const group = button.dataset.worldChoice;
    const value = button.dataset.value;
    const selected = worldState.visual[group] === value;
    button.classList.toggle("is-selected", selected);
    if (group === "sourceMode") button.classList.toggle("is-active", selected);
  });
  document.querySelectorAll("[data-world-multi]").forEach((button) => {
    const list = worldState.details[button.dataset.worldMulti] || [];
    button.classList.toggle("is-selected", list.includes(button.dataset.value));
  });
}

document.querySelectorAll("[data-world-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    setSingleChoice(button.dataset.worldChoice, button.dataset.value, button);
    renderSummary();
  });
});

document.querySelectorAll("[data-world-multi]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleMultiChoice(button.dataset.worldMulti, button.dataset.value, button);
    renderSummary();
  });
});

[worldNameInput, worldPromptNotes, worldConsistencyLockInput].forEach((input) => {
  input?.addEventListener("input", () => {
    if (input === worldPromptNotes && cleanText(worldPromptNotes.value, "")) {
      setWorldPromptMessage("", false);
    }
    renderSummary();
  });
  input?.addEventListener("change", renderSummary);
});

generateWorldPreviewButton?.addEventListener("click", generateWorldPreview);
document.addEventListener("click", (event) => {
  if (!event.target.closest("#clearWorldButton")) return;
  const savedWorld = storyboardProject.worlds.find((world) => world.id === editingWorldId)
    || storyboardProject.worlds.find((world) => world.id === storyboardProject.activeWorldId);
  const shouldClear = window.confirm(
    savedWorld
      ? `Clear "${savedWorld.name || "this world"}"? This deletes the saved world, its prompt and preview image, and removes it from existing scenes. Your saved characters and scene text will remain.`
      : "Clear this world creator? This removes the current world name, prompt, preview image and unsaved settings.",
  );
  if (shouldClear) resetWorldCreator();
});
saveWorldButton?.addEventListener("click", () => saveWorld());
proceedToCharacterButton?.addEventListener("click", () => {
  if (!proceedToCharacterButton.disabled) window.location.href = "/storyboard-character.html";
});

function normalizeSparkTheme(value = "") {
  const direct = Object.keys(worldDescriptions).find((theme) => theme.toLowerCase() === String(value).toLowerCase());
  if (direct) return direct;
  const lower = String(value).toLowerCase();
  if (lower.includes("lava") || lower.includes("volcano")) return "Lava planet";
  if (lower.includes("candy") || lower.includes("rainbow")) return "Candy kingdom";
  if (lower.includes("dinosaur") || lower.includes("jungle")) return "Dinosaur jungle";
  if (lower.includes("forest") || lower.includes("enchanted")) return "Enchanted forest";
  if (lower.includes("sky") || lower.includes("floating")) return "Sky islands";
  if (lower.includes("underwater") || lower.includes("ocean")) return "Underwater realm";
  if (lower.includes("dark") || lower.includes("castle")) return "Dark kingdom";
  return "Magic portal studio";
}

function allowedList(values, allowed, fallback) {
  const list = Array.isArray(values) ? values : [];
  const filtered = list.map((value) => cleanText(value)).filter((value) => allowed.includes(value));
  return filtered.length ? filtered : fallback;
}

function applyRealmSparkToWorldCreator() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("from") !== "realm-spark") return null;

  const spark = window.OPREALMRealmSpark?.readSparkOutput?.();
  if (!spark?.world) return null;

  const world = spark.world;
  const theme = normalizeSparkTheme(world.theme || world.visualStyle || world.prompt || world.name);
  const name = cleanText(world.name, "Spark World").slice(0, 40);
  const id = worldIdFromName(name);
  const moods = allowedList(
    world.moods,
    ["Magical", "Epic", "Mysterious", "Funny", "Cozy", "Adventure", "Peaceful", "Spooky", "Dreamy", "Chaotic"],
    ["Magical", "Epic"]
  );
  const description = cleanText(world.prompt, worldDescriptions[theme]).slice(0, 900);
  const record = {
    id,
    name,
    hook: description.slice(0, 100),
    imageUrl: imageForTheme(theme),
    description,
    styleNotes: [
      `Original idea: ${cleanText(spark.originalIdea)}`,
      `Visual style: ${cleanText(world.visualStyle, theme)}`,
      `Theme: ${theme}`,
      `Mood: ${moods.join(", ")}`,
    ],
    sourceMode: "AI Generate",
    theme,
    mood: moods,
    consistencyLocked: Boolean(world.memoryEnabled ?? true),
    referenceId: spark.id || `realm-spark-${Date.now()}`,
    originalIdea: spark.originalIdea,
    storySeed: spark.story,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  storyboardProject = saveStoryboardProject({
    ...storyboardProject,
    title: spark.story?.title || storyboardProject.title || "My Awesome Story",
    originalIdea: spark.originalIdea,
    realmSpark: spark,
    activeWorldId: record.id,
    globalStyle: cleanText(world.visualStyle, storyboardProject.globalStyle || theme),
    worlds: [record, ...(storyboardProject.worlds || []).filter((item) => item.id !== record.id)],
  });
  editingWorldId = record.id;

  try {
    localStorage.setItem(REALM_SPARK_OUTPUT_KEY, JSON.stringify({
      ...spark,
      appliedToWorldCreator: true,
      appliedWorldId: record.id,
      appliedAt: new Date().toISOString(),
    }));
  } catch {
    // If localStorage is unavailable, the form still receives the generated world this session.
  }

  return record;
}

const sparkedWorld = applyRealmSparkToWorldCreator();
const activeSavedWorld = storyboardProject.worlds.find((world) => world.id === storyboardProject.activeWorldId) || null;
const params = new URLSearchParams(window.location.search);
const requestedWorld = editingWorldId
  ? storyboardProject.worlds.find((world) => world.id === editingWorldId)
  : null;
const shouldResumeSavedWorld = params.get("resume") === "1" || Boolean(activeSavedWorld && isCustomSavedWorld(activeSavedWorld));
const worldToEdit = sparkedWorld || requestedWorld || (shouldResumeSavedWorld ? activeSavedWorld : null);
if (worldToEdit) {
  editingWorldId = worldToEdit.id;
  applyWorldToForm(worldToEdit);
} else {
  refreshChoiceUi();
  setWorldPromptMessage("", false);
}
renderSummary();
