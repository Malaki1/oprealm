import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { IMAGE_COMPARISON_MODELS, selectedComparisonModels } from "../_lib/image-comparison-models.js";
import { readJson } from "../_lib/http.js";
import { checkPromptSafety } from "../_lib/validate.js";

const MAX_MODELS_PER_RUN = 9;
const MAX_PROMPT_LENGTH = 1800;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  return json({
    ok: true,
    models: IMAGE_COMPARISON_MODELS.map((item) => ({
      ...item,
      configured: providerConfigured(env, item.provider),
    })),
  });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);

  let body;
  try {
    body = await readJson(request, "Invalid comparison request.", 64 * 1024);
  } catch {
    return json({ ok: false, error: "Invalid comparison request." }, 400);
  }

  const prompt = cleanText(body.prompt, MAX_PROMPT_LENGTH);
  if (!prompt) return json({ ok: false, error: "Enter an image prompt first." }, 400);
  const safetyWarning = checkPromptSafety(prompt);
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const models = selectedComparisonModels(body.modelIds).slice(0, MAX_MODELS_PER_RUN);
  if (!models.length) return json({ ok: false, error: "Turn on at least one image model." }, 400);

  const startedAt = Date.now();
  const results = await Promise.all(models.map((item) => runModel(env, item, prompt)));
  const estimatedCostUsd = results
    .filter((item) => item.ok)
    .reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0);

  return json({
    ok: true,
    prompt,
    durationMs: Date.now() - startedAt,
    estimatedCostUsd,
    results,
  });
}

async function runModel(env, item, prompt) {
  const startedAt = Date.now();
  if (!providerConfigured(env, item.provider)) {
    return resultError(item, `Add ${providerKeyName(item.provider)} to Cloudflare to enable this provider.`, startedAt);
  }

  try {
    const image = item.provider === "OpenAI"
      ? await generateOpenAi(env, item, prompt)
      : item.provider === "Google"
        ? await generateGoogle(env, item, prompt)
        : await generateBfl(env, item, prompt);
    await logComparisonUsage(env, item, prompt);
    return {
      ...publicModel(item),
      ok: true,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: item.cost,
      imageDataUrl: image,
    };
  } catch (error) {
    return resultError(item, friendlyError(error), startedAt);
  }
}

async function logComparisonUsage(env, item, prompt) {
  if (!env.OPREALM_DB) return;
  await env.OPREALM_DB.prepare(
    `
      INSERT INTO ai_usage (
        discord_user_id,
        guild_id,
        tool,
        prompt,
        credits_used,
        provider,
        model,
        quality,
        provider_units,
        estimated_cost_usd,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?, datetime('now'))
    `,
  )
    .bind(
      "admin:image-comparison",
      "web-admin",
      "image_comparison",
      prompt.slice(0, 1500),
      item.provider.toLowerCase().replace(/\s+/g, "_"),
      item.model,
      item.quality,
      item.cost,
      JSON.stringify({ source: "admin_image_comparison", modelId: item.id }),
    )
    .run()
    .catch(() => {});
}

async function generateOpenAi(env, item, prompt) {
  const response = await openAiFetch(env, "/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: item.model,
      prompt,
      size: "1536x1024",
      quality: item.quality,
      output_format: "jpeg",
      output_compression: 82,
      n: 1,
    }),
  }, { seed: `image-comparison:${item.id}:${prompt}`, retries: 0, timeoutMs: 180000 });
  const data = await response.json().catch(() => ({}));
  const b64 = data.data?.[0]?.b64_json;
  if (!response.ok || !b64) throw new Error(data.error?.message || `OpenAI returned ${response.status}.`);
  return `data:image/jpeg;base64,${b64}`;
}

