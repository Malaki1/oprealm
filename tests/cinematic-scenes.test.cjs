const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const cinematicModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/cinematic-scenes.mjs"),
).href);

function fixture() {
  const chapters = [
    {
      title: "The Broken Market",
      paragraphs: [
        'Lycora sprinted through the rain-soaked Blood Bazaar as iron shutters crashed behind him. "Mara, move!" he shouted.',
        "The Blood Bazaar hung upside-down from rusted chains above a red storm, its lantern streets swaying over empty sky.",
        "Beneath a market stall, Lycora found a torn leather map with silver ink hidden under wet straw.",
      ],
    },
    {
      title: "The Gate",
      paragraphs: [
        '"You lied to us," Mara said, spear raised. Lycora held the torn map between them while guards closed both exits.',
        "The Bridge Warden, a clockwork wolf with a bell-shaped chest, tore through the gate and charged across the bridge.",
        '"If we expose Kade, the prisoners lose their only guide," Mara warned. "If we stay silent, the gates open for the enemy."',
      ],
    },
    {
      title: "The Heart-Bolt",
      paragraphs: [
        "Kade revealed that he had forged the royal seal to hide the prisoners from the vampire court.",
        "The Iron Gates unfolded like the ribs of a waking titan as the Heart-Bolt filled the storm with red aurora light.",
        'Lycora lowered his weapon and reached for Mara. "We open it together," he said. The prisoners crossed safely as dawn returned.',
      ],
    },
  ];
  return {
    chapters,
    spine: {
      characterVoiceProfiles: [
        { characterName: "Lycora" },
        { characterName: "Mara" },
        { characterName: "Kade" },
      ],
    },
    plan: {
      clues: [{ id: "clue-map", visualObject: "torn leather map", clueText: "Silver ink reveals the prison route." }],
      decisions: [{
        id: "decision-gate",
        questionText: "Expose Kade or protect the prisoners?",
        choices: [{ label: "Expose Kade" }, { label: "Protect the prisoners" }],
      }],
    },
    signature: {
      coolestLocation: "Blood Bazaar",
      coolestCreatureOrEntity: "Bridge Warden",
      mostShockingBetrayal: "Kade forged the royal seal",
      finaleSpectacle: "The Iron Gates unfold like a waking titan under red aurora light",
    },
  };
}

test("scene scoring prioritises cinematic action over internal reflection", async () => {
  const { scoreStoryMomentForScene } = await cinematicModule;
  const action = scoreStoryMomentForScene({
    text: "Lycora sprinted across the burning bridge while the Bridge Warden charged through falling iron.",
    charactersPresent: ["Lycora"],
    isChapterEnding: true,
  });
  const reflection = scoreStoryMomentForScene({
    text: "Lycora wondered whether he had understood the difficult events correctly.",
    charactersPresent: ["Lycora"],
  });
  assert.ok(action > reflection);
});

test("cinematic extraction covers the story without forcing a preset scene count", async () => {
  const { extractCinematicScenes } = await cinematicModule;
  const data = fixture();
  const scenes = extractCinematicScenes(data.chapters, data.spine, data.plan, data.signature);
  const types = new Set(scenes.map((scene) => scene.sceneType));
  assert.ok(scenes.length >= 6);
  assert.notEqual(scenes.length, 10);
  assert.ok(types.has("opening_hook"));
  assert.ok(types.has("clue_discovery"));
  assert.ok(types.has("action_chase") || types.has("creature_reveal"));
  assert.ok(types.has("betrayal_reveal"));
  assert.ok(types.has("final_spectacle") || types.has("resolution"));
});

test("scene extraction preserves approved passages verbatim", async () => {
  const { extractCinematicScenes } = await cinematicModule;
  const data = fixture();
  const approved = new Set(data.chapters.flatMap((chapter) => chapter.paragraphs));
  const scenes = extractCinematicScenes(data.chapters, data.spine, data.plan, data.signature);
  assert.ok(scenes.every((scene) => approved.has(scene.sourcePassage)));
});

test("clue metadata carries the actual clue object into the scene", async () => {
  const { extractCinematicScenes } = await cinematicModule;
  const data = fixture();
  const scenes = extractCinematicScenes(data.chapters, data.spine, data.plan, data.signature);
  const clueScene = scenes.find((scene) => scene.sceneType === "clue_discovery");
  assert.equal(clueScene.keyObject, "torn leather map");
  assert.deepEqual(clueScene.clueIds, ["clue-map"]);
});

test("scene set validation detects varied cinematic coverage", async () => {
  const { extractCinematicScenes, validateCinematicSceneSet } = await cinematicModule;
  const data = fixture();
  const scenes = extractCinematicScenes(data.chapters, data.spine, data.plan, data.signature);
  const result = validateCinematicSceneSet(scenes);
  assert.ok(result.metrics.sceneCount >= 6);
  assert.ok(result.metrics.distinctCameras >= 3);
});
