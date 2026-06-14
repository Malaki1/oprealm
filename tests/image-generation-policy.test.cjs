const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const policyModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/image-generation-policy.js"),
));
const jobsModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/generation-jobs.js"),
));
const fs = require("node:fs");

test("scene images default to low-cost draft generation", async () => {
  const { sceneImageMode } = await policyModule;
  assert.deepEqual(sceneImageMode(), {
    id: "draft",
    label: "Draft",
    model: "gpt-image-1-mini",
    quality: "low",
    size: "1536x1024",
    credits: 1,
    estimatedCostUsd: 0.006,
  });
});

test("final scene images preserve the existing premium settings", async () => {
  const { sceneImageMode } = await policyModule;
  assert.deepEqual(sceneImageMode("final"), {
    id: "final",
    label: "Final",
    model: "gpt-image-1.5",
    quality: "high",
    size: "1536x1024",
    credits: 24,
    estimatedCostUsd: 0.2,
  });
});

test("unknown image modes cannot select an arbitrary provider model", async () => {
  const { sceneImageMode } = await policyModule;
  assert.equal(sceneImageMode("gpt-image-2").id, "draft");
});

test("story test mode cannot request final-quality scene artwork", async () => {
  const { sceneImageMode } = await policyModule;
  assert.equal(sceneImageMode("final", { testMode: true }).id, "draft");
  assert.equal(sceneImageMode("draft", { testMode: true }).model, "gpt-image-1-mini");
});

test("cached image responses never report a second credit charge", async () => {
  const { jobResponse } = await jobsModule;
  const response = jobResponse({
    id: "cached-job",
    status: "completed",
    tool: "story_scene_images",
    credits_charged: 24,
    error: "",
    result_json: JSON.stringify({ webImageUrl: "/cached.png", creditsUsed: 24 }),
  }, { cached: true });

  assert.equal(response.cached, true);
  assert.equal(response.creditsUsed, 0);
  assert.equal(response.creditsSaved, 24);
});

test("story test mode defaults to free mock images and blocks accidental final artwork", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/creator-flow.js"), "utf8");
  assert.match(source, /STORY_TEST_MODE_KEY/);
  assert.match(source, /storyTestMode\(\) \? "mock" : "draft"/);
  assert.match(source, /finalOption\.disabled = testMode/);
  assert.match(source, /generateAllTestScenes/);
});
