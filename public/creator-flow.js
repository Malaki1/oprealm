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
const STORYBOARD_MOVIE_DB = "oprealm_storyboard_movie_v1";
const STORYBOARD_MOVIE_STORE = "movie_previews";
const MIN_STORY_SCENES = 1;
const FALLBACK_STORY_SCENES = 16;
const STORY_SCENES_PAGE = /\/storyboard-scenes(?:\.html)?$/i.test(window.location.pathname);
const STORY_IMAGE_MODE_KEY = "oprealm_story_image_mode_v1";
const STORY_IMAGE_MODES = {
  mock: { label: "Mock", credits: 0, cost: "$0.000", button: "Create Mock Image (free)" },
  draft: { label: "Draft", credits: 1, cost: "~$0.006", button: "Generate Draft (1 credit)" },
  final: { label: "Final", credits: 24, cost: "~$0.20", button: "Generate Final (24 credits)" },
};
const STORY_DIRECTION_DEFAULTS = {
  storyType: "epic-quest",
  endingType: "happy",
  lessonTheme: "courage",
};

const STORY_INTERNAL_OPTIONS = {
  structures: ["classic-quest", "mystery-trail", "emotional-arc", "boss-level", "twist-path"],
  tones: ["cinematic", "wonder", "funny", "heartfelt", "mythic"],
  conflicts: ["broken-world", "ancient-secret", "rival-pressure", "lost-friend", "moral-choice"],
};

let activeMoviePlayback = null;
let storyReaderAudioUrl = "";
let storyReaderProgressTimer = null;
let storyReaderGenerationToken = 0;
const sceneImageProgressTimers = new Map();
const sceneImageGenerationQueue = [];
let sceneImageQueueActive = false;
let sceneImageStatusMonitor = 0;
const STORY_SCENE_MOODS = ["Wonder", "Mystery", "Action", "Epic", "Funny", "Emotional", "Tense", "Peaceful"];
const STORY_SCENE_CAMERAS = ["Wide Shot", "Medium Shot", "Close Up", "Low Angle", "POV", "Drone Shot", "Over Shoulder", "Tracking Shot"];

function storyImageMode() {
  const value = localStorage.getItem(STORY_IMAGE_MODE_KEY) || "draft";
  return STORY_IMAGE_MODES[value] ? value : "draft";
}

function setStoryImageMode(value) {
  localStorage.setItem(STORY_IMAGE_MODE_KEY, STORY_IMAGE_MODES[value] ? value : "draft");
}

