import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { checkPromptSafety, cleanText } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const BRANCH_COST = CREATOR_CREDIT_COSTS.storyBranch;
const BRANCH_TOOL = "story_branch";

const outcomeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "passage", "script", "imagePrompt"],
  properties: {
    title: { type: "string" },
    passage: { type: "string" },
    script: {
      type: "array",
      minItems: 3,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text"],
        properties: {
          speaker: { type: "string" },
          text: { type: "string" },
        },
      },
    },
    imagePrompt: { type: "string" },
  },
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm branching story generator is not connected yet." }, 500);
    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < BRANCH_COST) {
      return json({ ok: false, error: `You need ${BRANCH_COST} Creator credits to create a new story outcome.` }, 402);
    }
    const body = await readJson(request, "Invalid branching story request.", 14 * 1024 * 1024);
    const storyTitle = cleanText(body.storyTitle, 120);
    const storyContext = cleanStoryInput(body.storyContext, 1800);
    const currentPassage = cleanStoryInput(body.currentPassage, 2400);
    const currentVisual = cleanStoryInput(body.currentVisual, 1800);
    const choice = cleanText(body.choice, 180);
    const character = normalizeCharacterData(body.character);
    const cast = normalizeCastData(body.cast);
    const world = cleanStoryInput(body.world, 1600);
    const nextPassage = cleanStoryInput(body.nextPassage, 1800);
    const referenceImages = normalizeReferenceImages(body.referenceImages);
    const safetyWarning = checkPromptSafety([storyTitle, storyContext, currentPassage, currentVisual, choice, character, cast, world, nextPassage].join(" "));
    if (safetyWarning) return json({ ok: false, error: safetyWarning }, 400);
    if (currentPassage.length < 40 || choice.length < 4) {
      return json({ ok: false, error: "This scene needs a stronger passage and choice before a new outcome can be created." }, 400);
    }
    await assertRateLimit(env, user.id, BRANCH_TOOL, { limit: 3, windowSeconds: 60 });

    const outcome = await writeOutcome(env, {
      storyTitle,
      storyContext,
      currentPassage,
      currentVisual,
      choice,
      character,
      cast,
      world,
      nextPassage,
      userId: user.id,
    });
    const image = await createOutcomeImage(env, outcome.imagePrompt, {
      character,
      world,
      referenceImages,
    });
    const charged = await chargeCredits(env, user.id);
    if (!charged) return json({ ok: false, error: `You need ${BRANCH_COST} Creator credits to finish this outcome.` }, 402);

    return json({
      ok: true,
      outcome: {
        title: outcome.title,
        passage: outcome.passage,
        script: outcome.script,
        imageDataUrl: `data:image/png;base64,${image}`,
      },
      creditsUsed: BRANCH_COST,
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "The new story outcome could not be created." }, error.status || 500);
  }
}

async function writeOutcome(env, details) {
  const response = await openAiFetch(env, "/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      reasoning: { effort: "low" },
      instructions: "You write clear, exciting branching fiction for children aged 7-13. Continue the exact story moment caused by the player's choice. Prioritize concrete events, decisions, discoveries, obstacles and consequences over symbolism or descriptions of feelings. Characters must speak naturally to each other. Never explain the plot structure, prompt or lesson. Custom Object and Custom Pet are empty interface placeholders, never story facts. Never mention, invent, describe or illustrate those labels.",
      input: [
        `Story title: ${details.storyTitle}`,
        `Story context: ${details.storyContext}`,
        `Hero: ${details.character}`,
        `Available speaking cast: ${details.cast}`,
        `World: ${details.world}`,
        `Current passage: ${details.currentPassage}`,
        `Current visual: ${details.currentVisual}`,
        `Player choice: ${details.choice}`,
        `Later main-story passage to reconnect toward without copying or spoiling it: ${details.nextPassage}`,
        "Write a clear 140-220 word outcome in which something specific happens and changes the situation.",
        "Use plain, visual language. Avoid symbolic objects, dreamlike metaphors, unexplained magical hybrids, poetic gestures used instead of actions, and sentences that only describe feelings.",
        "Return 3-7 playable script beats. At least two named characters must speak when the available cast contains two or more characters. Give the hero a useful line that advances the plan, and have another character answer, disagree, warn, reveal information or ask a meaningful question.",
        "Narrator beats may briefly describe visible action, but most beats should be spoken dialogue. Do not use dialogue such as 'as if to say'; let the character say the words directly.",
        "The outcome must honor the choice and end at a believable point where the main adventure can continue.",
        "Create a cinematic visual prompt for this exact new outcome. Show active characters and consequences, not text, UI, captions or a generic glowing object.",
        "Keep it original, child-safe and visually consistent with the supplied hero and world.",
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "oprealm_branch_outcome",
          strict: true,
          schema: outcomeSchema,
        },
      },
    }),
  }, { seed: `${details.userId}:${details.choice}:${Date.now()}`, retries: 1 });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || "Branch writing failed."), { status: 502 });
  const output = extractOutputText(data);
  if (!output) throw Object.assign(new Error("The branch writer returned an empty outcome."), { status: 502 });
  const value = JSON.parse(output);
  return {
    title: cleanText(value.title, 100) || "A New Path",
    passage: cleanStoryInput(value.passage, 2600),
    script: normalizeScript(value.script),
    imagePrompt: cleanStoryInput(value.imagePrompt, 2200),
  };
}

