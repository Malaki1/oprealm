const recipeState = {
  identity: {
    name: "Kai",
    tagline: "",
    characterAge: 10,
    genderPresentation: "Boy",
    customGender: "",
    characterType: "Young adventurer",
    traits: ["Brave", "Curious", "Loyal", "Smart", "Resourceful"],
    voice: "Young Adventurer",
  },
  visual: {
    sourceMode: "AI Generate",
    masterStyle: "3D Cartoon",
    palette: ["Orange", "Blue", "Charcoal", "Silver"],
  },
  components: {
    outfit: "Custom",
    customOutfit: "",
    accessories: ["None"],
    customObject: "",
    pet: "No Pet",
    customPet: "",
    environment: "",
  },
  generation: {
    consistencyLock: true,
    changedComponent: "",
    generatedImageUrl: "",
    version: 1,
  },
};

const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";

const componentLabels = {
  sourceMode: "Generation Source",
  masterStyle: "Master Style",
  characterAge: "Character Age",
  genderPresentation: "Gender",
  outfit: "Outfit",
  environment: "Preview Environment",
  pet: "Pet Companion",
};

const nameInput = document.querySelector("#characterNameInput");
const taglineInput = document.querySelector("#characterTaglineInput");
const characterAgeSlider = document.querySelector("#characterAgeSlider");
const characterAgeValue = document.querySelector("#characterAgeValue");
const promptNotesInput = taglineInput;
const voiceSelect = document.querySelector("#characterVoiceSelect");
const summary = document.querySelector("#characterRecipeSummary");
const generateButton = document.querySelector("#generateCharacterRecipeButton");
const inlineGenerateButton = document.querySelector(".character-regenerate-button");
const statusNode = document.querySelector("#characterGenerationStatus");
const consistencyInput = document.querySelector("#consistencyLockInput");
const conceptImage = document.querySelector("#characterPreviewImage");
const liveImage = document.querySelector("#characterLiveImage");
const conceptBlank = document.querySelector("#characterPreviewBlank");
const liveBlank = document.querySelector("#characterLiveBlank");
const liveStage = document.querySelector(".live-character-stage");
const enlargeCharacterReferenceButton = document.querySelector("#enlargeCharacterReferenceButton");
const downloadCharacterReferenceButton = document.querySelector("#downloadCharacterReferenceButton");
const characterLightbox = document.querySelector("#characterReferenceLightbox");
const characterLightboxImage = document.querySelector("#characterLightboxImage");
const closeCharacterLightboxButton = document.querySelector("#closeCharacterLightboxButton");
const downloadCharacterLightboxButton = document.querySelector("#downloadCharacterLightboxButton");
const customPaletteInput = document.querySelector("#customPaletteInput");
const colorSwatchRow = document.querySelector(".color-swatch-row");
const customOutfitModal = document.querySelector("#customOutfitModal");
const customOutfitInput = document.querySelector("#customOutfitInput");
const customOutfitInlineInput = document.querySelector("#customOutfitInlineInput");
const customObjectInput = document.querySelector("#customObjectInput");
const customPetInput = document.querySelector("#customPetInput");
const saveCustomOutfitButton = document.querySelector("#saveCustomOutfitButton");
const cancelCustomOutfitButton = document.querySelector("#cancelCustomOutfitButton");
const closeCustomOutfitButton = document.querySelector("#closeCustomOutfitButton");
const customGenderModal = document.querySelector("#customGenderModal");
const customGenderInput = document.querySelector("#customGenderInput");
const saveCustomGenderButton = document.querySelector("#saveCustomGenderButton");
const cancelCustomGenderButton = document.querySelector("#cancelCustomGenderButton");
const closeCustomGenderButton = document.querySelector("#closeCustomGenderButton");
const saveCharacterButton = document.querySelector("#saveCharacterButton");
const saveAndAddCharacterButton = document.querySelector("#saveAndAddCharacterButton");
const clearCharacterButton = document.querySelector("#clearCharacterButton");
const proceedToStoryBuilderButton = document.querySelector("#proceedToStoryBuilderButton");
const characterSaveStatus = document.querySelector("#characterSaveStatus");
let characterGenerationProgress = 0;
let characterGenerationProgressTimer = null;