function createMockSceneImage(scene, sceneIndex) {
  const title = escapeHtml(scene.title || `Scene ${sceneIndex + 1}`);
  const summary = escapeHtml(String(scene.prompt || "Scene layout placeholder").slice(0, 100));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10295f"/><stop offset="1" stop-color="#431d72"/></linearGradient></defs>
    <rect width="1536" height="1024" fill="url(#g)"/>
    <circle cx="1260" cy="180" r="240" fill="#25d9ff" opacity=".14"/>
    <circle cx="230" cy="850" r="300" fill="#ff3cc7" opacity=".12"/>
    <rect x="118" y="122" width="1300" height="780" rx="42" fill="none" stroke="#8ff0ff" stroke-width="8" stroke-dasharray="24 20" opacity=".75"/>
    <text x="768" y="410" text-anchor="middle" fill="#8ff0ff" font-family="Arial,sans-serif" font-size="42" font-weight="700">FREE TEST PLACEHOLDER</text>
    <text x="768" y="505" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="72" font-weight="800">${title}</text>
    <foreignObject x="300" y="570" width="936" height="180"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#dce9ff;font:32px/1.4 Arial,sans-serif;text-align:center">${summary}</div></foreignObject>
    <text x="768" y="840" text-anchor="middle" fill="#b9cae9" font-family="Arial,sans-serif" font-size="28">No API call or Creator credits used</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

function readStoryboardProject() {
  try {
    const project = sanitizeStoryboardProject(JSON.parse(localStorage.getItem(STORYBOARD_PROJECT_KEY) || "{}") || {});
    localStorage.setItem(STORYBOARD_PROJECT_KEY, JSON.stringify(project));
    return project;
  } catch {
    return {};
  }
}

function sanitizeStoryPlaceholders(value = "") {
  return String(value || "")
    .replace(/\btries to ignore (?:the\s+)?custom\s+(?:pet|object), but it appears again near\b/gi, "receives an urgent warning near")
    .replace(/\b(?:the\s+)?custom\s+(?:pet|object)\b/gi, "")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isPlaceholderProjectObject(item = {}) {
  return /^(custom\s+pet|custom\s+object)$/i.test(cleanStoryText(item.name));
}

function friendlySceneImageError(value = "") {
  const message = String(value || "").trim();
  if (/\b(?:502|503|504)\b|service unavailable|temporarily unavailable/i.test(message)) {
    return "The image service was temporarily busy. Press Try Again and OPRealm will resume this scene.";
  }
  return message;
}

function sanitizeStoryboardProject(project = {}) {
  const storyGenerationStartedAt = Date.parse(project.storyDraft?.generationStartedAt || "");
  const storyGenerationIsStale = ["generating", "splitting"].includes(project.storyDraft?.status)
    && (!Number.isFinite(storyGenerationStartedAt) || Date.now() - storyGenerationStartedAt > 4 * 60 * 1000);
  if (storyGenerationIsStale) {
    project.storyDraft = {
      ...(project.storyDraft || {}),
      status: "error",
      generationStartedAt: "",
      generationError: "Story generation was interrupted. Press Regenerate Story to try again.",
    };
  }
  const placeholderIds = new Set((project.objects || []).filter(isPlaceholderProjectObject).map((item) => item.id).filter(Boolean));
  project.objects = (project.objects || []).filter((item) => !isPlaceholderProjectObject(item));
  project.characters = (project.characters || []).map((character) => {
    const customPet = cleanStoryText(character.customPet);
    const hasRealCustomPet = customPet && !/^(custom\s+pet|none|no\s+pet)$/i.test(customPet);
    if (!/^custom\s+pet$/i.test(cleanStoryText(character.pet)) || hasRealCustomPet) return character;
    return { ...character, pet: "No Pet", customPet: "", petDescription: "no pet companion" };
  });
  project.scenes = (project.scenes || []).map((scene) => {
    const generationStartedAt = Date.parse(scene.imageGenerationStartedAt || "");
    const generationIsStale = scene.status === "generating"
      && !scene.imageRequestId
      && (!Number.isFinite(generationStartedAt) || Date.now() - generationStartedAt > 3 * 60 * 1000);
    const savedRecoveryQueue = scene.status === "image_queued" && Boolean(scene.imageNextRetryAt);
    return {
      ...scene,
      title: sanitizeStoryPlaceholders(scene.title),
      prompt: sanitizeStoryPlaceholders(scene.prompt),
      imagePromptInternal: sanitizeStoryPlaceholders(scene.imagePromptInternal),
      videoPromptInternal: sanitizeStoryPlaceholders(scene.videoPromptInternal),
      selectedObjectIds: (scene.selectedObjectIds || []).filter((id) => !placeholderIds.has(id)),
      status: generationIsStale || savedRecoveryQueue ? "image_error" : scene.status,
      imageProgress: generationIsStale ? 0 : scene.imageProgress,
      imageGenerationStartedAt: generationIsStale ? "" : scene.imageGenerationStartedAt,
      imageQueuedAt: savedRecoveryQueue ? "" : scene.imageQueuedAt,
      imageNextRetryAt: "",
      imageError: generationIsStale
        ? "Image generation was interrupted. Press Try Again."
        : savedRecoveryQueue
          ? "Image generation paused. Press Try Again when you are ready."
          : friendlySceneImageError(scene.imageError),
    };
  });
  applySceneCinematicSettings(project);
  const containsPlanningProse = project.scenes.some((scene) => (
    /the wonder matters|the story begins|is entering a mystery|the adventure will ask|the climax pays off|the final image leaves|the meaning is clear|proving the lesson|pain underneath the whole adventure/i
      .test(scene.prompt || "")
  ));
  if (containsPlanningProse && project.scenes.length) {
    const plan = storyPlanForCount(project, project.scenes.length);
    project.scenes = project.scenes.map((scene, index) => ({
      ...scene,
      title: plan[index]?.title || scene.title,
      prompt: plan[index]?.prompt || scene.prompt,
      planInternal: plan[index]?.planInternal || scene.planInternal || {},
      imagePromptInternal: "",
    }));
  }
  return project;
}

function writeStoryboardProject(project) {
  const sanitized = sanitizeStoryboardProject(project);
  localStorage.setItem(STORYBOARD_PROJECT_KEY, JSON.stringify(sanitized));
  window.OPREALMRefreshCreatorSteps?.();
  return sanitized;
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
  const characters = Array.isArray(project.characters) ? project.characters : [];
  for (const character of characters) {
    if (character.imageUrl) {
      character.imageUrl = await compressImageDataUrl(character.imageUrl, 900, 1200, 0.84);
    }
    if (character.recipe?.generation?.generatedImageUrl) {
      character.recipe.generation.generatedImageUrl = character.imageUrl || await compressImageDataUrl(character.recipe.generation.generatedImageUrl, 900, 1200, 0.84);
    }
  }
  const worlds = Array.isArray(project.worlds) ? project.worlds : [];
  for (const world of worlds) {
    if (world.imageUrl) {
      world.imageUrl = await compressImageDataUrl(world.imageUrl, 960, 1280, 0.84);
    }
    if (world.generatedImageUrl) {
      world.generatedImageUrl = world.imageUrl || await compressImageDataUrl(world.generatedImageUrl, 960, 1280, 0.84);
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
  const active = activeCharacter(project) || characters[0];
  const extraCount = Math.max(0, characters.length - 1);
  target.innerHTML = `
    <article class="ingredient-card is-active">
      ${active.imageUrl ? `<img src="${escapeHtml(active.imageUrl)}" alt="${escapeHtml(active.name)} character" />` : ""}
      <div>
        <h3>${escapeHtml(active.name || "Unnamed character")}</h3>
        <p>${escapeHtml(compactList([
          active.characterType,
          ...(active.traits || []).slice(0, 3),
          active.masterStyle,
        ], "Saved character"))}</p>
        <span class="lock-pill">${active.consistencyLocked ? "Locked" : "Draft"}</span>
      </div>
    </article>
    ${extraCount ? `<p class="ingredient-summary">${extraCount} more saved character${extraCount === 1 ? "" : "s"} available in Character.</p>` : ""}`;
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
  const active = activeWorld(project) || worlds[0];
  const extraCount = Math.max(0, worlds.length - 1);
  target.innerHTML = `
    <article class="ingredient-card is-active">
      ${active.imageUrl ? `<img src="${escapeHtml(active.imageUrl)}" alt="${escapeHtml(active.name)} world" />` : ""}
      <div>
        <h3>${escapeHtml(active.name || "Story world")}</h3>
        <p>${escapeHtml(active.description || compactList(active.styleNotes, "World details ready"))}</p>
        <span class="lock-pill">Selected</span>
      </div>
    </article>
    ${extraCount ? `<p class="ingredient-summary">${extraCount} more saved world${extraCount === 1 ? "" : "s"} available in World.</p>` : ""}`;
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
  const queuedScenes = orderedScenes
    .filter((scene) => scene.status === "image_queued" && !scene.generatedImageUrl)
    .sort((a, b) => {
      const aQueuedAt = Date.parse(a.imageQueuedAt || "");
      const bQueuedAt = Date.parse(b.imageQueuedAt || "");
      if (Number.isFinite(aQueuedAt) && Number.isFinite(bQueuedAt) && aQueuedAt !== bQueuedAt) return aQueuedAt - bQueuedAt;
      if (Number.isFinite(aQueuedAt) !== Number.isFinite(bQueuedAt)) return Number.isFinite(aQueuedAt) ? -1 : 1;
      return Number(a.order || 0) - Number(b.order || 0);
    });
  const queuePositionById = new Map(queuedScenes.map((scene, index) => [scene.id, index + 1]));
  const queuedTotal = queuedScenes.length;
  const imageMode = storyImageMode();
  const imageModePolicy = STORY_IMAGE_MODES[imageMode];
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
        : scene.status === "image_queued"
          ? "queued"
        : scene.generatedImageUrl
          ? "complete"
          : scene.status === "image_error"
            ? "image-error"
            : scene.status === "ready_to_generate"
              ? "needs-image"
              : "draft";
      const queuePosition = queuePositionById.get(scene.id) || 0;
      const queueLabel = queuePosition
        ? `Queued ${queuePosition} of ${queuedTotal}`
        : "Queued";
      const statusLabel = {
        complete: "Complete",
        generating: "Generating",
        queued: queueLabel,
        "needs-image": "Needs Image",
        "image-error": "Image Error",
        draft: "Draft",
      }[status];
      const mood = normalizeSceneMood(scene.mood, scene.storyExcerpt || scene.prompt, index);
      const camera = normalizeSceneCamera(scene.camera, scene.storyExcerpt || scene.prompt, index);
      const expanded = Boolean(scene.editorExpanded);
      const hasImage = Boolean(scene.generatedImageUrl);
      const hasVideo = Boolean(scene.generatedVideoUrl);
      const mediaMode = hasImage && scene.mediaMode === "video" ? "video" : "image";
      const videoStatus = scene.videoStatus || "";
      const videoButtonText = !hasImage
        ? "Generate Image First"
        : videoStatus === "generating"
          ? "Creating Video..."
          : hasVideo
            ? "Regenerate Video (325 credits)"
            : videoStatus === "video_ready"
              ? "Video Canvas Ready"
              : videoStatus === "video_error"
                ? "Try Video Again (325 credits)"
                : "Generate Image to Video (325 credits)";
      return `
        <article class="scene-card cinematic-scene-card scene-status-${status} ${expanded ? "is-editor-expanded" : ""}" data-scene-id="${escapeHtml(scene.id)}" draggable="${expanded ? "false" : "true"}">
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
            ${hasImage ? `<div class="scene-media-tabs" role="group" aria-label="Scene ${index + 1} media">
              <button type="button" data-scene-media-mode="${escapeHtml(scene.id)}" data-media-mode="image" class="${mediaMode === "image" ? "is-selected" : ""}">Image</button>
              <button type="button" data-scene-media-mode="${escapeHtml(scene.id)}" data-media-mode="video" class="${mediaMode === "video" ? "is-selected" : ""}">Video</button>
            </div>` : ""}
            ${status === "generating"
              ? `<div class="scene-image-loader" aria-label="Generating scene image">
                  <span class="image-loader-dotfield"></span>
                  <span class="image-loader-dotfield is-second"></span>
                  <span class="image-loader-wave"></span>
                  <div class="scene-image-progress" data-scene-image-progress="${escapeHtml(scene.id)}" style="--scene-image-progress: ${Math.max(0, Math.min(100, Number(scene.imageProgress || 0))) * 3.6}deg;">
                    <span>${Math.max(0, Math.min(100, Math.round(Number(scene.imageProgress || 0))))}%</span>
                  </div>
                  <strong>Image forming...</strong>
                  <small>OPREALM is sketching the scene, lighting and character details.</small>
                </div>`
              : status === "queued"
                ? `${hasImage ? `<img src="${escapeHtml(scene.generatedImageUrl)}" alt="${escapeHtml(scene.title || `Scene ${index + 1}`)} preview" />` : ""}
                  <div class="scene-image-queue-state" aria-label="Scene ${index + 1} is ${escapeHtml(queueLabel.toLowerCase())}">
                    <span class="scene-queue-position">${queuePosition || "?"}</span>
                    <strong>${escapeHtml(queueLabel)}</strong>
                    <small>Scene ${index + 1}: ${escapeHtml(scene.title || `Scene ${index + 1}`)}</small>
                    <small>Its image will start automatically when the current queued scene finishes.</small>
                  </div>`
              : hasImage && mediaMode === "video"
                ? hasVideo
                  ? `<video class="scene-video-preview" src="${escapeHtml(scene.generatedVideoUrl)}" poster="${escapeHtml(scene.generatedImageUrl)}" controls playsinline preload="metadata" aria-label="${escapeHtml(scene.title || `Scene ${index + 1}`)} video"></video>`
                  : `<div class="blank-scene-frame scene-video-canvas ${videoStatus === "generating" ? "is-generating-video" : ""}" aria-label="Scene ${index + 1} video canvas">
                      ${videoStatus === "generating" ? `<span class="image-loader-dotfield"></span><span class="image-loader-dotfield is-second"></span><span class="image-loader-wave"></span>` : ""}
                      <span>5-10s</span>
                      <strong>${videoStatus === "generating" ? "Creating scene video" : "Video canvas ready"}</strong>
                      <small>${escapeHtml(scene.videoMessage || "OPREALM will animate the scene image using the story text.")}</small>
                    </div>`
                : hasImage
                  ? `<img src="${escapeHtml(scene.generatedImageUrl)}" alt="${escapeHtml(scene.title || `Scene ${index + 1}`)} preview" />`
                : `<div class="blank-scene-frame" aria-label="Scene ${index + 1} has no image yet">
                    <span>16:9</span>
                    <strong>Blank scene canvas</strong>
                    <small>Add or approve the prompt, then generate the image.</small>
                  </div>`}
            ${hasImage && mediaMode === "image" && status !== "generating"
              ? `<button class="scene-image-expand-button" data-expand-scene-image="${escapeHtml(scene.id)}" type="button" aria-label="Enlarge scene ${index + 1} image" title="Enlarge image">
                  <span aria-hidden="true">&#x26F6;</span>
                </button>`
              : ""}
            <span class="scene-ratio-chip">16:9</span>
          </div>
          <div class="scene-card-body">
            <div class="scene-title-row">
              <input class="scene-title-input" data-scene-title="${escapeHtml(scene.id)}" value="${escapeHtml(scene.title || `Scene ${index + 1}`)}" aria-label="Scene ${index + 1} title" />
              <span class="scene-status-badge">${statusLabel}</span>
            </div>
            <textarea class="scene-prompt-input" data-scene-prompt="${escapeHtml(scene.id)}" placeholder="Describe what the image or video should show.">${escapeHtml(scene.prompt || "")}</textarea>
            <div class="scene-chip-row">${chips.map((chip, chipIndex) => `<span class="scene-chip ${chipIndex === 0 ? "is-active" : ""}">${escapeHtml(chip)}</span>`).join("")}</div>
            <div class="scene-image-tools">
              <button class="scene-action scene-image-generate-button" data-generate-scene-image="${escapeHtml(scene.id)}" type="button" ${status === "generating" || status === "queued" ? "disabled" : ""}>${status === "generating" ? "Generating Image..." : status === "queued" ? "Image Queued" : status === "image-error" ? `Try Again: ${imageModePolicy.button}` : imageModePolicy.button}</button>
              <button class="scene-action scene-video-button" data-bring-scene-to-life="${escapeHtml(scene.id)}" type="button" ${!hasImage || videoStatus === "generating" ? "disabled" : ""}>${videoButtonText}</button>
              <span class="scene-image-status" data-scene-image-status="${escapeHtml(scene.id)}">${status === "queued" ? `${escapeHtml(queueLabel)}: Scene ${index + 1} will generate automatically.` : status === "needs-image" ? "Ready for artwork." : status === "image-error" ? escapeHtml(scene.imageError || "Image generation failed. Press Try Again to retry manually.") : ""}</span>
              <span class="scene-video-status" data-scene-video-status="${escapeHtml(scene.id)}">${videoStatus === "generating" ? escapeHtml(scene.videoMessage || "Creating video...") : videoStatus === "complete" ? "Scene video ready." : videoStatus === "video_ready" ? "Scene video canvas is ready." : videoStatus === "video_error" ? escapeHtml(scene.videoError || "Video setup failed. Try again.") : ""}</span>
            </div>
          </div>
          <div class="scene-control-panel">
            <label><span>Mood</span><select data-scene-mood="${escapeHtml(scene.id)}">
              ${STORY_SCENE_MOODS.map((item) => `<option ${item === mood ? "selected" : ""}>${item}</option>`).join("")}
            </select></label>
            <label><span>Camera</span><select data-scene-camera="${escapeHtml(scene.id)}">
              ${STORY_SCENE_CAMERAS.map((item) => `<option ${item === camera ? "selected" : ""}>${item}</option>`).join("")}
            </select></label>
          </div>
          <div class="scene-quick-stack" aria-label="Scene quick actions">
            <button type="button" data-toggle-scene-expand="${escapeHtml(scene.id)}" aria-label="${expanded ? `Minimize scene ${index + 1}` : `Enlarge scene ${index + 1}`}">
              <span aria-hidden="true">${expanded ? "&minus;" : "&#x26F6;"}</span>
            </button>
            <button type="button" data-edit-scene="${escapeHtml(scene.id)}" aria-label="Edit scene ${index + 1}"><span class="op-icon op-icon-options" aria-hidden="true"></span></button>
            <button type="button" data-duplicate-scene="${escapeHtml(scene.id)}" aria-label="Duplicate scene ${index + 1}"><span class="op-icon op-icon-document" aria-hidden="true"></span></button>
            <button type="button" data-delete-scene="${escapeHtml(scene.id)}" aria-label="Delete scene ${index + 1}"><span class="op-icon op-icon-trash" aria-hidden="true"></span></button>
          </div>
        </article>`;
    }).join("");
}

function renderStoryApproval(project) {
  const draft = project.storyDraft || {};
  const textarea = document.querySelector("#fullStoryDraft");
  const state = document.querySelector("#storyApprovalState");
  const approveButton = document.querySelector("#approveFullStoryButton");
  const reviewDetails = document.querySelector("#storyReviewDetails");
  const chapterSummaryNode = document.querySelector("#storyChapterSummary");
  const sceneList = document.querySelector("#scenes");
  const sceneHead = document.querySelector("#storyScenesStepHead");
  const hasStory = cleanStoryText(draft.story).length >= 200;
  const chapterOverview = buildChapterOverview(draft);
  const hasReviewDetails = chapterOverview.length > 0;
  const hasExistingScenes = (project.scenes || []).some((scene) => cleanStoryText(scene.prompt) || scene.generatedImageUrl);
  if (textarea && document.activeElement !== textarea) textarea.value = draft.story || "";
  if (reviewDetails) reviewDetails.hidden = !hasReviewDetails;
  if (chapterSummaryNode) {
    chapterSummaryNode.innerHTML = chapterOverview.map((chapter, index) => `
      <li>
        <strong>Chapter ${index + 1}: ${escapeHtml(chapter.title)}</strong>
        <p>${escapeHtml(chapter.description)}</p>
      </li>
    `).join("");
  }
  if (approveButton) approveButton.disabled = !hasStory || ["generating", "splitting"].includes(draft.status);
  if (state) {
    state.textContent = draft.approved
      ? `Approved - ${draft.sceneCount || project.scenes?.length || 0} scenes`
      : draft.status === "generating"
        ? "Writing story..."
        : draft.status === "splitting"
          ? "Building scenes..."
          : hasStory
            ? "Ready for approval"
            : "Not written yet";
    state.classList.toggle("is-approved", Boolean(draft.approved));
  }
  const status = document.querySelector("#fullStoryStatus");
  if (status && draft.status === "error" && draft.generationError && !status.textContent) {
    status.textContent = draft.generationError;
  }
  const showScenes = Boolean(draft.approved || hasExistingScenes);
  if (sceneList) sceneList.hidden = !showScenes;
  if (sceneHead) sceneHead.hidden = !showScenes;
  renderStoryReaderState(project);
}

function buildChapterOverview(draft) {
  const chapters = Array.isArray(draft.chapters) ? draft.chapters : [];
  return chapters.map((chapter, index) => {
    const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs : [];
    const source = cleanStoryText(chapter.description || paragraphs[0] || "");
    return {
      title: cleanStoryText(chapter.title, "The Adventure Continues")
        .replace(/^chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight)\s*[:.-]?\s*/i, "")
        .trim() || "The Adventure Continues",
      description: chapterSummarySentence(source, index),
    };
  });
}

function chapterSummarySentence(value, index) {
  const text = cleanStoryText(value);
  if (!text) return `The next part of the adventure unfolds in Chapter ${index + 1}.`;
  const sentence = text.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  return sentence.length > 240 ? `${sentence.slice(0, 237).trim()}...` : sentence;
}

let storySetupProgressValue = 0;
let storySetupProgressTimer = null;
let storySetupStartedAt = 0;

const STORY_SETUP_PHASES = [
  { at: 4, message: "Reading your approved story and preparing the adventure..." },
  { at: 24, message: "Finding the moments that deserve their own scene..." },
  { at: 48, message: "Arranging the story in a clear visual sequence..." },
  { at: 70, message: "Matching each moment with a mood and camera view..." },
  { at: 88, message: "Checking the scene order and character continuity..." },
  { at: 100, message: "Your scenes are ready. Opening Story Scenes..." },
];

function renderStorySetupProgress(message = "") {
  const progress = document.querySelector("#storySetupProgress");
  const percent = document.querySelector("#storySetupPercent");
  const messageNode = document.querySelector("#storySetupLoadingMessage");
  const safePercent = Math.max(0, Math.min(100, Math.round(storySetupProgressValue)));
  const phase = [...STORY_SETUP_PHASES].reverse().find((item) => safePercent >= item.at);
  if (progress) {
    progress.style.setProperty("--story-setup-progress", `${safePercent * 3.6}deg`);
    progress.style.setProperty("--story-setup-width", `${safePercent}%`);
  }
  if (percent) percent.textContent = `${safePercent}%`;
  if (messageNode) messageNode.textContent = message || phase?.message || STORY_SETUP_PHASES[0].message;
}

function setStorySetupLoading(isLoading, message = "") {
  const loading = document.querySelector("#storySetupLoading");
  const actions = document.querySelector("#storySetupErrorActions");
  const heading = document.querySelector("#storySetupHeading");
  const detail = document.querySelector("#storySetupErrorDetail");
  if (!loading) return;
  window.clearInterval(storySetupProgressTimer);
  storySetupProgressTimer = null;
  loading.hidden = !isLoading;
  document.body.classList.toggle("is-story-setup-loading", isLoading);
  if (!isLoading) return;
  loading.classList.remove("has-error");
  if (actions) actions.hidden = true;
  if (detail) detail.hidden = true;
  if (heading) heading.textContent = "Preparing Story Scenes...";
  storySetupStartedAt = Date.now();
  storySetupProgressValue = 4;
  renderStorySetupProgress(message);
  storySetupProgressTimer = window.setInterval(() => {
    storySetupProgressValue = Math.min(
      92,
      storySetupProgressValue + Math.max(1, Math.ceil((92 - storySetupProgressValue) * 0.08)),
    );
    renderStorySetupProgress();
    if (storySetupProgressValue >= 92) {
      window.clearInterval(storySetupProgressTimer);
      storySetupProgressTimer = null;
    }
  }, 420);
}

function showStorySetupError(message = "") {
  const loading = document.querySelector("#storySetupLoading");
  const actions = document.querySelector("#storySetupErrorActions");
  const heading = document.querySelector("#storySetupHeading");
  const messageNode = document.querySelector("#storySetupLoadingMessage");
  if (!loading) return;
  window.clearInterval(storySetupProgressTimer);
  storySetupProgressTimer = null;
  loading.hidden = false;
  loading.classList.add("has-error");
  document.body.classList.add("is-story-setup-loading");
  if (heading) heading.textContent = "Scene preparation paused";
  if (messageNode) {
    const friendlyMessage = /too many requests|rate limit/i.test(message)
      ? "OPREALM needs a short moment before preparing the scenes. Your approved story is safe."
      : /request body is too large|input is too large/i.test(message)
        ? "This story needs to be prepared in smaller sections. Your approved story is safe."
        : /sign in|log in|session/i.test(message)
          ? "Your session needs refreshing before OPREALM can prepare the scenes. Your approved story is safe."
          : "OPREALM could not finish preparing the scenes. Your approved story is safe and ready to try again.";
    messageNode.textContent = friendlyMessage;
  }
  const detailNode = document.querySelector("#storySetupErrorDetail");
  if (detailNode) {
    detailNode.textContent = cleanStorySetupError(message);
    detailNode.hidden = false;
  }
  if (actions) actions.hidden = false;
}

function cleanStorySetupError(message = "") {
  const value = String(message || "").replace(/\s+/g, " ").trim();
  if (!value) return "No additional details were returned.";
  if (/too many requests|rate limit/i.test(value)) return "The preparation service is briefly busy. Wait a few seconds, then press Try Again.";
  if (/request body is too large|input is too large/i.test(value)) return "The approved story will be prepared in smaller sections on the next attempt.";
  if (/sign in|log in|session|unauthor/i.test(value)) return "Refresh your session, then press Try Again.";
  if (/database|not connected|configuration/i.test(value)) return "A required OPREALM service is temporarily unavailable.";
  return value.slice(0, 220);
}

async function finishStorySetupLoading() {
  window.clearInterval(storySetupProgressTimer);
  storySetupProgressTimer = null;
  const minimumDisplayMs = 3200;
  const elapsed = Date.now() - storySetupStartedAt;
  const remaining = Math.max(700, minimumDisplayMs - elapsed);
  const completionStages = [
    { percent: 28, message: STORY_SETUP_PHASES[1].message },
    { percent: 52, message: STORY_SETUP_PHASES[2].message },
    { percent: 74, message: STORY_SETUP_PHASES[3].message },
    { percent: 91, message: STORY_SETUP_PHASES[4].message },
    { percent: 100, message: STORY_SETUP_PHASES[5].message },
  ].filter((stage) => stage.percent > storySetupProgressValue);
  const stageDelay = Math.max(140, Math.floor(remaining / Math.max(1, completionStages.length)));
  for (const stage of completionStages) {
    storySetupProgressValue = stage.percent;
    renderStorySetupProgress(stage.message);
    await new Promise((resolve) => window.setTimeout(resolve, stageDelay));
  }
}

let storyWritingProgressValue = 0;
let storyWritingProgressTimer = null;

function renderStoryWritingProgress() {
  const progress = document.querySelector("#storyWritingProgress");
  const percent = document.querySelector("#storyWritingPercent");
  const safePercent = Math.max(0, Math.min(100, Math.round(storyWritingProgressValue)));
  if (progress) progress.style.setProperty("--scene-image-progress", `${safePercent * 3.6}deg`);
  if (percent) percent.textContent = `${safePercent}%`;
}

function setStoryWritingLoading(isLoading, { complete = false } = {}) {
  const loader = document.querySelector("#storyWritingLoader");
  if (!loader) return;
  window.clearInterval(storyWritingProgressTimer);
  storyWritingProgressTimer = null;
  loader.hidden = !isLoading;
  if (!isLoading) return;
  storyWritingProgressValue = complete ? 100 : 3;
  renderStoryWritingProgress();
  if (complete) return;
  storyWritingProgressTimer = window.setInterval(() => {
    storyWritingProgressValue = Math.min(
      94,
      storyWritingProgressValue + Math.max(1, Math.ceil((94 - storyWritingProgressValue) * 0.065)),
    );
    renderStoryWritingProgress();
    if (storyWritingProgressValue >= 94) {
      window.clearInterval(storyWritingProgressTimer);
      storyWritingProgressTimer = null;
    }
  }, 700);
}

function finishStoryWritingLoading() {
  setStoryWritingLoading(true, { complete: true });
  return new Promise((resolve) => {
    window.setTimeout(() => {
      setStoryWritingLoading(false);
      resolve();
    }, 260);
  });
}

function setStoryWritingStage(percent, message = "") {
  storyWritingProgressValue = Math.max(storyWritingProgressValue, Math.min(94, Number(percent) || 0));
  renderStoryWritingProgress();
  const status = document.querySelector("#fullStoryStatus");
  if (status && message) status.textContent = message;
}

function storyDraftPayload(project, mode = "write") {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const settings = storySettings(project);
  const storyCharacters = currentStoryCharacters(project);
  const payload = {
    mode,
    title: project.storyDraft?.title || project.title || "My OPREALM Story",
    approvedStory: mode === "split" ? preserveStoryFormatting(project.storyDraft?.story) : "",
    character: JSON.stringify({
      name: character.name || "The protagonist",
      type: character.characterType || character.type || "original hero",
      traits: character.traits || [],
      description: character.prompt || character.description || "",
    }),
    cast: JSON.stringify([
      ...storyCharacters.map((item) => ({
        name: item.name,
        role: item.id === project.activeCharacterId ? "hero" : "supporting",
        type: item.characterType || item.type || "character",
        gender: item.gender || item.recipe?.identity?.gender || "unspecified",
        age: item.age || item.recipe?.identity?.age || "",
      })),
      ...activeObjects(project)
        .filter((item) => item.kind === "pet" || item.kind === "companion")
        .map((item) => ({
          name: storyObjectName(item),
          role: "supporting",
          type: item.type || item.kind || "companion",
          gender: item.gender || "neutral",
          age: item.age || "",
        })),
    ].filter((item) => item.name)),
    world: JSON.stringify({
      name: world.name || "the selected realm",
      description: world.description || world.prompt || world.hook || "",
      mood: world.mood || [],
    }),
    storyType: settings.storyType,
    endingType: settings.endingType,
    lessonTheme: settings.lessonTheme,
    objects: activeObjects(project).map(storyObjectName).filter(Boolean),
  };
  if (mode === "split" && project.storyDraft?.logicPlan) {
    payload.storyLogicPlan = project.storyDraft.logicPlan;
  }
  if (mode === "split" && project.storyDraft?.storySpine) {
    payload.storySpine = project.storyDraft.storySpine;
  }
  if (mode === "split" && project.storyDraft?.signatureMomentsPlan) {
    payload.signatureMomentsPlan = project.storyDraft.signatureMomentsPlan;
  }
  return payload;
}

async function requestFullStory(project, mode = "write") {
  const status = document.querySelector("#fullStoryStatus");
  const previousDraft = project.storyDraft || {};
  if (mode === "write") resetStoryReaderAudio();
  project.storyDraft = {
    ...previousDraft,
    status: mode === "split" ? "splitting" : "generating",
    approved: false,
    generationStartedAt: new Date().toISOString(),
    generationError: "",
  };
  writeStoryboardProject(project);
  renderStoryApproval(project);
  if (status) status.textContent = mode === "split"
    ? "Reading the approved story and choosing scene boundaries..."
    : "Writing the complete story...";
  if (mode === "split") {
    setStorySetupLoading(true, "Reading your approved story and preparing the adventure...");
  } else {
    setStoryWritingLoading(true);
  }
  try {
    const basePayload = storyDraftPayload(project, mode);
    const saveBackgroundStage = (stageLabel) => (pending) => {
      project.storyDraft = {
        ...(project.storyDraft || {}),
        backgroundGeneration: pending?.providerResponseId ? {
          stageLabel,
          providerResponseId: pending.providerResponseId,
          status: pending.status || "in_progress",
          updatedAt: new Date().toISOString(),
        } : null,
      };
      writeStoryboardProject(project);
    };
    let result;
    if (mode === "write") {
      setStoryWritingStage(8, "Building the story foundation...");
      const spineResult = await requestStoryDraftStage(
        { ...basePayload, stage: "spine" },
        "story foundation",
        15 * 60 * 1000,
        saveBackgroundStage("story foundation"),
      );
      setStoryWritingStage(34, "Designing clues, choices and possible endings...");
      const logicResult = await requestStoryDraftStage({
        ...basePayload,
        stage: "logic",
        storySpine: spineResult.storySpine,
      }, "choice plan", 15 * 60 * 1000, saveBackgroundStage("choice plan"));
      setStoryWritingStage(52, "Planning the moments readers will remember...");
      let bestMomentsPlan = {};
      try {
        const momentsResult = await requestStoryDraftStage({
          ...basePayload,
          stage: "moments",
          storySpine: spineResult.storySpine,
          storyLogicPlan: logicResult.logicPlan,
        }, "best moments plan", 15 * 60 * 1000, saveBackgroundStage("best moments plan"));
        bestMomentsPlan = momentsResult.bestMomentsPlan || {};
      } catch {
        bestMomentsPlan = {};
      }
      setStoryWritingStage(64, "Designing signature moments and impossible locations...");
      let signaturePlanning = {};
      try {
        const signatureResult = await requestStoryDraftStage({
          ...basePayload,
          stage: "signature",
          storySpine: spineResult.storySpine,
          storyLogicPlan: logicResult.logicPlan,
          bestMomentsPlan,
        }, "signature moments plan", 15 * 60 * 1000, saveBackgroundStage("signature moments plan"));
        signaturePlanning = {
          signatureMomentsPlan: signatureResult.signatureMomentsPlan || {},
          emotionalRhythmPlan: signatureResult.emotionalRhythmPlan || [],
          storyLocations: signatureResult.storyLocations || [],
        };
      } catch {
        signaturePlanning = {};
      }
      setStoryWritingStage(76, "Writing the complete chapter story...");
      result = await requestStoryDraftStage({
        ...basePayload,
        stage: "prose",
        storySpine: spineResult.storySpine,
        storyLogicPlan: logicResult.logicPlan,
        bestMomentsPlan,
        ...signaturePlanning,
      }, "chapter story", 20 * 60 * 1000, saveBackgroundStage("chapter story"));
    } else {
      result = await requestStoryDraftStage(basePayload, "scene breakdown", 5 * 60 * 1000);
    }
    if (!result.ok || !result.draft?.story) {
      throw new Error(result.error || "Story writing failed.");
    }
    project.storyDraft = {
      title: result.draft.title,
      summary: result.draft.summary || previousDraft.summary || "",
      storySpine: result.draft.storySpine || previousDraft.storySpine || null,
      bestMomentsPlan: result.draft.bestMomentsPlan || previousDraft.bestMomentsPlan || null,
      signatureMomentsPlan: result.draft.signatureMomentsPlan || previousDraft.signatureMomentsPlan || null,
      emotionalRhythmPlan: result.draft.emotionalRhythmPlan || previousDraft.emotionalRhythmPlan || [],
      storyLocations: result.draft.storyLocations || previousDraft.storyLocations || [],
      logicPlan: result.draft.logicPlan || previousDraft.logicPlan || null,
      quality: result.draft.quality || previousDraft.quality || null,
      payoffQuality: result.draft.payoffQuality || previousDraft.payoffQuality || null,
      signatureQuality: result.draft.signatureQuality || previousDraft.signatureQuality || null,
      sceneSetQuality: result.draft.sceneSetQuality || previousDraft.sceneSetQuality || null,
      chapters: result.draft.chapters || previousDraft.chapters || [],
      story: mode === "split" ? preserveStoryFormatting(previousDraft.story) : preserveStoryFormatting(result.draft.story),
      scenePlan: result.draft.scenes || [],
      status: "ready",
      approved: mode === "split",
      sceneCount: result.draft.scenes?.length || 0,
      generationStartedAt: "",
      generationError: "",
      updatedAt: new Date().toISOString(),
      backgroundGeneration: null,
    };
    project.title = result.draft.title || project.title || "My OPREALM Story";
    if (mode === "split") buildScenesFromApprovedStory(project);
    writeStoryboardProject(project);
    if (mode === "write") await finishStoryWritingLoading();
    rerenderStoryboard(project);
    if (mode === "split") await finishStorySetupLoading();
    setStorySetupLoading(false);
    const currentStatus = document.querySelector("#fullStoryStatus") || status;
    if (currentStatus) currentStatus.textContent = mode === "split"
      ? `Story approved and divided into ${project.storyDraft.sceneCount} visual scenes.`
      : `Story written using ${result.creditsUsed || 0} Creator credits. Review and edit it before approval.`;
    if (mode === "split") {
      window.location.href = "/storyboard-scenes.html";
      return;
    }
  } catch (error) {
    if (mode === "split") showStorySetupError(error.message);
    else setStorySetupLoading(false);
    setStoryWritingLoading(false);
    const message = error.name === "AbortError"
      ? "Story writing took too long and was stopped. Please press Regenerate Story to try again."
      : error.message || "Story writing failed.";
    project.storyDraft = {
      ...previousDraft,
      status: "error",
      approved: false,
      generationStartedAt: "",
      generationError: message,
    };
    writeStoryboardProject(project);
    renderStoryApproval(project);
    const currentStatus = document.querySelector("#fullStoryStatus") || status;
    if (currentStatus) currentStatus.textContent = message;
  }
}

async function requestStoryDraftStage(payload, stageLabel, timeoutMs = 15 * 60 * 1000, onPending = null) {
  const startedAt = Date.now();
  let requestPayload = { ...payload };
  while (Date.now() - startedAt < timeoutMs) {
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 45 * 1000);
    let response;
    try {
      response = await fetch("/api/story-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(requestPayload),
      });
    } catch (error) {
      if (error.name === "AbortError") {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    } finally {
      window.clearTimeout(requestTimeout);
    }
    const raw = await response.text();
    let result = {};
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`The ${stageLabel} connection returned an unreadable response. Please try again.`);
    }
    if (response.status === 202 && result.providerResponseId) {
      requestPayload = { ...payload, providerResponseId: result.providerResponseId };
      onPending?.(result);
      await new Promise((resolve) => window.setTimeout(resolve, Number(result.pollAfterMs || 3500)));
      continue;
    }
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `The ${stageLabel} could not be generated.`);
    }
    onPending?.(null);
    return result;
  }
  throw new Error(`The ${stageLabel} is still processing. Your progress has been saved; return shortly to continue.`);
}

