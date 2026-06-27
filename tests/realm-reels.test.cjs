const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const reelsModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/realm-reels.mjs"),
));

test("ReelSeed generation creates a strict short-form seed", async () => {
  const { generateReelSeed } = await reelsModule;
  const seed = generateReelSeed({ genre: "mystery", templateId: "who-is-lying", durationSeconds: 60 });
  assert.equal(seed.genre, "mystery");
  assert.equal(seed.durationSeconds, 60);
  assert.equal(seed.decisionTreeSeed.startingChoiceCount, 2);
  assert.equal(seed.characterSeed.characters.length, 3);
});

test("decision tree generation creates choices, outcomes and endings", async () => {
  const { generateReelSeed, generateReelDecisionTree } = await reelsModule;
  const tree = generateReelDecisionTree(generateReelSeed({ genre: "fantasy" }));
  assert.ok(tree.decisions.length >= 2);
  assert.ok(tree.decisions.every((node) => node.options.length >= 2));
  assert.equal(tree.outcomes.length, 2);
  assert.equal(tree.endings.length, 3);
});

test("storyboard frame count follows duration rules", async () => {
  const { generateRealmReel } = await reelsModule;
  assert.ok(generateRealmReel({ durationSeconds: 30 }).storyboard.length >= 6);
  assert.ok(generateRealmReel({ durationSeconds: 30 }).storyboard.length <= 8);
  assert.ok(generateRealmReel({ durationSeconds: 60 }).storyboard.length >= 10);
  assert.ok(generateRealmReel({ durationSeconds: 60 }).storyboard.length <= 13);
  assert.ok(generateRealmReel({ durationSeconds: 90 }).storyboard.length >= 14);
  assert.ok(generateRealmReel({ durationSeconds: 90 }).storyboard.length <= 18);
});

test("every genre creates its required retention beats", async () => {
  const { REEL_GENRES, generateRealmReel } = await reelsModule;
  for (const genre of REEL_GENRES) {
    const reel = generateRealmReel({ genre });
    const text = JSON.stringify(reel).toLowerCase();
    assert.ok(text.includes("clue") || text.includes("choice") || text.includes("truth"));
    assert.ok(reel.storyboard.some((frame) => frame.frameType === "twist"));
    assert.equal(reel.storyboard.at(-1).frameType, "cta");
  }
});

test("CTA generation covers the OPRealm funnel", async () => {
  const { generateReelCTA } = await reelsModule;
  assert.equal(generateReelCTA("play_full_story").targetUrl, "/storyboard");
  assert.equal(generateReelCTA("make_this_reel").targetUrl, "/realmreels/create");
});

test("reelSeedToStorySeed preserves world, characters and conflict", async () => {
  const { generateReelSeed, reelSeedToStorySeed } = await reelsModule;
  const story = reelSeedToStorySeed(generateReelSeed({ genre: "survival" }));
  assert.equal(story.storyGenre, "survival");
  assert.equal(story.characters.length, 3);
  assert.ok(story.mainConflict.length > 10);
});

test("story adapters create requested marketing reel counts", async () => {
  const { storyToMarketingReels } = await reelsModule;
  const reels = storyToMarketingReels({ id: crypto.randomUUID(), title: "Dragon Story", genre: "fantasy" }, { generateCount: 5 }, "story_game");
  assert.equal(reels.length, 5);
  assert.ok(reels.every((reel) => reel.seed.sourceType === "story_game"));
});

test("image and video prompts pass retention prompt validation", async () => {
  const { generateRealmReel, validateImagePrompt, validateVideoPrompt } = await reelsModule;
  const reel = generateRealmReel({ genre: "horror" });
  assert.ok(reel.storyboard.every((frame) => validateImagePrompt(frame.imagePrompt).valid));
  assert.ok(reel.storyboard.every((frame) => validateVideoPrompt(frame.videoPrompt).valid));
});

test("under-13 dating becomes friendship-safe", async () => {
  const { generateReelSeed } = await reelsModule;
  const seed = generateReelSeed({ genre: "dating", ageBand: "8-10" });
  assert.match(seed.safetyNotes, /friendship|school crush|fairytale/i);
  assert.doesNotMatch(JSON.stringify(seed), /sexualized scenario/i);
});

test("horror generation prevents gore", async () => {
  const { generateRealmReel } = await reelsModule;
  const reel = generateRealmReel({ genre: "horror", idea: "spooky forest choice" });
  assert.match(reel.seed.safetyNotes, /no gore/i);
  assert.doesNotMatch(JSON.stringify(reel.storyboard), /graphic gore|dismember/i);
});

test("9:16 preview data and mock export are generated", async () => {
  const { generateRealmReel, createMockExport } = await reelsModule;
  const reel = generateRealmReel({});
  assert.equal(reel.aspectRatio, "9:16");
  const job = createMockExport(reel);
  assert.equal(job.status, "ready");
  assert.equal(job.aspectRatio, "9:16");
  assert.match(job.outputUrl, /realmreels\/preview/);
});

test("analytics events are structured", async () => {
  const { analyticsEvent } = await reelsModule;
  const event = analyticsEvent("reel-1", "reel_previewed", { frame: 2 });
  assert.equal(event.eventType, "reel_previewed");
  assert.equal(event.metadata.frame, 2);
  assert.ok(event.createdAt);
});
