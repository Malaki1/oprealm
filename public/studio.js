const tools = [
  {
    id: "roblox_obby",
    title: "Roblox Obby Generator",
    cost: "Free plan",
    description: "Turn an idea into a safe procedural Roblox obby spec.",
    output: "Theme, difficulty, obstacle sequence, checkpoints and Roblox plugin JSON.",
  },
  {
    id: "roblox_props",
    title: "Procedural Roblox Props",
    cost: "Guide",
    description: "Design safe Roblox props from approved procedural parts, lights and effects.",
    output: "Prop type, Roblox part recipe, material palette, safe placement notes and plugin-ready build direction.",
  },
  {
    id: "roblox_prop_concepts",
    title: "AI Prop Concept Images",
    cost: "4 credits",
    description: "Create concept art for Roblox props before importing or rebuilding them safely.",
    output: "Prop concept prompt, visual references, silhouette notes, Roblox-safe simplification and child-safe style checks.",
  },
  {
    id: "roblox_textures",
    title: "Roblox Texture Style Lab",
    cost: "4 credits",
    description: "Generate texture and style ideas for safe simple Roblox shapes.",
    output: "Texture direction, color palette, material notes, repeatable pattern prompt and Roblox application plan.",
  },
  {
    id: "roblox_asset_packs",
    title: "Curated Roblox Asset Packs",
    cost: "Guide",
    description: "Plan approved themed prop packs that the plugin can clone into games.",
    output: "Approved asset pack list, theme rules, prop scale guide, safety checklist and placement logic.",
  },
  {
    id: "ai_3d_models",
    title: "AI 3D Model Creator",
    cost: "Coming soon",
    description: "Text or image to 3D Roblox-ready models after moderation and optimization are ready.",
    output: "Coming soon: moderated 3D generation, optimization, upload testing and Roblox compatibility checks.",
    comingSoon: true,
  },
  {
    id: "idea",
    title: "Idea Builder",
    cost: "0.5 credits",
    description: "Shape a spark into a structured project plan.",
    output: "Project concept, target audience, core loop, safety notes and next recommended build step.",
  },
  {
    id: "image",
    title: "Image Maker",
    cost: "4 credits",
    description: "Create characters, covers, props and scene art.",
    output: "Visual prompt, art direction, consistency notes and asset checklist.",
  },
  {
    id: "web_game",
    title: "Web Game Dev",
    cost: "Guide",
    description: "Build browser games with HTML, CSS and JavaScript.",
    output: "Game loop, controls, file plan, starter code direction and test checklist.",
  },
  {
    id: "pixel_game",
    title: "2D Pixel Game",
    cost: "Guide",
    description: "Plan sprites, tile maps, levels, pickups and enemies.",
    output: "Pixel asset list, scene grid, mechanics, win condition and polish pass.",
  },
  {
    id: "story_game",
    title: "AI Story Game",
    cost: "Guide",
    description: "Turn stories into branching interactive adventures.",
    output: "Opening scene, choice map, character goals and safe ending paths.",
  },
  {
    id: "music",
    title: "Music And Song",
    cost: "15 credits",
    description: "Create song ideas, loops, lyrics and soundtrack direction.",
    output: "Music prompt, mood, tempo, structure, lyrics direction and usage notes.",
  },
  {
    id: "sound",
    title: "Sound Effects",
    cost: "8 credits",
    description: "Make game-safe sounds for actions and UI.",
    output: "Sound cue list, style prompts, duration notes and implementation ideas.",
  },
  {
    id: "trailer",
    title: "Trailer Maker",
    cost: "10 credits",
    description: "Create a trailer plan from finished assets.",
    output: "Shot list, voiceover, music cues, title cards and safe video prompt.",
  },
];

const builders = [
  ["Web Game Development", "Playable browser games with scenes, controls, scoring, publishing checks and safe sharing."],
  ["2D Pixel Game Builder", "Characters, tile maps, collectibles, level flow, sprite sheets and retro game polish."],
  ["AI Story Game Builder", "Branching choices, character arcs, dialogue, endings and story-safe play loops."],
  ["Music And Song Studio", "Loops, lyrics, themes, songs, music clips and soundtrack direction."],
  ["Sound Lab", "Sound effects for coins, portals, buttons, power-ups, menus and game moments."],
  ["Trailer Maker", "Short film, animation, storyboard, cover, voice, music and showcase package."],
];

