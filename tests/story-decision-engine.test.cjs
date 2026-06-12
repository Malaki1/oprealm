const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../public/story-decision-engine.js");

function decision() {
  return engine.normalizeDecisionNode({
    id: "trust-gate",
    sceneId: "scene-3",
    title: "The Gatekeeper's Claim",
    setupText: "Two allies give conflicting warnings.",
    questionText: "Who should open the gate?",
    decisionType: "trust_choice",
    emotionalTone: "tense",
    clueReferences: ["clue-seal"],
    visualPrompt: "The suspected ally hides a broken seal.",
    consequenceMode: "branch_and_converge",
    choices: [
      {
        id: "trust-maren",
        label: "Trust Maren",
        description: "Let Maren open the gate.",
        nextSceneId: "scene-4a",
        emotionalHook: "Trust an old friend",
        visibleHint: "The broken seal supports her warning.",
        hiddenConsequence: "Maren reveals the safe route.",
        outcomeTag: "wise",
        scoreEffects: { wisdom: 2, trust: 1 },
        setsFlags: ["trusted-maren"],
        requiresClueIds: ["clue-seal"],
      },
      {
        id: "force-gate",
        label: "Force the gate",
        description: "Break through before the guards arrive.",
        nextSceneId: "scene-4b",
        emotionalHook: "Act before time runs out",
        visibleHint: "Fast, but dangerous.",
        hiddenConsequence: "The alarm sounds.",
        outcomeTag: "brave",
        scoreEffects: { courage: 2, danger: 2 },
        setsFlags: ["gate-forced"],
        requiresClueIds: [],
      },
    ],
  }, "scene-3");
}

test("autoplay state can pause explicitly at a decision", () => {
  const state = engine.createRunState("scene-3");
  state.playerState = "waiting_for_choice";
  assert.equal(engine.normalizeRunState(state).playerState, "waiting_for_choice");
});

test("selecting a choice routes to the correct scene and updates scores", () => {
  const node = decision();
  let state = engine.createRunState("scene-3");
  state.discoveredClues.push("clue-seal");
  state = engine.applyChoice(state, node, node.choices[0]);
  assert.equal(state.currentSceneId, "scene-4a");
  assert.equal(state.scores.wisdom, 2);
  assert.equal(state.scores.trust, 1);
  assert.equal(state.flags["trusted-maren"], true);
});

test("clues are discovered from their introduction scene", () => {
  const clues = [{ id: "clue-seal", introducedInSceneId: "scene-2" }];
  const state = engine.discoverClues(engine.createRunState("scene-2"), clues, "scene-2");
  assert.deepEqual(state.discoveredClues, ["clue-seal"]);
});

test("choices requiring a clue stay hidden until it is discovered", () => {
  const node = decision();
  assert.deepEqual(engine.availableChoices(node, engine.createRunState()).map((choice) => choice.id), ["force-gate"]);
  const state = engine.createRunState();
  state.discoveredClues = ["clue-seal"];
  assert.equal(engine.availableChoices(node, state).length, 2);
});

test("ending rules resolve using scores, flags and outcome tags", () => {
  const state = engine.createRunState("scene-final");
  state.scores.wisdom = 3;
  state.flags["truth-revealed"] = true;
  state.chosenChoices.push({ outcomeTag: "wise" });
  const ending = engine.resolveEnding([
    { id: "heroic", minimumScores: { courage: 3 }, requiredFlags: [], requiredClueIds: [], preferredOutcomeTags: ["brave"] },
    { id: "wise", minimumScores: { wisdom: 2 }, requiredFlags: ["truth-revealed"], requiredClueIds: [], preferredOutcomeTags: ["wise"] },
  ], state);
  assert.equal(ending.id, "wise");
});

test("decision visual prompts demand cinematic dilemma language", () => {
  const prompt = engine.buildDecisionVisualPrompt(decision(), "Shark Girl");
  assert.match(prompt, /POV|close-up/i);
  assert.match(prompt, /dramatic/i);
  assert.match(prompt, /emotional/i);
  assert.match(prompt, /clue/i);
});

test("legacy runs without decisions remain valid", () => {
  const state = engine.normalizeRunState({ currentSceneId: "legacy-scene", currentBeatIndex: 2 });
  assert.equal(state.currentSceneId, "legacy-scene");
  assert.equal(state.currentBeatIndex, 2);
  assert.deepEqual(state.chosenChoices, []);
});

test("fallback produces bounded decisions and three endings", () => {
  const plan = engine.deterministicFallbackPlan(Array.from({ length: 16 }, (_, index) => `scene-${index + 1}`));
  assert.equal(plan.decisions.length, 3);
  assert.equal(plan.endingRules.length, 3);
  assert.equal(plan.clues.length, 3);
  assert.ok(plan.decisions.every((item) => item.choices.length >= 2));
});
