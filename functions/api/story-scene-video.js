import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import {
  assertRateLimit,
  createGenerationJob,
  findIdempotentJob,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const SCENE_VIDEO_COST = CREATOR_CREDIT_COSTS.sceneVideoStandard8s;
const SCENE_VIDEO_TOOL = "story_scene_video";
const SCENE_VIDEO_MODEL = "sora-2";
const GOOGLE_VIDEO_MODEL = "veo-3.1-generate-preview";
const SCENE_VIDEO_SIZE = "1280x720";
const SCENE_VIDEO_SECONDS = "8";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!env.OPREALM_ASSETS) return json({ ok: false, error: "OPRealm video storage is not connected yet." }, 500);
    const provider = videoProvider(env);
    if (provider === "openai" && !hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm Sora video generator is not connected yet." }, 500);
    if (provider === "google" && !googleApiKey(env)) return json({ ok: false, error: "The OPRealm Veo video generator needs GEMINI_API_KEY or GOOGLE_API_KEY configured." }, 500);

    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < SCENE_VIDEO_COST) {
      return json({ ok: false, error: `You need ${SCENE_VIDEO_COST} Creator credits to bring this scene to life.` }, 402);
    }

    const body = validateVideoBody(await readJson(request, "Invalid scene video request.", 12 * 1024 * 1024));
    await assertRateLimit(env, user.id, SCENE_VIDEO_TOOL, { limit: 3, windowSeconds: 60 });

    const model = videoModel(env, provider);
    const promptHash = await sha256Text(`${SCENE_VIDEO_TOOL}:${provider}:${model}:${body.sceneId}:${body.prompt}:${body.imageDataUrl.slice(0, 240)}`);
    let idempotencyKey = cleanText(request.headers.get("x-idempotency-key") || body.idempotencyKey || "", 140) || null;
    const existingJob = await findIdempotentJob(env, user.id, SCENE_VIDEO_TOOL, idempotencyKey);
    if (existingJob && existingJob.status !== "failed") {
      return json(existingVideoJobResponse(existingJob));
    }
    if (existingJob?.status === "failed") {
      idempotencyKey = null;
    }
    const jobId = crypto.randomUUID();

    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: SCENE_VIDEO_TOOL,
      promptHash,
      idempotencyKey,
      creditsReserved: SCENE_VIDEO_COST,
      metadata: {
        source: "ai_story_game_creator",
        route: "/api/story-scene-video",
        provider,
        sceneId: body.sceneId,
        sceneTitle: body.sceneTitle,
        size: SCENE_VIDEO_SIZE,
        seconds: SCENE_VIDEO_SECONDS,
      },
    });

    try {
      await markJobProcessing(env, jobId);
      const video = provider === "google" ? await createGoogleVeoVideo(env, {
        model,
        prompt: body.prompt,
        imageDataUrl: body.imageDataUrl,
      }) : await createOpenAiVideo(env, {
        model,
        prompt: body.prompt,
        imageDataUrl: body.imageDataUrl,
        jobId,
      });
      const charged = await chargeCredits(env, user.id, SCENE_VIDEO_COST);
      if (!charged) throw Object.assign(new Error(`You need ${SCENE_VIDEO_COST} Creator credits to bring this scene to life.`), { status: 402 });

      await env.OPREALM_DB.prepare(
        `
          UPDATE generation_jobs
          SET metadata_json = ?,
              model = ?,
              quality = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `,
      )
        .bind(
          JSON.stringify({
            source: "ai_story_game_creator",
            route: "/api/story-scene-video",
            provider,
            sceneId: body.sceneId,
            sceneTitle: body.sceneTitle,
            openaiVideoId: video.id,
            googleOperationName: video.operationName || "",
            size: video.size || SCENE_VIDEO_SIZE,
            seconds: video.seconds || SCENE_VIDEO_SECONDS,
          }).slice(0, 3000),
          model,
          `${SCENE_VIDEO_SECONDS}s`,
          jobId,
        )
        .run();

      return json({
        ok: true,
        jobId,
        status: video.status || "queued",
        progress: Number(video.progress || 0),
        providerVideoId: video.id,
        provider,
        creditsReserved: SCENE_VIDEO_COST,
        pollAfterMs: 10000,
      });
    } catch (error) {
      await markJobFailed(env, jobId, error);
      return json({ ok: false, jobId, error: error.message || "Scene video generation failed." }, error.status || 502);
    }
  } catch (error) {
    return json({ ok: false, error: error.message || "Scene video generation failed." }, error.status || 500);
  }
}

function existingVideoJobResponse(job) {
  const metadata = safeJson(job.metadata_json) || {};
  const result = safeJson(job.result_json) || {};
  return {
    ok: true,
    jobId: job.id,
    status: job.status,
    progress: Number(result.progress || 0),
    providerVideoId: result.providerVideoId || metadata.openaiVideoId || "",
    provider: metadata.provider || "openai",
    videoUrl: result.videoUrl || "",
    creditsReserved: Number(job.credits_reserved || SCENE_VIDEO_COST),
    creditsUsed: Number(job.credits_charged || 0),
    pollAfterMs: job.status === "completed" ? 0 : 10000,
    reused: true,
  };
}