const toolList = document.querySelector("#toolList");
const builderGrid = document.querySelector("#builderGrid");
const activeToolKicker = document.querySelector("#activeToolKicker");
const activeToolTitle = document.querySelector("#activeToolTitle");
const activeToolCost = document.querySelector("#activeToolCost");
const promptForm = document.querySelector("#promptForm");
const projectPrompt = document.querySelector("#projectPrompt");
const projectBoard = document.querySelector("#projectBoard");
const outputBoard = document.querySelector(".output-board");
const saveProjectButton = document.querySelector("#saveProjectButton");
const clearBoardButton = document.querySelector("#clearBoardButton");
const publishForm = document.querySelector("#publishForm");
const publishStatus = document.querySelector("#publishStatus");
const storyDashboard = document.querySelector("#storyDashboard");
const storyTabs = document.querySelectorAll("[data-story-tab]");
const storyPanels = document.querySelectorAll("[data-story-panel]");
const storyCharacterForm = document.querySelector("#storyCharacterForm");
const storySceneForm = document.querySelector("#storySceneForm");
const characterPromptButton = document.querySelector("#characterPromptButton");
const scenePromptButton = document.querySelector("#scenePromptButton");
const characterPreviewName = document.querySelector("#characterPreviewName");
const characterPreviewBody = document.querySelector("#characterPreviewBody");
const characterPreviewType = document.querySelector("#characterPreviewType");
const characterPreviewStyle = document.querySelector("#characterPreviewStyle");
const sceneCardList = document.querySelector("#sceneCardList");
const storyMapShell = document.querySelector("#storyMapShell");
const storyMapBoard = document.querySelector("#storyMapBoard");
const toggleStoryMapSize = document.querySelector("#toggleStoryMapSize");
const storyRouteForm = document.querySelector("#storyRouteForm");
const routeSourceScene = document.querySelector("#routeSourceScene");
const routeChoiceIndex = document.querySelector("#routeChoiceIndex");
const routeTargetScene = document.querySelector("#routeTargetScene");
const storyPreviewTitle = document.querySelector("#storyPreviewTitle");
const storyPreviewText = document.querySelector("#storyPreviewText");
const storyPreviewChoices = document.querySelector("#storyPreviewChoices");
const checkCharacter = document.querySelector("#checkCharacter");
const checkScenes = document.querySelector("#checkScenes");

let activeTool = tools.find((tool) => tool.id === "idea") || tools[0];
let boardItems = loadBoard();
let storyProject = loadStoryProject();

async function loadStudioAccount() {
  const creditCount = document.querySelector("#creditCount");
  try {
    const response = await fetch("/api/account");
    const data = await response.json();
    if (!data.authenticated) {
      if (creditCount) creditCount.textContent = "0";
      return;
    }
    const credits = data.user?.creditsRemaining;
    if (credits !== undefined && creditCount) {
      creditCount.textContent = Number(credits).toLocaleString();
    }
  } catch {
    if (creditCount) creditCount.textContent = "--";
    // Studio can still be used as a local planning board if account status is unavailable.
  }
}

function renderTools() {
  toolList.innerHTML = tools
    .map(
      (tool) => `
        <button class="tool-button ${tool.id === activeTool.id ? "is-active" : ""} ${tool.comingSoon ? "is-coming-soon" : ""}" type="button" data-tool="${tool.id}" ${tool.comingSoon ? "aria-disabled=\"true\"" : ""}>
          <strong>${tool.title}${tool.comingSoon ? "<em>Coming soon</em>" : ""}</strong>
          <span>${tool.description}</span>
        </button>
      `,
    )
    .join("");
}

function renderBuilders() {
  builderGrid.innerHTML = builders
    .map(
      ([title, description]) => `
        <article class="builder-card">
          <p class="eyebrow">Creator engine</p>
          <h3>${title}</h3>
          <p>${description}</p>
        </article>
      `,
    )
    .join("");
}

function renderActiveTool() {
  activeToolKicker.textContent = activeTool.title;
  activeToolTitle.textContent = activeTool.id === "idea" ? "Creation Planner" : activeTool.title;
  activeToolCost.textContent = activeTool.cost;
  const isStoryGame = activeTool.id === "story_game";
  promptForm.hidden = isStoryGame;
  outputBoard.hidden = isStoryGame;
  storyDashboard.hidden = !isStoryGame;
  renderTools();
  if (isStoryGame) renderStoryDashboard();
}

