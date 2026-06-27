const GENERIC_LOCATION_PATTERN = /\b(?:forest|castle|cave|village|city|road|room|hall|temple|tower)\b/i;
const IMPOSSIBLE_LOCATION_PATTERN = /\b(?:upside[- ]down|floating|inside (?:a|the)|living|whisper|reflection|bottomless|sleeping titan|giant crystal|impossible|sky|underwater|moon|clockwork|shifting|walking|dream)\b/i;
const MEMORABLE_ENTITY_PATTERN = /\b(?:dragon|guardian|warden|hound|oracle|fox|beast|spirit|machine|robot|titan|serpent|creature|entity|living)\b/i;
const WARMTH_PATTERN = /\b(?:laugh|joke|smile|friend|warm|kind|apolog|hug|share|together|playful|tease)\b/i;
const EMOTIONAL_RESOLUTION_PATTERN = /\b(?:apolog|forgive|trust|promise|together|help|mercy|friend|family|accept|admit|choose)\b/i;
const HERO_BEHAVIOURS = {
  makesMistake: /\b(?:mistake|misjudg|wrong|failed|slipped|dropped|forgot|rushed)\b/i,
  snapsAtSomeone: /\b(?:snapped|shouted|yelled|don't tell me|leave me alone)\b/i,
  jokesUnderPressure: /\b(?:joked|quipped|grinned|laughed|terrible time for a joke)\b/i,
  protectsInstinctively: /\b(?:shielded|pulled .* (?:back|clear)|stepped between|covered|protected)\b/i,
  apologises: /\b(?:sorry|apolog(?:y|ised|ized))\b/i,
  trustsDespiteFear: /\b(?:trusted|took .* hand|handed .* over|believed .* anyway)\b/i,
  refusesEasyAnswer: /\b(?:refused|wouldn't abandon|not leaving|easy answer|shortcut)\b/i,
  choosesHelpOverControl: /\b(?:asked for help|let .* lead|shared control|together)\b/i,
};
const ENGINE_PHRASES = [
  /\bthe choice stood before (?:him|her|them)\b/gi,
  /\bthe question tracked the room\b/gi,
  /\bthe choice felt like\b/gi,
  /\bthe problem was\b/gi,
  /\b(?:his|her|their) (?:want|fear)\b/gi,
  /\b(?:he|she|they) had to decide\b/gi,
  /\bwhat kind of leader\b/gi,
  /\bthe plan bit\b/gi,
  /\bthe world narrowed\b/gi,
  /\btasted like copper\b/gi,
  /\bfelt like teeth\b/gi,
  /\blike a wound\b/gi,
];

export function generateEmotionalRhythmPlan(chapterCount = 6) {
  const rhythm = [
    ["danger", "mystery"],
    ["wonder", "suspicion"],
    ["warmth", "fear"],
    ["betrayal", "urgency"],
    ["awe", "sacrifice"],
    ["quiet reflection", "terror"],
    ["hope", "triumph"],
    ["relief", "wonder"],
  ];
  const count = Math.max(4, Math.min(8, Number(chapterCount) || 6));
  return Array.from({ length: count }, (_, index) => {
    const tones = index === count - 2
      ? ["quiet reflection", "awe"]
      : index === count - 1
        ? ["terror", "triumph"]
        : rhythm[index % rhythm.length];
    return {
      chapterNumber: index + 1,
      primaryTone: tones[0],
      secondaryTone: tones[1],
      purpose: index === count - 2
      ? "Give the hero and their closest ally a quiet honest moment before the finale."
      : index === count - 1
        ? "Turn accumulated fear and sacrifice into a satisfying emotional and visual triumph."
        : `Change the emotional temperature through ${tones.join(" and ")}.`,
    };
  });
}

export function naturalizeDecisionSetup(decisionNode = {}, chapterText = "") {
  const choices = Array.isArray(decisionNode.choices) ? decisionNode.choices.filter((choice) => choice?.label) : [];
  const namedSpeaker = findNamedSpeaker(chapterText) || "Their closest ally";
  const consequence = cleanSentence(decisionNode.wrongChoiceConsequence || decisionNode.whyChoiceMatters || "Waiting will put someone in danger");
  const first = cleanSentence(choices[0]?.label || "Act on the evidence");
  const second = cleanSentence(choices[1]?.label || "Protect the person at risk");
  const clue = cleanSentence(decisionNode.whatPlayerKnows || decisionNode.setupText || "The evidence supports both fears");
  return [
    `${namedSpeaker} placed the evidence between them. "${clue}," they said.`,
    `"${first} could stop this now, but ${consequence.charAt(0).toLowerCase()}${consequence.slice(1)}. ${second} could save what matters most, but it may give the enemy time."`,
    `"I can argue for either one. I cannot choose who pays the price."`,
  ].join(" ");
}

export function cleanEngineVisibleLanguage(storyDraft = {}) {
  const seen = new Map();
  const chapters = (Array.isArray(storyDraft.chapters) ? storyDraft.chapters : []).map((chapter) => ({
    ...chapter,
    paragraphs: (Array.isArray(chapter.paragraphs) ? chapter.paragraphs : []).map((paragraph) => {
      let text = String(paragraph || "")
        .replace(/\bemotional need\b/gi, "unspoken need")
        .replace(/\bcharacter flaw\b/gi, "mistake");
      for (const pattern of ENGINE_PHRASES) {
        text = text.replace(pattern, (match) => {
          const key = pattern.source;
          const count = seen.get(key) || 0;
          seen.set(key, count + 1);
          if (count === 0) return match;
          if (/had to decide|choice stood|choice felt|question tracked/i.test(match)) return "";
          if (/want|fear/i.test(match)) return "what mattered";
          return "";
        });
      }
      return text.replace(/\s{2,}/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
    }),
  }));
  return { ...storyDraft, chapters };
}

export function validateSignatureMoments(storyDraft = {}, signatureMomentsPlan = {}, storyLocations = [], emotionalRhythmPlan = []) {
  const chapters = Array.isArray(storyDraft.chapters) ? storyDraft.chapters : [];
  const chapterText = chapters.map((chapter) => (chapter.paragraphs || []).join(" ")); 
  const fullStory = chapterText.join(" ");
  const finale = chapterText.at(-1) || "";
  const earlyStory = chapterText.slice(0, 2).join(" ");
  const warnings = [];
  const behaviours = Object.entries(HERO_BEHAVIOURS)
    .filter(([, pattern]) => pattern.test(fullStory))
    .map(([name]) => name);
  const locations = Array.isArray(storyLocations) ? storyLocations : [];
  const impossibleLocations = locations.filter((location) =>
    IMPOSSIBLE_LOCATION_PATTERN.test(`${location?.name || ""} ${location?.visualIdentity || ""} ${location?.secret || ""}`),
  );
  const genericLocations = locations.filter((location) => {
    const text = `${location?.name || ""} ${location?.visualIdentity || ""}`;
    return GENERIC_LOCATION_PATTERN.test(text) && !IMPOSSIBLE_LOCATION_PATTERN.test(text);
  });
  const tones = new Set((Array.isArray(emotionalRhythmPlan) ? emotionalRhythmPlan : [])
    .flatMap((beat) => [beat?.primaryTone, beat?.secondaryTone])
    .filter(Boolean));

  if (!containsKeyTerms(earlyStory, signatureMomentsPlan.wowMoment1)) warnings.push("The first wow moment may not appear by Chapter 2.");
  if (!locations.length || !impossibleLocations.length) warnings.push("The story needs at least one impossible or unforgettable named location.");
  if (locations.length && genericLocations.length === locations.length) warnings.push("The planned locations may feel too generic.");
  if (!MEMORABLE_ENTITY_PATTERN.test(`${signatureMomentsPlan.coolestCreatureOrEntity || ""} ${fullStory}`)) warnings.push("No memorable story-connected creature or entity was detected.");
  if (!WARMTH_PATTERN.test(`${signatureMomentsPlan.funniestOrWarmestMoment || ""} ${fullStory}`)) warnings.push("The story needs a warm or funny breathing-space moment.");
  if (tones.size && tones.size < 5) warnings.push("The emotional rhythm needs more tonal variety.");
  if (behaviours.length < 4) warnings.push("The hero needs at least four varied visible behaviours.");
  if (!EMOTIONAL_RESOLUTION_PATTERN.test(finale)) warnings.push("The ending resolves events but may not resolve the hero's emotional arc.");
  if (!containsKeyTerms(finale, signatureMomentsPlan.finaleSpectacle)) warnings.push("The finale spectacle may be smaller than the plan promises.");
  if (!EMOTIONAL_RESOLUTION_PATTERN.test(signatureMomentsPlan.mostShockingBetrayal || "")) warnings.push("The betrayal may lack personal emotional impact.");

  return {
    passed: warnings.length === 0,
    warnings,
    metrics: {
      heroBehaviourCount: behaviours.length,
      heroBehaviours: behaviours,
      locationCount: locations.length,
      impossibleLocationCount: impossibleLocations.length,
      emotionalToneCount: tones.size,
      earlyWowDetected: containsKeyTerms(earlyStory, signatureMomentsPlan.wowMoment1),
    },
  };
}

function findNamedSpeaker(text) {
  const match = String(text || "").match(/\b([A-Z][a-z]{2,})\s+(?:said|asked|whispered|shouted|answered|warned|told)\b/);
  return match?.[1] || "";
}

function cleanSentence(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();
}

function containsKeyTerms(haystack, needle) {
  const terms = String(needle || "").toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  const source = String(haystack || "").toLowerCase();
  return terms.slice(0, 5).filter((term) => source.includes(term)).length >= Math.min(2, terms.length || 2);
}
