const FLAT_ENDING_PATTERN = /\b(?:everything was fine|they went home|the problem was solved|all was well)\b/i;
const HOOK_PATTERN = /\b(?:but|until|suddenly|before|behind|arrived|appeared|revealed|realized|discovered|betray|choose|decide|or else|too late|impossible)\b|[?!]\s*$/i;
const SETBACK_PATTERN = /\b(?:failed|lost|blocked|trapped|broke|collapsed|escaped|stolen|betrayed|wrong|worse|danger|cost|sacrifice|setback|too late)\b/i;
const SUMMARY_PATTERN = /\b(?:the story follows|this chapter shows|the scene is about|the adventure will|the lesson is|the plot|the climax|the reader)\b/i;
const GENERIC_DECISION_PATTERN = /\b(?:what should happen next|who has earned|which risk is worth|act on the evidence|take the dangerous route|choose wisely)\b/i;
const ABSTRACT_CLUE_PATTERN = /\b(?:something|somehow|a feeling|felt wrong|important detail|familiar mark|strange sign|a witness remembers|someone knows)\b/i;
const FRAMEWORK_PATTERN = /\b(?:his want|her want|their want|his fear|her fear|their fear|emotional need|character flaw|the lesson|story arc|the choice before (?:him|her|them)|the problem (?:was|is))\b/i;
const TENSION_PATTERN = /\b(?:before|until|hurry|seconds|minutes|chased|pursued|danger|threat|suspect|suspicion|argued|shouted|trapped|blocked|attack|betray|choose|decision|risk|warning|too late|closing in)\b/i;
const SPECTACLE_PATTERN = /\b(?:colossal|gigantic|giant|floating|upside down|crystal storm|hidden city|hidden world|underwater kingdom|sky train|living forest|clockwork city|moon bridge|impossible|dragon|leviathan|lightning beast|mountain moved|city in the sky|reality folded|stars fell|ocean opened|tower awakened|books? (?:spoke|predicted)|portal)\b/i;
const REVERSAL_PATTERN = /\b(?:betray|traitor|false ally|hidden motive|we were wrong|wasn't|was not|instead|all along|forged|disguise|pretended|misunderstood|real truth|revealed)\b/i;

export function validateStoryQuality(draft = {}) {
  const chapters = Array.isArray(draft.chapters) ? draft.chapters : [];
  const logicPlan = draft.logicPlan || {};
  const storySpine = draft.storySpine || {};
  const story = chapters.flatMap((chapter) => chapter.paragraphs || []).join("\n");
  const warnings = [];
  const errors = [];
  const dialogueMatches = story.match(/["\u201c][^"\u201d]{2,}["\u201d]/g) || [];
  const dialogueLines = dialogueMatches.length;
  const dialogueCharacters = dialogueMatches.join("").length;
  const dialogueRatio = story.length ? dialogueCharacters / story.length : 0;
  if (dialogueLines < Math.max(4, chapters.length)) warnings.push("The story has too few spoken dialogue lines.");
  if (dialogueRatio < 0.28) warnings.push("Dialogue occupies less than the intended share of the story.");
  if (!String(storySpine.heroFlaw || logicPlan.heroEmotionalFlaw || "").trim()) errors.push("No clear hero flaw exists.");
  if (FRAMEWORK_PATTERN.test(story)) errors.push("The prose exposes hidden story framework instead of dramatizing it.");

  const flatChapters = chapters.slice(0, -1).filter((chapter) => {
    const text = (chapter.paragraphs || []).join(" ").trim();
    const ending = text.slice(-320);
    return !HOOK_PATTERN.test(ending) || FLAT_ENDING_PATTERN.test(ending);
  });
  if (flatChapters.length) warnings.push(`${flatChapters.length} chapter ending(s) may not contain a strong hook.`);
  const lowTensionChapters = chapters.filter((chapter) => !TENSION_PATTERN.test((chapter.paragraphs || []).join(" ")));
  if (lowTensionChapters.length) warnings.push(`${lowTensionChapters.length} chapter(s) may lack active pressure or danger.`);
  const lowSpectacleChapters = chapters.filter((chapter) => !SPECTACLE_PATTERN.test((chapter.paragraphs || []).join(" ")));
  if (lowSpectacleChapters.length) warnings.push(`${lowSpectacleChapters.length} chapter(s) may lack a memorable visual spectacle.`);

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
  if (!REVERSAL_PATTERN.test(story)) warnings.push("The story may lack a meaningful reversal, false assumption or betrayal risk.");
  const voiceProfiles = Array.isArray(storySpine.characterVoiceProfiles) ? storySpine.characterVoiceProfiles : [];
  if (voiceProfiles.length < 1) warnings.push("No character voice profiles were created before prose.");
  const adventurePromises = Array.isArray(storySpine.chapterAdventurePromises) ? storySpine.chapterAdventurePromises : [];
  if (adventurePromises.length < chapters.length) warnings.push("Not every chapter has a planned tension, spectacle and hook promise.");

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
      dialogueRatio: Number(dialogueRatio.toFixed(3)),
      decisionCount: decisions.length,
      clueCount: clues.length,
      flatChapterEndings: flatChapters.length,
      lowTensionChapters: lowTensionChapters.length,
      lowSpectacleChapters: lowSpectacleChapters.length,
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
