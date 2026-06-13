const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const decisionEngine = require("../public/story-decision-engine.js");
const { buildSceneVisualPrompt } = require("../public/scene-visual-prompt.js");

const storyDraftSource = fs.readFileSync(
  path.join(__dirname, "../functions/api/story-draft.js"),
  "utf8",
);
const qualityModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/story-quality.mjs"),
).href);
const payoffModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/story-payoffs.mjs"),
).href);
const signatureModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/story-signature.mjs"),
).href);

function qualityFixture() {
  const decisionTypes = ["trust_choice", "mystery_deduction", "sacrifice_choice"];
  const decisions = Array.from({ length: 3 }, (_, index) => ({
    id: `decision-${index + 1}`,
    decisionType: decisionTypes[index],
    questionText: `Will Mira follow the ${["cracked compass", "mud-marked map", "reversed wax seal"][index]} or protect Rowan?`,
    whyChoiceMatters: "Mira must risk Rowan's trust or let the saboteur reach the city.",
    helpfulClueId: `clue-${index + 1}`,
    clueReferences: [`clue-${index + 1}`],
    choices: [
      { label: `Follow clue ${index + 1}`, outcomeTag: "wise" },
      { label: `Protect Rowan ${index + 1}`, outcomeTag: "loyal" },
    ],
  }));
  return {
    storySpine: {
      heroFlaw: "Mira refuses help because she fears slowing everyone down.",
      characterVoiceProfiles: [
        { characterName: "Mira", speechRhythm: "quick and hopeful" },
        { characterName: "Rowan", speechRhythm: "dry and precise" },
      ],
      chapterAdventurePromises: [
        { chapterNumber: 1, tensionEngine: "bridge collapse", wowMoment: "floating city", endingHook: "footsteps" },
        { chapterNumber: 2, tensionEngine: "masked pursuit", wowMoment: "clockwork dragon", endingHook: "gate opens" },
        { chapterNumber: 3, tensionEngine: "final pursuit", wowMoment: "the ocean opens", endingHook: "truth revealed" },
      ],
      reversalDesign: {
        falseAssumption: "The guide is loyal.",
        hiddenMotive: "The guide forged the warning.",
        reversal: "The reversed seal proves it.",
        emotionalCost: "Mira must admit Rowan was right.",
      },
    },
    logicPlan: {
      decisions,
      clues: [
        { id: "clue-1", clueText: "The cracked compass points toward the sealed north gate.", visualObject: "cracked brass compass", payoffTarget: "hardest_choice" },
        { id: "clue-2", clueText: "Red marsh mud stains the supposedly unused route map.", visualObject: "mud-marked route map", payoffTarget: "finale" },
        { id: "clue-3", clueText: "The warning bears a wax seal stamped with its crest backwards.", visualObject: "reversed wax seal", payoffTarget: "biggest_reveal" },
      ],
    },
    bestMomentsPlan: {
      biggestReveal: "The reversed wax seal proves Rowan's mentor forged the evacuation order.",
      coolestCreatureOrEntity: "A clockwork dragon carrying a living city on its back.",
      hardestChoice: "Mira must expose Rowan's mentor or lose the only route home.",
      mostEmotionalScene: "Mira apologises to Rowan and asks him to choose whether to trust her again.",
      largestVisualSpectacle: "The floating city unfolds its brass wings above an ocean opening beneath it.",
      betrayalMoment: "Rowan's trusted mentor betrays their promise and locks Rowan outside the gate.",
      finaleMoment: "Mira trusts Rowan, stops the saboteur and resolves who forged the warning.",
      wonderMoment: "The hidden clockwork city rises from beneath the ocean.",
      humorOrWarmthMoment: "Rowan jokes about Mira's terrible map reading while they repair the compass.",
      terrifyingButKidSafeMoment: "A colossal clockwork dragon silhouette crosses the moon.",
    },
    signatureMomentsPlan: {
      wowMoment1: "The hidden clockwork city rises from beneath the ocean.",
      wowMoment2: "A clockwork dragon unfolds brass wings over the city.",
      biggestReveal: "The reversed wax seal proves Rowan's mentor forged the evacuation order.",
      mostEmotionalMoment: "Mira apologises to Rowan and asks him to trust her again.",
      mostShockingBetrayal: "Rowan's trusted mentor breaks his promise and locks Rowan outside the gate.",
      coolestLocation: "The Observatory Inside the Moon",
      coolestCreatureOrEntity: "A clockwork dragon carrying a living city on its back.",
      mostDifficultChoice: "Mira must expose Rowan's mentor or lose the only route home.",
      funniestOrWarmestMoment: "Rowan jokes about Mira's map reading while they repair the compass.",
      mostIllustratableScene: "The floating city unfolds brass wings above the open ocean.",
      finaleSpectacle: "The floating city unfolds its brass wings as Mira and Rowan stop the saboteur together.",
    },
    emotionalRhythmPlan: [
      { chapterNumber: 1, primaryTone: "danger", secondaryTone: "mystery", purpose: "Open with pressure." },
      { chapterNumber: 2, primaryTone: "wonder", secondaryTone: "suspicion", purpose: "Reveal the city." },
      { chapterNumber: 3, primaryTone: "warmth", secondaryTone: "fear", purpose: "Repair trust." },
      { chapterNumber: 4, primaryTone: "betrayal", secondaryTone: "urgency", purpose: "Turn the story." },
      { chapterNumber: 5, primaryTone: "awe", secondaryTone: "sacrifice", purpose: "Prepare the finale." },
      { chapterNumber: 6, primaryTone: "terror", secondaryTone: "triumph", purpose: "Resolve the story." },
    ],
    storyLocations: [
      {
        name: "The Observatory Inside the Moon",
        visualIdentity: "A library floating inside a giant crystal moon above a bottomless storm.",
        secret: "Its reflections reveal the forged warning.",
      },
    ],
    chapters: [
      { paragraphs: ['"Wait," Rowan said. "The compass is pointing north!"', "Their first plan failed when the bridge collapsed and Mira dropped the compass, but the hidden clockwork city rose from beneath the ocean."] },
      { paragraphs: ['"The mud came from the marsh," Mira answered. "Someone used this map today."', "At the Observatory Inside the Moon, Mira shielded Rowan until a clockwork dragon appeared across the open gate!"] },
      { paragraphs: ['"Terrible time for a map joke," Rowan said, and Mira laughed before admitting, "I was wrong. I am sorry."', "Mira trusted Rowan, refused the easy escape and they stopped the saboteur together."] },
    ],
    scenes: [],
  };
}

