import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import {
  assertRateLimit,
  createGenerationJob,
  findIdempotentJob,
  jobResponse,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { readJson } from "../_lib/http.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";
import { checkPromptSafety } from "../_lib/validate.js";

const SCENE_IMAGE_COST = CREATOR_CREDIT_COSTS.sceneImage;
const SCENE_IMAGE_MODEL = "gpt-image-1.5";
const SCENE_IMAGE_QUALITY = "high";
const SCENE_IMAGE_ESTIMATED_COST_USD = 0.2;
const MAX_REFERENCE_IMAGES = 4;
const SCENE_TOOL = "story_scene_images";

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm scene image generator is not connected yet." }, 500);

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please log in before generating scene images." }, error.status || 401);
  }
  if (Number(user.credits_remaining || 0) < SCENE_IMAGE_COST) {
    return json({ ok: false, error: `You need ${SCENE_IMAGE_COST} Creator credits to generate scene images.` }, 402);
  }

  let body;
  try {
    body = await readJson(request, "Invalid scene image request.", 14 * 1024 * 1024);
  } catch {
    return json({ ok: false, error: "Invalid scene image request." }, 400);
  }
  const idempotencyKey = cleanText(request.headers.get("x-idempotency-key") || body.idempotencyKey || "", 120) || null;
  const existingJob = await findIdempotentJob(env, user.id, SCENE_TOOL, idempotencyKey);
  if (existingJob?.status === "completed") return json(jobResponse(existingJob));
  if (existingJob?.status === "processing" || existingJob?.status === "queued") {
    return json({ ok: false, jobId: existingJob.id, status: existingJob.status, retryable: true, error: "Scene artwork is still generating." }, 202, {
      "retry-after": "8",
    });
  }
  try {
    await assertRateLimit(env, user.id, SCENE_TOOL, { limit: 6, windowSeconds: 60 });
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
  const promptHash = await sha256Text(`${SCENE_TOOL}:${SCENE_IMAGE_MODEL}:${SCENE_IMAGE_QUALITY}:${webPrompt}`);
  const jobId = existingJob?.id || crypto.randomUUID();
  if (!existingJob) {
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: SCENE_TOOL,
      promptHash,
      idempotencyKey,
      creditsReserved: SCENE_IMAGE_COST,
      metadata: { source: "storyboard_scenes", sceneId: cleanText(body.sceneId || "", 120) },
    });
  }

  let web;
  try {
    await markJobProcessing(env, jobId);
    web = await generateImage(env, webPrompt, "1536x1024", referenceImages);
  } catch (error) {
    await markJobFailed(env, jobId, error);
    const status = isTemporaryProviderError(error) ? 503 : 502;
    return json({
      ok: false,
      error: status === 503
        ? "The scene image service is temporarily busy. OPRealm will retry this scene automatically."
        : error.message || "Scene image generation failed.",
      retryable: status === 503,
    }, status, status === 503 ? { "retry-after": "8" } : {});
  }

  let webImageUrl = "";
  let webImageDataUrl = "";
  let r2Key = "";
  if (env.OPREALM_ASSETS) {
    r2Key = `story-scene-images/${user.id}/${jobId}.png`;
    const bytes = Uint8Array.from(atob(web.b64), (char) => char.charCodeAt(0));
    await env.OPREALM_ASSETS.put(r2Key, bytes, {
      httpMetadata: { contentType: "image/png", cacheControl: "private, max-age=31536000, immutable" },
      customMetadata: { userId: user.id, jobId, sceneId: cleanText(body.sceneId || "", 120) },
    });
    webImageUrl = `/api/story-scene-image-file?jobId=${encodeURIComponent(jobId)}`;
  } else {
    webImageDataUrl = `data:image/png;base64,${web.b64}`;
  }

  const creditUpdate = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(SCENE_IMAGE_COST, user.id, SCENE_IMAGE_COST)
    .run();
  if (!creditUpdate.meta?.changes) {
    const error = Object.assign(new Error(`You need ${SCENE_IMAGE_COST} Creator credits to finish this scene image.`), { status: 402 });
    await markJobFailed(env, jobId, error);
    return json({ ok: false, error: error.message }, 402);
  }

  await logAiUsage(env, user, webPrompt, web);
  const storedResult = {
    webImageUrl,
    webImageDataUrl,
    creditsUsed: SCENE_IMAGE_COST,
    model: web.model,
    quality: web.quality,
    generationMode: web.mode,
    referenceCount: referenceImages.length,
    r2Key,
  };
  await markJobCompleted(env, jobId, {
    result: storedResult,
    creditsCharged: SCENE_IMAGE_COST,
    model: web.model,
    quality: web.quality,
  });

  return json({
    ok: true,
    jobId,
    ...storedResult,
  });
}

