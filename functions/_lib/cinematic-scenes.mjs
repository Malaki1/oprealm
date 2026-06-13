export const CINEMATIC_SCENE_TYPES = [
  "opening_hook",
  "world_reveal",
  "clue_discovery",
  "choice_setup",
  "trust_conflict",
  "betrayal_reveal",
  "action_chase",
  "creature_reveal",
  "emotional_turning_point",
  "darkest_moment",
  "final_choice",
  "final_spectacle",
  "resolution",
];

const TYPE_PATTERNS = {
  world_reveal: /\b(?:arrived|entered|revealed|rose|opened|floating|impossible|city|kingdom|horizon|tower|gate|world)\b/i,
  clue_discovery: /\b(?:clue|map|seal|mark|message|footprint|key|compass|artifact|evidence|noticed|found|discovered)\b/i,
  choice_setup: /\b(?:choose|choice|decide|decision|either|promise|trust|risk|cost)\b/i,
  trust_conflict: /\b(?:trust|lied|secret|argued|accused|doubt|believe|promise|betray)\b/i,
  betrayal_reveal: /\b(?:betray|traitor|forged|all along|hidden motive|wasn't|was not|deceived|false)\b/i,
  action_chase: /\b(?:ran|raced|chased|leapt|dived|fought|attacked|escaped|collapsed|exploded|crashed|charged)\b/i,
  creature_reveal: /\b(?:dragon|guardian|warden|beast|creature|spirit|robot|machine|titan|serpent|hound|oracle)\b/i,
  emotional_turning_point: /\b(?:sorry|apolog|forgive|trusted|hugged|cried|promise|friend|together|admitted)\b/i,
  darkest_moment: /\b(?:trapped|lost|failed|alone|hopeless|captured|broken|too late|darkest|defeated)\b/i,
  final_choice: /\b(?:final choice|last chance|choose now|only one|sacrifice|mercy|fate)\b/i,
  final_spectacle: /\b(?:colossal|gigantic|sky opened|world folded|city rose|tower awakened|final battle|aurora|exploded|transformed)\b/i,
  resolution: /\b(?:safe|saved|returned|forgave|restored|at last|finally|home|peace|celebrated)\b/i,
};
const VISUAL_PATTERN = /\b(?:rain|snow|fire|light|shadow|fog|smoke|spark|glow|tower|bridge|market|forest|ocean|river|mountain|crystal|metal|moon|sun|storm)\b/i;
const ACTION_PATTERN = /\b(?:holds?|grabs?|runs?|races?|kneels?|raises?|opens?|strikes?|pulls?|pushes?|climbs?|jumps?|turns?|points?|shields?|carries?|reaches?)\b/i;
const DANGER_PATTERN = /\b(?:danger|attack|chase|trap|collapse|fire|enemy|guard|threat|blade|fall|explosion|too late)\b/i;
const DIALOGUE_PATTERN = /["\u201c][^"\u201d]{3,}["\u201d]/;
const ABSTRACT_PATTERN = /\b(?:felt|wondered|remembered|thought|realized|understood|seemed|perhaps)\b/i;
const SUMMARY_PATTERN = /\b(?:the story|this chapter|the adventure|later they|after some time|eventually)\b/i;
const CAMERA_DIRECTIONS = [
  "Wide Shot", "Close Up", "Over Shoulder", "Low Angle", "High Angle",
  "POV", "Tracking Shot", "Dutch Angle", "Medium Shot", "Drone Shot",
];

export function scoreStoryMomentForScene(moment = {}) {
  const text = String(moment.text || moment.sourcePassage || "");
  let score = 0;
  if (moment.chapterNumber === 1 && moment.paragraphIndex === 0) score += 8;
  if (moment.isChapterEnding) score += 7;
  if (moment.isFinalChapter) score += 5;
  if (Array.isArray(moment.charactersPresent) && moment.charactersPresent.length) score += 6;
  if (VISUAL_PATTERN.test(text)) score += 6;
  if (ACTION_PATTERN.test(text)) score += 7;
  if (DANGER_PATTERN.test(text)) score += 6;
  if (TYPE_PATTERNS.clue_discovery.test(text)) score += 6;
  if (TYPE_PATTERNS.creature_reveal.test(text)) score += 7;
  if (TYPE_PATTERNS.betrayal_reveal.test(text)) score += 8;
  if (TYPE_PATTERNS.choice_setup.test(text)) score += 7;
  if (DIALOGUE_PATTERN.test(text)) score += 5;
  if (TYPE_PATTERNS.emotional_turning_point.test(text)) score += 5;
  if (TYPE_PATTERNS.final_spectacle.test(text)) score += 9;
  if (SUMMARY_PATTERN.test(text)) score -= 7;
  if (ABSTRACT_PATTERN.test(text) && !ACTION_PATTERN.test(text)) score -= 5;
  if (text.split(/\s+/).length < 18) score -= 3;
  return score;
}

export function extractCinematicScenes(fullStory, storySpine = {}, pickPathPlan = {}, signatureMomentsPlan = {}, options = {}) {
  const chapters = normalizeChapters(fullStory);
  const castNames = characterNames(storySpine, options.creatorBible);
  const clues = Array.isArray(pickPathPlan?.clues) ? pickPathPlan.clues : [];
  const decisions = Array.isArray(pickPathPlan?.decisions) ? pickPathPlan.decisions : [];
  const candidates = [];
  chapters.forEach((chapter, chapterIndex) => {
    chapter.paragraphs.forEach((paragraph, paragraphIndex) => {
      const charactersPresent = castNames.filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(paragraph));
      const matchedClues = clues.filter((clue) => passageMatchesClue(paragraph, clue));
      const isChapterEnding = paragraphIndex === chapter.paragraphs.length - 1;
      const matchedDecision = decisions.find((decision) =>
        passageMatchesDecision(paragraph, decision)
        || (isChapterEnding && cleanPlacementId(decision?.sceneId) === `chapter-${chapterIndex + 1}`),
      );
      const moment = {
        id: `candidate-${chapterIndex + 1}-${paragraphIndex + 1}`,
        chapterNumber: chapterIndex + 1,
        paragraphIndex,
        title: chapter.title,
        text: paragraph,
        sourcePassage: paragraph,
        charactersPresent,
        clueIds: matchedClues.map((clue) => clue.id).filter(Boolean),
        decisionNodeId: matchedDecision?.id || "",
        isChapterEnding,
        isFinalChapter: chapterIndex === chapters.length - 1,
      };
      moment.sceneType = classifyCinematicScene(moment, signatureMomentsPlan, chapters.length);
      moment.storyImportance = scoreStoryMomentForScene(moment);
      candidates.push(moment);
    });
  });

  const requiredTypes = [
    "opening_hook", "world_reveal", "clue_discovery", "choice_setup", "trust_conflict",
    "action_chase", "final_choice", "final_spectacle", "resolution",
  ];
  const selected = [];
  const used = new Set();
  for (const type of requiredTypes) {
    const best = candidates
      .filter((candidate) => !used.has(candidate.id) && candidate.sceneType === type)
      .sort((a, b) => b.storyImportance - a.storyImportance)[0];
    if (best) {
      selected.push(best);
      used.add(best.id);
    }
  }
  candidates.forEach((candidate) => {
    const isEssentialMetadata = candidate.clueIds.length > 0 || Boolean(candidate.decisionNodeId);
    const isStructuralBeat = candidate.paragraphIndex === 0 || candidate.isChapterEnding || candidate.isFinalChapter;
    const isCinematic = candidate.storyImportance >= 8;
    if (!used.has(candidate.id) && (isEssentialMetadata || isStructuralBeat || isCinematic)) {
      selected.push(candidate);
      used.add(candidate.id);
    }
  });

  chapters.forEach((chapter, chapterIndex) => {
    const chapterScenes = selected.filter((scene) => scene.chapterNumber === chapterIndex + 1);
    if (chapterScenes.length >= Math.min(2, chapter.paragraphs.length)) return;
    candidates
      .filter((candidate) => candidate.chapterNumber === chapterIndex + 1 && !used.has(candidate.id))
      .sort((a, b) => b.storyImportance - a.storyImportance)
      .slice(0, Math.min(2, chapter.paragraphs.length) - chapterScenes.length)
      .forEach((candidate) => {
        selected.push(candidate);
        used.add(candidate.id);
      });
  });
  return selected
    .sort((a, b) => a.chapterNumber - b.chapterNumber || a.paragraphIndex - b.paragraphIndex)
    .map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      id: `scene-${index + 1}`,
      emotionalPurpose: emotionalPurposeForType(scene.sceneType),
      keyObject: clueObjectForScene(scene, clues),
      cameraDirection: cameraForType(scene.sceneType, index),
      lightingMood: lightingForType(scene.sceneType),
      continuityNotes: "Same character design as previous scenes. Same outfit unless the story explicitly changes it. Consistent world aesthetic.",
    }));
}

