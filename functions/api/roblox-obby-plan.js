import { requireUser } from "../_lib/auth.js";
import {
  assertRateLimit,
  createGenerationJob,
  findCachedJob,
  findIdempotentJob,
  jobResponse,
  markJobCompleted,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, enumValue, requireMinText } from "../_lib/validate.js";

const TOOL = "roblox_obby_plan";
const THEMES = ["Volcano", "Candy", "Space", "Cyber", "Jungle"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const OBSTACLES = [
  "Moving platforms",
  "Lava jumps",
  "Speed boosts",
  "Spinning hammers",
  "Disappearing platforms",
  "Conveyor belts",
];

const THEME_KEYWORDS = [
  ["Volcano", ["volcano", "lava", "magma", "fire", "eruption", "ash", "hot"]],
  ["Candy", ["candy", "donut", "sweet", "chocolate", "gummy", "rainbow", "lollipop"]],
  ["Space", ["space", "planet", "alien", "asteroid", "moon", "laser", "galaxy", "rocket"]],
  ["Cyber", ["cyber", "neon", "robot", "tech", "hacker", "glitch", "laser", "future"]],
  ["Jungle", ["jungle", "temple", "vine", "monkey", "tree", "swamp", "ruins", "snake"]],
];

const OBSTACLE_KEYWORDS = [
  ["Moving platforms", ["moving", "floating", "shifting", "platform"]],
  ["Lava jumps", ["lava", "fire", "magma", "jump"]],
  ["Speed boosts", ["speed", "boost", "fast", "dash", "run"]],
  ["Spinning hammers", ["spin", "spinning", "hammer", "blade", "fan"]],
  ["Disappearing platforms", ["disappear", "invisible", "vanish", "rainbow", "timed"]],
  ["Conveyor belts", ["conveyor", "belt", "push", "factory", "moving floor"]],
];

export async function onRequestPost({ request, env }) {
  if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);

  let user;
  try {
    user = await requireUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error.message || "Please log in before generating an obby plan." }, error.status || 401);
  }

  let body;
  let prompt;
  let requestedDifficulty;
  try {
    body = await readJson(request, "Invalid obby generator request.");
    prompt = requireMinText(body.prompt, "Obby idea", 6, 500);
    assertSafePrompt(prompt);
    requestedDifficulty = enumValue(body.difficulty, DIFFICULTIES, "");
  } catch (error) {
    return json({ ok: false, error: error.message || "Invalid obby generator request." }, error.status || 400);
  }
  const promptHash = await sha256Text([TOOL, prompt, requestedDifficulty].join("\n"));
  const idempotencyKey = cleanText(request.headers.get("x-idempotency-key") || body.idempotencyKey, 120) || null;

  if (idempotencyKey) {
    const existing = await findIdempotentJob(env, user.id, TOOL, idempotencyKey);
    if (existing) return json(jobResponse(existing));
  }

  const cached = await findCachedJob(env, user.id, TOOL, promptHash);
  if (cached) return json(jobResponse(cached, { cached: true }));

  try {
    await assertRateLimit(env, user.id, TOOL, { limit: 12, windowSeconds: 60 });
  } catch (error) {
    return json({ ok: false, error: error.message || "Too many obby requests. Try again in a moment." }, error.status || 429);
  }

  const jobId = crypto.randomUUID();
  const job = await createGenerationJob(env, {
    id: jobId,
    userId: user.id,
    tool: TOOL,
    promptHash,
    idempotencyKey,
    creditsReserved: 0,
    metadata: { source: "studio", deterministic: true },
  });

  const plan = buildObbyPlan(prompt, requestedDifficulty);
  await markJobCompleted(env, job.id, {
    result: plan,
    creditsCharged: 0,
    model: "oprealm-deterministic-v1",
    quality: "constrained",
  });

  const completed = await env.OPREALM_DB.prepare("SELECT * FROM generation_jobs WHERE id = ?").bind(job.id).first();
  return json(jobResponse(completed || job));
}

