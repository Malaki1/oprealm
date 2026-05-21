const CHARACTER_IMAGE_COST = 4;
const CHARACTER_IMAGE_ESTIMATED_COST_USD = 0.005;
const CHARACTER_IMAGE_MODEL = "gpt-image-1-mini";
const CHARACTER_IMAGE_QUALITY = "low";

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!env.OPENAI_API_KEY) return json({ ok: false, error: "The OPRealm image generator is not connected yet." }, 500);

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before generating a character image." }, 401);
  if (Number(user.credits_remaining || 0) < CHARACTER_IMAGE_COST) {
    return json({ ok: false, error: `You need ${CHARACTER_IMAGE_COST} Creator credits to generate a character image.` }, 402);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid character image request." }, 400);
  }

  const safetyWarning = checkPromptSafety([
    body.name,
    body.prompt,
    body.type,
    body.personality,
    body.style,
    body.safety,
  ].join(" "));
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const prompt = buildCharacterImagePrompt(body);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CHARACTER_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: CHARACTER_IMAGE_QUALITY,
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return json({ ok: false, error: data.error?.message || "Character image generation failed." }, 502);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return json({ ok: false, error: "The image generator did not return an image." }, 502);

  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(CHARACTER_IMAGE_COST, user.id)
    .run();
  await logAiUsage(env, user, prompt);

  return json({
    ok: true,
    imageDataUrl: `data:image/png;base64,${b64}`,
    creditsUsed: CHARACTER_IMAGE_COST,
  });
}

async function logAiUsage(env, user, prompt) {
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
        CHARACTER_IMAGE_MODEL,
        CHARACTER_IMAGE_QUALITY,
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
  return "Style guidance: keep the chosen visual style clear, kid-friendly, original, and suitable for a game character asset.";
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
