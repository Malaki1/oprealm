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
const DECISION_TYPES = ["trust_choice", "sacrifice_choice", "courage_choice", "mercy_choice", "mystery_deduction", "loyalty_choice", "betrayal_choice", "final_fate_choice"];
const ENDING_TYPES = ["heroic_ending", "wise_ending", "betrayal_ending", "friendship_ending", "chaos_ending", "secret_ending"];
const SCORE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["courage", "wisdom", "trust", "loyalty", "danger", "kindness"],
  properties: Object.fromEntries(["courage", "wisdom", "trust", "loyalty", "danger", "kindness"].map((key) => [key, { type: "integer", minimum: -3, maximum: 3 }])),
};
const STORY_CHOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "label", "description", "nextSceneId", "emotionalHook", "visibleHint", "hiddenConsequence", "outcomeTag", "scoreEffects", "setsFlags", "requiresClueIds"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    description: { type: "string" },
    nextSceneId: { type: "string" },
    emotionalHook: { type: "string" },
    visibleHint: { type: "string" },
    hiddenConsequence: { type: "string" },
    outcomeTag: { type: "string" },
    scoreEffects: SCORE_SCHEMA,
    setsFlags: { type: "array", maxItems: 4, items: { type: "string" } },
    requiresClueIds: { type: "array", maxItems: 3, items: { type: "string" } },
  },
};
const DECISION_NODE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "sceneId", "title", "setupText", "questionText", "decisionType", "emotionalTone", "choices", "clueReferences", "visualPrompt", "consequenceMode"],
  properties: {
    id: { type: "string" },
    sceneId: { type: "string" },
    title: { type: "string" },
    setupText: { type: "string" },
    questionText: { type: "string" },
    decisionType: { type: "string", enum: DECISION_TYPES },
    emotionalTone: { type: "string" },
    choices: { type: "array", minItems: 2, maxItems: 3, items: STORY_CHOICE_SCHEMA },
    clueReferences: { type: "array", maxItems: 3, items: { type: "string" } },
    visualPrompt: { type: "string" },
    consequenceMode: { type: "string", enum: ["branch_and_converge", "ending"] },
  },
};

const storyDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "logicPlan", "chapters", "scenes"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    logicPlan: {
      type: "object",
      additionalProperties: false,
      required: ["centralMystery", "heroEmotionalFlaw", "clues", "decisions", "endingRules"],
      properties: {
        centralMystery: { type: "string" },
        heroEmotionalFlaw: { type: "string" },
        clues: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "introducedInSceneId", "clueText", "visualObject", "linkedDecisionId", "helpsChoiceId", "subtlety"],
            properties: {
              id: { type: "string" },
              introducedInSceneId: { type: "string" },
              clueText: { type: "string" },
              visualObject: { type: "string" },
              linkedDecisionId: { type: "string" },
              helpsChoiceId: { type: "string" },
              subtlety: { type: "string", enum: ["subtle", "moderate", "clear"] },
            },
          },
        },
        decisions: { type: "array", minItems: 3, maxItems: 4, items: DECISION_NODE_SCHEMA },
        endingRules: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "endingType", "sceneId", "minimumScores", "requiredFlags", "requiredClueIds", "preferredOutcomeTags"],
            properties: {
              id: { type: "string" },
              endingType: { type: "string", enum: ENDING_TYPES },
              sceneId: { type: "string" },
              minimumScores: SCORE_SCHEMA,
              requiredFlags: { type: "array", maxItems: 5, items: { type: "string" } },
              requiredClueIds: { type: "array", maxItems: 3, items: { type: "string" } },
              preferredOutcomeTags: { type: "array", maxItems: 4, items: { type: "string" } },
            },
          },
        },
      },
    },
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
        required: ["id", "title", "passage", "script", "mood", "camera", "visualDirection", "choices", "decisionNode"],
        properties: {
          id: { type: "string" },
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
          choices: { type: "array", minItems: 0, maxItems: 3, items: STORY_CHOICE_SCHEMA },
          decisionNode: { anyOf: [{ type: "null" }, DECISION_NODE_SCHEMA] },
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
    const approvedLogicPlan = mode === "split"
      ? cleanProse(JSON.stringify(body.storyLogicPlan || {}), 12000)
      : "";
    if (mode === "split" && approvedStory.length < 200) {
      return json({ ok: false, error: "Please approve a complete story before building scenes." }, 400);
    }
    const input = mode === "split" ? [
      `Approved story title: ${cleanText(body.title, 100) || "My OPREALM Story"}`,
      `Approved story text: ${approvedStory}`,
      `Approved Story Logic Plan: ${approvedLogicPlan || "No prior plan was saved. Build the deterministic fallback plan."}`,
      `Exact speaking cast and roles: ${cast || "Use only names present in the approved story."}`,
      `Divide this exact approved story into between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT} visual scenes. Never use fewer than ${MIN_SCENE_COUNT}.`,
      "Do not rewrite or summarize the canonical approved passages. You may add only the bounded alternate branch scenes and endings already required by the approved Story Logic Plan.",
      "Preserve the approved clue IDs, decision IDs, choice IDs, flags, score effects and ending rules whenever they remain valid after the user's edits.",
      "Choose scene boundaries at meaningful changes in location, action, discovery, emotion or consequence.",
      "Identify the existing chapters and paragraphs. If the edited story has no chapter headings, divide it into naturally titled chapters without changing its events.",
      "For every chapter, provide one clear sentence describing what happens in that chapter without revealing later chapters.",
      "Provide a concise spoiler-light summary of the complete approved story.",
      "Each passage must quote or closely preserve only the matching events from the approved story.",
      "For every scene, return a play-style script of 1 to 8 short beats in the exact order they occur. Label narration as speaker 'Narrator' with speakerRole 'narrator'. Label hero dialogue with the hero's exact saved name and speakerRole 'hero'. Label every other character with their exact cast name and speakerRole 'supporting'.",
      "Never assign dialogue to Narrator when a named character speaks it. Never assign a supporting character's line to the hero. Preserve the actual spoken words rather than paraphrasing them as narration.",
      "Create a bounded Story Logic Plan from the approved events: one central mystery, one emotional flaw, 3 subtle clues, 2 major decisions, 1 final decision, and at least 3 ending rules.",
      "Use stable scene IDs scene-1, scene-2 and so on. Keep branches limited and convergent; choices must route only to pre-generated scene IDs.",
      "For each scene, choices and decisionNode must be empty/null unless the story reaches a genuine planned decision.",
      "At a decision, provide 2 or 3 structured choices with concrete labels, visible hints, hidden consequences, score effects and flags.",
      "Decision visualPrompt must use POV or close-up confrontation, dramatic lighting, emotional expression, a visible dilemma, and any relevant clue object.",
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
      "Write every bounded branch scene and ending now as part of the pre-generated story. Nothing should need to be invented during gameplay.",
      "Before writing prose, design a bounded Story Logic Plan with one central mystery, one hero emotional flaw, 3 subtle clues, 2 major decisions, 1 final decision, at least 3 endings, and an age-appropriate betrayal possibility.",
      "Use branch-and-converge structure. Choices route only to pre-generated scene IDs. Never create infinite branches.",
      "Use stable scene IDs in the form scene-1, scene-2 and so on. Every decision scene must include its full structured decisionNode and repeat its structured choices in the scene choices array.",
      "Every decision must have meaningful stakes, distinct emotional hooks, visible hints, hidden consequences, score changes and flags. The final decision must use consequenceMode ending.",
      "Plant each clue in narration before its linked decision. Include its visualObject naturally in that earlier scene's visualDirection.",
      "The visible story must contain only narrative prose: concrete action, atmosphere, character reactions, discoveries, dialogue and consequences.",
      "Within the narrative paragraphs, never discuss story structure, plot twists, themes, lessons, arcs, scenes, the reader, prompts, image generation or what the story is trying to teach.",
      "Do not summarize future events before they happen. Let mysteries and twists unfold naturally.",
      "Maintain continuity and escalating stakes. Give supporting characters motives and let choices cause later consequences.",
      `After writing the full story, decide how many visual scenes are needed to tell it properly. Use between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT} scenes; never use fewer than ${MIN_SCENE_COUNT}.`,
      "Choose scene boundaries at meaningful changes in location, action, discovery, emotion or consequence. Do not force equal-length chunks.",
      "Each passage must quote or closely preserve the corresponding story events for internal continuity, narration and subtitles.",
      "For every scene, return a play-style script of 1 to 8 short beats in story order. Every spoken line must use the exact saved character name. Use speakerRole 'hero' only for the selected hero, 'supporting' for every other named character, and 'narrator' only for visible action or description.",
      "Never turn a named character's dialogue into Narrator speech. Never give a supporting character's dialogue to the hero. Keep quoted dialogue as dialogue in the script.",
      "For each scene, choices and decisionNode must be empty/null unless the story reaches one of the planned genuine decisions.",
      "Choice labels must be concise concrete actions. visibleHint may suggest the emotional risk, but hiddenConsequence must never be shown to the player.",
      "Decision visualPrompt must use POV or close-up confrontation, dramatic lighting, emotional expression, a visible dilemma, and any relevant clue object.",
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
  const scenes = (value.scenes || []).slice(0, MAX_SCENE_COUNT).map((scene, index) => ({
    id: cleanId(scene.id) || `scene-${index + 1}`,
    title: cleanText(scene.title, 100) || `Scene ${index + 1}`,
    passage: cleanText(scene.passage, 1800),
    script: normalizeSceneScript(scene.script),
    mood: enumSceneValue(scene.mood, SCENE_MOODS, "Wonder"),
    camera: enumSceneValue(scene.camera, SCENE_CAMERAS, "Wide Shot"),
    visualDirection: cleanText(scene.visualDirection, 1800),
    choices: normalizeChoices(scene.choices, `scene-${index + 1}`),
    decisionNode: normalizeDecisionNode(scene.decisionNode, cleanId(scene.id) || `scene-${index + 1}`),
  }));
  const logicPlan = ensurePlayableLogicPlan(normalizeLogicPlan(value.logicPlan), scenes);
  return {
    title: cleanText(value.title, 100) || "My OPREALM Story",
    summary: cleanProse(value.summary, 1800),
    logicPlan,
    chapters,
    story: formattedStory,
    scenes: attachPlanDecisions(scenes, logicPlan),
  };
}

function ensurePlayableLogicPlan(plan, scenes) {
  if (plan.decisions.length >= 3 && plan.endingRules.length >= 3 && plan.clues.length >= 3) return plan;
  const sceneIdAt = (ratio) => scenes[Math.min(scenes.length - 1, Math.max(0, Math.floor((scenes.length - 1) * ratio)))]?.id || "";
  const decisions = [
    fallbackDecision("decision-trust", sceneIdAt(.3), "trust_choice", sceneIdAt(.39), sceneIdAt(.44), "Who has earned the hero's trust?"),
    fallbackDecision("decision-courage", sceneIdAt(.62), "courage_choice", sceneIdAt(.7), sceneIdAt(.75), "Which risk is worth taking now?"),
    fallbackDecision("decision-fate", sceneIdAt(.84), "final_fate_choice", sceneIdAt(.93), sceneIdAt(.96), "What must the hero protect in the final moment?", "ending"),
  ];
  return {
    centralMystery: plan.centralMystery || "Someone's account of the danger does not match the evidence found during the journey.",
    heroEmotionalFlaw: plan.heroEmotionalFlaw || "The hero tries to solve every problem without trusting anyone else.",
    clues: plan.clues.length >= 3 ? plan.clues : decisions.map((decision, index) => ({
      id: `clue-${index + 1}`,
      introducedInSceneId: sceneIdAt(.12 + index * .2),
      clueText: ["A witness remembers one important detail differently.", "A familiar mark appears where it should not.", "An ally knows something they were never told."][index],
      visualObject: ["damaged map", "matching insignia", "sealed message"][index],
      linkedDecisionId: decision.id,
      helpsChoiceId: decision.choices[0].id,
      subtlety: "subtle",
    })),
    decisions,
    endingRules: [
      fallbackEnding("ending-heroic", "heroic_ending", scenes.at(-1)?.id, { courage: 2 }, ["brave"]),
      fallbackEnding("ending-wise", "wise_ending", scenes.at(-1)?.id, { wisdom: 2 }, ["wise"]),
      fallbackEnding("ending-friendship", "friendship_ending", scenes.at(-1)?.id, { trust: 1, loyalty: 1 }, ["loyal"]),
    ],
  };
}

function attachPlanDecisions(scenes, plan) {
  const byScene = new Map(plan.decisions.map((decision) => [decision.sceneId, decision]));
  return scenes.map((scene) => {
    const decision = scene.decisionNode || byScene.get(scene.id) || null;
    return decision ? { ...scene, decisionNode: decision, choices: decision.choices } : scene;
  });
}

function fallbackDecision(id, sceneId, decisionType, firstNext, secondNext, questionText, consequenceMode = "branch_and_converge") {
  return normalizeDecisionNode({
    id,
    sceneId,
    title: consequenceMode === "ending" ? "The Final Choice" : "The Story Turns",
    setupText: "The danger closes in, and each possible action carries a real cost.",
    questionText,
    decisionType,
    emotionalTone: "urgent",
    clueReferences: [],
    visualPrompt: "POV close-up confrontation with dramatic lighting, readable emotional expressions and two visibly different paths.",
    consequenceMode,
    choices: [
      fallbackChoice(`${id}-evidence`, "Act on the evidence", "Follow what the clues reveal.", firstNext, "A careful risk", "wise", { wisdom: 2, trust: 1 }, [`${id}-evidence`]),
      fallbackChoice(`${id}-bold`, "Take the dangerous route", "Move before the chance disappears.", secondNext, "A bold risk", "brave", { courage: 2, danger: 1 }, [`${id}-bold`]),
    ],
  }, sceneId);
}

function fallbackChoice(id, label, description, nextSceneId, visibleHint, outcomeTag, scoreEffects, setsFlags) {
  return {
    id, label, description, nextSceneId,
    emotionalHook: visibleHint,
    visibleHint,
    hiddenConsequence: `This choice strengthens the ${outcomeTag} outcome.`,
    outcomeTag,
    scoreEffects: normalizeScores(scoreEffects),
    setsFlags,
    requiresClueIds: [],
  };
}

function fallbackEnding(id, endingType, sceneId, minimumScores, preferredOutcomeTags) {
  return {
    id, endingType, sceneId: sceneId || "",
    minimumScores: normalizeScores(minimumScores),
    requiredFlags: [],
    requiredClueIds: [],
    preferredOutcomeTags,
  };
}

function normalizeLogicPlan(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    centralMystery: cleanProse(source.centralMystery, 900),
    heroEmotionalFlaw: cleanProse(source.heroEmotionalFlaw, 500),
    clues: (Array.isArray(source.clues) ? source.clues : []).slice(0, 5).map((clue, index) => ({
      id: cleanId(clue?.id) || `clue-${index + 1}`,
      introducedInSceneId: cleanId(clue?.introducedInSceneId),
      clueText: cleanProse(clue?.clueText, 500),
      visualObject: cleanText(clue?.visualObject, 160),
      linkedDecisionId: cleanId(clue?.linkedDecisionId),
      helpsChoiceId: cleanId(clue?.helpsChoiceId),
      subtlety: ["subtle", "moderate", "clear"].includes(clue?.subtlety) ? clue.subtlety : "subtle",
    })),
    decisions: (Array.isArray(source.decisions) ? source.decisions : [])
      .map((decision, index) => normalizeDecisionNode(decision, cleanId(decision?.sceneId) || `scene-${index + 1}`))
      .filter(Boolean)
      .slice(0, 4),
    endingRules: (Array.isArray(source.endingRules) ? source.endingRules : []).slice(0, 6).map((rule, index) => ({
      id: cleanId(rule?.id) || `ending-${index + 1}`,
      endingType: ENDING_TYPES.includes(rule?.endingType) ? rule.endingType : "heroic_ending",
      sceneId: cleanId(rule?.sceneId),
      minimumScores: normalizeScores(rule?.minimumScores),
      requiredFlags: cleanStringArray(rule?.requiredFlags, 5),
      requiredClueIds: cleanStringArray(rule?.requiredClueIds, 3),
      preferredOutcomeTags: cleanStringArray(rule?.preferredOutcomeTags, 4),
    })),
  };
}