function uid(prefix = "item") {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
let editingCharacterId = new URLSearchParams(window.location.search).get("character") || "";

function selectedProjectWorld() {
  return (storyboardProject.worlds || []).find((world) => world.id === storyboardProject.activeWorldId)
    || (storyboardProject.worlds || [])[0]
    || null;
}

function syncCharacterWorldContext() {
  const world = selectedProjectWorld();
  recipeState.components.environment = world?.name || "";
  const worldImage = world?.imageUrl || world?.generatedImageUrl || "";
  if (liveStage) {
    liveStage.style.setProperty("--character-environment-preview", worldImage ? `url("${worldImage}")` : "none");
  }
  return world;
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function clampCharacterAge(value) {
  const age = Number(value);
  if (!Number.isFinite(age)) return 10;
  return Math.max(0, Math.min(100, Math.round(age)));
}

function ageBandFromAge(ageValue) {
  const age = clampCharacterAge(ageValue);
  if (age <= 2) return "Baby";
  if (age <= 12) return "Child";
  if (age <= 19) return "Teen";
  if (age <= 64) return "Adult";
  return "Elder";
}

function ageFromLegacyGroup(ageGroup) {
  const ages = { Baby: 1, Child: 10, Teen: 16, Adult: 28, Elder: 72 };
  return ages[ageGroup] || 10;
}

function currentCharacterImageSrc() {
  return recipeState.generation.generatedImageUrl || conceptImage?.dataset.generatedSrc || "";
}

function dataUrlSize(value = "") {
  const text = String(value || "");
  const commaIndex = text.indexOf(",");
  const payload = commaIndex >= 0 ? text.slice(commaIndex + 1) : text;
  return Math.ceil((payload.length * 3) / 4);
}

function compressImageDataUrl(dataUrl, maxWidth = 900, maxHeight = 1200, quality = 0.84) {
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

function setCharacterImage(src = "") {
  const safeSrc = String(src || "").trim();
  recipeState.generation.generatedImageUrl = safeSrc;
  [conceptImage, liveImage].forEach((image) => {
    if (!image) return;
    if (safeSrc) {
      image.src = safeSrc;
      image.dataset.generatedSrc = safeSrc;
      image.hidden = false;
    } else {
      image.removeAttribute("src");
      delete image.dataset.generatedSrc;
      image.hidden = true;
    }
  });
  [conceptBlank, liveBlank].forEach((blank) => {
    if (blank) blank.hidden = Boolean(safeSrc);
  });
  [enlargeCharacterReferenceButton, downloadCharacterReferenceButton, downloadCharacterLightboxButton].forEach((button) => {
    if (button) button.disabled = !safeSrc;
  });
  document.querySelector(".character-art-frame")?.classList.toggle("has-generated-image", Boolean(safeSrc));
  liveStage?.classList.toggle("has-generated-image", Boolean(safeSrc));
}

function imageLoaderMarkup(title = "Generating artwork...", detail = "OPREALM is shaping the dots into a consistent character reference.", progress = 0) {
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

function renderCharacterGenerationProgress() {
  document.querySelectorAll(".character-art-frame .scene-image-loader, .live-character-stage .scene-image-loader").forEach((loader) => {
    const ring = loader.querySelector(".scene-image-progress");
    const label = ring?.querySelector("span");
    if (ring) ring.style.setProperty("--scene-image-progress", `${characterGenerationProgress * 3.6}deg`);
    if (label) label.textContent = `${characterGenerationProgress}%`;
  });
}

function startCharacterGenerationProgress() {
  window.clearInterval(characterGenerationProgressTimer);
  characterGenerationProgress = 3;
  characterGenerationProgressTimer = window.setInterval(() => {
    characterGenerationProgress = Math.min(94, characterGenerationProgress + Math.max(1, Math.ceil((94 - characterGenerationProgress) * 0.075)));
    renderCharacterGenerationProgress();
    if (characterGenerationProgress >= 94) window.clearInterval(characterGenerationProgressTimer);
  }, 620);
}

function finishCharacterGenerationProgress() {
  window.clearInterval(characterGenerationProgressTimer);
  characterGenerationProgress = 100;
  renderCharacterGenerationProgress();
}

function setCharacterGenerating(isGenerating) {
  document.querySelector(".character-art-frame")?.classList.toggle("is-generating-image", isGenerating);
  liveStage?.classList.toggle("is-generating-image", isGenerating);
  if (isGenerating) {
    startCharacterGenerationProgress();
    [conceptImage, liveImage].forEach((image) => {
      if (image) image.hidden = true;
    });
    [conceptBlank, liveBlank].forEach((blank) => {
      if (!blank) return;
      blank.hidden = false;
      blank.innerHTML = imageLoaderMarkup("Generating character...", "Locking style, outfit, colors, traits and companion details together.", characterGenerationProgress);
    });
  } else {
    window.clearInterval(characterGenerationProgressTimer);
    if (!currentCharacterImageSrc()) {
      if (conceptBlank) {
        conceptBlank.hidden = false;
        conceptBlank.innerHTML = "<strong>No character image yet</strong><span>Add your character details, then generate.</span>";
      }
      if (liveBlank) {
        liveBlank.hidden = false;
        liveBlank.innerHTML = "<strong>Preview will appear here</strong><span>Your character stays blank until you generate it.</span>";
      }
    }
  }
}

function setSingleChoice(group, value) {
  if (group === "genderPresentation") {
    recipeState.identity[group] = value;
  } else if (group === "sourceMode" || group === "masterStyle") {
    recipeState.visual[group] = value;
  } else if (group === "outfit") {
    recipeState.components.outfit = value;
  } else if (group === "pet") {
    recipeState.components.pet = value;
  } else if (group === "environment") {
    recipeState.components.environment = value;
  }
  recipeState.generation.changedComponent = componentLabels[group] || group;
}

function selectedChoiceImage(group, value) {
  const selector = value
    ? `[data-recipe-choice="${group}"][data-value="${CSS.escape(value)}"] img`
    : `[data-recipe-choice="${group}"].is-selected img`;
  return document.querySelector(selector)?.getAttribute("src") || "";
}

function selectedEnvironmentDescription() {
  const selectedWorld = selectedProjectWorld();
  if (selectedWorld) return cleanText(selectedWorld.description || selectedWorld.prompt, selectedWorld.name);
  const env = recipeState.components.environment;
  const descriptions = {
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
  return descriptions[env] || `${env} with a clear central platform, layered environment detail and kid-friendly cinematic lighting.`;
}

function genderLabel() {
  return recipeState.identity.genderPresentation === "Other" && recipeState.identity.customGender
    ? `Other: ${recipeState.identity.customGender}`
    : recipeState.identity.genderPresentation;
}

function openCustomGenderModal() {
  if (!customGenderModal || !customGenderInput) return;
  customGenderInput.value = recipeState.identity.customGender || "";
  customGenderModal.hidden = false;
  customGenderInput.focus();
}

function closeCustomGenderModal() {
  if (customGenderModal) customGenderModal.hidden = true;
}

function saveCustomGender() {
  const details = cleanText(customGenderInput?.value, "").slice(0, 120);
  if (!details) {
    customGenderInput?.focus();
    return;
  }
  recipeState.identity.genderPresentation = "Other";
  recipeState.identity.customGender = details;
  recipeState.generation.changedComponent = "Gender";
  document.querySelectorAll('[data-recipe-choice="genderPresentation"]').forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.value === "Other");
  });
  closeCustomGenderModal();
  renderSummary();
}

function openCustomOutfitModal() {
  if (!customOutfitModal || !customOutfitInput) return;
  customOutfitInput.value = recipeState.components.customOutfit || "";
  customOutfitModal.hidden = false;
  customOutfitInput.focus();
}

function closeCustomOutfitModal() {
  if (customOutfitModal) customOutfitModal.hidden = true;
}

function saveCustomOutfit() {
  const details = cleanText(customOutfitInput?.value, "").slice(0, 300);
  if (!details) {
    customOutfitInput?.focus();
    return;
  }
  recipeState.components.outfit = "Custom";
  recipeState.components.customOutfit = details;
  recipeState.generation.changedComponent = "Custom Outfit";
  document.querySelectorAll('[data-recipe-choice="outfit"]').forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.value === "Custom");
  });
  closeCustomOutfitModal();
  renderSummary();
}