function buildScenesFromApprovedStory(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const plan = project.storyDraft?.scenePlan || [];
  const existingScenes = [...(project.scenes || [])];
  const generatedMoods = new Set(plan.map((beat) => String(beat.mood || "").trim().toLowerCase()).filter(Boolean));
  const generatedCameras = new Set(plan.map((beat) => String(beat.camera || "").trim().toLowerCase()).filter(Boolean));
  const repeatedMood = plan.length > 2 && generatedMoods.size <= 1;
  const repeatedCamera = plan.length > 2 && generatedCameras.size <= 1;
  const allowExactArtworkReuse = Number(project.storyDraft?.cinematicExtractionVersion || 0) >= 3;
  updateProjectContinuityBible(project);
  project.scenes = plan.map((beat, index) => {
    const sourcePassage = cleanStoryText(beat.sourcePassage || beat.passage);
    const existing = allowExactArtworkReuse && existingScenes.find((scene) =>
      sourcePassage
      && cleanStoryText(scene.sourcePassage || scene.storyExcerpt) === sourcePassage
    ) || {};
    const scene = {
      ...existing,
      id: beat.id || existing.id || uid("scene"),
      order: index + 1,
      title: beat.title || `Scene ${index + 1}`,
      chapterNumber: beat.chapterNumber || 1,
      sceneNumber: beat.sceneNumber || index + 1,
      cinematicSceneType: beat.cinematicSceneType || beat.sceneType || "",
      sceneType: beat.sceneType || beat.cinematicSceneType || "",
      sourcePassage,
      storyExcerpt: sourcePassage,
      emotionalPurpose: beat.emotionalPurpose || "",
      storyImportance: Number(beat.storyImportance || 0),
      charactersPresent: Array.isArray(beat.charactersPresent) ? beat.charactersPresent : [],
      location: beat.location || "",
      keyObject: beat.keyObject || "",
      decisionNodeId: beat.decisionNodeId || "",
      clueIds: Array.isArray(beat.clueIds) ? beat.clueIds : [],
      lightingMood: beat.lightingMood || "",
      continuityNotes: beat.continuityNotes || "",
      script: normalizeSceneScriptForProject(beat.script, character, project),
      visualDirection: beat.visualPromptFull || beat.visualDirection || "",
      userVisualDirection: sourcePassage,
      visualPromptSummary: beat.visualPromptSummary || "",
      visualPromptFull: beat.visualPromptFull || "",
      choices: (Array.isArray(beat.choices) ? beat.choices : []).filter(Boolean).slice(0, 3),
      decisionNode: beat.decisionNode || null,
      mood: normalizeSceneMood(repeatedMood ? "" : beat.mood, `${beat.passage || ""} ${beat.visualDirection || ""}`, index),
      camera: normalizeSceneCamera(repeatedCamera ? "" : beat.camera || beat.cameraDirection, `${beat.sourcePassage || beat.passage || ""} ${beat.visualDirection || ""}`, index),
      selectedCharacterIds: currentStoryCharacters(project)
        .filter((item) => (beat.charactersPresent || []).some((name) => cleanStoryText(name).toLowerCase() === cleanStoryText(item.name).toLowerCase()))
        .map((item) => item.id)
        .concat(character.id && !(beat.charactersPresent || []).length ? [character.id] : [])
        .filter(Boolean),
      selectedWorldId: world.id || "",
      selectedObjectIds: activeObjects(project)
        .filter((item) => new RegExp(`\\b${escapeRegExp(storyObjectName(item))}\\b`, "i").test(beat.passage || ""))
        .map((item) => item.id),
      status: existing.generatedImageUrl ? "complete" : "draft",
    };
    if (scene.decisionNode && window.OPREALMStoryDecisionEngine) {
      scene.decisionNode = window.OPREALMStoryDecisionEngine.normalizeDecisionNode(scene.decisionNode, scene.id);
      scene.visualDirection = window.OPREALMStoryDecisionEngine.buildDecisionVisualPrompt(scene.decisionNode, character.name || "the protagonist");
      scene.userVisualDirection = scene.visualDirection;
    }
    refreshSceneVisualPrompts(project, scene, index, { preserveSummary: true });
    return scene;
  });
  project.storyDraft.sceneCount = project.scenes.length;
  project.storyDraft.approved = true;
  project.storyDraft.cinematicSettingsVersion = 2;
  project.storyDraft.cinematicExtractionVersion = 3;
}

function normalizeSceneScriptForProject(script, hero, project) {
  const cast = projectCharactersForScript(hero, project);
  return (Array.isArray(script) ? script : [])
    .map((beat) => {
      const role = ["narrator", "hero", "supporting"].includes(beat?.speakerRole)
        ? beat.speakerRole
        : /^narrator$/i.test(String(beat?.speaker || "")) ? "narrator" : "supporting";
      if (role === "narrator") return { speaker: "Narrator", speakerRole: "narrator", text: cleanStoryText(beat.text) };
      const requested = cleanStoryText(beat?.speaker);
      const exact = cast.find((name) => name.toLowerCase() === requested.toLowerCase());
      const speaker = role === "hero" ? hero.name : exact;
      return { speaker: speaker || "Narrator", speakerRole: speaker ? role : "narrator", text: cleanStoryText(beat.text) };
    })
    .filter((beat) => beat.text)
    .slice(0, 8);
}

function projectCharactersForScript(hero, project) {
  return [
    hero?.name,
    ...currentStoryCharacters(project).map((item) => item.name),
    ...activeObjects(project)
      .filter((item) => item.kind === "pet" || item.kind === "companion")
      .map(storyObjectName),
  ].filter(Boolean);
}

function normalizeSceneMood(value, sceneText = "", index = 0) {
  const exact = STORY_SCENE_MOODS.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase());
  if (exact) return exact;
  const text = lowerStoryText(`${value || ""} ${sceneText}`);
  if (/laugh|funny|joke|silly|chaos|mischief|grin|giggle/.test(text)) return "Funny";
  if (/run|chase|fight|escape|race|leap|attack|crash|urgent/.test(text)) return "Action";
  if (/fear|danger|threat|trap|warning|closing in|tense|risk/.test(text)) return "Tense";
  if (/secret|clue|unknown|shadow|signal|strange|discover|mystery/.test(text)) return "Mystery";
  if (/cry|heart|promise|goodbye|hope|trust|forgive|lonely/.test(text)) return "Emotional";
  if (/victory|tower|army|final|great|power|hero|climax/.test(text)) return "Epic";
  if (/calm|home|rest|sunset|gentle|quiet|safe|peace/.test(text)) return "Peaceful";
  return ["Wonder", "Mystery", "Emotional", "Action"][index % 4];
}

function normalizeSceneCamera(value, sceneText = "", index = 0) {
  const exact = STORY_SCENE_CAMERAS.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase());
  if (exact) return exact;
  const text = lowerStoryText(`${value || ""} ${sceneText}`);
  if (/face|eyes|tear|whisper|realize|expression|small detail/.test(text)) return "Close Up";
  if (/conversation|speaks|asks|answers|beside|together|shows/.test(text)) return "Over Shoulder";
  if (/run|chase|follows|rush|race|moves through|escape/.test(text)) return "Tracking Shot";
  if (/sees through|from .* view|looks down|reaches toward|first person/.test(text)) return "POV";
  if (/towering|heroic|rises|stands against|powerful|guardian/.test(text)) return "Low Angle";
  if (/city|kingdom|valley|island|forest canopy|world below|vast/.test(text)) return "Drone Shot";
  if (/arrives|enters|reveals|landscape|crowd|battlefield|horizon/.test(text)) return "Wide Shot";
  return ["Medium Shot", "Close Up", "Tracking Shot", "Wide Shot"][index % 4];
}

function applySceneCinematicSettings(project) {
  const scenes = project.scenes || [];
  if (!project.storyDraft?.approved || scenes.length < MIN_STORY_SCENES || Number(project.storyDraft.cinematicSettingsVersion || 0) >= 2) return;
  const moods = new Set(scenes.map((scene) => String(scene.mood || "").trim().toLowerCase()).filter(Boolean));
  const cameras = new Set(scenes.map((scene) => String(scene.camera || "").trim().toLowerCase()).filter(Boolean));
  const repeatedMood = moods.size <= 1;
  const repeatedCamera = cameras.size <= 1;
  if (!repeatedMood && !repeatedCamera) {
    project.storyDraft.cinematicSettingsVersion = 2;
    return;
  }
  project.scenes = scenes.map((scene, index) => {
    const sceneText = `${scene.storyExcerpt || ""} ${scene.prompt || ""}`;
    return {
      ...scene,
      mood: repeatedMood ? normalizeSceneMood("", sceneText, index) : normalizeSceneMood(scene.mood, sceneText, index),
      camera: repeatedCamera ? normalizeSceneCamera("", sceneText, index) : normalizeSceneCamera(scene.camera, sceneText, index),
    };
  });
  project.storyDraft.cinematicSettingsVersion = 2;
}

function activeCharacter(project) {
  return (project.characters || []).find((character) => character.id === project.activeCharacterId) || (project.characters || [])[0] || {};
}

function activeWorld(project) {
  return (project.worlds || []).find((world) => world.id === project.activeWorldId) || (project.worlds || [])[0] || {};
}

function currentStoryCharacters(project) {
  const characters = Array.isArray(project.characters) ? project.characters : [];
  const active = activeCharacter(project);
  const explicitlySelectedIds = new Set(
    Array.isArray(project.storyCharacterIds) ? project.storyCharacterIds.filter(Boolean) : [],
  );
  if (active.id) explicitlySelectedIds.add(active.id);
  return characters.filter((character) => explicitlySelectedIds.has(character.id));
}

function activeObjects(project) {
  const selectedCharacterIds = new Set(currentStoryCharacters(project).map((character) => character.id));
  return (project.objects || []).filter((item) => {
    if (!item || !item.name || item.name === "None") return false;
    const sourceCharacterIds = Array.isArray(item.sourceCharacterIds) ? item.sourceCharacterIds.filter(Boolean) : [];
    return !sourceCharacterIds.length || sourceCharacterIds.some((id) => selectedCharacterIds.has(id));
  });
}

function sceneCharacters(project, scene) {
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const selected = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
  return selected.length ? selected : [activeCharacter(project)].filter((character) => character?.id || character?.name);
}

function sceneSelectedObjects(project, scene) {
  const selectedIds = new Set(scene.selectedObjectIds || []);
  return activeObjects(project).filter((item) => selectedIds.has(item.id));
}

function projectAgeBand(project) {
  const ages = currentStoryCharacters(project)
    .map((character) => Number(character.characterAge || character.recipe?.identity?.characterAge))
    .filter((age) => Number.isFinite(age));
  const youngest = ages.length ? Math.min(...ages) : 9;
  if (youngest <= 7) return "ages 6-9";
  if (youngest <= 11) return "ages 8-12";
  return "ages 10-14";
}

function updateProjectContinuityBible(project) {
  const builder = window.OPREALMSceneVisualPrompt;
  if (!builder?.createContinuityBible) return project.continuityBible || {};
  project.continuityBible = builder.createContinuityBible({
    world: activeWorld(project),
    characters: currentStoryCharacters(project),
    objects: activeObjects(project).map(storyObjectName),
    visualStyle: activeCharacter(project).masterStyle || activeCharacter(project).style || project.globalStyle || "",
    storyType: storySettings(project).storyType,
    eraAndGenre: activeWorld(project).theme || activeWorld(project).generatedTheme || "",
  });
  return project.continuityBible;
}

function sceneVisualPromptInput(project, scene, sceneIndex) {
  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  const characters = sceneCharacters(project, scene);
  const selectedObjects = sceneSelectedObjects(project, scene);
  const continuityBible = updateProjectContinuityBible(project);
  return {
    storyTitle: project.storyDraft?.title || project.title || "My OPREALM Story",
    world,
    characters,
    approvedFullStory: preserveStoryFormatting(project.storyDraft?.story),
    scene: {
      ...scene,
      passage: scene.storyExcerpt || "",
      selectedObjects: selectedObjects.map(storyObjectName),
    },
    sceneIndex,
    ageBand: projectAgeBand(project),
    visualStyle: characters[0]?.masterStyle || characters[0]?.style || project.globalStyle || continuityBible.styleGuide || "",
    continuityBible,
  };
}

function refreshSceneVisualPrompts(project, scene, sceneIndex, { preserveSummary = false } = {}) {
  const builder = window.OPREALMSceneVisualPrompt;
  if (!builder?.buildSceneVisualPrompt) {
    if (!preserveSummary || !scene.visualPromptSummary) {
      scene.visualPromptSummary = cleanStoryText(scene.prompt || scene.storyExcerpt, "Show this exact story moment.");
    }
    scene.visualPromptFull = buildSceneImagePromptLegacy(project, scene, sceneIndex);
  } else {
    const input = sceneVisualPromptInput(project, scene, sceneIndex);
    if (!preserveSummary || !scene.visualPromptSummary) {
      scene.visualPromptSummary = builder.buildSceneVisualPromptSummary(input);
    }
    scene.visualPromptFull = builder.buildSceneVisualPrompt(input);
  }
  scene.prompt = scene.visualPromptSummary;
  scene.visualPrompt = scene.visualPromptFull;
  scene.imagePromptInternal = scene.visualPromptFull;
  scene.promptQuality = builder?.validateSceneVisualPrompt
    ? builder.validateSceneVisualPrompt(scene.visualPromptFull, sceneVisualPromptInput(project, scene, sceneIndex))
    : scene.promptQuality || null;
  return scene;
}

function cleanStoryText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function preserveStoryFormatting(value, fallback = "") {
  const text = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || fallback;
}

function renderStoryReaderState(project) {
  const readButton = document.querySelector("#readStoryButton");
  const audio = document.querySelector("#storyReaderAudio");
  const controls = document.querySelector("#storyReaderControls");
  const hasStory = preserveStoryFormatting(project.storyDraft?.story).length >= 200;
  const isGenerating = !document.querySelector("#storyReaderLoading")?.hidden;
  if (readButton) readButton.disabled = !hasStory || isGenerating;
  if (controls && !audio?.src) controls.hidden = true;
}

function setStoryReaderProgress(percent) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const ring = document.querySelector("#storyReaderProgress");
  const label = document.querySelector("#storyReaderPercent");
  if (ring) ring.style.setProperty("--story-reader-progress", `${safePercent * 3.6}deg`);
  if (label) label.textContent = `${safePercent}%`;
}

function startStoryReaderProgress() {
  window.clearInterval(storyReaderProgressTimer);
  let percent = 3;
  setStoryReaderProgress(percent);
  storyReaderProgressTimer = window.setInterval(() => {
    const remaining = 92 - percent;
    percent += Math.max(1, Math.ceil(remaining * 0.08));
    setStoryReaderProgress(Math.min(92, percent));
    if (percent >= 92) window.clearInterval(storyReaderProgressTimer);
  }, 650);
}

function resetStoryReaderAudio(message = "") {
  storyReaderGenerationToken += 1;
  window.clearInterval(storyReaderProgressTimer);
  storyReaderProgressTimer = null;
  const audio = document.querySelector("#storyReaderAudio");
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  if (storyReaderAudioUrl) URL.revokeObjectURL(storyReaderAudioUrl);
  storyReaderAudioUrl = "";
  const loading = document.querySelector("#storyReaderLoading");
  const controls = document.querySelector("#storyReaderControls");
  const status = document.querySelector("#storyReaderStatus");
  if (loading) loading.hidden = true;
  if (controls) controls.hidden = true;
  if (status) status.textContent = message;
  setStoryReaderProgress(0);
}

