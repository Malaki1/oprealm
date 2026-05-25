import { requireUser } from "../_lib/auth.js";
import {
  assertRateLimit,
  createGenerationJob,
  findCachedJob,
  findIdempotentJob,
  jobResponse,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, enumValue, requireMinText } from "../_lib/validate.js";

const CHARACTER_IMAGE_COST = 18;
const CHARACTER_IMAGE_ESTIMATED_COST_USD = 0.068;
const CHARACTER_IMAGE_MODEL = "gpt-image-1.5";
const CHARACTER_IMAGE_QUALITY = "high";
const CHARACTER_TOOL = "story_character_image";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) return json({ ok: false, error: "The OPRealm image generator is not connected yet." }, 500);

    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < CHARACTER_IMAGE_COST) {
      return json({ ok: false, error: `You need ${CHARACTER_IMAGE_COST} Creator credits to generate a character image.` }, 402);
    }

    const body = validateCharacterBody(await readJson(request, "Invalid character image request."));
    const prompt = buildCharacterImagePrompt(body);
    const promptHash = await sha256Text(`${CHARACTER_TOOL}:${CHARACTER_IMAGE_MODEL}:${CHARACTER_IMAGE_QUALITY}:${prompt}`);
    const idempotencyKey = cleanText(request.headers.get("x-idempotency-key") || body.idempotencyKey || "", 120) || null;

    const existingJob = await findIdempotentJob(env, user.id, CHARACTER_TOOL, idempotencyKey);
    if (existingJob) return json(jobResponse(existingJob));

    const cachedJob = await findCachedJob(env, user.id, CHARACTER_TOOL, promptHash);
    if (cachedJob) return json(jobResponse(cachedJob, { cached: true }));

    await assertRateLimit(env, user.id, CHARACTER_TOOL, { limit: 8, windowSeconds: 60 });

    const jobId = crypto.randomUUID();
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: CHARACTER_TOOL,
      promptHash,
      idempotencyKey,
      creditsReserved: CHARACTER_IMAGE_COST,
      metadata: {
        source: "ai_story_game_creator",
        route: "/api/story-character-image",
        variation: Boolean(body.variation),
      },
    });

    await processCharacterImageJob(env, {
      jobId,
      user,
      prompt,
      body,
    });

    const completedJob = await env.OPREALM_DB.prepare("SELECT * FROM generation_jobs WHERE id = ? LIMIT 1").bind(jobId).first();
    return json(jobResponse(completedJob));
  } catch (error) {
    return json({ ok: false, error: error.message || "Character image generation failed." }, error.status || 500);
  }
}

