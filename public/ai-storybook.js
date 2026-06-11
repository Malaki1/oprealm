const STORYBOARD_KEY = "oprealm_storyboard_project_v1";
const PLAYER_STATE_KEY = "oprealm_story_adventure_state_v1";
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";
const narrationEngine = window.OPREALMStorybookNarration;

let project = DEMO_MODE
  ? demoProject()
  : readJsonStorage(STORYBOARD_KEY);
let pages = [];
let pageIndex = 0;
let beatIndex = 0;
let branchPage = null;
let branchProgressTimer = null;
let autoPlay = false;
let autoPlayTimer = null;
let narrationEnabled = false;
let narrationGenerating = false;
let narrationManifest = new Map();
let voiceProfiles = [];
let highlightedWordIndex = -1;
let preparedBranches = new Map();
let preparationRunning = false;

const game = document.querySelector("#storyGame");
const art = document.querySelector("#sceneArt");
const storyTitle = document.querySelector("#storyTitle");
const chapterSubtitle = document.querySelector("#chapterSubtitle");
const speakerPortrait = document.querySelector("#speakerPortrait");
const speakerName = document.querySelector("#speakerName");
const dialogueText = document.querySelector("#dialogueText");
const choiceCards = document.querySelector("#choiceCards");
const continueButton = document.querySelector("#continueButton");
const previousBeatButton = document.querySelector("#previousBeatButton");
const beatCounter = document.querySelector("#beatCounter");
const progressList = document.querySelector("#chapterProgressList");
const companionCards = document.querySelector("#companionCards");
const empty = document.querySelector("#bookEmpty");
const dialoguePanel = document.querySelector("#dialoguePanel");
const dialogueExpandButton = document.querySelector("#dialogueExpandButton");
const settingsPopover = document.querySelector("#settingsPopover");
const settingsButton = document.querySelector("#settingsButton");
const beatTransition = document.querySelector("#beatTransition");
const narrationAudio = document.querySelector("#narrationAudio");
const narrationStatus = document.querySelector("#narrationStatus");
const readStoryButton = document.querySelector("#readStoryButton");
const speakBeatButton = document.querySelector("#speakBeatButton");
const preparation = document.querySelector("#storybookPreparation");
const preparationRing = document.querySelector("#preparationRing");
const preparationPercent = document.querySelector("#preparationPercent");
const preparationTitle = document.querySelector("#preparationTitle");
const preparationDescription = document.querySelector("#preparationDescription");
const preparationActions = document.querySelector("#preparationActions");

initialize();

function readJsonStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function demoProject() {
  const passages = [
    "Kora follows a trail of silver bubbles into the oldest part of the drowned city. Between the pillars, a forgotten guardian waits beside a pearl filled with moving starlight.",
    "The pearl pulses with a memory older than the ocean itself. It shows a guardian who once protected the seas, but something stole its name and left only a warning behind.",
    "Bubbles circles the pedestal and hears a song hidden beneath the current. Kora realizes the melody is not a threat. It is a map asking to be completed.",
    "Three currents open through the ruins. One glows with kindness, one with caution, and one with the voices of the sharks who remember every tide.",
    "Kora reaches toward the pearl as the city trembles. The guardian lowers its spear, waiting to discover whether she has come to command the ocean or listen to it.",
    "The sharks gather in a shining ring. Their oldest leader offers one final clue: a true guardian protects memories by sharing them, not hiding them away.",
    "Kora speaks the forgotten name. Light races across the ruins, waking gardens, lantern fish and sleeping towers that have waited beneath the waves for a hundred years.",
    "The guardian smiles as the new memory settles into the sea. Kora and Bubbles return home carrying a promise that every lost story can still find its way back.",
  ];
  return {
    title: "Whispers of the Deep",
    activeCharacterId: "kora",
    storyDraft: {
      title: "Whispers of the Deep",
      summary: "A young ocean hero restores the memory of a forgotten guardian.",
      chapters: [{ title: "The Call" }, { title: "Into the Current" }, { title: "The Forgotten Guardian" }, { title: "The New Memory" }],
    },
    characters: [
      { id: "kora", name: "Kora", characterType: "Shark Girl", imageUrl: "/assets/character-creator/styles/anime.png" },
    ],
    objects: [
      { id: "bubbles", name: "Bubbles", kind: "pet", type: "Sea Pup", imageUrl: "/assets/homepage/mascot/orbit.png" },
    ],
    scenes: passages.map((storyExcerpt, index) => ({
      id: `demo-${index + 1}`,
      order: index + 1,
      title: ["The Call", "Into the Current", "Shadows Below", "The Forgotten Guardian", "A Choice of Tides", "Ripples of Change", "The New Memory", "Homeward Light"][index],
      storyExcerpt,
      prompt: storyExcerpt,
      script: index === 0 ? [
        { speaker: "Narrator", text: "Kora follows a trail of silver bubbles into the oldest part of the drowned city." },
        { speaker: "Kora", text: "The trail ends at that pearl. Stay close, Bubbles. I want to see who left it here." },
        { speaker: "Bubbles", text: "I hear someone inside the ruins. They are asking us not to touch the pedestal yet." },
        { speaker: "Kora", text: "Then we listen first. Show me where the voice is coming from." },
      ] : [],
      choices: index === 0
        ? ["Follow the voice through the archway", "Search the pedestal for a warning"]
        : [],
      generatedImageUrl: "/assets/character-creator/environments/underwater-realm.png",
    })),
  };
}

