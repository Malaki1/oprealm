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

function qualityFixture() {
  const decisions = Array.from({ length: 3 }, (_, index) => ({
    id: `decision-${index + 1}`,
    questionText: `Will Mira follow the ${["cracked compass", "mud-marked map", "reversed wax seal"][index]} or protect Rowan?`,
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
        { id: "clue-1", clueText: "The cracked compass points toward the sealed north gate.", visualObject: "cracked brass compass" },
        { id: "clue-2", clueText: "Red marsh mud stains the supposedly unused route map.", visualObject: "mud-marked route map" },
        { id: "clue-3", clueText: "The warning bears a wax seal stamped with its crest backwards.", visualObject: "reversed wax seal" },
      ],
    },
    chapters: [
      { paragraphs: ['"Wait," Rowan said. "The compass is pointing north!"', "Their first plan failed when the bridge collapsed, but footsteps sounded behind them."] },
      { paragraphs: ['"The mud came from the marsh," Mira answered. "Someone used this map today."', "The gate opened until a masked rider appeared!"] },
      { paragraphs: ['"The seal is backwards," Rowan said. "The warning was forged."', "Mira finally accepted Rowan's help and they stopped the saboteur."] },
    ],
    scenes: [],
  };
}

test("the authoring pipeline creates spine and logic before prose", () => {
  const spineCall = storyDraftSource.indexOf("await generateStorySpine");
  const planCall = storyDraftSource.indexOf("await generatePickPathPlan");
  const proseCall = storyDraftSource.indexOf("await generateFullChapterStory");
  assert.ok(spineCall > -1);
  assert.ok(spineCall < planCall);
  assert.ok(planCall < proseCall);
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