async function createGoogleVeoVideo(env, { model, prompt, imageDataUrl }) {
  const image = dataUrlToInlineImage(imageDataUrl);
  const response = await fetch(`${googleBaseUrl(env)}/models/${encodeURIComponent(model)}:predictLongRunning`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": googleApiKey(env),
    },
    body: JSON.stringify({
      instances: [{
        prompt,
        image: {
          mimeType: image.mimeType,
          bytesBase64Encoded: image.base64,
        },
      }],
      parameters: {
        aspectRatio: "16:9",
        durationSeconds: Number(SCENE_VIDEO_SECONDS),
        personGeneration: "allow_adult",
        resolution: "720p",
      },
    }),
  });
  const data = await readProviderJson(response, "Veo provider returned an unreadable response.");
  if (!response.ok || !data.name) {
    throw Object.assign(new Error(friendlyGoogleVideoError(data, response.status)), { status: response.ok ? 502 : response.status });
  }
  return {
    id: data.name,
    operationName: data.name,
    status: "queued",
    progress: 0,
    model,
    size: SCENE_VIDEO_SIZE,
    seconds: SCENE_VIDEO_SECONDS,
  };
}

async function createOpenAiVideo(env, { model, prompt, imageDataUrl, jobId }) {
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", SCENE_VIDEO_SIZE);
  form.append("seconds", SCENE_VIDEO_SECONDS);
  form.append("input_reference", dataUrlToFile(imageDataUrl, `${jobId}-scene-reference.jpg`));

  const response = await openAiFetch(env, "/v1/videos", {
    method: "POST",
    body: form,
  }, { seed: `${jobId}:${model}`, retries: 1 });
  const data = await readProviderJson(response, "Video provider returned an unreadable response.");
  if (!response.ok || !data.id) {
    throw Object.assign(new Error(data.error?.message || `Scene video generation failed (${response.status}).`), { status: response.ok ? 502 : response.status });
  }
  return data;
}

function validateVideoBody(body) {
  const prompt = cleanText(body.prompt, 1800);
  if (prompt.length < 40) throw Object.assign(new Error("The scene needs a stronger story prompt before making video."), { status: 400 });
  const imageDataUrl = String(body.imageDataUrl || "");
  if (!/^data:image\/(?:jpe?g|png|webp);base64,/i.test(imageDataUrl)) {
    throw Object.assign(new Error("Generate the scene image before creating video."), { status: 400 });
  }
  const safetyWarning = checkPromptSafety(prompt);
  if (safetyWarning) throw Object.assign(new Error(safetyWarning), { status: 400 });
  return {
    prompt,
    imageDataUrl,
    sceneId: cleanText(body.sceneId, 120),
    sceneTitle: cleanText(body.sceneTitle, 160),
    idempotencyKey: cleanText(body.idempotencyKey, 140),
  };
}

function dataUrlToFile(dataUrl, filename) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Invalid scene image reference.");
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return new File([bytes], filename, { type: match[1] });
}

function dataUrlToInlineImage(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Invalid scene image reference.");
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(credits, userId, credits)
    .run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function readProviderJson(response, fallbackMessage) {
  const text = await response.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(clean ? `${fallbackMessage} ${clean.slice(0, 160)}` : fallbackMessage);
  }
}

function checkPromptSafety(value) {
  const text = String(value || "").toLowerCase();
  const blocked = ["phone number", "address", "school name", "password", "private chat", "meet me", "snapchat", "instagram", "tiktok", "whatsapp"];
  const phrase = blocked.find((item) => text.includes(item));
  return phrase ? `Please remove unsafe personal/contact wording like "${phrase}" before generating video.` : "";
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function videoProvider(env) {
  const value = String(env.OPREALM_VIDEO_PROVIDER || "google").trim().toLowerCase();
  return value === "openai" || value === "sora" ? "openai" : "google";
}

function videoModel(env, provider) {
  return cleanText(env.OPREALM_VIDEO_MODEL || (provider === "google" ? GOOGLE_VIDEO_MODEL : SCENE_VIDEO_MODEL), 100);
}

function googleApiKey(env) {
  return String(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_AI_API_KEY || "").trim();
}

function googleBaseUrl(env) {
  return String(env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
}

function friendlyGoogleVideoError(data, status) {
  const message = String(data?.error?.message || "");
  const reason = JSON.stringify(data?.error || {}).toLowerCase();
  if (status === 429 || /quota|rate.?limit|exceeded/i.test(message) || reason.includes("quota")) {
    return "Veo video quota has been reached for the connected Google API key. Add quota/billing in Google AI Studio or swap OPREALM_VIDEO_PROVIDER to another connected video provider, then try again.";
  }
  if (status === 403 || /permission|billing|not enabled|disabled/i.test(message)) {
    return "Veo video access is not enabled for the connected Google API key. Check Google AI Studio billing, model access, and API permissions.";
  }
  return message || `Veo video generation failed (${status}).`;
}

function safeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