async function initialize() {
  const scenes = [...(project.scenes || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .filter((scene) => scene.generatedImageUrl);

  if (scenes.length < 1 || scenes.length !== (project.scenes || []).length) {
    game.hidden = true;
    empty.hidden = false;
    preparation.hidden = true;
    return;
  }

  voiceProfiles = narrationEngine.assignVoiceProfiles(storyCharacters(), accountAgeBand(), project.storyDirection?.story || project.storyDraft?.tone || "magical");
  pages = scenes.map((scene, index) => {
    const sceneId = scene.id || `scene-${index + 1}`;
    return {
      ...scene,
      id: sceneId,
      chapterLabel: chapterForScene(index, scenes.length),
      beats: buildNarrationBeats(scene, sceneId),
      decisions: decisionChoices(scene, index, scenes.length),
    };
  });

  restorePlayerState();
  renderPlayer();
  bindControls();
  if (DEMO_MODE) {
    preparation.hidden = true;
    return;
  }
  await prepareStorybook();
}

function chapterForScene(index, total) {
  const chapters = project.storyDraft?.chapters || [];
  if (!chapters.length) return `Chapter ${Math.min(7, Math.floor(index / Math.max(1, Math.ceil(total / 7))) + 1)}`;
  const chapterIndex = Math.min(chapters.length - 1, Math.floor(index / Math.max(1, total / chapters.length)));
  return `Chapter ${chapterIndex + 1}: ${chapters[chapterIndex].title || "The Adventure Continues"}`;
}

function splitIntoBeats(text) {
  const beats = narrationEngine.parseStorySceneIntoNarrationBeats(text, storyCharacters(), "scene");
  return narrationEngine.applyVoiceProfiles(beats, voiceProfiles);
}

function buildNarrationBeats(scene, sceneId) {
  const scripted = normalizeScriptBeats(scene.script, sceneId);
  if (scripted.length) return narrationEngine.applyVoiceProfiles(scripted, voiceProfiles);
  const parsed = narrationEngine.parseStorySceneIntoNarrationBeats(
    scene.storyExcerpt || scene.passage || scene.prompt || "",
    storyCharacters(),
    sceneId,
  );
  return narrationEngine.applyVoiceProfiles(parsed, voiceProfiles);
}

function decisionChoices(scene) {
  if (!Array.isArray(scene.choices)) return [];
  return scene.choices
    .map((choice) => typeof choice === "string" ? choice : choice?.label || choice?.title || "")
    .map((choice) => String(choice || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function renderPlayer({ sceneChanged = false } = {}) {
  const page = currentPage();
  if (!page) return;
  const beats = page.beats?.length ? page.beats : splitIntoBeats(page.storyExcerpt || page.passage || "");
  beatIndex = Math.min(beatIndex, beats.length - 1);

  if (sceneChanged) {
    game.classList.add("is-changing");
    window.setTimeout(() => game.classList.remove("is-changing"), 520);
  }
  art.src = page.generatedImageUrl || page.imageDataUrl || "";
  art.alt = page.title || "Story scene";
  storyTitle.textContent = project.storyDraft?.title || project.title || "OPRealm Story Adventure";
  chapterSubtitle.textContent = `${page.chapterLabel || "A New Path"} · ${page.title || `Scene ${pageIndex + 1}`}`;

  const beat = normalizeBeat(beats[beatIndex]);
  attachAudioToBeat(beat);
  const speaker = speakerForBeat(beat);
  speakerName.textContent = speaker.name;
  setPortrait(speakerPortrait, speaker.image || art.src);
  renderBeatText(beat);
  beatCounter.textContent = `Story beat ${beatIndex + 1} of ${beats.length}`;
  updateNarrationControls(beat);

  const atLastBeat = beatIndex >= beats.length - 1;
  renderChoices(atLastBeat ? page.decisions || [] : []);
  continueButton.hidden = atLastBeat && Boolean((page.decisions || []).length) && !branchPage;
  continueButton.innerHTML = pageIndex >= pages.length - 1 && atLastBeat
    ? "Story Complete"
    : `Continue <span aria-hidden="true">&#8250;</span>`;
  previousBeatButton.disabled = pageIndex === 0 && beatIndex === 0;

  renderChapterProgress();
  renderCompanions();
  renderChapterMap();
  savePlayerState();
  scheduleAutoPlay();
}

function renderBeatText(beat) {
  const words = String(beat.text || "").split(/(\s+)/);
  dialogueText.innerHTML = words.map((word, index) => {
    if (!word.trim()) return word;
    const wordIndex = words.slice(0, index + 1).filter((item) => item.trim()).length - 1;
    return `<span class="narration-word${wordIndex <= highlightedWordIndex ? " is-read" : ""}" data-word-index="${wordIndex}">${escapeHtml(word)}</span>`;
  }).join("");
}

function updateNarrationControls(beat) {
  const playing = !narrationAudio.paused && narrationAudio.src;
  speakBeatButton.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
  speakBeatButton.setAttribute("aria-label", playing ? "Pause narration" : "Play narration");
  const ready = Boolean(beat.audioUrl || narrationManifest.get(beat.id)?.audioUrl);
  if (!narrationGenerating) {
    narrationStatus.textContent = ready
      ? `${beat.speaker || "Narrator"} ready`
      : narrationEnabled ? "Narration ready to generate" : "Text-only mode";
  }
}

function playSceneTransition() {
  if (!beatTransition || game.classList.contains("motion-off")) return;
  beatTransition.classList.remove("is-active");
  void beatTransition.offsetWidth;
  beatTransition.classList.add("is-active");
}

function currentPage() {
  return branchPage || pages[pageIndex];
}

function renderChoices(decisions) {
  choiceCards.innerHTML = "";
  choiceCards.dataset.count = String(decisions.length);
  choiceCards.hidden = decisions.length === 0;
  decisions.forEach((choice) => {
    const label = String(choice || "").trim();
    if (!label) return;
    const button = document.createElement("button");
    button.className = "choice-card";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => createBranch(currentPage(), label));
    choiceCards.appendChild(button);
  });
}

function renderChapterProgress() {
  progressList.innerHTML = pages.map((page, index) => {
    const state = index < pageIndex ? "is-complete" : index === pageIndex ? "is-current" : "is-locked";
    const marker = index < pageIndex ? "&#10003;" : index === pageIndex ? "&#9679;" : "&#128274;";
    return `<li class="chapter-node ${state}">
      <button type="button" data-page-index="${index}" ${index > pageIndex ? "disabled" : ""}>
        <span class="node-number">${index + 1}</span>
        <span>${escapeHtml(shortTitle(page.title || `Scene ${index + 1}`))}</span>
        <span class="node-state" aria-hidden="true">${marker}</span>
      </button>
    </li>`;
  }).join("");
  progressList.querySelectorAll("[data-page-index]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const nextPageIndex = Number(button.dataset.pageIndex);
      const sceneChanged = nextPageIndex !== pageIndex || Boolean(branchPage);
      pageIndex = nextPageIndex;
      beatIndex = 0;
      branchPage = null;
      closeDrawers();
      if (sceneChanged) playSceneTransition();
      renderPlayer({ sceneChanged });
    });
  });
}

function renderCompanions() {
  const characters = project.characters || [];
  const main = activeCharacter();
  const companion = characters.find((item) => item.id !== main.id) || companionFromObjects();
  const models = [
    companionModel(main, 4, "Hopeful", 72),
    companion ? companionModel(companion, 3, "Excited", 56) : null,
  ].filter(Boolean);
  companionCards.innerHTML = models.map((model) => `
    <article class="companion-card">
      <img src="${escapeAttribute(model.image)}" alt="${escapeAttribute(model.name)}" />
      <div>
        <h3>${escapeHtml(model.name)}</h3>
        <p>${escapeHtml(model.type)}</p>
        <div class="companion-stats">
          <span>Mood: ${escapeHtml(model.mood)}</span><span>&#128578;</span>
          <span>&#10084; HP</span><span>${model.hp}/${model.hp}</span>
          <span>&#9733; Level ${model.level}</span><span></span>
          <div class="xp-track"><span style="width:${model.xp}%"></span></div>
        </div>
      </div>
    </article>
  `).join("");
}

function companionModel(item, level, mood, xp) {
  return {
    name: item.name || "Story Friend",
    type: item.characterType || item.type || item.kind || "Adventure Companion",
    image: item.imageUrl || item.imageDataUrl || item.recipe?.generation?.generatedImageUrl || art.src,
    mood,
    level,
    hp: 80 + level * 10,
    xp,
  };
}

function companionFromObjects() {
  return (project.objects || []).find((item) => item.kind === "pet") || null;
}

function renderChapterMap() {
  const grid = document.querySelector("#chapterMapGrid");
  grid.innerHTML = pages.map((page, index) => `<article class="map-card"><strong>${index + 1}. ${escapeHtml(page.title || `Scene ${index + 1}`)}</strong><span>${index < pageIndex ? "Completed" : index === pageIndex ? "Current scene" : "Locked until reached"}</span></article>`).join("");
}

function activeCharacter() {
  return (project.characters || []).find((item) => item.id === project.activeCharacterId)
    || project.characters?.[0]
    || { name: "Narrator", imageUrl: "" };
}

function setPortrait(image, src) {
  image.src = src || art.src || "";
  image.alt = activeCharacter().name || "Story character";
}

function advance() {
  stopNarration();
  const page = currentPage();
  const beats = page.beats?.length ? page.beats : splitIntoBeats(page.storyExcerpt || page.passage || "");
  if (beatIndex < beats.length - 1) {
    beatIndex += 1;
    renderPlayer();
    return;
  }
  if ((page.decisions || []).length && !branchPage) return;
  if (branchPage) {
    branchPage = null;
    pageIndex = Math.min(pages.length - 1, pageIndex + 1);
    beatIndex = 0;
    playSceneTransition();
    renderPlayer({ sceneChanged: true });
    return;
  }
  if (pageIndex < pages.length - 1) {
    pageIndex += 1;
    beatIndex = 0;
    playSceneTransition();
    renderPlayer({ sceneChanged: true });
  }
}

function goPrevious() {
  stopNarration();
  if (beatIndex > 0) {
    beatIndex -= 1;
  } else if (pageIndex > 0) {
    pageIndex -= 1;
    branchPage = null;
    beatIndex = Math.max(0, pages[pageIndex].beats.length - 1);
    playSceneTransition();
    renderPlayer({ sceneChanged: true });
    return;
  }
  renderPlayer();
}

async function createBranch(page, choice) {
  stopNarration();
  try {
    const key = branchKey(page, choice);
    let prepared = preparedBranches.get(key) || await readPreparedBranch(key);
    if (!prepared) {
      setBranchLoading(true);
      prepared = await generatePreparedBranch(page, choice, pageIndex);
      preparedBranches.set(key, prepared);
      await savePreparedBranch(key, prepared);
    }
    branchPage = prepared;
    beatIndex = 0;
    setBranchLoading(false);
    playSceneTransition();
    renderPlayer({ sceneChanged: true });
    if (autoPlay) scheduleAutoPlay();
  } catch (error) {
    setBranchLoading(false);
    dialogueText.textContent = error.message || "This story path could not be created.";
  }
}

async function generatePreparedBranch(page, choice, sourcePageIndex) {
  const response = await fetchPreparationRequest("/api/story-branch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(branchRequestBody(page, choice, sourcePageIndex)),
  }, "Waiting to continue building optional story paths");
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.outcome?.imageDataUrl) {
    throw new Error(data.error || "This story path could not be created.");
  }
  const cleanedPassage = cleanPlaceholderLabels(data.outcome.passage);
  const branchSceneId = `branch-${safeKey(page.id || sourcePageIndex + 1)}-${safeKey(choice)}`;
  const scriptedBeats = normalizeScriptBeats(data.outcome.script, branchSceneId);
  const branchBeats = scriptedBeats.length
    ? narrationEngine.applyVoiceProfiles(scriptedBeats, voiceProfiles)
    : narrationEngine.applyVoiceProfiles(
      narrationEngine.parseStorySceneIntoNarrationBeats(cleanedPassage, storyCharacters(), branchSceneId),
      voiceProfiles,
    );
  return {
    id: branchSceneId,
    sourcePageId: page.id,
    choice,
    title: data.outcome.title,
    passage: cleanedPassage,
    storyExcerpt: cleanedPassage,
    imageDataUrl: data.outcome.imageDataUrl,
    chapterLabel: "Your Choice Changed the Story",
    beats: branchBeats,
    decisions: [],
  };
}

