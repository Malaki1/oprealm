const SMALL_REVEAL_PATTERN = /\b(?:another clue|more questions|something strange|a new mystery|not what it seemed)\b/i;
const OPEN_ENDING_PATTERN = /\b(?:to be continued|danger was coming|the real adventure (?:was|had) just begun|they would soon discover|waited ahead)\b/i;
const MEMORABLE_PATTERN = /\b(?:dragon|giant|colossal|creature|beast|living|floating|hidden|impossible|clockwork|crystal|storm|underwater|sky|moon|portal|city|kingdom|twist|betray|alive)\b/i;
const EMOTIONAL_PATTERN = /\b(?:friend|trust|forgive|promise|sacrifice|family|alone|together|mercy|loyal|betray|save|protect|admit|apolog)\b/i;
const AI_MANNERISMS = [
  /\bpanic braided with courage\b/gi,
  /\bthe world narrowed\b/gi,
  /\bhis lungs burned on the words\b/gi,
  /\bher lungs burned on the words\b/gi,
  /\bthe plan bit\b/gi,
  /\btasted like copper\b/gi,
  /\bfelt like a knife\b/gi,
  /\blike a wound\b/gi,
  /\blike teeth\b/gi,
  /\bhis throat tightened\b/gi,
  /\bher throat tightened\b/gi,
];

export function validateStoryPayoffs(storyDraft = {}, bestMomentsPlan = {}, clues = [], decisions = []) {
  const chapters = Array.isArray(storyDraft.chapters) ? storyDraft.chapters : [];
  const story = chapters.flatMap((chapter) => chapter.paragraphs || []).join("\n");
  const finale = (chapters.at(-1)?.paragraphs || []).join(" ");
  const warnings = [];
  const errors = [];
  const cluePayoffMisses = (Array.isArray(clues) ? clues : []).filter((clue) => {
    const object = String(clue?.visualObject || "").trim();
    const payoffByTarget = {
      biggest_reveal: bestMomentsPlan.biggestReveal,
      betrayal: bestMomentsPlan.betrayalMoment,
      hardest_choice: bestMomentsPlan.hardestChoice,
      finale: bestMomentsPlan.finaleMoment,
    };
    const payoff = payoffByTarget[clue?.payoffTarget] || `${bestMomentsPlan.biggestReveal || ""} ${bestMomentsPlan.betrayalMoment || ""} ${bestMomentsPlan.finaleMoment || ""}`;
    return !clue?.payoffTarget || (object && !containsKeyTerms(payoff, object) && !containsKeyTerms(story, object));
  });
  if (cluePayoffMisses.length) warnings.push(`${cluePayoffMisses.length} clue(s) may not receive a memorable payoff.`);

  const types = new Set((Array.isArray(decisions) ? decisions : []).map((decision) => decision?.decisionType).filter(Boolean));
  if (types.size < 3) errors.push("The story needs at least three emotionally different decision types.");
  const tacticalChoices = (Array.isArray(decisions) ? decisions : []).filter((decision) =>
    !EMOTIONAL_PATTERN.test(`${decision?.whyChoiceMatters || ""} ${decision?.questionText || ""}`),
  );
  if (tacticalChoices.length) warnings.push("One or more major decisions may be tactical without enough emotional stakes.");
  if (SMALL_REVEAL_PATTERN.test(bestMomentsPlan.biggestReveal || "")) warnings.push("The biggest reveal may be too small or generic.");
  if (!MEMORABLE_PATTERN.test(`${bestMomentsPlan.largestVisualSpectacle || ""} ${story}`)) warnings.push("No major visual spectacle was detected.");
  if (!EMOTIONAL_PATTERN.test(bestMomentsPlan.betrayalMoment || "")) warnings.push("The betrayal may lack a clear emotional impact.");
  if (!EMOTIONAL_PATTERN.test(`${bestMomentsPlan.finaleMoment || ""} ${finale}`)) warnings.push("The finale may not pay off the hero's emotional journey.");
  if (OPEN_ENDING_PATTERN.test(finale)) errors.push("The ending postpones the immediate resolution instead of satisfying it.");
  if (!MEMORABLE_PATTERN.test(`${bestMomentsPlan.coolestCreatureOrEntity || ""} ${bestMomentsPlan.wonderMoment || ""} ${bestMomentsPlan.biggestReveal || ""}`)) {
    warnings.push("The story lacks a memorable creature, place, object or twist.");
  }
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    metrics: {
      cluePayoffMisses: cluePayoffMisses.length,
      distinctDecisionTypes: types.size,
      tacticalChoices: tacticalChoices.length,
    },
  };
}

export function removeFrameworkLanguage(storyDraft = {}) {
  const seen = new Map();
  const chapters = (Array.isArray(storyDraft.chapters) ? storyDraft.chapters : []).map((chapter) => ({
    ...chapter,
    paragraphs: (Array.isArray(chapter.paragraphs) ? chapter.paragraphs : []).map((paragraph) => {
      let cleaned = String(paragraph || "")
        .replace(/\b(?:his|her|their) (?:want|fear)\b/gi, "what mattered")
        .replace(/\bemotional need\b/gi, "unspoken need")
        .replace(/\bcharacter flaw\b/gi, "mistake")
        .replace(/\bthe choice before (?:him|her|them)\b/gi, "the decision");
      for (const pattern of AI_MANNERISMS) {
        cleaned = cleaned.replace(pattern, (match) => {
          const key = pattern.source;
          const count = seen.get(key) || 0;
          seen.set(key, count + 1);
          return count === 0 ? match : "";
        });
      }
      return cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
    }),
  }));
  return { ...storyDraft, chapters };
}

function containsKeyTerms(haystack, needle) {
  const terms = String(needle || "").toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  const source = String(haystack || "").toLowerCase();
  return terms.slice(0, 3).some((term) => source.includes(term));
}
