const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSceneVisualPrompt,
  buildSceneVisualPromptSummary,
  createContinuityBible,
} = require("../public/scene-visual-prompt.js");

function fixture(overrides = {}) {
  const world = {
    name: "Clockhaven",
    description: "A rain-slick 1980s cyberpunk transit city built around the frozen Neon Clock, brass rail platforms and purple crystal-powered machinery.",
    theme: "1980s cyberpunk mystery",
    mood: ["Mystery", "Neon"],
  };
  const characters = [{
    name: "Bucky",
    characterAge: 12,
    characterType: "young inventor",
    prompt: "A slim kid with messy brown hair, bright hazel eyes and a glowing mechanical augment arm.",
    customOutfit: "orange utility jacket, dark cargo trousers and reinforced neon sneakers",
    accessories: ["utility backpack", "brass scanner"],
    palette: ["orange", "charcoal", "purple"],
    masterStyle: "premium stylized 3D animated adventure",
  }];
  const continuityBible = createContinuityBible({
    world,
    characters,
    objects: ["cracked brass gear", "Neon Clock"],
    visualStyle: characters[0].masterStyle,
    storyType: "mystery",
  });
  return {
    storyTitle: "The Clock That Forgot Tomorrow",
    world,
    characters,
    approvedFullStory: "Bucky reaches Platform Seven after every clock in the city stops.",
    scene: {
      title: "Platform Silence",
      storyExcerpt: "Bucky kneels beside a cracked brass gear glowing with purple crystal dust and reaches toward it with his mechanical augment arm. Rain runs across the silent platform beneath the frozen Neon Clock.",
      mood: "Mystery",
      camera: "Low Angle",
      selectedObjects: ["cracked brass gear", "Neon Clock"],
    },
    sceneIndex: 1,
    ageBand: "ages 8-12",
    visualStyle: characters[0].masterStyle,
    continuityBible,
    ...overrides,
  };
}

test("builds a concrete cinematic scene prompt", () => {
  const prompt = buildSceneVisualPrompt(fixture());
  const wordCount = prompt.split(/\s+/).length;

  assert.doesNotMatch(prompt, /\bthe hero\b/i);
  assert.doesNotMatch(prompt, /\bstory world\b/i);
  assert.match(prompt, /\bBucky\b/);
  assert.match(prompt, /\bClockhaven\b/);
  assert.match(prompt, /premium stylized 3D animated adventure/i);
  assert.match(prompt, /kneels beside a cracked brass gear/i);
  assert.match(prompt, /Low Angle/i);
  assert.match(prompt, /moonlit contrast|fog|light/i);
  assert.match(prompt, /Continuity lock: use the same character design as previous scenes/i);
  assert.ok(wordCount >= 120, `expected at least 120 words, got ${wordCount}`);
  assert.ok(wordCount <= 220, `expected no more than 220 words, got ${wordCount}`);
});

test("creates a short named UI summary", () => {
  const summary = buildSceneVisualPromptSummary(fixture());
  assert.match(summary, /^Bucky kneels beside a cracked brass gear/i);
  assert.doesNotMatch(summary, /\bthe hero\b|\bstory world\b/i);
  assert.ok(summary.split(/[.!?]/).filter(Boolean).length <= 2);
});

test("camera and mood choices modify the full prompt", () => {
  const base = fixture();
  const mysteryPrompt = buildSceneVisualPrompt(base);
  const actionPrompt = buildSceneVisualPrompt({
    ...base,
    scene: { ...base.scene, mood: "Action", camera: "Tracking Shot" },
  });

  assert.notEqual(actionPrompt, mysteryPrompt);
  assert.match(actionPrompt, /Tracking Shot/);
  assert.match(actionPrompt, /sparks|high-contrast directional lighting/i);
});

test("manual visual direction becomes the visible action", () => {
  const base = fixture();
  const prompt = buildSceneVisualPrompt({
    ...base,
    scene: {
      ...base.scene,
      userVisualDirection: "Bucky slides beneath a closing brass gate while shielding his scanner from falling sparks.",
    },
  });

  assert.match(prompt, /Bucky slides beneath a closing brass gate/i);
  assert.doesNotMatch(prompt, /\bthe hero\b|\bstory world\b/i);
});