function branchRequestBody(page, choice, sourcePageIndex) {
  const character = activeCharacter();
  const world = (project.worlds || []).find((item) => item.id === project.activeWorldId) || project.worlds?.[0] || {};
  return {
    storyTitle: project.storyDraft?.title || project.title || "OPRealm Story",
    storyContext: project.storyDraft?.context || project.storyDraft?.summary || "",
    currentPassage: page.storyExcerpt || page.passage || page.prompt || "",
    currentVisual: page.visualPrompt || page.prompt || "",
    choice,
    character: JSON.stringify({
      name: character.name,
      description: character.prompt || character.description,
      style: character.masterStyle || character.style,
      outfit: character.customOutfit || character.outfit || character.recipe?.components?.outfit,
      accessories: resolvedCharacterAccessories(character),
      pet: resolvedCharacterPet(character),
      palette: character.palette || character.recipe?.visual?.palette || [],
    }),
    cast: JSON.stringify(storyCast()),
    world: JSON.stringify({ name: world.name, description: world.description || world.prompt }),
    nextPassage: pages[sourcePageIndex + 1]?.storyExcerpt || "",
    referenceImages: [
      { label: "Locked hero portrait and outfit", imageDataUrl: character.imageUrl || character.recipe?.generation?.generatedImageUrl || "" },
      { label: "Current approved story scene", imageDataUrl: page.generatedImageUrl || page.imageDataUrl || "" },
      { label: "Locked story world", imageDataUrl: world.imageUrl || world.generatedImageUrl || "" },
    ].filter((reference) => reference.imageDataUrl?.startsWith("data:image/")),
  };
}

