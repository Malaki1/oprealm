import { requireUser } from "../_lib/auth.js";
import { openAiFetch } from "../_lib/ai-gateway.js";
import { markJobCompleted, markJobFailed } from "../_lib/generation-jobs.js";
import { json } from "../_lib/http.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const SCENE_VIDEO_COST = CREATOR_CREDIT_COSTS.sceneVideoStandard8s;
const SCENE_VIDEO_TOOL = "story_scene_video";
const ESTIMATED_COST_USD = 3.2;

export async function onRequestGet({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!env.OPREALM_ASSETS) return json({ ok: false, error: "OPRealm video storage is not connected yet." }, 500);

    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const jobId = cleanText(url.searchParams.get("id") || "", 120);
    if (!jobId) return json({ ok: false, error: "Missing scene video job id." }, 400);

    const job = await loadVideoJob(env, user.id, jobId);
    if (!job) return json({ ok: false, error: "Scene video job was not found." }, 404);
    if (job.status === "completed") return json(completedResponse(job));
    if (job.status === "failed") return json({ ok: false, jobId, status: "failed", error: job.error || "Scene video failed." }, 502);

    const metadata = safeJson(job.metadata_json) || {};
    const provider = metadata.provider || "openai";
    const providerVideoId = provider === "google" ? metadata.googleOperationName || metadata.openaiVideoId : metadata.openaiVideoId;
    if (!providerVideoId) return json({ ok: false, jobId, error: "Scene video provider job is missing." }, 502);

    const providerVideo = provider === "google"
      ? await retrieveGoogleVeoOperation(env, providerVideoId)
      : await retrieveOpenAiVideo(env, providerVideoId);
    const status = providerVideo.status || "queued";
    if (status === "failed") {
      const error = new Error(providerVideo.error?.message || "Scene video generation failed.");
      await markJobFailed(env, jobId, error);
      return json({ ok: false, jobId, status: "failed", error: error.message }, 502);
    }

    if (status !== "completed") {
      return json({
        ok: true,
        jobId,
        status,
        progress: Number(providerVideo.progress || 0),
        providerVideoId,
        provider,
        pollAfterMs: status === "queued" ? 12000 : 10000,
      });
    }

    const r2Key = `story-scene-videos/${user.id}/${jobId}.mp4`;
    if (provider === "google") {
      await persistGoogleVeoVideo(env, providerVideo.videoUri, r2Key, providerVideoId);
    } else {
      await persistOpenAiVideo(env, providerVideoId, r2Key);
    }
    const result = {
      videoUrl: `/api/story-scene-video-file?id=${encodeURIComponent(jobId)}`,
      providerVideoId,
      provider,
      r2Key,
      progress: 100,
      creditsUsed: SCENE_VIDEO_COST,
    };
    await markJobCompleted(env, jobId, {
      result,
      creditsCharged: SCENE_VIDEO_COST,
      model: providerVideo.model || job.model || "",
      quality: `${providerVideo.seconds || metadata.seconds || ""}s`,
    });
    await logAiUsage(env, user, job, providerVideo);
    return json({ ok: true, jobId, status: "completed", ...result });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not check scene video." }, error.status || 500);
  }
}

async function loadVideoJob(env, userId, jobId) {
  return env.OPREALM_DB.prepare(
    `
      SELECT *
      FROM generation_jobs
      WHERE id = ?
        AND web_user_id = ?
        AND tool = ?
      LIMIT 1
    `,
  )
    .bind(jobId, userId, SCENE_VIDEO_TOOL)
    .first();
}

async function retrieveOpenAiVideo(env, providerVideoId) {
  const response = await openAiFetch(env, `/v1/videos/${encodeURIComponent(providerVideoId)}`, {
    method: "GET",
  }, { seed: providerVideoId, retries: 1 });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || `Could not check video status (${response.status}).`), { status: response.status });
  return data;
}

async function retrieveGoogleVeoOperation(env, operationName) {
  const response = await fetch(`${googleBaseUrl(env)}/${operationName}`, {
    method: "GET",
    headers: {
      "x-goog-api-key": googleApiKey(env),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(friendlyGoogleVideoError(data, response.status)), { status: response.status });
  if (data.error) {
    return {
      id: operationName,
      status: "failed",
      error: { message: friendlyGoogleVideoError(data, 502) },
    };
  }
  if (!data.done) {
    return {
      id: operationName,
      status: "queued",
      progress: Number(data.metadata?.progressPercent || 0),
    };
  }
  const sample = data.response?.generateVideoResponse?.generatedSamples?.[0];
  const videoUri = sample?.video?.uri || data.response?.generatedVideos?.[0]?.video?.uri || "";
  if (!videoUri) {
    return {
      id: operationName,
      status: "failed",
      error: { message: "Veo completed but did not return a downloadable video." },
    };
  }
  return {
    id: operationName,
    status: "completed",
    progress: 100,
    videoUri,
    model: "veo-3.1-generate-preview",
    seconds: 8,
  };
}

async function persistOpenAiVideo(env, providerVideoId, r2Key) {
  const existing = await env.OPREALM_ASSETS.get(r2Key);
  if (existing) return;
  const response = await openAiFetch(env, `/v1/videos/${encodeURIComponent(providerVideoId)}/content`, {
    method: "GET",
  }, { seed: providerVideoId, retries: 1 });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw Object.assign(new Error(text || `Could not download completed video (${response.status}).`), { status: response.status });
  }
  await env.OPREALM_ASSETS.put(r2Key, response.body, {
    httpMetadata: { contentType: response.headers.get("content-type") || "video/mp4" },
    customMetadata: { provider: "openai", providerVideoId },
  });
}

async function persistGoogleVeoVideo(env, videoUri, r2Key, operationName) {
  if (!videoUri) throw new Error("Veo video download URL was missing.");
  const existing = await env.OPREALM_ASSETS.get(r2Key);
  if (existing) return;
  const response = await fetch(videoUri, {
    method: "GET",
    headers: {
      "x-goog-api-key": googleApiKey(env),
    },
    redirect: "follow",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw Object.assign(new Error(text || `Could not download completed Veo video (${response.status}).`), { status: response.status });
  }
  await env.OPREALM_ASSETS.put(r2Key, response.body, {
    httpMetadata: { contentType: response.headers.get("content-type") || "video/mp4" },
    customMetadata: { provider: "google-veo", operationName },
  });
}

function completedResponse(job) {
  const result = safeJson(job.result_json) || {};
  return {
    ok: true,
    jobId: job.id,
    status: "completed",
    progress: 100,
    creditsUsed: Number(job.credits_charged || result.creditsUsed || 0),
    ...result,
  };
}

async function logAiUsage(env, user, job, providerVideo) {
  try {
    const metadata = safeJson(job.metadata_json) || {};
    const provider = metadata.provider === "google" ? "google" : "openai";
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
    )
      .bind(
        `web:${user.id}`,
        "web-studio",
        SCENE_VIDEO_TOOL,
        String(job.prompt_hash || "").slice(0, 1500),
        SCENE_VIDEO_COST,
        provider,
        providerVideo.model || job.model || "",
        `${providerVideo.seconds || ""}s`,
        1,
        ESTIMATED_COST_USD,
        JSON.stringify({ source: "ai_story_game_creator", webUserId: user.id, jobId: job.id, providerVideoId: providerVideo.id }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story scene video usage log failed", error);
  }
}

function safeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
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
