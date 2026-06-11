import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";

const STORY_DRAFT_COST = CREATOR_CREDIT_COSTS.storyDraft;
const STORY_DRAFT_MODEL = "gpt-5-mini";
const STORY_DRAFT_TOOL = "story_draft";
const MIN_SCENE_COUNT = 16;
const MAX_SCENE_COUNT = 32;
const SCENE_MOODS = ["Wonder", "Mystery", "Action", "Epic", "Funny", "Emotional", "Tense", "Peaceful"];
const SCENE_CAMERAS = ["Wide Shot", "Medium Shot", "Close Up", "Low Angle", "POV", "Drone Shot", "Over Shoulder", "Tracking Shot"];

const storyDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "chapters", "scenes"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    chapters: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "paragraphs"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 2,
            maxItems: 8,
            items: { type: "string" },
          },
        },
      },
    },
    scenes: {
      type: "array",
      minItems: MIN_SCENE_COUNT,
      maxItems: MAX_SCENE_COUNT,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "passage", "script", "mood", "camera", "visualDirection", "choices"],
        properties: {
          title: { type: "string" },
          passage: { type: "string" },
          script: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["speaker", "speakerRole", "text"],
              properties: {
                speaker: { type: "string" },
                speakerRole: { type: "string", enum: ["narrator", "hero", "supporting"] },
                text: { type: "string" },
              },
            },
          },
          mood: { type: "string", enum: SCENE_MOODS },
          camera: { type: "string", enum: SCENE_CAMERAS },
          visualDirection: { type: "string" },
          choices: {
            type: "array",
            minItems: 0,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  },
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPREALM_DB) return json({ ok: false, error: "OPRealm database is not connected." }, 500);
    if (!hasOpenAiKey(env)) return json({ ok: false, error: "The OPRealm story writer is not connected yet." }, 500);
    const user = await requireUser(request, env);
    const body = await readJson(request, "Invalid story request.");
    const mode = body.mode === "split" ? "split" : "write";
    if (mode === "write" && Number(user.credits_remaining || 0) < STORY_DRAFT_COST) {
      return json({ ok: false, error: `You need ${STORY_DRAFT_COST} Creator credits to write this story.` }, 402);
    }
    const character = cleanText(body.character, 1200);
    const cast = cleanText(body.cast, 2400);
    const world = cleanText(body.world, 1600);
    const storyType = cleanText(body.storyType, 80) || "Epic Quest";
    const endingType = cleanText(body.endingType, 80) || "Happy";
    const lessonTheme = cleanText(body.lessonTheme, 80) || "Courage";
    const objects = Array.isArray(body.objects)
      ? body.objects.map((item) => cleanText(item, 120)).filter((item) => item && !/^custom (pet|object)$/i.test(item)).slice(0, 6)
      : [];
    assertSafePrompt([character, cast, world, storyType, endingType, lessonTheme, ...objects].join(" "));
    await assertRateLimit(env, user.id, STORY_DRAFT_TOOL, { limit: 4, windowSeconds: 60 });

    const approvedStory = cleanProse(body.approvedStory, 16000);
    if (mode === "split" && approvedStory.length < 200) {
      return json({ ok: false, error: "Please approve a complete story before building scenes." }, 400);
    }
    const input = mode === "split" ? [
      `Approved story title: ${cleanText(body.title, 100) || "My OPREALM Story"}`,
      `Approved story text: ${approvedStory}`,
      `Exact speaking cast and roles: ${cast || "Use only names present in the approved story."}`,
      `Divide this exact approved story into between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT} visual scenes. Never use fewer than ${MIN_SCENE_COUNT}.`,
      "Do not rewrite, summarize or add events to the approved story.",
      "Choose scene boundaries at meaningful changes in location, action, discovery, emotion or consequence.",
      "Identify the existing chapters and paragraphs. If the edited story has no chapter headings, divide it into naturally titled chapters without changing its events.",
      "For every chapter, provide one clear sentence describing what happens in that chapter without revealing later chapters.",
      "Provide a concise spoiler-light summary of the complete approved story.",
      "Each passage must quote or closely preserve only the matching events from the approved story.",
      "For every scene, return a play-style script of 1 to 8 short beats in the exact order they occur. Label narration as speaker 'Narrator' with speakerRole 'narrator'. Label hero dialogue with the hero's exact saved name and speakerRole 'hero'. Label every other character with their exact cast name and speakerRole 'supporting'.",
      "Never assign dialogue to Narrator when a named character speaks it. Never assign a supporting character's line to the hero. Preserve the actual spoken words rather than paraphrasing them as narration.",
      "For each scene, choices must be an empty array unless the story reaches a genuine decision that changes what happens next. At a genuine decision, provide only 2 or 3 short, specific actions the player can choose.",
      "Never add generic choices merely to make a scene interactive. Never attach consequence hints, lessons or emotional labels to a choice.",
      "Each visualDirection is a 1-2 sentence concrete visual seed for the scene card. Name the actual character, location, visible action and important object from the approved passage.",
      "Never write generic substitutes such as 'the hero', 'the story world', 'first landmark', 'mysterious clue', 'strange obstacle' or 'a new part of the world'.",
      `Choose one scene-specific mood from: ${SCENE_MOODS.join(", ")}.`,
      `Choose one scene-specific camera from: ${SCENE_CAMERAS.join(", ")}.`,
      "Vary mood and camera according to the actual scene. Do not assign the same pair to every scene unless the story genuinely requires it.",
      "Do not include plot explanations, lessons, future events, prompt instructions or story structure in visualDirection.",
    ].join("\n") : [
      `Hero: ${character || "An original child-safe hero."}`,
      `Exact speaking cast and roles: ${cast || "Only the hero is currently available."}`,
      `World: ${world || "An original child-safe adventure world."}`,
      `Story type: ${storyType}.`,
      `Ending type: ${endingType}.`,
      `Theme to demonstrate through actions, never explain directly: ${lessonTheme}.`,
      objects.length ? `Optional named story objects: ${objects.join(", ")}. Use only when naturally needed.` : "There are no required story objects. Do not invent a featured prop or magical object.",
      "Write one complete, exciting story for children aged 7-13, approximately 900-1400 words.",
      "Organize it into 3 to 8 titled chapters. Each chapter must contain 2 to 8 proper paragraphs, with dialogue and action separated naturally.",
      "Prioritize concrete events, goals, obstacles, discoveries, plans and consequences. Use symbolism sparingly and never let poetic imagery replace what actually happens.",
      "Include regular spoken exchanges. Let the hero state plans, ask direct questions and make decisions aloud; let supporting characters answer, disagree, warn, joke, reveal information and change the course of events.",
      "Avoid vague phrases such as 'as if to say' when a character can simply speak. Do not invent unexplained hybrid creatures, symbolic messengers or magical objects merely to decorate the prose.",
      "For every chapter, provide one clear sentence describing its main events, goal or discovery without revealing later chapters.",
      "Also provide a concise spoiler-light summary of the complete story.",
      "Do not generate possible outcomes here. Branching outcomes are created later when the AI Story Book is prepared.",
      "The visible story must contain only narrative prose: concrete action, atmosphere, character reactions, discoveries, dialogue and consequences.",
      "Within the narrative paragraphs, never discuss story structure, plot twists, themes, lessons, arcs, scenes, the reader, prompts, image generation or what the story is trying to teach.",
      "Do not summarize future events before they happen. Let mysteries and twists unfold naturally.",
      "Maintain continuity and escalating stakes. Give supporting characters motives and let choices cause later consequences.",
      `After writing the full story, decide how many visual scenes are needed to tell it properly. Use between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT} scenes; never use fewer than ${MIN_SCENE_COUNT}.`,
      "Choose scene boundaries at meaningful changes in location, action, discovery, emotion or consequence. Do not force equal-length chunks.",
      "Each passage must quote or closely preserve the corresponding story events for internal continuity, narration and subtitles.",
      "For every scene, return a play-style script of 1 to 8 short beats in story order. Every spoken line must use the exact saved character name. Use speakerRole 'hero' only for the selected hero, 'supporting' for every other named character, and 'narrator' only for visible action or description.",
      "Never turn a named character's dialogue into Narrator speech. Never give a supporting character's dialogue to the hero. Keep quoted dialogue as dialogue in the script.",
      "For each scene, choices must be an empty array unless the story reaches a genuine decision that changes the next event. At a genuine decision, provide only 2 or 3 concise, concrete actions the player can take.",
      "Do not create generic, decorative or repetitive choices. Do not include consequence hints, themes or lessons in the choice labels.",
      "Each visualDirection is a 1-2 sentence concrete visual seed. Name the actual character, location, visible physical action and important object for that exact moment.",
      "Never write generic substitutes such as 'the hero', 'the story world', 'first landmark', 'mysterious clue', 'strange obstacle' or 'a new part of the world'.",
      `Choose one scene-specific mood from: ${SCENE_MOODS.join(", ")}.`,
      `Choose one scene-specific camera from: ${SCENE_CAMERAS.join(", ")}.`,
      "Vary mood and camera with the action: intimate feelings favor Close Up or Over Shoulder, movement favors Tracking Shot or POV, major reveals favor Wide Shot or Drone Shot, and heroic power moments favor Low Angle.",
      "Do not include story-planning language in visualDirection. Do not mention plot structure, themes, lessons, prompts or what happens in later scenes.",
      "No copyrighted characters, graphic violence, romance, personal data, unsafe contact, or frightening realism.",
    ].join("\n");

    const response = await openAiFetch(env, "/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: STORY_DRAFT_MODEL,
        reasoning: { effort: "low" },
        instructions: mode === "split"
          ? "You are OPREALM's storyboard editor. Preserve the approved story exactly and create a faithful visual scene breakdown."
          : "You are OPREALM's expert children's fiction writer. Write immersive narrative prose, not an outline, synopsis, lesson explanation or production plan.",
        input,
        text: {
          format: {
            type: "json_schema",
            name: "oprealm_story_draft",
            strict: true,
            schema: storyDraftSchema,
          },
        },
      }),
    }, { seed: `${user.id}:${character}:${world}:${storyType}:${endingType}:${lessonTheme}`, retries: 1 });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ ok: false, error: data.error?.message || "Story writing failed." }, 502);
    const output = extractOutputText(data);
    if (!output) return json({ ok: false, error: "The story writer returned an empty response." }, 502);
    const draft = normalizeDraft(JSON.parse(output));

    if (mode === "write") {
      const charged = await chargeCredits(env, user.id);
      if (!charged) return json({ ok: false, error: `You need ${STORY_DRAFT_COST} Creator credits to finish this story.` }, 402);
    }
    return json({ ok: true, draft, creditsUsed: mode === "write" ? STORY_DRAFT_COST : 0, model: data.model || STORY_DRAFT_MODEL });
  } catch (error) {
    return json({ ok: false, error: error.message || "Story writing failed." }, error.status || 500);
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

function normalizeDraft(value) {
  const chapters = (value.chapters || []).slice(0, 8).map((chapter, index) => ({
    title: cleanText(chapter.title, 100) || `Chapter ${index + 1}`,
    description: cleanText(chapter.description, 420) || chapterDescriptionFromParagraphs(chapter.paragraphs, index),
    paragraphs: (chapter.paragraphs || [])
      .slice(0, 8)
      .map((paragraph) => cleanProse(paragraph, 2400))
      .filter(Boolean),
  })).filter((chapter) => chapter.paragraphs.length);
  const formattedStory = formatChapters(chapters);
  return {
    title: cleanText(value.title, 100) || "My OPREALM Story",
    summary: cleanProse(value.summary, 1800),
    chapters,
    story: formattedStory,
    scenes: (value.scenes || []).slice(0, MAX_SCENE_COUNT).map((scene, index) => ({
      title: cleanText(scene.title, 100) || `Scene ${index + 1}`,
      passage: cleanText(scene.passage, 1800),
      script: normalizeSceneScript(scene.script),
      mood: enumSceneValue(scene.mood, SCENE_MOODS, "Wonder"),
      camera: enumSceneValue(scene.camera, SCENE_CAMERAS, "Wide Shot"),
      visualDirection: cleanText(scene.visualDirection, 1800),
      choices: (Array.isArray(scene.choices) ? scene.choices : [])
        .map((choice) => cleanText(choice, 180))
        .filter(Boolean)
        .slice(0, 3),
    })),
  };
}

function normalizeSceneScript(script) {
  return (Array.isArray(script) ? script : [])
    .map((beat) => {
      const role = ["narrator", "hero", "supporting"].includes(beat?.speakerRole)
        ? beat.speakerRole
        : /^narrator$/i.test(String(beat?.speaker || "")) ? "narrator" : "supporting";
      return {
        speaker: role === "narrator" ? "Narrator" : cleanText(beat?.speaker, 100),
        speakerRole: role,
        text: cleanText(beat?.text, 700),
      };
    })
    .filter((beat) => beat.speaker && beat.text)
    .slice(0, 8);
}

function chapterDescriptionFromParagraphs(paragraphs, index) {
  const text = cleanProse(Array.isArray(paragraphs) ? paragraphs[0] : "", 420);
  const sentence = text.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  return sentence || `The next part of the adventure unfolds in Chapter ${index + 1}.`;
}

function enumSceneValue(value, allowed, fallback) {
  const text = cleanText(value, 60);
  return allowed.includes(text) ? text : fallback;
}

function cleanProse(value, maxLength = 16000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function formatChapters(chapters) {
  return chapters.map((chapter, index) => {
    const title = (cleanText(chapter.title, 100) || `Chapter ${index + 1}`)
      .replace(/^chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight)\s*[:.-]?\s*/i, "")
      .trim() || `Chapter ${index + 1}`;
    return `Chapter ${index + 1}: ${title}\n\n${chapter.paragraphs.join("\n\n")}`;
  }).join("\n\n");
}

async function chargeCredits(env, userId) {
  const result = await env.OPREALM_DB.prepare(
    "UPDATE web_users SET credits_remaining = credits_remaining - ?, updated_at = datetime('now') WHERE id = ? AND credits_remaining >= ?",
  ).bind(STORY_DRAFT_COST, userId, STORY_DRAFT_COST).run();
  return Number(result?.meta?.changes || 0) > 0;
}