function normalizeCastData(value) {
  const raw = String(value || "");
  try {
    const cast = JSON.parse(raw);
    return cleanText(JSON.stringify(
      (Array.isArray(cast) ? cast : [])
        .map((item) => ({
          name: cleanText(item?.name || "", 100),
          role: cleanText(item?.role || item?.type || "", 160),
        }))
        .filter((item) => item.name && !/^(custom object|custom pet|none)$/i.test(item.name))
        .slice(0, 6),
    ), 1800);
  } catch {
    return "[]";
  }
}

function normalizeScript(script) {
  return (Array.isArray(script) ? script : [])
    .map((beat) => ({
      speaker: cleanText(beat?.speaker || "Narrator", 100) || "Narrator",
      text: cleanStoryInput(beat?.text, 600),
    }))
    .filter((beat) => beat.text)
    .slice(0, 7);
}

function normalizeCharacterData(value) {
  const raw = String(value || "");
  try {
    const character = JSON.parse(raw);
    const customObject = cleanText(character.customObject || "", 300);
    const customPet = cleanText(character.customPet || "", 300);
    const accessories = (Array.isArray(character.accessories) ? character.accessories : [])
      .map((item) => /^custom object$/i.test(String(item)) ? customObject : cleanText(item, 160))
      .filter((item) => item && !/^(none|custom object)$/i.test(item));
    const pet = /^custom pet$/i.test(String(character.pet || ""))
      ? customPet
      : cleanText(character.pet || "", 160);
    delete character.customObject;
    delete character.customPet;
    return cleanText(JSON.stringify({
      ...character,
      accessories,
      pet: /^(none|no pet|custom pet)$/i.test(pet) ? "" : pet,
    }), 2400);
  } catch {
    return cleanStoryInput(raw, 2400);
  }
}

function cleanStoryInput(value, maxLength) {
  return cleanText(
    String(value || "")
      .replace(/[^.!?]*(?:custom object|custom pet)[^.!?]*[.!?]?/gi, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/\s{2,}/g, " "),
    maxLength,
  );
}

async function createOutcomeImage(env, prompt, details) {
  const lockedPrompt = [
    "Create one polished 16:9 cinematic storybook illustration for OPRealm.",
    "Child-safe adventure art for ages 7-13. No readable text, captions, logos, interface or speech bubbles.",
    "Make the chosen action and its consequence immediately understandable.",
    "CHARACTER AND OUTFIT CONSISTENCY LOCK: The first reference image is the exact hero identity and outfit source. Preserve the same face, body proportions, hair or fur, skin or fur tone, outfit pieces, outfit colors, accessories, silhouette and art style. Do not redesign, recolor, remove, replace or modernize the outfit.",
    "SCENE CONTINUITY LOCK: The current approved scene reference establishes lighting, rendering style and nearby environment. Continue from it rather than inventing a visually unrelated scene.",
    "WORLD LOCK: Preserve the saved world's architecture, materials, atmosphere and color language from its reference.",
    `Saved character design and outfit data: ${details.character}`,
    `Saved world data: ${details.world}`,
    prompt,
  ].join("\n");
  const response = details.referenceImages.length
    ? await requestOutcomeEdit(env, lockedPrompt, details.referenceImages)
    : await requestOutcomeGeneration(env, lockedPrompt);
  const data = await response.json().catch(() => ({}));
  const b64 = data.data?.[0]?.b64_json;
  if (!response.ok || !b64) throw Object.assign(new Error(data.error?.message || "Branch illustration failed."), { status: 502 });
  return b64;
}

function requestOutcomeGeneration(env, prompt) {
  return openAiFetch(env, "/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1.5",
      prompt,
      size: "1536x1024",
      quality: "high",
      output_format: "png",
    }),
  }, { seed: prompt, retries: 1 });
}

function requestOutcomeEdit(env, prompt, referenceImages) {
  const form = new FormData();
  form.append("model", "gpt-image-1.5");
  form.append("prompt", prompt);
  form.append("size", "1536x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  referenceImages.forEach((reference, index) => {
    form.append("image[]", dataUrlToFile(reference.imageDataUrl, `branch-reference-${index + 1}.png`));
  });
  return openAiFetch(env, "/v1/images/edits", {
    method: "POST",
    body: form,
  }, { seed: prompt, retries: 1 });
}

function normalizeReferenceImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => ({
      label: cleanText(image?.label || "Story reference", 100),
      imageDataUrl: String(image?.imageDataUrl || ""),
    }))
    .filter((image) => /^data:image\/(png|jpe?g|webp);base64,/i.test(image.imageDataUrl))
    .slice(0, 3);
}

function dataUrlToFile(dataUrl, filename) {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Invalid branch reference image.");
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type: match[1] });
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

async function chargeCredits(env, userId) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(BRANCH_COST, userId, BRANCH_COST).run();
  return Number(result?.meta?.changes || 0) > 0;
}
