(function initStoryDecisionEngine(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OPREALMStoryDecisionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStoryDecisionEngine() {
  const SCORE_KEYS = ["courage", "wisdom", "trust", "loyalty", "danger", "kindness"];
  const PLAYER_STATES = ["playing_beat", "waiting_for_continue", "waiting_for_choice", "transitioning", "complete"];
  const DECISION_TYPES = [
    "trust_choice", "sacrifice_choice", "courage_choice", "mercy_choice",
    "mystery_deduction", "loyalty_choice", "betrayal_choice", "final_fate_choice",
  ];

  /**
   * @typedef {Object} StoryChoice
   * @property {string} id
   * @property {string} label
   * @property {string} description
   * @property {string} nextSceneId
   * @property {string} emotionalHook
   * @property {string} visibleHint
   * @property {string} hiddenConsequence
   * @property {string} outcomeTag
   * @property {Object<string, number>} scoreEffects
   * @property {string[]} setsFlags
   * @property {string[]} requiresClueIds
   */

  /**
   * @typedef {Object} StoryDecisionNode
   * @property {string} id
   * @property {string} sceneId
   * @property {string} title
   * @property {string} setupText
   * @property {string} questionText
   * @property {string} decisionType
   * @property {string} emotionalTone
   * @property {StoryChoice[]} choices
   * @property {string[]} clueReferences
   * @property {string} visualPrompt
   * @property {string} consequenceMode
   */

  /**
   * @typedef {Object} StoryClue
   * @property {string} id
   * @property {string} introducedInSceneId
   * @property {string} clueText
   * @property {string} visualObject
   * @property {string} linkedDecisionId
   * @property {string} helpsChoiceId
   * @property {string} subtlety
   */

  /**
   * @typedef {Object} StoryRunState
   * @property {string} currentSceneId
   * @property {number} currentBeatIndex
   * @property {Array<{decisionId:string,choiceId:string}>} chosenChoices
   * @property {string[]} discoveredClues
   * @property {Object<string, boolean>} flags
   * @property {Object<string, number>} scores
   * @property {string} playerState
   */

  /**
   * @typedef {Object} StoryEndingRule
   * @property {string} id
   * @property {string} endingType
   * @property {string} sceneId
   * @property {Object<string, number>} minimumScores
   * @property {string[]} requiredFlags
   * @property {string[]} requiredClueIds
   * @property {string[]} preferredOutcomeTags
   */

  function createRunState(startSceneId = "") {
    return {
      currentSceneId: String(startSceneId || ""),
      currentBeatIndex: 0,
      chosenChoices: [],
      discoveredClues: [],
      flags: {},
      scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, 0])),
      playerState: "playing_beat",
      endingId: "",
    };
  }

  function normalizeRunState(value, startSceneId = "") {
    const base = createRunState(startSceneId);
    const source = value && typeof value === "object" ? value : {};
    return {
      ...base,
      currentSceneId: String(source.currentSceneId || startSceneId || ""),
      currentBeatIndex: Math.max(0, Number(source.currentBeatIndex || 0)),
      chosenChoices: Array.isArray(source.chosenChoices) ? source.chosenChoices.filter(Boolean).slice(-60) : [],
      discoveredClues: uniqueStrings(source.discoveredClues),
      flags: normalizeFlags(source.flags),
      scores: normalizeScores(source.scores),
      playerState: PLAYER_STATES.includes(source.playerState) ? source.playerState : "playing_beat",
      endingId: String(source.endingId || ""),
    };
  }

  function normalizeDecisionNode(value, sceneId = "") {
    if (!value || typeof value !== "object") return null;
    const choices = (Array.isArray(value.choices) ? value.choices : [])
      .map((choice, index) => normalizeChoice(choice, `${safeId(value.id || sceneId)}-choice-${index + 1}`))
      .filter((choice) => choice.label)
      .slice(0, 3);
    if (choices.length < 2) return null;
    return {
      id: String(value.id || `${safeId(sceneId)}-decision`),
      sceneId: String(value.sceneId || sceneId),
      title: String(value.title || "A Difficult Choice"),
      setupText: String(value.setupText || ""),
      questionText: String(value.questionText || "What should happen next?"),
      decisionType: DECISION_TYPES.includes(value.decisionType) ? value.decisionType : "courage_choice",
      emotionalTone: String(value.emotionalTone || "tense"),
      choices,
      clueReferences: uniqueStrings(value.clueReferences),
      visualPrompt: String(value.visualPrompt || ""),
      consequenceMode: value.consequenceMode === "ending" ? "ending" : "branch_and_converge",
    };
  }

  function normalizeChoice(value, fallbackId) {
    if (typeof value === "string") {
      return {
        id: fallbackId,
        label: value.trim(),
        description: "",
        nextSceneId: "",
        emotionalHook: "",
        visibleHint: "",
        hiddenConsequence: "",
        outcomeTag: "",
        scoreEffects: normalizeScores({}),
        setsFlags: [],
        requiresClueIds: [],
      };
    }
    const source = value && typeof value === "object" ? value : {};
    return {
      id: String(source.id || fallbackId),
      label: String(source.label || source.title || "").trim(),
      description: String(source.description || "").trim(),
      nextSceneId: String(source.nextSceneId || "").trim(),
      emotionalHook: String(source.emotionalHook || "").trim(),
      visibleHint: String(source.visibleHint || "").trim(),
      hiddenConsequence: String(source.hiddenConsequence || "").trim(),
      outcomeTag: String(source.outcomeTag || "").trim(),
      scoreEffects: normalizeScores(source.scoreEffects),
      setsFlags: uniqueStrings(source.setsFlags),
      requiresClueIds: uniqueStrings(source.requiresClueIds),
    };
  }

  function applyChoice(runState, decision, choice) {
    const state = normalizeRunState(runState, decision?.sceneId);
    const normalized = normalizeChoice(choice, `${safeId(decision?.id)}-choice`);
    SCORE_KEYS.forEach((key) => {
      state.scores[key] = clampScore(state.scores[key] + normalized.scoreEffects[key]);
    });
    normalized.setsFlags.forEach((flag) => { state.flags[flag] = true; });
    state.chosenChoices.push({
      decisionId: String(decision?.id || ""),
      choiceId: normalized.id,
      outcomeTag: normalized.outcomeTag,
    });
    state.currentSceneId = normalized.nextSceneId || state.currentSceneId;
    state.currentBeatIndex = 0;
    state.playerState = "transitioning";
    return state;
  }

  function discoverClues(runState, clues, sceneId) {
    const state = normalizeRunState(runState, sceneId);
    const found = (Array.isArray(clues) ? clues : [])
      .filter((clue) => clue?.introducedInSceneId === sceneId)
      .map((clue) => String(clue.id || ""))
      .filter(Boolean);
    state.discoveredClues = uniqueStrings([...state.discoveredClues, ...found]);
    return state;
  }

  function availableChoices(decision, runState) {
    const state = normalizeRunState(runState);
    return (decision?.choices || []).filter((choice) =>
      (choice.requiresClueIds || []).every((id) => state.discoveredClues.includes(id)),
    );
  }

  function resolveEnding(rules, runState, finalChoice = null) {
    const state = normalizeRunState(runState);
    const outcomeTags = new Set(state.chosenChoices.map((choice) => choice.outcomeTag).filter(Boolean));
    if (finalChoice?.outcomeTag) outcomeTags.add(finalChoice.outcomeTag);
    const candidates = (Array.isArray(rules) ? rules : []).map((rule, index) => ({
      rule,
      index,
      score: endingRuleScore(rule, state, outcomeTags),
      eligible: endingRuleEligible(rule, state),
    })).filter((item) => item.eligible);
    candidates.sort((a, b) => b.score - a.score || a.index - b.index);
    return candidates[0]?.rule || (Array.isArray(rules) ? rules[0] : null) || null;
  }

  function endingRuleEligible(rule, state) {
    return Object.entries(rule?.minimumScores || {}).every(([key, value]) => Number(state.scores[key] || 0) >= Number(value || 0))
      && (rule?.requiredFlags || []).every((flag) => state.flags[flag])
      && (rule?.requiredClueIds || []).every((id) => state.discoveredClues.includes(id));
  }

  function endingRuleScore(rule, state, outcomeTags) {
    let score = 0;
    Object.entries(rule?.minimumScores || {}).forEach(([key, value]) => {
      score += Math.min(Number(state.scores[key] || 0), Number(value || 0));
    });
    score += (rule?.requiredFlags || []).filter((flag) => state.flags[flag]).length * 4;
    score += (rule?.requiredClueIds || []).filter((id) => state.discoveredClues.includes(id)).length * 4;
    score += (rule?.preferredOutcomeTags || []).filter((tag) => outcomeTags.has(tag)).length * 6;
    return score;
  }

  function buildDecisionVisualPrompt(decision, heroName = "the hero") {
    const clue = decision?.clueReferences?.length
      ? "Keep the relevant clue object clearly visible but subtle in the composition."
      : "Make the physical dilemma immediately readable without symbolic abstraction.";
    return [
      `Cinematic decision moment featuring ${heroName}.`,
      "Use a POV or close-up confrontation angle, dramatic directional lighting, readable emotional expressions, and a visible dilemma between distinct actions or paths.",
      clue,
      decision?.visualPrompt || decision?.setupText || decision?.questionText || "",
      "No text, labels, interface elements, split-screen panels, or hidden consequences in the artwork.",
    ].filter(Boolean).join(" ");
  }

  function deterministicFallbackPlan(sceneIds = []) {
    const ids = sceneIds.filter(Boolean);
    const at = (ratio) => ids[Math.min(ids.length - 1, Math.max(0, Math.floor((ids.length - 1) * ratio)))] || "";
    const decisions = [
      mockDecision("decision-trust", at(.3), "trust_choice", at(.4), at(.45), "Who has earned the hero's trust?"),
      mockDecision("decision-courage", at(.62), "courage_choice", at(.72), at(.76), "Which risk is worth taking now?"),
      mockDecision("decision-fate", at(.84), "final_fate_choice", at(.92), at(.95), "What should the hero protect in the final moment?", true),
    ];
    return {
      centralMystery: "A trusted account of the danger does not match the evidence found along the journey.",
      heroEmotionalFlaw: "The hero tries to carry every responsibility alone.",
      clues: decisions.slice(0, 3).map((decision, index) => ({
        id: `clue-${index + 1}`,
        introducedInSceneId: at(.12 + index * .22),
        clueText: ["A witness remembers one detail differently.", "A familiar mark appears where it should not.", "An ally knows something they were never told."][index],
        visualObject: ["damaged map", "matching insignia", "sealed message"][index],
        linkedDecisionId: decision.id,
        helpsChoiceId: decision.choices[0].id,
        subtlety: "subtle",
      })),
      decisions,
      endingRules: [
        { id: "ending-heroic", endingType: "heroic_ending", sceneId: ids.at(-1) || "", minimumScores: { courage: 2 }, requiredFlags: [], requiredClueIds: [], preferredOutcomeTags: ["brave"] },
        { id: "ending-wise", endingType: "wise_ending", sceneId: ids.at(-1) || "", minimumScores: { wisdom: 2 }, requiredFlags: [], requiredClueIds: [], preferredOutcomeTags: ["wise"] },
        { id: "ending-friendship", endingType: "friendship_ending", sceneId: ids.at(-1) || "", minimumScores: { trust: 1, loyalty: 1 }, requiredFlags: [], requiredClueIds: [], preferredOutcomeTags: ["loyal"] },
      ],
    };
  }

  function mockDecision(id, sceneId, type, firstNext, secondNext, question, final = false) {
    return normalizeDecisionNode({
      id,
      sceneId,
      title: final ? "The Final Choice" : "The Story Turns",
      setupText: "The danger closes in, and every available action carries a real cost.",
      questionText: question,
      decisionType: type,
      emotionalTone: "urgent",
      consequenceMode: final ? "ending" : "branch_and_converge",
      clueReferences: [],
      choices: [
        { id: `${id}-a`, label: "Act on the evidence", description: "Trust what the clues reveal.", nextSceneId: firstNext, emotionalHook: "Take responsibility", visibleHint: "A careful path", hiddenConsequence: "Raises wisdom and trust.", outcomeTag: "wise", scoreEffects: { wisdom: 2, trust: 1 }, setsFlags: [`${id}-evidence`] },
        { id: `${id}-b`, label: "Take the dangerous route", description: "Move before the opportunity disappears.", nextSceneId: secondNext, emotionalHook: "Risk everything", visibleHint: "A bold path", hiddenConsequence: "Raises courage and danger.", outcomeTag: "brave", scoreEffects: { courage: 2, danger: 1 }, setsFlags: [`${id}-bold`] },
      ],
    }, sceneId);
  }

  function normalizeScores(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(SCORE_KEYS.map((key) => [key, clampScore(Number(source[key] || 0))]));
  }

  function normalizeFlags(value) {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([key]) => [String(key), true]));
  }

  function uniqueStrings(value) {
    return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function clampScore(value) {
    return Math.max(-20, Math.min(20, Number.isFinite(value) ? value : 0));
  }

  function safeId(value) {
    return String(value || "story").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "story";
  }

  return {
    SCORE_KEYS,
    PLAYER_STATES,
    DECISION_TYPES,
    createRunState,
    normalizeRunState,
    normalizeDecisionNode,
    normalizeChoice,
    applyChoice,
    discoverClues,
    availableChoices,
    resolveEnding,
    buildDecisionVisualPrompt,
    deterministicFallbackPlan,
  };
});
