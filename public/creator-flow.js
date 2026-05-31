const ideaExamples = [
  {
    title: "Space Robot Adventure",
    idea: "A brave kid and a tiny robot discover candy planets in space",
    image: "/assets/homepage/thumbnails/space-adventure.png",
    tags: ["Space", "Robot", "Adventure"],
    copy: "A glowing portal opens above a candy planet, and a robot friend needs help before sour meteorites arrive.",
  },
  {
    title: "Lava Shark Survival",
    idea: "A lava city is attacked by robot sharks",
    image: "/assets/homepage/cards/roblox-worlds.png",
    tags: ["Lava", "Robot Shark", "Survival"],
    copy: "A volcano city starts to sink, and the heroes must build a wild escape before the robot shark reaches the bridge.",
  },
  {
    title: "Fantasy Kingdom Mystery",
    idea: "A hidden castle where dragons protect a secret library",
    image: "/assets/homepage/thumbnails/fantasy-story.png",
    tags: ["Fantasy", "Dragons", "Mystery"],
    copy: "A floating kingdom hides a glowing book that can change every ending in the story.",
  },
  {
    title: "Cyber Pet Glitch",
    idea: "A cyber pet becomes the key to saving a neon city",
    image: "/assets/homepage/thumbnails/neon-beat.png",
    tags: ["Cyber", "Pet", "Glitch"],
    copy: "A funny robot pet glitches into superhero mode and accidentally unlocks a city-wide mystery.",
  },
];

const rotatingIdea = document.querySelector("#rotatingIdea");
const sparkInput = document.querySelector("#sparkInput");
const ideaPreviewImage = document.querySelector("#ideaPreviewImage");
const ideaPreviewTitle = document.querySelector("#ideaPreviewTitle");
const ideaPreviewTags = document.querySelector("#ideaPreviewTags");
const ideaPreviewCopy = document.querySelector("#ideaPreviewCopy");

let ideaIndex = 0;

function updateIdeaPreview(idea) {
  if (!ideaPreviewImage || !ideaPreviewTitle || !ideaPreviewTags || !ideaPreviewCopy) return;
  ideaPreviewImage.src = idea.image;
  ideaPreviewTitle.textContent = idea.title;
  ideaPreviewTags.innerHTML = idea.tags.map((tag) => `<span>${tag}</span>`).join("");
  ideaPreviewCopy.textContent = idea.copy;
  if (rotatingIdea) rotatingIdea.textContent = idea.idea;
}

function nextIdea() {
  ideaIndex = (ideaIndex + 1) % ideaExamples.length;
  updateIdeaPreview(ideaExamples[ideaIndex]);
}

if (rotatingIdea) {
  window.setInterval(() => {
    if (document.activeElement === sparkInput) return;
    nextIdea();
  }, 3800);
}

document.addEventListener("click", (event) => {
  const random = event.target.closest("[data-random-idea]");
  if (random) {
    event.preventDefault();
    nextIdea();
    return;
  }

  const ideaCard = event.target.closest("[data-idea]");
  if (ideaCard) {
    const label = ideaCard.dataset.idea || "New OPREALM idea";
    const image = ideaCard.dataset.image || "/assets/homepage/thumbnails/space-adventure.png";
    const idea = {
      title: label.replace(/\b\w/g, (char) => char.toUpperCase()),
      idea: label,
      image,
      tags: label.split(" ").slice(0, 3),
      copy: `OPREALM can turn "${label}" into characters, worlds, objects and scene cards.`,
    };
    updateIdeaPreview(idea);
    if (sparkInput) sparkInput.value = label;
    return;
  }

  const chip = event.target.closest("[data-chip]");
  if (chip && sparkInput) {
    sparkInput.value = sparkInput.value ? `${sparkInput.value}, ${chip.dataset.chip}` : chip.dataset.chip;
    const idea = {
      title: sparkInput.value.split(",")[0],
      idea: sparkInput.value,
      image: "/assets/homepage/cards/story-games.png",
      tags: sparkInput.value.split(/[,\s]+/).filter(Boolean).slice(0, 4),
      copy: `Nice spark. OPREALM can build characters, scene ideas and a first storyboard from: ${sparkInput.value}.`,
    };
    updateIdeaPreview(idea);
  }
});

