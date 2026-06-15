const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.join(__dirname, "../functions/_lib/bfl-images.js"),
);

test("FLUX helper submits references, polls, and downloads the generated image", async () => {
  const { generateBflImage } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        id: "request-1",
        polling_url: "https://api.bfl.ai/v1/get_result?id=request-1",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (calls.length === 2) {
      return new Response(JSON.stringify({
        status: "Ready",
        result: { sample: "https://delivery.test/result.png" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(Uint8Array.from([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  };

  try {
    const result = await generateBflImage(
      { BFL_API_KEY: "test-bfl-key" },
      {
        prompt: "A safe fantasy landscape",
        width: 1344,
        height: 768,
        references: [
          { imageDataUrl: "data:image/png;base64,AQID" },
          { imageDataUrl: "https://example.test/reference.png" },
        ],
      },
    );
    const payload = JSON.parse(calls[0].options.body);
    assert.equal(calls[0].url, "https://api.bfl.ai/v1/flux-2-pro-preview");
    assert.equal(payload.input_image, "AQID");
    assert.equal(payload.input_image_2, "https://example.test/reference.png");
    assert.equal(payload.width, 1344);
    assert.equal(payload.height, 768);
    assert.equal(result.b64, "AQID");
    assert.equal(result.provider, "black_forest_labs");
  } finally {
    global.fetch = originalFetch;
  }
});

test("FLUX helper caps polling below the Cloudflare subrequest limit", async () => {
  const { generateBflImage } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  let calls = 0;
  global.setTimeout = (callback) => originalSetTimeout(callback, 0);
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({
        id: "request-slow",
        polling_url: "https://api.bfl.ai/v1/get_result?id=request-slow",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ status: "Pending" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await assert.rejects(
      generateBflImage(
        { BFL_API_KEY: "test-bfl-key" },
        { prompt: "A slow safe image", width: 1344, height: 768, timeoutMs: 180000 },
      ),
      /timed out/,
    );
    assert.equal(calls, 33);
    assert.ok(calls < 50);
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
  }
});
