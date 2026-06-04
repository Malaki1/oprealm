import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import {
  assertRateLimit,
  createGenerationJob,
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

const STYLE_COMPONENTS = {
  "3D Cartoon": "premium kid-friendly 3D cartoon game character render, rounded readable shapes, soft expressive face, polished toy-like lighting",
  Anime: "original anime-inspired adventure character art, expressive eyes, clean cel shading, colorful readable silhouette",
  Realistic: "soft stylized cinematic realism suitable for children, not photorealistic, friendly expression, clean game character presentation",
  Comic: "original comic adventure art with clean ink-like edges, bold shapes, bright readable color blocks",
  Pixar: "premium animated feature-inspired 3D character look, soft appealing proportions, cinematic but kid-safe lighting",
  "60s Cartoon": "1960s-inspired original cartoon adventure style, simple rounded shapes, vintage cel animation feel, warm limited palette, playful expressive character design",
  "90s Cartoon": "1990s-inspired original cartoon adventure style, bold outlines, energetic poses, saturated colors, expressive kid-friendly TV animation feel",
  "Fantasy RPG": "kid-friendly fantasy RPG character art, polished magical adventure styling, readable game silhouette",
};

const OUTFIT_COMPONENTS = {
  Explorer: "explorer jacket with utility pockets, adventure-ready shape, cargo trousers, sturdy boots, practical travel details",
  "Space Suit": "friendly space explorer suit with soft armor panels, rounded helmet-ready collar, clean sci-fi details",
  Ninja: "agile adventure outfit with layered wraps, soft fabric panels, stealthy silhouette, kid-safe non-threatening design",
  Casual: "comfortable everyday adventure clothes, hoodie or jacket, simple trousers, sneakers, approachable modern look",
  Armor: "lightweight heroic adventure armor with rounded safe shapes, shoulder plates, belt details, no sharp threatening edges",
  Pirate: "adventure pirate outfit with long coat, belt details, explorer boots, playful treasure-quest styling, no weapons emphasized",
  Hacker: "futuristic hacker outfit with hooded jacket, glowing trim, techwear panels, compact gadget details",
  Mage: "magical mage outfit with layered robe, glowing trim, fantasy adventurer silhouette, safe wonder-filled styling",
  Mech: "friendly mech pilot suit with rounded armor panels, clean sci-fi plating, glowing core accents",
  Survivor: "rugged survivor explorer outfit with layered jacket, sturdy boots, practical straps and weathered adventure details",
  "Royal Adventurer": "royal adventurer outfit with elegant fantasy coat, refined trim, heroic but age-appropriate explorer styling",
  Custom: "custom creator-designed outfit from the creator's saved outfit details, age-appropriate and easy to recognize",
};

const ACCESSORY_COMPONENTS = {
  "Custom Object": "custom creator-described object, prop, item, gear or vehicle detail from the creator's saved object description",
  Backpack: "small explorer backpack with compact straps and practical pockets",
  Goggles: "adventure goggles worn on the head or around the neck",
  Scarf: "short adventure scarf that adds movement and personality",
  Gloves: "light explorer gloves suited for climbing and discovery",
  Hat: "friendly adventure hat matching the selected outfit",
  None: "no extra accessory items",
};

const PET_COMPONENTS = {
  "Custom Pet": "custom creator-described pet companion from the creator's saved pet description, friendly, kid-safe and clearly matched to the selected master art style",
  "Robot Pet": "small friendly floating robot companion with glowing blue eyes and rounded kid-safe shapes",
  "Magic Cat": "cute magical cat companion with sparkling eyes, soft fur and a tiny enchanted collar",
  "Baby Dragon": "tiny friendly baby dragon companion with soft wings, bright eyes and playful magical energy",
  "Space Pup": "cheerful space puppy companion with a small sci-fi collar and rounded explorer gear",
  "Tiny Dino": "tiny friendly dinosaur companion with bright curious eyes and gentle adventure energy",
  "No Pet": "no pet companion",
};

const COLOR_COMPONENTS = {
  Orange: "warm orange as the main accent color",
  Blue: "bright blue and cyan as supporting glow accents",
  Charcoal: "deep charcoal for grounding fabric and boots",
  Silver: "soft silver for small trims and buckles",
  Purple: "OPREALM purple for magical trim and highlights",
  Green: "fresh green for friendly adventure accents",
};

const PERSONALITY_COMPONENTS = {
  Brave: "confident upright pose and courageous expression",
  Curious: "curious alert eyes and discovery-ready body language",
  Loyal: "warm trustworthy expression and dependable hero energy",
  Smart: "thoughtful problem-solver expression with focused eyes",
  Resourceful: "prepared explorer feeling with practical details and clever confidence",
  Funny: "playful smile and energetic friendly charm",
  Kind: "gentle warm expression and caring body language",
  Determined: "focused determined expression, resilient posture, and ready-for-the-challenge energy",
};

const AGE_GROUP_COMPONENTS = {
  Baby: "baby character proportions, very young and cute, soft rounded features, clearly fictional and child-safe",
  Child: "child character proportions, playful youthful energy, bright curious expression",
  Teen: "teen character proportions, slightly older adventure energy, confident and expressive",
  Adult: "adult character proportions, mature heroic presence, still friendly and age-appropriate",
  Elder: "elder character proportions, wise expressive face, kind mentor energy, graceful posture",
};

function clampCharacterAge(value) {
  const age = Number(value);
  if (!Number.isFinite(age)) return 10;
  return Math.max(0, Math.min(100, Math.round(age)));
}

function ageFromLegacyGroup(value) {
  const legacyAges = {
    Baby: 1,
    Child: 10,
    Teen: 16,
    Adult: 28,
    Elder: 72,
    "6-9": 8,
    "10-12": 11,
    "13-16": 15,
  };
  return legacyAges[value] ?? 10;
}

function ageBandFromAge(value) {
  const age = clampCharacterAge(value);
  if (age <= 2) return "Baby";
  if (age <= 12) return "Child";
  if (age <= 19) return "Teen";
  if (age <= 64) return "Adult";
  return "Elder";
}

const ENVIRONMENT_COMPONENTS = {
  "Warm adventure ruins": "warm golden adventure ruins built around a clear circular stone hero platform in the foreground, broken columns and safe ancient details framing the character, soft depth behind",
  "Magic portal studio": "dark navy OPREALM portal studio with a glowing circular stage platform under the character, purple-cyan portal energy behind, clean particles, futuristic depth and no UI text",
  "Fantasy grove": "bright fantasy grove with a clean magical circular platform in the foreground, flowers and glowing plants around the stage edge, dreamy forest depth and safe adventure atmosphere",
  "Dark kingdom": "moody child-safe dark fantasy kingdom with a visible raised stone platform for the hero, purple glow, distant castle silhouettes, dramatic clouds, no horror and no threatening realism",
  "Candy kingdom": "cheerful candy kingdom with a pastel circular plaza platform in the foreground for the character to stand on, sweet shops, floating candy islands, balloons, waterfalls, flowers and playful depth",
  "Dinosaur jungle": "lush prehistoric jungle with a round carved stone platform in the foreground, jungle plants wrapping the stage, waterfalls, cliffs, distant volcano, ruins, friendly dinosaurs in the distance and adventurous depth",
  "Sky islands": "bright sky-island world with a floating circular platform beneath the character, soft clouds, distant floating islands, waterfalls, portals and magical safe adventure atmosphere",
  "Enchanted forest": "enchanted forest with a luminous circular rune platform in the foreground, ancient trees and vines framing the character, glowing crystals, mushrooms, lanterns, streams and deep magical layers",
  "Underwater realm": "underwater fantasy realm with a clear coral-stone hero platform in the foreground, soft blue light, bubbles, reefs, shells, distant palace shapes and safe dreamy depth",
  "Lava planet": "safe stylized lava planet with a large purple-lit circular sci-fi stone platform in the foreground, lava rivers below and around but not touching the hero, volcano, floating rocks, glowing crystals and epic depth, no horror",
  "Cyber city": "friendly neon cyber city with a clean glowing circular tech platform under the character, blue-purple city lights, holographic depth, safe futuristic mood and no readable text",
};

export async function onRequestPost({ request, env }) {
  try {
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm image generator is not connected yet." }, 500);

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

    const imageResult = await processCharacterImageJob(env, {
      jobId,
      user,
      prompt,
      body,
    });

    const completedJob = await env.OPREALM_DB.prepare("SELECT * FROM generation_jobs WHERE id = ? LIMIT 1").bind(jobId).first();
    return json({
      ...jobResponse(completedJob),
      ...imageResult,
      cached: false,
    });
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
      result: {
        creditsUsed: CHARACTER_IMAGE_COST,
        model: result.model,
        quality: result.quality,
        imageReturnedDirectly: true,
      },
      creditsCharged: CHARACTER_IMAGE_COST,
      model: result.model,
      quality: result.quality,
    });
    return responseResult;
  } catch (error) {
    await markJobFailed(env, jobId, error);
    throw error;
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
    }, { seed: `${prompt}:${attempt.model}:${attempt.quality}`, retries: 2 });

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
  if (body.recipe) return buildCharacterRecipePrompt(body.recipe, body.prompt, body.variation);
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
  const recipe = normalizeCharacterRecipe(body.recipe);
  const normalized = {
    name: recipe?.identity?.name || cleanText(body.name || "New OPRealm hero", 80),
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
    recipe,
  };
  assertSafePrompt(JSON.stringify(normalized));
  return normalized;
}

