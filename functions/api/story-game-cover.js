const COVER_IMAGE_COST = 18;
const COVER_IMAGE_ESTIMATED_COST_USD = 0.2;
const COVER_IMAGE_MODEL = "gpt-image-1.5";
const COVER_IMAGE_QUALITY = "high";

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!env.OPENAI_API_KEY) return json({ ok: false, error: "The OPRealm cover generator is not connected yet." }, 500);

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before generating a game cover." }, 401);
  if (Number(user.credits_remaining || 0) < COVER_IMAGE_COST) {
    return json({ ok: false, error: `You need ${COVER_IMAGE_COST} Creator credits to generate a game cover.` }, 402);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid game cover request." }, 400);
  }

  const safetyWarning = checkPromptSafety([
    body.title,
    body.tagline,
    body.vibe,
    body.coverStyle,
    body.logoStyle,
    body.mood,
    body.coverPrompt,
    body.characterName,
    body.characterPrompt,
    body.characterStyle,
  ].join(" "));
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const prompt = buildCoverPrompt(body);
  let result;
  try {
    result = await generateCoverImage(env, prompt);
  } catch (error) {
    return json({ ok: false, error: error.message || "Game cover generation failed." }, 502);
  }

  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(COVER_IMAGE_COST, user.id)
    .run();
  await logAiUsage(env, user, prompt, result);

  return json({
    ok: true,
    imageDataUrl: `data:image/png;base64,${result.b64}`,
    creditsUsed: COVER_IMAGE_COST,
    model: result.model,
    quality: result.quality,
  });
}

async function generateCoverImage(env, prompt) {
  const attempts = [
    { model: COVER_IMAGE_MODEL, quality: COVER_IMAGE_QUALITY },
    { model: COVER_IMAGE_MODEL, quality: "medium" },
    { model: "gpt-image-1", quality: "high" },
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
        size: "1024x1536",
        quality: attempt.quality,
        n: 1,
      }),
    });
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || `Game cover generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("Game cover generation failed.");
}

function buildCoverPrompt(body) {
  return [
    cleanText(body.coverPrompt, 1800) || "Create premium kid-safe cover art for an original OPRealm AI story game.",
    "Critical safety and output rules:",
    "No readable text, no logos, no platform badges, no real brands, no copyrighted characters, no real children, no personal information, no gore, no romance, no bullying, and no scary realism.",
    "Leave clean space near the top for a crisp web-rendered title/logo overlay.",
    `Approved game title context: ${cleanText(body.title || "Untitled Quest", 80)}`,
    `Approved vibe: ${cleanText(body.vibe || "Portal Adventure", 80)}`,
    `Approved cover style: ${cleanText(body.coverStyle || "Premium console game cover", 120)}`,
    `Approved mood: ${cleanText(body.mood || "Epic and exciting", 120)}`,
    body.characterName ? `Saved hero name: ${cleanText(body.characterName, 80)}` : "",
    body.characterStyle ? `Saved hero style: ${cleanText(body.characterStyle, 120)}` : "",
    body.characterPrompt ? `Saved hero design bible: ${cleanText(body.characterPrompt, 900)}` : "",
  ].filter(Boolean).join("\n");
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
        "story_game_cover",
        prompt.slice(0, 1500),
        COVER_IMAGE_COST,
        "openai",
        imageResult?.model || COVER_IMAGE_MODEL,
        imageResult?.quality || COVER_IMAGE_QUALITY,
        1,
        COVER_IMAGE_ESTIMATED_COST_USD,
        JSON.stringify({ source: "ai_story_game_creator", webUserId: user.id }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story game cover usage log failed", error);
  }
}

async function currentUser(request, env) {
  const sessionId = parseCookies(request.headers.get("cookie") || "").oprealm_session;
  if (!sessionId) return null;
  return env.OPREALM_DB.prepare(
    `
      SELECT web_users.*
      FROM web_sessions
      JOIN web_users ON web_users.id = web_sessions.web_user_id
      WHERE web_sessions.id = ?
        AND web_sessions.expires_at > datetime('now')
      LIMIT 1
    `,
  )
    .bind(sessionId)
    .first();
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

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
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