export function validateSceneVisualPrompt(prompt, context = {}) {
  const text = String(prompt || "");
  const warnings = [];
  if (/\bthe hero\b|\bstory world\b/i.test(text)) warnings.push("Prompt contains a generic character or world placeholder.");
  if (/\bmysterious clue\b/i.test(text) && !context.keyObject) warnings.push("Prompt names a mysterious clue without identifying the object.");
  if (context.charactersPresent?.length && !context.charactersPresent.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text))) warnings.push("Prompt lacks a named character.");
  if (!ACTION_PATTERN.test(text)) warnings.push("Prompt lacks a visible physical action.");
  if (!/(?:wide|close-up|close up|over-the-shoulder|over shoulder|low angle|high angle|POV|tracking|dutch angle|drone|medium shot)/i.test(text)) warnings.push("Prompt lacks camera direction.");
  if (!/(?:light|lighting|moonlit|sunset|firelight|torchlight|neon|fog|rain|glow|shadow|aurora)/i.test(text)) warnings.push("Prompt lacks lighting or atmosphere.");
  if (context.location && !text.toLowerCase().includes(String(context.location).toLowerCase())) warnings.push("Prompt lacks the specific location.");
  if (!/same character design as previous scenes/i.test(text) || !/same outfit unless/i.test(text) || !/consistent world aesthetic/i.test(text)) warnings.push("Prompt lacks continuity instructions.");
  return { passed: warnings.length === 0, warnings };
}