async function generateStoryReaderAudio(project) {
  const story = preserveStoryFormatting(project.storyDraft?.story);
  if (story.length < 200) return;
  resetStoryReaderAudio();
  const token = storyReaderGenerationToken;
  const loading = document.querySelector("#storyReaderLoading");
  const controls = document.querySelector("#storyReaderControls");
  const readButton = document.querySelector("#readStoryButton");
  const status = document.querySelector("#storyReaderStatus");
  if (loading) loading.hidden = false;
  if (controls) controls.hidden = true;
  if (readButton) readButton.disabled = true;
  if (status) status.textContent = "Generating the complete ElevenLabs narration...";
  startStoryReaderProgress();
  try {
    const response = await fetch("/api/story-read-audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: story,
        voice: document.querySelector("#storyReaderVoice")?.value || "warm-storyteller",
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Story voice generation failed (${response.status}).`);
    }
    const blob = await response.blob();
    if (token !== storyReaderGenerationToken) return;
    storyReaderAudioUrl = URL.createObjectURL(blob);
    const audio = document.querySelector("#storyReaderAudio");
    if (!audio) return;
    audio.src = storyReaderAudioUrl;
    audio.load();
    window.clearInterval(storyReaderProgressTimer);
    setStoryReaderProgress(100);
    window.setTimeout(() => {
      if (loading) loading.hidden = true;
      if (controls) controls.hidden = false;
    }, 350);
    if (status) status.textContent = "Story voice ready. Press Play when you are ready.";
  } catch (error) {
    if (token !== storyReaderGenerationToken) return;
    resetStoryReaderAudio(error.message || "Story voice generation failed.");
  } finally {
    if (readButton) readButton.disabled = false;
    renderStoryReaderState(project);
  }
}

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function updateStoryReaderTime() {
  const audio = document.querySelector("#storyReaderAudio");
  const time = document.querySelector("#storyReaderTime");
  if (!audio || !time) return;
  time.textContent = `${formatAudioTime(audio.currentTime)} / ${formatAudioTime(audio.duration)}`;
}

function clearFullStory(project) {
  if (!window.confirm("Clear the full story, chapter summary and generated voice? Existing scene cards will stay.")) return;
  resetStoryReaderAudio();
  project.storyDraft = {
    title: project.title || "My OPREALM Story",
    story: "",
    summary: "",
    chapters: [],
    scenePlan: [],
    status: "ready",
    approved: false,
    sceneCount: 0,
    updatedAt: new Date().toISOString(),
  };
  writeStoryboardProject(project);
  rerenderStoryboard(project);
  const status = document.querySelector("#fullStoryStatus");
  if (status) status.textContent = "Story cleared. Your characters, world and existing scene cards were kept.";
}

function lowerStoryText(value) {
  return cleanStoryText(value).toLowerCase();
}

function isGenericStoryIdea(value) {
  const text = lowerStoryText(value);
  if (!text) return true;
  return [
    /help me build/,
    /playable game/,
    /\bbuild this\b/,
    /\bmake this\b/,
    /\bcreate (a|the)?\s*game\b/,
    /\bturn this .*game\b/,
    /\bmy awesome story\b/,
    /\buntitled\b/,
    /\bnew story\b/,
  ].some((pattern) => pattern.test(text));
}

function storyTraitPhrase(traits = []) {
  const cleanTraits = traits
    .map((trait) => cleanStoryText(trait).toLowerCase())
    .filter(Boolean)
    .slice(0, 4);
  return compactList(cleanTraits, "brave and curious");
}

function isNoPet(value) {
  return /^(none|no\s+pet|no\s+companion|custom\s+pet)$/i.test(cleanStoryText(value));
}

function isGenericStoryObject(item = {}) {
  const name = lowerStoryText(item.name);
  if (!name || /^(none|object)$/i.test(name)) return true;
  if (/^custom (object|pet)$/i.test(name)) return true;
  return /^(backpack|bag|goggles|hat|cap|scarf|gloves|boots|jacket|cloak|map|key)$/i.test(name);
}

function storyObjectName(item = {}) {
  const name = cleanStoryText(item.name);
  if (!name || isGenericStoryObject(item)) return "";
  return name;
}

function storyWorldPremise(world = {}, project = {}) {
  const options = [
    world.description,
    world.hook,
    world.prompt,
    project.originalIdea,
    project.idea,
    project.sparkIdea,
  ].map((value) => cleanStoryText(value)).filter((value) => value && !isGenericStoryIdea(value));
  const premise = options[0] || "";
  if (premise) return normalizeWorldPremise(premise);
  const place = cleanStoryText(world.name || project.title, "the story world");
  return `a mystery is unfolding across ${place}`;
}

function normalizeWorldPremise(value) {
  let premise = cleanStoryText(value).replace(/^["']|["']$/g, "").replace(/[.!?]+$/, "");
  premise = premise
    .replace(/^(please\s+)?(create|make|build|generate|design)\s+(me\s+)?(a\s+)?world\s+(where|that|with|about)\s+/i, "")
    .replace(/^(a\s+)?world\s+(where|that|with|about)\s+/i, "")
    .replace(/^where\s+/i, "")
    .trim();
  return premise || "a mystery is unfolding";
}

function storyProp(project, world) {
  const namedObject = activeObjects(project)
    .filter((item) => !/pet|companion/i.test(cleanStoryText(item.kind)))
    .map(storyObjectName)
    .find(Boolean);
  return namedObject || "";
}

function storyCompanion(character, objects) {
  const selectedPet = cleanStoryText(character?.pet);
  const customPet = cleanStoryText(character?.customPet);
  if (/^custom pet$/i.test(selectedPet)) {
    return /^(custom\s+pet|none|no\s+pet)$/i.test(customPet) ? "" : customPet;
  }
  if (selectedPet && !isNoPet(selectedPet)) return selectedPet;
  const companion = (objects || []).find((item) => {
    const name = cleanStoryText(item.name);
    return name && !isNoPet(name) && /pet|companion|friend|ally/i.test(name) && !isGenericStoryObject(item);
  });
  return cleanStoryText(companion?.name);
}

function storyNounPhrase(value) {
  const text = cleanStoryText(value);
  if (!text) return "a troubling sign";
  if (/^(a|an|the)\s+/i.test(text)) return text;
  return `the ${text}`;
}

function sentenceStart(value) {
  const text = cleanStoryText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function storySettings(project = {}) {
  return {
    ...STORY_DIRECTION_DEFAULTS,
    ...(project.storySettings || {}),
  };
}

function hashStoryValue(value) {
  return Array.from(cleanStoryText(value, "oprealm")).reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }, 0);
}

function pickStoryOption(options, seed, offset = 0) {
  const index = Math.abs(hashStoryValue(`${seed}:${offset}`)) % options.length;
  return options[index];
}

function internalStoryDirection(project = {}, settings = storySettings(project)) {
  const seed = `${project.id || project.title || "story"}:${settings.storyType}:${settings.endingType}:${settings.lessonTheme}`;
  return {
    structure: pickStoryOption(STORY_INTERNAL_OPTIONS.structures, seed, 1),
    tone: pickStoryOption(STORY_INTERNAL_OPTIONS.tones, seed, 2),
    conflict: pickStoryOption(STORY_INTERNAL_OPTIONS.conflicts, seed, 3),
  };
}

function storyTypeLabel(type) {
  return ({
    "epic-quest": "an epic quest",
    mystery: "a mystery adventure",
    "creature-rescue": "a creature rescue",
    "funny-adventure": "a funny adventure",
    "hero-origin": "a hero origin story",
  })[type] || "an epic quest";
}

function endingInstruction(type) {
  return ({
    happy: "ends with hope, repair and a clear win for the hero",
    surprise: "ends with a warm twist that makes the earlier clues feel clever",
    cliffhanger: "solves the main problem but opens one exciting door for the next adventure",
    bittersweet: "ends with victory, but also a small sacrifice that makes the lesson feel real",
  })[type] || "ends with hope, repair and a clear win for the hero";
}

function endingNarrative(seed, details) {
  return ({
    happy: `Morning light returns to ${seed.place} as the repaired systems come alive without harming the world below. ${seed.hero} watches former rivals rebuild side by side, while ${details.creature} carries the first supplies across the reopened path.`,
    surprise: `When the danger finally falls silent, ${details.elder} reveals that the oldest warning was never meant to keep heroes out; it was waiting for someone willing to bring everyone in together. A newly opened passage glows beneath ${details.landmark}, marked with ${seed.hero}'s name.`,
    cliffhanger: `${seed.place} begins to recover, but a final signal pulses from beyond ${details.finalPlace}. ${seed.hero} looks toward the unexplored horizon as the guardian creature answers with a low call, and somewhere far away another signal answers back.`,
    bittersweet: `${seed.place} is safe, though ${details.finalPlace} cannot be restored. At sunrise, the people gather stones from its ruins and build a smaller shelter together. ${seed.hero} leaves one broken piece at the entrance, then walks home beside the friends who survived.`,
  })[seed.settings.endingType] || `Morning light returns to ${seed.place}. ${seed.hero} watches the people begin rebuilding together while the last alarms fade into birdsong.`;
}

function themeLesson(theme, character = {}) {
  return ({
    courage: "courage means doing the right thing even when the path feels frightening",
    friendship: "friendship grows when people choose trust over fear",
    teamwork: "teamwork can solve problems no one can solve alone",
    creativity: "creative thinking can turn impossible problems into new paths",
    nature: "protecting nature means listening to the living world before trying to control it",
  })[theme] || storyMoralForCharacter(character);
}

function conflictPhrase(conflict, details) {
  return ({
    "broken-world": `${details.machine} is failing because the world has been forced to hide an old wound`,
    "ancient-secret": `${details.landmark} is guarding a secret that was buried for the wrong reason`,
    "rival-pressure": `${details.people} are being pushed toward a fight by someone who profits from fear`,
    "lost-friend": `${details.ally} is searching for someone taken by the danger spreading through the realm`,
    "moral-choice": `the quickest way to win would also hurt the very world ${details.people} are trying to save`,
  })[conflict] || `${details.machine} is failing because the world has been forced to hide an old wound`;
}

function storyTypeFocus(seed, details) {
  return ({
    "epic-quest": `${seed.hero} is stepping into a legendary quest where every choice raises the stakes.`,
    mystery: `${seed.hero} is entering a mystery of clues, suspects and discoveries, where every answer opens a sharper question.`,
    "creature-rescue": `The emotional center is rescuing ${details.creature} and learning why the creature matters to the whole world.`,
    "funny-adventure": `${seed.hero} is caught in a playful adventure where strange mistakes keep revealing serious truths.`,
    "hero-origin": `${seed.hero} is becoming the kind of hero this world needs, one choice at a time.`,
  })[seed.settings.storyType] || `${seed.hero} is stepping into a legendary quest where every choice raises the stakes.`;
}

function firstStoryGoal(seed, details) {
  return ({
    "epic-quest": `reach ${details.finalPlace} before ${details.danger} spreads beyond control`,
    mystery: `discover who woke the danger beneath the canopy and why the clues keep pointing back to ${details.landmark}`,
    "creature-rescue": `find and protect ${details.creature} before fear turns the world against it`,
    "funny-adventure": `survive a chain of ridiculous mistakes that accidentally reveal the real danger`,
    "hero-origin": `prove that ${seed.hero} can protect ${seed.place} without losing the person ${seed.hero} already is`,
  })[seed.settings.storyType] || `reach ${details.finalPlace} before ${details.danger} spreads beyond control`;
}

function storyWorldDetails(seed) {
  const text = lowerStoryText(`${seed.place} ${seed.worldPremise} ${seed.worldPrompt}`);
  if (/amazon|jungle|warrior|myth|creature|future|tech/.test(text)) {
    return {
      people: "the warrior clans",
      elder: "a scarred guardian queen",
      ally: "a young sky-hawk rider",
      creature: "a feathered river serpent",
      smallCreature: "glowing glass-wing insects",
      landmark: "the vine-wrapped signal temple",
      hiddenPlace: "the flooded root-catacombs",
      machine: "an ancient solar engine",
      danger: "a swarm of silent drones waking beneath the canopy",
      treasure: "the heart-core of the jungle",
      finalPlace: "the storm-lit crown temple",
    };
  }
  if (/robot|drone|machine|future|tech|neon|city/.test(text)) {
    return {
      people: "the hidden inventors",
      elder: "an old engineer with silver hands",
      ally: "a nervous repair bot",
      creature: "a huge machine guardian",
      smallCreature: "sparks of living code",
      landmark: "the broken signal tower",
      hiddenPlace: "the engine tunnels below the city",
      machine: "the central memory core",
      danger: "machines repeating an ancient command",
      treasure: "the lost command key",
      finalPlace: "the highest relay station",
    };
  }
  if (/magic|spell|portal|crystal|dragon|myth/.test(text)) {
    return {
      people: "the scattered villagers",
      elder: "a keeper of old spells",
      ally: "a brave apprentice",
      creature: "a wounded moon dragon",
      smallCreature: "lantern sprites",
      landmark: "the cracked crystal gate",
      hiddenPlace: "the library under the hill",
      machine: "the sleeping portal",
      danger: "shadows leaking through the old magic",
      treasure: "the crystal heart",
      finalPlace: "the tower at the edge of dawn",
    };
  }
  return {
    people: "the people of the realm",
    elder: "a watchful guardian",
    ally: "an unexpected ally",
    creature: "a strange creature",
    smallCreature: "tiny lights in the air",
    landmark: "the oldest landmark",
    hiddenPlace: "a hidden chamber beneath the path",
    machine: "the ancient mechanism",
    danger: "a danger that has been waiting in silence",
    treasure: "the heart of the mystery",
    finalPlace: "the place where the whole world holds its breath",
  };
}

function possessiveName(name) {
  const hero = cleanStoryText(name, "the hero");
  return /s$/i.test(hero) ? `${hero}'` : `${hero}'s`;
}

function storyWant(seed, details) {
  return ({
    "epic-quest": `to prove they can protect ${seed.place}`,
    mystery: "to find the answer before anyone else gets hurt",
    "creature-rescue": `to save ${details.creature} without turning the world against it`,
    "funny-adventure": "to fix the mess before it becomes a disaster",
    "hero-origin": "to be brave enough for the role they never asked for",
  })[seed.settings.storyType] || `to protect ${seed.place}`;
}

function storyEmotionalNeed(seed) {
  return ({
    courage: "choosing courage even while scared",
    friendship: "trusting friendship instead of doing everything alone",
    teamwork: "letting others help carry the story",
    creativity: "using imagination when the obvious answer fails",
    nature: "listening to the living world instead of trying to control it",
  })[seed.settings.lessonTheme] || seed.moral;
}

function storyFalseBelief(seed, details) {
  return ({
    courage: `${seed.hero} believed bravery meant never hesitating`,
    friendship: `${seed.hero} believed asking for help would make them less heroic`,
    teamwork: `${seed.hero} believed the fastest answer was the best answer`,
    creativity: `${seed.hero} believed the rules of the problem could not be changed`,
    nature: `${seed.hero} believed ${seed.place} needed rescuing before it needed understanding`,
  })[seed.settings.lessonTheme] || `${seed.hero} believed winning quickly mattered most`;
}

function storyPressure(seed, details) {
  return ({
    "broken-world": `${seed.place} is breaking because people tried to hide an old mistake instead of healing it`,
    "ancient-secret": `the truth was buried to keep everyone calm, but silence has made the danger stronger`,
    "rival-pressure": `${details.people} are being pushed into conflict by fear and half-truths`,
    "lost-friend": `${details.ally} is searching for someone lost because nobody listened when the warning first came`,
    "moral-choice": `the easiest victory would protect today while damaging tomorrow`,
  })[seed.direction.conflict] || `${seed.place} is hurting because fear has been mistaken for wisdom`;
}

function storyChapterBeat(seed, chapterIndex, middleCount) {
  const details = storyWorldDetails(seed);
  const openingProblem = seed.prop
    ? `${seed.hero} tries to ignore ${storyNounPhrase(seed.prop)}, but it appears again near ${details.landmark}`
    : `${seed.hero} receives an urgent warning near ${details.landmark}`;
  const companionText = seed.companion ? ` and ${seed.companion}` : "";
  const storyWantText = storyWant(seed, details);
  const pressure = storyPressure(seed, details);
  const beats = [
    {
      title: "The Promise That Pulls",
      prompt: `${openingProblem}. ${sentenceStart(details.ally)} arrives breathless, carrying news that ${details.danger} will reach the settlements before nightfall. When a distant alarm echoes through ${seed.place}, ${seed.hero} promises to ${storyWantText.replace(/^to\s+/i, "")} and follows the rider toward the forbidden path.`,
      mood: "Mystery",
      camera: "Medium Shot",
    },
    {
      title: "The Choice That Costs",
      prompt: `${seed.hero}${companionText} discovers a shortcut across a collapsing bridge, but cries rise from below where a trapped child clings to the roots. ${seed.hero} abandons the shortcut and climbs down. By the time the child is safe, the bridge has fallen and the dark shapes in the distance are much closer.`,
      mood: "Action",
      camera: "Drone Shot",
    },
    {
      title: "The Truth Beneath The Fear",
      prompt: `Inside ${details.hiddenPlace}, ${seed.hero} finds old damage hidden beneath layers of hurried repairs. A message left by ${details.elder} reveals that ${pressure}. Footsteps approach before ${seed.hero} can read the final line, forcing a choice between hiding the evidence and carrying it into the open.`,
      mood: "Wonder",
      camera: "Close Up",
    },
    {
      title: "The Misunderstood Guardian",
      prompt: `${sentenceStart(details.creature)} bursts from the shadows and blocks the only exit. While everyone prepares to fight, ${seed.hero} notices a wounded young creature trembling behind it. ${seed.hero} lowers their guard and treats the wound. The guardian slowly steps aside, then turns to lead the way deeper underground.`,
      mood: "Epic",
      camera: "Low Angle",
    },
    {
      title: "The Almost-Win",
      prompt: `${seed.hero} reaches ${details.treasure} and activates its ancient controls. Across ${seed.place}, the alarms fall silent and cheering begins. Then cracks race through the chamber floor, revealing roots and waterways withering below. The victory is working by draining the life from everything hidden beneath the city.`,
      mood: "Mystery",
      camera: "Wide Shot",
    },
    {
      title: "The Harder Good",
      prompt: `${seed.hero} cannot hold the failing controls and rescue the people below at the same time. After one painful hesitation, ${seed.hero} gives the controls to ${details.ally} and descends into the breaking chamber. The machine shudders, but the ally keeps it stable long enough for everyone to escape.`,
      mood: "Emotional",
      camera: "Medium Shot",
    },
    {
      title: "When Everyone Turns Away",
      prompt: `Fear spreads through ${seed.place}, and people who should be helping begin blaming one another. ${seed.hero} could keep chasing the goal alone, but instead steps into the argument and tells the truth, even though staying quiet would be easier and safer.`,
      mood: "Mystery",
      camera: "Wide Shot",
    },
    {
      title: "The Wound In The Story",
      prompt: `${seed.hero} brings the hidden evidence before ${details.people}. The chamber falls silent as old rivals recognise their own marks among the failed repairs. Instead of accusing them, ${seed.hero} places the evidence where everyone can see it and asks each group to reveal the part of the truth they kept hidden.`,
      mood: "Emotional",
      camera: "Close Up",
    },
    {
      title: "The Chase That Reveals Character",
      prompt: `${details.danger} breaks through the outer defences and sends the crowd running. ${seed.hero} races toward ${details.finalPlace}, doubling back twice to pull stranded families from collapsing paths. Each rescue costs ground, until the guardian creature arrives and carries the last group to safety.`,
      mood: "Action",
      camera: "Drone Shot",
    },
    {
      title: "The Quiet Before The Choice",
      prompt: `At the foot of ${details.finalPlace}, ${seed.hero} watches the lights of ${seed.place} flicker below. The easy solution is still within reach, but so are the voices of the people who chose to stand together. ${seed.hero} takes one steady breath, turns away from the shortcut and enters the storm.`,
      mood: "Wonder",
      camera: "Wide Shot",
    },
    {
      title: "The Answer Was The Lesson",
      prompt: `The final mechanism has more controls than one person can reach. ${seed.hero} calls to the rider, the rescued families, the former rivals and the guardian creature. They take their places around the chamber. For the first time, every part moves together, and the locked path to the heart of the danger opens.`,
      mood: "Mystery",
      camera: "Close Up",
    },
  ];
  if (middleCount <= 2) {
    return chapterIndex === 0 ? beats[0] : beats[10];
  }
  const sourceIndex = Math.min(beats.length - 1, Math.floor((chapterIndex / Math.max(1, middleCount - 1)) * (beats.length - 1)));
  return beats[sourceIndex];
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
  const safeCount = Math.max(5, Number(count) || FALLBACK_STORY_SCENES);
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
  const settings = storySettings(project);
  const direction = internalStoryDirection(project, settings);
  const hero = cleanStoryText(character.name, "the hero");
  const place = cleanStoryText(world.name || project.title, "the story world");
  const traits = storyTraitPhrase(character.traits || []);
  const style = character.masterStyle || project.globalStyle || "cinematic kid-friendly";
  const prop = storyProp(project, world);
  const companion = storyCompanion(character, objects);
  const worldPrompt = world.description || world.prompt || world.hook || "a vivid, safe world full of discovery";
  const worldPremise = storyWorldPremise(world, project);
  const moral = themeLesson(settings.lessonTheme, character);
  return { character, world, hero, place, traits, style, prop, companion, worldPrompt, worldPremise, moral, settings, direction };
}

function storyPlanForCount(project, count) {
  const seed = storySeed(project);
  const labels = storyArcForCount(count);
  const lastChapterIndex = labels.findLastIndex((label) => /^Chapter/i.test(label));
  const companionText = seed.companion ? ` and ${seed.companion}` : "";
  const details = storyWorldDetails(seed);
  const storyWantText = storyWant(seed, details);
  const emotionalNeed = storyEmotionalNeed(seed);
  const pressure = storyPressure(seed, details);
  const middleCount = labels.filter((label) => /^Chapter/i.test(label)).length;
  let chapterIndex = 0;
  return labels.map((label, index) => {
    const sceneNumber = index + 1;
    const isIntro = index === 0;
    const isClimax = label === "Climax";
    const isEnding = label === "Ending";
    const isLastChapter = index === lastChapterIndex;
    let title = `${label}: ${seed.hero} enters ${seed.place}`;
    let prompt = "";
    let mood = "Wonder";
    let camera = "Wide Shot";

    if (isIntro) {
      title = "Intro: A Promise Begins";
      const firstHelpMoment = seed.prop
        ? `${storyNounPhrase(seed.prop)} lies abandoned beside the path`
        : `${details.ally} stumbles from the trees, exhausted and afraid`;
      prompt = `${seed.hero} arrives in ${seed.place} as ${details.smallCreature} scatter above the rooftops and a warning siren sounds from ${details.landmark}. ${firstHelpMoment}. Before ${seed.hero} can ask what happened, the ground trembles and ${details.ally} points toward ${details.finalPlace}, where ${details.danger} has begun to wake.`;
      mood = "Wonder";
      camera = "Wide Shot";
    } else if (isClimax) {
      title = "Climax: The Brave Choice";
      prompt = `${seed.hero}${companionText} reaches the controls at the heart of ${details.finalPlace}. One lever would stop ${details.danger} instantly, but the warning map shows it would destroy ${details.hiddenPlace} and everyone still inside. ${seed.hero} refuses the lever, opens the sealed control ring and calls every ally to a different station as the chamber begins to collapse.`;
      mood = "Epic";
      camera = "Low Angle";
    } else if (isEnding) {
      title = "Ending: What The Hero Carries";
      prompt = endingNarrative(seed, details);
      mood = "Emotional";
      camera = "Medium Shot";
    } else if (isLastChapter) {
      const beat = storyChapterBeat(seed, Math.max(0, middleCount - 1), middleCount);
      title = `${label}: ${beat.title}`;
      prompt = beat.prompt;
      mood = "Mystery";
      camera = "Close Up";
    } else {
      const beat = storyChapterBeat(seed, chapterIndex, middleCount);
      title = `${label}: ${beat.title}`;
      prompt = beat.prompt;
      mood = beat.mood;
      camera = beat.camera;
      chapterIndex += 1;
    }

    return {
      order: sceneNumber,
      arcRole: label,
      title,
      prompt,
      planInternal: {
        storyType: seed.settings.storyType,
        endingType: seed.settings.endingType,
        lessonTheme: seed.settings.lessonTheme,
        structure: seed.direction.structure,
        tone: seed.direction.tone,
        conflict: seed.direction.conflict,
        goal: storyWantText,
        emotionalNeed,
        pressure,
      },
      mood,
      camera,
    };
  });
}

