import { requireUser } from "../_lib/auth.js";
import {
  assertRateLimit,
  createGenerationJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  sha256Text,
} from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText, enumValue, requireMinText } from "../_lib/validate.js";

const STORY_COST = 5;
const STORY_MODEL = "gpt-5.5";
const STORY_TOOL = "story_generator";

function storySchema(sceneCount) {
  return {
  type: "object",
  additionalProperties: false,
  required: ["title", "synopsis", "character", "world", "scenes"],
  properties: {
    title: { type: "string" },
    synopsis: { type: "string" },
    character: {
      type: "object",
      additionalProperties: false,
      required: ["name", "type", "personality", "visualStyle", "description"],
      properties: {
        name: { type: "string" },
        type: { type: "string" },
        personality: { type: "string" },
        visualStyle: { type: "string" },
        description: { type: "string" },
      },
    },
    world: {
      type: "object",
      additionalProperties: false,
      required: ["name", "mood", "description"],
      properties: {
        name: { type: "string" },
        mood: { type: "string" },
        description: { type: "string" },
      },
    },
    scenes: {
      type: "array",
      minItems: sceneCount,
      maxItems: sceneCount,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "prompt", "mood", "type", "choices"],
        properties: {
          title: { type: "string" },
          prompt: { type: "string" },
          mood: { type: "string" },
          type: { type: "string", enum: ["Start scene", "Choice moment", "Challenge", "Ending"] },
          choices: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "targetScene"],
              properties: {
                label: { type: "string" },
                targetScene: { type: "integer", minimum: 1, maximum: sceneCount },
              },
            },
          },
        },
      },
    },
  },
  };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) return json({ ok: false, error: "The OPREALM story generator is not connected yet." }, 500);
    const user = await requireUser(request, env);
    if (Number(user.credits_remaining || 0) < STORY_COST) {
      return json({ ok: false, error: `You need ${STORY_COST} Creator credits to generate a story.` }, 402);
    }

    const body = await readJson(request, "Invalid story generator request.");
    const idea = requireMinText(body.idea, "Story idea", 8, 900);
    assertSafePrompt(idea);
    const genre = enumValue(body.genre, ["Fantasy", "Adventure", "Mystery", "Sci-Fi", "Comedy", "Superhero"], "Adventure");
    const mood = enumValue(body.mood, ["Magical", "Epic", "Funny", "Mysterious", "Cozy", "Exciting"], "Magical");
    const ageGroup = enumValue(body.ageGroup, ["6-8", "9-12", "13-16"], "9-12");
    const visualStyle = enumValue(body.visualStyle, ["Bright 3D", "Cartoon Adventure", "Anime Adventure", "Comic Book", "Cozy Storybook", "Pixel Game"], "Bright 3D");
    const sceneCount = [8, 10, 12].includes(Number(body.sceneCount)) ? Number(body.sceneCount) : 10;

    await assertRateLimit(env, user.id, STORY_TOOL, { limit: 6, windowSeconds: 60 });

    const prompt = [
      `Original idea: ${idea}`,
      `Genre: ${genre}`,
      `Mood: ${mood}`,
      `Age group: ${ageGroup}`,
      `Visual style: ${visualStyle}`,
      `Create exactly ${sceneCount} connected scenes for a safe pick-a-path story game.`,
      `Scene 1 must be the opening. Scenes 2-${sceneCount - 1} must offer meaningful progress, discoveries, choices or challenges. Scene ${sceneCount} must be a satisfying positive ending.`,
      "Each scene needs exactly two short player choices. Choices must point to valid scene numbers and never point backward to Scene 1.",
      "Keep the hero, world rules, stakes and visual style consistent. Use original characters only.",
      "No real-person data, romance, graphic violence, gore, bullying, gambling, unsafe contact, copyrighted characters or frightening realism.",
      "Prompts should clearly describe visible action suitable for later scene-image generation.",
    ].join("\n");

    const jobId = crypto.randomUUID();
    await createGenerationJob(env, {
      id: jobId,
      userId: user.id,
      tool: STORY_TOOL,
      promptHash: await sha256Text(`${STORY_MODEL}:${sceneCount}:${prompt}`),
      creditsReserved: STORY_COST,
      metadata: { sceneCount, genre, mood, ageGroup, visualStyle },
    });

    try {
      await markJobProcessing(env, jobId);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: STORY_MODEL,
          reasoning: { effort: "low" },
          instructions: "You are OPREALM's child-safe interactive story designer. Return a coherent, original and production-ready story plan.",
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "oprealm_story_plan",
              strict: true,
              schema: storySchema(sceneCount),
            },
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(data.error?.message || "Story generation failed."), { status: 502 });

      const outputText = extractOutputText(data);
      if (!outputText) throw Object.assign(new Error("The story generator returned an empty response."), { status: 502 });
      const story = normalizeStory(JSON.parse(outputText), visualStyle, sceneCount);

      const charged = await chargeCredits(env, user.id, STORY_COST);
      if (!charged) throw Object.assign(new Error(`You need ${STORY_COST} Creator credits to finish this story.`), { status: 402 });
      await logUsage(env, user, prompt, data);
      await markJobCompleted(env, jobId, {
        result: { title: story.title, sceneCount: story.scenes.length },
        creditsCharged: STORY_COST,
        model: data.model || STORY_MODEL,
        quality: "structured_text",
      });

      return json({ ok: true, story, creditsUsed: STORY_COST, model: data.model || STORY_MODEL });
    } catch (error) {
      await markJobFailed(env, jobId, error);
      throw error;
    }
  } catch (error) {
    return json({ ok: false, error: error.message || "Story generation failed." }, error.status || 500);
  }
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

function normalizeStory(story, visualStyle, sceneCount) {
  const scenes = story.scenes.slice(0, sceneCount).map((scene, index) => ({
    title: cleanText(scene.title, 80) || `Scene ${index + 1}`,
    prompt: cleanText(scene.prompt, 900),
    mood: cleanText(scene.mood, 80) || "Curious",
    type: index === 0 ? "Start scene" : index === sceneCount - 1 ? "Ending" : scene.type,
    choices: scene.choices.slice(0, 2).map((choice) => ({
      label: cleanText(choice.label, 70),
      targetScene: Math.max(index === sceneCount - 1 ? sceneCount : index + 2, Math.min(sceneCount, Number(choice.targetScene) || index + 2)),
    })),
  }));
  return {
    title: cleanText(story.title, 80),
    synopsis: cleanText(story.synopsis, 500),
    character: {
      name: cleanText(story.character.name, 48),
      type: cleanText(story.character.type, 80),
      personality: cleanText(story.character.personality, 120),
      visualStyle,
      description: cleanText(story.character.description, 700),
    },
    world: {
      name: cleanText(story.world.name, 80),
      mood: cleanText(story.world.mood, 80),
      description: cleanText(story.world.description, 700),
    },
    scenes,
  };
}

async function chargeCredits(env, userId, credits) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(credits, userId, credits).run();
  return Number(result?.meta?.changes || 0) > 0;
}

async function logUsage(env, user, prompt, response) {
  try {
    await env.OPREALM_DB.prepare(
      `INSERT INTO ai_usage (discord_user_id, guild_id, tool, prompt, credits_used, provider, model, quality, provider_units, estimated_cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, 'openai', ?, 'text', ?, 0, datetime('now'))`,
    ).bind(user.discord_user_id || user.id, user.guild_id || "web", STORY_TOOL, prompt, STORY_COST, response.model || STORY_MODEL, response.usage?.total_tokens || 0).run();
  } catch {
    // Story generation remains usable if analytics storage is unavailable.
  }
}
