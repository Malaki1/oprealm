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
let activeVoiceRecognition = null;
let currentSparkIdea = { ...ideaExamples[0] };

function updateIdeaPreview(idea) {
  if (!ideaPreviewImage || !ideaPreviewTitle || !ideaPreviewTags || !ideaPreviewCopy) return;
  currentSparkIdea = { ...idea };
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

function ideaFromVoiceText(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return;
  if (sparkInput) sparkInput.value = cleanValue;
  updateIdeaPreview({
    title: cleanValue.split(" ").slice(0, 4).join(" "),
    idea: cleanValue,
    image: "/assets/homepage/hero/main-hero-world.png",
    tags: cleanValue.split(/[,\s]+/).filter(Boolean).slice(0, 4),
    copy: `Voice spark captured. OPREALM can turn this into characters, scenes and a story path: ${cleanValue}`,
  });
}

function setVoiceButtonState(isListening, message = "") {
  document.querySelectorAll("[data-voice-prompt]").forEach((button) => {
    button.classList.toggle("is-listening", isListening);
    if (button.matches(".mic-button")) {
      button.setAttribute("aria-label", isListening ? "Listening for your idea" : "Voice prompt");
    }
  });
  if (rotatingIdea && message) rotatingIdea.textContent = message;
}

function startVoicePrompt() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (rotatingIdea) rotatingIdea.textContent = "Voice prompts work best in Chrome or Edge. You can type your idea below.";
    sparkInput?.focus();
    return;
  }

  if (activeVoiceRecognition) {
    activeVoiceRecognition.stop();
    activeVoiceRecognition = null;
    setVoiceButtonState(false);
    return;
  }

  const recognition = new SpeechRecognition();
  activeVoiceRecognition = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  let finalTranscript = "";
  recognition.onstart = () => setVoiceButtonState(true, "Listening... say your game or story idea.");
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript) {
      finalTranscript = transcript;
      if (rotatingIdea) rotatingIdea.textContent = transcript;
    }
  };
  recognition.onerror = () => {
    setVoiceButtonState(false, "I couldn't hear that. Try again or type your idea.");
    activeVoiceRecognition = null;
  };
  recognition.onend = () => {
    setVoiceButtonState(false);
    activeVoiceRecognition = null;
    ideaFromVoiceText(finalTranscript);
  };
  recognition.start();
}

