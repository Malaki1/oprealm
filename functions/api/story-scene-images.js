const SCENE_IMAGE_COST = 30;
const SCENE_IMAGE_MODEL = "gpt-image-1.5";
const SCENE_IMAGE_QUALITY = "medium";
const SCENE_IMAGE_ESTIMATED_COST_USD = 0.1;

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
    body.characterType,
    body.characterPersonality,
    body.characterStyle,
    body.characterSafety,
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
  await logAiUsage(env, user, `${mobilePrompt}\n\n--- WEB ---\n${webPrompt}`, mobile, web);

  return json({
    ok: true,
    mobileImageDataUrl: `data:image/png;base64,${mobile.b64}`,
    webImageDataUrl: `data:image/png;base64,${web.b64}`,
    creditsUsed: SCENE_IMAGE_COST,
    model: mobile.model === web.model ? mobile.model : `${mobile.model}, ${web.model}`,
    quality: mobile.quality === web.quality ? mobile.quality : `${mobile.quality}, ${web.quality}`,
  });
}

async function generateImage(env, prompt, size) {
  const attempts = [
    { model: SCENE_IMAGE_MODEL, quality: SCENE_IMAGE_QUALITY },
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
        size,
        quality: attempt.quality,
        n: 1,
      }),
    });
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (response.ok && b64) return { b64, ...attempt };
    lastError = new Error(data.error?.message || `Scene image generation failed with ${attempt.model}.`);
  }

  throw lastError || new Error("Scene image generation failed.");
}

function buildScenePrompt(body, format) {
  const isMobile = format === "mobile";
  return [
    `Create a safe kid-friendly AI story game scene background and composition for OPRealm in ${isMobile ? "vertical 9:16 mobile game view" : "wide 16:9 web game view"}.`,
    "No text, no UI words, no logos, no real children, no personal information, no copyrighted characters, no romance, no gore, no scary realism.",
    "Make it feel like a polished interactive story game scene with clear foreground, midground and background.",
    "Leave clean readable space for choice buttons and dialogue overlays.",
    isMobile ? "Frame the scene vertically with the main action centered and extra safe space near the bottom." : "Frame the scene wide with cinematic depth and safe empty areas near the lower corners.",
    "CHARACTER CONSISTENCY LOCK:",
    "Treat the saved character as a fixed, locked design, not a loose inspiration.",
    "Do not redesign the character. Preserve the same apparent age, body proportions, face shape, hairstyle or fur shape, skin/fur tone, outfit, accessories, color palette, silhouette, and art style across every scene.",
    "If a detail is missing from the character bible, keep that area simple or partially obscured rather than inventing a different design.",
    "The scene may change pose, lighting, camera angle, facial expression, and action, but the character identity must remain recognisably the same.",
    `Scene prompt: ${cleanText(body.prompt || "A magical choice moment begins.", 900)}`,
    `Camera angle: ${cleanText(body.camera || "Wide cinematic reveal", 80)}`,
    `Background: ${cleanText(body.background || "Custom background", 120)}`,
    `Character use: ${cleanText(body.character || "Use saved character", 120)}`,
    `Mood: ${cleanText(body.mood || "Curious", 80)}`,
    `Scene type: ${cleanText(body.type || "Choice moment", 80)}`,
    `Saved character name: ${cleanText(body.characterName || "OPRealm hero", 80)}`,
    `Saved character type/species/role: ${cleanText(body.characterType || "Original story hero", 120)}`,
    `Saved character personality: ${cleanText(body.characterPersonality || "Brave and kind", 120)}`,
    `Saved character visual style: ${cleanText(body.characterStyle || "Bright 3D game mascot", 120)}`,
    `Saved character safety tone: ${cleanText(body.characterSafety || "Friendly and safe for all ages", 160)}`,
    `Saved character core design bible: ${cleanText(body.characterPrompt || "A friendly original story character.", 1200)}`,
  ].join("\n");
}

async function logAiUsage(env, user, prompt, mobile, web) {
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
        mobile?.model === web?.model ? mobile?.model || SCENE_IMAGE_MODEL : `${mobile?.model || SCENE_IMAGE_MODEL}, ${web?.model || SCENE_IMAGE_MODEL}`,
        mobile?.quality === web?.quality ? mobile?.quality || SCENE_IMAGE_QUALITY : `${mobile?.quality || SCENE_IMAGE_QUALITY}, ${web?.quality || SCENE_IMAGE_QUALITY}`,
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