export function validateCinematicSceneSet(scenes = []) {
  const types = new Set(scenes.map((scene) => scene.sceneType || scene.cinematicSceneType));
  const warnings = [];
  const requiredGroups = {
    "opening hook": ["opening_hook"],
    "decision scene": ["choice_setup", "final_choice"],
    "clue scene": ["clue_discovery"],
    "action scene": ["action_chase"],
    "spectacle scene": ["world_reveal", "creature_reveal", "final_spectacle"],
    "emotional scene": ["trust_conflict", "emotional_turning_point", "darkest_moment"],
    "final scene": ["final_spectacle", "resolution"],
  };
  Object.entries(requiredGroups).forEach(([label, group]) => {
    if (!group.some((type) => types.has(type))) warnings.push(`No ${label} was selected.`);
  });
  const cameras = scenes.map((scene) => scene.cameraDirection || scene.camera).filter(Boolean);
  if (cameras.length > 3 && new Set(cameras).size < 3) warnings.push("Too many scenes use the same camera angle.");
  const lowValue = scenes.filter((scene) => Number(scene.storyImportance || 0) < 5).length;
  if (lowValue > Math.max(1, Math.floor(scenes.length / 4))) warnings.push("Too many selected scenes are low-visual exposition.");
  return { passed: warnings.length === 0, warnings, metrics: { sceneCount: scenes.length, distinctCameras: new Set(cameras).size, lowValueScenes: lowValue } };
}

function normalizeChapters(fullStory) {
  if (Array.isArray(fullStory)) {
    return fullStory.map((chapter, index) => ({
      title: String(chapter?.title || `Chapter ${index + 1}`),
      paragraphs: (Array.isArray(chapter?.paragraphs) ? chapter.paragraphs : []).map(String).filter(Boolean),
    }));
  }
  const text = String(fullStory || "");
  const parts = text.split(/(?=^Chapter\s+\d+\s*:)/gim).filter((part) => part.trim());
  return parts.map((part, index) => {
    const lines = part.trim().split(/\n+/);
    const heading = lines.shift() || `Chapter ${index + 1}`;
    return { title: heading.replace(/^Chapter\s+\d+\s*:\s*/i, ""), paragraphs: lines.map((line) => line.trim()).filter(Boolean) };
  });
}

function classifyCinematicScene(moment, signature, chapterCount) {
  const text = moment.text;
  if (moment.chapterNumber === 1 && moment.paragraphIndex === 0) return "opening_hook";
  if (moment.isFinalChapter && TYPE_PATTERNS.resolution.test(text)) return "resolution";
  if (moment.isFinalChapter && (TYPE_PATTERNS.final_spectacle.test(text) || containsTerms(text, signature?.finaleSpectacle))) return "final_spectacle";
  if (moment.isFinalChapter && TYPE_PATTERNS.final_choice.test(text)) return "final_choice";
  if (TYPE_PATTERNS.betrayal_reveal.test(text) || containsTerms(text, signature?.mostShockingBetrayal)) return "betrayal_reveal";
  if (moment.decisionNodeId) return moment.chapterNumber >= chapterCount - 1 ? "final_choice" : "choice_setup";
  if (moment.clueIds.length) return "clue_discovery";
  if (TYPE_PATTERNS.creature_reveal.test(text) || containsTerms(text, signature?.coolestCreatureOrEntity)) return "creature_reveal";
  if (TYPE_PATTERNS.action_chase.test(text)) return "action_chase";
  if (TYPE_PATTERNS.darkest_moment.test(text)) return "darkest_moment";
  if (TYPE_PATTERNS.trust_conflict.test(text)) return "trust_conflict";
  if (TYPE_PATTERNS.emotional_turning_point.test(text)) return "emotional_turning_point";
  if (TYPE_PATTERNS.world_reveal.test(text) || containsTerms(text, signature?.coolestLocation)) return "world_reveal";
  if (TYPE_PATTERNS.choice_setup.test(text)) return "choice_setup";
  return moment.isChapterEnding ? "emotional_turning_point" : "world_reveal";
}

