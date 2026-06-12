const FLAT_ENDING_PATTERN = /\b(?:everything was fine|they went home|the problem was solved|all was well)\b/i;
const HOOK_PATTERN = /\b(?:but|until|suddenly|before|behind|arrived|appeared|revealed|realized|discovered|betray|choose|decide|or else|too late|impossible)\b|[?!]\s*$/i;
const SETBACK_PATTERN = /\b(?:failed|lost|blocked|trapped|broke|collapsed|escaped|stolen|betrayed|wrong|worse|danger|cost|sacrifice|setback|too late)\b/i;
const SUMMARY_PATTERN = /\b(?:the story follows|this chapter shows|the scene is about|the adventure will|the lesson is|the plot|the climax|the reader)\b/i;
const GENERIC_DECISION_PATTERN = /\b(?:what should happen next|who has earned|which risk is worth|act on the evidence|take the dangerous route|choose wisely)\b/i;
const ABSTRACT_CLUE_PATTERN = /\b(?:something|somehow|a feeling|felt wrong|important detail|familiar mark|strange sign|a witness remembers|someone knows)\b/i;

export function validateStoryQuality(draft = {}) {
  const chapters = Array.isArray(draft.chapters) ? draft.chapters : [];
  const logicPlan = draft.logicPlan || {};
  const storySpine = draft.storySpine || {};
  const story = chapters.flatMap((chapter) => chapter.paragraphs || []).join("\n");
  const warnings = [];
  const errors = [];
  const dialogueLines = (story.match(/["\u201c][^"\u201d]{2,}["\u201d]/g) || []).length;
  if (dialogueLines < Math.max(4, chapters.length)) warnings.push("The story has too few spoken dialogue lines.");
  if (!String(storySpine.heroFlaw || logicPlan.heroEmotionalFlaw || "").trim()) errors.push("No clear hero flaw exists.");

  const flatChapters = chapters.slice(0, -1).filter((chapter) => {
    const text = (chapter.paragraphs || []).join(" ").trim();
    const ending = text.slice(-320);
    return !HOOK_PATTERN.test(ending) || FLAT_ENDING_PATTERN.test(ending);
  });
  if (flatChapters.length) warnings.push(`${flatChapters.length} chapter ending(s) may not contain a strong hook.`);

  const decisions = Array.isArray(logicPlan.decisions) ? logicPlan.decisions : [];
  const genericDecisions = decisions.filter((decision) =>
    GENERIC_DECISION_PATTERN.test(`${decision?.title || ""} ${decision?.questionText || ""} ${(decision?.choices || []).map((choice) => choice.label).join(" ")}`),
  );
  if (genericDecisions.length) errors.push("One or more decisions use generic choice wording.");

  const clues = Array.isArray(logicPlan.clues) ? logicPlan.clues : [];
  const clueIds = new Set(clues.map((clue) => String(clue?.id || "")).filter(Boolean));
  const ungroundedDecisions = decisions.filter((decision) => {
    const references = [
      ...(Array.isArray(decision?.clueReferences) ? decision.clueReferences : []),
      decision?.helpfulClueId,
    ].map(String).filter(Boolean);
    return !references.length || !references.some((id) => clueIds.has(id));
  });
  if (ungroundedDecisions.length) errors.push("Each major decision must reference a clue planted earlier in the story.");
  const abstractClues = clues.filter((clue) => {
    const clueText = String(clue?.clueText || "");
    const visualObject = String(clue?.visualObject || "");
    return !visualObject.trim() || ABSTRACT_CLUE_PATTERN.test(clueText) || clueText.split(/\s+/).length < 7;
  });
  if (abstractClues.length) warnings.push("One or more clues are abstract instead of concrete visible evidence.");
  if (!SETBACK_PATTERN.test(story)) warnings.push("The story contains no obvious setback or costly reversal.");

  const outcomeTags = decisions.flatMap((decision) => (decision.choices || []).map((choice) => choice.outcomeTag).filter(Boolean));
  if (outcomeTags.length > 1 && new Set(outcomeTags).size < 2) warnings.push("All choices route toward the same emotional outcome.");
  if (SUMMARY_PATTERN.test(story)) errors.push("The prose contains production-plan or summary language.");

  const repeatedPhrases = repeatedPhraseList(story);
  if (repeatedPhrases.length) warnings.push(`Repeated prose detected: ${repeatedPhrases.slice(0, 3).join("; ")}`);

  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];
  if (scenes.some((scene) => /\b(?:the hero|story world)\b/i.test(`${scene?.passage || ""} ${scene?.visualDirection || ""}`))) {
    errors.push('Scene text contains generic labels such as "the hero" or "story world".');
  }

  return {
    passed: errors.length === 0,
    score: Math.max(0, 100 - errors.length * 18 - warnings.length * 6),
    errors,
    warnings,
    metrics: {
      chapterCount: chapters.length,
      dialogueLines,
      decisionCount: decisions.length,
      clueCount: clues.length,
      flatChapterEndings: flatChapters.length,
      genericDecisions: genericDecisions.length,
      ungroundedDecisions: ungroundedDecisions.length,
      abstractClues: abstractClues.length,
    },
  };
}

function repeatedPhraseList(value) {
  const words = String(value || "").toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
  const counts = new Map();
  for (let index = 0; index <= words.length - 6; index += 1) {
    const phrase = words.slice(index, index + 6).join(" ");
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 3).map(([phrase]) => phrase);
}