async function processCharacterImageJob(env, { jobId, user, prompt }) {
  try {
    await markJobProcessing(env, jobId);
    const result = await generateCharacterImage(env, prompt);
    const charged = await chargeCredits(env, user.id, CHARACTER_IMAGE_COST);
    if (!charged) throw Object.assign(new Error(`You need ${CHARACTER_IMAGE_COST} Creator credits to finish this character image.`), { status: 402 });

    const responseResult = {
      imageDataUrl: `data:image/png;base64,${result.b64}`,
      creditsUsed: CHARACTER_IMAGE_COST,
      model: result.model,
      quality: result.quality,
    };
    await logAiUsage(env, user, prompt, result);
    await markJobCompleted(env, jobId, {
      result: responseResult,
      creditsCharged: CHARACTER_IMAGE_COST,
      model: result.model,
      quality: result.quality,
    });
  } catch (error) {
    await markJobFailed(env, jobId, error);
  }
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(credits, userId, credits)
    .run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function generateCharacterImage(env, prompt) {
  const attempts = [
    { model: CHARACTER_IMAGE_MODEL, quality: CHARACTER_IMAGE_QUALITY },
    { model: CHARACTER_IMAGE_MODEL, quality: "medium" },
    { model: "gpt-image-1", quality: "medium" },
    { model: "gpt-image-1-mini", quality: "high" },
  ];
  let lastError;

  for (const attempt of attempts) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: attempt.model,
        prompt,
        size: "1024x1024",
        quality: attempt.quality,
        n: 1,
      }),
    });

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || `Character image generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("Character image generation failed.");
}

async function logAiUsage(env, user, prompt, imageResult) {
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
        "story_character_image",
        prompt.slice(0, 1500),
        CHARACTER_IMAGE_COST,
        "openai",
        imageResult?.model || CHARACTER_IMAGE_MODEL,
        imageResult?.quality || CHARACTER_IMAGE_QUALITY,
        1,
        CHARACTER_IMAGE_ESTIMATED_COST_USD,
        JSON.stringify({ source: "ai_story_game_creator", webUserId: user.id }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story character image usage log failed", error);
  }
}

function buildCharacterImagePrompt(body) {
  return [
    "Create one safe kid-friendly AI story game character image for OPRealm.",
    "Use a clean centered character portrait on a simple transparent-feeling or soft gradient background.",
    "No text, no logos, no real children, no personal information, no copyrighted characters, no romance, no gore, no scary realism.",
    "The character should be original, friendly, expressive, and suitable for children aged 7-16.",
    `Character name: ${cleanText(body.name || "New OPRealm hero", 80)}`,
    `Character idea: ${cleanText(body.prompt || "A beginner-friendly pick-a-path story hero.", 800)}`,
    `Character type: ${cleanText(body.type || "Young explorer", 80)}`,
    `Personality: ${cleanText(body.personality || "Brave and kind", 80)}`,
    `Visual style: ${cleanText(body.style || "Bright 3D game mascot", 80)}`,
    styleGuidance(body.style),
    `Safety tone: ${cleanText(body.safety || "Friendly and safe for all ages", 120)}`,
    body.variation
      ? "Create a fresh variation of this character with the same identity, age-safe tone, and style, but change the pose, outfit details, expression, color accents, and silhouette slightly."
      : "Create the first strong visual design for this character.",
  ].join("\n");
}

function validateCharacterBody(body) {
  const normalized = {
    name: cleanText(body.name || "New OPRealm hero", 80),
    prompt: requireMinText(body.prompt || "A beginner-friendly pick-a-path story hero.", "Character prompt", 5, 800),
    type: enumValue(body.type, [
      "Custom",
      "Young explorer",
      "Robot helper",
      "Fantasy creature",
      "Space adventurer",
      "Everyday kid hero",
    ], "Custom"),
    personality: enumValue(body.personality, [
      "Brave and kind",
      "Curious and funny",
      "Calm problem-solver",
      "Inventive and energetic",
      "Shy but growing confident",
    ], "Brave and kind"),
    style: enumValue(body.style, [
      "Bright 3D game mascot",
      "Fantasy RPG",
      "Cozy storybook",
      "Pixel game hero",
      "Cartoon adventure",
      "Futuristic OPREALM style",
      "Anime adventure",
      "Manga hero",
      "Chibi character",
    ], "Bright 3D game mascot"),
    safety: enumValue(body.safety, [
      "Friendly and safe for all ages",
      "Funny with no bullying",
      "Mysterious but not scary",
      "Adventure with safe choices",
    ], "Friendly and safe for all ages"),
    variation: Boolean(body.variation),
    idempotencyKey: cleanText(body.idempotencyKey || "", 120),
  };
  assertSafePrompt(Object.values(normalized).join(" "));
  return normalized;
}

function styleGuidance(style) {
  const key = String(style || "").toLowerCase();
  if (key.includes("anime")) {
    return "Style guidance: polished original anime-inspired adventure art, expressive eyes, dynamic pose, clean cel shading, colorful game character design, not copied from any existing anime.";
  }
  if (key.includes("manga")) {
    return "Style guidance: original manga-inspired hero design with clean ink-like linework, bold readable silhouette, expressive face, limited but polished shading, no copyrighted manga references.";
  }
  if (key.includes("chibi")) {
    return "Style guidance: original chibi game character with cute proportions, oversized head, small body, soft rounded shapes, cheerful expression, toy-like kid-safe charm.";
  }
  if (key.includes("fantasy rpg")) {
    return "Style guidance: premium kid-friendly fantasy RPG character art, readable game silhouette, tasteful adventurer outfit, expressive heroic pose, polished painterly lighting, magical details without scary realism, no weapons pointed at viewer.";
  }
  return "Style guidance: keep the chosen visual style clear, kid-friendly, original, and suitable for a game character asset.";
}