function syncVisualPreview(group, button) {
  if (group === "environment" && liveStage) {
    const previewSrc = button?.querySelector("img")?.getAttribute("src");
    liveStage.style.setProperty("--character-environment-preview", previewSrc ? `url("${previewSrc}")` : "none");
  }
}

function selectedPetDescription() {
  const pet = recipeState.components.pet;
  if (pet === "Custom Pet") {
    return recipeState.components.customPet || "a custom creator-described pet companion, friendly, kid-safe and matched to the selected master art style";
  }
  const descriptions = {
    "Robot Pet": "a small friendly floating robot companion with glowing blue eyes and rounded kid-safe shapes",
    "Magic Cat": "a cute magical cat companion with sparkling eyes, soft fur and a tiny enchanted collar",
    "Baby Dragon": "a tiny friendly baby dragon companion with soft wings, bright eyes and playful magical energy",
    "Space Pup": "a cheerful space puppy companion with a small sci-fi collar and rounded explorer gear",
    "Tiny Dino": "a tiny friendly dinosaur companion with bright curious eyes and gentle adventure energy",
    "No Pet": "no pet companion",
  };
  return descriptions[pet] || `${pet} companion, friendly, kid-safe and matched to the selected master art style`;
}

function accessorySummary() {
  return recipeState.components.accessories.map((item) => (
    item === "Custom Object" && recipeState.components.customObject
      ? `Custom Object: ${recipeState.components.customObject}`
      : item
  ));
}

function toggleMultiChoice(group, value, button) {
  const target = group === "trait" ? recipeState.identity.traits : recipeState.visual[group] || recipeState.components[group];
  if (!Array.isArray(target)) return;

  if (group === "accessories" && value === "None") {
    recipeState.components.accessories = ["None"];
    document.querySelectorAll('[data-recipe-multi="accessories"]').forEach((item) => item.classList.toggle("is-selected", item === button));
    recipeState.generation.changedComponent = "Accessories";
    return;
  }

  if (group === "accessories") {
    recipeState.components.accessories = recipeState.components.accessories.filter((item) => item !== "None");
    document.querySelector('[data-recipe-multi="accessories"][data-value="None"]')?.classList.remove("is-selected");
  }

  const list = group === "trait" ? recipeState.identity.traits : group === "palette" ? recipeState.visual.palette : recipeState.components[group];
  const exists = list.includes(value);
  const next = exists ? list.filter((item) => item !== value) : [...list, value];
  const minimum = group === "palette" || group === "trait" ? 1 : 0;
  if (next.length < minimum) return;

  if (group === "trait") recipeState.identity.traits = next;
  if (group === "palette") recipeState.visual.palette = next;
  if (group === "accessories") recipeState.components.accessories = next.length ? next : ["None"];
  button.classList.toggle("is-selected", !exists);
  recipeState.generation.changedComponent = group === "trait" ? "Personality Traits" : group === "palette" ? "Color Palette" : "Accessories";
}

function addCustomPaletteColor(value) {
  const hex = String(value || "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(hex)) return;
  const label = `Custom ${hex}`;
  recipeState.visual.palette = [...recipeState.visual.palette.filter((item) => item !== label), label].slice(-6);
  colorSwatchRow?.querySelectorAll(".custom-color").forEach((node) => node.remove());
  const button = document.createElement("button");
  button.className = "swatch custom-color is-selected";
  button.type = "button";
  button.style.background = hex;
  button.setAttribute("aria-label", `Custom color ${hex}`);
  button.dataset.recipeMulti = "palette";
  button.dataset.value = label;
  button.addEventListener("click", () => {
    toggleMultiChoice("palette", label, button);
    renderSummary();
  });
  colorSwatchRow?.insertBefore(button, customPaletteInput?.closest(".color-wheel-swatch") || null);
  recipeState.generation.changedComponent = "Color Palette";
  renderSummary();
}

function selectChoiceCard(group, value) {
  document.querySelectorAll(`[data-recipe-choice="${group}"]`).forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.value === value);
  });
  if (group === "sourceMode") {
    document.querySelectorAll(".appearance-tabs button").forEach((item) => item.classList.toggle("is-active", item.dataset.value === value));
  }
  setSingleChoice(group, value);
  const selected = document.querySelector(`[data-recipe-choice="${group}"][data-value="${CSS.escape(value)}"]`);
  syncVisualPreview(group, selected);
}