async function generateGoogle(env, item, prompt) {
  const key = googleApiKey(env);
  const response = await fetch(
    `${googleApiBase(env)}/models/${encodeURIComponent(item.model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(googleImageRequestBody(prompt)),
      signal: AbortSignal.timeout(180000),
    },
  );
  const data = await response.json().catch(() => ({}));
  const part = data.candidates?.flatMap((candidate) => candidate.content?.parts || [])
    .find((candidatePart) => candidatePart.inlineData?.data || candidatePart.inline_data?.data);
  const inline = part?.inlineData || part?.inline_data;
  if (!response.ok || !inline?.data) {
    throw new Error(data.error?.message || data.promptFeedback?.blockReason || `Google returned ${response.status}.`);
  }
  return `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
}

export function googleImageRequestBody(prompt) {
  return {
    contents: [{
      parts: [{
        text: `${String(prompt || "").trim()}\n\nGenerate one image only. Use a wide 16:9 landscape composition. Do not add explanatory text outside the image.`,
      }],
    }],
  };
}

async function generateBfl(env, item, prompt) {
  const key = bflApiKey(env);
  const createResponse = await fetch(`https://api.bfl.ai/v1/${item.model}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "x-key": key },
    body: JSON.stringify({
      prompt,
      width: 1440,
      height: 816,
      output_format: "jpeg",
      safety_tolerance: 2,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const created = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok || !created.polling_url) {
    throw new Error(created.detail?.[0]?.msg || created.message || `FLUX returned ${createResponse.status}.`);
  }

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await sleep(900);
    const pollResponse = await fetch(created.polling_url, {
      headers: { accept: "application/json", "x-key": key },
      signal: AbortSignal.timeout(15000),
    });
    const poll = await pollResponse.json().catch(() => ({}));
    if (poll.status === "Ready" && poll.result?.sample) {
      const imageResponse = await fetch(poll.result.sample, { signal: AbortSignal.timeout(30000) });
      if (!imageResponse.ok) throw new Error("FLUX image download failed.");
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${bytesToBase64(new Uint8Array(await imageResponse.arrayBuffer()))}`;
    }
    if (poll.status === "Error" || poll.status === "Failed") {
      throw new Error(poll.error || poll.message || "FLUX generation failed.");
    }
  }
  throw new Error("FLUX generation timed out.");
}

function isAdmin(request, env) {
  const expected = String(env.OPREALM_WEBHOOK_SECRET || "");
  return Boolean(expected) && request.headers.get("authorization") === `Bearer ${expected}`;
}

function providerConfigured(env, provider) {
  if (provider === "OpenAI") return hasOpenAiKey(env);
  if (provider === "Google") return Boolean(googleApiKey(env));
  return Boolean(bflApiKey(env));
}

function providerKeyName(provider) {
  if (provider === "OpenAI") return "OPENAI_API_KEY";
  if (provider === "Google") return "GEMINI_API_KEY";
  return "BFL_API_KEY";
}

function googleApiKey(env) {
  return String(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_AI_API_KEY || "").trim();
}

export function googleApiBase(env) {
  return String(env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1").replace(/\/+$/, "");
}

function bflApiKey(env) {
  return String(env.BFL_API_KEY || env.BLACK_FOREST_LABS_API_KEY || "").trim();
}

function resultError(item, error, startedAt) {
  return {
    ...publicModel(item),
    ok: false,
    durationMs: Date.now() - startedAt,
    estimatedCostUsd: 0,
    error,
  };
}

function publicModel(item) {
  return {
    id: item.id,
    provider: item.provider,
    model: item.model,
    quality: item.quality,
    listedCostUsd: item.cost,
  };
}

function friendlyError(error) {
  const message = String(error?.message || error || "Image generation failed.").replace(/\s+/g, " ").trim();
  if (/billing|quota|credit|insufficient/i.test(message)) return `Provider billing or quota issue: ${message.slice(0, 220)}`;
  if (/abort|timeout|timed out/i.test(message)) return "This model took too long to respond.";
  return message.slice(0, 260);
}

function bytesToBase64(bytes) {
  let output = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(output);
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
