const tools = [
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
const saveProjectButton = document.querySelector("#saveProjectButton");
const clearBoardButton = document.querySelector("#clearBoardButton");
const publishForm = document.querySelector("#publishForm");
const publishStatus = document.querySelector("#publishStatus");

let activeTool = tools[0];
let boardItems = loadBoard();

function renderTools() {
  toolList.innerHTML = tools
    .map(
      (tool) => `
        <button class="tool-button ${tool.id === activeTool.id ? "is-active" : ""}" type="button" data-tool="${tool.id}">
          <strong>${tool.title}</strong>
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
  renderTools();
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

toolList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool]");
  if (!button) return;
  activeTool = tools.find((tool) => tool.id === button.dataset.tool) || tools[0];
  renderActiveTool();
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
