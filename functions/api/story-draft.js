import { requireUser } from "../_lib/auth.js";
import { hasOpenAiKey, openAiFetch } from "../_lib/ai-gateway.js";
import { assertRateLimit, jobResponse, markJobCompleted } from "../_lib/generation-jobs.js";
import { json, readJson } from "../_lib/http.js";
import { assertSafePrompt, cleanText } from "../_lib/validate.js";
import { CREATOR_CREDIT_COSTS } from "../_lib/creator-pricing.js";
import { validateStoryQuality } from "../_lib/story-quality.mjs";
import { removeFrameworkLanguage, validateStoryPayoffs } from "../_lib/story-payoffs.mjs";
import {
  cleanEngineVisibleLanguage,
  generateEmotionalRhythmPlan,
  naturalizeDecisionSetup,
  validateSignatureMoments,
} from "../_lib/story-signature.mjs";
import {
  CINEMATIC_SCENE_TYPES,
  extractCinematicScenes,
  validateCinematicSceneSet,
  validateSceneVisualPrompt,
} from "../_lib/cinematic-scenes.mjs";

const STORY_DRAFT_COST = CREATOR_CREDIT_COSTS.storyDraft;
const STORY_DRAFT_MODEL = "gpt-5-mini";
const STORY_DRAFT_TOOL = "story_draft";
const MIN_SCENE_COUNT = 1;
const MAX_SCENE_COUNT = 64;
const SCENE_MOODS = ["Wonder", "Mystery", "Action", "Epic", "Funny", "Emotional", "Tense", "Peaceful"];
const SCENE_CAMERAS = ["Wide Shot", "Medium Shot", "Close Up", "Low Angle", "POV", "Drone Shot", "Over Shoulder", "Tracking Shot"];
const DECISION_TYPES = ["trust_choice", "sacrifice_choice", "courage_choice", "mercy_choice", "moral_choice", "mystery_deduction", "loyalty_choice", "betrayal_choice", "power_choice", "final_fate_choice"];
const ENDING_TYPES = ["heroic_ending", "wise_ending", "betrayal_ending", "friendship_ending", "chaos_ending", "secret_ending"];
const CHOICE_TENSIONS = ["trust versus suspicion", "safety versus courage", "loyalty versus mission", "mercy versus victory", "truth versus comfort", "sacrifice versus reward"];
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
  required: ["id", "sceneId", "title", "setupText", "questionText", "decisionType", "emotionalTone", "choices", "clueReferences", "visualPrompt", "consequenceMode", "whyChoiceMatters", "whatPlayerKnows", "helpfulClueId", "wrongChoiceConsequence", "wiseChoiceConsequence", "influencesEndingIds"],
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
    whyChoiceMatters: { type: "string" },
    whatPlayerKnows: { type: "string" },
    helpfulClueId: { type: "string" },
    wrongChoiceConsequence: { type: "string" },
    wiseChoiceConsequence: { type: "string" },
    influencesEndingIds: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
  },
};

const storySpineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["heroWant", "heroFear", "heroFlaw", "emotionalNeed", "centralMystery", "mainAntagonisticForce", "keyRelationshipConflict", "majorSecret", "falseBelief", "trueRevelation", "chapterHooks", "toneProfile", "targetFeeling", "characterVoiceProfiles", "chapterAdventurePromises", "reversalDesign"],
  properties: {
    heroWant: { type: "string" },
    heroFear: { type: "string" },
    heroFlaw: { type: "string" },
    emotionalNeed: { type: "string" },
    centralMystery: { type: "string" },
    mainAntagonisticForce: { type: "string" },
    keyRelationshipConflict: { type: "string" },
    majorSecret: { type: "string" },
    falseBelief: { type: "string" },
    trueRevelation: { type: "string" },
    chapterHooks: { type: "array", minItems: 4, maxItems: 8, items: { type: "string" } },
    toneProfile: { type: "string" },
    targetFeeling: { type: "string" },
    characterVoiceProfiles: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["characterName", "role", "speechRhythm", "vocabulary", "verbalHabit", "avoids"],
        properties: {
          characterName: { type: "string" },
          role: { type: "string" },
          speechRhythm: { type: "string" },
          vocabulary: { type: "string" },
          verbalHabit: { type: "string" },
          avoids: { type: "string" },
        },
      },
    },
    chapterAdventurePromises: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["chapterNumber", "tensionEngine", "wowMoment", "endingHook"],
        properties: {
          chapterNumber: { type: "integer", minimum: 1, maximum: 8 },
          tensionEngine: { type: "string" },
          wowMoment: { type: "string" },
          endingHook: { type: "string" },
        },
      },
    },
    reversalDesign: {
      type: "object",
      additionalProperties: false,
      required: ["falseAssumption", "hiddenMotive", "reversal", "emotionalCost"],
      properties: {
        falseAssumption: { type: "string" },
        hiddenMotive: { type: "string" },
        reversal: { type: "string" },
        emotionalCost: { type: "string" },
      },
    },
  },
};

const bestMomentsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["biggestReveal", "coolestCreatureOrEntity", "hardestChoice", "mostEmotionalScene", "largestVisualSpectacle", "betrayalMoment", "finaleMoment", "wonderMoment", "humorOrWarmthMoment", "terrifyingButKidSafeMoment"],
  properties: Object.fromEntries([
    "biggestReveal", "coolestCreatureOrEntity", "hardestChoice", "mostEmotionalScene",
    "largestVisualSpectacle", "betrayalMoment", "finaleMoment", "wonderMoment",
    "humorOrWarmthMoment", "terrifyingButKidSafeMoment",
  ].map((key) => [key, { type: "string" }])),
};

const signaturePlanningSchema = {
  type: "object",
  additionalProperties: false,
  required: ["signatureMomentsPlan", "emotionalRhythmPlan", "storyLocations"],
  properties: {
    signatureMomentsPlan: {
      type: "object",
      additionalProperties: false,
      required: [
        "wowMoment1", "wowMoment2", "biggestReveal", "mostEmotionalMoment",
        "mostShockingBetrayal", "coolestLocation", "coolestCreatureOrEntity",
        "mostDifficultChoice", "funniestOrWarmestMoment", "mostIllustratableScene",
        "finaleSpectacle",
      ],
      properties: Object.fromEntries([
        "wowMoment1", "wowMoment2", "biggestReveal", "mostEmotionalMoment",
        "mostShockingBetrayal", "coolestLocation", "coolestCreatureOrEntity",
        "mostDifficultChoice", "funniestOrWarmestMoment", "mostIllustratableScene",
        "finaleSpectacle",
      ].map((key) => [key, { type: "string" }])),
    },
    emotionalRhythmPlan: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["chapterNumber", "primaryTone", "secondaryTone", "purpose"],
        properties: {
          chapterNumber: { type: "integer", minimum: 1, maximum: 8 },
          primaryTone: { type: "string" },
          secondaryTone: { type: "string" },
          purpose: { type: "string" },
        },
      },
    },
    storyLocations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "visualIdentity", "sensoryDetails", "danger", "secret", "storyPurpose", "illustrationPromptSeed"],
        properties: {
          name: { type: "string" },
          visualIdentity: { type: "string" },
          sensoryDetails: { type: "string" },
          danger: { type: "string" },
          secret: { type: "string" },
          storyPurpose: { type: "string" },
          illustrationPromptSeed: { type: "string" },
        },
      },
    },
  },
};

const logicPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["centralMystery", "heroEmotionalFlaw", "clues", "decisions", "endingRules", "routeMap"],
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
        required: ["id", "introducedInSceneId", "clueText", "visualObject", "linkedDecisionId", "helpsChoiceId", "subtlety", "payoffTarget"],
        properties: {
          id: { type: "string" },
          introducedInSceneId: { type: "string" },
          clueText: { type: "string" },
          visualObject: { type: "string" },
          linkedDecisionId: { type: "string" },
          helpsChoiceId: { type: "string" },
          subtlety: { type: "string", enum: ["subtle", "moderate", "clear"] },
          payoffTarget: { type: "string", enum: ["biggest_reveal", "betrayal", "hardest_choice", "finale"] },
        },
      },
    },
    decisions: { type: "array", minItems: 3, maxItems: 3, items: DECISION_NODE_SCHEMA },
    endingRules: {
      type: "array",
      minItems: 3,
      maxItems: 3,
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
    routeMap: { type: "array", minItems: 3, maxItems: 8, items: { type: "string" } },
  },
};

const proseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "chapters"],
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
  },
};

const splitStorySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "logicPlan", "chapters", "scenes"],
  properties: {
    summary: { type: "string" },
    logicPlan: logicPlanSchema,
    chapters: proseSchema.properties.chapters,
    scenes: {
      type: "array",
      minItems: MIN_SCENE_COUNT,
      maxItems: MAX_SCENE_COUNT,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id", "chapterNumber", "sceneNumber", "title", "sceneType", "sourcePassage",
          "emotionalPurpose", "storyImportance", "charactersPresent", "location", "keyObject",
          "decisionNodeId", "clueIds", "visualPromptFull", "visualPromptSummary",
          "cameraDirection", "lightingMood", "continuityNotes", "script", "mood", "camera",
          "visualDirection", "passage",
        ],
        properties: {
          id: { type: "string" },
          chapterNumber: { type: "integer", minimum: 1, maximum: 8 },
          sceneNumber: { type: "integer", minimum: 1, maximum: MAX_SCENE_COUNT },
          title: { type: "string" },
          sceneType: { type: "string", enum: CINEMATIC_SCENE_TYPES },
          sourcePassage: { type: "string" },
          emotionalPurpose: { type: "string" },
          storyImportance: { type: "integer", minimum: 0, maximum: 100 },
          charactersPresent: { type: "array", maxItems: 8, items: { type: "string" } },
          location: { type: "string" },
          keyObject: { type: "string" },
          decisionNodeId: { type: "string" },
          clueIds: { type: "array", maxItems: 5, items: { type: "string" } },
          visualPromptFull: { type: "string" },
          visualPromptSummary: { type: "string" },
          cameraDirection: { type: "string" },
          lightingMood: { type: "string" },
          continuityNotes: { type: "string" },
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
    const requestedStage = mode === "write" && ["spine", "logic", "moments", "signature", "prose"].includes(body.stage)
      ? body.stage
      : "";
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

    const approvedStory = cleanProse(body.approvedStory, 100000);
    if (mode === "split" && approvedStory.length < 200) {
      return json({ ok: false, error: "Please approve a complete story before building scenes." }, 400);
    }
    const creatorBible = { character, cast, world, storyType, endingType, lessonTheme, objects };
    const providerResponseId = cleanText(body.providerResponseId, 160);
    if (requestedStage && providerResponseId) {
      const background = await retrieveBackgroundResponse(env, providerResponseId);
      if (background.pending) {
        return json({
          ok: true,
          status: background.status,
          stage: requestedStage,
          providerResponseId,
          pollAfterMs: 3500,
        }, 202, { "retry-after": "4" });
      }
      return finishBackgroundStage({
        env,
        user,
        body,
        creatorBible,
        stage: requestedStage,
        providerResponseId,
        value: background.value,
        model: background.model,
      });
    }
    let draft;
    let models = [];
    if (mode === "split") {
      const splitStorySpine = normalizeStorySpine(body.storySpine);
      const splitLogicPlan = normalizeLogicPlan(body.storyLogicPlan);
      const splitSignatureMoments = normalizeSignatureMomentsPlan(body.signatureMomentsPlan);
      const split = buildDeterministicCinematicSplit({
        title: cleanText(body.title, 100) || "My OPREALM Story",
        approvedStory,
        storySpine: splitStorySpine,
        logicPlan: splitLogicPlan,
        signatureMomentsPlan: splitSignatureMoments,
        creatorBible,
        storyType,
      });
      draft = normalizeDraft({
        title: cleanText(body.title, 100),
        storySpine: body.storySpine || {},
        bestMomentsPlan: body.bestMomentsPlan || {},
        signatureMomentsPlan: body.signatureMomentsPlan || {},
        emotionalRhythmPlan: body.emotionalRhythmPlan || [],
        storyLocations: body.storyLocations || [],
        ...split,
      });
      draft.sceneSetQuality = validateCinematicSceneSet(draft.scenes);
      models = ["deterministic-cinematic-extractor"];
    } else if (requestedStage === "spine") {
      const spine = await generateStorySpine(env, creatorBible, `${user.id}:spine`, true);
      if (spine.pending) return backgroundStageResponse("spine", spine);
      return json({
        ok: true,
        stage: "spine",
        storySpine: normalizeStorySpine(spine.value),
        creditsUsed: 0,
        model: spine.model,
      });
    } else if (requestedStage === "logic") {
      const storySpine = normalizeStorySpine(body.storySpine);
      if (!storySpine.centralMystery || !storySpine.heroFlaw) {
        return json({ ok: false, error: "The story foundation was incomplete. Please regenerate the story." }, 400);
      }
      const plan = await generatePickPathPlan(env, storySpine, creatorBible, `${user.id}:logic`, true);
      if (plan.pending) return backgroundStageResponse("logic", plan);
      return json({
        ok: true,
        stage: "logic",
        storySpine,
        logicPlan: normalizeLogicPlan(plan.value),
        creditsUsed: 0,
        model: plan.model,
      });
    } else if (requestedStage === "moments") {
      const storySpine = normalizeStorySpine(body.storySpine);
      const logicPlan = normalizeLogicPlan(body.storyLogicPlan);
      if (!storySpine.centralMystery || logicPlan.decisions.length < 3) {
        return json({ ok: false, error: "The story plan was incomplete. Please regenerate the story." }, 400);
      }
      const moments = await generateBestMomentsPlan(env, storySpine, logicPlan, creatorBible, `${user.id}:moments`, true);
      if (moments.pending) return backgroundStageResponse("moments", moments);
      return json({
        ok: true,
        stage: "moments",
        bestMomentsPlan: normalizeBestMomentsPlan(moments.value),
        creditsUsed: 0,
        model: moments.model,
      });
    } else if (requestedStage === "signature") {
      const storySpine = normalizeStorySpine(body.storySpine);
      const logicPlan = normalizeLogicPlan(body.storyLogicPlan);
      const bestMomentsPlan = normalizeBestMomentsPlan(body.bestMomentsPlan);
      if (!storySpine.centralMystery || logicPlan.decisions.length < 3) {
        return json({ ok: false, error: "The story plan was incomplete. Please regenerate the story." }, 400);
      }
      const signature = await generateSignatureMomentsPlan(
        env,
        storySpine,
        logicPlan,
        bestMomentsPlan,
        creatorBible,
        `${user.id}:signature`,
        true,
      );
      if (signature.pending) return backgroundStageResponse("signature", signature);
      const normalized = normalizeSignaturePlanning(signature.value, storySpine, logicPlan, bestMomentsPlan, creatorBible);
      return json({
        ok: true,
        stage: "signature",
        ...normalized,
        creditsUsed: 0,
        model: signature.model,
      });
    } else if (requestedStage === "prose") {
      const storySpine = normalizeStorySpine(body.storySpine);
      const logicPlan = normalizeLogicPlan(body.storyLogicPlan);
      const suppliedMoments = normalizeBestMomentsPlan(body.bestMomentsPlan);
      const bestMomentsPlan = suppliedMoments.biggestReveal
        ? suppliedMoments
        : fallbackBestMomentsPlan(storySpine, logicPlan, creatorBible);
      const signaturePlanning = normalizeSignaturePlanning({
        signatureMomentsPlan: body.signatureMomentsPlan,
        emotionalRhythmPlan: body.emotionalRhythmPlan,
        storyLocations: body.storyLocations,
      }, storySpine, logicPlan, bestMomentsPlan, creatorBible);
      if (!storySpine.centralMystery || logicPlan.decisions.length < 3 || logicPlan.clues.length < 3) {
        return json({ ok: false, error: "The story plan was incomplete. Please regenerate the story." }, 400);
      }
      const prose = await generateFullChapterStory(
        env,
        storySpine,
        logicPlan,
        bestMomentsPlan,
        signaturePlanning,
        creatorBible,
        `${user.id}:prose`,
        true,
      );
      if (prose.pending) {
        await ensureBackgroundStoryJob(env, prose.responseId, user.id);
        return backgroundStageResponse("prose", prose);
      }
      draft = finalizeStoryDraft({
        ...prose.value,
        storySpine,
        logicPlan,
        bestMomentsPlan,
        ...signaturePlanning,
        scenes: [],
      });
      models = [prose.model];
    } else {
      const spine = await generateStorySpine(env, creatorBible, `${user.id}:spine`);
      const plan = await generatePickPathPlan(env, spine.value, creatorBible, `${user.id}:logic`);
      let momentsValue = fallbackBestMomentsPlan(spine.value, plan.value, creatorBible);
      let momentsModel = "deterministic-fallback";
      try {
        const moments = await generateBestMomentsPlan(env, spine.value, plan.value, creatorBible, `${user.id}:moments`);
        momentsValue = moments.value;
        momentsModel = moments.model;
      } catch {}
      let signatureValue = fallbackSignaturePlanning(spine.value, plan.value, momentsValue, creatorBible);
      let signatureModel = "deterministic-fallback";
      try {
        const signature = await generateSignatureMomentsPlan(env, spine.value, plan.value, momentsValue, creatorBible, `${user.id}:signature`);
        signatureValue = signature.value;
        signatureModel = signature.model;
      } catch {}
      const signaturePlanning = normalizeSignaturePlanning(signatureValue, spine.value, plan.value, momentsValue, creatorBible);
      const prose = await generateFullChapterStory(env, spine.value, plan.value, momentsValue, signaturePlanning, creatorBible, `${user.id}:prose`);
      draft = finalizeStoryDraft({
        ...prose.value,
        storySpine: spine.value,
        logicPlan: plan.value,
        bestMomentsPlan: momentsValue,
        ...signaturePlanning,
        scenes: [],
      });
      models = [spine.model, plan.model, momentsModel, signatureModel, prose.model];
    }
    draft.quality = validateStoryQuality(draft);
    draft.payoffQuality = validateStoryPayoffs(draft, draft.bestMomentsPlan, draft.logicPlan?.clues, draft.logicPlan?.decisions);
    draft.signatureQuality = validateSignatureMoments(draft, draft.signatureMomentsPlan, draft.storyLocations, draft.emotionalRhythmPlan);

    if (mode === "write") {
      const charged = await chargeCredits(env, user.id);
      if (!charged) return json({ ok: false, error: `You need ${STORY_DRAFT_COST} Creator credits to finish this story.` }, 402);
    }
    return json({ ok: true, draft, creditsUsed: mode === "write" ? STORY_DRAFT_COST : 0, model: models.filter(Boolean).join(", ") || STORY_DRAFT_MODEL });
  } catch (error) {
    return json({ ok: false, error: error.message || "Story writing failed." }, error.status || 500);
  }
}