function normalizeCharacterRecipe(recipe) {
  if (!recipe || typeof recipe !== "object") return null;

  const identity = recipe.identity && typeof recipe.identity === "object" ? recipe.identity : {};
  const visual = recipe.visual && typeof recipe.visual === "object" ? recipe.visual : {};
  const components = recipe.components && typeof recipe.components === "object" ? recipe.components : {};
  const generation = recipe.generation && typeof recipe.generation === "object" ? recipe.generation : {};

  const masterStyle = pickKey(visual.masterStyle || recipe.masterStyle, STYLE_COMPONENTS, "3D Cartoon");
  const outfit = pickKey(components.outfit || recipe.outfit, OUTFIT_COMPONENTS, "Custom");
  const environment = pickKey(components.environment || recipe.environment, ENVIRONMENT_COMPONENTS, "Magic portal studio");
  const accessories = pickMany(components.accessories || recipe.accessories, ACCESSORY_COMPONENTS, ["Custom Object"]);
  const pet = pickKey(components.pet || recipe.pet, PET_COMPONENTS, "Custom Pet");
  const palette = pickPalette(visual.palette || recipe.palette, ["Orange", "Blue", "Charcoal", "Silver"]);
  const traits = pickTraits(identity.traits || recipe.traits, ["Brave", "Curious"]);
  const conflicts = recipeConflicts({ outfit, accessories, masterStyle });
  const characterAge = clampCharacterAge(
    identity.characterAge ??
    recipe.characterAge ??
    identity.age ??
    recipe.age ??
    ageFromLegacyGroup(identity.ageGroup || recipe.ageGroup || identity.ageRange || recipe.ageRange)
  );

  if (conflicts.length) {
    const error = new Error(`Please adjust this character recipe: ${conflicts.join(" ")}`);
    error.status = 400;
    throw error;
  }

  return {
    identity: {
      name: cleanText(identity.name || recipe.name || "New OPRealm hero", 60),
      tagline: cleanText(identity.tagline || recipe.tagline || "", 120),
      characterAge,
      ageGroup: ageBandFromAge(characterAge),
      genderPresentation: enumValue(identity.genderPresentation || recipe.genderPresentation, ["Boy", "Girl", "Other"], "Boy"),
      customGender: cleanText(identity.customGender || recipe.customGender || "", 120),
      characterType: cleanText(identity.characterType || recipe.characterType || "Young adventurer", 80),
      traits,
      voice: cleanText(identity.voice || recipe.voice || "Young Adventurer", 80),
    },
    visual: {
      masterStyle,
      sourceMode: enumValue(visual.sourceMode || recipe.sourceMode, ["AI Generate", "Customize", "Upload"], "AI Generate"),
      palette,
    },
    components: {
      outfit,
      customOutfit: cleanText(components.customOutfit || recipe.customOutfit || "", 300),
      accessories,
      customObject: cleanText(components.customObject || recipe.customObject || "", 300),
      pet,
      customPet: cleanText(components.customPet || recipe.customPet || "", 300),
      environment,
    },
    generation: {
      consistencyLock: generation.consistencyLock !== false,
      changedComponent: cleanText(generation.changedComponent || recipe.changedComponent || "", 80),
      version: Math.max(1, Math.min(99, Number(generation.version || recipe.version || 1) || 1)),
      safetyMode: "Safe component recipe",
    },
  };
}

