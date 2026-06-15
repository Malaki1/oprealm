import { requireUser } from "../_lib/auth.js";
import { generateBflImage, hasBflKey } from "../_lib/bfl-images.js";
import {
  assertRateLimit,
  createGenerationJob,
  enqueueGenerationJob,
  findCachedJob,
  findIdempotentJob,
  jobResponse,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { readJson } from "../_lib/http.js";
import { sceneImageMode } from "../_lib/image-generation-policy.js";
import { checkPromptSafety } from "../_lib/validate.js";

const MAX_REFERENCE_IMAGES = 4;
const SCENE_TOOL = "story_scene_images";
const IMAGE_PROVIDER = "bfl_images";
const IMAGE_CONCURRENCY = 3;
const IMAGE_SLOT_LEASE_SECONDS = 240;
const IMAGE_SLOT_WAIT_MS = 20000;

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please log in before generating scene images." }, error.status || 401);
  }
  let body;
  try {
    body = await readJson(request, "Invalid scene image request.", 14 * 1024 * 1024);
  } catch {
    return json({ ok: false, error: "Invalid scene image request." }, 400);
  }
  const imageMode = sceneImageMode(body.imageMode, { testMode: Boolean(body.testMode) });
  const idempotencyKey = cleanText(request.headers.get("x-idempotency-key") || body.idempotencyKey || "", 120) || null;
  let existingJob = await findIdempotentJob(env, user.id, SCENE_TOOL, idempotencyKey);
  if (existingJob?.status === "completed") return json(jobResponse(existingJob));
  if (existingJob?.status === "processing" || existingJob?.status === "queued") {
    const updatedAt = Date.parse(`${existingJob.updated_at || existingJob.created_at || ""}Z`);
    const staleAfterMs = existingJob.status === "processing" ? 12 * 60 * 1000 : 30 * 60 * 1000;
    const stale = !Number.isFinite(updatedAt) || Date.now() - updatedAt > staleAfterMs;
    if (stale) {
      await markJobFailed(env, existingJob.id, new Error("The previous image request was interrupted."));
      existingJob = { ...existingJob, status: "failed" };
    } else {
    return json({ ok: false, jobId: existingJob.id, status: existingJob.status, retryable: true, error: "Scene artwork is still generating." }, 202, {
      "retry-after": "8",
    });
    }
  }
  try {
    const cloudQueueAvailable = Boolean(env.OPREALM_GENERATION_QUEUE?.send && env.OPREALM_ASSETS);
    await assertRateLimit(
      env,
      user.id,
      SCENE_TOOL,
      cloudQueueAvailable
        ? { limit: 180, windowSeconds: 15 * 60 }
        : { limit: 6, windowSeconds: 60 },
    );
  } catch (error) {
    return json({ ok: false, error: error.message || "Too many scene requests. Try again shortly." }, error.status || 429);
  }

  const safetyWarning = checkPromptSafety([
    body.prompt,
    body.visualPrompt,
    body.camera,
    body.background,
    body.character,
    body.mood,
    body.type,
    body.characterName,
    body.characterPrompt,
    body.characterType,
    body.characterPersonality,
    body.characterStyle,
    body.characterOutfit,
    body.characterAccessories,
    body.characterPalette,
    body.characterSafety,
    body.secondCharacterName,
    body.secondCharacterPrompt,
    body.secondCharacterType,
    body.secondCharacterPersonality,
    body.secondCharacterStyle,
    body.secondCharacterOutfit,
    body.secondCharacterAccessories,
    body.secondCharacterPalette,
    body.secondCharacterSafety,
    body.sceneStyle,
    body.continuityBrief,
  ].join(" "));
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const referenceImages = normalizeReferenceImages(body.referenceImages);
  const webPrompt = buildScenePrompt(body, "web", referenceImages);
  const promptHash = await sha256Text(`${SCENE_TOOL}:${imageMode.model}:${imageMode.quality}:${imageMode.size}:${webPrompt}`);
  const cachedJob = await findCachedJob(env, user.id, SCENE_TOOL, promptHash);
  if (cachedJob) return json(jobResponse(cachedJob, { cached: true }));

  if (!hasBflKey(env)) return json({ ok: false, error: "The OPRealm FLUX scene image generator is not connected yet." }, 500);
  if (Number(user.credits_remaining || 0) < imageMode.credits) {
    return json({
      ok: false,
      error: `You need ${imageMode.credits} Creator credit${imageMode.credits === 1 ? "" : "s"} for a ${imageMode.label.toLowerCase()} scene image.`,
    }, 402);
  }
  const providerState = await env.OPREALM_DB.prepare(
    `
      SELECT status, reason, blocked_until
      FROM generation_provider_state
      WHERE provider = ?
        AND status = 'paused'
        AND blocked_until > unixepoch()
      LIMIT 1
    `,
  )
    .bind(IMAGE_PROVIDER)
    .first()
    .catch(() => null);
  if (providerState) {
    return json({
      ok: false,
      error: providerState.reason || "Image generation is temporarily unavailable while OPRealm restores provider capacity.",
      retryable: false,
    }, 503, { "retry-after": String(Math.max(30, Number(providerState.blocked_until || 0) - Math.floor(Date.now() / 1000))) });
  }

  const jobId = existingJob?.id || crypto.randomUUID();
  if (!existingJob) {
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: SCENE_TOOL,
      promptHash,
      idempotencyKey,
      creditsReserved: imageMode.credits,
      metadata: { source: "storyboard_scenes", sceneId: cleanText(body.sceneId || "", 120), imageMode: imageMode.id },
    });
  }

  if (env.OPREALM_GENERATION_QUEUE?.send && env.OPREALM_ASSETS) {
    const payloadKey = `story-scene-image-requests/${user.id}/${jobId}.json`;
    await env.OPREALM_ASSETS.put(payloadKey, JSON.stringify(body), {
      httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
      customMetadata: { userId: user.id, jobId, sceneId: cleanText(body.sceneId || "", 120), imageMode: imageMode.id },
    });
    await env.OPREALM_DB.prepare(
      "UPDATE generation_jobs SET status = 'queued', metadata_json = ?, error = NULL, updated_at = datetime('now') WHERE id = ?",
    )
      .bind(JSON.stringify({ source: "storyboard_scenes", sceneId: cleanText(body.sceneId || "", 120), imageMode: imageMode.id, payloadKey }), jobId)
      .run();
    await enqueueGenerationJob(env, jobId, {
      tool: SCENE_TOOL,
      userId: user.id,
      metadata: { payloadKey },
    });
    return json({
      ok: false,
      jobId,
      status: "queued",
      retryable: true,
      error: "Scene artwork is queued and will continue in the background.",
    }, 202, { "retry-after": "6" });
  }

  try {
    const result = await processSceneImageJob(env, { jobId, user, body });
    return json({ ok: true, jobId, ...result });
  } catch (error) {
    return sceneImageErrorResponse(error);
  }
}