function storyPromptForIndex(project, index, previousPrompt = "") {
  const count = Math.max(5, (project.scenes || []).length || FALLBACK_STORY_SCENES);
  const plan = storyPlanForCount(project, count)[index] || storyPlanForCount(project, index + 1)[index];
  if (!previousPrompt || !plan?.prompt) return plan?.prompt || "";
  return `After the previous moment, ${plan.prompt.charAt(0).toLowerCase()}${plan.prompt.slice(1)}`;
}

function sceneTitleFromPrompt(prompt, fallback) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSceneImagePromptLegacy(project, scene, sceneIndex) {
  const character = activeCharacter(project);
  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  const storyText = cleanStoryText(scene.prompt, storyPromptForIndex(project, sceneIndex));
  const hero = cleanStoryText(character.name, "the hero");
  const place = cleanStoryText(world.name, "the story world");
  const explicitObjects = (project.objects || [])
    .filter((item) => (scene.selectedObjectIds || []).includes(item.id))
    .map(storyObjectName)
    .filter((name) => name && new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(storyText));
  return [
    `Create a cinematic visual of this exact story moment: ${storyText}`,
    `Show ${hero} acting inside ${place}. Express the moment through pose, facial expression, interaction, environment changes and clear visible action.`,
    `Camera: ${scene.camera || "Wide Shot"}. Mood: ${scene.mood || "Wonder"}.`,
    explicitObjects.length
      ? `Include only these story objects because the passage explicitly names them: ${explicitObjects.join(", ")}.`
      : "Do not add a featured object, held prop, clue, crystal, orb or invented item unless the story passage explicitly names one.",
    "Do not render narration, chapter labels, lesson text, UI, captions or written words.",
    "Translate abstract emotions into visible cinematic storytelling without changing the scene events.",
  ].join("\n");
}

function buildSceneImagePrompt(project, scene, sceneIndex) {
  const builder = window.OPREALMSceneVisualPrompt;
  if (!builder?.buildSceneVisualPrompt) return buildSceneImagePromptLegacy(project, scene, sceneIndex);
  return builder.buildSceneVisualPrompt(sceneVisualPromptInput(project, scene, sceneIndex));
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

function addStoryScene(project, prompt = "", { autoGeneratePrompt = false } = {}) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  const previousPrompt = (project.scenes || []).at(-1)?.prompt || "";
  const nextPrompt = prompt || (autoGeneratePrompt ? storyPromptForIndex(project, project.scenes?.length || 0, previousPrompt) : "");
  const sceneNumber = (project.scenes || []).length + 1;
  project.scenes = [
    ...(project.scenes || []),
    {
      id: uid("scene"),
      order: sceneNumber,
      title: sceneTitleFromPrompt(nextPrompt, `Scene ${sceneNumber}`),
      prompt: nextPrompt,
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: [],
      status: "draft",
    },
  ];
  return project;
}

function clearStoryboardScenes(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  project.scenes = Array.from({ length: MIN_STORY_SCENES }, (_, index) => ({
    id: uid("scene"),
    order: index + 1,
    title: `Scene ${index + 1}`,
    prompt: "",
    selectedCharacterIds: character.id ? [character.id] : [],
    selectedWorldId: world.id || "",
    selectedObjectIds: [],
    status: "draft",
    imageError: "",
    completed: false,
  }));
  project.storyArc = [];
  project.moral = "";
  return normalizeSceneOrders(project);
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
    addReference(
      character?.imageUrl || character?.generatedImageUrl || character?.recipe?.generation?.generatedImageUrl,
      character?.name || "Character",
    );
  });

  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  addReference(world?.imageUrl || world?.generatedImageUrl, world?.name || "World");

  return references.slice(0, 4);
}

function buildSceneVideoPrompt(project, scene, sceneIndex) {
  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const characters = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
  const character = characters[0] || activeCharacter(project);
  const prompt = cleanStoryText(scene.prompt, storyPromptForIndex(project, sceneIndex));
  const previousScene = project.scenes?.[sceneIndex - 1];
  const nextScene = project.scenes?.[sceneIndex + 1];
  const shot = sceneVideoShotRecipe(project, scene, sceneIndex, { character, world, prompt, previousScene, nextScene });
  const visualPromptFull = buildSceneImagePrompt(project, scene, sceneIndex);
  return [
    "Create an 8-second cinematic movie shot from the supplied image for OPRealm.",
    "Use the supplied image as the exact first frame and visual anchor. Preserve the character identity, world, outfit, colors, art style, and family-friendly tone.",
    "The result must feel like a polished fantasy/adventure movie moment, not a lightly animated photo.",
    "",
    "STORY MOMENT:",
    `Scene ${sceneIndex + 1}: ${cleanStoryText(scene.title, `Scene ${sceneIndex + 1}`)}`,
    prompt,
    `Full visual art direction: ${visualPromptFull}`,
    previousScene?.prompt ? `Previous scene context: ${cleanStoryText(previousScene.prompt, "")}` : "",
    nextScene?.prompt ? `Next scene direction: ${cleanStoryText(nextScene.prompt, "")}` : "",
    "",
    "CINEMATIC ACTION:",
    shot.primaryAction,
    shot.environmentReaction,
    shot.characterEmotion,
    "",
    "SHOT TIMING:",
    `0-2 seconds: ${shot.openingBeat}`,
    `2-6 seconds: ${shot.middleBeat}`,
    `6-8 seconds: ${shot.endingBeat}`,
    "",
    "CAMERA AND LIGHTING:",
    shot.cameraMove,
    shot.lightingCue,
    "Use depth, parallax, foreground/background motion, and dramatic reveal. Camera movement supports the action; it must not be the only motion.",
    "",
    "MOTION PRIORITIES:",
    "1. The main character performs a clear physical action.",
    "2. The world visibly reacts to that action.",
    "3. Lighting changes or intensifies during the moment.",
    "4. Secondary motion adds life: hair, cape, fabric, dust, leaves, water, magic, technology, creatures, sparks, or atmospheric particles.",
    "",
    "STRICT NEGATIVES:",
    "Do not make this a still-image zoom, slideshow, Ken Burns effect, simple push-in, simple pan, or only moving rocks/particles.",
    "Do not repeat a generic action where the character picks up, holds, reaches for, or stares at a glowing crystal, orb, gem, clue, signal, or light unless the scene text explicitly says that exact object is being picked up.",
    "Do not turn every scene into a discovery of a glowing object. Each clip must animate the actual story beat, emotion, conflict, creature, obstacle, conversation, chase, or choice in this specific scene.",
    "No text overlays, no UI, no logos, no readable words, no gore, no scary realism, no romance, no unsafe behavior, no copyrighted characters.",
    "Silent visual clip only: no music, no narration, no dialogue, no singing, no sound effects, no spoken words.",
    "",
    "STYLE LOCK:",
    `Mood: ${cleanStoryText(scene.mood, "Wonder")}`,
    `Camera selector: ${cleanStoryText(scene.camera, "Wide Shot")}`,
    `World: ${cleanStoryText(world.name || world.description, "OPRealm story world")}`,
    `Main character: ${cleanStoryText(character.name, "OPRealm hero")}`,
  ].join("\n");
}

function sceneVideoShotRecipe(project, scene, sceneIndex, context) {
  const { character, world, prompt } = context;
  const hero = cleanStoryText(character?.name, "the hero");
  const worldName = cleanStoryText(world?.name || world?.description, "the story world");
  const mood = cleanStoryText(scene.mood, "Wonder");
  const camera = cleanStoryText(scene.camera, "Wide Shot");
  const text = String(prompt || "").toLowerCase();
  const storyType = storySettings(project).storyType || "epic-quest";
  const action = sceneVideoActionBeat(text, hero);
  const reaction = sceneVideoEnvironmentReaction(text, worldName);
  const emotion = sceneVideoEmotionBeat(text, hero, mood);
  return {
    primaryAction: action.primary,
    environmentReaction: reaction,
    characterEmotion: emotion,
    openingBeat: sceneVideoOpeningBeat(text, hero),
    middleBeat: action.middle,
    endingBeat: sceneVideoEndingBeat(text, hero, storyType, context.nextScene),
    cameraMove: sceneVideoCameraMove(camera, text, hero),
    lightingCue: sceneVideoLightingCue(mood, text),
  };
}

function sceneVideoMotionInstruction(prompt, character) {
  const hero = cleanStoryText(character?.name, "the hero");
  const text = String(prompt || "").toLowerCase();
  if (/portal|door|gate|signal|glow|light/.test(text)) {
    return `${hero} notices the glowing signal, leans or steps toward it, and the portal or light pulses with visible energy.`;
  }
  if (/creature|dragon|pet|animal|monster|beast/.test(text)) {
    return `${hero} reacts to the creature while the creature visibly moves, blinks, breathes, turns, or approaches safely.`;
  }
  if (/run|chase|escape|dodge|danger|obstacle|block/.test(text)) {
    return `${hero} makes a clear movement to dodge, step around, climb past, or escape the obstacle while the environment shifts around them.`;
  }
  if (/find|discover|clue|secret|notice|investigate/.test(text)) {
    return `${hero} investigates through expression, movement, observation, and reaction while the environment reveals the story detail without a repeated glowing pickup.`;
  }
  if (/fight|battle|challenge|protect|defend/.test(text)) {
    return `${hero} takes a brave defensive pose or raises a safe story object while energy and background motion build tension.`;
  }
  return `${hero} visibly reacts to the scene with a clear gesture, step, turn, reach, or expression change while the world around them moves.`;
}

function sceneVideoOpeningBeat(text, hero) {
  if (/run|chase|escape|dodge|danger|obstacle|block|collapse/.test(text)) {
    return `${hero} is already in motion, reacting to the immediate danger with a clear dodge, sprint, climb, or turn.`;
  }
  if (/creature|dragon|pet|animal|monster|beast|serpent/.test(text)) {
    return `${hero} notices the living creature and shifts posture emotionally before the creature moves.`;
  }
  if (/truth|choice|trust|promise|fear|hope|lesson|harder good|sacrifice/.test(text)) {
    return `${hero} pauses in a tense emotional moment, then makes a visible decision that changes their posture and direction.`;
  }
  return `${hero} begins with a clear performance beat: looking, turning, stepping, reacting, or deciding based on the scene story.`;
}

function sceneVideoActionBeat(text, hero) {
  if (/\b(picks up|pick up|grabs|takes|holds|lifts)\b.*\b(crystal|gem|orb|clue|signal|light)\b/.test(text)) {
    return {
      primary: `${hero} carefully handles the object because the scene explicitly calls for it, reacting with surprise and purpose.`,
      middle: `The object responds briefly, but the focus stays on ${hero}'s expression, body language, and the story consequence rather than a generic glowing pickup.`,
    };
  }
  if (/portal|door|gate/.test(text)) {
    return {
      primary: `${hero} approaches or backs away from the portal or threshold with a clear emotional choice, without picking up any glowing object.`,
      middle: `The doorway or air around it shifts, opens, ripples, or casts moving light while ${hero} decides what to do next.`,
    };
  }
  if (/creature|dragon|pet|animal|monster|beast/.test(text)) {
    return {
      primary: `${hero} turns toward the creature and makes a clear safe interaction: reaching out, stepping back, shielding, or gesturing.`,
      middle: `The creature visibly moves, blinks, breathes, shifts its head/body, and causes nearby foliage, dust, or light to react.`,
    };
  }
  if (/run|chase|escape|dodge|danger|obstacle|block/.test(text)) {
    return {
      primary: `${hero} actively dodges, climbs, steps around, or pushes past the obstacle instead of standing still.`,
      middle: `The obstacle and environment move in response: stones shift, dust bursts, light flickers, or the path opens while ${hero} completes the action.`,
    };
  }
  if (/find|discover|clue|secret|notice|investigate/.test(text)) {
    return {
      primary: `${hero} investigates through performance rather than picking anything up: scanning the scene, reading expressions, following movement, or noticing a change in the environment.`,
      middle: `The discovery lands through camera focus, shifting background action, character reaction, and atmosphere instead of a repeated glowing crystal or held object.`,
    };
  }
  if (/truth|choice|trust|promise|fear|hope|lesson|harder good|sacrifice/.test(text)) {
    return {
      primary: `${hero} makes a visible emotional choice: lowering their guard, stepping between others, turning back to help, or choosing a harder path.`,
      middle: `The acting carries the moment: shoulders shift, face changes, allies react, and the world quiets or swells around the decision.`,
    };
  }
  if (/fight|battle|challenge|protect|defend/.test(text)) {
    return {
      primary: `${hero} takes a brave defensive pose and raises a safe story object or their arms as the challenge builds.`,
      middle: `Energy, wind, dust, and background motion surge around ${hero}, making the scene feel dramatic without violence or gore.`,
    };
  }
  return {
    primary: `${hero} performs a visible story action: steps forward, turns, reaches, gestures, reacts, or interacts with the nearest important object.`,
    middle: `The world responds to ${hero}'s action with moving light, atmosphere, background depth, and at least one object or creature changing position.`,
  };
}

function sceneVideoEnvironmentReaction(text, worldName) {
  if (/tech|robot|drone|future|signal|hologram|glow/i.test(text)) {
    return `The environment in ${worldName} reacts with holographic light, pulsing panels, hovering particles, and gentle mechanical movement.`;
  }
  if (/jungle|forest|amazon|creature|nature|vine|tree/i.test(text)) {
    return `The environment in ${worldName} reacts with swaying leaves, drifting mist, moving water, fluttering insects, and shafts of light through the trees.`;
  }
  if (/portal|magic|crystal|myth|dragon|spell/i.test(text)) {
    return `The environment in ${worldName} reacts with magical light, floating motes, shimmering air, pulsing symbols, and a visible energy ripple.`;
  }
  return `The environment in ${worldName} reacts visibly with moving atmosphere, light, small background motion, and foreground depth.`;
}

function sceneVideoEmotionBeat(text, hero, mood) {
  if (/fear|danger|mystery|secret|strange/i.test(`${text} ${mood}`)) {
    return `${hero}'s expression and body language shift from cautious curiosity to brave focus.`;
  }
  if (/funny|silly|surprise/i.test(`${text} ${mood}`)) {
    return `${hero}'s expression changes with a playful surprise before they take action.`;
  }
  if (/epic|challenge|battle|protect/i.test(`${text} ${mood}`)) {
    return `${hero}'s expression hardens with courage as they commit to the moment.`;
  }
  return `${hero}'s expression changes clearly so the shot has an emotional beat, not only environmental motion.`;
}

function sceneVideoEndingBeat(text, hero, storyType, nextScene) {
  if (nextScene?.prompt) {
    return `${hero} ends the shot facing the next discovery or decision, with the final frame pointing toward the next scene.`;
  }
  if (/climax|ending|final|truth|reveal/i.test(text)) {
    return `${hero} holds a strong final pose as the environment settles into a dramatic reveal frame.`;
  }
  if (storyType === "mystery") return `${hero} ends by noticing a new clue, creating a clear hook for the next shot.`;
  return `${hero} ends in a cinematic decision pose, ready for the next story beat.`;
}

function sceneVideoCameraMove(camera, text, hero) {
  if (/close/i.test(camera)) return `Camera starts close on ${hero}'s reaction, then subtly pulls back or arcs to reveal the moving story detail.`;
  if (/low/i.test(camera)) return `Camera uses a heroic low angle with a gentle arc, making ${hero}'s action feel larger and more cinematic.`;
  if (/drone|wide/i.test(camera)) return `Camera begins wide to show scale, then glides inward just enough to follow ${hero}'s action and the environment reaction.`;
  if (/pov/i.test(camera)) return `Camera feels like a safe adventure POV, tracking the action while keeping ${hero} and the story detail readable.`;
  return `Camera makes a controlled cinematic arc around ${hero}, with parallax in foreground and background.`;
}

function sceneVideoLightingCue(mood, text) {
  if (/mystery|secret|strange/i.test(`${mood} ${text}`)) return "Lighting shifts from soft shadow into selective cinematic contrast that reveals emotion, danger, or a hidden story consequence without relying on a glowing held object.";
  if (/action|epic|challenge|battle/i.test(`${mood} ${text}`)) return "Lighting intensifies during the action, adding rim light, sparks, and dramatic contrast.";
  if (/funny|wonder|magical|dream/i.test(`${mood} ${text}`)) return "Lighting blooms warmly with colorful highlights and a bright magical finish.";
  return "Lighting visibly changes during the shot, helping the scene feel directed and cinematic.";
}

function prepareSceneVideoCanvas(project, sceneId) {
  const sceneIndex = (project.scenes || []).findIndex((item) => item.id === sceneId);
  const scene = project.scenes?.[sceneIndex];
  if (!scene) return;
  if (!scene.generatedImageUrl) {
    scene.videoStatus = "video_error";
    scene.videoError = "Generate the scene image before creating video.";
    writeStoryboardProject(project);
    rerenderStoryboard(project);
    return;
  }
  scene.mediaMode = "video";
  if (scene.generatedVideoUrl) {
    writeStoryboardProject(project);
    rerenderStoryboard(project);
    return;
  }
  scene.videoStatus = "video_ready";
  scene.videoError = "";
  scene.videoDuration = scene.videoDuration || 5;
  scene.videoPromptInternal = buildSceneVideoPrompt(project, scene, sceneIndex);
  scene.videoMessage = "The video canvas is ready. The next step is connecting the image-to-video generator.";
  writeStoryboardProject(project);
  rerenderStoryboard(project);
}

