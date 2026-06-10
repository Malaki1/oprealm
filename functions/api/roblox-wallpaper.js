import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import {
  assertRateLimit,
  createGenerationJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, enumValue } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const TOOL = "roblox_wallpaper";
const WALLPAPER_COST = CREATOR_CREDIT_COSTS.robloxWallpaper;
const WALLPAPER_ESTIMATED_COST_USD = 0.034;
const WALLPAPER_MODEL = "gpt-image-1.5";
const WALLPAPER_QUALITY = "medium";

const THEMES = [
  "Jungle",
  "Space",
  "Candy",
  "Volcano",
  "Cyber",
  "Ice",
  "Pirate",
  "Sky",
  "Dinosaur",
  "Haunted",
];

const DETAILS = ["Clean", "Detailed", "Premium"];

export async function onRequestPost({ request, env }) {
  try {
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm image generator is not connected yet." }, 500);

    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < WALLPAPER_COST) {
      return json({ ok: false, error: `You need ${WALLPAPER_COST} Creator credits to generate an obby wallpaper.` }, 402);
    }

    const body = validateWallpaperBody(await readJson(request, "Invalid wallpaper request."));
    const prompt = buildWallpaperPrompt(body);
    const promptHash = await sha256Text(`${TOOL}:${WALLPAPER_MODEL}:${WALLPAPER_QUALITY}:${prompt}`);

    await assertRateLimit(env, user.id, TOOL, { limit: 8, windowSeconds: 60 });

    const jobId = crypto.randomUUID();
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: TOOL,
      promptHash,
      idempotencyKey: null,
      creditsReserved: WALLPAPER_COST,
      metadata: {
        source: "roblox_obby_generator",
        route: "/api/roblox-wallpaper",
        theme: body.theme,
        detail: body.detail,
      },
    });

    const imageResult = await processWallpaperJob(env, { jobId, user, prompt, body });
    return json({
      ok: true,
      jobId,
      ...imageResult,
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "Wallpaper generation failed." }, error.status || 500);
  }
}

async function processWallpaperJob(env, { jobId, user, prompt, body }) {
  try {
    await markJobProcessing(env, jobId);
    const result = await generateWallpaperImage(env, prompt);
    const charged = await chargeCredits(env, user.id, WALLPAPER_COST);
    if (!charged) throw Object.assign(new Error(`You need ${WALLPAPER_COST} Creator credits to finish this wallpaper.`), { status: 402 });

    await logAiUsage(env, user, prompt, result, body);
    await markJobCompleted(env, jobId, {
      result: {
        creditsUsed: WALLPAPER_COST,
        theme: body.theme,
        detail: body.detail,
        model: result.model,
        quality: result.quality,
        imageReturnedDirectly: true,
      },
      creditsCharged: WALLPAPER_COST,
      model: result.model,
      quality: result.quality,
    });

    return {
      imageDataUrl: `data:image/png;base64,${result.b64}`,
      creditsUsed: WALLPAPER_COST,
      theme: body.theme,
      detail: body.detail,
      model: result.model,
      quality: result.quality,
      promptUsed: prompt,
    };
  } catch (error) {
    await markJobFailed(env, jobId, error);
    throw error;
  }
}

async function generateWallpaperImage(env, prompt) {
  const attempts = [
    { model: WALLPAPER_MODEL, quality: WALLPAPER_QUALITY },
    { model: WALLPAPER_MODEL, quality: "low" },
    { model: "gpt-image-1", quality: "medium" },
    { model: "gpt-image-1-mini", quality: "high" },
  ];
  let lastError;

  for (const attempt of attempts) {
    const response = await openAiFetch(env, "/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: attempt.model,
        prompt,
        size: "1024x1024",
        quality: attempt.quality,
        n: 1,
      }),
    }, { seed: `${attempt.model}:${attempt.quality}:${prompt}`, retries: 2 });

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || `Wallpaper generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("Wallpaper generation failed.");
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  )
    .bind(credits, userId, credits)
    .run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function logAiUsage(env, user, prompt, imageResult, body) {
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
        TOOL,
        prompt.slice(0, 1500),
        WALLPAPER_COST,
        "openai",
        imageResult?.model || WALLPAPER_MODEL,
        imageResult?.quality || WALLPAPER_QUALITY,
        1,
        WALLPAPER_ESTIMATED_COST_USD,
        JSON.stringify({ source: "roblox_obby_generator", webUserId: user.id, theme: body.theme }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Roblox wallpaper usage log failed", error);
  }
}

function validateWallpaperBody(body) {
  const theme = enumValue(body.theme, THEMES, "");
  if (!theme) {
    const error = new Error("Choose a wallpaper theme first.");
    error.status = 400;
    throw error;
  }

  const notes = cleanText(body.notes || "", 360);
  assertSafePrompt(notes);

  return {
    theme,
    detail: enumValue(body.detail, DETAILS, "Detailed"),
    notes,
  };
}

function buildWallpaperPrompt(body) {
  return [
    "Create a seamless tileable wall texture for an OPRealm Roblox obby.",
    "The image must work as a repeating wallpaper on the inside of Roblox wall parts.",
    "Square 1024x1024 PNG composition, repeatable/tileable edges, no visible seam, no border, no frame.",
    "No text, no logos, no characters, no faces, no real-world brands, no scary realism, no personal information.",
    "Kid-friendly premium game art, bold silhouettes, readable theme motifs, vibrant lighting, polished modern Roblox creator aesthetic.",
    `Theme: ${themePrompt(body.theme)}`,
    `Detail level: ${body.detail}.`,
    body.notes ? `Extra direction from the creator: ${body.notes}` : "Extra direction: keep the motifs instantly recognizable from a distance.",
  ].join("\n");
}

function themePrompt(theme) {
  const map = {
    Jungle: "lush jungle temple wallpaper with vines, carved stone blocks, tropical leaves, glowing moss, ancient safe adventure symbols",
    Space: "deep space galaxy wallpaper with nebula clouds, stars, soft planets, glowing constellations and sci-fi panel accents",
    Candy: "seamless candyland forest wallpaper with lollipops, frosting swirls, gumdrops, sprinkles and pastel sweet-shop shapes",
    Volcano: "volcano lava wallpaper with basalt rock, magma cracks, ember glow, smoke wisps and dramatic warm orange highlights",
    Cyber: "cyber neon wallpaper with holographic grid panels, circuit traces, glowing tech lines, cyan purple energy accents",
    Ice: "ice crystal wallpaper with frosted shards, snow sparkle patterns, blue crystal caves and clean winter highlights",
    Pirate: "pirate island wallpaper with treasure-map motifs, wooden planks, rope, tropical water shapes and gold coin details",
    Sky: "sky kingdom wallpaper with floating clouds, golden arches, soft sun rays, airy palace patterns and magical blue gradients",
    Dinosaur: "dinosaur jungle wallpaper with giant leaves, fossil imprints, friendly dino footprint patterns, vines and ancient stones",
    Haunted: "playfully spooky haunted mansion wallpaper with purple fog, old wood, moonlit windows, cobweb shapes and friendly mystery vibes",
  };
  return map[theme] || map.Space;
}
