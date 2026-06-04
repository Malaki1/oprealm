import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, requireMinText } from "../_lib/validate.js";

const WORLD_IMAGE_COST = 18;
const WORLD_IMAGE_MODEL = "gpt-image-1.5";
const WORLD_IMAGE_QUALITY = "high";
const WORLD_IMAGE_ESTIMATED_COST_USD = 0.2;
const WORLD_TOOL = "story_world_image";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm world image generator is not connected yet." }, 500);

    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < WORLD_IMAGE_COST) {
      return json({ ok: false, error: `You need ${WORLD_IMAGE_COST} Creator credits to generate a world image.` }, 402);
    }

    const body = validateWorldBody(await readJson(request, "Invalid world image request."));
    await assertRateLimit(env, user.id, WORLD_TOOL, { limit: 8, windowSeconds: 60 });

    const prompt = buildWorldPrompt(body);
    const image = await generateWorldImage(env, prompt);
    await chargeCredits(env, user.id, WORLD_IMAGE_COST);
    await logAiUsage(env, user, prompt, image);

    return json({
      ok: true,
      imageDataUrl: `data:image/png;base64,${image.b64}`,
      creditsUsed: WORLD_IMAGE_COST,
      model: image.model,
      quality: image.quality,
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "World image generation failed." }, error.status || 500);
  }
}

function validateWorldBody(body) {
  const normalized = {
    name: cleanText(body.name || "Custom Story World", 60),
    prompt: requireMinText(body.prompt, "World prompt", 8, 900),
    moods: normalizeList(body.moods, 10, 32),
    landmarks: normalizeList(body.landmarks, 8, 50),
  };
  assertSafePrompt(JSON.stringify(normalized));
  return normalized;
}

function normalizeList(value, maxItems, maxLength) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(raw.map((item) => cleanText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function buildWorldPrompt(body) {
  const promptMentionsPortal = /\b(portal|gateway|magic gate|wormhole)\b/i.test(body.prompt);
  const safeLandmarks = body.landmarks.filter((landmark) => {
    if (/portal|gateway/i.test(landmark)) return promptMentionsPortal;
    return true;
  });
  return [
    "Create one original OPREALM story-world environment concept from the creator's prompt.",
    "The creator prompt is the source of truth. Invent the environment from that prompt only.",
    "Do not default to OPREALM preset worlds. Do not add a portal, floating portal temple, fantasy grove, lava planet, candy kingdom, jungle, sky island, underwater realm, or dark kingdom unless the creator explicitly asked for that exact idea.",
    "No characters, no people, no readable text, no labels, no logos, no UI, no watermarks, no real children, no unsafe content.",
    "If the creator describes a population, culture, army, or group of people, show the world they built through architecture, vehicles, tools, statues, banners without readable text, technology, landmarks, habitats, and environmental storytelling. Do not put people or characters in the frame.",
    "Composition: portrait story-world concept art with a clear empty circular hero platform in the lower foreground where characters can later stand. The platform must be visible, centered, and surrounded by rich foreground details, midground landmarks, and deep background atmosphere.",
    "Make the world feel cinematic, polished, kid-friendly, safe for ages 6+, and ready to reuse across story scenes.",
    "Use vivid OPREALM production quality only as polish: readable shapes, layered environment, game-world lighting, and premium depth. Color, materials, technology, weather, landmarks, and culture must come from the creator prompt.",
    `World name: ${body.name}.`,
    `Creator world prompt: ${body.prompt}.`,
    body.moods.length ? `Mood tags to blend naturally: ${body.moods.join(", ")}.` : "",
    safeLandmarks.length ? `Reusable landmarks to include only if they fit the prompt: ${safeLandmarks.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
}

async function generateWorldImage(env, prompt) {
  const attempts = [
    { model: WORLD_IMAGE_MODEL, quality: WORLD_IMAGE_QUALITY },
    { model: WORLD_IMAGE_MODEL, quality: "medium" },
    { model: "gpt-image-1", quality: "high" },
    { model: "gpt-image-1", quality: "medium" },
    { model: "gpt-image-1-mini", quality: "high" },
  ];
  let lastError;

  for (const attempt of attempts) {
    const response = await openAiFetch(env, "/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: attempt.model,
        prompt,
        size: "1024x1536",
        quality: attempt.quality,
        n: 1,
      }),
    }, { seed: `${WORLD_TOOL}:${prompt}:${attempt.model}:${attempt.quality}`, retries: 2 });

    const data = await readJsonResponse(response);
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || `World image generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("World image generation failed.");
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`Image provider returned an unreadable response${clean ? `: ${clean.slice(0, 160)}` : "."}`);
  }
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(credits, userId, credits)
    .run();
  if (Number(result?.meta?.changes || 0) <= 0) {
    const error = new Error(`You need ${credits} Creator credits to finish this world image.`);
    error.status = 402;
    throw error;
  }
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
        WORLD_TOOL,
        prompt.slice(0, 1500),
        WORLD_IMAGE_COST,
        "openai",
        imageResult?.model || WORLD_IMAGE_MODEL,
        imageResult?.quality || WORLD_IMAGE_QUALITY,
        1,
        WORLD_IMAGE_ESTIMATED_COST_USD,
        JSON.stringify({ source: "story_world_creator", webUserId: user.id }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story world image usage log failed", error);
  }
}