async function generateStoryboardSceneVideo(project, sceneId) {
  project = ensureSceneList(readStoryboardProject());
  const sceneIndex = (project.scenes || []).findIndex((item) => item.id === sceneId);
  const scene = project.scenes?.[sceneIndex];
  if (!scene) return;

  const statusTarget = document.querySelector(`[data-scene-video-status="${CSS.escape(sceneId)}"]`);
  const buttonTarget = document.querySelector(`[data-bring-scene-to-life="${CSS.escape(sceneId)}"]`);
  if (!scene.generatedImageUrl) {
    scene.videoStatus = "video_error";
    scene.videoError = "Generate the scene image before creating video.";
    writeStoryboardProject(project);
    rerenderStoryboard(project);
    return;
  }
  if (scene.generatedVideoUrl) {
    const shouldRegenerate = window.confirm("Regenerate this scene video? This will keep the original image, replace the current video when the new one is ready, and use Creator credits.");
    if (!shouldRegenerate) {
      scene.mediaMode = "video";
      scene.videoStatus = "complete";
      writeStoryboardProject(project);
      rerenderStoryboard(project);
      return;
    }
    scene.previousVideoUrl = scene.generatedVideoUrl;
    scene.generatedVideoUrl = "";
    scene.videoRegenerationNonce = Date.now();
  }

  scene.mediaMode = "video";
  scene.videoStatus = "generating";
  scene.videoError = "";
  scene.videoDuration = 8;
  scene.videoPromptInternal = buildSceneVideoPrompt(project, scene, sceneIndex);
  scene.videoMessage = "Preparing the scene image for video...";
  writeStoryboardProject(project);
  rerenderStoryboard(project);
  if (buttonTarget) {
    buttonTarget.disabled = true;
    buttonTarget.textContent = "Creating Video...";
  }
  if (statusTarget) statusTarget.textContent = "Preparing scene video...";

  try {
    const imageDataUrl = await prepareVideoReferenceImage(scene.generatedImageUrl);
    const response = await fetch("/api/story-scene-video", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": `scene-video:${scene.id}:${dataUrlSize(scene.generatedImageUrl)}:${scene.videoRegenerationNonce || "first"}:${String(scene.prompt || "").slice(0, 80)}`,
      },
      body: JSON.stringify({
        sceneId: scene.id,
        sceneTitle: scene.title || `Scene ${sceneIndex + 1}`,
        prompt: scene.videoPromptInternal,
        imageDataUrl,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.jobId) {
      const prefix = response.status === 401
        ? "Please log in before creating scene video."
        : response.status === 402
          ? "Not enough Creator credits for this scene video."
          : "";
      throw new Error(prefix || result.error || `Scene video generation failed (${response.status || "network"}).`);
    }

    const latestProject = ensureSceneList(readStoryboardProject());
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId);
    if (!latestScene) throw new Error("Scene was removed before the video started.");
    latestScene.mediaMode = scene.mediaMode === "image" ? "image" : "video";
    latestScene.videoStatus = "generating";
    latestScene.videoJobId = result.jobId;
    latestScene.providerVideoId = result.providerVideoId || "";
    latestScene.videoRegenerationNonce = scene.videoRegenerationNonce || latestScene.videoRegenerationNonce || "";
    latestScene.videoMessage = result.status === "queued" ? "Video queued. This can take a few minutes." : "Video rendering...";
    if (result.videoUrl) {
      latestScene.generatedVideoUrl = result.videoUrl;
      latestScene.previousVideoUrl = "";
      latestScene.videoRegenerationNonce = "";
      latestScene.videoStatus = "complete";
      latestScene.videoMessage = "Scene video ready.";
      writeStoryboardProject(latestProject);
      rerenderStoryboard(latestProject);
      return;
    }
    writeStoryboardProject(latestProject);
    rerenderStoryboard(latestProject);
    pollSceneVideoJob(sceneId, result.jobId, Number(result.pollAfterMs || 10000));
  } catch (error) {
    const latestProject = ensureSceneList(readStoryboardProject());
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId) || scene;
    latestScene.mediaMode = "video";
    latestScene.videoStatus = "video_error";
    latestScene.videoError = error.message || "Could not create scene video.";
    latestScene.videoMessage = "";
    writeStoryboardProject(latestProject);
    rerenderStoryboard(latestProject);
    const errorTarget = document.querySelector(`[data-scene-video-status="${CSS.escape(sceneId)}"]`);
    if (errorTarget) errorTarget.textContent = latestScene.videoError;
  }
}

async function pollSceneVideoJob(sceneId, jobId, initialDelayMs = 10000) {
  await sleep(Math.max(2000, initialDelayMs));
  for (let attempt = 0; attempt < 48; attempt += 1) {
    try {
      const response = await fetch(`/api/story-scene-video-status?id=${encodeURIComponent(jobId)}`);
      const result = await response.json().catch(() => ({}));
      const project = ensureSceneList(readStoryboardProject());
      const scene = (project.scenes || []).find((item) => item.id === sceneId);
      if (!scene) return;
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Video status failed (${response.status || "network"}).`);
      }
      scene.mediaMode = scene.mediaMode === "image" ? "image" : "video";
      scene.videoJobId = jobId;
      scene.videoStatus = result.status === "completed" ? "complete" : "generating";
      scene.videoMessage = result.status === "queued"
        ? "Video queued. Waiting for the generator..."
        : result.status === "in_progress"
          ? `Video rendering${Number(result.progress || 0) ? ` (${Math.round(Number(result.progress))}%)` : "..."}`
          : "Scene video ready.";
      if (result.videoUrl) {
        scene.generatedVideoUrl = result.videoUrl;
        scene.previousVideoUrl = "";
        scene.videoRegenerationNonce = "";
        scene.videoError = "";
        scene.videoMessage = "Scene video ready.";
        writeStoryboardProject(project);
        rerenderStoryboard(project);
        return;
      }
      writeStoryboardProject(project);
      rerenderStoryboard(project);
      await sleep(Math.max(8000, Number(result.pollAfterMs || 10000)));
    } catch (error) {
      const project = ensureSceneList(readStoryboardProject());
      const scene = (project.scenes || []).find((item) => item.id === sceneId);
      if (scene) {
        scene.mediaMode = "video";
        scene.videoStatus = "video_error";
        scene.videoError = error.message || "Video generation failed.";
        scene.videoMessage = "";
        if (scene.previousVideoUrl && !scene.generatedVideoUrl) {
          scene.generatedVideoUrl = scene.previousVideoUrl;
          scene.videoMessage = "The previous video is still available.";
        }
        writeStoryboardProject(project);
        rerenderStoryboard(project);
      }
      return;
    }
  }

  const project = ensureSceneList(readStoryboardProject());
  const scene = (project.scenes || []).find((item) => item.id === sceneId);
  if (scene) {
    scene.videoStatus = "video_error";
    scene.videoError = "Video is taking longer than expected. Try again in a moment.";
    scene.videoMessage = "";
    writeStoryboardProject(project);
    rerenderStoryboard(project);
  }
}

function prepareVideoReferenceImage(dataUrl, targetWidth = 1280, targetHeight = 720, quality = 0.88) {
  const source = String(dataUrl || "");
  if (!source.startsWith("data:image/")) return Promise.resolve(source);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        const sourceRatio = image.naturalWidth / image.naturalHeight;
        const targetRatio = targetWidth / targetHeight;
        let sourceWidth = image.naturalWidth;
        let sourceHeight = image.naturalHeight;
        let sourceX = 0;
        let sourceY = 0;
        if (sourceRatio > targetRatio) {
          sourceWidth = Math.round(sourceHeight * targetRatio);
          sourceX = Math.round((image.naturalWidth - sourceWidth) / 2);
        } else {
          sourceHeight = Math.round(sourceWidth / targetRatio);
          sourceY = Math.round((image.naturalHeight - sourceHeight) / 2);
        }
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Could not prepare the scene image for video."));
    image.src = source;
  });
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resumeStoryboardVideoJobs(project) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  scenes.forEach((scene) => {
    if (!scene?.videoJobId || scene.generatedVideoUrl) return;
    if (!["generating", "queued", "processing"].includes(scene.videoStatus || "")) return;
    scene.videoStatus = "generating";
    scene.videoMessage = scene.videoMessage || "Checking saved video progress...";
    pollSceneVideoJob(scene.id, scene.videoJobId, 1000);
  });
}

function setSceneImageProgress(sceneId, percent) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const progress = document.querySelector(`[data-scene-image-progress="${CSS.escape(sceneId)}"]`);
  if (!progress) return;
  progress.style.setProperty("--scene-image-progress", `${safePercent * 3.6}deg`);
  const label = progress.querySelector("span");
  if (label) label.textContent = `${safePercent}%`;
}

function startSceneImageProgress(sceneId, startingPercent = 3) {
  stopSceneImageProgress(sceneId);
  let percent = Math.max(3, Number(startingPercent) || 3);
  setSceneImageProgress(sceneId, percent);
  const timer = window.setInterval(() => {
    const remaining = 94 - percent;
    percent += Math.max(1, Math.ceil(remaining * 0.065));
    percent = Math.min(94, percent);
    setSceneImageProgress(sceneId, percent);
    if (percent >= 94) stopSceneImageProgress(sceneId);
  }, 700);
  sceneImageProgressTimers.set(sceneId, timer);
}

function stopSceneImageProgress(sceneId) {
  const timer = sceneImageProgressTimers.get(sceneId);
  if (timer) window.clearInterval(timer);
  sceneImageProgressTimers.delete(sceneId);
}

async function generateStoryboardSceneImage(project, sceneId) {
  project = await compactStoryboardImages(ensureSceneList(readStoryboardProject()));
  const sceneIndex = (project.scenes || []).findIndex((item) => item.id === sceneId);
  const scene = project.scenes?.[sceneIndex];
  if (!scene) return;

  const statusTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`);
  const buttonTarget = document.querySelector(`[data-generate-scene-image="${CSS.escape(sceneId)}"]`);
  if (buttonTarget) {
    buttonTarget.disabled = true;
    buttonTarget.textContent = "Generating Image...";
  }
  if (statusTarget) statusTarget.textContent = "Starting scene artwork...";
  const characterById = new Map((project.characters || []).map((character) => [character.id, character]));
  const characters = (scene.selectedCharacterIds || []).map((id) => characterById.get(id)).filter(Boolean);
  const character = characters[0] || activeCharacter(project);
  const secondCharacter = characters[1] || {};
  const world = (project.worlds || []).find((item) => item.id === scene.selectedWorldId) || activeWorld(project);
  const prompt = String(scene.prompt || "").trim() || storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
  const storyContext = cleanStoryText(scene.storyExcerpt, prompt);
  const imageMode = storyImageMode();

  scene.prompt = prompt;
  refreshSceneVisualPrompts(project, scene, sceneIndex);
  scene.title = scene.title || sceneTitleFromPrompt(prompt, `Scene ${sceneIndex + 1}`);
  scene.status = "generating";
  scene.imageQueuedAt = "";
  scene.imageNextRetryAt = "";
  scene.imageProgress = 3;
  scene.imageGenerationStartedAt = new Date().toISOString();
  scene.imageError = "";
  scene.imageRequestId = scene.imageRequestId || crypto.randomUUID();
  try {
    writeStoryboardProject(project);
  } catch (error) {
    scene.status = "image_error";
    scene.imageError = "Browser storage is full. Delete a few generated scene images or refresh and try again.";
    console.error("Storyboard scene image status save failed", error);
    rerenderStoryboard(project);
    return;
  }
  rerenderStoryboard(project);
  startSceneImageProgress(sceneId, scene.imageProgress);

  const freshStatusTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`) || statusTarget;
  if (freshStatusTarget) freshStatusTarget.textContent = "Generating scene artwork...";

  try {
    const requestBody = JSON.stringify({
        sceneId,
        imageMode,
        idempotencyKey: scene.imageRequestId || "",
        prompt: storyContext,
        visualPrompt: scene.imagePromptInternal,
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
        characterOutfit: character.customOutfit || character.outfit || character.recipe?.components?.outfit || "",
        characterAccessories: compactList(character.accessories || character.recipe?.components?.accessories || [], ""),
        characterPalette: compactList(character.palette || character.recipe?.components?.palette || [], ""),
        characterSafety: character.safety || "Friendly and safe for kids",
        secondCharacterName: secondCharacter.name || "",
        secondCharacterPrompt: secondCharacter.prompt || secondCharacter.description || "",
        secondCharacterType: secondCharacter.characterType || secondCharacter.type || "",
        secondCharacterPersonality: compactList(secondCharacter.traits || [], secondCharacter.personality || ""),
        secondCharacterStyle: secondCharacter.masterStyle || secondCharacter.style || "",
        secondCharacterOutfit: secondCharacter.customOutfit || secondCharacter.outfit || secondCharacter.recipe?.components?.outfit || "",
        secondCharacterAccessories: compactList(secondCharacter.accessories || secondCharacter.recipe?.components?.accessories || [], ""),
        secondCharacterPalette: compactList(secondCharacter.palette || secondCharacter.recipe?.components?.palette || [], ""),
        secondCharacterSafety: secondCharacter.safety || "",
        sceneStyle: character.masterStyle || project.globalStyle || "inherit",
        lockCharacterStyle: true,
        lockSceneContinuity: true,
        continuityBrief: `Scene ${sceneIndex + 1} of ${project.title || "an OPREALM story"}. Preserve the saved character, selected world, outfit colors, accessories, and the previous scene logic.`,
        referenceImages: storyboardReferenceImages(project, scene),
      });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 210000);
    let response;
    let result;
    try {
      response = await fetch("/api/story-scene-images", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": scene.imageRequestId || "",
        },
        signal: controller.signal,
        body: requestBody,
      });
      result = await response.json().catch(() => ({}));
    } catch (requestError) {
      result = await waitForExistingSceneImageJob({
        idempotencyKey: scene.imageRequestId,
        sceneId,
      });
      response = { ok: Boolean(result?.ok && result?.status === "completed"), status: result?.status === "completed" ? 200 : 0 };
      if (!response.ok) throw requestError;
    } finally {
      window.clearTimeout(timeout);
    }
    if (response.status === 202 && result.jobId) {
      const queuedProject = ensureSceneList(readStoryboardProject());
      const queuedScene = (queuedProject.scenes || []).find((item) => item.id === sceneId);
      if (!queuedScene) return;
      stopSceneImageProgress(sceneId);
      queuedScene.status = result.status === "processing" ? "generating" : "image_queued";
      queuedScene.imageJobId = result.jobId;
      queuedScene.imageQueuedAt = queuedScene.imageQueuedAt || new Date().toISOString();
      queuedScene.imageProgress = result.status === "processing" ? Math.max(8, Number(queuedScene.imageProgress || 0)) : 3;
      queuedScene.imageError = "";
      writeStoryboardProject(queuedProject);
      rerenderStoryboard(queuedProject);
      startSceneImageStatusMonitor();
      return;
    }
    const generatedImageSource = result.webImageUrl || result.webImageDataUrl || "";
    if (!response.ok || !result.ok || !generatedImageSource) {
      const retryable = Boolean(result.retryable || response.status === 202 || response.status === 429 || [502, 503, 504].includes(response.status));
      const prefix = response.status === 401
        ? "Please log in before generating scene images."
        : response.status === 402
          ? "Not enough Creator credits for this scene image."
          : response.status === 429
            ? "The artwork queue is receiving many scenes. Wait briefly, then press Try Again; your completed images are safe."
          : [503, 504].includes(response.status)
            ? "The image service is temporarily busy. Press Try Again when you are ready."
            : "";
      const generationError = new Error(prefix || result.error || `Scene image generation failed (${response.status || "network"}).`);
      generationError.retryable = retryable;
      throw generationError;
    }

    const latestProject = await compactStoryboardImages(ensureSceneList(readStoryboardProject()));
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId);
    if (!latestScene) throw new Error("Scene was removed before the image finished.");
    latestScene.generatedImageUrl = result.webImageUrl
      ? result.webImageUrl
      : await compressImageDataUrl(result.webImageDataUrl, 720, 480, 0.74);
    latestScene.imageMode = result.imageMode || imageMode;
    latestScene.imageWasCached = Boolean(result.cached);
    stopSceneImageProgress(sceneId);
    latestScene.imageProgress = 100;
    latestScene.imageGenerationStartedAt = "";
    latestScene.imageQueuedAt = "";
    latestScene.imageRetryCount = 0;
    latestScene.imageNextRetryAt = "";
    latestScene.imageRequestId = "";
    latestScene.imageJobId = "";
    setSceneImageProgress(sceneId, 100);
    await sleep(350);
    latestScene.status = "complete";
    latestScene.completed = true;
    latestScene.imageError = "";
    writeStoryboardProject(latestProject);
    rerenderStoryboard(latestProject);
  } catch (error) {
    stopSceneImageProgress(sceneId);
    const latestProject = ensureSceneList(readStoryboardProject());
    const latestScene = (latestProject.scenes || []).find((item) => item.id === sceneId) || scene;
    latestScene.status = "image_error";
    latestScene.imageProgress = 0;
    latestScene.imageGenerationStartedAt = "";
    latestScene.imageQueuedAt = "";
    latestScene.imageNextRetryAt = "";
    if (error.name === "AbortError") {
      latestScene.imageError = "Image generation took too long. Press Try Again.";
    } else {
      latestScene.imageError = error.message || "Could not generate scene image.";
    }
    try {
      writeStoryboardProject(latestProject);
    } catch (storageError) {
      latestScene.imageError = "Browser storage is full. Delete a few generated scene images or refresh and try again.";
      console.error("Storyboard scene image save failed", storageError);
    }
    console.error("Storyboard scene image generation failed", error);
    rerenderStoryboard(latestProject);
    const errorTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`);
    if (errorTarget) errorTarget.textContent = latestScene.imageError;
  }
}