function buildCharacterRecipePrompt(recipe, promptNotes, variation) {
  const stylePrompt = STYLE_COMPONENTS[recipe.visual.masterStyle];
  const outfitPrompt = recipe.components.outfit === "Custom" && recipe.components.customOutfit
    ? `creator-specified custom outfit: ${recipe.components.customOutfit}`
    : OUTFIT_COMPONENTS[recipe.components.outfit];
  const accessoryPrompts = recipe.components.accessories.map((item) => ACCESSORY_COMPONENTS[item]).filter(Boolean);
  const customObjectPrompt = recipe.components.accessories.includes("Custom Object") && recipe.components.customObject
    ? `Creator-specified custom object/prop: ${recipe.components.customObject}.`
    : "";
  const petPrompt = recipe.components.pet === "Custom Pet" && recipe.components.customPet
    ? `Creator-specified custom pet companion: ${recipe.components.customPet}.`
    : PET_COMPONENTS[recipe.components.pet];
  const colorPrompts = recipe.visual.palette.map((item) => colorPrompt(item)).filter(Boolean);
  const traitPrompts = recipe.identity.traits.map((item) => PERSONALITY_COMPONENTS[item] || `custom trait "${item}" should influence the facial expression, pose, body language, and character energy`).filter(Boolean);
  const environmentPrompt = ENVIRONMENT_COMPONENTS[recipe.components.environment];
  const agePrompt = AGE_GROUP_COMPONENTS[recipe.identity.ageGroup] || AGE_GROUP_COMPONENTS.Child;
  const genderPrompt = recipe.identity.genderPresentation === "Other" && recipe.identity.customGender
    ? `Other: ${recipe.identity.customGender}`
    : recipe.identity.genderPresentation;
  const changedComponent = recipe.generation.changedComponent;

  return [
    "Create exactly one safe original OPREALM story game character image from this locked component recipe.",
    "Critical output rules: no text, no labels, no logos, no watermarks, no posters, no diagrams, no extra UI, no real children, no personal information, no copyrighted characters, no romance, no gore, no scary realism.",
    "Character should be centered, full body or near full body, easy to reuse in story scenes, friendly, expressive, and suitable for children aged 6-16.",
    "Character preview composition: show the character standing clearly on a designed central hero platform or stage that matches the selected environment. The platform must be visible under the feet, not cropped away, and the surrounding world should wrap around the platform with foreground details, midground landmarks, and background depth. Do not make a flat backdrop.",
    "Prompt hierarchy: safety rules override identity; identity and safety override content choices; the selected master visual style controls the entire final artwork including character, outfit, accessories, gear, props, vehicles, lighting treatment, rendering technique, composition, and environment/background.",
    `Master visual style: ${recipe.visual.masterStyle}. ${stylePrompt}.`,
    "Every selected clothing piece, item, accessory, hair, face, body proportion, pose, lighting, vehicle, prop, and background must use the same selected master visual style. Do not mix anime, realistic, comic, vintage cartoon, toy, or 3D styles unless it is the selected master style.",
    "Component descriptions define design only; they must not override or contradict the master visual style.",
    "Color palette boundary: selected colors apply only to outfit fabric, armor panels, accessories, held items, owned props, vehicles, trim, and small glow accents. Do not apply selected colors to skin tone, eye color, hair color, personality traits, facial features, body proportions, or the environment/background.",
    `Name: ${recipe.identity.name}.`,
    `Character age: ${recipe.identity.characterAge}. Age styling group: ${recipe.identity.ageGroup}. ${agePrompt}. Gender presentation: ${genderPrompt}. Character type: ${recipe.identity.characterType}.`,
    recipe.identity.tagline ? `Tagline/vibe: ${recipe.identity.tagline}.` : "",
    `Personality: ${recipe.identity.traits.join(", ")}. ${traitPrompts.join(" ")}`,
    `Voice vibe: ${recipe.identity.voice}.`,
    "Presentation-aware outfit guidance: adapt clothing fit, cut, silhouette, and styling to the selected character presentation while keeping the same outfit concept, respecting creator details, avoiding stereotypes, and staying age-appropriate.",
    `Outfit: ${recipe.components.outfit}. ${outfitPrompt}.`,
    `Accessories/objects: ${recipe.components.accessories.join(", ")}. ${accessoryPrompts.join(" ")} ${customObjectPrompt}`,
    `Pet companion: ${recipe.components.pet}. ${petPrompt}`,
    `Outfit/accessory color palette only: ${recipe.visual.palette.join(", ")}. ${colorPrompts.join(" ")}`,
    `Environment for this preview: ${recipe.components.environment}. ${environmentPrompt}.`,
    recipe.generation.consistencyLock
      ? "Consistency lock is ON: preserve the same face, hair, age, body proportions, outfit structure, palette, and selected accessories in future versions."
      : "Consistency lock is OFF for this first exploratory draft, but still keep the recipe coherent.",
    changedComponent
      ? `Only the changed component should update: ${changedComponent}. Keep all other identity and component details unchanged.`
      : "",
    variation
      ? "Create a fresh variation using the same recipe. Change pose, camera angle, and expression only unless a changed component is named."
      : "Create the first strong character result from this recipe.",
    `Creator prompt notes: ${cleanText(promptNotes || "Make the character feel exciting, kind, and ready for an adventure.", 800)}`,
  ].filter(Boolean).join("\n");
}