function ensureMultiChoice(group, value) {
  if (group === "accessories") {
    recipeState.components.accessories = recipeState.components.accessories.filter((item) => item !== "None");
    document.querySelector('[data-recipe-multi="accessories"][data-value="None"]')?.classList.remove("is-selected");
  }
  const list = group === "trait" ? recipeState.identity.traits : group === "palette" ? recipeState.visual.palette : recipeState.components[group];
  if (!Array.isArray(list)) return;
  if (!list.includes(value)) {
    list.push(value);
  }
  document.querySelector(`[data-recipe-multi="${group}"][data-value="${CSS.escape(value)}"]`)?.classList.add("is-selected");
  recipeState.generation.changedComponent = group === "accessories" ? "Accessories" : componentLabels[group] || group;
}

function syncInputs() {
  recipeState.identity.name = cleanText(nameInput?.value, "").slice(0, 30);
  recipeState.identity.tagline = cleanText(taglineInput?.value, "").slice(0, 300);
  recipeState.identity.characterAge = clampCharacterAge(characterAgeSlider?.value ?? recipeState.identity.characterAge);
  if (characterAgeValue) characterAgeValue.textContent = recipeState.identity.characterAge;
  recipeState.identity.voice = cleanText(voiceSelect?.value, "Young Adventurer").slice(0, 80);
  recipeState.generation.consistencyLock = Boolean(consistencyInput?.checked);
  recipeState.components.customOutfit = cleanText(customOutfitInlineInput?.value, "").slice(0, 300);
  recipeState.components.customObject = cleanText(customObjectInput?.value, "").slice(0, 300);
  recipeState.components.customPet = cleanText(customPetInput?.value, "").slice(0, 300);
  recipeState.visual.palette = [...document.querySelectorAll('[data-recipe-multi="palette"].is-selected')]
    .map((button) => button.dataset.value)
    .filter(Boolean)
    .slice(0, 6);
  if (!recipeState.visual.palette.length) {
    recipeState.visual.palette = ["Blue"];
    document.querySelector('[data-recipe-multi="palette"][data-value="Blue"]')?.classList.add("is-selected");
  }
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

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function buildPromptPreview() {
  const selectedWorld = selectedProjectWorld();
  const outfitDescription = recipeState.components.outfit === "Custom" && recipeState.components.customOutfit
    ? `Custom outfit: ${recipeState.components.customOutfit}`
    : `Outfit: ${recipeState.components.outfit}`;
  const accessories = accessorySummary();
  return [
    `${recipeState.identity.name}, age ${recipeState.identity.characterAge} ${genderLabel().toLowerCase()} ${recipeState.identity.characterType}.`,
    recipeState.identity.tagline ? `Character description: ${recipeState.identity.tagline}` : "",
    `Personality: ${recipeState.identity.traits.join(", ")}.`,
    `Master style: ${recipeState.visual.masterStyle}. All clothing, items, palette, lighting and background must match this style.`,
    `${outfitDescription}. Accessories and objects: ${accessories.join(", ")}.`,
    `Pet companion: ${selectedPetDescription()}.`,
    `Outfit, accessory and gear colors only: ${recipeState.visual.palette.join(", ")}. World background: ${selectedWorld?.name || recipeState.components.environment || "a simple neutral character studio"}.`,
  ].filter(Boolean).join(" ");
}

function characterRecordFromRecipe({ keepExistingId = true } = {}) {
  syncInputs();
  const existing = storyboardProject.characters.find((character) => character.id === editingCharacterId) || {};
  const characterId = keepExistingId && existing.id ? existing.id : uid("character");
  const imageUrl = currentCharacterImageSrc();
  const environmentImageUrl = selectedChoiceImage("environment", recipeState.components.environment);
  const prompt = cleanText(promptNotesInput?.value, buildPromptPreview()).slice(0, 300);
  return {
    ...existing,
    id: characterId,
    name: recipeState.identity.name || "New Character",
    tagline: recipeState.identity.tagline,
    characterAge: recipeState.identity.characterAge,
    ageGroup: ageBandFromAge(recipeState.identity.characterAge),
    genderPresentation: recipeState.identity.genderPresentation,
    customGender: recipeState.identity.customGender,
    characterType: recipeState.identity.characterType,
    traits: [...recipeState.identity.traits],
    voice: recipeState.identity.voice,
    sourceMode: recipeState.visual.sourceMode,
    masterStyle: recipeState.visual.masterStyle,
    palette: [...recipeState.visual.palette],
    outfit: recipeState.components.outfit,
    customOutfit: recipeState.components.customOutfit,
    accessories: [...recipeState.components.accessories],
    customObject: recipeState.components.customObject,
    pet: recipeState.components.pet,
    customPet: recipeState.components.customPet,
    petDescription: selectedPetDescription(),
    environment: recipeState.components.environment,
    environmentDescription: selectedEnvironmentDescription(),
    imageUrl,
    environmentImageUrl,
    prompt,
    recipe: clone(recipeState),
    consistencyLocked: recipeState.generation.consistencyLock,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function worldRecordFromCharacter(character) {
  const worldId = `world-${character.environment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "story-world"}`;
  const existing = storyboardProject.worlds.find((world) => world.id === worldId) || {};
  return {
    ...existing,
    id: worldId,
    name: character.environment,
    imageUrl: character.environmentImageUrl || "/assets/homepage/cards/story-games.png",
    description: character.environmentDescription,
    styleNotes: [
      `Visual style: ${character.masterStyle}`,
      `World should support ${character.name}'s ${character.characterType} role.`,
      `Mood from character description: ${character.tagline || character.traits.join(", ")}`,
      `Use character outfit colors only as subtle accent lighting: ${character.palette.join(", ")}`,
    ],
    sourceCharacterIds: [...new Set([...(existing.sourceCharacterIds || []), character.id])],
    consistencyLocked: true,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function objectRecordsFromCharacter(character) {
  const accessoryObjects = (character.accessories || [])
    .filter((item) => item && item !== "None")
    .map((item) => {
      const objectId = `object-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const existing = storyboardProject.objects.find((object) => object.id === objectId) || {};
      const isCustomObject = item === "Custom Object";
      const objectDescription = isCustomObject && character.customObject
        ? `${character.customObject}. This is a creator-described custom object or prop used by ${character.name}.`
        : `${item} used by ${character.name}.`;
      return {
        ...existing,
        id: objectId,
        name: item,
        description: `${objectDescription} Keep it in ${character.masterStyle} style and match only the selected outfit/accessory colors: ${character.palette.join(", ")}.`,
        imageUrl: existing.imageUrl || "/assets/homepage/tools/asset-library.png",
        sourceCharacterIds: [...new Set([...(existing.sourceCharacterIds || []), character.id])],
        consistencyLocked: true,
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
      };
    });

  const savedPetName = character.pet === "Custom Pet" ? cleanText(character.customPet, "") : character.pet;
  const pet = savedPetName && savedPetName !== "No Pet"
    ? (() => {
      const petId = `pet-${savedPetName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
      const existing = storyboardProject.objects.find((object) => object.id === petId) || {};
      return {
        ...existing,
        id: petId,
        name: savedPetName,
        kind: "pet",
        description: `${character.petDescription || savedPetName}. Keep this companion visually consistent with ${character.name}, in ${character.masterStyle} style, using outfit/accent colors only where they suit the pet gear.`,
        imageUrl: existing.imageUrl || selectedChoiceImage("pet", character.pet) || "/assets/homepage/mascot/orbit.png",
        sourceCharacterIds: [...new Set([...(existing.sourceCharacterIds || []), character.id])],
        consistencyLocked: true,
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
      };
    })()
    : null;

  return pet ? [...accessoryObjects, pet] : accessoryObjects;
}

function starterScenesFromCharacter(character, world) {
  if (storyboardProject.scenes?.length) {
    return storyboardProject.scenes.map((scene) => ({
      ...scene,
      selectedCharacterIds: [character.id],
      selectedWorldId: world?.id || scene.selectedWorldId || "",
      selectedObjectIds: Array.isArray(scene.selectedObjectIds) ? scene.selectedObjectIds : [],
      status: scene.generatedImageUrl ? "complete" : scene.status || "draft",
    }));
  }
  return [
    {
      id: uid("scene"),
      order: 1,
      title: "Scene 1",
      prompt: "",
      selectedCharacterIds: [character.id],
      selectedWorldId: world?.id || "",
      selectedObjectIds: [],
      status: "draft",
    },
  ];
}

function saveCharacterToProject({ navigateToWorld = false, addAnother = false } = {}) {
  const character = characterRecordFromRecipe({ keepExistingId: !addAnother });
  const existingActiveWorld = (storyboardProject.worlds || []).find((item) => item.id === storyboardProject.activeWorldId);
  const shouldCreateCharacterWorld = !existingActiveWorld && !(storyboardProject.worlds || []).length;
  const world = shouldCreateCharacterWorld
    ? worldRecordFromCharacter(character)
    : existingActiveWorld || (storyboardProject.worlds || [])[0];
  const objects = objectRecordsFromCharacter(character);
  const characters = storyboardProject.characters.filter((item) => item.id !== character.id);
  const worlds = shouldCreateCharacterWorld
    ? storyboardProject.worlds.filter((item) => item.id !== world.id)
    : storyboardProject.worlds;
  const objectIds = new Set(objects.map((item) => item.id));
  const preservedObjects = storyboardProject.objects.filter((item) => !objectIds.has(item.id));

  storyboardProject = saveStoryboardProject({
    ...storyboardProject,
    activeCharacterId: character.id,
    activeWorldId: world?.id || "",
    characters: [character, ...characters],
    worlds: shouldCreateCharacterWorld ? [world, ...worlds] : worlds,
    objects: [...preservedObjects, ...objects],
    scenes: starterScenesFromCharacter(character, world),
  });

  editingCharacterId = character.id;
  statusNode.textContent = `${character.name} saved. World, objects and starter scenes are ready.`;
  if (characterSaveStatus) {
    characterSaveStatus.textContent = `${character.name} saved. You can proceed to the story builder.`;
    characterSaveStatus.classList.add("is-saved");
  }
  window.OPREALMRefreshCreatorSteps?.();
  proceedToStoryBuilderButton?.removeAttribute("hidden");

  if (addAnother) {
    resetCharacterFormForAnother();
    if (characterSaveStatus) {
      characterSaveStatus.textContent = `${character.name} saved. Start another character when you're ready.`;
      characterSaveStatus.classList.add("is-saved");
    }
    proceedToStoryBuilderButton?.setAttribute("hidden", "");
    return;
  }
  if (navigateToWorld) {
    window.location.href = "/storyboard.html#worlds";
  }
}

function applyRecipeToForm(character) {
  if (!character) return;
  const savedRecipe = character.recipe || {};
  Object.assign(recipeState.identity, savedRecipe.identity || {
    name: character.name,
    tagline: character.tagline,
    characterAge: character.characterAge ?? ageFromLegacyGroup(character.ageGroup),
    genderPresentation: character.genderPresentation,
    customGender: character.customGender,
    characterType: character.characterType,
    traits: character.traits || recipeState.identity.traits,
    voice: character.voice,
  });
  recipeState.identity.characterAge = clampCharacterAge(recipeState.identity.characterAge ?? ageFromLegacyGroup(recipeState.identity.ageGroup));
  Object.assign(recipeState.visual, savedRecipe.visual || {
    sourceMode: character.sourceMode,
    masterStyle: character.masterStyle,
    palette: character.palette || recipeState.visual.palette,
  });
  Object.assign(recipeState.components, savedRecipe.components || {
    outfit: character.outfit,
    customOutfit: character.customOutfit,
    accessories: character.accessories || recipeState.components.accessories,
    customObject: character.customObject,
    pet: character.pet || recipeState.components.pet,
    customPet: character.customPet,
    environment: character.environment,
  });
  Object.assign(recipeState.generation, savedRecipe.generation || {
    consistencyLock: Boolean(character.consistencyLocked),
    version: recipeState.generation.version,
  });
  recipeState.generation.generatedImageUrl = character.imageUrl || savedRecipe.generation?.generatedImageUrl || "";

  if (nameInput) nameInput.value = recipeState.identity.name || "";
  if (taglineInput) taglineInput.value = recipeState.identity.tagline || "";
  if (characterAgeSlider) characterAgeSlider.value = recipeState.identity.characterAge;
  if (characterAgeValue) characterAgeValue.textContent = recipeState.identity.characterAge;
  if (promptNotesInput) promptNotesInput.value = character.prompt || buildPromptPreview();
  if (customOutfitInlineInput) customOutfitInlineInput.value = recipeState.components.customOutfit || "";
  if (customObjectInput) customObjectInput.value = recipeState.components.customObject || "";
  if (customPetInput) customPetInput.value = recipeState.components.customPet || "";
  if (voiceSelect) voiceSelect.value = recipeState.identity.voice || "Young Adventurer";
  if (consistencyInput) consistencyInput.checked = Boolean(recipeState.generation.consistencyLock);
  setCharacterImage(recipeState.generation.generatedImageUrl);
  refreshChoiceUi();
}

function refreshChoiceUi() {
  document.querySelectorAll("[data-recipe-choice]").forEach((button) => {
    const group = button.dataset.recipeChoice;
    const value = button.dataset.value;
    const selected = group === "genderPresentation"
      ? recipeState.identity[group] === value
      : group === "sourceMode" || group === "masterStyle"
        ? recipeState.visual[group] === value
        : recipeState.components[group] === value;
    button.classList.toggle("is-selected", selected);
    if (group === "sourceMode") button.classList.toggle("is-active", selected);
    if (selected) syncVisualPreview(group, button);
  });
  document.querySelectorAll("[data-recipe-multi]").forEach((button) => {
    const group = button.dataset.recipeMulti;
    const value = button.dataset.value;
    const list = group === "trait" ? recipeState.identity.traits : group === "palette" ? recipeState.visual.palette : recipeState.components.accessories;
    button.classList.toggle("is-selected", Array.isArray(list) && list.includes(value));
  });
}

function resetCharacterFormForAnother() {
  editingCharacterId = "";
  recipeState.identity.name = `Hero ${storyboardProject.characters.length + 1}`;
  recipeState.identity.tagline = "";
  recipeState.identity.characterAge = 10;
  recipeState.identity.traits = ["Brave", "Curious"];
  recipeState.identity.characterType = "New hero";
  recipeState.components.outfit = "Custom";
  recipeState.components.customOutfit = "";
  recipeState.components.accessories = ["None"];
  recipeState.components.customObject = "";
  recipeState.components.pet = "No Pet";
  recipeState.components.customPet = "";
  recipeState.generation.generatedImageUrl = "";
  recipeState.generation.version = 1;
  if (nameInput) nameInput.value = recipeState.identity.name;
  if (taglineInput) taglineInput.value = "";
  if (characterAgeSlider) characterAgeSlider.value = recipeState.identity.characterAge;
  if (characterAgeValue) characterAgeValue.textContent = recipeState.identity.characterAge;
  if (promptNotesInput) promptNotesInput.value = buildPromptPreview();
  if (customOutfitInlineInput) customOutfitInlineInput.value = "";
  if (customObjectInput) customObjectInput.value = "";
  if (customPetInput) customPetInput.value = "";
  setCharacterImage("");
  refreshChoiceUi();
  renderSummary();
}

function clearCharacterForm() {
  const savedCharacter = storyboardProject.characters.find((character) => character.id === editingCharacterId)
    || storyboardProject.characters.find((character) => character.id === storyboardProject.activeCharacterId);
  const hasWork = Boolean(
    savedCharacter
    || editingCharacterId
    || recipeState.generation.generatedImageUrl
    || cleanText(nameInput?.value)
    || cleanText(taglineInput?.value)
    || cleanText(customOutfitInlineInput?.value)
    || cleanText(customObjectInput?.value)
    || cleanText(customPetInput?.value)
  );
  const confirmation = savedCharacter
    ? `Clear "${savedCharacter.name || "this character"}"? This deletes the saved character and removes it from existing scenes. Scene text, worlds and other saved characters will remain.`
    : "Clear this character editor? This removes the current unsaved character details and preview image.";
  if (hasWork && !window.confirm(confirmation)) {
    return;
  }

  const clearedCharacterId = savedCharacter?.id || editingCharacterId || "";
  if (clearedCharacterId) {
    const objects = (storyboardProject.objects || []).reduce((kept, object) => {
      const sourceCharacterIds = (object.sourceCharacterIds || []).filter((id) => id !== clearedCharacterId);
      if (object.sourceCharacterIds?.length && !sourceCharacterIds.length) return kept;
      kept.push({ ...object, sourceCharacterIds });
      return kept;
    }, []);
    storyboardProject = saveStoryboardProject({
      ...storyboardProject,
      activeCharacterId: storyboardProject.activeCharacterId === clearedCharacterId ? "" : storyboardProject.activeCharacterId,
      characters: (storyboardProject.characters || []).filter((character) => character.id !== clearedCharacterId),
      objects,
      scenes: (storyboardProject.scenes || []).map((scene) => ({
        ...scene,
        selectedCharacterIds: (scene.selectedCharacterIds || []).filter((id) => id !== clearedCharacterId),
        selectedObjectIds: (scene.selectedObjectIds || []).filter((id) => objects.some((object) => object.id === id)),
      })),
    });
  } else if (storyboardProject.activeCharacterId) {
    storyboardProject = saveStoryboardProject({
      ...storyboardProject,
      activeCharacterId: "",
    });
  }

  editingCharacterId = "";
  Object.assign(recipeState.identity, {
    name: "",
    tagline: "",
    characterAge: 10,
    genderPresentation: "Boy",
    customGender: "",
    characterType: "Young adventurer",
    traits: ["Brave", "Curious"],
    voice: "Young Adventurer",
  });
  Object.assign(recipeState.visual, {
    sourceMode: "AI Generate",
    masterStyle: "3D Cartoon",
    palette: ["Orange", "Blue", "Charcoal", "Silver"],
  });
  Object.assign(recipeState.components, {
    outfit: "Custom",
    customOutfit: "",
    accessories: ["None"],
    customObject: "",
    pet: "No Pet",
    customPet: "",
    environment: selectedProjectWorld()?.name || "",
  });
  Object.assign(recipeState.generation, {
    consistencyLock: true,
    changedComponent: "",
    generatedImageUrl: "",
    version: 1,
  });

  if (nameInput) nameInput.value = "";
  if (taglineInput) taglineInput.value = "";
  if (characterAgeSlider) characterAgeSlider.value = "10";
  if (characterAgeValue) characterAgeValue.textContent = "10";
  if (voiceSelect) voiceSelect.value = "Young Adventurer";
  if (consistencyInput) consistencyInput.checked = true;
  if (customOutfitInlineInput) customOutfitInlineInput.value = "";
  if (customObjectInput) customObjectInput.value = "";
  if (customPetInput) customPetInput.value = "";
  if (customGenderInput) customGenderInput.value = "";
  if (customOutfitInput) customOutfitInput.value = "";
  colorSwatchRow?.querySelectorAll(".custom-color").forEach((node) => node.remove());

  setCharacterImage("");
  refreshChoiceUi();
  renderSummary();
  updateCounts();
  if (proceedToStoryBuilderButton) proceedToStoryBuilderButton.hidden = true;
  if (characterSaveStatus) {
    characterSaveStatus.textContent = savedCharacter
      ? `${savedCharacter.name || "Character"} cleared from this project.`
      : "Character editor cleared.";
    characterSaveStatus.classList.remove("is-saved");
  }
  if (statusNode) statusNode.textContent = "Add character details, then generate a new image.";
  nameInput?.focus();
}

function renderSummary() {
  syncInputs();
  updateCounts();
  setCharacterImage(currentCharacterImageSrc());
  if (!summary) return;
  summary.innerHTML = [
    row("Identity", `${recipeState.identity.name}, ${genderLabel()}, age ${recipeState.identity.characterAge}`),
    row("Type", recipeState.identity.characterType),
    row("Prompt Description", recipeState.identity.tagline || "Not set"),
    row("Traits", recipeState.identity.traits),
    row("Master Style", recipeState.visual.masterStyle),
    row("Source", recipeState.visual.sourceMode),
    row("Colors", recipeState.visual.palette),
    row("Outfit", recipeState.components.outfit === "Custom" && recipeState.components.customOutfit ? `Custom: ${recipeState.components.customOutfit}` : recipeState.components.outfit),
    row("Accessories", accessorySummary()),
    row("Pet", recipeState.components.pet === "Custom Pet" && recipeState.components.customPet ? `Custom Pet: ${recipeState.components.customPet}` : recipeState.components.pet),
    row("World", selectedProjectWorld()?.name || "Neutral character studio"),
    row("Voice", recipeState.identity.voice),
    row("Consistency", recipeState.generation.consistencyLock ? "Locked" : "Exploring"),
    row("Version", `${recipeState.identity.name || "Character"} v${recipeState.generation.version}`),
    row("Safety", "Safe component recipe"),
  ].join("");
}

async function recipePayload() {
  syncInputs();
  const world = syncCharacterWorldContext();
  const worldImage = world?.imageUrl || world?.generatedImageUrl || "";
  const preparedWorldImage = worldImage
    ? await compressImageDataUrl(worldImage, 960, 1280, 0.78)
    : "";
  return {
    recipe: recipeState,
    prompt: cleanText(promptNotesInput?.value, buildPromptPreview()).slice(0, 300),
    name: recipeState.identity.name,
    style: recipeState.visual.masterStyle,
    type: recipeState.identity.characterType,
    personality: "Brave and kind",
    safety: "Friendly and safe for all ages",
    world: world ? {
      id: world.id,
      name: world.name,
      description: world.description || world.prompt || "",
      imageDataUrl: preparedWorldImage,
    } : null,
    variation: recipeState.generation.version > 1,
    idempotencyKey: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  };
}

function downloadFileName(value) {
  return `${cleanText(value, "oprealm-character-reference").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "oprealm-character-reference"}.png`;
}

async function downloadImageFromSrc(src, filename) {
  if (!src) return false;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }
}

function currentCharacterImageName() {
  return downloadFileName(`${recipeState.identity.name || "character"} ${recipeState.visual.masterStyle} reference`);
}

function openCharacterLightbox() {
  const src = currentCharacterImageSrc();
  if (!characterLightbox || !characterLightboxImage || !src) return;
  characterLightboxImage.src = src;
  characterLightbox.hidden = false;
}

function closeCharacterLightbox() {
  if (!characterLightbox || !characterLightboxImage) return;
  characterLightbox.hidden = true;
  characterLightboxImage.removeAttribute("src");
}

async function generateCharacter() {
  if (!generateButton) return;
  generateButton.disabled = true;
  if (inlineGenerateButton) inlineGenerateButton.disabled = true;
  setCharacterGenerating(true);
  statusNode.textContent = "Building your character recipe and generating the image...";
  try {
    const response = await fetch("/api/story-character-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await recipePayload()),
    });
    const data = await response.json();
    if (response.status === 401 || response.status === 403) {
      statusNode.innerHTML = 'Please <a href="https://oprealm.com/login?return=/storyboard-character.html">log in</a> to generate a character image.';
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Character generation failed.");
    if (!data.imageDataUrl) throw new Error("Character image result was empty.");
    const compressedImage = await compressImageDataUrl(data.imageDataUrl);
    setCharacterImage(compressedImage);
    recipeState.generation.version += 1;
    statusNode.textContent = `Generated ${recipeState.identity.name || "character"} v${recipeState.generation.version - 1}. ${data.creditsUsed || 0} credits used.`;
    renderSummary();
    finishCharacterGenerationProgress();
    await new Promise((resolve) => window.setTimeout(resolve, 280));
  } catch (error) {
    statusNode.textContent = error.message || "Character generation failed.";
  } finally {
    setCharacterGenerating(false);
    generateButton.disabled = false;
    if (inlineGenerateButton) inlineGenerateButton.disabled = false;
  }
}

document.querySelectorAll("[data-recipe-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.dataset.recipeChoice;
    const value = button.dataset.value;
    if (group === "genderPresentation" && value === "Other") {
      openCustomGenderModal();
      return;
    }
    selectChoiceCard(group, value);
    renderSummary();
  });
  button.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !event.target.matches("textarea, input, select")) {
      event.preventDefault();
      button.click();
    }
  });
});