function normalizeBeat(beat) {
  if (beat && typeof beat === "object") {
    return {
      ...beat,
      id: String(beat.id || ""),
      sceneId: String(beat.sceneId || currentPage()?.id || ""),
      order: Number(beat.order || 1),
      type: beat.type === "dialogue" ? "dialogue" : /^narrator$/i.test(beat.speaker || "") ? "narration" : "dialogue",
      speaker: String(beat.speaker || "Narrator").trim() || "Narrator",
      text: cleanPlaceholderLabels(beat.text || ""),
      emotion: String(beat.emotion || "warm"),
      deliveryDirection: String(beat.deliveryDirection || ""),
      voiceId: String(beat.voiceId || ""),
      audioUrl: String(beat.audioUrl || ""),
      durationMs: Number(beat.durationMs || 0),
    };
  }
  return {
    id: "",
    sceneId: currentPage()?.id || "",
    order: 1,
    type: "narration",
    speaker: "Narrator",
    text: cleanPlaceholderLabels(beat || ""),
    emotion: "warm",
    deliveryDirection: "",
    voiceId: "",
    audioUrl: "",
    durationMs: 0,
  };
}

function normalizeScriptBeats(script, sceneId = "scene") {
  return (Array.isArray(script) ? script : [])
    .map((beat, index) => {
      const speaker = canonicalSpeaker(beat?.speaker, beat?.speakerRole);
      return normalizeBeat({
        ...beat,
        speaker,
        id: beat?.id || `${sceneId}-beat-${index + 1}`,
        sceneId,
        order: index + 1,
        type: /^narrator$/i.test(speaker) ? "narration" : "dialogue",
      });
    })
    .filter((beat) => beat.text)
    .slice(0, 12);
}