async function waitForExistingSceneImageJob({ jobId = "", idempotencyKey = "", sceneId = "" } = {}) {
  const statusTarget = document.querySelector(`[data-scene-image-status="${CSS.escape(sceneId)}"]`);
  if (statusTarget) statusTarget.textContent = "Waiting in the artwork queue...";
  const startedAt = Date.now();
  while (Date.now() - startedAt < 12 * 60 * 1000) {
    const query = jobId
      ? `id=${encodeURIComponent(jobId)}`
      : `tool=story_scene_images&idempotencyKey=${encodeURIComponent(idempotencyKey)}`;
    const response = await fetch(`/api/generation-job?${query}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.status === "completed" && (result.webImageUrl || result.webImageDataUrl)) return result;
    if (response.ok && statusTarget) {
      statusTarget.textContent = result.status === "processing"
        ? "Creating scene artwork..."
        : "Waiting in the artwork queue...";
    }
    if (response.ok && result.status === "failed") {
      throw new Error(result.error || "Scene image generation failed. Press Try Again.");
    }
    if (response.status !== 404 && !response.ok) {
      throw new Error(result.error || "Could not check the scene image status.");
    }
    await sleep(5000);
  }
  throw new Error("The image is still queued in the background. You can return to this page later to check it.");
}

function queueStoryboardSceneImage(sceneId) {
  if (!sceneId || sceneImageGenerationQueue.includes(sceneId)) return;
  const project = ensureSceneList(readStoryboardProject());
  const scene = (project.scenes || []).find((item) => item.id === sceneId);
  if (!scene || scene.status === "generating" || scene.status === "image_queued") return;
  const imageMode = storyImageMode();
  if (imageMode === "mock") {
    const sceneIndex = (project.scenes || []).findIndex((item) => item.id === sceneId);
    scene.generatedImageUrl = createMockSceneImage(scene, sceneIndex);
    scene.imageMode = "mock";
    scene.imageWasCached = false;
    scene.status = "complete";
    scene.completed = true;
    scene.imageProgress = 100;
    scene.imageError = "";
    scene.imageRequestId = "";
    scene.imageJobId = "";
    writeStoryboardProject(project);
    rerenderStoryboard(project);
    return;
  }
  if (scene.requestedImageMode !== imageMode) {
    scene.imageRequestId = "";
    scene.imageJobId = "";
  }
  scene.requestedImageMode = imageMode;
  scene.status = "image_queued";
  scene.imageQueuedAt = new Date().toISOString();
  scene.imageRetryCount = 0;
  scene.imageNextRetryAt = "";
  scene.imageRequestId = crypto.randomUUID();
  scene.imageError = "";
  writeStoryboardProject(project);
  rerenderStoryboard(project);
  sceneImageGenerationQueue.push(sceneId);
  processSceneImageQueue();
}

async function processSceneImageQueue() {
  if (sceneImageQueueActive) return;
  const sceneId = sceneImageGenerationQueue.shift();
  if (!sceneId) return;
  sceneImageQueueActive = true;
  try {
    await generateStoryboardSceneImage(readStoryboardProject(), sceneId);
  } finally {
    sceneImageQueueActive = false;
    if (sceneImageGenerationQueue.length) await sleep(120);
    processSceneImageQueue();
  }
}

function resumeQueuedSceneImages(project) {
  [...(project.scenes || [])]
    .filter((scene) => ["image_queued", "generating"].includes(scene.status) && !scene.generatedImageUrl && scene.imageRequestId)
    .sort((a, b) => {
      const aQueuedAt = Date.parse(a.imageQueuedAt || a.imageGenerationStartedAt || "");
      const bQueuedAt = Date.parse(b.imageQueuedAt || b.imageGenerationStartedAt || "");
      if (Number.isFinite(aQueuedAt) && Number.isFinite(bQueuedAt) && aQueuedAt !== bQueuedAt) return aQueuedAt - bQueuedAt;
      if (Number.isFinite(aQueuedAt) !== Number.isFinite(bQueuedAt)) return Number.isFinite(aQueuedAt) ? -1 : 1;
      return Number(a.order || 0) - Number(b.order || 0);
    })
    .forEach((scene) => {
      if (!sceneImageGenerationQueue.includes(scene.id)) {
        sceneImageGenerationQueue.push(scene.id);
      }
    });
  processSceneImageQueue();
}

async function recoverExistingSceneImageJobs(project) {
  const candidates = (project.scenes || []).filter((scene) => (
    ["image_error", "image_queued", "generating"].includes(scene.status)
    && !scene.generatedImageUrl
    && (scene.imageJobId || scene.imageRequestId)
  ));
  if (!candidates.length) return project;

  const recoveredProject = ensureSceneList(readStoryboardProject());
  let changed = false;
  await Promise.all(candidates.map(async (candidate) => {
    try {
      const response = await fetch(
        candidate.imageJobId
          ? `/api/generation-job?id=${encodeURIComponent(candidate.imageJobId)}`
          : `/api/generation-job?tool=story_scene_images&idempotencyKey=${encodeURIComponent(candidate.imageRequestId)}`,
        { cache: "no-store" },
      );
      const result = await response.json().catch(() => ({}));
      const scene = (recoveredProject.scenes || []).find((item) => item.id === candidate.id);
      if (!scene || !response.ok) return;

      if (result.status === "completed" && (result.webImageUrl || result.webImageDataUrl)) {
        scene.generatedImageUrl = result.webImageUrl
          || await compressImageDataUrl(result.webImageDataUrl, 720, 480, 0.74);
        scene.status = "complete";
        scene.completed = true;
        scene.imageProgress = 100;
        scene.imageGenerationStartedAt = "";
        scene.imageQueuedAt = "";
        scene.imageError = "";
        scene.imageRequestId = "";
        scene.imageJobId = "";
        changed = true;
      } else if (result.status === "queued") {
        scene.status = "image_queued";
        scene.imageJobId = result.jobId || scene.imageJobId;
        scene.imageError = "";
        changed = true;
      } else if (result.status === "processing") {
        scene.status = "generating";
        scene.imageJobId = result.jobId || scene.imageJobId;
        scene.imageGenerationStartedAt = scene.imageGenerationStartedAt || new Date().toISOString();
        scene.imageProgress = Math.max(8, Number(scene.imageProgress || 0));
        scene.imageError = "";
        changed = true;
      } else if (result.status === "failed") {
        scene.status = "image_error";
        scene.imageProgress = 0;
        scene.imageGenerationStartedAt = "";
        scene.imageQueuedAt = "";
        scene.imageError = result.error || "Image generation stopped. Press Try Again when you are ready.";
        scene.imageJobId = "";
        changed = true;
      }
    } catch (error) {
      console.warn("Could not recover existing scene image job", error);
    }
  }));

  if (changed) {
    writeStoryboardProject(recoveredProject);
    rerenderStoryboard(recoveredProject);
  }
  return recoveredProject;
}

function startSceneImageStatusMonitor() {
  if (sceneImageStatusMonitor) return;
  const check = async () => {
    const project = ensureSceneList(readStoryboardProject());
    const hasActiveJobs = (project.scenes || []).some((scene) => (
      ["image_queued", "generating"].includes(scene.status)
      && !scene.generatedImageUrl
      && (scene.imageJobId || scene.imageRequestId)
    ));
    if (!hasActiveJobs) {
      window.clearInterval(sceneImageStatusMonitor);
      sceneImageStatusMonitor = 0;
      return;
    }
    await recoverExistingSceneImageJobs(project);
  };
  sceneImageStatusMonitor = window.setInterval(check, 6000);
}

function quickPopulateStory(project) {
  const character = activeCharacter(project);
  const world = activeWorld(project);
  project.storySettings = storySettings(project);
  const targetCount = Math.max(5, (project.scenes || []).length || FALLBACK_STORY_SCENES);
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
      planInternal: beat.planInternal || {},
      imagePromptInternal: "",
      mood: existing.mood || beat.mood,
      camera: existing.camera || beat.camera,
      selectedCharacterIds: character.id ? [character.id] : [],
      selectedWorldId: world.id || "",
      selectedObjectIds: existing.selectedObjectIds || activeObjects(project).map((item) => item.id).filter(Boolean),
      status: existing.status === "complete" ? "complete" : "draft",
    };
  });
  project.scenes.forEach((scene, index) => {
    refreshSceneVisualPrompts(project, scene, index);
  });
  project.storyArc = plan.map(({ arcRole, title }) => ({ arcRole, title }));
  project.moral = themeLesson(project.storySettings.lessonTheme, character);
  return project;
}

function renderStoryDirectionControls(project) {
  const settings = storySettings(project);
  document.querySelectorAll("[data-story-choice]").forEach((button) => {
    const key = button.dataset.storyChoice;
    const value = button.dataset.storyValue;
    const active = settings[key] === value;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function bindStoryDirectionControls(project) {
  document.querySelectorAll("[data-story-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.storyChoice;
      const value = button.dataset.storyValue;
      if (!key || !value) return;
      project.storySettings = {
        ...storySettings(project),
        [key]: value,
      };
      writeStoryboardProject(project);
      renderStoryDirectionControls(project);
    });
  });
}

function openClearScenesModal() {
  const modal = document.querySelector("#clearScenesModal");
  if (!modal) return;
  modal.hidden = false;
  document.querySelector("#cancelClearScenesButton")?.focus();
}

function closeClearScenesModal() {
  const modal = document.querySelector("#clearScenesModal");
  if (modal) modal.hidden = true;
}

function storyboardMovieScenes(project) {
  return [...(project.scenes || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .filter((scene) => scene.generatedVideoUrl);
}

function movieNarrationScript(project, scenes = storyboardMovieScenes(project)) {
  const seed = storySeed(project);
  const settings = storySettings(project);
  const details = storyWorldDetails(seed);
  const storyText = scenes.map((scene) => cleanStoryText(scene.storyExcerpt || scene.prompt)).filter(Boolean).join(" ");
  const world = cleanStoryText(seed.place, "a world full of secrets");
  const hero = cleanStoryText(seed.hero, "one brave hero");
  const want = storyWant(seed, details);
  const need = storyEmotionalNeed(seed);
  const pressure = storyPressure(seed, details);
  const ending = endingInstruction(settings.endingType);
  const hook = trailerHookForStory(settings.storyType, hero, world, storyText);
  const trailerLines = [
    `In ${world}... ${hook}.`,
    `${hero} wants ${want}.`,
    `But this adventure demands something greater... ${need}.`,
    `As danger closes in, every choice reveals a secret.`,
    `Every ally could change the ending.`,
    `And the truth is harder than anyone expected.`,
    `${sentenceStart(pressure)}.`,
    `Now ${hero} must make the choice that decides what this world becomes.`,
    `A ${storyTypeLabel(settings.storyType)} where the final moment ${ending}.`,
    "This is their realm. This is their choice.",
  ];
  return trailerLines
    .map((line) => cleanTrailerLine(line))
    .filter(Boolean)
    .join(" ")
    .replace(/\bChapter\s+\d+[:.]?/gi, "")
    .replace(/\bIntro[:.]?/gi, "")
    .replace(/\bEnding[:.]?/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 1200);
}

function trailerHookForStory(type, hero, world, storyText) {
  const text = String(storyText || "").toLowerCase();
  if (type === "mystery") return `a hidden truth is waking, and ${hero} is the only one following the clues`;
  if (type === "creature-rescue") return `a misunderstood creature is running out of time, and ${hero} must decide who is worth protecting`;
  if (type === "funny-adventure") return `one wild mistake begins a chain of chaos that only ${hero} can turn into a victory`;
  if (type === "hero-origin") return `${hero} is about to discover that heroes are made by the choices they are afraid to make`;
  if (/robot|drone|machine|signal|future|tech/.test(text)) return `a signal from the future is calling ${hero} toward a choice no one else can make`;
  if (/magic|portal|crystal|spell|dragon/.test(text)) return `old magic is stirring, and ${hero} is about to learn why it chose them`;
  return `something impossible is beginning, and ${hero} is pulled into an adventure that could change everything`;
}

function cleanTrailerLine(value) {
  return cleanStoryText(value)
    .replace(/\bscene\s+\d+\b/gi, "")
    .replace(/\bprompt\b/gi, "story")
    .replace(/\s+/g, " ")
    .trim();
}

function movieSceneSubtitle(scene) {
  const text = cleanStoryText(scene.storyExcerpt || scene.prompt || scene.title, "The story continues.");
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return firstSentence.slice(0, 180);
}

function renderStoryboardMoviePanel(project) {
  const status = document.querySelector("#storyMovieStatus");
  const createButton = document.querySelector("#createStoryboardMovieButton");
  const previewButton = document.querySelector("#previewStoryboardMovieButton");
  const exportButton = document.querySelector("#exportStoryboardMovieButton");
  const clearButton = document.querySelector("#clearStoryboardMovieButton");
  const stage = document.querySelector("#storyMovieStage");
  const scenes = storyboardMovieScenes(project);
  const totalScenes = (project.scenes || []).length;
  const readyText = scenes.length
    ? `${scenes.length} of ${totalScenes} scene videos ready to stitch.`
    : "Create at least one scene video before making a movie.";
  if (status && !status.dataset.busy) status.textContent = readyText;
  [createButton, previewButton, exportButton].forEach((button) => {
    if (button) button.disabled = scenes.length === 0;
  });
  if (clearButton) clearButton.disabled = !project.moviePreviewSavedAt;
  if (stage) stage.classList.toggle("has-frame", Boolean(project.moviePreviewSavedAt));
}

function renderStoryOutputChooser(project) {
  const chooser = document.querySelector("#storyOutputChooser");
  const storyBookButton = document.querySelector("#createAiStoryBookButton");
  const movieButton = document.querySelector("#openMovieMakerButton");
  const movieText = document.querySelector("#movieReadinessText");
  const movieExport = document.querySelector("#storyMovieExport");
  const scenes = project.scenes || [];
  const allImagesReady = scenes.length >= MIN_STORY_SCENES && scenes.every((scene) => Boolean(scene.generatedImageUrl));
  const completedVideos = scenes.filter((scene) => Boolean(scene.generatedVideoUrl)).length;
  const allVideosReady = allImagesReady && completedVideos === scenes.length;
  if (chooser) chooser.hidden = !allImagesReady;
  if (storyBookButton) storyBookButton.disabled = !allImagesReady;
  if (movieButton) movieButton.disabled = !allVideosReady;
  if (movieText) {
    movieText.textContent = allVideosReady
      ? "All scene videos are ready. Open Movie Maker."
      : `${completedVideos} of ${scenes.length} scene videos ready. Generate every video to unlock Movie Maker.`;
  }
  if (movieExport && !allVideosReady) movieExport.hidden = true;
}

function launchAiStoryBook(project) {
  const scenes = project.scenes || [];
  if (scenes.length < MIN_STORY_SCENES || scenes.some((scene) => !scene.generatedImageUrl)) return;
  const storyIdentity = storybookIdentity(project);
  project.storybookId = `storybook-${project.id || "local"}-${storyIdentity}`;
  project.storybookIdentity = storyIdentity;
  project.storybookAudioStatus = project.storybookAudioStatus || "pending";
  writeStoryboardProject(project);
  localStorage.setItem("oprealm_ai_storybook_source", JSON.stringify({
    projectId: project.id || "",
    storybookId: project.storybookId,
    storybookIdentity: storyIdentity,
    createdAt: new Date().toISOString(),
  }));
  window.OPREALMRefreshCreatorSteps?.();
  window.location.href = "/ai-storybook.html";
}

function storybookIdentity(project) {
  const source = JSON.stringify({
    projectId: project.id || "",
    title: project.storyDraft?.title || project.title || "",
    characters: (project.characters || []).map((character) => ({
      id: character.id || "",
      name: character.name || "",
      type: character.characterType || character.type || "",
    })),
    scenes: (project.scenes || []).map((scene) => ({
      id: scene.id || "",
      title: scene.title || "",
      text: scene.storyExcerpt || scene.passage || scene.prompt || "",
    })),
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function bindStoryboardMovieControls(project) {
  document.querySelector("#createAiStoryBookButton")?.addEventListener("click", () => {
    launchAiStoryBook(readStoryboardProject());
  });
  document.querySelector("#openMovieMakerButton")?.addEventListener("click", () => {
    const latestProject = readStoryboardProject();
    const scenes = latestProject.scenes || [];
    if (!scenes.length || scenes.some((scene) => !scene.generatedVideoUrl)) return;
    const movieExport = document.querySelector("#storyMovieExport");
    if (movieExport) {
      movieExport.hidden = false;
      movieExport.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.querySelector("#createStoryboardMovieButton")?.addEventListener("click", () => {
    const latestProject = readStoryboardProject();
    renderStoryboardMovie(latestProject, { record: false, speak: false });
  });
  document.querySelector("#previewStoryboardMovieButton")?.addEventListener("click", () => {
    const latestProject = readStoryboardProject();
    renderStoryboardMovie(latestProject, { record: false, speak: true });
  });
  document.querySelector("#exportStoryboardMovieButton")?.addEventListener("click", () => {
    const latestProject = readStoryboardProject();
    renderStoryboardMovie(latestProject, { record: true, speak: false });
  });
  document.querySelector("#stopStoryboardMovieButton")?.addEventListener("click", () => {
    stopActiveMoviePlayback("Trailer stopped.");
  });
  document.querySelector("#clearStoryboardMovieButton")?.addEventListener("click", async () => {
    const latestProject = readStoryboardProject();
    stopActiveMoviePlayback("");
    await clearSavedStoryboardMovie(latestProject);
    writeStoryboardProject(latestProject);
    resetMovieCanvas();
    renderStoryboardMoviePanel(latestProject);
  });
}

function setMovieStatus(message, busy = false) {
  const status = document.querySelector("#storyMovieStatus");
  if (!status) return;
  status.textContent = message;
  if (busy) status.dataset.busy = "1";
  else delete status.dataset.busy;
}

function drawMoviePoster(project, scene) {
  const canvas = document.querySelector("#storyMovieCanvas");
  if (!canvas || canvas.dataset.rendering === "1") return;
  const context = canvas.getContext("2d");
  const image = new Image();
  image.onload = () => {
    drawCoverImage(context, image, canvas.width, canvas.height);
    drawMovieSubtitle(context, canvas, movieSceneSubtitle(scene), cleanStoryText(project.title, "OPREALM Movie"));
  };
  image.src = scene.generatedImageUrl || "";
}

async function restoreSavedStoryboardMovie(project) {
  const preview = await loadStoredMoviePreview(project.id || "storyboard-local-project");
  if (!preview?.blob) return;
  const downloadLink = document.querySelector("#downloadStoryboardMovieLink");
  const stage = document.querySelector("#storyMovieStage");
  const player = document.querySelector("#storyMoviePlayer");
  const url = URL.createObjectURL(preview.blob);
  if (downloadLink) {
    downloadLink.href = url;
    downloadLink.hidden = false;
  }
  if (player) {
    player.src = url;
    player.hidden = false;
  }
  if (stage) stage.classList.add("has-frame");
  drawStoredMovieFrame(preview.blob);
  project.moviePreviewSavedAt = preview.savedAt || project.moviePreviewSavedAt || new Date().toISOString();
  writeStoryboardProject(project);
  setMovieStatus("Saved movie preview restored.");
  renderStoryboardMoviePanel(project);
}

async function saveStoryboardMoviePreview(project, blob) {
  const savedAt = new Date().toISOString();
  await storeMoviePreview(project.id || "storyboard-local-project", blob, savedAt);
  project.moviePreviewSavedAt = savedAt;
  writeStoryboardProject(project);
}

async function clearSavedStoryboardMovie(project) {
  await deleteStoredMoviePreview(project.id || "storyboard-local-project");
  project.moviePreviewSavedAt = "";
  const downloadLink = document.querySelector("#downloadStoryboardMovieLink");
  const player = document.querySelector("#storyMoviePlayer");
  if (downloadLink) {
    if (downloadLink.href?.startsWith("blob:")) URL.revokeObjectURL(downloadLink.href);
    downloadLink.href = "#";
    downloadLink.hidden = true;
  }
  if (player) {
    if (player.src?.startsWith("blob:")) URL.revokeObjectURL(player.src);
    player.pause();
    player.removeAttribute("src");
    player.hidden = true;
    player.load();
  }
  setMovieStatus("Movie preview cleared.");
}

function resetMovieCanvas() {
  const canvas = document.querySelector("#storyMovieCanvas");
  const stage = document.querySelector("#storyMovieStage");
  const player = document.querySelector("#storyMoviePlayer");
  if (!canvas) return;
  if (player) player.hidden = true;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (stage) stage.classList.remove("has-frame");
}

function drawStoredMovieFrame(blob) {
  const canvas = document.querySelector("#storyMovieCanvas");
  if (!canvas || !blob) return;
  const context = canvas.getContext("2d");
  const video = document.createElement("video");
  const url = URL.createObjectURL(blob);
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.onloadeddata = () => {
    drawCoverImage(context, video, canvas.width, canvas.height);
    drawMovieSubtitle(context, canvas, "Saved movie preview ready.", "OPREALM Movie");
    URL.revokeObjectURL(url);
  };
  video.onerror = () => URL.revokeObjectURL(url);
  video.src = url;
}

async function renderStoryboardMovie(project, { record = false, speak = false } = {}) {
  stopActiveMoviePlayback("");
  const canvas = document.querySelector("#storyMovieCanvas");
  const stage = document.querySelector("#storyMovieStage");
  const downloadLink = document.querySelector("#downloadStoryboardMovieLink");
  const player = document.querySelector("#storyMoviePlayer");
  if (!canvas) return;
  const scenes = storyboardMovieScenes(project);
  if (!scenes.length) {
    setMovieStatus("Create at least one scene video before making a movie.");
    return;
  }
  if (!window.MediaRecorder && record) {
    setMovieStatus("This browser cannot export movies yet. Try Chrome or Edge.");
    return;
  }

  if (downloadLink) downloadLink.hidden = true;
  if (player) {
    player.pause();
    player.hidden = true;
  }
  if (stage) stage.classList.add("has-frame");
  canvas.dataset.rendering = "1";
  const context = canvas.getContext("2d");
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();
  activeMoviePlayback = {
    cancelled: false,
    audioContext,
    audioSources: [],
    videos: [],
    recorder: null,
  };
  const destination = audioContext.createMediaStreamDestination();
  const totalSeconds = scenes.reduce((sum, scene) => sum + movieSceneSeconds(scene), 0);
  const narrationScript = movieNarrationScript(project, scenes);
  const voice = document.querySelector("#movieVoiceSelect")?.value || "young-adventurer";
  const music = document.querySelector("#movieMusicSelect")?.value || "adventure";
  let recorder = null;
  let recordedChunks = [];

  try {
    setMovieStatus(record ? "Preparing narration, music and movie recorder..." : "Preparing movie preview...", true);
    if (record) {
      const stream = canvas.captureStream(30);
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      recorder = new MediaRecorder(stream, { mimeType });
      activeMoviePlayback.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordedChunks.push(event.data);
      };
    }

    const narrationBuffer = await fetchMovieAudioBuffer(audioContext, {
      type: "narration",
      text: narrationScript,
      voice,
    }).catch((error) => {
      setMovieStatus(`Movie will render without generated narration: ${error.message}`, true);
      return null;
    });
    const musicBuffer = await fetchMovieAudioBuffer(audioContext, {
      type: "music",
      text: narrationScript,
      mood: music,
      seconds: Math.min(60, Math.max(12, Math.round(totalSeconds))),
    }).catch(() => null);

    const audioStart = audioContext.currentTime + 0.25;
    if (musicBuffer) {
      trackMovieSource(scheduleAudioBuffer(audioContext, musicBuffer, destination, audioStart, 0.16, true, totalSeconds + 1));
      trackMovieSource(scheduleAudioBuffer(audioContext, musicBuffer, audioContext.destination, audioStart, record ? 0 : 0.08, true, totalSeconds + 1));
    } else {
      scheduleSyntheticMovieMusic(audioContext, destination, audioStart, totalSeconds + 1, music, record ? 0.12 : 0.06).forEach(trackMovieSource);
      scheduleSyntheticMovieMusic(audioContext, audioContext.destination, audioStart, totalSeconds + 1, music, record ? 0 : 0.05).forEach(trackMovieSource);
    }
    if (narrationBuffer) {
      trackMovieSource(scheduleAudioBuffer(audioContext, narrationBuffer, destination, audioStart + 0.3, 0.9, false));
      trackMovieSource(scheduleAudioBuffer(audioContext, narrationBuffer, audioContext.destination, audioStart + 0.3, record ? 0 : 0.8, false));
    } else if (speak) {
      speakMovieNarration(narrationScript);
    }

    if (recorder) recorder.start(800);
    for (let index = 0; index < scenes.length; index += 1) {
      if (activeMoviePlayback?.cancelled) throw new Error("Trailer stopped.");
      setMovieStatus(`${record ? "Exporting" : "Previewing"} scene ${index + 1} of ${scenes.length}...`, true);
      await renderMovieScene(canvas, context, scenes[index], index, scenes.length);
    }
    if (recorder) {
      await stopMovieRecorder(recorder);
      const blob = new Blob(recordedChunks, { type: recorder.mimeType || "video/webm" });
      await saveStoryboardMoviePreview(project, blob);
      const url = URL.createObjectURL(blob);
      if (downloadLink) {
        downloadLink.href = url;
        downloadLink.hidden = false;
      }
      if (player) {
        player.src = url;
        player.hidden = false;
        player.load();
      }
      renderStoryboardMoviePanel(project);
      setMovieStatus("Movie exported. Download it from the button below.");
    } else {
      setMovieStatus("Movie preview complete.");
    }
  } catch (error) {
    if (error.message !== "Trailer stopped.") setMovieStatus(error.message || "Movie stitching failed.");
  } finally {
    delete canvas.dataset.rendering;
    if (activeMoviePlayback?.audioContext === audioContext) activeMoviePlayback = null;
    window.setTimeout(() => audioContext.close().catch(() => {}), 800);
  }
}

function movieSceneSeconds(scene) {
  return Math.min(12, Math.max(4, Number(scene.videoDuration || 8)));
}

function trackMovieSource(source) {
  if (source && activeMoviePlayback) activeMoviePlayback.audioSources.push(source);
  return source;
}

function stopActiveMoviePlayback(message = "Trailer stopped.") {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const player = document.querySelector("#storyMoviePlayer");
  if (player) player.pause();
  if (!activeMoviePlayback) {
    if (message) setMovieStatus(message);
    return;
  }
  activeMoviePlayback.cancelled = true;
  activeMoviePlayback.videos.forEach((video) => {
    try { video.pause(); } catch {}
  });
  activeMoviePlayback.audioSources.forEach((source) => {
    try { source.stop(0); } catch {}
  });
  try {
    if (activeMoviePlayback.recorder?.state === "recording") activeMoviePlayback.recorder.stop();
  } catch {}
  activeMoviePlayback.audioContext?.close?.().catch(() => {});
  if (message) setMovieStatus(message);
}

async function renderMovieScene(canvas, context, scene, index, total) {
  const video = document.createElement("video");
  video.src = scene.generatedVideoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  if (activeMoviePlayback) activeMoviePlayback.videos.push(video);
  await waitForVideoReady(video);
  const duration = movieSceneSeconds(scene);
  video.currentTime = 0;
  await video.play();
  const start = performance.now();
  while ((performance.now() - start) / 1000 < duration) {
    if (activeMoviePlayback?.cancelled) {
      video.pause();
      throw new Error("Trailer stopped.");
    }
    if (video.ended && video.duration > 0.5) video.currentTime = Math.max(0, video.duration - 0.2);
    drawCoverImage(context, video, canvas.width, canvas.height);
    drawMovieSubtitle(context, canvas, movieSceneSubtitle(scene), `${index + 1}/${total} ${cleanStoryText(scene.title, `Scene ${index + 1}`)}`);
    await nextFrame();
  }
  video.pause();
}

function waitForVideoReady(video) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("A scene video took too long to load.")), 30000);
    video.onloadeddata = () => {
      window.clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("One scene video could not be loaded for stitching."));
    };
    video.load();
  });
}

function drawCoverImage(context, source, width, height) {
  context.fillStyle = "#020716";
  context.fillRect(0, 0, width, height);
  const sourceWidth = source.videoWidth || source.naturalWidth || width;
  const sourceHeight = source.videoHeight || source.naturalHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let drawX = 0;
  let drawY = 0;
  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * sourceRatio;
    drawX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / sourceRatio;
    drawY = (height - drawHeight) / 2;
  }
  context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function drawMovieSubtitle(context, canvas, subtitle, label) {
  const width = canvas.width;
  const height = canvas.height;
  const wrapped = wrapCanvasText(context, subtitle, width - 160, 34);
  const boxHeight = 92 + wrapped.length * 34;
  const boxY = height - boxHeight - 36;
  context.save();
  context.fillStyle = "rgba(3, 7, 20, 0.72)";
  context.strokeStyle = "rgba(143, 240, 255, 0.28)";
  context.lineWidth = 2;
  roundRect(context, 60, boxY, width - 120, boxHeight, 22);
  context.fill();
  context.stroke();
  context.fillStyle = "#8ff0ff";
  context.font = "800 24px Arial, sans-serif";
  context.fillText(label, 92, boxY + 38);
  context.fillStyle = "#ffffff";
  context.font = "900 32px Arial, sans-serif";
  wrapped.forEach((line, index) => context.fillText(line, 92, boxY + 82 + index * 36));
  context.restore();
}

function wrapCanvasText(context, text, maxWidth, maxLines = 3) {
  const words = cleanStoryText(text).split(" ");
  const lines = [];
  let line = "";
  context.font = "900 32px Arial, sans-serif";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

async function fetchMovieAudioBuffer(audioContext, payload) {
  const response = await fetch("/api/story-movie-audio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Movie audio failed (${response.status}).`);
  }
  return audioContext.decodeAudioData(await response.arrayBuffer());
}