async function finishBackgroundStage({ env, user, body, creatorBible, stage, providerResponseId, value, model }) {
  if (stage === "spine") {
    return json({
      ok: true,
      status: "completed",
      stage,
      providerResponseId,
      storySpine: normalizeStorySpine(value),
      creditsUsed: 0,
      model,
    });
  }
  if (stage === "logic") {
    return json({
      ok: true,
      status: "completed",
      stage,
      providerResponseId,
      storySpine: normalizeStorySpine(body.storySpine),
      logicPlan: normalizeLogicPlan(value),
      creditsUsed: 0,
      model,
    });
  }
  if (stage === "moments") {
    return json({
      ok: true,
      status: "completed",
      stage,
      providerResponseId,
      bestMomentsPlan: normalizeBestMomentsPlan(value),
      creditsUsed: 0,
      model,
    });
  }
  if (stage === "signature") {
    const storySpine = normalizeStorySpine(body.storySpine);
    const logicPlan = normalizeLogicPlan(body.storyLogicPlan);
    const bestMomentsPlan = normalizeBestMomentsPlan(body.bestMomentsPlan);
    return json({
      ok: true,
      status: "completed",
      stage,
      providerResponseId,
      ...normalizeSignaturePlanning(value, storySpine, logicPlan, bestMomentsPlan, creatorBible),
      creditsUsed: 0,
      model,
    });
  }
  const storySpine = normalizeStorySpine(body.storySpine);
  const existingJob = await env.OPREALM_DB.prepare(
    "SELECT * FROM generation_jobs WHERE id = ? AND web_user_id = ? AND tool = ? LIMIT 1",
  )
    .bind(providerResponseId, user.id, "story_draft_background")
    .first();
  if (existingJob?.status === "completed") return json(jobResponse(existingJob));
  const logicPlan = normalizeLogicPlan(body.storyLogicPlan);
  const suppliedMoments = normalizeBestMomentsPlan(body.bestMomentsPlan);
  const bestMomentsPlan = suppliedMoments.biggestReveal
    ? suppliedMoments
    : fallbackBestMomentsPlan(storySpine, logicPlan, creatorBible);
  const signaturePlanning = normalizeSignaturePlanning({
    signatureMomentsPlan: body.signatureMomentsPlan,
    emotionalRhythmPlan: body.emotionalRhythmPlan,
    storyLocations: body.storyLocations,
  }, storySpine, logicPlan, bestMomentsPlan, creatorBible);
  const draft = finalizeStoryDraft({
    ...value,
    storySpine,
    logicPlan,
    bestMomentsPlan,
    ...signaturePlanning,
    scenes: [],
  });
  draft.quality = validateStoryQuality(draft);
  draft.payoffQuality = validateStoryPayoffs(draft, bestMomentsPlan, logicPlan.clues, logicPlan.decisions);
  draft.signatureQuality = validateSignatureMoments(draft, draft.signatureMomentsPlan, draft.storyLocations, draft.emotionalRhythmPlan);
  const charged = await chargeCredits(env, user.id);
  if (!charged) return json({ ok: false, error: `You need ${STORY_DRAFT_COST} Creator credits to finish this story.` }, 402);
  const completedResult = {
    ok: true,
    status: "completed",
    stage,
    providerResponseId,
    draft,
    creditsUsed: STORY_DRAFT_COST,
    model,
  };
  if (existingJob) {
    await markJobCompleted(env, providerResponseId, {
      result: completedResult,
      creditsCharged: STORY_DRAFT_COST,
      model,
      quality: String(draft.quality?.score ?? ""),
    });
  }
  return json(completedResult);
}