export async function processQueuedSceneImageJob(env, jobId, { finalAttempt = false } = {}) {
  const job = await env.OPREALM_DB.prepare(
    "SELECT * FROM generation_jobs WHERE id = ? AND tool = ? LIMIT 1",
  )
    .bind(jobId, SCENE_TOOL)
    .first();
  if (!job) throw providerError("Queued scene image job was not found.", 404);
  if (job.status === "completed") return jobResponse(job);
  if (job.status === "failed") {
    return {
      ok: false,
      jobId,
      status: "failed",
      retryable: false,
      error: job.error || "This scene image job was stopped. Press Try Again when you are ready.",
    };
  }

  const metadata = safeJson(job.metadata_json) || {};
  const payloadKey = cleanText(metadata.payloadKey || "", 500);
  const payloadObject = payloadKey ? await env.OPREALM_ASSETS?.get(payloadKey) : null;
  if (!payloadObject) throw providerError("Queued scene image request data was not found.", 404);
  const body = await payloadObject.json();
  const user = await env.OPREALM_DB.prepare("SELECT * FROM web_users WHERE id = ? LIMIT 1")
    .bind(job.web_user_id)
    .first();
  if (!user) throw providerError("The creator account for this image job was not found.", 404);

  try {
    const result = await processSceneImageJob(env, { jobId, user, body });
    await env.OPREALM_ASSETS.delete(payloadKey);
    return { ok: true, jobId, ...result };
  } catch (error) {
    if (isTemporaryProviderError(error) && !finalAttempt) {
      if (error.pollingUrl) {
        const pollingAttempts = Number(body.bflPollingAttempts || 0) + 1;
        if (pollingAttempts >= 2 && body.bflFallbackUsed) {
          const terminalError = providerError(
            "FLUX accepted this scene twice but did not finish it. Adjust the scene prompt slightly, then press Try Again.",
            422,
          );
          await markJobFailed(env, jobId, terminalError);
          await env.OPREALM_ASSETS.delete(payloadKey);
          throw terminalError;
        }
        if (pollingAttempts >= 2) {
          body.bflPollingAttempts = 0;
          body.bflPollingUrl = "";
          body.bflFallbackUsed = true;
          body.referenceImages = [];
        } else {
          body.bflPollingAttempts = pollingAttempts;
          body.bflPollingUrl = error.pollingUrl;
        }
        await env.OPREALM_ASSETS.put(payloadKey, JSON.stringify(body), {
          httpMetadata: { contentType: "application/json", cacheControl: "no-store" },
          customMetadata: {
            userId: job.web_user_id,
            jobId,
            sceneId: cleanText(body.sceneId || "", 120),
          },
        });
      }
      await env.OPREALM_DB.prepare(
        "UPDATE generation_jobs SET status = 'queued', error = ?, updated_at = datetime('now') WHERE id = ?",
      )
        .bind(String(error.message || "Temporary image provider error.").slice(0, 1000), jobId)
        .run();
      throw error;
    }
    await markJobFailed(env, jobId, error);
    await env.OPREALM_ASSETS.delete(payloadKey);
    throw error;
  }
}