function scheduleAudioBuffer(audioContext, buffer, destination, startTime, volume, loop = false, duration = 0) {
  if (!volume) return null;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = loop;
  gain.gain.setValueAtTime(volume, startTime);
  source.connect(gain);
  gain.connect(destination);
  source.start(startTime);
  if (duration) source.stop(startTime + duration);
  return source;
}

function scheduleSyntheticMovieMusic(audioContext, destination, startTime, seconds, mood, volume) {
  if (!volume) return [];
  const palettes = {
    adventure: [196, 247, 294, 392],
    mystery: [147, 196, 220, 294],
    wonder: [220, 277, 330, 440],
    funny: [247, 330, 392, 494],
  };
  const notes = palettes[mood] || palettes.adventure;
  return notes.map((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index % 2 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0, startTime);
    for (let beat = 0; beat < seconds; beat += 1.6) {
      gain.gain.linearRampToValueAtTime(volume / notes.length, startTime + beat + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.002, startTime + beat + 1.3 + index * 0.08);
    }
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + seconds);
    return oscillator;
  });
}

function speakMovieNarration(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 1800));
  utterance.rate = 0.92;
  utterance.pitch = 1.06;
  window.speechSynthesis.speak(utterance);
}

function stopMovieRecorder(recorder) {
  return new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function openMoviePreviewDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This browser cannot save movie previews locally."));
      return;
    }
    const request = indexedDB.open(STORYBOARD_MOVIE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORYBOARD_MOVIE_STORE, { keyPath: "projectId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open movie preview storage."));
  });
}

async function storeMoviePreview(projectId, blob, savedAt) {
  const db = await openMoviePreviewDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORYBOARD_MOVIE_STORE, "readwrite");
    transaction.objectStore(STORYBOARD_MOVIE_STORE).put({ projectId, blob, savedAt });
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Could not save movie preview."));
    };
  });
}

async function loadStoredMoviePreview(projectId) {
  try {
    const db = await openMoviePreviewDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORYBOARD_MOVIE_STORE, "readonly");
      const request = transaction.objectStore(STORYBOARD_MOVIE_STORE).get(projectId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not load saved movie preview."));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  } catch {
    return null;
  }
}

async function deleteStoredMoviePreview(projectId) {
  try {
    const db = await openMoviePreviewDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORYBOARD_MOVIE_STORE, "readwrite");
      transaction.objectStore(STORYBOARD_MOVIE_STORE).delete(projectId);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Could not clear movie preview."));
      };
    });
  } catch {
    // Clearing should not block the rest of the UI.
  }
}

function rerenderStoryboard(project) {
  sanitizeStoryboardProject(project);
  syncStoryboardTitle(project);
  renderStoryDirectionControls(project);
  renderStoryApproval(project);
  renderStoryboardCharacters(project);
  renderStoryboardWorlds(project);
  renderStoryboardObjects(project);
  renderStoryboardScenes(project);
  renderStoryOutputChooser(project);
  renderStoryboardMoviePanel(project);
  bindStoryboardSceneControls(project);
}

function storyboardTitle(project) {
  return cleanStoryText(project.storyDraft?.title || project.title, "My OPREALM Story").slice(0, 100);
}

function syncStoryboardTitle(project) {
  const input = document.querySelector("#storyboardProjectTitle");
  if (!input || document.activeElement === input) return;
  input.value = storyboardTitle(project);
}

function bindStoryboardTitle(project) {
  const input = document.querySelector("#storyboardProjectTitle");
  if (!input) return;
  input.value = storyboardTitle(project);
  input.addEventListener("input", () => {
    const title = input.value.slice(0, 100);
    project.title = title;
    if (project.storyDraft) project.storyDraft.title = title;
    writeStoryboardProject(project);
  });
  input.addEventListener("blur", () => {
    const title = cleanStoryText(input.value, "My OPREALM Story").slice(0, 100);
    input.value = title;
    project.title = title;
    if (project.storyDraft) project.storyDraft.title = title;
    writeStoryboardProject(project);
  });
}

function bindStoryboardSceneControls(project) {
  let draggedSceneId = "";
  const imageModeSelect = document.querySelector("#storyImageMode");
  const imageModeDescription = document.querySelector("#artworkModeDescription");
  if (imageModeSelect) {
    imageModeSelect.value = storyImageMode();
    const updateDescription = () => {
      const descriptions = {
        mock: "Creates an instant local placeholder. No API request, provider charge or Creator credits.",
        draft: "Uses GPT Image 1 Mini at low quality with character references. Estimated provider cost: $0.006 per image.",
        final: "Uses GPT Image 1.5 at high quality. Estimated provider cost: $0.20 per image and confirmation is required.",
      };
      if (imageModeDescription) imageModeDescription.textContent = descriptions[storyImageMode()];
    };
    updateDescription();
    if (!imageModeSelect.dataset.modeBound) {
      imageModeSelect.dataset.modeBound = "true";
      imageModeSelect.addEventListener("change", () => {
        setStoryImageMode(imageModeSelect.value);
        updateDescription();
        rerenderStoryboard(readStoryboardProject());
      });
    }
  }

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
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === scene.id);
      scene.visualPromptSummary = scene.prompt;
      scene.userVisualDirection = scene.prompt;
      scene.visualPromptFull = buildSceneImagePrompt(project, scene, sceneIndex);
      scene.visualPrompt = scene.visualPromptFull;
      scene.imagePromptInternal = scene.visualPromptFull;
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
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === scene.id);
      refreshSceneVisualPrompts(project, scene, sceneIndex, { preserveSummary: true });
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-scene-media-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const scene = (project.scenes || []).find((item) => item.id === button.dataset.sceneMediaMode);
      if (!scene || !scene.generatedImageUrl) return;
      scene.mediaMode = button.dataset.mediaMode === "video" ? "video" : "image";
      writeStoryboardProject(project);
      rerenderStoryboard(project);
    });
  });

  document.querySelectorAll("[data-expand-scene-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const scene = (project.scenes || []).find((item) => item.id === button.dataset.expandSceneImage);
      if (scene?.generatedImageUrl) openSceneImageLightbox(scene);
    });
  });

  document.querySelectorAll("[data-ai-assist-scene]").forEach((control) => {
    control.addEventListener("click", () => {
      if (control.tagName === "SELECT") return;
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === control.dataset.aiAssistScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene) return;
      scene.prompt = storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
      refreshSceneVisualPrompts(project, scene, sceneIndex);
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
      scene.mood = select.value;
      refreshSceneVisualPrompts(project, scene, sceneIndex);
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

  document.querySelectorAll("[data-toggle-scene-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      const scene = (project.scenes || []).find((item) => item.id === button.dataset.toggleSceneExpand);
      if (!scene) return;
      scene.editorExpanded = !scene.editorExpanded;
      writeStoryboardProject(project);
      rerenderStoryboard(project);
      const card = document.querySelector(`[data-scene-id="${CSS.escape(scene.id)}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (scene.editorExpanded) {
        window.setTimeout(() => card?.querySelector(".scene-prompt-input")?.focus(), 180);
      }
    });
  });

  document.querySelectorAll("[data-generate-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      const sceneIndex = (project.scenes || []).findIndex((item) => item.id === button.dataset.generateScene);
      const scene = project.scenes?.[sceneIndex];
      if (!scene) return;
      if (!scene.prompt) {
        scene.prompt = storyPromptForIndex(project, sceneIndex, project.scenes?.[sceneIndex - 1]?.prompt || "");
        refreshSceneVisualPrompts(project, scene, sceneIndex);
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
      if (storyImageMode() === "final" && !window.confirm(
        "Generate final-quality artwork?\n\nEstimated provider cost: about $0.20 per image\nCreator credits: 24\n\nUse Draft for prompt testing at about $0.006.",
      )) return;
      queueStoryboardSceneImage(button.dataset.generateSceneImage);
    });
  });

  document.querySelectorAll("[data-bring-scene-to-life]").forEach((button) => {
    button.addEventListener("click", () => {
      generateStoryboardSceneVideo(project, button.dataset.bringSceneToLife);
    });
  });
}

function openSceneImageLightbox(scene) {
  const lightbox = document.querySelector("#sceneImageLightbox");
  const image = document.querySelector("#sceneImageLightboxImage");
  const title = document.querySelector("#sceneImageLightboxTitle");
  if (!lightbox || !image || !scene?.generatedImageUrl) return;
  image.src = scene.generatedImageUrl;
  image.alt = `${scene.title || "Scene"} enlarged image`;
  if (title) title.textContent = scene.title || "Scene image";
  lightbox.hidden = false;
  document.body.classList.add("is-scene-image-expanded");
  document.querySelector("#minimizeSceneImageButton")?.focus();
}

function closeSceneImageLightbox() {
  const lightbox = document.querySelector("#sceneImageLightbox");
  const image = document.querySelector("#sceneImageLightboxImage");
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove("is-scene-image-expanded");
  if (image) {
    image.src = "";
    image.alt = "";
  }
}

async function hydrateStoryboardPage() {
  if (!document.querySelector(".storyboard-shell")) return;
  configureStoryPage();
  const project = writeStoryboardProject(await compactStoryboardImages(ensureSceneList(readStoryboardProject())));
  if (STORY_SCENES_PAGE && !project.storyDraft?.approved) {
    window.location.replace("/storyboard.html");
    return;
  }
  bindStoryboardTitle(project);
  rerenderStoryboard(project);
  const recoveredProject = await recoverExistingSceneImageJobs(project);
  resumeQueuedSceneImages(recoveredProject);
  startSceneImageStatusMonitor();
  resumeStoryboardVideoJobs(recoveredProject);
  bindStoryDirectionControls(project);
  bindStoryboardMovieControls(project);
  restoreSavedStoryboardMovie(project);
  document.querySelector("#minimizeSceneImageButton")?.addEventListener("click", closeSceneImageLightbox);
  document.querySelector("#sceneImageLightbox")?.addEventListener("click", (event) => {
    if (event.target.id === "sceneImageLightbox") closeSceneImageLightbox();
  });

  document.querySelector("#addWorldButton")?.addEventListener("click", () => {
    window.location.href = "/storyboard-world.html";
  });
  document.querySelector("#addObjectButton")?.addEventListener("click", () => {
    window.location.href = "/storyboard-character.html";
  });
  document.querySelector("#quickPopulateStoryButton")?.addEventListener("click", () => {
    requestFullStory(project, "write");
  });
  document.querySelector("#regenerateFullStoryButton")?.addEventListener("click", () => {
    requestFullStory(project, "write");
  });
  document.querySelector("#clearFullStoryButton")?.addEventListener("click", () => {
    clearFullStory(project);
  });
  document.querySelector("#fullStoryDraft")?.addEventListener("input", (event) => {
    resetStoryReaderAudio("Story changed. Press Read Story to Me to create a fresh narration.");
    project.storyDraft = {
      ...(project.storyDraft || {}),
      story: preserveStoryFormatting(event.target.value).slice(0, 16000),
      chapters: [],
      status: "ready",
      approved: false,
    };
    writeStoryboardProject(project);
    renderStoryApproval(project);
  });
  document.querySelector("#storyReaderVoice")?.addEventListener("change", () => {
    if (!storyReaderAudioUrl) return;
    resetStoryReaderAudio("Voice changed. Press Read Story to Me to create the new narration.");
    renderStoryReaderState(project);
  });
  document.querySelector("#readStoryButton")?.addEventListener("click", () => {
    generateStoryReaderAudio(project);
  });
  document.querySelector("#playStoryAudioButton")?.addEventListener("click", () => {
    const audio = document.querySelector("#storyReaderAudio");
    if (!audio?.src) return;
    audio.play().catch(() => {
      const status = document.querySelector("#storyReaderStatus");
      if (status) status.textContent = "Press Play again to start the story voice.";
    });
  });
  document.querySelector("#pauseStoryAudioButton")?.addEventListener("click", () => {
    document.querySelector("#storyReaderAudio")?.pause();
  });
  document.querySelector("#restartStoryAudioButton")?.addEventListener("click", () => {
    const audio = document.querySelector("#storyReaderAudio");
    if (!audio?.src) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    updateStoryReaderTime();
  });
  const storyReaderAudio = document.querySelector("#storyReaderAudio");
  storyReaderAudio?.addEventListener("timeupdate", updateStoryReaderTime);
  storyReaderAudio?.addEventListener("loadedmetadata", updateStoryReaderTime);
  storyReaderAudio?.addEventListener("ended", updateStoryReaderTime);
  document.querySelector("#approveFullStoryButton")?.addEventListener("click", () => {
    requestFullStory(project, "split");
  });
  document.querySelector("#retryStorySetupButton")?.addEventListener("click", () => {
    requestFullStory(project, "split");
  });
  document.querySelector("#backFromStorySetupButton")?.addEventListener("click", () => {
    setStorySetupLoading(false);
  });
  document.querySelector("#clearStoryboardButton")?.addEventListener("click", () => {
    openClearScenesModal();
  });
  document.querySelector("#cancelClearScenesButton")?.addEventListener("click", () => {
    closeClearScenesModal();
  });
  document.querySelector("#clearScenesModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "clearScenesModal") closeClearScenesModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeClearScenesModal();
      closeSceneImageLightbox();
    }
  });
  document.querySelector("#confirmClearScenesButton")?.addEventListener("click", () => {
    clearStoryboardScenes(project);
    writeStoryboardProject(project);
    rerenderStoryboard(project);
    closeClearScenesModal();
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
}

function configureStoryPage() {
  const selectors = STORY_SCENES_PAGE
    ? [".story-direction-panel", "#storyApprovalPanel", "#quickPopulateStoryButton"]
    : ["#storyScenesStepHead", "#scenes", "#clearStoryboardButton"];
  selectors.forEach((selector) => document.querySelector(selector)?.remove());
}

hydrateStoryboardPage();