if (sparkInput) {
  sparkInput.addEventListener("input", () => {
    const value = sparkInput.value.trim();
    if (!value) return;
    updateIdeaPreview({
      title: value.split(" ").slice(0, 4).join(" "),
      idea: value,
      image: "/assets/homepage/hero/main-hero-world.png",
      tags: value.split(/[,\s]+/).filter(Boolean).slice(0, 4),
      copy: `This spark is ready to become a storyboard: ${value}`,
    });
  });
}

const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function readStoryboardProject() {
  try {
    return JSON.parse(localStorage.getItem(STORYBOARD_PROJECT_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeStoryboardProject(project) {
  localStorage.setItem(STORYBOARD_PROJECT_KEY, JSON.stringify(project));
  return project;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function compactList(values, fallback = "Not set") {
  return (values || []).filter(Boolean).join(", ") || fallback;
}

function renderStoryboardCharacters(project) {
  const target = document.querySelector("#storyboardCharacterList");
  if (!target) return;
  const characters = Array.isArray(project.characters) ? project.characters : [];
  if (!characters.length) {
    target.innerHTML = `
      <article class="ingredient-card empty-ingredient">
        <div>
          <h3>No character saved yet</h3>
          <p>Create and save a character first. OPREALM will carry their style, outfit, traits and environment into the World stage.</p>
          <span class="lock-pill">Needs character</span>
        </div>
      </article>`;
    return;
  }
  target.innerHTML = characters.map((character) => `
    <article class="ingredient-card ${character.id === project.activeCharacterId ? "is-active" : ""}">
      ${character.imageUrl ? `<img src="${escapeHtml(character.imageUrl)}" alt="${escapeHtml(character.name)} character" />` : ""}
      <div>
        <h3>${escapeHtml(character.name || "Unnamed character")}</h3>
        <p>${escapeHtml(compactList([
          character.characterType,
          ...(character.traits || []).slice(0, 3),
          character.masterStyle,
        ], "Saved character"))}</p>
        <span class="lock-pill">${character.consistencyLocked ? "Locked" : "Draft"}</span>
      </div>
    </article>`).join("");
}

function renderStoryboardWorlds(project) {
  const target = document.querySelector("#storyboardWorldList");
  if (!target) return;
  const worlds = Array.isArray(project.worlds) ? project.worlds : [];
  if (!worlds.length) {
    target.innerHTML = `
      <article class="ingredient-card empty-ingredient">
        <div>
          <h3>World not mapped yet</h3>
          <p>Save a character to create a matching world from the selected preview environment, style and palette.</p>
          <span class="lock-pill">Auto-filled after character</span>
        </div>
      </article>`;
    return;
  }
  target.innerHTML = worlds.map((world) => `
    <article class="ingredient-card ${world.id === project.activeWorldId ? "is-active" : ""}">
      ${world.imageUrl ? `<img src="${escapeHtml(world.imageUrl)}" alt="${escapeHtml(world.name)} world" />` : ""}
      <div>
        <h3>${escapeHtml(world.name || "Story world")}</h3>
        <p>${escapeHtml(world.description || compactList(world.styleNotes, "World details ready"))}</p>
        <span class="lock-pill">${world.id === project.activeWorldId ? "Selected" : "Reusable"}</span>
      </div>
    </article>`).join("");
}

function renderStoryboardObjects(project) {
  const target = document.querySelector("#storyboardObjectList");
  if (!target) return;
  const objects = Array.isArray(project.objects) ? project.objects : [];
  if (!objects.length) {
    target.innerHTML = `
      <button class="object-card empty-object-card" type="button">
        <span>No props yet</span>
      </button>`;
    return;
  }
  target.innerHTML = objects.map((object) => `
    <button class="object-card" type="button" title="${escapeHtml(object.description || object.name)}">
      ${object.imageUrl ? `<img src="${escapeHtml(object.imageUrl)}" alt="" />` : ""}
      <span>${escapeHtml(object.name || "Object")}</span>
    </button>`).join("");
}

function renderStoryboardScenes(project) {
  const target = document.querySelector("#storyboardSceneList");
  if (!target) return;
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const worldById = new Map((project.worlds || []).map((world) => [world.id, world]));
  if (!scenes.length) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = scenes
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((scene, index) => {
      const world = worldById.get(scene.selectedWorldId);
      const characters = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
      const chips = [
        ...characters.map((character) => character.name),
        world?.name,
      ].filter(Boolean);
      const media = scene.generatedImageUrl
        ? `<div class="scene-card-media"><img src="${escapeHtml(scene.generatedImageUrl)}" alt="${escapeHtml(scene.title || `Scene ${index + 1}`)} preview" /></div>`
        : `<div class="scene-card-media is-empty">
            <div class="blank-scene-frame">
              <span>16:9 scene image</span>
              <strong>Blank until generated</strong>
              <small>Add a prompt, then generate this story moment.</small>
            </div>
          </div>`;
      return `
        <article class="scene-card" data-scene-id="${escapeHtml(scene.id)}" draggable="true">
          <div class="scene-order-tools">
            <span class="scene-number">${index + 1}</span>
            <button class="scene-drag-handle" type="button" aria-label="Drag scene ${index + 1} to reorder" title="Drag to reorder">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </button>
            <div class="scene-move-controls" aria-label="Move scene ${index + 1}">
              <button type="button" data-move-scene="${escapeHtml(scene.id)}" data-move-direction="up" aria-label="Move scene ${index + 1} up">↑</button>
              <button type="button" data-move-scene="${escapeHtml(scene.id)}" data-move-direction="down" aria-label="Move scene ${index + 1} down">↓</button>
            </div>
          </div>
          ${media}
          <div class="scene-card-body">
            <input class="scene-title-input" data-scene-title="${escapeHtml(scene.id)}" value="${escapeHtml(scene.title || `Scene ${index + 1}`)}" aria-label="Scene ${index + 1} title" />
            <textarea class="scene-prompt-input" data-scene-prompt="${escapeHtml(scene.id)}" placeholder="Describe what happens in this story moment.">${escapeHtml(scene.prompt || "")}</textarea>
            <div class="scene-chip-row">${chips.map((chip, chipIndex) => `<span class="scene-chip ${chipIndex === 0 ? "is-active" : ""}">${escapeHtml(chip)}</span>`).join("")}</div>
            <div class="scene-actions">
              <button class="scene-action" data-ai-assist-scene="${escapeHtml(scene.id)}" type="button">AI Assist Prompt</button>
              <button class="scene-action primary" data-generate-scene="${escapeHtml(scene.id)}" type="button">Generate Scene Image</button>
            </div>
            <p class="scene-status">${scene.generatedImageUrl ? "Image ready" : scene.status === "ready_to_generate" ? "Prompt ready. Image generation is the next step." : "No image generated yet"}</p>
          </div>
        </article>`;
    }).join("");
}

function activeCharacter(project) {
  return (project.characters || []).find((character) => character.id === project.activeCharacterId) || (project.characters || [])[0] || {};
}

function activeWorld(project) {
  return (project.worlds || []).find((world) => world.id === project.activeWorldId) || (project.worlds || [])[0] || {};
}

function storyPromptForIndex(project, index, previousPrompt = "") {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const hero = character.name || "the hero";
  const place = world.name || "the story world";
  const traits = compactList((character.traits || []).slice(0, 3), "brave and curious");
  const style = character.masterStyle || project.globalStyle || "cinematic kid-friendly";
  const prop = (project.objects || []).find((item) => item.name && item.name !== "None")?.name || "a mysterious clue";
  const beats = [
    `${hero} arrives in ${place} and notices something magical is wrong. Show the world clearly, introduce ${hero}'s ${traits} personality, and preserve the ${style} character design.`,
    `${hero} discovers ${prop} and realizes it is connected to the main mystery. Make the scene exciting, readable, and safe for kids.`,
    `A surprising obstacle blocks ${hero}'s path in ${place}. Build naturally from the last moment: ${previousPrompt || "the opening discovery"}`,
    `${hero} must make a meaningful choice that changes the direction of the story. Add a clear emotional beat and a strong visual hook.`,
    `The choice creates a big consequence. Raise the stakes while keeping the same character outfit, colors, face, age, and art style.`,
    `${hero} reaches a launch moment where the player can choose the next creative path: story game, comic, short film, song, Roblox obby, or pixel game.`,
  ];
  return beats[index % beats.length];
}

function sceneTitleFromPrompt(prompt, fallback) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ");
}

function ensureSceneList(project) {
  if (!Array.isArray(project.scenes) || !project.scenes.length) {
    const character = activeCharacter(project);
    const world = activeWorld(project);
    project.scenes = [{
      id: uid("scene"),
      order: 1,
      title: "Scene 1",
      prompt: "",
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: [],
      status: "draft",
    }];
  }
  return project;
}

function normalizeSceneOrders(project) {
  project.scenes = (project.scenes || [])
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((scene, index) => ({ ...scene, order: index + 1 }));
  return project;
}

function moveScene(project, sceneId, targetSceneId, insertAfter = false) {
  const scenes = [...(project.scenes || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const fromIndex = scenes.findIndex((scene) => scene.id === sceneId);
  const targetIndex = scenes.findIndex((scene) => scene.id === targetSceneId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return project;
  const [movedScene] = scenes.splice(fromIndex, 1);
  const currentTargetIndex = scenes.findIndex((scene) => scene.id === targetSceneId);
  const insertIndex = Math.max(0, currentTargetIndex + (insertAfter ? 1 : 0));
  scenes.splice(insertIndex, 0, movedScene);
  project.scenes = scenes.map((scene, index) => ({ ...scene, order: index + 1 }));
  return project;
}

function nudgeScene(project, sceneId, direction) {
  const scenes = [...(project.scenes || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const fromIndex = scenes.findIndex((scene) => scene.id === sceneId);
  if (fromIndex < 0) return project;
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= scenes.length) return project;
  const [movedScene] = scenes.splice(fromIndex, 1);
  scenes.splice(toIndex, 0, movedScene);
  project.scenes = scenes.map((scene, index) => ({ ...scene, order: index + 1 }));
  return project;
}

function addStoryScene(project, prompt = "") {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const previousPrompt = (project.scenes || []).at(-1)?.prompt || "";
  const nextPrompt = prompt || storyPromptForIndex(project, project.scenes?.length || 0, previousPrompt);
  project.scenes = [
    ...(project.scenes || []),
    {
      id: uid("scene"),
      order: (project.scenes || []).length + 1,
      title: sceneTitleFromPrompt(nextPrompt, `Scene ${(project.scenes || []).length + 1}`),
      prompt: nextPrompt,
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: [],
      status: "draft",
    },
  ];
  return project;
}

function quickPopulateStory(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const scenes = [];
  for (let index = 0; index < 6; index += 1) {
    const prompt = storyPromptForIndex(project, index, scenes[index - 1]?.prompt || "");
    scenes.push({
      id: uid("scene"),
      order: index + 1,
      title: sceneTitleFromPrompt(prompt, `Scene ${index + 1}`),
      prompt,
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: [],
      status: "draft",
    });
  }
  project.scenes = scenes;
  return project;
}

function rerenderStoryboard(project) {
  renderStoryboardCharacters(project);
  renderStoryboardWorlds(project);
  renderStoryboardObjects(project);
  renderStoryboardScenes(project);
  bindStoryboardSceneControls(project);
}

function bindStoryboardSceneControls(project) {
  let draggedSceneId = "";

  document.querySelectorAll(".scene-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      if (!event.target.closest(".scene-drag-handle")) {
        event.preventDefault();
        return;
      }
      draggedSceneId = card.dataset.sceneId || "";
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedSceneId);
    });

    card.addEventListener("dragover", (event) => {
      if (!draggedSceneId || draggedSceneId === card.dataset.sceneId) return;
      event.preventDefault();
      card.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drop-target");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetSceneId = card.dataset.sceneId || "";
      const sourceSceneId = event.dataTransfer.getData("text/plain") || draggedSceneId;
      card.classList.remove("is-drop-target");
      if (!sourceSceneId || !targetSceneId || sourceSceneId === targetSceneId) return;
      const bounds = card.getBoundingClientRect();
      const insertAfter = event.clientY > bounds.top + bounds.height / 2;
      moveScene(project, sourceSceneId, targetSceneId, insertAfter);
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });

    card.addEventListener("dragend", () => {
      draggedSceneId = "";
      document.querySelectorAll(".scene-card").forEach((item) => item.classList.remove("is-dragging", "is-drop-target"));
    });
  });

  document.querySelectorAll("[data-move-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      nudgeScene(project, button.dataset.moveScene, button.dataset.moveDirection);
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-scene-title]").forEach((input) => {
    input.addEventListener("input", () => {
      const scene = (project.scenes || []).find((item) => item.id === input.dataset.sceneTitle);
      if (!scene) return;
      scene.title = input.value.slice(0, 80);
      writeStoryboardProject(project);
    });
  });

  document.querySelectorAll("[data-scene-prompt]").forEach((input) => {
    input.addEventListener("input", () => {
      const scene = (project.scenes || []).find((item) => item.id === input.dataset.scenePrompt);
      if (!scene) return;
      scene.prompt = input.value.slice(0, 900);
      if (!scene.title || /^Scene \d+$/i.test(scene.title)) {
        scene.title = sceneTitleFromPrompt(scene.prompt, scene.title || "Scene");
      }
      writeStoryboardProject(project);
    });
  });

  document.querySelectorAll("[data-ai-assist-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === button.dataset.aiAssistScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene) return;
      scene.prompt = storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
      scene.title = sceneTitleFromPrompt(scene.prompt, `Scene ${sceneIndex + 1}`);
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-generate-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === button.dataset.generateScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene) return;
      if (!scene.prompt) {
        scene.prompt = storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
        scene.title = sceneTitleFromPrompt(scene.prompt, `Scene ${sceneIndex + 1}`);
      }
      scene.status = "ready_to_generate";
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });
}