function storyCharacters() {
  const hero = activeCharacter();
  const characters = [
    hero,
    ...(project.characters || []).filter((item) => item.id !== hero.id),
    ...(project.objects || []).filter((item) => item.kind === "pet" || item.kind === "companion"),
  ];
  return characters.filter((item, index) =>
    item?.name && characters.findIndex((candidate) => candidate.id
      ? candidate.id === item.id
      : String(candidate.name).toLowerCase() === String(item.name).toLowerCase()) === index,
  );
}

function canonicalSpeaker(value, speakerRole = "") {
  const requested = String(value || "")
    .replace(/^(hero|supporting character|speaker|character)\s*:\s*/i, "")
    .trim();
  if (speakerRole === "narrator" || /^narrator$/i.test(requested)) return "Narrator";
  const exact = storyCharacters().find((item) =>
    String(item.name || "").toLowerCase() === requested.toLowerCase(),
  );
  if (exact) return exact.name;
  if (speakerRole === "hero") return activeCharacter().name || "Narrator";
  return "Narrator";
}

function accountAgeBand() {
  return project.ageBand || project.storyDraft?.ageBand || "7-10";
}

function storyCast() {
  const characters = (project.characters || []).map((item) => ({
    name: item.name,
    role: item.characterType || item.type || "story character",
  }));
  const companions = (project.objects || [])
    .filter((item) => item.kind === "pet" || item.kind === "companion")
    .map((item) => ({ name: item.name, role: item.type || item.kind || "companion" }));
  return [...characters, ...companions]
    .filter((item) => item.name && !/^(custom object|custom pet|none)$/i.test(item.name))
    .slice(0, 6);
}

function speakerForBeat(beat) {
  const requested = String(beat.speaker || "Narrator").trim();
  if (/^narrator$/i.test(requested)) {
    const hero = activeCharacter();
    return {
      name: "Narrator",
      image: hero.imageUrl || hero.imageDataUrl || hero.recipe?.generation?.generatedImageUrl || art.src,
    };
  }
  const candidates = [
    ...(project.characters || []),
    ...(project.objects || []).filter((item) => item.kind === "pet" || item.kind === "companion"),
  ];
  const match = candidates.find((item) => String(item.name || "").toLowerCase() === requested.toLowerCase());
  return {
    name: match?.name || requested,
    image: match?.imageUrl || match?.imageDataUrl || match?.recipe?.generation?.generatedImageUrl || activeCharacter().imageUrl || art.src,
  };
}

function resolvedCharacterAccessories(character) {
  const raw = character.accessories || character.recipe?.components?.accessories || [];
  const customObject = String(character.customObject || character.recipe?.components?.customObject || "").trim();
  return raw
    .map((item) => item === "Custom Object" ? customObject : item)
    .filter((item) => item && !/^(none|custom object)$/i.test(item));
}

function resolvedCharacterPet(character) {
  const raw = String(character.pet || character.recipe?.components?.pet || "").trim();
  const customPet = String(character.customPet || character.recipe?.components?.customPet || "").trim();
  if (/^custom pet$/i.test(raw)) return customPet;
  return /^(no pet|none)$/i.test(raw) ? "" : raw;
}