test("the authoring pipeline creates spine and logic before prose", () => {
  const spineCall = storyDraftSource.indexOf("await generateStorySpine");
  const planCall = storyDraftSource.indexOf("await generatePickPathPlan");
  const momentsCall = storyDraftSource.indexOf("await generateBestMomentsPlan");
  const signatureCall = storyDraftSource.indexOf("await generateSignatureMomentsPlan");
  const proseCall = storyDraftSource.indexOf("await generateFullChapterStory");
  assert.ok(spineCall > -1);
  assert.ok(spineCall < planCall);
  assert.ok(planCall < momentsCall);
  assert.ok(momentsCall < signatureCall);
  assert.ok(signatureCall < proseCall);
});

test("quality validation accepts three clue-grounded decisions and hooked chapters", async () => {
  const { validateStoryQuality } = await qualityModule;
  const result = validateStoryQuality(qualityFixture());
  assert.equal(result.metrics.decisionCount, 3);
  assert.equal(result.metrics.ungroundedDecisions, 0);
  assert.equal(result.metrics.flatChapterEndings, 0);
  assert.equal(result.errors.length, 0);
});

test("quality validation rejects a decision without a planted clue", async () => {
  const { validateStoryQuality } = await qualityModule;
  const fixture = qualityFixture();
  fixture.logicPlan.decisions[1].helpfulClueId = "";
  fixture.logicPlan.decisions[1].clueReferences = [];
  const result = validateStoryQuality(fixture);
  assert.equal(result.metrics.ungroundedDecisions, 1);
  assert.match(result.errors.join(" "), /reference a clue planted earlier/i);
});