async function generateImage(env, prompt, size, referenceImages = []) {
  const referenceAttempts = [
    { model: SCENE_IMAGE_MODEL, quality: SCENE_IMAGE_QUALITY },
    { model: SCENE_IMAGE_MODEL, quality: "medium" },
  ];
  const generationAttempts = [
    { model: SCENE_IMAGE_MODEL, quality: SCENE_IMAGE_QUALITY },
    { model: "gpt-image-1", quality: "high" },
  ];
  let lastError;

  for (const attempt of referenceImages.length ? referenceAttempts : generationAttempts) {
    let response;
    try {
      response = referenceImages.length
        ? await requestImageEdit(env, prompt, size, attempt, referenceImages)
        : await requestImageGeneration(env, prompt, size, attempt);
    } catch (error) {
      lastError = providerError(error.message || "Scene image provider request failed.", 503);
      continue;
    }
    let data;
    try {
      data = await readJsonResponse(response);
    } catch (error) {
      lastError = providerError(error.message, response.status);
      continue;
    }
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) {
      return {
        b64,
        ...attempt,
        mode: referenceImages.length ? "reference edit" : "generation",
      };
    }
    lastError = providerError(data.error?.message || `Scene image generation failed with ${attempt.model}.`, response.status);
  }

  if (referenceImages.length) {
    for (const attempt of generationAttempts) {
      let response;
      try {
        response = await requestImageGeneration(env, prompt, size, attempt);
      } catch (error) {
        lastError = providerError(error.message || "Scene image provider request failed.", 503);
        continue;
      }
      let data;
      try {
        data = await readJsonResponse(response);
      } catch (error) {
        lastError = providerError(error.message, response.status);
        continue;
      }
      const b64 = data.data?.[0]?.b64_json;
      if (response.ok && b64) {
        return {
          b64,
          ...attempt,
          mode: "generation fallback",
        };
      }
      lastError = providerError(data.error?.message || `Scene image generation fallback failed with ${attempt.model}.`, response.status);
    }
  }

  throw lastError || new Error("Scene image generation failed.");
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    const cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`Image provider returned a non-JSON response${cleanText ? `: ${cleanText.slice(0, 160)}` : "."}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Image provider returned unreadable JSON.");
  }
}

async function requestImageGeneration(env, prompt, size, attempt) {
  return openAiFetch(env, "/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: attempt.model,
        prompt,
        size,
        quality: attempt.quality,
        n: 1,
      }),
    }, { seed: `${prompt}:${size}:${attempt.model}:${attempt.quality}`, retries: 2 });
}

async function requestImageEdit(env, prompt, size, attempt, referenceImages) {
  const form = new FormData();
  form.append("model", attempt.model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", attempt.quality);
  form.append("n", "1");

  referenceImages.forEach((reference, index) => {
    const file = dataUrlToFile(reference.imageDataUrl, `oprealm-reference-${index + 1}.png`);
    form.append("image[]", file);
  });

  return openAiFetch(env, "/v1/images/edits", {
    method: "POST",
    body: form,
  }, { seed: `${prompt}:${size}:${attempt.model}:${attempt.quality}`, retries: 2 });
}

function providerError(message, status) {
  const error = new Error(message || "Scene image generation failed.");
  error.status = Number(status) || 502;
  return error;
}

function isTemporaryProviderError(error) {
  const status = Number(error?.status || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500;
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

function dataUrlToFile(dataUrl, filename) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Invalid reference image data.");
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return new File([bytes], filename, { type: match[1] });
}

async function logAiUsage(env, user, prompt, web) {
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
        SCENE_IMAGE_COST,
        "openai",
        web?.model || SCENE_IMAGE_MODEL,
        web?.quality || SCENE_IMAGE_QUALITY,
        1,
        SCENE_IMAGE_ESTIMATED_COST_USD,
        JSON.stringify({ source: "ai_story_game_creator", webUserId: user.id, generationMode: web?.mode || "generation" }).slice(0, 1500),
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