function pickKey(value, dictionary, fallback) {
  const text = cleanText(value, 80);
  return Object.prototype.hasOwnProperty.call(dictionary, text) ? text : fallback;
}

function pickMany(value, dictionary, fallback) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const picked = raw
    .map((item) => cleanText(item, 80))
    .filter((item) => Object.prototype.hasOwnProperty.call(dictionary, item));
  return picked.length ? [...new Set(picked)].slice(0, 6) : fallback;
}

function pickTraits(value, fallback) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const picked = raw
    .map((item) => cleanText(item, 32))
    .filter((item) => item.length >= 2)
    .slice(0, 10);
  return picked.length ? [...new Set(picked)] : fallback;
}

function pickPalette(value, fallback) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const picked = raw
    .map((item) => cleanText(item, 80))
    .filter((item) => Object.prototype.hasOwnProperty.call(COLOR_COMPONENTS, item) || /^Custom #[0-9a-fA-F]{6}$/.test(item));
  return picked.length ? [...new Set(picked)].slice(0, 6) : fallback;
}

function colorPrompt(item) {
  if (COLOR_COMPONENTS[item]) return COLOR_COMPONENTS[item];
  const match = /^Custom (#[0-9a-fA-F]{6})$/.exec(item);
  return match ? `custom creator-selected color ${match[1]} as a coherent palette accent` : "";
}

function recipeConflicts({ outfit, accessories }) {
  const conflicts = [];
  if (accessories.includes("None") && accessories.length > 1) {
    conflicts.push("Choose either no accessory or selected accessories, not both.");
  }
  if (outfit === "Space Suit" && accessories.includes("Scarf")) {
    conflicts.push("Space Suit and Scarf may clash visually; choose a safer accessory like Backpack or Goggles.");
  }
  return conflicts;
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