test("quality validation rejects prose that exposes the hidden framework", async () => {
  const { validateStoryQuality } = await qualityModule;
  const fixture = qualityFixture();
  fixture.chapters[0].paragraphs.unshift("Mira's emotional need was to accept help, but her character flaw made that difficult.");
  const result = validateStoryQuality(fixture);
  assert.match(result.errors.join(" "), /exposes hidden story framework/i);
});

test("quality validation reports dialogue, tension and spectacle metrics", async () => {
  const { validateStoryQuality } = await qualityModule;
  const result = validateStoryQuality(qualityFixture());
  assert.ok(result.metrics.dialogueRatio > 0);
  assert.equal(typeof result.metrics.lowTensionChapters, "number");
  assert.equal(typeof result.metrics.lowSpectacleChapters, "number");
});

test("payoff validation requires three different emotional decision types", async () => {
  const { validateStoryPayoffs } = await payoffModule;
  const fixture = qualityFixture();
  const result = validateStoryPayoffs(
    fixture,
    fixture.bestMomentsPlan,
    fixture.logicPlan.clues,
    fixture.logicPlan.decisions,
  );
  assert.equal(result.metrics.distinctDecisionTypes, 3);
  assert.equal(result.metrics.tacticalChoices, 0);
  assert.equal(result.errors.length, 0);
});

test("payoff validation catches unresolved endings and repeated decision types", async () => {
  const { validateStoryPayoffs } = await payoffModule;
  const fixture = qualityFixture();
  fixture.logicPlan.decisions.forEach((decision) => { decision.decisionType = "trust_choice"; });
  fixture.chapters.at(-1).paragraphs.push("The real adventure had just begun, and danger was coming.");
  const result = validateStoryPayoffs(
    fixture,
    fixture.bestMomentsPlan,
    fixture.logicPlan.clues,
    fixture.logicPlan.decisions,
  );
  assert.equal(result.metrics.distinctDecisionTypes, 1);
  assert.match(result.errors.join(" "), /three emotionally different decision types/i);
  assert.match(result.errors.join(" "), /postpones the immediate resolution/i);
});

test("prose cleanup limits repeated AI-style emotional phrasing", async () => {
  const { removeFrameworkLanguage } = await payoffModule;
  const cleaned = removeFrameworkLanguage({
    chapters: [{ paragraphs: [
      "The world narrowed as Mira reached the gate.",
      "The world narrowed when Rowan shouted.",
      "The world narrowed one final time.",
    ] }],
  });
  const text = cleaned.chapters[0].paragraphs.join(" ");
  assert.equal((text.match(/the world narrowed/gi) || []).length, 1);
});

test("Best Moments failure has a deterministic legacy fallback", () => {
  assert.match(storyDraftSource, /fallbackBestMomentsPlan/);
  assert.match(storyDraftSource, /catch \{\}/);
  assert.match(storyDraftSource, /suppliedMoments\.biggestReveal/);
});

test("Signature Moments plan contains every required memorable beat", () => {
  const required = [
    "wowMoment1", "wowMoment2", "biggestReveal", "mostEmotionalMoment",
    "mostShockingBetrayal", "coolestLocation", "coolestCreatureOrEntity",
    "mostDifficultChoice", "funniestOrWarmestMoment", "mostIllustratableScene",
    "finaleSpectacle",
  ];
  const fixture = qualityFixture();
  assert.ok(required.every((key) => fixture.signatureMomentsPlan[key]));
  assert.match(storyDraftSource, /fallbackSignaturePlanning/);
});

test("signature validation finds an early wow moment, impossible location, entity and varied hero behaviour", async () => {
  const { validateSignatureMoments } = await signatureModule;
  const fixture = qualityFixture();
  const result = validateSignatureMoments(
    fixture,
    fixture.signatureMomentsPlan,
    fixture.storyLocations,
    fixture.emotionalRhythmPlan,
  );
  assert.equal(result.metrics.earlyWowDetected, true);
  assert.equal(result.metrics.impossibleLocationCount, 1);
  assert.ok(result.metrics.heroBehaviourCount >= 4);
  assert.ok(result.metrics.emotionalToneCount >= 5);
});