async function processSceneImageJob(env, { jobId, user, body }) {
  const imageMode = sceneImageMode(body.imageMode, { testMode: Boolean(body.testMode) });
  const referenceImages = normalizeReferenceImages(body.referenceImages);
  const webPrompt = buildScenePrompt(body, "web", referenceImages);
  let web;
  let providerSlot = 0;
  try {
    providerSlot = await acquireProviderSlot(env, jobId);
    if (!providerSlot) {
      const error = providerError("Several creators are generating artwork right now. Please wait a moment, then press Try Again.", 429);
      error.retryAfter = 12;
      throw error;
    }
    await markJobProcessing(env, jobId);
    web = await generateImage(env, webPrompt, imageMode, referenceImages, body.bflPollingUrl);
  } catch (error) {
    throw error;
  } finally {
    if (providerSlot) await releaseProviderSlot(env, jobId);
  }

  let webImageUrl = "";
  let webImageDataUrl = "";
  let r2Key = "";
  if (env.OPREALM_ASSETS) {
    r2Key = `story-scene-images/${user.id}/${jobId}.png`;
    const bytes = Uint8Array.from(atob(web.b64), (char) => char.charCodeAt(0));
    await env.OPREALM_ASSETS.put(r2Key, bytes, {
      httpMetadata: { contentType: "image/png", cacheControl: "private, max-age=31536000, immutable" },
      customMetadata: { userId: user.id, jobId, sceneId: cleanText(body.sceneId || "", 120), imageMode: imageMode.id },
    });
    webImageUrl = `/api/story-scene-image-file?jobId=${encodeURIComponent(jobId)}`;
  } else {
    webImageDataUrl = `data:image/png;base64,${web.b64}`;
  }

  const creditUpdate = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(imageMode.credits, user.id, imageMode.credits)
    .run();
  if (!creditUpdate.meta?.changes) {
    const error = Object.assign(new Error(`You need ${imageMode.credits} Creator credit${imageMode.credits === 1 ? "" : "s"} to finish this scene image.`), { status: 402 });
    await markJobFailed(env, jobId, error);
    throw error;
  }

  await logAiUsage(env, user, webPrompt, web, imageMode);
  const storedResult = {
    webImageUrl,
    webImageDataUrl,
    creditsUsed: imageMode.credits,
    model: web.model,
    quality: web.quality,
    generationMode: web.mode,
    referenceCount: referenceImages.length,
    imageMode: imageMode.id,
    estimatedCostUsd: imageMode.estimatedCostUsd,
    r2Key,
  };
  await markJobCompleted(env, jobId, {
    result: storedResult,
    creditsCharged: imageMode.credits,
    model: web.model,
    quality: web.quality,
  });

  return storedResult;
}