function buildObbyPlan(prompt, requestedDifficulty) {
  const theme = detectTheme(prompt);
  const difficulty = requestedDifficulty || detectDifficulty(prompt);
  const obstacles = detectObstacles(prompt, theme, difficulty);
  const sectionCount = difficulty === "Hard" ? 8 : difficulty === "Medium" ? 6 : 4;
  const checkpoints = buildCheckpoints(sectionCount);
  const sections = Array.from({ length: sectionCount }, (_, index) =>
    buildSection(index, theme, difficulty, obstacles[index % obstacles.length], sectionCount),
  );

  return {
    theme,
    difficulty,
    targetBuildTimeSeconds: 30,
    supportedThemes: THEMES,
    supportedObstacles: OBSTACLES,
    safetyMode: {
      constrainedGeneration: true,
      noFreeformLua: true,
      noUserUploadedScripts: true,
      childSafeThemeOnly: true,
    },
    obby: {
      title: titleForPrompt(prompt, theme),
      seed: hashSeed(prompt),
      spawn: { position: [0, 6, 0], faceDirection: "forward" },
      finish: { reward: "Victory burst + badge-ready completion event" },
      checkpoints,
      sections,
    },
    pluginPayload: {
      version: "oprealm-obby-v1",
      command: "BuildObbyFromSpec",
      prefabPack: `${theme.toLowerCase()}_starter_pack`,
      gridUnit: 12,
      maxPartsEstimate: 260,
      plan: {
        theme,
        difficulty,
        obstacles,
        sectionCount,
        seed: hashSeed(prompt),
      },
    },
    nextActions: [
      "Send this JSON to the Roblox Studio plugin.",
      "Plugin assembles prefabs, places checkpoints, then runs playability validation.",
      "Child hits Play, tests the obby, then remixes the prompt.",
    ],
  };
}

function detectTheme(prompt) {
  const text = prompt.toLowerCase();
  const match = THEME_KEYWORDS
    .map(([theme, words]) => ({ theme, score: words.filter((word) => text.includes(word)).length }))
    .sort((a, b) => b.score - a.score)[0];
  return match?.score ? match.theme : "Volcano";
}

function detectDifficulty(prompt) {
  const text = prompt.toLowerCase();
  if (/\b(impossible|insane|hard|extreme|rage|tower)\b/.test(text)) return "Hard";
  if (/\b(medium|tricky|challenge|laser|moving)\b/.test(text)) return "Medium";
  return "Easy";
}

function detectObstacles(prompt, theme, difficulty) {
  const text = prompt.toLowerCase();
  const requested = OBSTACLE_KEYWORDS
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([obstacle]) => obstacle);
  const themeDefaults = {
    Volcano: ["Lava jumps", "Disappearing platforms", "Moving platforms"],
    Candy: ["Disappearing platforms", "Speed boosts", "Moving platforms"],
    Space: ["Moving platforms", "Speed boosts", "Conveyor belts"],
    Cyber: ["Conveyor belts", "Spinning hammers", "Disappearing platforms"],
    Jungle: ["Moving platforms", "Spinning hammers", "Lava jumps"],
  }[theme];
  const difficultyAdds = difficulty === "Hard" ? ["Spinning hammers", "Conveyor belts"] : difficulty === "Medium" ? ["Moving platforms"] : ["Speed boosts"];
  return [...new Set([...requested, ...themeDefaults, ...difficultyAdds])].slice(0, 6);
}

function buildCheckpoints(sectionCount) {
  return Array.from({ length: sectionCount + 1 }, (_, index) => ({
    id: `checkpoint_${index}`,
    afterSection: index === 0 ? "spawn" : index,
    position: [index * 72, 7, 0],
  }));
}

function buildSection(index, theme, difficulty, obstacle, sectionCount) {
  const length = difficulty === "Hard" ? 7 : difficulty === "Medium" ? 6 : 5;
  return {
    id: `section_${index + 1}`,
    label: `${theme} ${obstacle}`,
    order: index + 1,
    obstacle,
    length,
    startPosition: [index * 72, 6, 0],
    endPosition: [(index + 1) * 72, 6, 0],
    checkpointAfter: `checkpoint_${index + 1}`,
    intensity: index === sectionCount - 1 ? "finale" : index < 2 ? "warmup" : "challenge",
    playabilityRules: {
      maxJumpGapStuds: difficulty === "Hard" ? 11 : difficulty === "Medium" ? 9 : 7,
      minimumPlatformWidthStuds: difficulty === "Hard" ? 5 : 7,
      recoveryKillPlane: true,
      checkpointBeforeHazard: index === 0,
    },
    themeDressing: themeDressing(theme, index),
  };
}

function themeDressing(theme, index) {
  const dressing = {
    Volcano: ["lava glow", "smoke puffs", "basalt rocks", "safe lava sharks as decoration"],
    Candy: ["giant donuts", "gummy rails", "sprinkle particles", "chocolate river"],
    Space: ["asteroids", "neon stars", "planet backdrop", "safe laser gates"],
    Cyber: ["neon strips", "glitch panels", "hologram arrows", "robot billboards"],
    Jungle: ["vines", "ancient stones", "leaf particles", "temple torches"],
  }[theme];
  return dressing.slice(index % 2, index % 2 + 3);
}

function titleForPrompt(prompt, theme) {
  const clean = cleanText(prompt, 70);
  const firstPhrase = clean.split(/[.!?]/)[0].replace(/^make me an?\s+/i, "").trim();
  if (firstPhrase.length >= 8) return titleCase(firstPhrase.slice(0, 56));
  return `${theme} Obby Challenge`;
}

function titleCase(value) {
  return String(value).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function hashSeed(prompt) {
  let hash = 0;
  for (const char of String(prompt)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash || 20260524;
}
