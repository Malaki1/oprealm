export const REEL_GENRES = ["mystery", "dating", "horror", "fantasy", "survival", "funny", "riches", "adventure"];
export const REEL_FRAME_TYPES = ["hook", "choice", "countdown", "outcome", "twist", "reveal", "ending", "cta"];

export const REEL_TEMPLATES = {
  mystery: [
    template("who-is-lying", "Who Is Lying?", "Uncover the truth before time runs out.", "Who is lying?", "🔎"),
    template("find-the-culprit", "Find The Culprit", "Follow the clues. Catch the culprit.", "Who caused the sabotage?", "🧵"),
    template("who-stole-it", "Who Stole It?", "Someone took the crown. Who did it?", "Who stole the crown?", "👑"),
    template("sabotaged", "Sabotaged!", "Someone sabotaged the mission.", "Who sabotaged the mission?", "💥"),
    template("midnight-killer", "Midnight Killer", "Find the safe suspect before midnight.", "Who can you trust?", "🕛"),
  ],
  dating: [
    template("say-the-right-thing", "Say The Right Thing", "Pick the line that builds chemistry.", "What do you say?", "💬"),
    template("pick-your-date", "Pick Your Date", "Choose the personality that fits you.", "Who do you choose?", "💗"),
    template("win-the-princess", "Win The Princess", "Make the brave, kind choice.", "How do you impress them?", "👸"),
    template("love-triangle", "Love Triangle", "Read the signals before choosing.", "Who is being honest?", "💞"),
    template("first-date-disaster", "First Date Disaster", "Recover from an awkward moment.", "How do you save the day?", "🍝"),
    template("secret-crush-test", "Secret Crush Test", "Spot the clues and choose wisely.", "What do you say next?", "💌"),
  ],
  horror: [
    template("choose-your-protector", "Choose Your Protector", "One protects you. One betrays you.", "Who protects you tonight?", "🛡️"),
    template("open-the-door", "Open The Door?", "Something is waiting outside.", "Do you open the door?", "🚪"),
    template("hide-or-run", "Hide Or Run?", "The footsteps are getting closer.", "Where do you go?", "👣"),
    template("trust-the-ghost", "Trust The Ghost?", "The ghost knows a secret route.", "Do you follow it?", "👻"),
    template("survive-the-night", "Survive The Night", "Make it safely until sunrise.", "Which room is safest?", "🌙"),
  ],
  fantasy: [
    template("choose-your-dragon", "Choose Your Dragon", "Each dragon grants a different fate.", "Which dragon chooses you?", "🐉"),
    template("choose-your-kingdom", "Choose Your Kingdom", "Rule wisely or awaken a curse.", "Which kingdom needs you?", "🏰"),
    template("magical-companion", "Choose Your Magical Companion", "One companion hides a secret.", "Who joins your quest?", "🦄"),
    template("cursed-object", "Choose The Cursed Object", "Power always has a price.", "Which relic do you touch?", "🔮"),
  ],
  survival: [
    template("choose-your-shelter", "Choose Your Shelter", "The storm reaches you in minutes.", "Where do you hide?", "⛺"),
    template("choose-your-teammate", "Choose Your Teammate", "Trust decides who makes it home.", "Who joins your team?", "🤝"),
    template("choose-your-weapon", "Choose Your Weapon", "One tool is not what it seems.", "What do you carry?", "🧰"),
    template("survive-the-island", "Survive The Island", "Resources are vanishing fast.", "Which route do you take?", "🏝️"),
  ],
  funny: [
    template("weird-roommate", "Choose Your Weird Roommate", "Every roommate has a ridiculous secret.", "Who gets the spare room?", "🛋️"),
    template("cursed-superpower", "Pick Your Cursed Superpower", "Great power. Terrible side effects.", "Which power do you accept?", "🦸"),
    template("ridiculous-pet", "Choose Your Ridiculous Pet", "Cute, chaotic, or secretly royal?", "Which pet follows you home?", "🦆"),
  ],
  riches: [
    template("billionaire-mentor", "Choose Your Billionaire Mentor", "One offers wisdom. One offers shortcuts.", "Who teaches you?", "💎"),
    template("luxury-life", "Pick Your Luxury Life", "Every dream hides a trade-off.", "Which life do you choose?", "🏝️"),
    template("choose-your-investment", "Choose Your Investment", "Balance risk, reward, and kindness.", "Where do you invest?", "📈"),
  ],
  adventure: [
    template("choose-your-quest", "Choose Your Quest", "Three paths. One legendary ending.", "Which path do you take?", "🏔️"),
    template("lost-temple", "The Lost Temple", "Choose the clue that opens the gate.", "Which symbol do you press?", "🗿"),
    template("sky-pirates", "Join The Sky Pirates", "Pick a crew before the storm arrives.", "Who do you trust?", "🏴‍☠️"),
    template("portal-choice", "Choose A Portal", "Each portal leads to a different world.", "Which world calls you?", "🌀"),
  ],
};