function renderBoard() {
  if (!boardItems.length) {
    projectBoard.innerHTML = `
      <article class="board-card">
        <strong>No project steps yet</strong>
        <p>Choose a tool, add a prompt and generate the first step of the creation.</p>
      </article>
    `;
    return;
  }

  projectBoard.innerHTML = boardItems
    .map(
      (item) => `
        <article class="board-card">
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function createToolStep(prompt) {
  const cleanPrompt = prompt.trim().replace(/\s+/g, " ");
  const starter = cleanPrompt || "Untitled OPREALM creation";

  return {
    title: `${activeTool.title}: ${starter.slice(0, 54)}${starter.length > 54 ? "..." : ""}`,
    body: [
      activeTool.output,
      "",
      `Source: ${starter}`,
      "",
      "Next: refine the result, add assets, then publish only when the creation is complete and safe to share.",
    ].join("\n"),
  };
}

function saveBoard() {
  localStorage.setItem("oprealm_studio_board", JSON.stringify(boardItems.slice(0, 24)));
}

function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem("oprealm_studio_board") || "[]");
  } catch {
    return [];
  }
}

function saveStoryProject() {
  localStorage.setItem("oprealm_story_game_project", JSON.stringify(storyProject));
}

function loadStoryProject() {
  try {
    return JSON.parse(localStorage.getItem("oprealm_story_game_project") || "{}");
  } catch {
    return {};
  }
}


function renderStoryDashboard() {
  const character = storyProject.character || {};
  const scenes = storyProject.scenes || [];

  characterPreviewName.textContent = character.name || "No character yet";
  characterPreviewBody.textContent = character.prompt || "Add a character to begin the AI Story Game flow.";
  characterPreviewType.textContent = character.type || "Type";
  characterPreviewStyle.textContent = character.style || "Style";

  sceneCardList.innerHTML = scenes.length
    ? scenes
      .map(
        (scene, index) => `
          <article class="scene-card">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${escapeHtml(scene.title)}</strong>
              <p>${escapeHtml(scene.prompt)}</p>
              <small>${escapeHtml(scene.camera)} - ${escapeHtml(scene.background)} - ${escapeHtml(scene.type)}</small>
            </div>
          </article>
        `,
      )
      .join("")
    : `<article class="scene-card empty"><strong>No scene cards yet</strong><p>Create the start scene first.</p></article>`;

  storyMapBoard.innerHTML = scenes.length
    ? scenes
      .map(
        (scene, index) => `
          <article class="story-node" style="--node-offset:${index % 2}" data-scene-index="${index}">
            <button class="node-port port-up" type="button" data-connect-scene="${index}" data-direction="up" aria-label="Add branch above"></button>
            <button class="node-port port-right" type="button" data-connect-scene="${index}" data-direction="right" aria-label="Add branch right"></button>
            <button class="node-port port-down" type="button" data-connect-scene="${index}" data-direction="down" aria-label="Add branch below"></button>
            <button class="node-port port-left" type="button" data-connect-scene="${index}" data-direction="left" aria-label="Add branch left"></button>
            <span>${index === 0 ? "Start" : `Scene ${index + 1}`}</span>
            <strong>${escapeHtml(scene.title)}</strong>
            <p>${escapeHtml(scene.type)}</p>
            ${renderRouteChips(scene)}
          </article>
        `,
      )
      .join("")
    : `<article class="story-node"><span>Start</span><strong>Blank Scene Card</strong><p>Add your first scene to begin the map.</p></article>`;

  renderRouteControls(scenes);

  const firstScene = scenes[0];
  storyPreviewTitle.textContent = firstScene?.title || "Your story will appear here";
  storyPreviewText.textContent = firstScene?.prompt || "Create a character and at least one scene card to preview the pick-a-path flow.";
  storyPreviewChoices.innerHTML = firstScene
    ? Array.from({ length: choiceCountForScene(firstScene) }, (_, index) => `<button class="button button-secondary" type="button">${choiceLabel(index)}</button>`).join("")
    : "";

  checkCharacter.textContent = character.name ? "Ready" : "Not ready yet";
  checkScenes.textContent = scenes.length >= 3 ? "Ready for preview" : `Add ${Math.max(3 - scenes.length, 0)} more scene card${3 - scenes.length === 1 ? "" : "s"}`;
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
  if (!routeSourceScene || !routeTargetScene || !routeChoiceIndex) return;
  const sceneOptions = scenes
    .map((scene, index) => `<option value="${index}">Scene ${index + 1}: ${escapeHtml(scene.title)}</option>`)
    .join("");

  routeSourceScene.innerHTML = sceneOptions || `<option value="">Add scenes first</option>`;
  routeTargetScene.innerHTML = sceneOptions || `<option value="">Add scenes first</option>`;
  renderChoiceOptions();
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
  return { up: "?", right: "?", down: "?", left: "?" }[direction] || "?";
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
  scenes.push({
    title: `${choiceLabel(routeCount)} Branch`,
    prompt: `A new ${direction} branch from ${source.title}.`,
    camera: "Wide cinematic reveal",
    background: source.background || "Custom background",
    character: "Use saved character",
    mood: source.mood || "Curious",
    type: "Choice moment",
    choices: "2 choices",
    routes: [],
  });
  storyProject.scenes = scenes;
  addRoute(sourceIndex, Math.min(routeCount, choiceCountForScene(source) - 1), targetIndex, direction);
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function titleFromPrompt(prompt, fallback) {
  const clean = String(prompt || "").trim().replace(/\s+/g, " ");
  if (!clean) return fallback;
  return clean.split(/[.!?]/)[0].slice(0, 42) || fallback;
}

toolList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool]");
  if (!button) return;
  const selectedTool = tools.find((tool) => tool.id === button.dataset.tool);
  if (selectedTool?.comingSoon) {
    activeToolKicker.textContent = selectedTool.title;
    activeToolTitle.textContent = "Coming Soon";
    activeToolCost.textContent = selectedTool.cost;
    promptForm.hidden = true;
    outputBoard.hidden = false;
    storyDashboard.hidden = true;
    projectBoard.innerHTML = `
      <article class="board-card">
        <strong>${selectedTool.title}</strong>
        <p>We will add AI 3D generation after moderation, mesh optimization, Roblox upload testing and approved asset checks are solid.</p>
      </article>
    `;
    return;
  }
  if (button.dataset.tool === "roblox_obby") {
    location.href = "/roblox-creator.html";
    return;
  }
  if (button.dataset.tool === "story_game") {
    location.href = "/story-game.html";
    return;
  }
  activeTool = selectedTool || tools[0];
  renderActiveTool();
});

storyTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    storyTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    storyPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.storyPanel === tab.dataset.storyTab));
  });
});

toggleStoryMapSize.addEventListener("click", () => {
  storyMapShell.classList.toggle("is-expanded");
  document.body.classList.toggle("story-map-open", storyMapShell.classList.contains("is-expanded"));
  toggleStoryMapSize.textContent = storyMapShell.classList.contains("is-expanded") ? "Minimize Map" : "Expand Map";
});

storyMapBoard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-connect-scene]");
  if (!button) return;
  addConnectedScene(Number(button.dataset.connectScene), button.dataset.direction || "right");
});

routeSourceScene.addEventListener("change", renderChoiceOptions);

storyRouteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(storyRouteForm).entries());
  addRoute(Number(data.sourceScene), Number(data.choiceIndex), Number(data.targetScene), data.direction);
});

storyCharacterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(storyCharacterForm).entries());
  storyProject.character = data;
  saveStoryProject();
  renderStoryDashboard();
});

storySceneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(storySceneForm).entries());
  const scenes = storyProject.scenes || [];
  scenes.push({
    ...data,
    title: titleFromPrompt(data.prompt, scenes.length ? `Scene ${scenes.length + 1}` : "Start Scene"),
  });
  storyProject.scenes = scenes;
  saveStoryProject();
  storySceneForm.reset();
  renderStoryDashboard();
});

characterPromptButton.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(storyCharacterForm).entries());
  projectPrompt.value = [
    "Create a safe OPREALM AI Story Game character.",
    `Name: ${data.name || "New character"}`,
    `Type: ${data.type}`,
    `Personality: ${data.personality}`,
    `Visual style: ${data.style}`,
    `Safety tone: ${data.safety}`,
    `Prompt: ${data.prompt || "Beginner-friendly pick-a-path hero."}`,
  ].join("\n");
});

scenePromptButton.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(storySceneForm).entries());
  projectPrompt.value = [
    "Create a safe OPREALM pick-a-path scene card.",
    `Scene prompt: ${data.prompt || "A new choice moment begins."}`,
    `Camera angle: ${data.camera}`,
    `Background: ${data.background}`,
    `Character: ${data.character}`,
    `Mood: ${data.mood}`,
    `Scene type: ${data.type}`,
    `Choice count: ${data.choices}`,
  ].join("\n");
});

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  boardItems.unshift(createToolStep(projectPrompt.value));
  saveBoard();
  renderBoard();
});

saveProjectButton.addEventListener("click", () => {
  saveBoard();
  saveProjectButton.textContent = "Saved";
  setTimeout(() => {
    saveProjectButton.textContent = "Save Project";
  }, 1200);
});

clearBoardButton.addEventListener("click", () => {
  boardItems = [];
  saveBoard();
  renderBoard();
});

publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  publishStatus.textContent = "Submitting for review...";

  const payload = {
    title: document.querySelector("#publishTitle").value,
    type: document.querySelector("#publishType").value,
    mediaUrl: document.querySelector("#publishUrl").value,
    description: document.querySelector("#publishDescription").value,
    projectSnapshot: boardItems,
  };

  try {
    const response = await fetch("/api/creations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Submission failed");
    publishStatus.textContent = "Submitted. It will appear in the public library after review.";
    publishForm.reset();
  } catch (error) {
    publishStatus.textContent = error.message || "Could not submit right now.";
  }
});

renderBuilders();
renderActiveTool();
renderBoard();
renderStoryDashboard();
loadStudioAccount();