function cleanPlaceholderLabels(value) {
  return String(value || "")
    .replace(/[^.!?]*(?:custom object|custom pet)[^.!?]*[.!?]?/gi, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function speakCurrentBeat() {
  if (!narrationAudio.paused) {
    narrationAudio.pause();
    updateNarrationControls(normalizeBeat(currentPage().beats[beatIndex]));
    return;
  }
  narrationEnabled = true;
  const beat = normalizeBeat(currentPage().beats[beatIndex]);
  try {
    const audioBeat = await ensureBeatAudio(beat, pageIndex, beatIndex);
    narrationAudio.src = audioBeat.audioUrl;
    narrationAudio.volume = Number(document.querySelector("#narrationVolume").value) / 100;
    await narrationAudio.play();
    narrationStatus.textContent = `${beat.speaker || "Narrator"} speaking`;
    updateNarrationControls({ ...beat, audioUrl: audioBeat.audioUrl });
  } catch (error) {
    const fallback = narrationEngine.narrationFallback(error);
    narrationStatus.textContent = fallback.message || "Narration unavailable";
    narrationStatus.classList.add("is-error");
    readStoryButton.textContent = "Retry Narration";
    updateNarrationControls(beat);
  }
}

function stopNarration() {
  narrationAudio.pause();
  narrationAudio.currentTime = 0;
  highlightedWordIndex = -1;
  const page = currentPage();
  if (page?.beats?.[beatIndex]) renderBeatText(normalizeBeat(page.beats[beatIndex]));
}

function replayCurrentBeat() {
  if (!narrationAudio.src) {
    speakCurrentBeat();
    return;
  }
  narrationAudio.currentTime = 0;
  narrationAudio.play();
}

function scheduleAutoPlay() {
  window.clearTimeout(autoPlayTimer);
  if (!autoPlay || !narrationEnabled || !narrationAudio.paused) return;
  if (choiceCards.children.length) {
    narrationStatus.textContent = "Choose what happens next";
    return;
  }
  autoPlayTimer = window.setTimeout(() => speakCurrentBeat(), 180);
}

async function prepareStorybook() {
  if (preparationRunning) return;
  preparationRunning = true;
  preparation.hidden = false;
  preparationActions.hidden = true;
  try {
    setPreparationProgress(3, "Checking your completed story", "Reading the approved scenes, character cast and available choices.");
    await hydrateNarrationManifest();

    const branchTasks = pages.flatMap((page, sourcePageIndex) =>
      (page.decisions || []).map((choice) => ({ page, sourcePageIndex, choice })),
    );
    for (let index = 0; index < branchTasks.length; index += 1) {
      const task = branchTasks[index];
      const progress = 8 + Math.round(((index + 1) / Math.max(1, branchTasks.length)) * 52);
      const key = branchKey(task.page, task.choice);
      setPreparationProgress(
        progress,
        `Creating optional path ${index + 1} of ${branchTasks.length}`,
        `Writing and illustrating “${task.choice}” so it opens instantly during play.`,
      );
      let branch = await readPreparedBranch(key);
      if (!branch) {
        branch = await generatePreparedBranch(task.page, task.choice, task.sourcePageIndex);
        await savePreparedBranch(key, branch);
      }
      preparedBranches.set(key, branch);
    }

    const audioTasks = [
      ...pages.flatMap((page, sceneIndex) =>
        (page.beats || []).map((beat, beatPosition) => ({
          beat: normalizeBeat(beat),
          sceneIndex,
          beatPosition,
          sceneId: page.id,
          sceneNumber: sceneIndex + 1,
        })),
      ),
      ...[...preparedBranches.values()].flatMap((branch, branchIndex) =>
        (branch.beats || []).map((beat, beatPosition) => ({
          beat: normalizeBeat(beat),
          sceneIndex: 0,
          beatPosition,
          sceneId: branch.id,
          sceneNumber: pages.length + branchIndex + 1,
        })),
      ),
    ];
    narrationEnabled = true;
    for (let index = 0; index < audioTasks.length; index += 1) {
      const task = audioTasks[index];
      const progress = 62 + Math.round(((index + 1) / Math.max(1, audioTasks.length)) * 36);
      setPreparationProgress(
        progress,
        `Recording story voices ${index + 1} of ${audioTasks.length}`,
        `Preparing ${task.beat.speaker || "Narrator"} so every line plays without waiting.`,
      );
      await ensureBeatAudio(task.beat, task.sceneIndex, task.beatPosition, {
        sceneId: task.sceneId,
        sceneNumber: task.sceneNumber,
      });
    }

    setPreparationProgress(100, "Your storybook is ready", "All scenes, optional paths, illustrations and voices are prepared.");
    readStoryButton.textContent = "Narration Ready";
    narrationStatus.textContent = "Narration ready";
    window.setTimeout(() => {
      preparation.hidden = true;
      preparationRunning = false;
    }, 650);
  } catch (error) {
    preparationRunning = false;
    setPreparationProgress(
      Number(preparationPercent.textContent.replace("%", "")) || 0,
      "Preparation paused",
      error.message || "OPRealm could not finish preparing this storybook.",
    );
    preparationActions.hidden = false;
  }
}

async function hydrateNarrationManifest() {
  const response = await fetch(`/api/storybook-narration?storybookId=${encodeURIComponent(storybookId())}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Narration preparation could not begin.");
  (data.beats || []).forEach((beat) => narrationManifest.set(beat.beatId, beat));
}

function setPreparationProgress(percent, title, description) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  preparationRing.style.setProperty("--preparation-progress", `${safe * 3.6}deg`);
  preparationPercent.textContent = `${safe}%`;
  preparationTitle.textContent = title;
  preparationDescription.textContent = description;
}

async function generateStorybookNarration() {
  if (narrationGenerating) return;
  narrationEnabled = true;
  narrationGenerating = true;
  narrationStatus.classList.remove("is-error");
  readStoryButton.disabled = true;
  const allBeats = pages.flatMap((page, sceneIndex) =>
    (page.beats || []).map((beat, beatPosition) => ({ beat: normalizeBeat(beat), sceneIndex, beatPosition })),
  );
  let ready = 0;
  try {
    for (const item of allBeats) {
      narrationStatus.textContent = `Generating narration ${Math.round((ready / Math.max(1, allBeats.length)) * 100)}%`;
      await ensureBeatAudio(item.beat, item.sceneIndex, item.beatPosition);
      ready += 1;
    }
    narrationStatus.textContent = "Narration ready";
    readStoryButton.textContent = "Narration Ready";
    if (autoPlay) await speakCurrentBeat();
  } catch (error) {
    narrationStatus.textContent = error.message || "Narration unavailable";
    narrationStatus.classList.add("is-error");
    readStoryButton.textContent = "Retry Narration";
  } finally {
    narrationGenerating = false;
    readStoryButton.disabled = false;
    updateNarrationControls(normalizeBeat(currentPage().beats[beatIndex]));
  }
}

async function ensureBeatAudio(beat, sceneIndex, beatPosition, sceneOverride = null) {
  const cached = narrationManifest.get(beat.id);
  if (cached?.audioUrl && Number(cached.generationVersion || 1) >= 3) return cached;
  if (DEMO_MODE) throw new Error("Narration unavailable in demo mode.");
  const sceneNumber = Number(sceneOverride?.sceneNumber || sceneIndex + 1);
  const sceneId = sceneOverride?.sceneId || beat.sceneId || pages[sceneIndex]?.id || `scene-${sceneNumber}`;
  const response = await fetchPreparationRequest("/api/storybook-narration", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      storybookId: storybookId(),
      sceneId,
      beatId: beat.id,
      sceneNumber,
      beatNumber: beatPosition + 1,
      speaker: beat.speaker,
      text: beat.text,
      voiceId: beat.voiceId || voiceProfiles[0]?.voiceId,
      deliveryDirection: beat.deliveryDirection || voiceProfiles[0]?.deliveryDirection,
    }),
  }, "Waiting to continue recording story voices");
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.beat?.audioUrl) {
    throw new Error(data.error || "Narration unavailable");
  }
  narrationManifest.set(beat.id, data.beat);
  attachAudioToBeat(beat);
  return data.beat;
}

async function fetchPreparationRequest(url, options, waitingMessage) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    const retryAfter = Math.max(2, Number(response.headers.get("retry-after")) || 15);
    await waitForPreparationRetry(retryAfter, waitingMessage);
  }
  throw new Error("OPRealm is still receiving a lot of creation requests. Preparation will resume when you press Try Again.");
}

async function waitForPreparationRetry(seconds, message) {
  for (let remaining = seconds; remaining > 0; remaining -= 1) {
    if (!preparation.hidden) {
      preparationTitle.textContent = "Still preparing your storybook";
      preparationDescription.textContent = `${message}. Resuming automatically in ${formatRetryTime(remaining)}.`;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
}

function formatRetryTime(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function attachAudioToBeat(beat) {
  const audioBeat = narrationManifest.get(beat.id);
  if (!audioBeat || Number(audioBeat.generationVersion || 1) < 3) return beat;
  beat.audioUrl = audioBeat.audioUrl;
  beat.durationMs = audioBeat.durationMs;
  const pageBeat = currentPage()?.beats?.find((item) => item.id === beat.id);
  if (pageBeat) {
    pageBeat.audioUrl = audioBeat.audioUrl;
    pageBeat.durationMs = audioBeat.durationMs;
  }
  return beat;
}

function storybookId() {
  const source = readJsonStorage("oprealm_ai_storybook_source");
  return String(project.storybookId || source.storybookId || `storybook-${project.id || "local"}`)
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .slice(0, 120);
}

function branchKey(page, choice) {
  return `v2:${storybookId()}:${safeKey(page.id || "scene")}:${safeKey(choice)}`;
}

function safeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "path";
}

async function openStorybookCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("oprealm_storybook_cache", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("branches")) database.createObjectStore("branches");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Storybook cache could not be opened."));
  });
}

async function readPreparedBranch(key) {
  try {
    const database = await openStorybookCache();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("branches", "readonly");
      const request = transaction.objectStore("branches").get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function savePreparedBranch(key, branch) {
  const database = await openStorybookCache();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("branches", "readwrite");
    transaction.objectStore("branches").put(branch, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function bindControls() {
  continueButton.addEventListener("click", advance);
  previousBeatButton.addEventListener("click", goPrevious);
  document.querySelector("#skipSceneButton").addEventListener("click", () => {
    const previousPageIndex = pageIndex;
    branchPage = null;
    pageIndex = Math.min(pages.length - 1, pageIndex + 1);
    beatIndex = 0;
    const sceneChanged = pageIndex !== previousPageIndex;
    if (sceneChanged) playSceneTransition();
    renderPlayer({ sceneChanged });
  });
  document.querySelector("#restartBookButton").addEventListener("click", restartStory);
  document.querySelector("#retryPreparationButton").addEventListener("click", prepareStorybook);
  speakBeatButton.addEventListener("click", speakCurrentBeat);
  readStoryButton.addEventListener("click", () => {
    autoPlay = true;
    document.querySelector("#autoPlayButton").setAttribute("aria-pressed", "true");
    generateStorybookNarration();
  });
  document.querySelector("#replayBeatButton").addEventListener("click", replayCurrentBeat);
  document.querySelector("#narrationVolume").addEventListener("input", (event) => {
    narrationAudio.volume = Number(event.target.value) / 100;
  });
  document.querySelector("#autoPlayButton").addEventListener("click", (event) => {
    autoPlay = !autoPlay;
    event.currentTarget.setAttribute("aria-pressed", String(autoPlay));
    if (!autoPlay) narrationAudio.pause();
    scheduleAutoPlay();
  });
  narrationAudio.addEventListener("play", () => {
    speakBeatButton.innerHTML = "&#10074;&#10074;";
    narrationStatus.textContent = `${normalizeBeat(currentPage().beats[beatIndex]).speaker} speaking`;
  });
  narrationAudio.addEventListener("pause", () => {
    speakBeatButton.innerHTML = "&#9654;";
  });
  narrationAudio.addEventListener("timeupdate", updateTextHighlight);
  narrationAudio.addEventListener("ended", () => {
    highlightedWordIndex = -1;
    if (autoPlay && !choiceCards.children.length) {
      advance();
    } else if (choiceCards.children.length) {
      narrationStatus.textContent = "Choose what happens next";
    } else {
      narrationStatus.textContent = "Beat finished";
      updateNarrationControls(normalizeBeat(currentPage().beats[beatIndex]));
    }
  });
  narrationAudio.addEventListener("error", () => {
    narrationStatus.textContent = "Narration unavailable";
    narrationStatus.classList.add("is-error");
  });
  settingsButton.addEventListener("click", () => {
    const shouldOpen = settingsPopover.hidden;
    settingsPopover.hidden = !shouldOpen;
    settingsButton.setAttribute("aria-expanded", String(shouldOpen));
  });
  document.querySelector("#closeSettingsButton").addEventListener("click", () => {
    closeSettings();
  });
  document.querySelector("#motionToggle").addEventListener("change", (event) => game.classList.toggle("motion-off", !event.target.checked));
  dialogueExpandButton.addEventListener("click", () => {
    const expanded = dialoguePanel.classList.toggle("is-expanded");
    dialogueExpandButton.setAttribute("aria-expanded", String(expanded));
    dialogueExpandButton.setAttribute("aria-label", expanded ? "Collapse dialogue" : "Expand dialogue");
  });
  document.querySelector("#fullscreenButton").addEventListener("click", toggleFullscreen);
  document.querySelector("#chapterMapButton").addEventListener("click", () => document.querySelector("#chapterMapModal").hidden = false);
  document.querySelector("#closeChapterMapButton").addEventListener("click", () => document.querySelector("#chapterMapModal").hidden = true);
  document.querySelectorAll("[data-open-drawer]").forEach((button) => button.addEventListener("click", () => openDrawer(button.dataset.openDrawer)));
  document.querySelectorAll("[data-close-drawer]").forEach((button) => button.addEventListener("click", closeDrawers));
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") advance();
    if (event.key === "ArrowLeft") goPrevious();
    if (event.key === "Escape") {
      closeDrawers();
      closeSettings();
      document.querySelector("#chapterMapModal").hidden = true;
      if (dialoguePanel.classList.contains("is-expanded")) {
        dialoguePanel.classList.remove("is-expanded");
        dialogueExpandButton.setAttribute("aria-expanded", "false");
      }
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const button = document.querySelector("#fullscreenButton");
    const active = Boolean(document.fullscreenElement);
    game.classList.toggle("is-reading-mode", active);
    button.innerHTML = active
      ? '<span aria-hidden="true">&#10005;</span> Exit Fullscreen'
      : '<span aria-hidden="true">&#9974;</span> Fullscreen';
  });
}

function updateTextHighlight() {
  const beat = normalizeBeat(currentPage()?.beats?.[beatIndex]);
  if (!beat.text || !Number.isFinite(narrationAudio.duration) || narrationAudio.duration <= 0) return;
  const wordCount = beat.text.split(/\s+/).filter(Boolean).length;
  const nextIndex = Math.min(wordCount - 1, Math.floor((narrationAudio.currentTime / narrationAudio.duration) * wordCount));
  if (nextIndex === highlightedWordIndex) return;
  highlightedWordIndex = nextIndex;
  dialogueText.querySelectorAll(".narration-word").forEach((word) => {
    word.classList.toggle("is-read", Number(word.dataset.wordIndex) <= highlightedWordIndex);
  });
}

function closeSettings() {
  settingsPopover.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await game.requestFullscreen();
    }
  } catch {
    const button = document.querySelector("#fullscreenButton");
    button.textContent = "Fullscreen unavailable";
  }
}

function restartStory() {
  stopNarration();
  const sceneChanged = pageIndex !== 0 || Boolean(branchPage);
  pageIndex = 0;
  beatIndex = 0;
  branchPage = null;
  localStorage.removeItem(PLAYER_STATE_KEY);
  if (sceneChanged) playSceneTransition();
  renderPlayer({ sceneChanged });
}

function openDrawer(name) {
  closeDrawers();
  document.querySelector(name === "progress" ? "#chapterProgressPanel" : "#companionPanel")?.classList.add("is-open");
}

function closeDrawers() {
  document.querySelector("#chapterProgressPanel")?.classList.remove("is-open");
  document.querySelector("#companionPanel")?.classList.remove("is-open");
}

function restorePlayerState() {
  if (DEMO_MODE) return;
  const state = readJsonStorage(PLAYER_STATE_KEY);
  pageIndex = Math.max(0, Math.min(pages.length - 1, Number(state.pageIndex || 0)));
  beatIndex = Math.max(0, Number(state.beatIndex || 0));
}

function savePlayerState() {
  localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify({ pageIndex, beatIndex }));
}

function shortTitle(value) {
  const text = String(value || "");
  return text.length > 28 ? `${text.slice(0, 27)}…` : text;
}

function setBranchLoading(active) {
  const loading = document.querySelector("#branchLoading");
  loading.hidden = !active;
  window.clearInterval(branchProgressTimer);
  if (!active) return;
  let percent = 4;
  setBranchProgress(percent);
  branchProgressTimer = window.setInterval(() => {
    percent = Math.min(94, percent + Math.max(1, Math.ceil((94 - percent) * 0.07)));
    setBranchProgress(percent);
    if (percent >= 94) window.clearInterval(branchProgressTimer);
  }, 650);
}

function setBranchProgress(percent) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  document.querySelector("#branchLoadingRing").style.setProperty("--branch-progress", `${safe * 3.6}deg`);
  document.querySelector("#branchLoadingPercent").textContent = `${safe}%`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