const GENRE_BEATS = {
  mystery: { problem: "The moon crown vanished during the blackout.", clue: "A trail of silver dust ends beside a broken clock.", redHerring: "The guard carries an empty velvet box.", reveal: "The quiet witness moved the clock to hide the escape tunnel." },
  dating: { problem: "A school festival challenge puts your friendship to the test.", clue: "One person remembers the small promise you made.", redHerring: "A flashy compliment sounds rehearsed.", reveal: "Kindness, not showing off, unlocks the best ending." },
  horror: { problem: "A whisper follows you through the lantern woods.", clue: "The safe path has blue moths floating above it.", redHerring: "A warm cabin light flickers in the wrong direction.", reveal: "The frightening guide was secretly protecting the exit." },
  fantasy: { problem: "A sleeping kingdom needs a new guardian.", clue: "The true companion bows to the cracked star sigil.", redHerring: "The brightest relic hums with unstable magic.", reveal: "The overlooked creature carries the royal flame." },
  survival: { problem: "A storm cuts off every route home.", clue: "Fresh bird tracks lead toward high ground.", redHerring: "The easiest shelter sits below the flood mark.", reveal: "The cautious teammate packed the missing rescue beacon." },
  funny: { problem: "Your new roommate has turned breakfast into a dimension portal.", clue: "Only the rubber duck understands the instruction manual.", redHerring: "The serious-looking cat claims to be qualified.", reveal: "The ridiculous option solves everything by accident." },
  riches: { problem: "Two mentors offer you a shortcut to your dream.", clue: "One plan helps the whole town grow.", redHerring: "The golden contract promises instant success.", reveal: "The slower generous choice creates lasting success." },
  adventure: { problem: "A map splits into three paths as the volcano wakes.", clue: "Wind chimes mark the route used by rescuers.", redHerring: "The jeweled path circles back to the entrance.", reveal: "The humble rope bridge leads to the legendary city." },
};

const GENRE_CHARACTERS = {
  mystery: [["Mara Vale", "suspect"], ["Kellan Rook", "suspect"], ["Inspector Orbit", "guide"]],
  dating: [["Ari Spark", "date"], ["Nova Lane", "date"], ["Milo", "guide"]],
  horror: [["Forest Witch", "guide"], ["Secret Vampire", "suspect"], ["Old Hermit", "guide"]],
  fantasy: [["Emberwing", "creature"], ["Luma", "guide"], ["The Hollow King", "villain"]],
  survival: [["Rin Scout", "option"], ["Kai Builder", "option"], ["Beacon", "guide"]],
  funny: [["Professor Duck", "option"], ["Sir Noodles", "option"], ["The Fridge", "villain"]],
  riches: [["Maya Stone", "mentor"], ["Victor Gold", "mentor"], ["Pip", "guide"]],
  adventure: [["Tala Storm", "option"], ["Rowan Vale", "option"], ["Captain Orbit", "guide"]],
};

