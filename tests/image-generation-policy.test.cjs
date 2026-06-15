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

test("scene images default to FLUX.2 Pro generation", async () => {
  const { sceneImageMode } = await policyModule;
  assert.deepEqual(sceneImageMode(), {
    id: "draft",
    label: "Draft",
    provider: "black_forest_labs",
    model: "flux-2-pro-preview",
    quality: "production",
    size: "1344x768",
    credits: 1,
    estimatedCostUsd: 0.045,
  });
});

test("final scene images use FLUX.2 Pro with the premium credit tier", async () => {
  const { sceneImageMode } = await policyModule;
  assert.deepEqual(sceneImageMode("final"), {
    id: "final",
    label: "Final",
    provider: "black_forest_labs",
    model: "flux-2-pro-preview",
    quality: "production",
    size: "1344x768",
    credits: 24,
    estimatedCostUsd: 0.045,
  });
});

test("unknown image modes cannot select an arbitrary provider model", async () => {
  const { sceneImageMode } = await policyModule;
  assert.equal(sceneImageMode("gpt-image-2").id, "draft");
});

test("story test mode cannot request final-quality scene artwork", async () => {
  const { sceneImageMode } = await policyModule;
  assert.equal(sceneImageMode("final", { testMode: true }).id, "draft");
  assert.equal(sceneImageMode("draft", { testMode: true }).model, "flux-2-pro-preview");
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
  assert.match(source, /storyTestQueryApplied/);
  assert.match(source, /setStoryImageMode\("mock"\)/);
  assert.match(source, /recoverQueuedScenesAsMocks/);
  assert.match(source, /finalOption\.disabled = testMode/);
  assert.match(source, /generateAllTestScenes/);
});

test("slow FLUX jobs resume one provider request instead of creating replacements", () => {
  const source = fs.readFileSync(path.join(__dirname, "../functions/api/story-scene-images.js"), "utf8");
  assert.match(source, /bflPollingAttempts/);
  assert.match(source, /body\.bflPollingUrl = error\.pollingUrl/);
  assert.match(source, /PROVIDER_POLL_SLICE_MS = 25000/);
  assert.doesNotMatch(source, /body\.bflFallbackUsed = true/);
  assert.doesNotMatch(source, /body\.referenceImages = \[\]/);
});

test("scene prompts normalize harmless wording that commonly trips provider moderation", () => {
  const source = fs.readFileSync(path.join(__dirname, "../functions/api/story-scene-images.js"), "utf8");
  assert.match(source, /providerSafeSceneText/);
  assert.match(source, /overwhelmingly exuberant/);
});

test("the scheduled image worker recovers queued and processing scene jobs", () => {
  const source = fs.readFileSync(path.join(__dirname, "../workers/image-queue/src/index.js"), "utf8");
  assert.match(source, /recoverable/);
  assert.match(source, /status = 'processing'/);
  assert.match(source, /OPREALM_GENERATION_QUEUE\.send/);
  assert.match(source, /recoveryAttempts/);
});

test("scene workers atomically claim jobs and checkpoint stored results before charging", () => {
  const source = fs.readFileSync(path.join(__dirname, "../functions/api/story-scene-images.js"), "utf8");
  assert.match(source, /AND status = 'queued'/);
  assert.match(source, /Another worker claimed this scene/);
  assert.match(source, /SET result_json = \?/);
  assert.match(source, /finalizeStoredSceneImage/);
  assert.doesNotMatch(source, /OR provider_generation_slots\.job_id = excluded\.job_id/);
});

test("the browser converts saved character and world URLs into provider references", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/creator-flow.js"), "utf8");
  assert.match(source, /async function storyboardReferenceImages/);
  assert.match(source, /async function referenceImageDataUrl/);
  assert.match(source, /credentials: "include"/);
  assert.match(source, /referenceImages: await storyboardReferenceImages/);
});

test("story projects sync to authenticated account storage", () => {
  const client = fs.readFileSync(path.join(__dirname, "../public/creator-flow.js"), "utf8");
  const api = fs.readFileSync(path.join(__dirname, "../functions/api/story-project.js"), "utf8");
  assert.match(client, /queueStoryProjectCloudSave/);
  assert.match(client, /loadStoryProjectFromCloud/);
  assert.match(client, /fetch\("\/api\/story-project"/);
  assert.match(api, /requireUser/);
  assert.match(api, /story-projects\//);
  assert.match(api, /creator_projects/);
});