async function generateImage(env, prompt, imageMode, referenceImages = [], pollingUrl = "") {
  const [width, height] = String(imageMode.size).split("x").map(Number);
  const result = await generateBflImage(env, {
    prompt,
    width,
    height,
    references: referenceImages,
    model: imageMode.model,
    // Leave enough time for the Pages function to checkpoint and return
    // before the queue consumer's 180-second hard timeout.
    timeoutMs: 105000,
    pollingUrl,
  });
  return {
    ...result,
    quality: imageMode.quality,
    mode: referenceImages.length ? "reference edit" : "generation",
  };
}

function providerError(message, status) {
  const providerMessage = String(message || "Scene image generation failed.");
  const billingLimit = isBillingLimitMessage(providerMessage);
  const error = new Error(billingLimit
    ? "Image generation is paused because the OPRealm image provider billing limit has been reached."
    : providerMessage);
  error.status = billingLimit ? 402 : Number(status) || 502;
  error.providerError = providerMessage;
  return error;
}

function isTemporaryProviderError(error) {
  if (isBillingLimitMessage(error?.message) || isBillingLimitMessage(error?.providerError)) return false;
  const status = Number(error?.status || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function isBillingLimitMessage(message) {
  return /billing hard limit|billing limit|insufficient[_\s-]*(quota|credits)|not enough credits|exceeded.*quota|quota.*exceeded|check your plan and billing/i
    .test(String(message || ""));
}

function isSafetyProviderError(error) {
  return /safety|content policy|moderation|not allowed|violat/i.test(String(error?.message || ""));
}

function friendlyProviderError(error) {
  const message = String(error?.message || "").replace(/\s+/g, " ").trim();
  if (isBillingLimitMessage(message) || isBillingLimitMessage(error?.providerError)) {
    return "Image generation is temporarily unavailable while OPRealm restores provider capacity. Your scene is safe; try again later.";
  }
  if (isSafetyProviderError(error)) {
    return "This scene could not be illustrated safely. Adjust the scene wording and try again.";
  }
  if (Number(error?.status || 0) === 400) {
    return `The image provider rejected this scene request. ${message.slice(0, 240)}`;
  }
  return message || "Scene image generation failed.";
}

function sceneImageErrorResponse(error) {
  const temporary = isTemporaryProviderError(error);
  const status = Number(error?.status || 0) === 400 ? 400 : Number(error?.status || 0) === 429 ? 429 : temporary ? 503 : Number(error?.status || 0) || 502;
  const retryAfter = Number(error?.retryAfter || (status === 429 ? 12 : status === 503 ? 10 : 0));
  return json({
    ok: false,
    error: status === 429
      ? error.message
      : status === 503
        ? "The scene image service is temporarily busy. Press Try Again when you are ready."
        : friendlyProviderError(error),
    retryable: status === 429 || status === 503,
  }, status, retryAfter ? { "retry-after": String(retryAfter) } : {});
}

async function acquireProviderSlot(env, jobId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < IMAGE_SLOT_WAIT_MS) {
    for (let slot = 1; slot <= IMAGE_CONCURRENCY; slot += 1) {
      const result = await env.OPREALM_DB.prepare(
        `
          INSERT INTO provider_generation_slots (provider, slot, job_id, lease_expires_at, updated_at)
          VALUES (?, ?, ?, unixepoch() + ?, datetime('now'))
          ON CONFLICT(provider, slot) DO UPDATE SET
            job_id = excluded.job_id,
            lease_expires_at = excluded.lease_expires_at,
            updated_at = datetime('now')
          WHERE provider_generation_slots.lease_expires_at <= unixepoch()
             OR provider_generation_slots.job_id = excluded.job_id
        `,
      )
        .bind(IMAGE_PROVIDER, slot, jobId, IMAGE_SLOT_LEASE_SECONDS)
        .run();
      if (result.meta?.changes) return slot;
    }
    await sleep(1500 + Math.floor(Math.random() * 900));
  }
  return 0;
}

async function releaseProviderSlot(env, jobId) {
  await env.OPREALM_DB.prepare(
    "DELETE FROM provider_generation_slots WHERE provider = ? AND job_id = ?",
  )
    .bind(IMAGE_PROVIDER, jobId)
    .run()
    .catch(() => {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildScenePrompt(body, format, referenceImages = []) {
  const savedStyle = cleanText(body.characterStyle || "Bright 3D game mascot", 120);
  const hasSecondHero = Boolean(cleanText(body.secondCharacterName || body.secondCharacterPrompt || "", 200));
  const requestedSceneStyle = cleanText(body.sceneStyle || "inherit", 120);
  const lockedStyle = body.lockCharacterStyle === false || body.lockCharacterStyle === "false"
    ? (requestedSceneStyle === "inherit" ? savedStyle : requestedSceneStyle)
    : savedStyle;
  const styleLockMode = body.lockCharacterStyle === false || body.lockCharacterStyle === "false" ? "soft scene style match" : "hard locked saved character style";
  return [
    "Create a safe kid-friendly AI story game scene card for OPRealm in wide 16:9 landscape format.",
    "No text, no UI words, no logos, no real children, no personal information, no copyrighted characters, no romance, no gore, no scary realism.",
    "Make it feel like a polished interactive story game scene with clear foreground, midground and background.",
    body.lockSceneContinuity === false || body.lockSceneContinuity === "false"
      ? "VISUAL CONTINUITY MODE: off for this request."
      : "VISUAL CONTINUITY MODE: on. Use the supplied reference images as continuity anchors, not loose inspiration.",
    body.lockSceneContinuity === false || body.lockSceneContinuity === "false"
      ? ""
      : `Supplied reference order: ${referenceImages.map((item, index) => `${index + 1}. ${item.label}`).join(" | ") || "No valid image references supplied."}`,
    body.lockSceneContinuity === false || body.lockSceneContinuity === "false"
      ? ""
      : "REFERENCE AUTHORITY: the original locked hero portrait is the highest authority for character identity and costume. A previous scene controls sequence, pose context, camera continuity and environment only; it must never overwrite costume details or propagate visual drift. A reference board supports detail callouts but does not override the original hero portrait.",
    body.lockSceneContinuity === false || body.lockSceneContinuity === "false"
      ? ""
      : `Continuity brief: ${cleanText(body.continuityBrief || "Continue the same safe story sequence with consistent characters and art style.", 1600)}`,
    "Leave clean readable space for choice buttons and dialogue overlays.",
    "Frame the scene wide with cinematic depth, clear action, and safe empty areas near the lower corners for future dialogue and choice buttons.",
    "CHARACTER CONSISTENCY LOCK:",
    "Treat the saved character as a fixed, locked design, not a loose inspiration.",
    "Do not redesign the character. Preserve the same apparent age, body proportions, face shape, hairstyle or fur shape, skin/fur tone, outfit, accessories, color palette, silhouette, and art style across every scene.",
    "COSTUME MICRO-DETAIL LOCK: reproduce the exact garment construction visible in the locked hero portrait. Preserve the base color of each clothing section and the exact color, shape, size, count and placement of pockets, pocket flaps, patches, shoulder panels, chest panels, lapels, collar lining, sleeves, cuffs, seams, stitching, piping, zippers, buttons, buckles, straps, armor plates and accessory mounts.",
    "Preserve left-versus-right placement and asymmetry. Never mirror a patch, move a colored pocket panel, swap orange and blue sections, remove a pattern, add a new stripe, simplify a seam layout, or recolor a material between scenes.",
    "Lighting may change brightness and reflections, but it must not change the underlying local color identity of any garment panel. A blue pocket patch remains blue; orange jacket fabric remains orange; metal armor remains the same metal color.",
    "At new camera angles, infer hidden details conservatively from the locked design. For every detail already visible in a reference, reproduce it exactly rather than improvising.",
    "Before finalizing, compare the generated character against the original hero portrait and correct any mismatch in clothing colors, panel boundaries, patterns, pockets, patches, accessories and left/right placement.",
    `ART STYLE LOCK: ${styleLockMode}. The entire scene must be rendered in "${lockedStyle}".`,
    "Do not mix art styles. Do not convert the saved character into a different style such as realistic, anime, pixel, storybook, chibi, 3D, or manga unless that is the saved locked style.",
    "Backgrounds, props, lighting, UI-safe space, sidekicks, and effects must all match the same locked style.",
    "If a detail is missing from the character bible, keep that area simple or partially obscured rather than inventing a different design.",
    "The scene may change pose, lighting, camera angle, facial expression, and action, but the character identity must remain recognisably the same.",
    hasSecondHero
      ? "TWO HERO LOCK: Include both saved heroes as distinct characters. Do not merge them, swap their outfits, mix their features, or turn one into a sidekick unless the scene prompt asks for it."
      : "ONE HERO LOCK: Include the saved hero as the main character unless the scene says no character is shown.",
    `Reader-facing story passage for context only: ${cleanText(body.prompt || "A magical choice moment begins.", 900)}`,
    `Internal visual scene direction to illustrate: ${cleanText(body.visualPrompt || body.prompt || "A magical choice moment begins.", 1800)}`,
    `Camera angle: ${cleanText(body.camera || "Wide cinematic reveal", 80)}`,
    `Background: ${cleanText(body.background || "Custom background", 120)}`,
    `Character use: ${cleanText(body.character || "Use saved character", 120)}`,
    `Mood: ${cleanText(body.mood || "Curious", 80)}`,
    `Scene type: ${cleanText(body.type || "Choice moment", 80)}`,
    `Saved character name: ${cleanText(body.characterName || "OPRealm hero", 80)}`,
    `Saved character type/species/role: ${cleanText(body.characterType || "Original story hero", 120)}`,
    `Saved character personality: ${cleanText(body.characterPersonality || "Brave and kind", 120)}`,
    `Saved character visual style: ${savedStyle}`,
    `Saved character outfit lock: ${cleanText(body.characterOutfit || "Preserve the exact approved outfit from the character reference.", 700)}`,
    `Saved character accessories lock: ${cleanText(body.characterAccessories || "Preserve approved accessories only.", 500)}`,
    `Saved character color palette lock: ${cleanText(body.characterPalette || "Preserve the approved character colors.", 400)}`,
    `Scene style selector: ${requestedSceneStyle}`,
    `Final locked scene style: ${lockedStyle}`,
    `Saved character safety tone: ${cleanText(body.characterSafety || "Friendly and safe for all ages", 160)}`,
    `Saved character core design bible: ${cleanText(body.characterPrompt || "A friendly original story character.", 1200)}`,
    hasSecondHero ? `Second saved hero name: ${cleanText(body.secondCharacterName || "Second OPRealm hero", 80)}` : "",
    hasSecondHero ? `Second saved hero type/species/role: ${cleanText(body.secondCharacterType || "Original story hero", 120)}` : "",
    hasSecondHero ? `Second saved hero personality: ${cleanText(body.secondCharacterPersonality || "Brave and kind", 120)}` : "",
    hasSecondHero ? `Second saved hero visual style: ${cleanText(body.secondCharacterStyle || savedStyle, 120)}` : "",
    hasSecondHero ? `Second saved hero outfit lock: ${cleanText(body.secondCharacterOutfit || "Preserve the exact approved outfit from the second character reference.", 700)}` : "",
    hasSecondHero ? `Second saved hero accessories lock: ${cleanText(body.secondCharacterAccessories || "Preserve approved accessories only.", 500)}` : "",
    hasSecondHero ? `Second saved hero color palette lock: ${cleanText(body.secondCharacterPalette || "Preserve the approved character colors.", 400)}` : "",
    hasSecondHero ? `Second saved hero safety tone: ${cleanText(body.secondCharacterSafety || "Friendly and safe for all ages", 160)}` : "",
    hasSecondHero ? `Second saved hero core design bible: ${cleanText(body.secondCharacterPrompt || "A friendly original second story character.", 1200)}` : "",
  ].join("\n");
}

function normalizeReferenceImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => ({
      label: cleanText(image?.label || "Story reference image", 80),
      imageDataUrl: String(image?.imageDataUrl || ""),
    }))
    .filter((image) => /^data:image\/(png|jpe?g|webp);base64,/i.test(image.imageDataUrl))
    .slice(0, MAX_REFERENCE_IMAGES);
}

async function logAiUsage(env, user, prompt, web, imageMode) {
  try {
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
        "story_scene_images",
        prompt.slice(0, 1500),
        imageMode.credits,
        web?.provider || imageMode.provider || "black_forest_labs",
        web?.model || imageMode.model,
        web?.quality || imageMode.quality,
        1,
        imageMode.estimatedCostUsd,
        JSON.stringify({
          source: "ai_story_game_creator",
          webUserId: user.id,
          generationMode: web?.mode || "generation",
          imageMode: imageMode.id,
        }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story scene image usage log failed", error);
  }
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