export function generateRealmReel(input = {}) {
  const seed = generateReelSeed(input);
  const decisionTree = generateReelDecisionTree(seed);
  const storyboard = generateReelStoryboard(seed, decisionTree);
  return {
    id: cleanId(input.id) || crypto.randomUUID(),
    creatorId: cleanId(input.creatorId) || "",
    title: templateFor(seed.genre, seed.templateId).name,
    status: "draft",
    durationSeconds: seed.durationSeconds,
    aspectRatio: "9:16",
    seed,
    decisionTree,
    storyboard,
    characters: seed.characterSeed.characters,
    cta: seed.cta,
    settings: {
      difficulty: seed.difficulty,
      twistLevel: seed.decisionTreeSeed.twistLevel,
      visualStyle: seed.worldSeed.visualStyle,
      voiceStyle: seed.voiceStyle,
      ageBand: seed.ageBand,
    },
    analytics: emptyAnalytics(),
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateReelSeed(input = {}) {
  const genre = REEL_GENRES.includes(input.genre) ? input.genre : "mystery";
  const selectedTemplate = templateFor(genre, input.templateId);
  const ageBand = ["8-10", "10-12", "13-16", "16+"].includes(input.ageBand) ? input.ageBand : "13-16";
  const safeGenre = genre === "dating" && ["8-10", "10-12"].includes(ageBand) ? "dating" : genre;
  const durationSeconds = [30, 60, 90].includes(Number(input.durationSeconds)) ? Number(input.durationSeconds) : 60;
  const characters = GENRE_CHARACTERS[safeGenre].map(([name, role], index) => ({
    id: `character-${index + 1}`,
    name,
    role,
    appearance: characterAppearance(safeGenre, index),
    personality: index === 0 ? "direct, observant, and bold" : index === 1 ? "charming, unpredictable, and secretive" : "calm, wise, and protective",
    secret: index < 2 ? `${name} knows part of the hidden truth.` : "",
    warningLine: index === 0 ? "Don't trust the obvious answer." : index === 1 ? "They're hiding something from you." : "Look for the clue everyone ignored.",
    trustworthiness: index === 0 ? "safe" : index === 1 ? "uncertain" : "secretly_good",
  }));
  const tone = safeTone(input.tone, genre);
  return {
    id: crypto.randomUUID(),
    creatorId: cleanId(input.creatorId) || "",
    sourceType: safeChoice(input.sourceType, ["quick_prompt", "creator_bible", "story_game", "storybook", "realmverse_creation"], "quick_prompt"),
    sourceId: cleanId(input.sourceId) || undefined,
    genre,
    templateId: selectedTemplate.id,
    hook: buildHook(selectedTemplate, genre, cleanText(input.idea, 180)),
    theme: cleanText(input.idea, 180) || selectedTemplate.description,
    tone,
    ageBand,
    durationSeconds,
    difficulty: safeChoice(input.difficulty, ["easy", "medium", "hard", "impossible"], "medium"),
    voiceStyle: safeChoice(input.voiceStyle, ["dramatic", "mysterious", "funny", "calm"], "dramatic"),
    worldSeed: {
      worldName: worldNameFor(genre),
      setting: worldSettingFor(genre),
      visualStyle: safeChoice(input.visualStyle, ["realistic", "cinematic", "animated", "comic", "fantasy"], "cinematic"),
      dangerLevel: genre === "funny" || genre === "dating" ? "playful" : "spooky but age-safe",
    },
    characterSeed: { characters },
    decisionTreeSeed: {
      startingChoiceCount: 2,
      depth: durationSeconds === 30 ? 2 : durationSeconds === 90 ? 4 : 3,
      endingCount: durationSeconds === 30 ? 2 : 3,
      twistLevel: safeChoice(input.twistLevel, ["low", "medium", "high"], "medium"),
    },
    cta: generateReelCTA(input.ctaType, input.sourceId),
    safetyNotes: safetyNotes(genre, ageBand),
  };
}

export function generateReelDecisionTree(seed) {
  const beats = GENRE_BEATS[seed.genre];
  const [left, right] = seed.characterSeed.characters;
  const firstQuestion = templateFor(seed.genre, seed.templateId).question;
  const decisions = [
    {
      id: "decision-1", order: 1, prompt: firstQuestion, countdownSeconds: 3,
      options: [
        choice("choice-1a", `Choose ${left.name}`, left.id, "outcome-1a", "success", left.warningLine),
        choice("choice-1b", `Choose ${right.name}`, right.id, "outcome-1b", "betrayal", right.warningLine),
      ],
      visualPrompt: choiceImagePrompt(seed, left, right, firstQuestion),
      narrationText: `${firstQuestion} Choose carefully.`,
      frameType: "hook_choice",
    },
    {
      id: "decision-2", order: 2, prompt: secondQuestion(seed.genre), countdownSeconds: 3,
      options: [
        choice("choice-2a", positiveChoice(seed.genre), left.id, "ending-good", "reward", beats.clue),
        choice("choice-2b", riskyChoice(seed.genre), right.id, "ending-bad", "failure", beats.redHerring),
      ],
      visualPrompt: choiceImagePrompt(seed, left, right, secondQuestion(seed.genre)),
      narrationText: `Now the real test begins. ${secondQuestion(seed.genre)}`,
      frameType: "decision",
    },
  ];
  if (seed.durationSeconds === 90) {
    decisions.push({
      id: "decision-3", order: 3, prompt: "Do you trust the final clue or take the shortcut?", countdownSeconds: 3,
      options: [
        choice("choice-3a", "Follow the clue", left.id, "ending-secret", "survival", "The smallest detail changes everything."),
        choice("choice-3b", "Take the shortcut", right.id, "ending-bad", "twist", "Fast choices can hide a trap."),
      ],
      visualPrompt: choiceImagePrompt(seed, left, right, "Final choice"),
      narrationText: "Last chance. The ending depends on this.",
      frameType: "decision",
    });
  }
  return {
    id: crypto.randomUUID(),
    reelSeedId: seed.id,
    startingNodeId: "decision-1",
    decisions,
    outcomes: [
      outcome("outcome-1a", "choice-1a", `You chose ${left.name}. ${beats.clue}`, consequenceImagePrompt(seed, left, "safe clue discovered"), "decision-2"),
      outcome("outcome-1b", "choice-1b", `You chose ${right.name}. ${beats.redHerring}`, consequenceImagePrompt(seed, right, "dangerous clue discovered"), "decision-2"),
    ],
    endings: [
      ending("ending-good", "You Found The Truth", "best", `${beats.reveal} You made the wise choice.`, consequenceImagePrompt(seed, left, "victorious safe ending")),
      ending("ending-bad", "Bad Choice", seed.genre === "funny" ? "funny" : "bad", `The shortcut was a trap. You unlock the chaotic ending.`, consequenceImagePrompt(seed, right, "age-safe failure ending")),
      ending("ending-secret", "Secret Ending", "secret", "You noticed the clue nobody else saw. A hidden path opens.", consequenceImagePrompt(seed, left, "secret glowing ending")),
    ],
  };
}

export function generateReelStoryboard(seed, tree) {
  const target = seed.durationSeconds === 30 ? 7 : seed.durationSeconds === 90 ? 16 : 12;
  const beats = GENRE_BEATS[seed.genre];
  const [left, right] = seed.characterSeed.characters;
  const frames = [
    frame("frame-hook", 0, "hook", durationFor("hook", seed.durationSeconds), seed.hook, "Your choice changes everything.", seed.hook, hookImagePrompt(seed), "zoom", "sting"),
    frame("frame-choice-1", 1, "choice", 5, tree.decisions[0].prompt, `${left.name} or ${right.name}?`, tree.decisions[0].narrationText, tree.decisions[0].visualPrompt, "glitch", "tick", { decisionId: "decision-1", options: tree.decisions[0].options }),
    frame("frame-countdown-1", 2, "countdown", 3, "CHOOSE NOW", "3... 2... 1...", "Make your choice.", tree.decisions[0].visualPrompt, "cut", "tick", { countdownSeconds: 3 }),
    frame("frame-outcome-1", 3, "outcome", 5, `YOU CHOSE ${left.name.toUpperCase()}`, beats.clue, tree.outcomes[0].narrationText, tree.outcomes[0].visualPrompt, "swipe", "reveal"),
    frame("frame-choice-2", 4, "choice", 5, tree.decisions[1].prompt.toUpperCase(), "Trust the clue or risk the shortcut?", tree.decisions[1].narrationText, tree.decisions[1].visualPrompt, "zoom", "tick", { decisionId: "decision-2", options: tree.decisions[1].options }),
    frame("frame-outcome-bad", 5, "twist", 5, "THE TRAP CLOSES", beats.redHerring, "If you picked the shortcut, bad idea.", consequenceImagePrompt(seed, right, "sudden safe twist"), "flash", "boom"),
    frame("frame-reveal", 6, "reveal", 5, "THE HIDDEN TRUTH", beats.reveal, tree.endings[0].narrationText, tree.endings[0].visualPrompt, "glitch", "reveal"),
    frame("frame-ending-good", 7, "ending", 5, tree.endings[0].title.toUpperCase(), "You unlocked the best path.", "You made the choice that saved the day.", tree.endings[0].visualPrompt, "blur", "success", { endingType: "good" }),
    frame("frame-alt-path", 8, "outcome", 5, `BUT IF YOU CHOSE ${right.name.toUpperCase()}...`, "The story changes.", tree.outcomes[1].narrationText, tree.outcomes[1].visualPrompt, "swipe", "sting"),
    frame("frame-alt-ending", 9, "ending", 5, tree.endings[1].title.toUpperCase(), "You unlocked another ending.", tree.endings[1].narrationText, tree.endings[1].visualPrompt, "flash", "fail", { endingType: "bad" }),
    frame("frame-secret", 10, "reveal", 4, "DID YOU SPOT THE SECRET?", "Replay and look for the hidden clue.", tree.endings[2].narrationText, tree.endings[2].visualPrompt, "zoom", "reveal"),
    frame("frame-cta", 11, "cta", 4, seed.cta.headline, seed.cta.buttonText, "Play the full interactive version on OPRealm.", ctaImagePrompt(seed), "cut", "success", { cta: seed.cta }),
  ];
  if (target < frames.length) return normalizeDurations(frames.slice(0, target - 1).concat(frames.at(-1)), seed.durationSeconds);
  while (frames.length < target) {
    const index = frames.length - 1;
    frames.splice(index, 0, frame(
      `frame-extra-${index}`, index, index % 2 ? "outcome" : "choice", 5,
      index % 2 ? "ANOTHER PATH OPENS" : "ONE MORE CHOICE",
      "Every answer creates a new ending.",
      "You are closer to the hidden ending.",
      consequenceImagePrompt(seed, index % 2 ? left : right, "new branching discovery"),
      index % 2 ? "swipe" : "zoom", "sting",
    ));
  }
  return normalizeDurations(frames, seed.durationSeconds);
}

export function generateReelVideoBlueprint(frameItem, seed) {
  const subject = namedSubject(frameItem, seed);
  const preset = {
    choice: ["front-facing tension", "slow push-in", "characters exchange suspicious glances"],
    countdown: ["countdown-ready composition", "locked camera with subtle handheld tension", "characters hold their poses"],
    outcome: ["clear consequence reveal", "fast push through foreground", "the environment reacts to the choice"],
    twist: ["dramatic sudden reveal", "snap zoom with brief camera shake", "a hidden danger moves into view"],
    reveal: ["truth-reveal composition", "slow orbit around the subject", "fog and particles separate to expose the clue"],
    ending: ["emotional payoff", "gentle crane upward", "the character reacts clearly to the final result"],
    cta: ["clean branded end card", "subtle forward drift", "soft magical particles move behind the safe layout"],
    hook: ["immediate curiosity hook", "rapid push-in", "the subject turns toward camera as the danger appears"],
  }[frameItem.frameType] || ["cinematic story beat", "slow push-in", "the subject performs one clear action"];
  return {
    frameId: frameItem.id,
    sceneType: frameItem.frameType,
    emotion: emotionFor(seed.genre, frameItem.frameType),
    intensity: ["twist", "reveal"].includes(frameItem.frameType) ? 9 : ["hook", "choice"].includes(frameItem.frameType) ? 8 : 6,
    characterAction: `${subject} ${preset[2]}`,
    environmentAction: environmentMotion(seed.genre),
    cameraShot: preset[0],
    cameraMovement: preset[1],
    lighting: lightingFor(seed.genre),
    atmosphere: atmosphereFor(seed.genre),
    duration: frameItem.durationSeconds,
    visualStyle: seed.worldSeed.visualStyle,
    finalVideoPrompt: "",
  };
}

export function composeReelVideoPrompt(blueprint, seed) {
  const prompt = [
    `Vertical 9:16 ${blueprint.visualStyle} ${blueprint.sceneType} scene.`,
    `${blueprint.characterAction}.`,
    `${blueprint.environmentAction}.`,
    `Camera: ${blueprint.cameraShot}, ${blueprint.cameraMovement}.`,
    `${blueprint.lighting}, ${blueprint.atmosphere}, ${blueprint.emotion} emotional tone.`,
    `Safe space at the top for headline captions and at the bottom for choice cards.`,
    `No embedded words or logos. Age-safe OPRealm visual. ${blueprint.duration} second shot.`,
  ].join(" ");
  return { ...blueprint, finalVideoPrompt: prompt, seedId: seed.id };
}

export function generateReelCTA(type = "play_full_story", targetId = "") {
  const selected = safeChoice(type, ["play_full_story", "create_your_own", "make_this_reel", "visit_realmverse"], "play_full_story");
  const content = {
    play_full_story: ["Want the full interactive version?", "Play on OPRealm", "/storyboard"],
    create_your_own: ["Make your own choice story.", "Create on OPRealm", "/realmreels/create"],
    make_this_reel: ["Create your own this-or-that reel.", "Make a RealmReel", "/realmreels/create"],
    visit_realmverse: ["Explore more endings in RealmVerse.", "Open RealmVerse", "/realmverse"],
  }[selected];
  return {
    type: selected,
    targetType: selected,
    headline: content[0],
    buttonText: content[1],
    targetUrl: content[2],
    targetId: cleanId(targetId) || undefined,
    trackingCode: `rr-${selected}-${crypto.randomUUID().slice(0, 8)}`,
  };
}

export function reelSeedToStorySeed(seed) {
  return {
    sourceType: "realm_reel",
    sourceId: seed.id,
    worldIdea: `${seed.worldSeed.worldName}: ${seed.worldSeed.setting}`,
    characters: seed.characterSeed.characters,
    decisionTree: seed.decisionTreeSeed,
    storyGenre: seed.genre,
    tone: seed.tone,
    mainConflict: GENRE_BEATS[seed.genre].problem,
    possibleEndings: ["best", "bad", "secret"],
    starterPrompt: `Expand "${seed.hook}" into a full interactive ${seed.genre} story with the same characters and choices.`,
  };
}

export function storyToMarketingReels(story, options = {}, sourceType = "story_game") {
  const count = [3, 5, 10].includes(Number(options.generateCount)) ? Number(options.generateCount) : 3;
  const reelTypes = options.reelTypes?.length ? options.reelTypes : ["best_choice", "hardest_choice", "bad_ending"];
  const genre = REEL_GENRES.includes(story.genre) ? story.genre : "adventure";
  return Array.from({ length: count }, (_, index) => generateRealmReel({
    genre,
    templateId: REEL_TEMPLATES[genre][index % REEL_TEMPLATES[genre].length].id,
    durationSeconds: index % 3 === 0 ? 30 : 60,
    idea: `${story.title || "Your story"}: ${reelTypes[index % reelTypes.length].replaceAll("_", " ")}`,
    sourceType,
    sourceId: story.id,
    ageBand: story.ageBand || "13-16",
  }));
}

export function validateReel(reel) {
  const errors = [];
  if (!reel?.seed || !REEL_GENRES.includes(reel.seed.genre)) errors.push("A valid reel genre is required.");
  const count = reel?.storyboard?.length || 0;
  const expected = reel?.durationSeconds === 30 ? [6, 8] : reel?.durationSeconds === 90 ? [14, 18] : [10, 13];
  if (count < expected[0] || count > expected[1]) errors.push(`Storyboard needs ${expected[0]}-${expected[1]} frames.`);
  if (reel?.storyboard?.at(-1)?.frameType !== "cta") errors.push("The final frame must be a CTA.");
  for (const frameItem of reel?.storyboard || []) {
    if (!validateImagePrompt(frameItem.imagePrompt).valid) errors.push(`Frame ${frameItem.id} has an invalid image prompt.`);
    if (!validateVideoPrompt(frameItem.videoPrompt).valid) errors.push(`Frame ${frameItem.id} has an invalid video prompt.`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateImagePrompt(prompt) {
  const text = String(prompt || "");
  const required = ["9:16", "lighting", "space at top", "space at bottom", "no written text"];
  const missing = required.filter((item) => !text.toLowerCase().includes(item));
  return { valid: text.length >= 120 && missing.length === 0, missing };
}

export function validateVideoPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  const required = ["9:16", "camera", "lighting", "second shot", "space at the top"];
  const missing = required.filter((item) => !text.includes(item));
  if (text.includes("the hero")) missing.push("named character");
  return { valid: text.length >= 120 && missing.length === 0, missing };
}

export function createMockExport(reel) {
  return {
    id: crypto.randomUUID(),
    reelId: reel.id,
    status: "ready",
    outputUrl: `/realmreels/preview/${reel.id}?export=1`,
    aspectRatio: "9:16",
    durationSeconds: reel.durationSeconds,
    createdAt: new Date().toISOString(),
  };
}

export function analyticsEvent(reelId, eventType, metadata = {}) {
  return {
    id: crypto.randomUUID(),
    reelId,
    eventType,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function enhanceReel(reel, action) {
  const copy = structuredClone(reel);
  const transforms = {
    drama: ["THE CHOICE CHANGES EVERYTHING", "The danger is closer than you think."],
    twist: ["WAIT... THERE'S ANOTHER SECRET", "The obvious answer was planted."],
    humor: ["THIS WAS NOT IN THE PLAN", "Somehow, the duck was right."],
    betrayal: ["ONE OF THEM BETRAYED YOU", "The trusted ally hid the final clue."],
    suspense: ["YOU HAVE THREE SECONDS", "Listen carefully. One detail decides your fate."],
    hook: ["YOU MUST CHOOSE BEFORE TIME RUNS OUT", "Your first instinct might be wrong."],
    retention: ["DON'T SCROLL. CHOOSE NOW.", "The secret ending appears after the final choice."],
  };
  const [headline, caption] = transforms[action] || transforms.retention;
  const index = action === "hook" || action === "retention" ? 0 : Math.min(5, copy.storyboard.length - 2);
  copy.storyboard[index].headlineText = headline;
  copy.storyboard[index].captionText = caption;
  copy.updatedAt = new Date().toISOString();
  return copy;
}

function frame(id, order, frameType, durationSeconds, headlineText, captionText, narrationText, imagePrompt, transition, audioCue, metadata = {}) {
  const base = { id, order, frameType, durationSeconds, headlineText, captionText, narrationText, imagePrompt, transition, audioCue, metadata };
  const seedStub = metadata.seed || { id: "runtime", genre: inferGenre(imagePrompt), worldSeed: { visualStyle: "cinematic" } };
  const blueprint = generateReelVideoBlueprint(base, seedStub);
  return { ...base, videoPrompt: composeReelVideoPrompt(blueprint, seedStub).finalVideoPrompt, imageUrl: mockImageUrl(frameType, order), videoUrl: "" };
}

function template(id, name, description, question, icon) { return { id, name, description, question, icon }; }
function templateFor(genre, id) { return REEL_TEMPLATES[genre].find((item) => item.id === id) || REEL_TEMPLATES[genre][0]; }
function choice(id, label, characterId, outcomeNodeId, outcomeType, shortHint) { return { id, label, characterId, outcomeNodeId, outcomeType, shortHint }; }
function outcome(id, parentChoiceId, narrationText, visualPrompt, nextDecisionId) { return { id, parentChoiceId, narrationText, visualPrompt, nextDecisionId }; }
function ending(id, title, outcomeType, narrationText, visualPrompt) { return { id, title, outcomeType, narrationText, visualPrompt }; }
function safeChoice(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
function safeTone(value, genre) { return safeChoice(value, ["funny", "dramatic", "creepy", "romantic", "chaotic", "epic"], genre === "funny" ? "funny" : genre === "horror" ? "creepy" : genre === "dating" ? "romantic" : "dramatic"); }
function cleanText(value, max) { return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max); }
function cleanId(value) { const id = String(value || ""); return /^[a-f0-9-]{36}$/i.test(id) ? id : ""; }
function buildHook(selectedTemplate, genre, idea) { return idea ? `You have seconds to decide: ${idea}` : `You must choose. ${selectedTemplate.question} One answer changes everything.`; }
function secondQuestion(genre) { return ({ mystery: "Which clue do you follow?", dating: "Do you tell the truth or try to act cool?", horror: "Do you enter the cabin or follow the moths?", fantasy: "Do you take the royal path or the cursed shortcut?", survival: "Do you climb to high ground or enter the shelter?", funny: "Do you press the shiny button?", riches: "Do you choose the generous plan or the golden shortcut?", adventure: "Do you cross the rope bridge or follow the jeweled trail?" })[genre]; }
function positiveChoice(genre) { return ({ mystery: "Follow the silver dust", dating: "Tell the truth", horror: "Follow the blue moths", fantasy: "Choose the humble path", survival: "Climb to high ground", funny: "Ask the rubber duck", riches: "Build the generous plan", adventure: "Cross the rope bridge" })[genre]; }
function riskyChoice(genre) { return ({ mystery: "Accuse the guard", dating: "Show off", horror: "Enter the glowing cabin", fantasy: "Take the golden relic", survival: "Use the easy shelter", funny: "Trust the serious cat", riches: "Sign the golden contract", adventure: "Follow the jeweled trail" })[genre]; }
function worldNameFor(genre) { return ({ mystery: "Nocturne City", dating: "Starfall Academy", horror: "Lantern Woods", fantasy: "The Ember Kingdom", survival: "Stormbreak Island", funny: "Chaos Apartments", riches: "Crownlight City", adventure: "The Shattered Atlas" })[genre]; }
function worldSettingFor(genre) { return ({ mystery: "rainy clockwork streets and a sealed manor", dating: "a bright age-safe school festival or fairytale court", horror: "spooky enchanted woods with no gore or realistic harm", fantasy: "a magical kingdom of dragons, ruins, and glowing relics", survival: "a stormy island with safe puzzle-like danger", funny: "an absurd apartment where objects have personalities", riches: "a dazzling future city built around choices and consequences", adventure: "floating ruins, rope bridges, and ancient portals" })[genre]; }
function characterAppearance(genre, index) { const palettes = ["violet coat with a silver emblem", "dark teal outfit with glowing trim", "warm gold guide robes"]; return `${genre} character, original design, ${palettes[index]}, expressive face, age-safe styling`; }
function safetyNotes(genre, ageBand) { if (genre === "dating" && ["8-10", "10-12"].includes(ageBand)) return "Convert romance to friendship, school crush, or fairytale admiration. No sexualized imagery or adult scenarios."; if (genre === "horror") return "Spooky fantasy only. No gore, graphic violence, realistic harm, or predatory scenarios."; return "Kid-safe original characters, no graphic violence, sexual content, self-harm, hate, or dangerous instructions."; }
function imageBase(seed, subject, action) { return `Vertical 9:16 ${seed.worldSeed.visualStyle} ${seed.genre} scene, ${subject}, ${action}, ${seed.worldSeed.setting}, expressive emotion, dramatic lighting, consistent original character design, space at top for headline text, space at bottom for choice cards, no written text, no logos, age-safe, highly detailed.`; }
function hookImagePrompt(seed) { return imageBase(seed, seed.characterSeed.characters[0].name, "faces camera as a mystery or danger appears behind them"); }
function choiceImagePrompt(seed, left, right, question) { return imageBase(seed, `${left.name} on the left and ${right.name} on the right`, `split-screen choice composition, both face camera, visible tension, ${question}`); }
function consequenceImagePrompt(seed, character, action) { return imageBase(seed, character.name, `clearly experiences the consequence: ${action}`); }
function ctaImagePrompt(seed) { return imageBase(seed, "OPRealm magical portal and the reel characters", "clean branded end-card composition with a glowing path forward"); }
function mockImageUrl(type, index) { const assets = ["/assets/homepage/thumbnails/fantasy-story.png", "/assets/homepage/thumbnails/dragon-quest.png", "/assets/homepage/thumbnails/space-adventure.png", "/assets/homepage/thumbnails/lava-escape.png", "/assets/homepage/cards/story-games.png"]; return assets[(index + REEL_FRAME_TYPES.indexOf(type)) % assets.length]; }
function namedSubject(frameItem, seed) { const names = seed.characterSeed?.characters?.map((item) => item.name).filter(Boolean); return names?.[frameItem.order % names.length] || "Orbit"; }
function emotionFor(genre, type) { if (type === "ending") return "joy"; if (genre === "funny") return "comedy"; if (genre === "dating") return "romance"; if (genre === "horror") return "fear"; return ["choice", "twist", "reveal"].includes(type) ? "suspense" : "wonder"; }
function environmentMotion(genre) { return ({ mystery: "rain moves through lamplight and clue papers flutter", dating: "festival lights sway and confetti drifts softly", horror: "fog rolls across the ground and branches move in the wind", fantasy: "magic particles spiral while banners and clouds move", survival: "wind bends trees and distant waves surge", funny: "props wobble and one absurd object moves unexpectedly", riches: "city lights shimmer and holographic charts move", adventure: "dust, clouds, and hanging ropes move in the wind" })[genre] || "atmospheric particles move through the environment"; }
function lightingFor(genre) { return genre === "horror" ? "moody moonlight with safe dramatic rim lighting" : genre === "funny" ? "bright colorful studio lighting" : "cinematic rim lighting with strong subject separation"; }
function atmosphereFor(genre) { return genre === "dating" ? "warm age-safe social energy" : genre === "horror" ? "spooky suspense without gore" : `${genre} adventure atmosphere`; }
function inferGenre(prompt) { return REEL_GENRES.find((genre) => String(prompt).includes(genre)) || "adventure"; }
function durationFor(frameType, totalDuration) {
  if (frameType === "hook") return totalDuration === 30 ? 3 : totalDuration === 90 ? 6 : 4;
  return 5;
}
function normalizeDurations(frames, target) { const total = frames.reduce((sum, item) => sum + item.durationSeconds, 0); let remaining = target - total; let index = 0; while (remaining !== 0 && frames.length) { const frameItem = frames[index % frames.length]; if (remaining > 0) { frameItem.durationSeconds += 1; remaining -= 1; } else if (frameItem.durationSeconds > 3) { frameItem.durationSeconds -= 1; remaining += 1; } index += 1; if (index > 500) break; } return frames.map((item, order) => ({ ...item, order })); }
function emptyAnalytics() { return { views: 0, completionRate: 0, clickThroughRate: 0, shares: 0, likes: 0, exports: 0, storyExpansions: 0 }; }
