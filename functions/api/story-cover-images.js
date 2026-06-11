import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, requireMinText } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const COVER_COST = CREATOR_CREDIT_COSTS.gameCover;
const COVER_TOOL = "story_cover_set";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm cover generator is not connected yet." }, 500);
    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < COVER_COST) {
      return json({ ok: false, error: `You need ${COVER_COST} Creator credits to generate this cover concept.` }, 402);
    }
    const body = normalizeBody(await readJson(request, "Invalid cover generation request.", 12 * 1024 * 1024));
    await assertRateLimit(env, user.id, COVER_TOOL, { limit: 6, windowSeconds: 120 });

    const concepts = [
      { label: "Epic Storybook", note: "Best match", direction: "Show the hero undertaking the story's most exciting central action, with the world opening behind them." },
      { label: "Character Spotlight", note: "Hero-focused", direction: "Create a powerful close character-led composition that makes the hero instantly memorable and emotionally readable." },
      { label: "Adventure Promise", note: "World-focused", direction: "Create a sweeping world-led composition that promises discovery, danger and wonder while keeping the hero clearly visible." },
    ];
    const conceptIndex = Math.max(0, Math.min(2, Number(body.conceptIndex || 0)));
    const concept = concepts[conceptIndex];
    const prompt = buildPrompt(body, concept);
    const result = await generateCover(env, prompt);
    await chargeCredits(env, user.id, COVER_COST);
    return json({ ok: true, cover: { ...concept, imageDataUrl: `data:image/png;base64,${result.b64}` }, creditsUsed: COVER_COST });
  } catch (error) {
    return json({ ok: false, error: error.message || "Cover generation failed." }, error.status || 500);
  }
}

function normalizeBody(body) {
  const normalized = {
    title: requireMinText(body.title, "Story title", 3, 80),
    summary: requireMinText(body.summary, "Story summary", 12, 1000),
    theme: cleanText(body.theme || "", 80),
    genre: cleanText(body.genre || "Children's fantasy adventure", 80),
    hero: cleanText(JSON.stringify(body.hero || {}), 1200),
    world: cleanText(JSON.stringify(body.world || {}), 1200),
    conceptIndex: Number(body.conceptIndex || 0),
  };
  assertSafePrompt(JSON.stringify(normalized));
  return normalized;
}

function buildPrompt(body, concept) {
  return [
    "Create an original professional children's storybook cover illustration for OPRealm.",
    "Portrait 2:3 cover composition. Premium publishing quality, immediately readable silhouette, expressive character acting, rich depth, clear focal hierarchy, age-appropriate excitement.",
    "IMPORTANT: artwork only. Do not include any text, title, author name, lettering, logo, border, UI, badge or watermark. OPRealm adds editable typography later.",
    "Do not imitate copyrighted characters or named living artists. Keep the image safe for children.",
    `Cover direction: ${concept.direction}`,
    `Story title for context only: ${body.title}.`,
    `Genre: ${body.genre}. Theme: ${body.theme || "courage and discovery"}.`,
    `Story summary: ${body.summary}.`,
    `Locked hero design: ${body.hero}.`,
    `Locked world design: ${body.world}.`,
    "Preserve the hero's identity, age, gender presentation, outfit, colours and species from the supplied design description.",
    "Leave visually calm space near the top or bottom for editable title typography, but do not draw text.",
  ].join("\n");
}

async function generateCover(env, prompt) {
  const attempts = [
    { model: "gpt-image-1.5", quality: "high" },
    { model: "gpt-image-1.5", quality: "medium" },
    { model: "gpt-image-1", quality: "high" },
  ];
  let lastError;
  for (const attempt of attempts) {
    const response = await openAiFetch(env, "/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: attempt.model, prompt, size: "1024x1536", quality: attempt.quality, n: 1 }),
    }, { seed: `${COVER_TOOL}:${prompt}:${attempt.model}:${attempt.quality}`, retries: 2 });
    const data = await response.json().catch(() => ({}));
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || "The cover image service is temporarily unavailable.");
    lastError.status = response.status >= 500 ? 503 : response.status;
  }
  throw lastError || new Error("Cover generation failed.");
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(credits, userId, credits).run();
  if (Number(result?.meta?.changes || 0) <= 0) {
    const error = new Error(`You need ${credits} Creator credits to keep this cover set.`);
    error.status = 402;
    throw error;
  }
}
