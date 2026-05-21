const SCENE_IMAGE_COST = 8;
const SCENE_IMAGE_MODEL = "gpt-image-1-mini";
const SCENE_IMAGE_QUALITY = "low";
const SCENE_IMAGE_ESTIMATED_COST_USD = 0.01;

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
  if (!env.OPENAI_API_KEY) return json({ ok: false, error: "The OPRealm scene image generator is not connected yet." }, 500);

  const user = await currentUser(request, env);
  if (!user) return json({ ok: false, error: "Please log in before generating scene images." }, 401);
  if (Number(user.credits_remaining || 0) < SCENE_IMAGE_COST) {
    return json({ ok: false, error: `You need ${SCENE_IMAGE_COST} Creator credits to generate scene images.` }, 402);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid scene image request." }, 400);
  }

  const safetyWarning = checkPromptSafety([
    body.prompt,
    body.camera,
    body.background,
    body.character,
    body.mood,
    body.type,
    body.characterName,
    body.characterPrompt,
  ].join(" "));
  if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);

  const mobilePrompt = buildScenePrompt(body, "mobile");
  const webPrompt = buildScenePrompt(body, "web");
  let mobile;
  let web;
  try {
    [mobile, web] = await Promise.all([
      generateImage(env, mobilePrompt, "1024x1536"),
      generateImage(env, webPrompt, "1536x1024"),
    ]);
  } catch (error) {
    return json({ ok: false, error: error.message || "Scene image generation failed." }, 502);
  }

  await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(SCENE_IMAGE_COST, user.id)
    .run();
  await logAiUsage(env, user, `${mobilePrompt}\n\n--- WEB ---\n${webPrompt}`);

  return json({
    ok: true,
    mobileImageDataUrl: `data:image/png;base64,${mobile}`,
    webImageDataUrl: `data:image/png;base64,${web}`,
    creditsUsed: SCENE_IMAGE_COST,
  });
}

async function generateImage(env, prompt, size) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: SCENE_IMAGE_MODEL,
      prompt,
      size,
      quality: SCENE_IMAGE_QUALITY,
      n: 1,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Scene image generation failed.");
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("The scene image generator did not return an image.");
  return b64;
}

function buildScenePrompt(body, format) {
  const isMobile = format === "mobile";
  return [
    `Create a safe kid-friendly AI story game scene background and composition for OPRealm in ${isMobile ? "vertical 9:16 mobile game view" : "wide 16:9 web game view"}.`,
    "No text, no UI words, no logos, no real children, no personal information, no copyrighted characters, no romance, no gore, no scary realism.",
    "Make it feel like a polished interactive story game scene with clear foreground, midground and background.",
    "Leave clean readable space for choice buttons and dialogue overlays.",
    isMobile ? "Frame the scene vertically with the main action centered and extra safe space near the bottom." : "Frame the scene wide with cinematic depth and safe empty areas near the lower corners.",
    `Scene prompt: ${cleanText(body.prompt || "A magical choice moment begins.", 900)}`,
    `Camera angle: ${cleanText(body.camera || "Wide cinematic reveal", 80)}`,
    `Background: ${cleanText(body.background || "Custom background", 120)}`,
    `Character use: ${cleanText(body.character || "Use saved character", 120)}`,
    `Mood: ${cleanText(body.mood || "Curious", 80)}`,
    `Scene type: ${cleanText(body.type || "Choice moment", 80)}`,
    `Saved character name: ${cleanText(body.characterName || "OPRealm hero", 80)}`,
    `Saved character details: ${cleanText(body.characterPrompt || "A friendly original story character.", 500)}`,
  ].join("\n");
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
        "story_scene_images",
        prompt.slice(0, 1500),
        SCENE_IMAGE_COST,
        "openai",
        SCENE_IMAGE_MODEL,
        SCENE_IMAGE_QUALITY,
        2,
        SCENE_IMAGE_ESTIMATED_COST_USD,
        JSON.stringify({ source: "ai_story_game_creator", webUserId: user.id }).slice(0, 1500),
      )
      .run();
  } catch (error) {
    console.error("Story scene image usage log failed", error);
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