function characterNames(storySpine, creatorBible) {
  const names = (storySpine?.characterVoiceProfiles || []).map((profile) => profile?.characterName).filter(Boolean);
  try {
    const hero = JSON.parse(String(creatorBible?.character || "{}"))?.name;
    const cast = JSON.parse(String(creatorBible?.cast || "[]"));
    if (hero) names.unshift(hero);
    if (Array.isArray(cast)) names.push(...cast.map((item) => item?.name).filter(Boolean));
  } catch {}
  return [...new Set(names.map(String))];
}

function passageMatchesClue(passage, clue) {
  return containsTerms(passage, clue?.visualObject) || containsTerms(passage, clue?.clueText);
}

function passageMatchesDecision(passage, decision) {
  return containsTerms(passage, decision?.questionText)
    || containsTerms(passage, decision?.setupText)
    || containsTerms(passage, decision?.whatPlayerKnows)
    || (decision?.choices || []).some((choice) => containsTerms(passage, choice?.label));
}

function cleanPlacementId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function containsTerms(haystack, needle) {
  const terms = String(needle || "").toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  const source = String(haystack || "").toLowerCase();
  return terms.length > 0 && terms.slice(0, 6).filter((term) => source.includes(term)).length >= Math.min(2, terms.length);
}

function clueObjectForScene(scene, clues) {
  return clues.find((clue) => scene.clueIds.includes(clue?.id))?.visualObject || "";
}

function emotionalPurposeForType(type) {
  const purposes = {
    opening_hook: "Seize attention with immediate danger, mystery or wonder.",
    world_reveal: "Make the realm feel impossible and worth exploring.",
    clue_discovery: "Reward observant readers with concrete visible evidence.",
    choice_setup: "Build emotional pressure before a meaningful decision.",
    trust_conflict: "Test a relationship through confrontation and uncertainty.",
    betrayal_reveal: "Reverse what the characters and reader believed.",
    action_chase: "Accelerate danger through visible movement.",
    creature_reveal: "Introduce a memorable story-connected entity.",
    emotional_turning_point: "Change how the hero relates to another character.",
    darkest_moment: "Remove the easy escape and expose the emotional cost.",
    final_choice: "Force the hero to act on what they have learned.",
    final_spectacle: "Deliver the story's largest visual and emotional payoff.",
    resolution: "Show the concrete and emotional consequences of the ending.",
  };
  return purposes[type] || "Advance the story through a concrete visible event.";
}

function cameraForType(type, index) {
  const preferred = {
    opening_hook: "Tracking Shot",
    world_reveal: "Wide Shot",
    clue_discovery: "Close Up",
    choice_setup: "Over Shoulder",
    trust_conflict: "Close Up",
    betrayal_reveal: "Dutch Angle",
    action_chase: "Tracking Shot",
    creature_reveal: "Low Angle",
    emotional_turning_point: "Close Up",
    darkest_moment: "High Angle",
    final_choice: "POV",
    final_spectacle: "Drone Shot",
    resolution: "Medium Shot",
  };
  return preferred[type] || CAMERA_DIRECTIONS[index % CAMERA_DIRECTIONS.length];
}

function lightingForType(type) {
  if (["betrayal_reveal", "darkest_moment"].includes(type)) return "hard shadow, cold rim light and uneasy fog";
  if (["action_chase", "final_spectacle"].includes(type)) return "high-contrast dramatic light, sparks, debris and atmospheric depth";
  if (["emotional_turning_point", "resolution"].includes(type)) return "soft firelight or sunset glow with expressive faces";
  if (type === "clue_discovery") return "selective light isolating the partially hidden clue";
  return "cinematic volumetric light shaped by the exact location and mood";
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