function hydrateStoryboardPage() {
  if (!document.querySelector(".storyboard-shell")) return;
  const project = writeStoryboardProject(ensureSceneList(readStoryboardProject()));
  document.querySelector("#storyboardProjectTitle").textContent = project.title || "My Awesome Story";
  rerenderStoryboard(project);

  document.querySelector("#addWorldButton")?.addEventListener("click", () => {
    window.location.href = "/storyboard-world.html";
  });
  document.querySelector("#addObjectButton")?.addEventListener("click", () => {
    window.location.href = "/storyboard-character.html";
  });
  document.querySelector("#quickPopulateStoryButton")?.addEventListener("click", () => {
    quickPopulateStory(project);
    writeStoryboardProject(project);
    rerenderStoryboard(project);
  });
  document.querySelector("#aiAssistStoryButton")?.addEventListener("click", () => {
    quickPopulateStory(project);
    writeStoryboardProject(project);
    rerenderStoryboard(project);
  });
  document.querySelector("#addSceneButton")?.addEventListener("click", () => {
    addStoryScene(project);
    writeStoryboardProject(normalizeSceneOrders(project));
    rerenderStoryboard(project);
  });
  document.querySelector("#dockAiAssistButton")?.addEventListener("click", () => {
    const input = document.querySelector("#dockScenePrompt");
    if (input) input.value = storyPromptForIndex(project, project.scenes?.length || 0, project.scenes?.at(-1)?.prompt || "");
  });
  document.querySelector("#dockAddSceneButton")?.addEventListener("click", () => {
    const input = document.querySelector("#dockScenePrompt");
    addStoryScene(project, input?.value.trim());
    if (input) input.value = "";
    writeStoryboardProject(normalizeSceneOrders(project));
    rerenderStoryboard(project);
  });
}

hydrateStoryboardPage();
