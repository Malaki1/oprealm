const test = require("node:test");
const assert = require("node:assert/strict");
const narration = require("../public/storybook-narration.js");

const characters = [
  { name: "Shark Girl", traits: ["brave", "kind"] },
  { name: "Kora", type: "Sea Pup", traits: ["playful"] },
];

test("parses narration and quoted dialogue into ordered beats", () => {
  const beats = narration.parseStorySceneIntoNarrationBeats(
    'Shark Girl reached the gate. "Stay close," Shark Girl said. Kora nodded. "I am right here," Kora replied.',
    characters,
    "scene-2",
  );
  assert.deepEqual(beats.map((beat) => beat.order), [1, 2, 3, 4]);
  assert.deepEqual(beats.map((beat) => beat.type), ["narration", "dialogue", "narration", "dialogue"]);
  assert.equal(beats[1].speaker, "Shark Girl");
  assert.equal(beats[3].speaker, "Kora");
  assert.equal(beats[0].id, "scene-2-beat-1");
});

test("assigns an unknown quote to the narrator instead of guessing the hero", () => {
  const beats = narration.parseStorySceneIntoNarrationBeats(
    '"We should cross before sunset." The bridge shook beneath them.',
    characters,
    "scene-3",
  );
  assert.equal(beats[0].speaker, "Narrator");
  assert.equal(beats[0].type, "dialogue");
});

test("chunks long narration without changing story order", () => {
  const source = Array.from({ length: 80 }, (_, index) => `word${index}`).join(" ") + ".";
  const beats = narration.parseStorySceneIntoNarrationBeats(source, characters, "scene-long");
  assert.ok(beats.length > 1);
  assert.ok(beats.every((beat) => beat.text.length <= 260));
  assert.equal(beats.map((beat) => beat.text).join(" ").replace(/\s+/g, " "), source);
});

test("assigns distinct narrator and hero voice profiles", () => {
  const profiles = narration.assignVoiceProfiles(characters, "5-7", "magical");
  const narrator = profiles.find((profile) => profile.speaker === "Narrator");
  const hero = profiles.find((profile) => profile.speaker === "Shark Girl");
  assert.ok(narrator.voiceId);
  assert.ok(hero.voiceId);
  assert.notEqual(narrator.voiceId, hero.voiceId);
  assert.match(narrator.deliveryDirection, /warm/i);
  assert.match(hero.deliveryDirection, /brave/i);
});

test("a named supporting speaker never receives the hero voice", () => {
  const profiles = narration.assignVoiceProfiles(characters, "7-10", "adventure");
  const beats = narration.applyVoiceProfiles([
    {
      id: "scene-1-beat-1",
      sceneId: "scene-1",
      order: 1,
      type: "dialogue",
      speaker: "Kora",
      text: "The tide is changing.",
      emotion: "urgent",
    },
  ], profiles);
  const heroVoice = profiles.find((profile) => profile.speaker === "Shark Girl").voiceId;
  assert.notEqual(beats[0].voiceId, heroVoice);
  assert.equal(beats[0].speaker, "Kora");
});

test("voice selection respects saved character gender, age and type", () => {
  const profiles = narration.assignVoiceProfiles([
    { name: "Daenarys", gender: "Girl", age: 16, characterType: "Dragon Warrior" },
    { name: "Jorren", gender: "Boy", age: 17, characterType: "Dragon Keeper" },
    { name: "Ember", gender: "Other", characterType: "Dragon Companion" },
  ], "7-10", "epic");
  const daenarys = profiles.find((profile) => profile.speaker === "Daenarys");
  const jorren = profiles.find((profile) => profile.speaker === "Jorren");
  const ember = profiles.find((profile) => profile.speaker === "Ember");
  assert.equal(daenarys.gender, "female");
  assert.equal(jorren.gender, "male");
  assert.equal(ember.gender, "neutral");
  assert.notEqual(daenarys.voiceId, jorren.voiceId);
  assert.match(daenarys.deliveryDirection, /dragon warrior/i);
  assert.match(jorren.deliveryDirection, /dragon keeper/i);
});

test("nearest named cast member owns an unattributed quote in existing prose", () => {
  const beats = narration.parseStorySceneIntoNarrationBeats(
    'Daenarys stepped between the hatchling and the fire. "Stay behind me. I know how to calm it."',
    [{ name: "Daenarys" }, { name: "Jorren" }],
    "legacy-scene",
  );
  assert.equal(beats.find((beat) => beat.type === "dialogue").speaker, "Daenarys");
});

test("audio generation hashes are stable and include voice direction", async () => {
  const first = await narration.audioGenerationHash("Hello there.", "voice-1", "warm");
  const second = await narration.audioGenerationHash("Hello there.", "voice-1", "warm");
  const different = await narration.audioGenerationHash("Hello there.", "voice-2", "warm");
  assert.equal(first, second);
  assert.notEqual(first, different);
});

test("delivery directions remain metadata rather than story dialogue", () => {
  const profiles = narration.assignVoiceProfiles(characters, "7-10", "adventure");
  const beats = narration.applyVoiceProfiles([
    {
      id: "scene-1-beat-1",
      sceneId: "scene-1",
      order: 1,
      type: "dialogue",
      speaker: "Shark Girl",
      text: "Stay behind me. I know a safe path.",
      emotion: "urgent",
    },
  ], profiles);
  assert.match(beats[0].deliveryDirection, /brave/i);
  assert.equal(beats[0].text, "Stay behind me. I know a safe path.");
  assert.doesNotMatch(beats[0].text, /brave, calm, and protective/i);
});

test("failed generation preserves text-only mode", () => {
  const fallback = narration.narrationFallback(new Error("Provider unavailable"));
  assert.equal(fallback.status, "failed");
  assert.equal(fallback.textOnly, true);
  assert.equal(fallback.message, "Provider unavailable");
});

test("autoplay advances beats and scenes but stops for choices", () => {
  assert.deepEqual(
    narration.nextPlaybackPosition({ pageIndex: 0, beatIndex: 0, beatCount: 3, pageCount: 4, hasChoices: false }),
    { pageIndex: 0, beatIndex: 1, stopped: false, sceneChanged: false },
  );
  assert.deepEqual(
    narration.nextPlaybackPosition({ pageIndex: 0, beatIndex: 2, beatCount: 3, pageCount: 4, hasChoices: false }),
    { pageIndex: 1, beatIndex: 0, stopped: false, sceneChanged: true },
  );
  assert.equal(
    narration.nextPlaybackPosition({ pageIndex: 1, beatIndex: 1, beatCount: 2, pageCount: 4, hasChoices: true }).stopped,
    true,
  );
});
