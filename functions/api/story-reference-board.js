import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { readJson } from "../_lib/http.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const REFERENCE_BOARD_COST = CREATOR_CREDIT_COSTS.referenceBoard;
const REFERENCE_BOARD_ESTIMATED_COST_USD = 0.2;
const REFERENCE_BOARD_MODEL = "gpt-image-1.5";
const REFERENCE_BOARD_QUALITY = "high";
const REFERENCE_BOARD_TOOL = "story_reference_board";
const MAX_REFERENCE_IMAGES = 4;

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm reference board generator is not connected yet." }, 500);

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please log in before generating a reference board." }, error.status || 401);
  }

  if (Number(user.credits_remaining || 0) < REFERENCE_BOARD_COST) {
    return json({ ok: false, error: `You need ${REFERENCE_BOARD_COST} Creator credits to generate a reference board.` }, 402);
  }

  let body;
  try {
    body = await readJson(request, "Invalid reference board request.", 18 * 1024 * 1024);
  } catch {
    return json({ ok: false, error: "Invalid reference board request." }, 400);
  }

  try {
    await assertRateLimit(env, user.id, REFERENCE_BOARD_TOOL, { limit: 5, windowSeconds: 60 });
  } catch (error) {
    return json({ ok: false, error: error.message || "Too many reference board requests. Try again shortly." }, error.status || 429);
  }

  const safetyWarning = checkPromptSafety([
    body.boardType,
    body.projectTitle,
    body.visualStyle,
    body.prompt,
    body.characterBrief,
    body.environmentBrief,
    body.objectBrief,
  ].join(" "));
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const references = normalizeReferenceImages(body.referenceImages);
  const prompt = buildReferenceBoardPrompt(body, references);

  let result;
  try {
    result = await generateReferenceBoard(env, prompt, references);
  } catch (error) {
    return json({ ok: false, error: error.message || "Reference board generation failed." }, 502);
  }

  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(REFERENCE_BOARD_COST, user.id)
    .run();
  await logAiUsage(env, user, prompt, result, references.length);

  return json({
    ok: true,
    imageDataUrl: `data:image/png;base64,${result.b64}`,
    creditsUsed: REFERENCE_BOARD_COST,
    model: result.model,
    quality: result.quality,
    generationMode: result.mode,
    referenceCount: references.length,
  });
}