function normalizeDecisionNode(value, sceneId) {
  if (!value || typeof value !== "object") return null;
  const choices = normalizeChoices(value.choices, sceneId);
  if (choices.length < 2) return null;
  return {
    id: cleanId(value.id) || `${sceneId}-decision`,
    sceneId,
    title: cleanText(value.title, 120) || "A Difficult Choice",
    setupText: cleanProse(value.setupText, 700),
    questionText: cleanProse(value.questionText, 400) || "What should happen next?",
    decisionType: DECISION_TYPES.includes(value.decisionType) ? value.decisionType : "courage_choice",
    emotionalTone: cleanText(value.emotionalTone, 80) || "tense",
    choices,
    clueReferences: cleanStringArray(value.clueReferences, 3).map(cleanId).filter(Boolean),
    visualPrompt: cleanProse(value.visualPrompt, 1200),
    consequenceMode: value.consequenceMode === "ending" ? "ending" : "branch_and_converge",
  };
}

function normalizeChoices(value, sceneId) {
  return (Array.isArray(value) ? value : []).slice(0, 3).map((choice, index) => ({
    id: cleanId(choice?.id) || `${sceneId}-choice-${index + 1}`,
    label: cleanText(choice?.label, 100),
    description: cleanProse(choice?.description, 240),
    nextSceneId: cleanId(choice?.nextSceneId),
    emotionalHook: cleanText(choice?.emotionalHook, 120),
    visibleHint: cleanText(choice?.visibleHint, 160),
    hiddenConsequence: cleanProse(choice?.hiddenConsequence, 300),
    outcomeTag: cleanId(choice?.outcomeTag),
    scoreEffects: normalizeScores(choice?.scoreEffects),
    setsFlags: cleanStringArray(choice?.setsFlags, 4).map(cleanId).filter(Boolean),
    requiresClueIds: cleanStringArray(choice?.requiresClueIds, 3).map(cleanId).filter(Boolean),
  })).filter((choice) => choice.label);
}

function normalizeScores(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(["courage", "wisdom", "trust", "loyalty", "danger", "kindness"].map((key) => [
    key,
    Math.max(-3, Math.min(3, Math.round(Number(source[key] || 0)))),
  ]));
}

function cleanStringArray(value, limit) {
  return (Array.isArray(value) ? value : []).map((item) => cleanText(item, 120)).filter(Boolean).slice(0, limit);
}

function cleanId(value) {
  return cleanText(value, 120).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
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