document.querySelectorAll("[data-recipe-multi]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleMultiChoice(button.dataset.recipeMulti, button.dataset.value, button);
    renderSummary();
  });
});

[nameInput, taglineInput, characterAgeSlider, promptNotesInput, voiceSelect, consistencyInput].forEach((input) => {
  input?.addEventListener("input", renderSummary);
  input?.addEventListener("change", renderSummary);
});

[customOutfitInlineInput, customObjectInput, customPetInput].forEach((input) => {
  input?.addEventListener("click", (event) => event.stopPropagation());
  input?.addEventListener("pointerdown", (event) => event.stopPropagation());
});

customOutfitInlineInput?.addEventListener("input", () => {
  selectChoiceCard("outfit", "Custom");
  renderSummary();
});
customObjectInput?.addEventListener("input", () => {
  ensureMultiChoice("accessories", "Custom Object");
  renderSummary();
});
customPetInput?.addEventListener("input", () => {
  selectChoiceCard("pet", "Custom Pet");
  renderSummary();
});

generateButton?.addEventListener("click", generateCharacter);
inlineGenerateButton?.addEventListener("click", generateCharacter);
saveCharacterButton?.addEventListener("click", () => saveCharacterToProject());
saveAndAddCharacterButton?.addEventListener("click", () => saveCharacterToProject({ addAnother: true }));
clearCharacterButton?.addEventListener("click", clearCharacterForm);
customPaletteInput?.addEventListener("input", () => {
  const swatch = customPaletteInput.closest(".color-wheel-swatch");
  if (swatch) swatch.style.background = customPaletteInput.value;
});
customPaletteInput?.addEventListener("change", () => addCustomPaletteColor(customPaletteInput.value));
enlargeCharacterReferenceButton?.addEventListener("click", openCharacterLightbox);
downloadCharacterReferenceButton?.addEventListener("click", () => {
  downloadImageFromSrc(currentCharacterImageSrc(), currentCharacterImageName());
});
downloadCharacterLightboxButton?.addEventListener("click", () => {
  downloadImageFromSrc(characterLightboxImage?.src || currentCharacterImageSrc(), currentCharacterImageName());
});
closeCharacterLightboxButton?.addEventListener("click", closeCharacterLightbox);
saveCustomOutfitButton?.addEventListener("click", saveCustomOutfit);
cancelCustomOutfitButton?.addEventListener("click", closeCustomOutfitModal);
closeCustomOutfitButton?.addEventListener("click", closeCustomOutfitModal);
saveCustomGenderButton?.addEventListener("click", saveCustomGender);
cancelCustomGenderButton?.addEventListener("click", closeCustomGenderModal);
closeCustomGenderButton?.addEventListener("click", closeCustomGenderModal);
customOutfitModal?.addEventListener("click", (event) => {
  if (event.target === customOutfitModal) closeCustomOutfitModal();
});
customGenderModal?.addEventListener("click", (event) => {
  if (event.target === customGenderModal) closeCustomGenderModal();
});
customOutfitInput?.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") saveCustomOutfit();
});
customGenderInput?.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") saveCustomGender();
});
characterLightbox?.addEventListener("click", (event) => {
  if (event.target === characterLightbox) closeCharacterLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && characterLightbox && !characterLightbox.hidden) closeCharacterLightbox();
  if (event.key === "Escape" && customOutfitModal && !customOutfitModal.hidden) closeCustomOutfitModal();
  if (event.key === "Escape" && customGenderModal && !customGenderModal.hidden) closeCustomGenderModal();
});
const characterToEdit = editingCharacterId
  ? storyboardProject.characters.find((character) => character.id === editingCharacterId)
  : storyboardProject.characters.find((character) => character.id === storyboardProject.activeCharacterId) || null;
if (characterToEdit) {
  editingCharacterId = characterToEdit.id;
  applyRecipeToForm(characterToEdit);
}
syncCharacterWorldContext();
setCharacterImage(characterToEdit?.imageUrl || "");
renderSummary();
