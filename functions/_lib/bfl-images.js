export const BFL_IMAGE_MODEL = "flux-2-pro-preview";

export function hasBflKey(env) {
  return Boolean(bflApiKey(env));
}

export async function generateBflImage(env, {
  prompt,
  width,
  height,
  references = [],
  model = BFL_IMAGE_MODEL,
  outputFormat = "png",
  timeoutMs = 180000,
  pollingUrl = "",
} = {}) {
  const key = bflApiKey(env);
  if (!key) {
    const error = new Error("The OPRealm FLUX image generator is not connected yet.");
    error.status = 500;
    throw error;
  }

  const payload = {
    prompt: String(prompt || "").trim(),
    width: Number(width),
    height: Number(height),
    output_format: outputFormat,
    safety_tolerance: 2,
  };
  references.slice(0, 8).forEach((reference, index) => {
    const image = normalizeReferenceImage(reference?.imageDataUrl || reference);
    if (image) payload[index ? `input_image_${index + 1}` : "input_image"] = image;
  });

  let activePollingUrl = String(pollingUrl || "").trim();
  if (!activePollingUrl) {
    const createResponse = await fetch(`https://api.bfl.ai/v1/${encodeURIComponent(model)}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-key": key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Math.min(timeoutMs, 30000)),
    });
    const created = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !created.polling_url) {
      throw bflError(created, createResponse.status, "FLUX image request failed.");
    }
    activePollingUrl = created.polling_url;
  }

  const deadline = Date.now() + timeoutMs;
  const maxPollAttempts = 32;
  for (let pollAttempt = 0; pollAttempt < maxPollAttempts && Date.now() < deadline; pollAttempt += 1) {
    await sleep(pollAttempt === 0 ? 1200 : 5000);
    const pollResponse = await fetch(activePollingUrl, {
      headers: { accept: "application/json", "x-key": key },
      signal: AbortSignal.timeout(15000),
    });
    const poll = await pollResponse.json().catch(() => ({}));
    if (!pollResponse.ok) throw bflError(poll, pollResponse.status, "FLUX status check failed.");
    if (poll.status === "Ready" && poll.result?.sample) {
      const imageResponse = await fetch(poll.result.sample, {
        signal: AbortSignal.timeout(30000),
      });
      if (!imageResponse.ok) {
        const error = new Error("FLUX image download failed.");
        error.status = imageResponse.status;
        throw error;
      }
      return {
        b64: bytesToBase64(new Uint8Array(await imageResponse.arrayBuffer())),
        mimeType: imageResponse.headers.get("content-type") || `image/${outputFormat}`,
        model,
        quality: references.length ? "reference edit" : "generation",
        provider: "black_forest_labs",
        estimatedCostUsd: references.length ? 0.045 : 0.03,
      };
    }
    if (poll.status === "Error" || poll.status === "Failed") {
      throw bflError(poll, 502, "FLUX image generation failed.");
    }
  }

  const error = new Error("FLUX image generation timed out.");
  error.status = 504;
  error.pollingUrl = activePollingUrl;
  throw error;
}

function bflApiKey(env) {
  return String(env.BFL_API_KEY || env.BLACK_FOREST_LABS_API_KEY || "").trim();
}

function normalizeReferenceImage(value) {
  const text = String(value || "").trim();
  const match = text.match(/^data:image\/(?:png|jpe?g|webp);base64,(.+)$/i);
  return match ? match[1] : /^https?:\/\//i.test(text) ? text : "";
}

function bflError(data, status, fallback) {
  const detail = Array.isArray(data?.detail)
    ? data.detail.map((item) => item?.msg || item?.message).filter(Boolean).join("; ")
    : data?.detail;
  const error = new Error(String(detail || data?.error || data?.message || fallback));
  error.status = Number(status) || 502;
  error.providerError = data;
  return error;
}

function bytesToBase64(bytes) {
  let output = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(output);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
