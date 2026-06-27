const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const modelsModule = import(pathToFileURL(
  path.join(__dirname, "../functions/_lib/image-comparison-models.js"),
));

test("comparison lab exposes the supported OpenAI, Google and BFL models", async () => {
  const { IMAGE_COMPARISON_MODELS } = await modelsModule;
  assert.equal(IMAGE_COMPARISON_MODELS.length, 9);
  assert.deepEqual(
    [...new Set(IMAGE_COMPARISON_MODELS.map((item) => item.provider))],
    ["OpenAI", "Google", "Black Forest Labs"],
  );
});

test("comparison model selection preserves allowlist order and ignores unknown ids", async () => {
  const { selectedComparisonModels } = await modelsModule;
  const selected = selectedComparisonModels([
    "bfl-flux-2-pro",
    "unknown-expensive-model",
    "openai-gpt-image-2-low",
  ]);
  assert.deepEqual(selected.map((item) => item.id), [
    "openai-gpt-image-2-low",
    "bfl-flux-2-pro",
  ]);
});

test("comparison model ids and costs are valid", async () => {
  const { IMAGE_COMPARISON_MODELS } = await modelsModule;
  assert.equal(new Set(IMAGE_COMPARISON_MODELS.map((item) => item.id)).size, IMAGE_COMPARISON_MODELS.length);
  assert.ok(IMAGE_COMPARISON_MODELS.every((item) => item.cost > 0 && item.cost <= 0.2));
});
