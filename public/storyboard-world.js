const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";

const worldState = {
  identity: {
    name: "Magic Portal Studio",
    hook: "A glowing portal world where every idea becomes a scene.",
    worldType: "Portal Hub",
  },
  visual: {
    sourceMode: "AI Generate",
    theme: "Magic portal studio",
  },
  details: {
    mood: ["Magical", "Epic", "Mysterious"],
    landmarks: ["Central hero platform", "Glowing portal"],
    rules: ["Ideas open portals"],
  },
  generation: {
    consistencyLock: true,
  },
};

const worldDescriptions = {
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
const worldHookInput = document.querySelector("#worldHookInput");
const worldPromptNotes = document.querySelector("#worldPromptNotes");
const worldPreviewImage = document.querySelector("#worldPreviewImage");
const worldLiveImage = document.querySelector("#worldLiveImage");
const worldSummary = document.querySelector("#worldRecipeSummary");
const worldConsistencyLockInput = document.querySelector("#worldConsistencyLockInput");
const saveWorldButton = document.querySelector("#saveWorldButton");
const saveWorldAndCharacterButton = document.querySelector("#saveWorldAndCharacterButton");
const generateWorldPreviewButton = document.querySelector("#generateWorldPreviewButton");
const worldSaveStatus = document.querySelector("#worldSaveStatus");

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
let editingWorldId = new URLSearchParams(window.location.search).get("world") || storyboardProject.activeWorldId || "";

function selectedThemeButton() {
  return document.querySelector(`[data-world-choice="theme"][data-value="${CSS.escape(worldState.visual.theme)}"]`);
}

function selectedThemeImage() {
  return selectedThemeButton()?.querySelector("img")?.getAttribute("src") || "/assets/character-creator/environments/magic-portal-studio.png";
}

function syncInputs() {
  worldState.identity.name = cleanText(worldNameInput?.value, "Story World").slice(0, 40);
  worldState.identity.hook = cleanText(worldHookInput?.value, "").slice(0, 100);
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
  const base = worldDescriptions[worldState.visual.theme] || `${worldState.visual.theme} with a clear central platform and layered kid-friendly detail.`;
  const notes = cleanText(worldPromptNotes?.value, "");
  return notes || base;
}

function renderSummary() {
  syncInputs();
  updateCounts();
  const image = selectedThemeImage();
  if (worldPreviewImage) {
    worldPreviewImage.src = image;
    worldPreviewImage.alt = `${worldState.visual.theme} world concept`;
  }
  if (worldLiveImage) {
    worldLiveImage.src = image;
    worldLiveImage.alt = `${worldState.visual.theme} live world preview`;
  }
  if (!worldSummary) return;
  worldSummary.innerHTML = [
    row("World", worldState.identity.name),
    row("Hook", worldState.identity.hook || "Not set"),
    row("Type", worldState.identity.worldType),
    row("Theme", worldState.visual.theme),
    row("Mood", worldState.details.mood),
    row("Landmarks", worldState.details.landmarks),
    row("Rules", worldState.details.rules),
    row("Memory", worldState.generation.consistencyLock ? "Locked" : "Exploring"),
  ].join("");
}

function setSingleChoice(group, value, button) {
  if (group === "worldType") worldState.identity.worldType = value;
  if (group === "sourceMode") worldState.visual.sourceMode = value;
  if (group === "theme") {
    worldState.visual.theme = value;
    if (worldNameInput && (!worldNameInput.value || worldNameInput.value === "Magic Portal Studio")) {
      worldNameInput.value = value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    if (worldPromptNotes && worldDescriptions[value]) {
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

function worldRecordFromState({ keepExistingId = true } = {}) {
  syncInputs();
  const existing = storyboardProject.worlds.find((world) => world.id === editingWorldId) || {};
  const id = keepExistingId && existing.id ? existing.id : worldIdFromName(worldState.identity.name);
  return {
    ...existing,
    id,
    name: worldState.identity.name,
    hook: worldState.identity.hook,
    worldType: worldState.identity.worldType,
    imageUrl: selectedThemeImage(),
    description: worldDescription(),
    styleNotes: [
      `Theme: ${worldState.visual.theme}`,
      `Mood: ${worldState.details.mood.join(", ")}`,
      `Landmarks: ${worldState.details.landmarks.join(", ")}`,
      `Rules: ${worldState.details.rules.join(", ")}`,
    ],
    sourceMode: worldState.visual.sourceMode,
    theme: worldState.visual.theme,
    mood: [...worldState.details.mood],
    landmarks: [...worldState.details.landmarks],
    rules: [...worldState.details.rules],
    consistencyLocked: worldState.generation.consistencyLock,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
}

function saveWorld({ navigateToCharacter = false } = {}) {
  const world = worldRecordFromState();
  const worlds = storyboardProject.worlds.filter((item) => item.id !== world.id);
  storyboardProject = saveStoryboardProject({
    ...storyboardProject,
    activeWorldId: world.id,
    worlds: [world, ...worlds],
  });
  editingWorldId = world.id;
  if (worldSaveStatus) worldSaveStatus.textContent = `${world.name} saved. It is ready for character creation and scene prompts.`;
  if (navigateToCharacter) window.location.href = "/storyboard-character.html";
}

function applyWorldToForm(world) {
  if (!world) return;
  worldState.identity.name = world.name || worldState.identity.name;
  worldState.identity.hook = world.hook || worldState.identity.hook;
  worldState.identity.worldType = world.worldType || worldState.identity.worldType;
  worldState.visual.sourceMode = world.sourceMode || worldState.visual.sourceMode;
  worldState.visual.theme = world.theme || world.name || worldState.visual.theme;
  worldState.details.mood = world.mood || worldState.details.mood;
  worldState.details.landmarks = world.landmarks || worldState.details.landmarks;
  worldState.details.rules = world.rules || worldState.details.rules;
  worldState.generation.consistencyLock = Boolean(world.consistencyLocked ?? true);
  if (worldNameInput) worldNameInput.value = worldState.identity.name;
  if (worldHookInput) worldHookInput.value = worldState.identity.hook;
  if (worldPromptNotes) worldPromptNotes.value = world.description || worldDescription();
  if (worldConsistencyLockInput) worldConsistencyLockInput.checked = worldState.generation.consistencyLock;
  refreshChoiceUi();
}

function refreshChoiceUi() {
  document.querySelectorAll("[data-world-choice]").forEach((button) => {
    const group = button.dataset.worldChoice;
    const value = button.dataset.value;
    const selected = group === "worldType"
      ? worldState.identity.worldType === value
      : worldState.visual[group] === value;
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

[worldNameInput, worldHookInput, worldPromptNotes, worldConsistencyLockInput].forEach((input) => {
  input?.addEventListener("input", renderSummary);
  input?.addEventListener("change", renderSummary);
});

generateWorldPreviewButton?.addEventListener("click", renderSummary);
saveWorldButton?.addEventListener("click", () => saveWorld());
saveWorldAndCharacterButton?.addEventListener("click", () => saveWorld({ navigateToCharacter: true }));

const worldToEdit = storyboardProject.worlds.find((world) => world.id === editingWorldId) || storyboardProject.worlds[0];
if (worldToEdit) {
  editingWorldId = worldToEdit.id;
  applyWorldToForm(worldToEdit);
} else {
  refreshChoiceUi();
}
renderSummary();
