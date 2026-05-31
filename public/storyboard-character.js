const recipeState = {
  identity: {
    name: "Kai",
    tagline: "Brave explorer with a big heart.",
    ageGroup: "Child",
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
    outfit: "Explorer",
    customOutfit: "",
    accessories: ["Backpack"],
    environment: "Magic portal studio",
  },
  generation: {
    consistencyLock: true,
    changedComponent: "",
    version: 1,
  },
};

const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";

const componentLabels = {
  sourceMode: "Generation Source",
  masterStyle: "Master Style",
  ageGroup: "Age Group",
  genderPresentation: "Gender",
  outfit: "Outfit",
  environment: "Preview Environment",
};

const nameInput = document.querySelector("#characterNameInput");
const taglineInput = document.querySelector("#characterTaglineInput");
const promptNotesInput = document.querySelector("#characterPromptNotes");
const voiceSelect = document.querySelector("#characterVoiceSelect");
const summary = document.querySelector("#characterRecipeSummary");
const generateButton = document.querySelector("#generateCharacterRecipeButton");
const statusNode = document.querySelector("#characterGenerationStatus");
const consistencyInput = document.querySelector("#consistencyLockInput");
const conceptImage = document.querySelector(".character-art-frame img");
const liveImage = document.querySelector(".live-character-stage img");
const liveStage = document.querySelector(".live-character-stage");
const enlargeCharacterReferenceButton = document.querySelector("#enlargeCharacterReferenceButton");
const downloadCharacterReferenceButton = document.querySelector("#downloadCharacterReferenceButton");
const characterLightbox = document.querySelector("#characterReferenceLightbox");
const characterLightboxImage = document.querySelector("#characterLightboxImage");
const closeCharacterLightboxButton = document.querySelector("#closeCharacterLightboxButton");
const downloadCharacterLightboxButton = document.querySelector("#downloadCharacterLightboxButton");
const customPaletteInput = document.querySelector("#customPaletteInput");
const colorSwatchRow = document.querySelector(".color-swatch-row");
const traitRow = document.querySelector("#traitRow");
const addTraitButton = document.querySelector("#addTraitButton");
const customOutfitModal = document.querySelector("#customOutfitModal");
const customOutfitInput = document.querySelector("#customOutfitInput");
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
let editingCharacterId = new URLSearchParams(window.location.search).get("character") || storyboardProject.activeCharacterId || "";

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function setSingleChoice(group, value) {
  if (group === "ageGroup" || group === "genderPresentation") {
    recipeState.identity[group] = value;
  } else if (group === "sourceMode" || group === "masterStyle") {
    recipeState.visual[group] = value;
  } else if (group === "outfit") {
    recipeState.components.outfit = value;
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
  if (group === "masterStyle") {
    const previewSrc = button?.querySelector("img")?.getAttribute("src");
    if (previewSrc && conceptImage && !conceptImage.src.startsWith("data:")) conceptImage.src = previewSrc;
    if (previewSrc && liveImage && !liveImage.src.startsWith("data:")) liveImage.src = previewSrc;
  }

  if (group === "environment" && liveStage) {
    const previewSrc = button?.querySelector("img")?.getAttribute("src");
    liveStage.style.setProperty("--character-environment-preview", previewSrc ? `url("${previewSrc}")` : "none");
  }
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

function addCustomTrait() {
  const value = cleanText(window.prompt("Add a character trait, like mischievous, gentle, dramatic, determined, shy, bold..."), "").slice(0, 32);
  if (!value) return;
  if (recipeState.identity.traits.some((trait) => trait.toLowerCase() === value.toLowerCase())) return;
  recipeState.identity.traits = [...recipeState.identity.traits, value].slice(0, 10);
  const button = document.createElement("button");
  button.className = "is-selected custom-trait";
  button.type = "button";
  button.dataset.recipeMulti = "trait";
  button.dataset.value = value;
  button.textContent = `${value} x`;
  button.addEventListener("click", () => {
    toggleMultiChoice("trait", value, button);
    renderSummary();
  });
  traitRow?.insertBefore(button, addTraitButton || null);
  recipeState.generation.changedComponent = "Personality Traits";
  renderSummary();
}

function syncInputs() {
  recipeState.identity.name = cleanText(nameInput?.value, "Kai").slice(0, 30);
  recipeState.identity.tagline = cleanText(taglineInput?.value, "").slice(0, 80);
  recipeState.identity.voice = cleanText(voiceSelect?.value, "Young Adventurer").slice(0, 80);
  recipeState.generation.consistencyLock = Boolean(consistencyInput?.checked);
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
  const outfitDescription = recipeState.components.outfit === "Custom" && recipeState.components.customOutfit
    ? `Custom outfit: ${recipeState.components.customOutfit}`
    : `Outfit: ${recipeState.components.outfit}`;
  return [
    `${recipeState.identity.name}, ${recipeState.identity.ageGroup.toLowerCase()} ${genderLabel().toLowerCase()} ${recipeState.identity.characterType}.`,
    `${recipeState.identity.tagline}`,
    `Personality: ${recipeState.identity.traits.join(", ")}.`,
    `Master style: ${recipeState.visual.masterStyle}. All clothing, items, palette, lighting and background must match this style.`,
    `${outfitDescription}. Accessories: ${recipeState.components.accessories.join(", ")}.`,
    `Outfit, accessory and gear colors only: ${recipeState.visual.palette.join(", ")}. Environment: ${recipeState.components.environment}.`,
  ].filter(Boolean).join(" ");
}

function characterRecordFromRecipe({ keepExistingId = true } = {}) {
  syncInputs();
  const existing = storyboardProject.characters.find((character) => character.id === editingCharacterId) || {};
  const characterId = keepExistingId && existing.id ? existing.id : uid("character");
  const imageUrl = conceptImage?.src || selectedChoiceImage("masterStyle", recipeState.visual.masterStyle) || "";
  const environmentImageUrl = selectedChoiceImage("environment", recipeState.components.environment);
  const prompt = cleanText(promptNotesInput?.value, buildPromptPreview()).slice(0, 300);
  return {
    ...existing,
    id: characterId,
    name: recipeState.identity.name || "New Character",
    tagline: recipeState.identity.tagline,
    ageGroup: recipeState.identity.ageGroup,
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
      `Mood from character: ${character.tagline || character.traits.join(", ")}`,
      `Use character outfit colors only as subtle accent lighting: ${character.palette.join(", ")}`,
    ],
    sourceCharacterIds: [...new Set([...(existing.sourceCharacterIds || []), character.id])],
    consistencyLocked: true,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function objectRecordsFromCharacter(character) {
  return (character.accessories || [])
    .filter((item) => item && item !== "None")
    .map((item) => {
      const objectId = `object-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const existing = storyboardProject.objects.find((object) => object.id === objectId) || {};
      return {
        ...existing,
        id: objectId,
        name: item,
        description: `${item} used by ${character.name}. Keep it in ${character.masterStyle} style and match only the selected outfit/accessory colors: ${character.palette.join(", ")}.`,
        imageUrl: existing.imageUrl || "/assets/homepage/tools/asset-library.png",
        sourceCharacterIds: [...new Set([...(existing.sourceCharacterIds || []), character.id])],
        consistencyLocked: true,
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
      };
    });
}

function starterScenesFromCharacter(character, world) {
  if (storyboardProject.scenes?.length) return storyboardProject.scenes;
  return [
    {
      id: uid("scene"),
      order: 1,
      title: "Scene 1",
      prompt: "",
      selectedCharacterIds: [character.id],
      selectedWorldId: world.id,
      selectedObjectIds: [],
      status: "draft",
    },
  ];
}

function saveCharacterToProject({ navigateToWorld = false, addAnother = false } = {}) {
  const character = characterRecordFromRecipe({ keepExistingId: !addAnother });
  const world = worldRecordFromCharacter(character);
  const objects = objectRecordsFromCharacter(character);
  const characters = storyboardProject.characters.filter((item) => item.id !== character.id);
  const worlds = storyboardProject.worlds.filter((item) => item.id !== world.id);
  const objectIds = new Set(objects.map((item) => item.id));
  const preservedObjects = storyboardProject.objects.filter((item) => !objectIds.has(item.id));

  storyboardProject = saveStoryboardProject({
    ...storyboardProject,
    activeCharacterId: character.id,
    activeWorldId: world.id,
    characters: [...characters, character],
    worlds: [world, ...worlds],
    objects: [...preservedObjects, ...objects],
    scenes: starterScenesFromCharacter(character, world),
  });

  editingCharacterId = character.id;
  statusNode.textContent = `${character.name} saved. World, objects and starter scenes are ready.`;

  if (addAnother) {
    resetCharacterFormForAnother();
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
    ageGroup: character.ageGroup,
    genderPresentation: character.genderPresentation,
    customGender: character.customGender,
    characterType: character.characterType,
    traits: character.traits || recipeState.identity.traits,
    voice: character.voice,
  });
  Object.assign(recipeState.visual, savedRecipe.visual || {
    sourceMode: character.sourceMode,
    masterStyle: character.masterStyle,
    palette: character.palette || recipeState.visual.palette,
  });
  Object.assign(recipeState.components, savedRecipe.components || {
    outfit: character.outfit,
    customOutfit: character.customOutfit,
    accessories: character.accessories || recipeState.components.accessories,
    environment: character.environment,
  });
  Object.assign(recipeState.generation, savedRecipe.generation || {
    consistencyLock: Boolean(character.consistencyLocked),
    version: recipeState.generation.version,
  });

  if (nameInput) nameInput.value = recipeState.identity.name || "";
  if (taglineInput) taglineInput.value = recipeState.identity.tagline || "";
  if (promptNotesInput) promptNotesInput.value = character.prompt || buildPromptPreview();
  if (voiceSelect) voiceSelect.value = recipeState.identity.voice || "Young Adventurer";
  if (consistencyInput) consistencyInput.checked = Boolean(recipeState.generation.consistencyLock);
  if (conceptImage && character.imageUrl) conceptImage.src = character.imageUrl;
  if (liveImage && character.imageUrl) liveImage.src = character.imageUrl;
  refreshChoiceUi();
}

function refreshChoiceUi() {
  document.querySelectorAll("[data-recipe-choice]").forEach((button) => {
    const group = button.dataset.recipeChoice;
    const value = button.dataset.value;
    const selected = group === "ageGroup" || group === "genderPresentation"
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
  recipeState.identity.traits = ["Brave", "Curious"];
  recipeState.identity.characterType = "New hero";
  recipeState.components.accessories = ["None"];
  recipeState.generation.version = 1;
  if (nameInput) nameInput.value = recipeState.identity.name;
  if (taglineInput) taglineInput.value = "";
  if (promptNotesInput) promptNotesInput.value = buildPromptPreview();
  refreshChoiceUi();
  renderSummary();
}

function renderSummary() {
  syncInputs();
  updateCounts();
  if (!summary) return;
  summary.innerHTML = [
    row("Identity", `${recipeState.identity.name}, ${genderLabel()}, ${recipeState.identity.ageGroup}`),
    row("Type", recipeState.identity.characterType),
    row("Tagline", recipeState.identity.tagline || "Not set"),
    row("Traits", recipeState.identity.traits),
    row("Master Style", recipeState.visual.masterStyle),
    row("Source", recipeState.visual.sourceMode),
    row("Colors", recipeState.visual.palette),
    row("Outfit", recipeState.components.outfit === "Custom" && recipeState.components.customOutfit ? `Custom: ${recipeState.components.customOutfit}` : recipeState.components.outfit),
    row("Accessories", recipeState.components.accessories),
    row("Environment", recipeState.components.environment),
    row("Voice", recipeState.identity.voice),
    row("Consistency", recipeState.generation.consistencyLock ? "Locked" : "Exploring"),
    row("Version", `${recipeState.identity.name || "Character"} v${recipeState.generation.version}`),
    row("Safety", "Safe component recipe"),
  ].join("");
}

function recipePayload() {
  syncInputs();
  return {
    recipe: recipeState,
    prompt: cleanText(promptNotesInput?.value, buildPromptPreview()).slice(0, 300),
    name: recipeState.identity.name,
    style: recipeState.visual.masterStyle,
    type: recipeState.identity.characterType,
    personality: "Brave and kind",
    safety: "Friendly and safe for all ages",
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
  if (!characterLightbox || !characterLightboxImage || !conceptImage?.src) return;
  characterLightboxImage.src = conceptImage.src;
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
  statusNode.textContent = "Building your character recipe and generating the image...";
  try {
    const response = await fetch("/api/story-character-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(recipePayload()),
    });
    const data = await response.json();
    if (response.status === 401 || response.status === 403) {
      statusNode.innerHTML = 'Please <a href="https://oprealm.com/login?return=/storyboard-character.html">log in</a> to generate a character image.';
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Character generation failed.");
    if (!data.imageDataUrl) throw new Error("Character image result was empty.");
    conceptImage.src = data.imageDataUrl;
    liveImage.src = data.imageDataUrl;
    recipeState.generation.version += 1;
    statusNode.textContent = `Generated ${recipeState.identity.name || "character"} v${recipeState.generation.version - 1}. ${data.creditsUsed || 0} credits used.`;
    renderSummary();
  } catch (error) {
    statusNode.textContent = error.message || "Character generation failed.";
  } finally {
    generateButton.disabled = false;
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
    if (group === "outfit" && value === "Custom") {
      openCustomOutfitModal();
      return;
    }
    document.querySelectorAll(`[data-recipe-choice="${group}"]`).forEach((item) => item.classList.toggle("is-selected", item === button));
    if (group === "sourceMode") {
      document.querySelectorAll(".appearance-tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
    }
    setSingleChoice(group, value);
    syncVisualPreview(group, button);
    renderSummary();
  });
});

document.querySelectorAll("[data-recipe-multi]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleMultiChoice(button.dataset.recipeMulti, button.dataset.value, button);
    renderSummary();
  });
});

[nameInput, taglineInput, promptNotesInput, voiceSelect, consistencyInput].forEach((input) => {
  input?.addEventListener("input", renderSummary);
  input?.addEventListener("change", renderSummary);
});

generateButton?.addEventListener("click", generateCharacter);
saveCharacterButton?.addEventListener("click", () => saveCharacterToProject({ navigateToWorld: true }));
saveAndAddCharacterButton?.addEventListener("click", () => saveCharacterToProject({ addAnother: true }));
addTraitButton?.addEventListener("click", addCustomTrait);
customPaletteInput?.addEventListener("input", () => {
  const swatch = customPaletteInput.closest(".color-wheel-swatch");
  if (swatch) swatch.style.background = customPaletteInput.value;
});
customPaletteInput?.addEventListener("change", () => addCustomPaletteColor(customPaletteInput.value));
enlargeCharacterReferenceButton?.addEventListener("click", openCharacterLightbox);
downloadCharacterReferenceButton?.addEventListener("click", () => {
  downloadImageFromSrc(conceptImage?.src, currentCharacterImageName());
});
downloadCharacterLightboxButton?.addEventListener("click", () => {
  downloadImageFromSrc(characterLightboxImage?.src || conceptImage?.src, currentCharacterImageName());
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
const characterToEdit = storyboardProject.characters.find((character) => character.id === editingCharacterId) || storyboardProject.characters[0];
if (characterToEdit) {
  editingCharacterId = characterToEdit.id;
  applyRecipeToForm(characterToEdit);
}
renderSummary();