test("natural decision setup creates dramatic prose without UI instructions", async () => {
  const { naturalizeDecisionSetup } = await signatureModule;
  const fixture = qualityFixture();
  const setup = naturalizeDecisionSetup(
    fixture.logicPlan.decisions[0],
    '"The seal is backwards," Rowan said. "Someone forged this."',
  );
  assert.match(setup, /Rowan/);
  assert.match(setup, /price|danger|cost|stop/i);
  assert.doesNotMatch(setup, /do you choose|three options|select an option|what will you do/i);
});

test("signature prose cleanup reduces repeated engine-visible phrases", async () => {
  const { cleanEngineVisibleLanguage } = await signatureModule;
  const cleaned = cleanEngineVisibleLanguage({
    chapters: [{ paragraphs: [
      "The choice stood before her. The world narrowed.",
      "The choice stood before her again. The world narrowed.",
      "She had to decide. The world narrowed.",
    ] }],
  });
  const text = cleaned.chapters[0].paragraphs.join(" ");
  assert.ok((text.match(/the choice stood before her/gi) || []).length <= 1);
  assert.ok((text.match(/the world narrowed/gi) || []).length <= 1);
});

test("emotional rhythm fallback always includes warmth, wonder, betrayal and triumph", async () => {
  const { generateEmotionalRhythmPlan } = await signatureModule;
  const plan = generateEmotionalRhythmPlan(6);
  const tones = plan.flatMap((beat) => [beat.primaryTone, beat.secondaryTone]).join(" ");
  assert.equal(plan.length, 6);
  assert.match(tones, /warmth/);
  assert.match(tones, /wonder/);
  assert.match(tones, /betrayal/);
  assert.match(tones, /triumph/);
});

test("long story stages use background responses instead of open HTTP waits", () => {
  assert.match(storyDraftSource, /background,\s*\n\s*store: true/);
  assert.match(storyDraftSource, /retrieveBackgroundResponse/);
  assert.match(storyDraftSource, /providerResponseId/);
  assert.match(storyDraftSource, /story_draft_background/);
});

test("fallback decisions are bounded, specific, and free of old generic wording", () => {
  const plan = decisionEngine.deterministicFallbackPlan(
    Array.from({ length: 16 }, (_, index) => `scene-${index + 1}`),
    {
      heroName: "Mira",
      worldName: "Clockhaven",
      supportingCharacters: ["Rowan", "Tavi"],
      centralMystery: "who forged the evacuation order",
      antagonisticForce: "the masked clockmaker",
    },
  );
  const text = JSON.stringify(plan);
  assert.equal(plan.decisions.length, 3);
  assert.ok(plan.decisions.every((decision) => decision.helpfulClueId));
  assert.doesNotMatch(text, /what should happen next|who has earned the hero|which risk is worth|act on the evidence|take the dangerous route/i);
  assert.match(text, /Mira|Clockhaven|Rowan|Tavi/);
});

test("scene visuals use exact decision evidence without generic labels", () => {
  const prompt = buildSceneVisualPrompt({
    storyTitle: "The Clockhaven Warning",
    world: { name: "Clockhaven", description: "A rain-lit city of brass bridges and clock towers." },
    characters: [{ name: "Mira", prompt: "A young engineer in a red raincoat." }],
    scene: {
      passage: "Mira holds up the reversed wax seal while Rowan blocks the north gate.",
      mood: "Mystery",
      camera: "Close Up",
      decisionNode: {
        decisionType: "trust_choice",
        whatPlayerKnows: "The reversed wax seal proves the evacuation order was forged.",
      },
    },
    sceneIndex: 4,
  });
  assert.match(prompt, /reversed wax seal/i);
  assert.match(prompt, /trust_choice/i);
  assert.doesNotMatch(prompt, /\bthe hero\b|\bstory world\b/i);
});

test("scene splitting instructions preserve approved prose", () => {
  assert.match(storyDraftSource, /Preserve every approved paragraph and spoken line/);
  assert.match(storyDraftSource, /Scene passages must quote or closely preserve the matching prose/);
});