async function generateReferenceBoard(env, prompt, referenceImages) {
  const attempts = [
    { model: REFERENCE_BOARD_MODEL, quality: REFERENCE_BOARD_QUALITY },
    { model: REFERENCE_BOARD_MODEL, quality: "medium" },
    { model: "gpt-image-1", quality: "high" },
    { model: "gpt-image-1", quality: "medium" },
  ];
  let lastError;

  for (const attempt of attempts) {
    const response = referenceImages.length
      ? await requestImageEdit(env, prompt, "1536x1024", attempt, referenceImages)
      : await requestImageGeneration(env, prompt, "1536x1024", attempt);
    const data = await readJsonResponse(response);
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) {
      return { b64, ...attempt, mode: referenceImages.length ? "reference edit" : "generation" };
    }
    lastError = new Error(data.error?.message || `Reference board generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("Reference board generation failed.");
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
  }, { seed: `${attempt.model}:${attempt.quality}:${prompt}`, retries: 2 });
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
  }, { seed: `${attempt.model}:${attempt.quality}:${prompt}:edit`, retries: 2 });
}

function buildReferenceBoardPrompt(body, references) {
  const boardType = normalizeBoardType(body.boardType);
  const title = boardTitles[boardType];
  const panelSpec = boardPanels[boardType];

  return [
    `Create a single high-resolution OPREALM story production reference sheet titled "${title}".`,
    "Use the attached source images as the source of truth for identity, style, proportions, outfit, environment, object design, lighting language and color palette.",
    references.length ? `Attached source images: ${references.map((item) => item.label).join(", ")}.` : "No source image was attached, so build a clean original safe reference board from the written brief.",
    "This is for AI Story Game, Comic Book/Story Book, Movie and Trailer Maker workflows only.",
    "All on-image labels must be short, clean and in ENGLISH.",
    "Use a premium dark near-black OPREALM production-board UI with cyan, violet and soft gold accents, thin glowing dividers, compact metadata, and a faint film-grain texture.",
    "No real brands, no social handles, no platform logos, no personal information, no gore, no romance, no frightening realism, no copyrighted characters.",
    "Make the sheet feel kid-safe, professional, cinematic and easy to use as a visual consistency guide.",
    `Board type: ${title}.`,
    `Project title: ${cleanText(body.projectTitle || "Untitled OPREALM Story", 80)}`,
    `Visual style: ${cleanText(body.visualStyle || "Premium kid-safe cinematic game art", 120)}`,
    `Creator notes: ${cleanText(body.prompt || "Create a useful story reference board for consistent future scene generation.", 1200)}`,
    body.characterBrief ? `Character source brief: ${cleanText(body.characterBrief, 800)}` : "",
    body.environmentBrief ? `Environment source brief: ${cleanText(body.environmentBrief, 800)}` : "",
    body.objectBrief ? `Object source brief: ${cleanText(body.objectBrief, 800)}` : "",
    "Include a prominent source/reference area and a metadata block: PROJECT - BOARD TYPE - STYLE - STORY USE - CONSISTENCY LOCK - COLOR SCRIPT - SAFETY NOTE.",
    panelSpec,
    'Bottom note: "Use this OPREALM board as a visual reference for consistent story, comic and trailer generation."',
    "Output as one complete landscape reference board, 16:9, dense but readable, production-grade, clean grid, cinematic color grading.",
  ].filter(Boolean).join("\n");
}

const boardTitles = {
  character: "CHARACTER BOARD",
  location: "LOCATION BOARD",
  object: "OBJECT BOARD",
  creature: "CREATURE BOARD",
  pose: "POSE BOARD",
  shot: "SHOT BOARD",
};

const boardPanels = {
  character: "Panels: 01 HERO DESIGN, 02 FIVE VIEWS front 3/4 side back 3/4, 03 EXPRESSIONS neutral smile focused worried excited, 04 EXACT OUTFIT GARMENT MAP with enlarged callouts for pockets, colored patches, seams, zippers, trim, panels, straps, accessories and left/right placement, 05 LIGHTING MOODS that preserve local garment colors, 06 COLOR PALETTE with six labeled swatches. Treat all visible clothing details and asymmetry as immutable production specifications.",
  location: "Panels: 01 HERO LOCATION, 02 WIDE MID TIGHT ALT OVERHEAD, 03 TIME OF DAY dawn noon dusk night, 04 DETAILS AND SET DRESSING, 05 WEATHER MOODS, 06 COLOR PALETTE with six swatches.",
  object: "Panels: 01 HERO OBJECT, 02 SIX VIEWS front 3/4 side back top detail, 03 MATERIAL MACROS, 04 LIGHTING MOODS, 05 USE IN STORY, 06 COLOR PALETTE with six swatches.",
  creature: "Panels: 01 HERO CREATURE, 02 FIVE VIEWS front 3/4 side back 3/4, 03 EXPRESSIONS calm curious alert roaring tired, 04 ANATOMY DETAILS, 05 SCALE AND BEHAVIOR POSES, 06 COLOR PALETTE with six swatches.",
  pose: "Panels: 01 HERO STANDING POSE, 02 BASIC POSES stand sit walk run jump, 03 ACTION POSES dodge reach climb land point, 04 EXPRESSIONS, 05 ANGLE COVERAGE, 06 COLOR PALETTE with six swatches.",
  shot: "Panels: 01 12-SHOT STORYBOARD SEQUENCE establishing wide, enter, over-shoulder, reaction close-up, insert detail, counter shot, two-shot, tracking, low angle, eyes close-up, pull-back, resolution. 02 EMOTIONAL BEATS, 03 CAMERA NOTES, 04 LIGHTING CONTINUITY, 05 COVERAGE TYPES, 06 COLOR PALETTE.",
};

function normalizeBoardType(value) {
  const type = String(value || "").toLowerCase();
  if (Object.hasOwn(boardTitles, type)) return type;
  return "character";
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

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`Image provider returned a non-JSON response${clean ? `: ${clean.slice(0, 160)}` : "."}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Image provider returned unreadable JSON.");
  }
}

async function logAiUsage(env, user, prompt, result, referenceCount) {
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
        "story_reference_board",
        prompt.slice(0, 1500),
        REFERENCE_BOARD_COST,
        "openai",
        result?.model || REFERENCE_BOARD_MODEL,
        result?.quality || REFERENCE_BOARD_QUALITY,
        1,
        REFERENCE_BOARD_ESTIMATED_COST_USD,
        JSON.stringify({ source: "story_reference_forge", webUserId: user.id, generationMode: result?.mode, referenceCount }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story reference board usage log failed", error);
  }
}

function checkPromptSafety(value) {
  const text = String(value || "").toLowerCase();
  const blocked = [
    "dm me",
    "message me",
    "add me",
    "phone number",
    "address",
    "school name",
    "password",
    "free robux",
    "private chat",
    "meet me",
    "snapchat",
    "instagram",
    "tiktok",
    "whatsapp",
  ];
  const phrase = blocked.find((item) => text.includes(item));
  return phrase ? `Please remove unsafe personal/contact wording like "${phrase}" before generating.` : "";
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