async function ensureBackgroundStoryJob(env, responseId, userId) {
  await env.OPREALM_DB.prepare(
    `INSERT OR IGNORE INTO generation_jobs (
      id, web_user_id, tool, status, prompt_hash, idempotency_key,
      credits_reserved, metadata_json, created_at, updated_at
    ) VALUES (?, ?, 'story_draft_background', 'processing', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  )
    .bind(
      responseId,
      userId,
      responseId,
      responseId,
      STORY_DRAFT_COST,
      JSON.stringify({ providerResponseId: responseId, stage: "prose" }),
    )
    .run();
}

export async function generateStorySpine(env, input, seed = "story-spine", background = false) {
  const prompt = [
    `Creator Bible: ${JSON.stringify(input)}`,
    "Build the emotional and suspense architecture before writing any prose.",
    "Make every field specific to the named hero, cast and world. Do not use generic placeholders.",
    "The hero's want must be concrete. The fear and flaw must actively cause trouble.",
    "The central mystery and major secret must support surprising but fair discoveries.",
    "The relationship conflict must involve a named supporting character when one exists.",
    "Create a distinct voice profile for every important named character. Vary rhythm, vocabulary, sentence length, humor, bluntness and verbal habits so dialogue identifies the speaker without labels.",
    "Create 4-8 chapter adventure promises. Every chapter needs an escalating tension engine, an illustration-worthy WOW moment and an irresistible ending hook.",
    "Design a fair reversal with a false assumption, hidden motive, truth-flipping reveal and emotional cost. It must be foreshadowed without becoming obvious.",
    "Chapter hooks must escalate and must include cliffhangers, dangerous arrivals, betrayal hints, impossible choices, emotional reversals or discoveries that change everything.",
    "Do not write scenes, chapters, visual prompts or production notes.",
  ].join("\n");
  return requestStructured(env, {
    schema: storySpineSchema,
    schemaName: "oprealm_story_spine",
    instructions: "You are a senior children's adventure novelist designing the emotional spine of a thrilling pick-a-path story.",
    input: prompt,
    effort: "low",
    maxOutputTokens: 9000,
    background,
    seed,
  });
}

export async function generatePickPathPlan(env, storySpine, creatorBible, seed = "pick-path-plan", background = false) {
  const prompt = [
    `Story Spine: ${JSON.stringify(storySpine)}`,
    `Creator Bible: ${JSON.stringify(creatorBible)}`,
    "Design exactly three major decisions before prose is written: two branch-and-converge decisions and one final ending decision.",
    `Use exactly three different decision types chosen from: ${DECISION_TYPES.join(", ")}.`,
    `Use meaningful tensions such as: ${CHOICE_TENSIONS.join("; ")}.`,
    "Every decision must state why it matters emotionally, what the player knows, the concrete clue that helps, the wrong consequence, the wise consequence and the endings it influences.",
    "Each decision question must be spoken naturally by a named character to the hero inside the future prose.",
    "Plant 3-5 concrete visible clues before their decisions. A clue must be a specific object, mark, sound, wound, tool, garment detail, footprint, message or physical contradiction.",
    "Assign every clue a payoffTarget: biggest_reveal, betrayal, hardest_choice or finale. No clue may exist only to lead to another clue.",
    "Never use abstract clues such as a feeling, something being wrong, a witness remembering differently or a familiar mark without describing the exact mark.",
    "Include one false-trust or betrayal possibility when age appropriate.",
    "Use provisional placement IDs chapter-1, chapter-2 and so on. Scene IDs will be assigned only after story approval.",
    "Set every decision visualPrompt to an empty string. Visual prompts are forbidden at this stage.",
    "Create exactly three distinct endings and a bounded branch-and-converge route map.",
    "Choice labels must name concrete actions, people, places or evidence. Never write generic labels such as Act on the evidence, Take the dangerous route or Choose wisely.",
    "Avoid three tactical choices. Across the story vary trust, sacrifice, morality, deduction, betrayal, dangerous power, loyalty and final fate.",
  ].join("\n");
  return requestStructured(env, {
    schema: logicPlanSchema,
    schemaName: "oprealm_pick_path_plan",
    instructions: "You are an expert interactive-fiction architect. Make choices emotionally difficult, logically fair and specific to this story.",
    input: prompt,
    effort: "medium",
    maxOutputTokens: 10000,
    background,
    seed,
  });
}

export async function generateBestMomentsPlan(env, storySpine, pickPathPlan, creatorBible, seed = "best-moments", background = false) {
  const prompt = [
    `Story Spine: ${JSON.stringify(storySpine)}`,
    `Pick-a-Path Plan: ${JSON.stringify(pickPathPlan)}`,
    `Creator Bible: ${JSON.stringify(creatorBible)}`,
    "Design ten unforgettable moments the finished story will build toward. Be specific to the named cast, world, clues and mystery.",
    "Every clue must connect to the biggest reveal, betrayal, finale or another major payoff.",
    "The hardest choice must protect two valuable things and make either option emotionally costly.",
    "The largest spectacle must be illustration-worthy and physically happen in the story, not exist as background lore.",
    "The betrayal must hurt because of a relationship or promise, not merely reveal tactical information.",
    "The finale must resolve the immediate danger, core mystery and hero's emotional struggle while leaving only optional room for another adventure.",
    "Include tonal variety: wonder, warmth or humor, kid-safe fear, friendship and triumphant spectacle.",
    "Do not write chapter prose, scene directions or production commentary.",
  ].join("\n");
  return requestStructured(env, {
    schema: bestMomentsSchema,
    schemaName: "oprealm_best_moments_plan",
    instructions: "You are a bestselling children's adventure editor choosing the ten moments readers will remember and talk about.",
    input: prompt,
    effort: "low",
    maxOutputTokens: 5000,
    background,
    seed,
  });
}

export async function generateSignatureMomentsPlan(env, storySpine, pickPathPlan, bestMomentsPlan, creatorBible, seed = "signature-moments", background = false) {
  const chapterCount = Math.max(4, Math.min(8, storySpine?.chapterAdventurePromises?.length || storySpine?.chapterHooks?.length || 6));
  const prompt = [
    `Story Spine: ${JSON.stringify(storySpine)}`,
    `Pick-a-Path Plan: ${JSON.stringify(pickPathPlan)}`,
    `Best Moments Plan: ${JSON.stringify(bestMomentsPlan)}`,
    `Creator Bible: ${JSON.stringify(creatorBible)}`,
    `Plan for exactly ${chapterCount} chapters.`,
    "Design the story's signature moments, emotional rhythm and 3-5 named cinematic locations before prose is written.",
    "wowMoment1 must physically occur by Chapter 1 or 2. The coolest location must appear before the midpoint.",
    "The biggest reveal must pay off earlier concrete clues. The betrayal must involve a named character or a damaging false assumption.",
    "The most difficult choice must be emotionally painful, with credible reasons every option may be right or wrong.",
    "Include one warm or funny breathing-space moment and an emotional quiet moment before the finale.",
    "The finale spectacle must resolve the immediate danger, central mystery and hero relationship or emotional conflict through visible action.",
    "At least one location must be impossible, magical, strange and illustration-worthy rather than a generic forest, cave, castle or room.",
    "Every location needs a story function, danger and secret. Do not add decorative lore that never affects an event, clue, choice or payoff.",
    "If the world supports creatures, machines, spirits or beasts, design one named entity with a distinctive silhouette and a direct connection to a clue, reveal or choice.",
    "Vary chapter tones across danger, mystery, wonder, suspicion, warmth, humour, betrayal, awe, sacrifice, quiet reflection, terror and triumph.",
    "Do not write chapter prose, UI language, visual production notes or story-framework commentary.",
  ].join("\n");
  return requestStructured(env, {
    schema: signaturePlanningSchema,
    schemaName: "oprealm_signature_story_plan",
    instructions: "You are a visionary children's adventure editor designing unforgettable, emotionally varied moments and impossible story locations.",
    input: prompt,
    effort: "medium",
    maxOutputTokens: 9000,
    background,
    seed,
  });
}

export function generateStoryLocations(creatorBible, storySpine, signatureMomentsPlan) {
  const world = parseNamedValue(creatorBible?.world, "name") || "the selected realm";
  const force = cleanText(storySpine?.mainAntagonisticForce, 120) || "the hidden threat";
  const coolest = cleanText(signatureMomentsPlan?.coolestLocation, 240) || `The impossible heart of ${world}`;
  return normalizeStoryLocations([
    {
      name: `The Turning Gate of ${world}`,
      visualIdentity: "A colossal gate built into the moving ribs of a sleeping stone titan.",
      sensoryDetails: "Dust falls with each slow breath; blue runes hum beneath warm stone.",
      danger: `Each movement wakes ${force} and changes every escape route.`,
      secret: "The gate opens only when two people choose to trust different parts of the same clue.",
      storyPurpose: "Deliver the early wow moment and plant the first physical contradiction.",
      illustrationPromptSeed: "Wide cinematic view of heroes crossing the moving ribs of a sleeping titan as a rune gate turns beneath them.",
    },
    {
      name: cleanText(coolest, 100),
      visualIdentity: "An impossible landmark suspended inside a giant crystal above a bottomless storm.",
      sensoryDetails: "Whispering echoes arrive before each voice; cold rainbow light moves across every surface.",
      danger: "The crystal shows tempting false routes that become real when believed.",
      secret: "One reflection reveals the named betrayer acting before the story began.",
      storyPurpose: "Stage the midpoint revelation, relationship conflict and difficult choice.",
      illustrationPromptSeed: "Heroes inside a giant floating crystal above a bottomless storm, surrounded by living reflections and branching paths.",
    },
    {
      name: `The Last Horizon of ${world}`,
      visualIdentity: "A broken landscape folding upward like pages while the sky opens beneath it.",
      sensoryDetails: "Thunder rolls upward; fragments of earth orbit a bright silent center.",
      danger: "The realm will lock into the wrong shape if the final choice is made for control instead of help.",
      secret: "The apparent weapon is the mechanism that can safely restore the world.",
      storyPurpose: "Hold the finale spectacle and resolve the mystery through the hero's changed behaviour.",
      illustrationPromptSeed: "Finale above a world folding like giant pages, heroes and allies acting together around a brilliant restoration mechanism.",
    },
  ]);
}

export async function generateFullChapterStory(env, storySpine, logicPlan, bestMomentsPlan, signaturePlanning, creatorBible, seed = "full-story", background = false) {
  const prompt = [
    `Approved Story Spine: ${JSON.stringify(storySpine)}`,
    `Approved Pick-a-Path Logic Plan: ${JSON.stringify(logicPlan)}`,
    `Approved Best Moments Plan: ${JSON.stringify(bestMomentsPlan)}`,
    `Approved Signature Moments Plan: ${JSON.stringify(signaturePlanning?.signatureMomentsPlan || {})}`,
    `Approved Emotional Rhythm Plan: ${JSON.stringify(signaturePlanning?.emotionalRhythmPlan || [])}`,
    `Approved Named Story Locations: ${JSON.stringify(signaturePlanning?.storyLocations || [])}`,
    `Creator Bible: ${JSON.stringify(creatorBible)}`,
    "Write only the complete chapter prose, title and spoiler-light summary. Do not create scenes, image prompts, visual directions, metadata or a new logic plan.",
    "Write as if creating a bestselling children's adventure series: entertainment first, invisible structure and irresistible momentum.",
    "Write a page-turning children's adventure with emotional stakes, vivid action, strong character voices, suspenseful chapter endings, surprising discoveries and meaningful choices.",
    "Write approximately 1200-1900 words in 4-8 titled chapters with 3-8 substantial paragraphs per chapter.",
    "Never expose the framework. Do not name a character's want, fear, flaw, emotional need, lesson, arc, problem, choice structure or story function in the prose.",
    "Show emotion through body reactions, spoken words, interrupted actions, mistakes and consequences. Minimize explanatory introspection and author commentary.",
    "Target 35-50 percent dialogue. Important characters must follow their voice profiles closely enough to be recognized from dialogue alone.",
    "Every chapter must contain active pressure, distinct dialogue, several sensory details, a visible emotional reaction, a planted clue or payoff, a setback or reversal and a reason to keep reading.",
    "Every chapter must deliver one illustration-worthy WOW moment: an impossible discovery, colossal creature, hidden world, magical event, terrifying enemy, unexpected ally, impossible object or reality-changing twist.",
    "Never allow two ordinary travel, investigation or conversation chapters in a row. Escalate scale, danger, wonder or emotional cost.",
    "Every non-final chapter must end with a cliffhanger, shocking reveal, dangerous arrival, betrayal hint, impossible choice, emotional reversal or discovery that changes everything.",
    "Before every planned decision, build emotional pressure through action and natural dialogue with a named character. Show the visible consequence, uncertainty, and why every option could be right or wrong.",
    "A character may ask the hero a question, but never recite option labels or sound like a menu. The UI will present the concise actions separately.",
    "Do not write phrases such as do you choose X or Y, you have three options, what will you do, or the choice stood before them.",
    "Plant every planned clue visibly before it becomes useful. Later dialogue or action must allow the reader to connect that clue to the wiser choice.",
    "Include real setbacks and costly reversals. Let plans fail, allies disagree and discoveries change what the characters believe.",
    "Most stories should contain false trust, a hidden motive, a misunderstood clue or a mistaken assumption. The reversal must make earlier concrete details suddenly meaningful.",
    "Build naturally toward every Best Moments Plan item. Do not list them or force them together; earn them through setup, escalation and payoff.",
    "Build naturally toward every Signature Moments Plan item. wowMoment1 must occur by Chapter 2 and the coolest named location must appear before the midpoint.",
    "Use the named Story Locations as active places with dangers and secrets that change events. At least one impossible location must be central to a clue, choice or reveal.",
    "Follow the Emotional Rhythm Plan. Include warmth or humour, wonder or awe, betrayal or reversal, and a quiet honest moment before the finale.",
    "Across the story, show at least four varied hero behaviours: making a mistake, snapping at someone, joking under pressure, protecting someone instinctively, apologising, trusting despite fear, refusing an easy answer, or choosing help over control.",
    "Every major clue must pay off in a reveal, betrayal, difficult decision or finale rather than leading only to another clue.",
    "Vary the chapter rhythm across danger, wonder, mystery, friendship, reversal and high-stakes finale. Do not keep every chapter grim or equally intense.",
    "Make decisions genuinely uncomfortable. Both options must protect something valuable and risk something painful; never make one answer obviously correct.",
    "Use smells, sounds, textures, lighting, weather and movement to make locations physical, while keeping descriptions active and concise.",
    "Use the lesson through consequences and changed behavior, never by explaining the moral.",
    "Do not write outline language, future summaries, production language, scene labels, prompts, lessons, arcs or commentary about storytelling.",
    "Avoid symbolic filler, unexplained magical objects, hybrid messengers and vague emotional gestures when a concrete action or spoken line can tell the story.",
    "Use only the supplied cast and naturally necessary unnamed background people. Do not import characters from other saved stories.",
    "Keep all content original, child-safe and suitable for ages 7-13.",
    "The final chapter must resolve the immediate danger, the main choice, the core mystery and the hero's emotional conflict. It may hint at future adventures only after delivering a satisfying ending.",
    "Before returning, silently inspect and revise the story. Fix any chapter lacking tension, spectacle, a hook, distinct dialogue or sensory life. Fix twists without foreshadowing, obvious choices, unearned victories and framework-exposing prose.",
    "Every chapter must contain a cinematic visual, character interaction, active obstacle, emotional beat, clue/reveal/twist and a compelling reason to continue.",
    "Return only the polished final story. Never mention this hidden inspection.",
  ].join("\n");
  return requestStructured(env, {
    schema: proseSchema,
    schemaName: "oprealm_full_chapter_story",
    instructions: "You are a celebrated children's adventure novelist. Write immersive, exciting pick-a-path prose, not a mission log, synopsis or production plan.",
    input: prompt,
    effort: "low",
    maxOutputTokens: 18000,
    background,
    seed,
  });
}

export async function splitStoryIntoScenes(env, input, background = false) {
  const extractedScenes = extractCinematicScenes(
    input.approvedStory,
    input.storySpine,
    input.logicPlan,
    input.signatureMomentsPlan,
    { creatorBible: input.creatorBible, storyType: input.creatorBible?.storyType },
  );
  const prompt = [
    `Approved story title: ${input.title}`,
    `Approved Story Spine: ${JSON.stringify(input.storySpine || {})}`,
    `Approved Pick-a-Path Logic Plan: ${JSON.stringify(input.logicPlan || {})}`,
    `Approved Signature Moments Plan: ${JSON.stringify(input.signatureMomentsPlan || {})}`,
    `Creator Bible: ${JSON.stringify(input.creatorBible)}`,
    `Approved chapter prose: ${input.approvedStory}`,
    `Cinematic passages already selected from the approved prose: ${JSON.stringify(extractedScenes)}`,
    `Create exactly ${extractedScenes.length} enriched scene records, one for each selected passage, in the supplied order.`,
    "Do not choose a different passage, combine passages, compress the story, or invent a replacement event.",
    "Copy sourcePassage and passage exactly from each selected passage. Preserve its wording and punctuation.",
    "Assign stable scene IDs scene-1, scene-2 and so on.",
    "Remap provisional clue placements, decisions, branch routes and ending routes onto real scene IDs without changing their IDs, meaning, scores, flags or emotional stakes.",
    "Create bounded pre-generated branch scenes only where required by the approved choice plan, then converge them back into the main story.",
    "Attach each decision to the scene where a named character directly asks the hero to choose. The question and options must match the approved prose.",
    "Attach each clue to the earlier scene where its exact visible object or physical detail appears.",
    "Return 1-8 play-script beats per scene. Preserve named dialogue as dialogue and use Narrator only for visible action or description.",
    "For each selected passage, create visualPromptSummary, visualPromptFull and visualDirection from the exact named characters, location, visible action, key object, emotional expression, camera and lighting.",
    "Keep visualDirection to one concrete sentence describing the visible composition. visualPromptFull contains the complete production prompt.",
    "Decision scenes must show the named person applying pressure, the hero reacting, the visible stakes, conflicting actions and relevant clue object. Prefer POV, close-up or over-the-shoulder composition.",
    "Clue scenes must show the exact clue object partially hidden in its real location and the named character noticing it without making it cartoonishly obvious.",
    "Action scenes must show dynamic movement, directional composition, debris, sparks or environmental reaction where the passage supports them.",
    "The final spectacle must show huge scale, an impossible location, object or entity, dramatic lighting and small characters against the event.",
    "Every full prompt must include these exact continuity instructions: same character design as previous scenes; same outfit unless story explicitly changes it; consistent world aesthetic.",
    "Never write the generic labels the hero, story world, first landmark, mysterious clue or strange obstacle.",
    `Use scene moods from: ${SCENE_MOODS.join(", ")}.`,
    `Use cameras from: ${SCENE_CAMERAS.join(", ")}.`,
    "Vary camera and mood according to the actual event. Do not rewrite the story into production-plan prose.",
  ].join("\n");
  const result = await requestStructured(env, {
    schema: splitStorySchema,
    schemaName: "oprealm_story_scene_split",
    instructions: "You are OPREALM's precise storyboard editor. Preserve approved prose and convert it into playable visual scenes without rewriting the story.",
    input: prompt,
    effort: "low",
    maxOutputTokens: 24000,
    background,
    seed: input.seed,
  });
  if (result.pending) return result;
  return { ...result, extractedScenes };
}

function buildDeterministicCinematicSplit(input) {
  const chapters = parseApprovedStoryChapters(input.approvedStory);
  const extractedScenes = extractCinematicScenes(
    chapters,
    input.storySpine,
    input.logicPlan,
    input.signatureMomentsPlan,
    { creatorBible: input.creatorBible, storyType: input.storyType },
  );
  const logicPlan = remapLogicPlanToCinematicScenes(input.logicPlan, extractedScenes);
  const decisions = new Map(logicPlan.decisions.map((decision) => [decision.id, decision]));
  const scenes = extractedScenes.map((scene, index) => {
    const decisionNode = scene.decisionNodeId ? decisions.get(scene.decisionNodeId) || null : null;
    const visualDirection = buildDeterministicVisualDirection(scene);
    return {
      ...scene,
      passage: scene.sourcePassage,
      script: [{ speaker: "Narrator", speakerRole: "narrator", text: scene.sourcePassage }],
      mood: moodForCinematicType(scene.sceneType),
      camera: enumSceneValue(scene.cameraDirection, SCENE_CAMERAS, "Wide Shot"),
      visualDirection,
      visualPromptSummary: visualDirection,
      visualPromptFull: "",
      decisionNode,
      choices: decisionNode?.choices || [],
    };
  });
  return {
    summary: chapterDescriptionFromParagraphs(chapters[0]?.paragraphs, 0),
    logicPlan,
    chapters,
    scenes,
  };
}

function parseApprovedStoryChapters(story) {
  const parts = String(story || "").split(/(?=^Chapter\s+\d+\s*:)/gim).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return [{ title: "The Adventure", description: "", paragraphs: [cleanProse(story, 100000)].filter(Boolean) }];
  return parts.map((part, index) => {
    const lines = part.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const heading = lines.shift() || `Chapter ${index + 1}`;
    const title = heading.replace(/^Chapter\s+\d+\s*:\s*/i, "").trim() || `Chapter ${index + 1}`;
    const paragraphs = lines.map((paragraph) => cleanProse(paragraph, 5000)).filter(Boolean);
    return {
      title,
      description: chapterDescriptionFromParagraphs(paragraphs, index),
      paragraphs,
    };
  }).filter((chapter) => chapter.paragraphs.length);
}

function remapLogicPlanToCinematicScenes(value, scenes) {
  const plan = normalizeLogicPlan(value);
  const sceneByDecision = new Map();
  const sceneByClue = new Map();
  scenes.forEach((scene) => {
    if (scene.decisionNodeId) sceneByDecision.set(scene.decisionNodeId, scene.id);
    scene.clueIds.forEach((clueId) => sceneByClue.set(clueId, scene.id));
  });
  const sceneIndex = new Map(scenes.map((scene, index) => [scene.id, index]));
  const decisions = plan.decisions.map((decision) => {
    const mappedSceneId = sceneByDecision.get(decision.id)
      || nearestSceneForPlacement(decision.sceneId, scenes)
      || decision.sceneId;
    const currentIndex = sceneIndex.get(mappedSceneId) ?? 0;
    return {
      ...decision,
      sceneId: mappedSceneId,
      choices: decision.choices.map((choice, choiceIndex) => ({
        ...choice,
        nextSceneId: scenes[Math.min(scenes.length - 1, currentIndex + choiceIndex + 1)]?.id || mappedSceneId,
      })),
    };
  });
  return {
    ...plan,
    clues: plan.clues.map((clue) => ({
      ...clue,
      introducedInSceneId: sceneByClue.get(clue.id)
        || nearestSceneForPlacement(clue.introducedInSceneId, scenes)
        || clue.introducedInSceneId,
    })),
    decisions,
    endingRules: plan.endingRules.map((rule) => ({
      ...rule,
      sceneId: nearestSceneForPlacement(rule.sceneId, scenes) || scenes.at(-1)?.id || rule.sceneId,
    })),
  };
}

function nearestSceneForPlacement(placementId, scenes) {
  const chapterMatch = String(placementId || "").match(/chapter-(\d+)/i);
  if (chapterMatch) {
    const chapterNumber = Number(chapterMatch[1]);
    return scenes.find((scene) => scene.chapterNumber === chapterNumber)?.id || "";
  }
  return scenes.find((scene) => scene.id === placementId)?.id || "";
}

function buildDeterministicVisualDirection(scene) {
  const names = scene.charactersPresent.length ? scene.charactersPresent.join(" and ") : "the named characters";
  const object = scene.keyObject ? ` with ${scene.keyObject} visible but naturally placed` : "";
  return `${names} perform the exact action from the approved passage in ${scene.location || "the named story location"}${object}; ${scene.cameraDirection}, ${scene.lightingMood}.`;
}

function moodForCinematicType(type) {
  if (["action_chase"].includes(type)) return "Action";
  if (["final_spectacle", "creature_reveal"].includes(type)) return "Epic";
  if (["clue_discovery", "betrayal_reveal", "choice_setup"].includes(type)) return "Mystery";
  if (["trust_conflict", "darkest_moment", "final_choice"].includes(type)) return "Tense";
  if (["emotional_turning_point", "resolution"].includes(type)) return "Emotional";
  return "Wonder";
}

async function requestStructured(env, { schema, schemaName, instructions, input, effort, maxOutputTokens, background = false, seed }) {
  const response = await openAiFetch(env, "/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: STORY_DRAFT_MODEL,
      reasoning: { effort },
      max_output_tokens: maxOutputTokens,
      background,
      store: true,
      instructions,
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
  }, { seed, retries: 1 });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || `${schemaName} generation failed.`), { status: 502 });
  if (background && data.id && data.status !== "completed") {
    return {
      pending: true,
      responseId: data.id,
      status: data.status || "queued",
      model: data.model || STORY_DRAFT_MODEL,
    };
  }
  return parseStructuredResponse(data, schemaName);
}

async function retrieveBackgroundResponse(env, responseId) {
  const response = await openAiFetch(env, `/v1/responses/${encodeURIComponent(responseId)}`, {
    method: "GET",
  }, { seed: responseId, retries: 1 });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || "The background story request could not be retrieved."), { status: 502 });
  if (["queued", "in_progress"].includes(data.status)) {
    return { pending: true, status: data.status, responseId };
  }
  if (data.status !== "completed") {
    const reason = data.error?.message || data.incomplete_details?.reason || data.status || "unknown";
    throw Object.assign(new Error(`The background story request stopped: ${reason}.`), { status: 502 });
  }
  return { ...parseStructuredResponse(data, "oprealm_background_story_stage"), status: data.status };
}

function parseStructuredResponse(data, schemaName) {
  const output = extractOutputText(data);
  if (!output) {
    const reason = data.incomplete_details?.reason || data.status;
    const message = reason === "max_output_tokens"
      ? `${schemaName} reached its output limit before finishing. Please try again.`
      : `${schemaName} returned an empty response.`;
    throw Object.assign(new Error(message), { status: 502 });
  }
  try {
    return { value: JSON.parse(output), model: data.model || STORY_DRAFT_MODEL };
  } catch {
    throw Object.assign(new Error(`${schemaName} returned incomplete structured data. Please try again.`), { status: 502 });
  }
}

function backgroundStageResponse(stage, result) {
  return json({
    ok: true,
    status: result.status || "queued",
    stage,
    providerResponseId: result.responseId,
    pollAfterMs: 3500,
  }, 202, { "retry-after": "4" });
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
  const storySpine = normalizeStorySpine(value.storySpine);
  const bestMomentsPlan = normalizeBestMomentsPlan(value.bestMomentsPlan);
  const signatureMomentsPlan = normalizeSignatureMomentsPlan(value.signatureMomentsPlan);
  const emotionalRhythmPlan = normalizeEmotionalRhythmPlan(value.emotionalRhythmPlan, storySpine);
  const storyLocations = normalizeStoryLocations(value.storyLocations);
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
    chapterNumber: Math.max(1, Math.min(8, Number(scene.chapterNumber) || 1)),
    sceneNumber: index + 1,
    title: cleanText(scene.title, 100) || `Scene ${index + 1}`,
    sceneType: CINEMATIC_SCENE_TYPES.includes(scene.sceneType) ? scene.sceneType : "world_reveal",
    cinematicSceneType: CINEMATIC_SCENE_TYPES.includes(scene.sceneType) ? scene.sceneType : "world_reveal",
    sourcePassage: cleanProse(scene.sourcePassage || scene.passage, 4000),
    passage: cleanProse(scene.sourcePassage || scene.passage, 4000),
    emotionalPurpose: cleanProse(scene.emotionalPurpose, 700),
    storyImportance: Math.max(0, Math.min(100, Number(scene.storyImportance) || 0)),
    charactersPresent: cleanStringArray(scene.charactersPresent, 8),
    location: cleanText(scene.location, 180),
    keyObject: cleanText(scene.keyObject, 180),
    decisionNodeId: cleanId(scene.decisionNodeId),
    clueIds: cleanStringArray(scene.clueIds, 5).map(cleanId).filter(Boolean),
    visualPromptFull: cleanProse(scene.visualPromptFull || scene.visualDirection, 5000),
    visualPromptSummary: cleanProse(scene.visualPromptSummary || scene.visualDirection, 700),
    cameraDirection: cleanText(scene.cameraDirection || scene.camera, 100),
    lightingMood: cleanProse(scene.lightingMood, 500),
    continuityNotes: cleanProse(scene.continuityNotes, 700),
    promptQuality: scene.promptQuality && typeof scene.promptQuality === "object" ? scene.promptQuality : null,
    script: normalizeSceneScript(scene.script),
    mood: enumSceneValue(scene.mood, SCENE_MOODS, "Wonder"),
    camera: enumSceneValue(scene.camera, SCENE_CAMERAS, "Wide Shot"),
    visualDirection: cleanProse(scene.visualDirection || scene.visualPromptFull, 1200),
    choices: normalizeChoices(scene.choices, `scene-${index + 1}`),
    decisionNode: normalizeDecisionNode(scene.decisionNode, cleanId(scene.id) || `scene-${index + 1}`),
  }));
  const logicPlan = ensurePlayableLogicPlan(normalizeLogicPlan(value.logicPlan), scenes, {
    storySpine,
    title: cleanText(value.title, 100),
    chapters,
  });
  return {
    title: cleanText(value.title, 100) || "My OPREALM Story",
    summary: cleanProse(value.summary, 1800),
    storySpine,
    bestMomentsPlan,
    signatureMomentsPlan,
    emotionalRhythmPlan,
    storyLocations,
    logicPlan,
    chapters,
    story: formattedStory,
    scenes: attachPlanDecisions(scenes, logicPlan),
  };
}

function mergeCinematicSceneExtraction(generatedScenes, extractedScenes, logicPlan) {
  const generated = Array.isArray(generatedScenes) ? generatedScenes : [];
  const extracted = Array.isArray(extractedScenes) ? extractedScenes : [];
  const decisions = new Map((logicPlan?.decisions || []).map((decision) => [decision.id, decision]));
  return extracted.map((source, index) => {
    const enriched = generated[index] || {};
    const decision = source.decisionNodeId ? decisions.get(source.decisionNodeId) : null;
    const visualPromptFull = cleanProse(enriched.visualPromptFull || enriched.visualDirection, 5000);
    const merged = {
      ...enriched,
      id: `scene-${index + 1}`,
      chapterNumber: source.chapterNumber,
      sceneNumber: index + 1,
      title: cleanText(enriched.title, 100) || cleanText(source.title, 100) || `Scene ${index + 1}`,
      sceneType: source.sceneType,
      sourcePassage: source.sourcePassage,
      passage: source.sourcePassage,
      emotionalPurpose: cleanProse(enriched.emotionalPurpose, 700) || source.emotionalPurpose,
      storyImportance: source.storyImportance,
      charactersPresent: source.charactersPresent,
      location: cleanText(enriched.location, 180),
      keyObject: source.keyObject || cleanText(enriched.keyObject, 180),
      decisionNodeId: source.decisionNodeId,
      clueIds: source.clueIds,
      visualPromptFull,
      visualPromptSummary: cleanProse(enriched.visualPromptSummary, 700),
      cameraDirection: cleanText(enriched.cameraDirection || source.cameraDirection, 100),
      lightingMood: cleanProse(enriched.lightingMood || source.lightingMood, 500),
      continuityNotes: source.continuityNotes,
      script: Array.isArray(enriched.script) && enriched.script.length
        ? enriched.script
        : [{ speaker: "Narrator", speakerRole: "narrator", text: source.sourcePassage }],
      camera: enumSceneValue(enriched.camera || source.cameraDirection, SCENE_CAMERAS, "Wide Shot"),
      visualDirection: cleanProse(enriched.visualDirection, 1200) || source.sourcePassage,
      decisionNode: decision || null,
    };
    merged.promptQuality = validateSceneVisualPrompt(visualPromptFull, merged);
    return merged;
  });
}

function finalizeStoryDraft(value) {
  const cleaned = cleanEngineVisibleLanguage(removeFrameworkLanguage(value));
  const draft = normalizeDraft(cleaned);
  const chapterText = draft.chapters.map((chapter) => chapter.paragraphs.join("\n")).join("\n\n");
  draft.logicPlan = {
    ...draft.logicPlan,
    decisions: draft.logicPlan.decisions.map((decision) => ({
      ...decision,
      setupText: naturalizeDecisionSetup(decision, chapterText),
    })),
  };
  draft.scenes = attachPlanDecisions(draft.scenes, draft.logicPlan);
  return draft;
}

function normalizeBestMomentsPlan(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries([
    "biggestReveal", "coolestCreatureOrEntity", "hardestChoice", "mostEmotionalScene",
    "largestVisualSpectacle", "betrayalMoment", "finaleMoment", "wonderMoment",
    "humorOrWarmthMoment", "terrifyingButKidSafeMoment",
  ].map((key) => [key, cleanProse(source[key], 700)]));
}

function normalizeSignatureMomentsPlan(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries([
    "wowMoment1", "wowMoment2", "biggestReveal", "mostEmotionalMoment",
    "mostShockingBetrayal", "coolestLocation", "coolestCreatureOrEntity",
    "mostDifficultChoice", "funniestOrWarmestMoment", "mostIllustratableScene",
    "finaleSpectacle",
  ].map((key) => [key, cleanProse(source[key], 800)]));
}

function normalizeEmotionalRhythmPlan(value, storySpine = {}) {
  const supplied = (Array.isArray(value) ? value : []).slice(0, 8).map((beat, index) => ({
    chapterNumber: Math.max(1, Math.min(8, Number(beat?.chapterNumber) || index + 1)),
    primaryTone: cleanText(beat?.primaryTone, 100),
    secondaryTone: cleanText(beat?.secondaryTone, 100),
    purpose: cleanProse(beat?.purpose, 500),
  })).filter((beat) => beat.primaryTone && beat.secondaryTone);
  if (supplied.length >= 4) return supplied;
  const chapterCount = Math.max(4, Math.min(8, storySpine?.chapterAdventurePromises?.length || storySpine?.chapterHooks?.length || 6));
  return generateEmotionalRhythmPlan(chapterCount);
}

function normalizeStoryLocations(value) {
  return (Array.isArray(value) ? value : []).slice(0, 5).map((location) => ({
    name: cleanText(location?.name, 120),
    visualIdentity: cleanProse(location?.visualIdentity, 700),
    sensoryDetails: cleanProse(location?.sensoryDetails, 700),
    danger: cleanProse(location?.danger, 700),
    secret: cleanProse(location?.secret, 700),
    storyPurpose: cleanProse(location?.storyPurpose, 700),
    illustrationPromptSeed: cleanProse(location?.illustrationPromptSeed, 1000),
  })).filter((location) => location.name && location.visualIdentity);
}

function normalizeSignaturePlanning(value, storySpine, logicPlan, bestMomentsPlan, creatorBible) {
  const fallback = fallbackSignaturePlanning(storySpine, logicPlan, bestMomentsPlan, creatorBible);
  const signatureMomentsPlan = normalizeSignatureMomentsPlan(value?.signatureMomentsPlan);
  const completeSignature = signatureMomentsPlan.wowMoment1 && signatureMomentsPlan.finaleSpectacle
    ? signatureMomentsPlan
    : fallback.signatureMomentsPlan;
  const storyLocations = normalizeStoryLocations(value?.storyLocations);
  return {
    signatureMomentsPlan: completeSignature,
    emotionalRhythmPlan: normalizeEmotionalRhythmPlan(value?.emotionalRhythmPlan, storySpine),
    storyLocations: storyLocations.length >= 3 ? storyLocations : fallback.storyLocations,
  };
}

function fallbackSignaturePlanning(storySpine, logicPlan, bestMomentsPlan, creatorBible) {
  const spine = normalizeStorySpine(storySpine);
  const plan = normalizeLogicPlan(logicPlan);
  const moments = normalizeBestMomentsPlan(bestMomentsPlan);
  const hero = parseNamedValue(creatorBible?.character, "name") || "the protagonist";
  const locations = generateStoryLocations(creatorBible, spine, {
    coolestLocation: moments.wonderMoment,
  });
  return {
    signatureMomentsPlan: normalizeSignatureMomentsPlan({
      wowMoment1: moments.wonderMoment || `${hero} reaches an impossible moving landmark and survives its first transformation.`,
      wowMoment2: moments.largestVisualSpectacle || `${spine.mainAntagonisticForce || "the hidden force"} awakens and changes the shape of the realm.`,
      biggestReveal: moments.biggestReveal || spine.trueRevelation,
      mostEmotionalMoment: moments.mostEmotionalScene || `${hero} apologises to the ally hurt by their mistake and asks for help.`,
      mostShockingBetrayal: moments.betrayalMoment || spine.reversalDesign?.reversal,
      coolestLocation: locations[1]?.name || locations[0]?.name,
      coolestCreatureOrEntity: moments.coolestCreatureOrEntity || spine.mainAntagonisticForce,
      mostDifficultChoice: moments.hardestChoice || plan.decisions[1]?.questionText,
      funniestOrWarmestMoment: moments.humorOrWarmthMoment || `${hero} and an ally laugh while repairing the damage from a failed plan.`,
      mostIllustratableScene: moments.largestVisualSpectacle || locations[0]?.illustrationPromptSeed,
      finaleSpectacle: moments.finaleMoment || `${hero} resolves the mystery as the realm transforms around the whole cast.`,
    }),
    emotionalRhythmPlan: generateEmotionalRhythmPlan(spine.chapterAdventurePromises.length || spine.chapterHooks.length || 6),
    storyLocations: locations,
  };
}

function fallbackBestMomentsPlan(storySpine, logicPlan, creatorBible) {
  const spine = normalizeStorySpine(storySpine);
  const plan = normalizeLogicPlan(logicPlan);
  const hero = parseNamedValue(creatorBible?.character, "name") || "the protagonist";
  const world = parseNamedValue(creatorBible?.world, "name") || "the selected realm";
  const clueObjects = plan.clues.map((clue) => clue.visualObject).filter(Boolean);
  return normalizeBestMomentsPlan({
    biggestReveal: `${clueObjects[0] || "the earliest physical clue"} proves that ${spine.trueRevelation || spine.majorSecret}.`,
    coolestCreatureOrEntity: `${spine.mainAntagonisticForce || "a colossal guardian"} reveals an unexpected living form tied to ${world}.`,
    hardestChoice: plan.decisions[1]?.questionText || `${hero} must protect a trusted friend or stop the threat before it reaches everyone else.`,
    mostEmotionalScene: `${hero} admits the mistake caused by ${spine.heroFlaw || "refusing help"} and asks a hurt ally to stand with them again.`,
    largestVisualSpectacle: `${world} transforms around the final confrontation as its largest landmark, weather and hidden power awaken together.`,
    betrayalMoment: `${spine.keyRelationshipConflict || "A trusted ally's hidden promise"} reveals a motive that makes ${hero} question the entire journey.`,
    finaleMoment: `${hero} resolves ${spine.centralMystery}, stops the immediate danger and acts on ${spine.trueRevelation || "the truth learned through the journey"}.`,
    wonderMoment: `${hero} enters a hidden part of ${world} that overturns what everyone believed was possible.`,
    humorOrWarmthMoment: `${hero} and an ally share a badly timed joke while repairing trust after a failed plan.`,
    terrifyingButKidSafeMoment: `A vast silhouette belonging to ${spine.mainAntagonisticForce || "the hidden guardian"} moves behind the heroes while escape routes close.`,
  });
}

function parseNamedValue(value, key) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return cleanText(parsed?.[key], 120);
  } catch {
    return "";
  }
}

function ensurePlayableLogicPlan(plan, scenes, context = {}) {
  if (plan.decisions.length >= 3 && plan.endingRules.length >= 3 && plan.clues.length >= 3) return plan;
  const sceneIdAt = (ratio) => scenes[Math.min(scenes.length - 1, Math.max(0, Math.floor((scenes.length - 1) * ratio)))]?.id || "";
  const spine = context.storySpine || {};
  const mystery = spine.centralMystery || plan.centralMystery || "the central mystery";
  const force = spine.mainAntagonisticForce || "the force threatening the realm";
  const secret = spine.majorSecret || "the hidden truth";
  const clueObjects = [
    `${cleanText(force, 70)}'s broken seal`,
    `a map marked with the route to ${cleanText(secret, 70)}`,
    `a message contradicting ${cleanText(mystery, 80)}`,
  ];
  const decisions = [
    fallbackDecision("decision-trust", sceneIdAt(.3), "trust_choice", sceneIdAt(.39), sceneIdAt(.44), `The evidence about ${mystery} points toward two allies. Which person's account matches ${clueObjects[0]}?`, clueObjects[0]),
    fallbackDecision("decision-courage", sceneIdAt(.62), "courage_choice", sceneIdAt(.7), sceneIdAt(.75), `${force} is closing in. Should the group follow the marked route on ${clueObjects[1]}, or protect the ally who discovered it?`, clueObjects[1]),
    fallbackDecision("decision-fate", sceneIdAt(.84), "final_fate_choice", sceneIdAt(.93), sceneIdAt(.96), `The truth about ${secret} can stop ${force}, but revealing it will cost the promised reward. Which promise should be kept?`, clueObjects[2], "ending"),
  ];
  return {
    centralMystery: plan.centralMystery || mystery,
    heroEmotionalFlaw: plan.heroEmotionalFlaw || spine.heroFlaw || "The protagonist tries to solve every problem without trusting anyone else.",
    clues: plan.clues.length >= 3 ? plan.clues : decisions.map((decision, index) => ({
      id: `clue-${index + 1}`,
      introducedInSceneId: sceneIdAt(.12 + index * .2),
      clueText: [
        `${clueObjects[0]} carries a fresh cut that matches the tool marks found at the first attack.`,
        `${clueObjects[1]} includes one safe crossing that the supposed guide claimed did not exist.`,
        `${clueObjects[2]} bears the same date as the warning everyone believed was ancient.`,
      ][index],
      visualObject: clueObjects[index],
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
    routeMap: plan.routeMap.length ? plan.routeMap : decisions.map((decision) => `${decision.sceneId} branches through ${decision.choices.map((choice) => choice.nextSceneId).join(" or ")} and later reconverges.`),
  };
}

function attachPlanDecisions(scenes, plan) {
  const byScene = new Map(plan.decisions.map((decision) => [decision.sceneId, decision]));
  return scenes.map((scene) => {
    const decision = scene.decisionNode || byScene.get(scene.id) || null;
    return decision ? { ...scene, decisionNode: decision, choices: decision.choices } : scene;
  });
}

function fallbackDecision(id, sceneId, decisionType, firstNext, secondNext, questionText, clueObject, consequenceMode = "branch_and_converge") {
  return normalizeDecisionNode({
    id,
    sceneId,
    title: consequenceMode === "ending" ? "The Final Choice" : "The Story Turns",
    setupText: `${clueObject} changes what the group believed, and each possible action now carries a different cost.`,
    questionText,
    decisionType,
    emotionalTone: "urgent",
    clueReferences: [`clue-${id.includes("trust") ? 1 : id.includes("courage") ? 2 : 3}`],
    visualPrompt: "",
    consequenceMode,
    whyChoiceMatters: `The decision tests whether the protagonist can act on the truth revealed by ${clueObject}.`,
    whatPlayerKnows: `${clueObject} contradicts the safest-looking explanation.`,
    helpfulClueId: `clue-${id.includes("trust") ? 1 : id.includes("courage") ? 2 : 3}`,
    wrongChoiceConsequence: "The antagonistic force gains time and an ally's trust is damaged.",
    wiseChoiceConsequence: "The group acts on the concrete clue and reaches the next danger prepared.",
    influencesEndingIds: ["ending-heroic", "ending-wise", "ending-friendship"],
    choices: [
      fallbackChoice(`${id}-evidence`, `Follow the proof on ${clueObject}`, `Use the physical clue to challenge the safest-looking account.`, firstNext, "Trust the visible contradiction", "wise", { wisdom: 2, trust: 1 }, [`${id}-evidence`]),
      fallbackChoice(`${id}-protect`, `Protect the ally targeted by ${clueObject}`, "Put the threatened relationship ahead of the quickest route.", secondNext, "Risk time to preserve loyalty", "loyal", { courage: 1, loyalty: 2 }, [`${id}-protect`]),
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
      payoffTarget: ["biggest_reveal", "betrayal", "hardest_choice", "finale"].includes(clue?.payoffTarget)
        ? clue.payoffTarget
        : "biggest_reveal",
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
    routeMap: cleanStringArray(source.routeMap, 8),
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
    questionText: cleanProse(value.questionText, 400) || "Which concrete action answers the evidence already discovered?",
    decisionType: DECISION_TYPES.includes(value.decisionType) ? value.decisionType : "courage_choice",
    emotionalTone: cleanText(value.emotionalTone, 80) || "tense",
    choices,
    clueReferences: cleanStringArray(value.clueReferences, 3).map(cleanId).filter(Boolean),
    visualPrompt: cleanProse(value.visualPrompt, 1200),
    consequenceMode: value.consequenceMode === "ending" ? "ending" : "branch_and_converge",
    whyChoiceMatters: cleanProse(value.whyChoiceMatters, 500),
    whatPlayerKnows: cleanProse(value.whatPlayerKnows, 500),
    helpfulClueId: cleanId(value.helpfulClueId),
    wrongChoiceConsequence: cleanProse(value.wrongChoiceConsequence, 500),
    wiseChoiceConsequence: cleanProse(value.wiseChoiceConsequence, 500),
    influencesEndingIds: cleanStringArray(value.influencesEndingIds, 3).map(cleanId).filter(Boolean),
  };
}

function normalizeStorySpine(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    heroWant: cleanProse(source.heroWant, 500),
    heroFear: cleanProse(source.heroFear, 500),
    heroFlaw: cleanProse(source.heroFlaw, 500),
    emotionalNeed: cleanProse(source.emotionalNeed, 500),
    centralMystery: cleanProse(source.centralMystery, 700),
    mainAntagonisticForce: cleanProse(source.mainAntagonisticForce, 700),
    keyRelationshipConflict: cleanProse(source.keyRelationshipConflict, 700),
    majorSecret: cleanProse(source.majorSecret, 700),
    falseBelief: cleanProse(source.falseBelief, 500),
    trueRevelation: cleanProse(source.trueRevelation, 500),
    chapterHooks: cleanStringArray(source.chapterHooks, 8),
    toneProfile: cleanText(source.toneProfile, 200),
    targetFeeling: cleanText(source.targetFeeling, 200),
    characterVoiceProfiles: cleanVoiceProfiles(source.characterVoiceProfiles),
    chapterAdventurePromises: cleanChapterAdventurePromises(source.chapterAdventurePromises),
    reversalDesign: cleanReversalDesign(source.reversalDesign),
  };
}

function cleanVoiceProfiles(value) {
  return (Array.isArray(value) ? value : []).slice(0, 8).map((profile) => ({
    characterName: cleanText(profile?.characterName, 100),
    role: cleanText(profile?.role, 100),
    speechRhythm: cleanText(profile?.speechRhythm, 240),
    vocabulary: cleanText(profile?.vocabulary, 240),
    verbalHabit: cleanText(profile?.verbalHabit, 240),
    avoids: cleanText(profile?.avoids, 240),
  })).filter((profile) => profile.characterName);
}

function cleanChapterAdventurePromises(value) {
  return (Array.isArray(value) ? value : []).slice(0, 8).map((promise, index) => ({
    chapterNumber: Math.max(1, Math.min(8, Number(promise?.chapterNumber) || index + 1)),
    tensionEngine: cleanProse(promise?.tensionEngine, 500),
    wowMoment: cleanProse(promise?.wowMoment, 500),
    endingHook: cleanProse(promise?.endingHook, 500),
  }));
}

function cleanReversalDesign(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    falseAssumption: cleanProse(source.falseAssumption, 500),
    hiddenMotive: cleanProse(source.hiddenMotive, 500),
    reversal: cleanProse(source.reversal, 500),
    emotionalCost: cleanProse(source.emotionalCost, 500),
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
