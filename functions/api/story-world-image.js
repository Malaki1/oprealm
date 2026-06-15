import { requireUser } from "../_lib/auth.js";
import { BFL_IMAGE_MODEL, generateBflImage, hasBflKey } from "../_lib/bfl-images.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, requireMinText } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const WORLD_IMAGE_COST = CREATOR_CREDIT_COSTS.worldImage;
const WORLD_IMAGE_MODEL = BFL_IMAGE_MODEL;
const WORLD_IMAGE_QUALITY = "production";
const WORLD_IMAGE_ESTIMATED_COST_USD = 0.03;
const WORLD_TOOL = "story_world_image";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!hasBflKey(env)) return json({ ok: false, error: "The OPRealm FLUX world image generator is not connected yet." }, 500);

    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < WORLD_IMAGE_COST) {
      return json({ ok: false, error: `You need ${WORLD_IMAGE_COST} Creator credits to generate a world image.` }, 402);
    }

    const body = validateWorldBody(await readJson(request, "Invalid world image request."));
    await assertRateLimit(env, user.id, WORLD_TOOL, { limit: 8, windowSeconds: 60 });

    const startedAt = Date.now();
    const prompt = buildWorldPrompt(body);
    const image = await generateWorldImage(env, prompt);
    await chargeCredits(env, user.id, WORLD_IMAGE_COST);
    await logAiUsage(env, user, prompt, image);

    return json({
      ok: true,
      imageDataUrl: `data:${image.mimeType};base64,${image.b64}`,
      creditsUsed: WORLD_IMAGE_COST,
      model: image.model,
      quality: image.quality,
      elapsedMs: Date.now() - startedAt,
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
  };
  assertSafePrompt(JSON.stringify(normalized));
  return normalized;
}

function normalizeList(value, maxItems, maxLength) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(raw.map((item) => cleanText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function buildWorldPrompt(body) {
  return [
    "Create one original OPREALM story-world environment concept from the creator's prompt.",
    "The creator prompt is the source of truth. Invent the environment from that prompt only.",
    "Do not default to OPREALM preset worlds. Do not add a portal, floating portal temple, fantasy grove, lava planet, candy kingdom, jungle, sky island, underwater realm, or dark kingdom unless the creator explicitly asked for that exact idea.",
    "No characters, no people, no readable text, no labels, no logos, no UI, no watermarks, no real children, no unsafe content.",
    "If the creator describes a population, culture, army, or group of people, show the world they built through architecture, vehicles, tools, statues, banners without readable text, habitats, and environmental storytelling. Do not put people or characters in the frame.",
    "Composition: portrait story-world concept art with a clear empty circular hero platform in the lower foreground where characters can later stand. The platform must be visible, centered, and surrounded by rich foreground details, midground environment, and deep background atmosphere.",
    "Make the world feel cinematic, polished, kid-friendly, safe for ages 6+, and ready to reuse across story scenes.",
    "Use vivid OPREALM production quality only as polish: readable shapes, layered environment, game-world lighting, and premium depth. Color, materials, technology, weather, culture, and special places must come from the creator prompt.",
    `World name: ${body.name}.`,
    `Creator world prompt: ${body.prompt}.`,
    body.moods.length ? `Mood tags to blend naturally: ${body.moods.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
}

async function generateWorldImage(env, prompt) {
  return generateBflImage(env, {
    prompt,
    width: 768,
    height: 1344,
    model: WORLD_IMAGE_MODEL,
  });
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
        imageResult?.provider || "black_forest_labs",
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