function saveCurrentSparkForWorldBuilder() {
  const engine = window.OPREALMRealmSpark;
  const rawIdea = sparkInput?.value?.trim() || currentSparkIdea?.idea || currentSparkIdea?.title || "";
  if (!rawIdea) return;
  engine?.saveSparkInput?.(rawIdea);
  const output = engine?.makeOutput ? engine.makeOutput(rawIdea) : {
    originalIdea: rawIdea,
    expandedIdea: currentSparkIdea?.copy || rawIdea,
    story: { title: currentSparkIdea?.title || "My OPREALM Story" },
    world: {
      name: currentSparkIdea?.title || "My Story World",
      hook: currentSparkIdea?.copy || rawIdea,
      theme: (currentSparkIdea?.tags || [])[0] || "Custom",
      moods: currentSparkIdea?.tags || [],
      visualStyle: "kid-friendly OPREALM fantasy",
      prompt: rawIdea,
    },
  };
  engine?.saveSparkOutput?.(output);
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

  const voicePrompt = event.target.closest("[data-voice-prompt]");
  if (voicePrompt) {
    event.preventDefault();
    startVoicePrompt();
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
    return;
  }

  const buildWorld = event.target.closest(".build-world-button[href*='storyboard-world']");
  if (buildWorld) {
    event.preventDefault();
    saveCurrentSparkForWorldBuilder();
    window.location.href = buildWorld.getAttribute("href") || "/storyboard-world.html?from=home";
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

const creatorFlowParams = new URLSearchParams(window.location.search);
const starterIdea = creatorFlowParams.get("idea") || localStorage.getItem("oprealm_home_prompt");

if (starterIdea) {
  ideaFromVoiceText(starterIdea);
}

if (creatorFlowParams.get("voice") === "1") {
  window.setTimeout(() => {
    document.querySelector("[data-voice-prompt]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    startVoicePrompt();
  }, 500);
}

const STORYBOARD_PROJECT_KEY = "oprealm_storyboard_project_v1";
const MIN_STORY_SCENES = 5;

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

function dataUrlSize(value = "") {
  const data = String(value || "");
  const comma = data.indexOf(",");
  return comma >= 0 ? Math.ceil((data.length - comma - 1) * 0.75) : data.length;
}

function compressImageDataUrl(dataUrl, maxWidth = 960, maxHeight = 640, quality = 0.82) {
  const source = String(dataUrl || "");
  if (!source.startsWith("data:image/") || dataUrlSize(source) < 850000) return Promise.resolve(source);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(source);
      }
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

async function compactStoryboardImages(project) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  for (const scene of scenes) {
    if (scene.generatedImageUrl) {
      scene.generatedImageUrl = await compressImageDataUrl(scene.generatedImageUrl);
    }
  }
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
  const orderedScenes = [...scenes].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const worldById = new Map((project.worlds || []).map((world) => [world.id, world]));
  if (!orderedScenes.length) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = orderedScenes
    .map((scene, index) => {
      const world = worldById.get(scene.selectedWorldId);
      const characters = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
      const chips = [
        ...characters.map((character) => character.name),
        world?.name,
      ].filter(Boolean);
      const status = scene.status === "generating"
        ? "generating"
        : scene.generatedImageUrl
          ? "complete"
          : scene.status === "ready_to_generate"
            ? "needs-image"
            : "draft";
      const statusLabel = {
        complete: "Complete",
        generating: "Generating",
        "needs-image": "Needs Image",
        draft: "Draft",
      }[status];
      const mood = scene.mood || ["Wonder", "Mystery", "Action", "Epic"][index % 4];
      const camera = scene.camera || ["Wide Shot", "Medium Shot", "Low Angle", "Drone Shot"][index % 4];
      return `
        <article class="scene-card cinematic-scene-card scene-status-${status}" data-scene-id="${escapeHtml(scene.id)}" draggable="true">
          <div class="scene-order-tools">
            <span class="scene-number status-node">${index + 1}</span>
            <button class="scene-drag-handle" type="button" draggable="true" aria-label="Drag scene ${index + 1} to reorder" title="Drag to reorder">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </button>
            <div class="scene-move-controls" aria-label="Move scene ${index + 1}">
              <button type="button" data-move-scene="${escapeHtml(scene.id)}" data-move-direction="up" aria-label="Move scene ${index + 1} up">&uarr;</button>
              <button type="button" data-move-scene="${escapeHtml(scene.id)}" data-move-direction="down" aria-label="Move scene ${index + 1} down">&darr;</button>
            </div>
          </div>
          <div class="scene-card-media ${status === "generating" ? "is-generating-image" : ""} ${!scene.generatedImageUrl && status !== "generating" ? "is-empty" : ""}">
            ${status === "generating"
              ? `<div class="scene-image-loader" aria-label="Generating scene image">
                  <span class="image-loader-dotfield"></span>
                  <span class="image-loader-dotfield is-second"></span>
                  <span class="image-loader-wave"></span>
                  <strong>Image forming...</strong>
                  <small>OPREALM is sketching the scene, lighting and character details.</small>
                </div>`
              : scene.generatedImageUrl
                ? `<img src="${escapeHtml(scene.generatedImageUrl)}" alt="${escapeHtml(scene.title || `Scene ${index + 1}`)} preview" />`
                : `<div class="blank-scene-frame" aria-label="Scene ${index + 1} has no image yet">
                    <span>16:9</span>
                    <strong>Blank scene canvas</strong>
                    <small>Add or approve the prompt, then generate the image.</small>
                  </div>`}
            ${scene.generatedImageUrl ? `<button class="scene-play-chip" type="button" aria-label="Preview scene ${index + 1}">&#9658;</button>` : ""}
            <span class="scene-ratio-chip">16:9</span>
          </div>
          <div class="scene-card-body">
            <div class="scene-title-row">
              <input class="scene-title-input" data-scene-title="${escapeHtml(scene.id)}" value="${escapeHtml(scene.title || `Scene ${index + 1}`)}" aria-label="Scene ${index + 1} title" />
              <span class="scene-status-badge">${statusLabel}</span>
            </div>
            <textarea class="scene-prompt-input" data-scene-prompt="${escapeHtml(scene.id)}" placeholder="Describe what happens in this story moment.">${escapeHtml(scene.prompt || "")}</textarea>
            <div class="scene-chip-row">${chips.map((chip, chipIndex) => `<span class="scene-chip ${chipIndex === 0 ? "is-active" : ""}">${escapeHtml(chip)}</span>`).join("")}</div>
            <div class="scene-image-tools">
              <button class="scene-action scene-image-generate-button" data-generate-scene-image="${escapeHtml(scene.id)}" type="button">${status === "generating" ? "Generating Image..." : "Generate Image"}</button>
              <span class="scene-image-status" data-scene-image-status="${escapeHtml(scene.id)}">${status === "needs-image" ? "Ready for artwork." : ""}</span>
            </div>
          </div>
          <div class="scene-control-panel">
            <label><span>Mood</span><select data-scene-mood="${escapeHtml(scene.id)}">
              ${["Wonder", "Mystery", "Action", "Epic", "Horror", "Funny", "Emotional"].map((item) => `<option ${item === mood ? "selected" : ""}>${item}</option>`).join("")}
            </select></label>
            <label><span>Camera</span><select data-scene-camera="${escapeHtml(scene.id)}">
              ${["Wide Shot", "Close Up", "Low Angle", "Medium Shot", "POV", "Drone Shot"].map((item) => `<option ${item === camera ? "selected" : ""}>${item}</option>`).join("")}
            </select></label>
          </div>
          <div class="scene-quick-stack" aria-label="Scene quick actions">
            <button type="button" data-edit-scene="${escapeHtml(scene.id)}" aria-label="Edit scene ${index + 1}"><span class="op-icon op-icon-options" aria-hidden="true"></span></button>
            <button type="button" data-duplicate-scene="${escapeHtml(scene.id)}" aria-label="Duplicate scene ${index + 1}"><span class="op-icon op-icon-document" aria-hidden="true"></span></button>
            <button type="button" data-delete-scene="${escapeHtml(scene.id)}" aria-label="Delete scene ${index + 1}"><span class="op-icon op-icon-trash" aria-hidden="true"></span></button>
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

function activeObjects(project) {
  return (project.objects || []).filter((item) => item && item.name && item.name !== "None");
}

function storyMoralForCharacter(character = {}) {
  const traits = (character.traits || []).map((trait) => String(trait).toLowerCase());
  if (traits.some((trait) => trait.includes("kind") || trait.includes("loyal") || trait.includes("friend"))) {
    return "kindness and loyalty matter more than winning alone";
  }
  if (traits.some((trait) => trait.includes("brave") || trait.includes("bold") || trait.includes("courage"))) {
    return "real courage means doing the right thing even when it feels scary";
  }
  if (traits.some((trait) => trait.includes("smart") || trait.includes("curious") || trait.includes("resource"))) {
    return "curiosity and creative thinking can solve problems that strength cannot";
  }
  return "the best heroes use imagination, teamwork and honesty to make their world better";
}

function storyArcForCount(count) {
  const safeCount = Math.max(MIN_STORY_SCENES, Number(count) || MIN_STORY_SCENES);
  if (safeCount === 5) return ["Intro", "Chapter 1", "Chapter 2", "Climax", "Ending"];
  const middleCount = safeCount - 3;
  return [
    "Intro",
    ...Array.from({ length: middleCount }, (_, index) => `Chapter ${index + 1}`),
    "Climax",
    "Ending",
  ];
}

function storySeed(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const objects = activeObjects(project);
  const hero = character.name || "the hero";
  const place = world.name || project.title || "the story world";
  const traits = compactList((character.traits || []).slice(0, 4), "brave and curious");
  const style = character.masterStyle || project.globalStyle || "cinematic kid-friendly";
  const prop = objects[0]?.name || "a mysterious clue";
  const companion = (character.pet && character.pet !== "None") ? character.pet : objects.find((item) => /pet|companion|friend/i.test(item.name || ""))?.name || "";
  const worldPrompt = world.description || world.prompt || world.hook || "a vivid, safe world full of discovery";
  const originalIdea = project.originalIdea || project.idea || project.sparkIdea || project.title || "an original OPREALM adventure";
  const moral = storyMoralForCharacter(character);
  return { character, world, hero, place, traits, style, prop, companion, worldPrompt, originalIdea, moral };
}

function storyPlanForCount(project, count) {
  const seed = storySeed(project);
  const labels = storyArcForCount(count);
  const lastChapterIndex = labels.findLastIndex((label) => /^Chapter/i.test(label));
  return labels.map((label, index) => {
    const sceneNumber = index + 1;
    const isIntro = index === 0;
    const isClimax = label === "Climax";
    const isEnding = label === "Ending";
    const isLastChapter = index === lastChapterIndex;
    const previousLabel = labels[index - 1] || "the spark";
    const nextLabel = labels[index + 1] || "the ending";
    let title = `${label}: ${seed.hero} enters ${seed.place}`;
    let prompt = "";
    let mood = "Wonder";
    let camera = "Wide Shot";

    if (isIntro) {
      title = "Intro: The spark appears";
      prompt = `${seed.hero} enters ${seed.place}. Establish the world from the idea "${seed.originalIdea}". Show the hero's ${seed.traits} personality, the saved outfit, colors and ${seed.style} art style. Introduce a clear mystery or problem that makes the story worth following.`;
      mood = "Wonder";
      camera = "Wide Shot";
    } else if (isClimax) {
      title = "Climax: The brave choice";
      prompt = `${seed.hero} reaches the biggest challenge in ${seed.place}. Build directly from ${previousLabel}. The problem should feel exciting but kid-safe. ${seed.hero} must make a brave choice that uses their ${seed.traits} traits instead of just fighting. Show high emotion, clear action and the same consistent character design.`;
      mood = "Epic";
      camera = "Low Angle";
    } else if (isEnding) {
      title = "Ending: The world changes";
      prompt = `${seed.hero} resolves the story after the climax. Show the consequence of the brave choice, give the adventure a satisfying ending, and make the moral clear: ${seed.moral}. Leave the audience feeling proud, hopeful and ready to create the next story. Preserve the same world, outfit, face, colors and ${seed.style} style.`;
      mood = "Emotional";
      camera = "Medium Shot";
    } else if (isLastChapter) {
      title = `${label}: The secret is revealed`;
      prompt = `${seed.hero} discovers the truth behind the main mystery in ${seed.place}. The discovery should connect ${seed.prop} ${seed.companion ? `and ${seed.companion}` : ""} to the coming climax. Build naturally from ${previousLabel} and set up ${nextLabel}. Keep the story readable, cinematic and safe for ages 6+.`;
      mood = "Mystery";
      camera = "Close Up";
    } else {
      title = `${label}: The adventure grows`;
      prompt = `${seed.hero} follows the clue deeper into ${seed.place}. Add a new challenge, surprising ally, funny obstacle or discovery that grows from ${previousLabel}. Use ${seed.prop} as a useful story detail. End the scene with a question or decision that pushes toward ${nextLabel}.`;
      mood = index % 2 ? "Mystery" : "Action";
      camera = index % 2 ? "Medium Shot" : "Drone Shot";
    }

    return {
      order: sceneNumber,
      arcRole: label,
      title,
      prompt,
      mood,
      camera,
    };
  });
}

function storyPromptForIndex(project, index, previousPrompt = "") {
  const count = Math.max(MIN_STORY_SCENES, (project.scenes || []).length || MIN_STORY_SCENES);
  const plan = storyPlanForCount(project, count)[index] || storyPlanForCount(project, index + 1)[index];
  if (!previousPrompt || !plan?.prompt) return plan?.prompt || "";
  return `${plan.prompt} Build naturally from the previous scene: ${previousPrompt}`;
}

function sceneTitleFromPrompt(prompt, fallback) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ");
}

function ensureSceneList(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  if (!Array.isArray(project.scenes)) project.scenes = [];
  while (project.scenes.length < MIN_STORY_SCENES) {
    const nextOrder = project.scenes.length + 1;
    project.scenes.push({
      id: uid("scene"),
      order: nextOrder,
      title: `Scene ${nextOrder}`,
      prompt: "",
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: [],
      status: "draft",
    });
  }
  return normalizeSceneOrders(project);
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

function storyboardReferenceImages(project, scene) {
  const references = [];
  const addReference = (imageDataUrl, label) => {
    if (!imageDataUrl || typeof imageDataUrl !== "string") return;
    if (!imageDataUrl.startsWith("data:image/")) return;
    references.push({ imageDataUrl, label });
  };

  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  (scene.selectedCharacterIds || []).forEach((id) => {
    const character = characterById.get(id);
    addReference(character?.imageUrl, character?.name || "Character");
  });

  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  addReference(world?.imageUrl, world?.name || "World");

  return references.slice(0, 4);
}

async function generateStoryboardSceneImage(project, sceneId) {
  project = await compactStoryboardImages(ensureSceneList(readStoryboardProject()));
  const sceneIndex = (project.scenes || []).findIndex((item) => item.id === sceneId);
  const scene = project.scenes?.[sceneIndex];
  if (!scene) return;

  const statusTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`);
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const characters = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
  const character = characters[0] || activeCharacter(project);
  const secondCharacter = characters[1] || {};
  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  const prompt = String(scene.prompt || "").trim() || storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");

  scene.prompt = prompt;
  scene.title = scene.title || sceneTitleFromPrompt(prompt, `Scene ${sceneIndex + 1}`);
  scene.status = "generating";
  writeStoryboardProject(project);
  rerenderStoryboard(project);

  const freshStatusTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`) || statusTarget;
  if (freshStatusTarget) freshStatusTarget.textContent = "Generating scene artwork...";

  try {
    const response = await fetch("/api/story-scene-images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        camera: scene.camera || "Wide Shot",
        background: world.description || world.name || "A safe OPREALM story world",
        character: character.name || "Use saved character",
        mood: scene.mood || "Wonder",
        type: "Story builder scene",
        characterName: character.name || "",
        characterPrompt: character.prompt || character.description || "",
        characterType: character.characterType || character.type || "",
        characterPersonality: compactList(character.traits || [], character.personality || ""),
        characterStyle: character.masterStyle || character.style || project.globalStyle || "",
        characterSafety: character.safety || "Friendly and safe for kids",
        secondCharacterName: secondCharacter.name || "",
        secondCharacterPrompt: secondCharacter.prompt || secondCharacter.description || "",
        secondCharacterType: secondCharacter.characterType || secondCharacter.type || "",
        secondCharacterPersonality: compactList(secondCharacter.traits || [], secondCharacter.personality || ""),
        secondCharacterStyle: secondCharacter.masterStyle || secondCharacter.style || "",
        secondCharacterSafety: secondCharacter.safety || "",
        sceneStyle: character.masterStyle || project.globalStyle || "inherit",
        lockCharacterStyle: true,
        lockSceneContinuity: true,
        continuityBrief: `Scene ${sceneIndex + 1} of ${project.title || "an OPREALM story"}. Preserve the saved character, selected world, outfit colors, accessories, and the previous scene logic.`,
        referenceImages: storyboardReferenceImages(project, scene),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.webImageDataUrl) {
      throw new Error(result.error || "Scene image generation failed.");
    }

    const latestProject = await compactStoryboardImages(ensureSceneList(readStoryboardProject()));
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId);
    if (!latestScene) throw new Error("Scene was removed before the image finished.");
    latestScene.generatedImageUrl = await compressImageDataUrl(result.webImageDataUrl);
    latestScene.status = "complete";
    latestScene.completed = true;
    writeStoryboardProject(latestProject);
    rerenderStoryboard(latestProject);
  } catch (error) {
    const latestProject = ensureSceneList(readStoryboardProject());
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId) || scene;
    latestScene.status = "ready_to_generate";
    writeStoryboardProject(latestProject);
    rerenderStoryboard(latestProject);
    const errorTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`);
    if (errorTarget) errorTarget.textContent = error.message || "Could not generate scene image.";
  }
}

function quickPopulateStory(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const targetCount = Math.max(MIN_STORY_SCENES, (project.scenes || []).length || 0);
  const plan = storyPlanForCount(project, targetCount);
  const existingScenes = [...(project.scenes || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  project.scenes = plan.map((beat, index) => {
    const existing = existingScenes[index] || {};
    return {
      ...existing,
      id: existing.id || uid("scene"),
      order: index + 1,
      arcRole: beat.arcRole,
      title: beat.title,
      prompt: beat.prompt,
      mood: existing.mood || beat.mood,
      camera: existing.camera || beat.camera,
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: existing.selectedObjectIds || activeObjects(project).map((item) => item.id).filter(Boolean),
      status: existing.status === "complete" ? "complete" : "draft",
    };
  });
  project.storyArc = plan.map(({ arcRole, title }) => ({ arcRole, title }));
  project.moral = storyMoralForCharacter(character);
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

  document.querySelectorAll("[data-scene-mood], [data-scene-camera]").forEach((select) => {
    select.addEventListener("change", () => {
      const sceneId = select.dataset.sceneMood || select.dataset.sceneCamera;
      const scene = (project.scenes || []).find((item) => item.id === sceneId);
      if (!scene) return;
      if (select.dataset.sceneMood) scene.mood = select.value;
      if (select.dataset.sceneCamera) scene.camera = select.value;
      writeStoryboardProject(project);
    });
  });

  document.querySelectorAll("[data-ai-assist-scene]").forEach((control) => {
    control.addEventListener("click", () => {
      if (control.tagName === "SELECT") return;
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === control.dataset.aiAssistScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene) return;
      scene.prompt = storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
      scene.title = sceneTitleFromPrompt(scene.prompt, `Scene ${sceneIndex + 1}`);
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll(".scene-ai-select").forEach((select) => {
    select.addEventListener("change", () => {
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === select.dataset.aiAssistScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene || select.value === "AI Assist") return;
      scene.prompt = `${scene.prompt || storyPromptForIndex(project, sceneIndex)} ${select.value}: add a polished, kid-friendly cinematic beat that keeps the same character and world style.`;
      scene.title = sceneTitleFromPrompt(scene.prompt, `Scene ${sceneIndex + 1}`);
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-duplicate-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = (project.scenes || []).find((item) => item.id === button.dataset.duplicateScene);
      if (!source) return;
      const copy = { ...source, id: uid("scene"), title: `${source.title || "Scene"} Copy`, order: Number(source.order || 0) + 0.5 };
      project.scenes = [...(project.scenes || []), copy];
      writeStoryboardProject(normalizeSceneOrders(project));
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-delete-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      if ((project.scenes || []).length <= MIN_STORY_SCENES) {
        const status = button.closest(".scene-card")?.querySelector(".scene-image-status");
        if (status) status.textContent = `A story needs at least ${MIN_STORY_SCENES} scenes.`;
        return;
      }
      project.scenes = (project.scenes || []).filter((item) => item.id !== button.dataset.deleteScene);
      writeStoryboardProject(normalizeSceneOrders(project));
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-edit-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".scene-card")?.querySelector(".scene-prompt-input")?.focus();
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
      scene.status = "generating";
      writeStoryboardProject(project);
      rerenderStoryboard(project);
      window.setTimeout(() => {
        scene.status = "ready_to_generate";
        writeStoryboardProject(project);
        rerenderStoryboard(project);
      }, 1400);
    });
  });

  document.querySelectorAll("[data-generate-scene-image]").forEach((button) => {
    button.addEventListener("click", () => {
      generateStoryboardSceneImage(project, button.dataset.generateSceneImage);
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
  document.querySelector("#addSceneTopButton")?.addEventListener("click", () => {
    addStoryScene(project);
    writeStoryboardProject(normalizeSceneOrders(project));
    rerenderStoryboard(project);
  });
  document.querySelector("#playStoryButton")?.addEventListener("click", () => {
    document.querySelector(".scene-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelectorAll(".scene-card").forEach((card, index) => {
      window.setTimeout(() => card.classList.add("is-playing"), index * 260);
      window.setTimeout(() => card.classList.remove("is-playing"), index * 260 + 900);
    });
  });

  document.querySelector("#compileCreatorBibleButton")?.addEventListener("click", () => {
    const status = document.querySelector("#creatorBibleStatus");
    if (!window.OPREALMCreatorBible) {
      if (status) status.textContent = "Creator Bible tools are still loading. Try again in a moment.";
      return;
    }
    const latestProject = readStoryboardProject();
    const bible = window.OPREALMCreatorBible.compileCreatorBible(latestProject, {
      selectedOutcome: "realmbeasts"
    });
    const safety = window.OPREALMCreatorBible.runSafetyChecks(bible);
    window.OPREALMCreatorBible.saveBible(bible);
    window.OPREALMCreatorBible.saveRealmBeastsConfig(
      window.OPREALMCreatorBible.generateRealmBeastsConfig(bible)
    );
    if (status) {
      status.textContent = safety.allowed
        ? "Creator Bible compiled. RealmBeasts test draft is ready."
        : `Creator Bible saved for private review: ${safety.reasons.join(", ")}`;
    }
  });
}

hydrateStoryboardPage();



