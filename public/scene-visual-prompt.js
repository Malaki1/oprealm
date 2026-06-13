(function initSceneVisualPrompt(globalScope) {
  "use strict";

  /**
   * @typedef {Object} ContinuityBible
   * @property {string} heroVisualDescription
   * @property {string[]} supportingCharacterDescriptions
   * @property {string} worldVisualDescription
   * @property {string} styleGuide
   * @property {string[]} bannedChanges
   * @property {string[]} recurringObjects
   * @property {string} eraAndGenre
   */

  /**
   * @typedef {Object} SceneVisualPromptInput
   * @property {string} storyTitle
   * @property {Object} world
   * @property {Object[]} characters
   * @property {string} approvedFullStory
   * @property {Object} scene
   * @property {number} sceneIndex
   * @property {string} ageBand
   * @property {string} visualStyle
   * @property {ContinuityBible} continuityBible
   */

  const GENERIC_REPLACEMENTS = [
    [/\bthe hero\b/gi, ""],
    [/\bthe story world\b/gi, ""],
    [/\bfirst landmark\b/gi, "the nearest named structure"],
    [/\bmysterious clue\b/gi, "the visible evidence described in the scene"],
    [/\bstrange obstacle\b/gi, "the physical danger described in the scene"],
    [/\bnew part of (?:the )?story world\b/gi, "the scene's named location"],
  ];

  function clean(value, fallback = "") {
    const text = String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text || fallback;
  }

  function list(value) {
    return (Array.isArray(value) ? value : [])
      .map((item) => clean(item))
      .filter(Boolean);
  }

  function sentence(value) {
    const text = clean(value);
    if (!text) return "";
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  function truncateWords(value, maxWords) {
    const words = clean(value).split(" ").filter(Boolean);
    return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}...` : words.join(" ");
  }

  function stripGeneric(value, heroName, worldName) {
    let text = clean(value);
    GENERIC_REPLACEMENTS.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    text = text
      .replace(/\bthe protagonist\b/gi, heroName)
      .replace(/\bthe main character\b/gi, heroName)
      .replace(/\btheir\b/gi, `${heroName}'s`)
      .replace(/\bthey\b/gi, heroName)
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (worldName) {
      text = text.replace(/\bthe world\b/gi, worldName);
    }
    return text;
  }

  function firstSentences(value, count = 2) {
    const parts = clean(value).match(/[^.!?]+[.!?]?/g) || [];
    return parts.slice(0, count).map((part) => clean(part)).filter(Boolean).join(" ");
  }

  function characterDescription(character = {}) {
    const recipe = character.recipe || {};
    const identity = recipe.identity || {};
    const components = recipe.components || {};
    const visual = recipe.visual || {};
    const name = clean(character.name || identity.name, "OPREALM protagonist");
    const age = clean(character.characterAge || identity.characterAge || character.ageGroup, "young");
    const role = clean(character.characterType || identity.characterType || character.type, "adventurer");
    const appearance = clean(character.prompt || character.description || character.tagline, "distinctive child-friendly features");
    const outfit = clean(character.customOutfit || character.outfit || components.customOutfit || components.outfit, "the approved saved outfit");
    const accessories = list(character.accessories || components.accessories).filter((item) => item !== "None");
    const palette = list(character.palette || visual.palette);
    return `${name}, ${age}-year-old ${role}; ${appearance}; wearing ${outfit}${accessories.length ? ` with ${accessories.join(", ")}` : ""}${palette.length ? ` in the locked ${palette.join(", ")} palette` : ""}`;
  }

  function worldDescription(world = {}) {
    const name = clean(world.name, "the selected OPREALM location");
    const description = clean(world.description || world.prompt || world.hook, "a detailed child-friendly adventure environment");
    const style = list(world.styleNotes).join("; ");
    const mood = list(world.mood).join(", ");
    return `${name}: ${description}${style ? `; ${style}` : ""}${mood ? `; atmosphere ${mood}` : ""}`;
  }

  /**
   * @param {Object} input
   * @returns {ContinuityBible}
   */
  function createContinuityBible(input = {}) {
    const characters = Array.isArray(input.characters) ? input.characters : [];
    const hero = characters[0] || {};
    const objects = list(input.objects).concat(list(input.recurringObjects));
    const visualStyle = clean(
      input.visualStyle
        || hero.masterStyle
        || hero.style
        || input.world?.visualStyle
        || input.world?.theme,
      "premium cinematic kids story-game art",
    );
    return {
      heroVisualDescription: characterDescription(hero),
      supportingCharacterDescriptions: characters.slice(1).map(characterDescription),
      worldVisualDescription: worldDescription(input.world || {}),
      styleGuide: `${visualStyle}; cinematic animated adventure; readable silhouettes; layered foreground, midground and background`,
      bannedChanges: [
        "Do not change faces, hair, age, body proportions, outfit construction, garment colors, accessories or signature items.",
        "Do not replace the selected world aesthetic, era, architecture, biome or lighting language.",
        "Do not add unnamed people, creatures, props, text, logos or watermarks.",
      ],
      recurringObjects: [...new Set(objects)].slice(0, 10),
      eraAndGenre: clean(input.eraAndGenre || `${input.world?.theme || ""} ${input.storyType || "adventure"}`, "child-friendly cinematic adventure"),
    };
  }

  function visibleAction(sceneText, heroName, worldName) {
    const concrete = stripGeneric(firstSentences(sceneText, 2), heroName, worldName);
    if (concrete && new RegExp(`\\b${escapeRegExp(heroName)}\\b`, "i").test(concrete)) return concrete;
    if (concrete) return `${heroName} visibly performs this story beat: ${concrete}`;
    return `${heroName} takes a clear physical action connected to the current chapter, with readable hand movement, posture and facial reaction.`;
  }

  function lightingDirection(mood, sceneText) {
    const text = `${mood} ${sceneText}`.toLowerCase();
    if (/underwater|ocean|river|sea/.test(text)) return "moving underwater shimmer, caustic reflections and drifting bubbles";
    if (/mystery|secret|night|shadow|tense/.test(text)) return "selective moonlit contrast, thin fog and narrow shafts of revealing light";
    if (/action|epic|battle|chase|escape/.test(text)) return "strong rim light, airborne dust, sparks and high-contrast directional lighting";
    if (/peace|sunset|home|gentle|emotional/.test(text)) return "warm late-day light, soft atmospheric depth and restrained glowing particles";
    if (/tech|neon|future|robot/.test(text)) return "neon reflections, pulsing practical lights and faint holographic haze";
    return "cinematic sunrise light, volumetric rays and subtle magical particles";
  }

  function namedObjects(input, sceneText) {
    const all = [
      clean(input.scene?.keyObject),
      ...list(input.continuityBible?.recurringObjects),
      ...list(input.scene?.objects),
      ...list(input.scene?.selectedObjects),
    ];
    const found = all.filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(sceneText));
    return [...new Set(found)].slice(0, 5);
  }

  function sceneTypeDirection(scene, heroName) {
    const type = clean(scene.cinematicSceneType || scene.sceneType);
    const keyObject = clean(scene.keyObject);
    const location = clean(scene.location);
    if (type === "choice_setup" || type === "final_choice") {
      return `Decision pressure: show the named person confronting ${heroName}, ${heroName}'s visible reaction, the physical stakes and two conflicting possible actions in the same composition${keyObject ? `, with ${keyObject} clearly relevant` : ""}. Use split focus, POV, close-up or over-the-shoulder tension.`;
    }
    if (type === "clue_discovery") {
      return `Clue staging: show ${keyObject || "the exact evidence named in the passage"} partially hidden where the story places it, with the named character noticing a specific detail while the background danger remains active.`;
    }
    if (type === "action_chase") {
      return "Action staging: show directional movement, reacting fabric and environment, dynamic body mechanics, foreground obstacles, debris or sparks only where supported by the passage, and a readable pursuit or escape route.";
    }
    if (type === "creature_reveal") {
      return "Creature reveal: preserve the entity's story function and distinctive silhouette, use scale contrast and show the characters reacting to what it physically does.";
    }
    if (type === "final_spectacle" || type === "world_reveal") {
      return `Spectacle staging: use huge scale and strong depth, with the characters small against ${location || "the impossible named setting"} and the central event dominating the frame without losing readable faces or action.`;
    }
    if (["trust_conflict", "betrayal_reveal", "emotional_turning_point", "darkest_moment"].includes(type)) {
      return "Character drama: prioritize expressive posture, eye lines, hands, distance between characters and the concrete action that changes their relationship; avoid symbolic filler.";
    }
    return "";
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function limitWords(value, min = 120, max = 220) {
    let words = clean(value).split(" ").filter(Boolean);
    if (words.length < min) {
      const addition = "Keep foreground, midground and background readable, preserve clear silhouettes, and make every visible detail support this exact chapter moment.";
      words = words.concat(addition.split(" "));
    }
    if (words.length > max) words = words.slice(0, max);
    return sentence(words.join(" "));
  }

  /**
   * @param {SceneVisualPromptInput} input
   * @returns {string}
   */
  function buildSceneVisualPrompt(input = {}) {
    const scene = input.scene || {};
    const bible = input.continuityBible || createContinuityBible(input);
    const characters = Array.isArray(input.characters) ? input.characters : [];
    const hero = characters[0] || {};
    const heroName = clean(hero.name || hero.recipe?.identity?.name, "OPREALM protagonist");
    const worldName = clean(input.world?.name, "the selected OPREALM location");
    const style = clean(input.visualStyle || bible.styleGuide, "premium cinematic kids story-game art style");
    const sceneText = clean(scene.userVisualDirection || scene.sourcePassage || scene.storyExcerpt || scene.passage || scene.prompt);
    const mood = clean(scene.mood, "Wonder");
    const camera = clean(scene.cameraDirection || scene.camera, "Wide Shot");
    const action = visibleAction(sceneText, heroName, worldName);
    const objects = namedObjects(input, sceneText);
    const presentNames = list(scene.charactersPresent);
    const presentSupporting = (bible.supportingCharacterDescriptions || []).filter((description) =>
      !presentNames.length || presentNames.some((name) => new RegExp(`^${escapeRegExp(name)}\\b`, "i").test(description)),
    );
    const supporting = presentSupporting.length
      ? `Named supporting characters visible in this beat: ${presentSupporting.join(" | ")}.`
      : "Do not add random extra characters; include only people or creatures explicitly named in this scene.";
    const objectDirection = objects.length
      ? `Clearly show these story-critical objects exactly where the action requires them: ${objects.join(", ")}.`
      : "Do not invent a glowing crystal, orb, clue, portal, weapon or featured prop unless the approved story explicitly names it in this beat.";
    const decision = scene.decisionNode && typeof scene.decisionNode === "object" ? scene.decisionNode : null;
    const decisionDirection = decision
      ? `Decision moment: show the physical dilemma for ${clean(decision.decisionType, "a difficult choice")} through visible action and opposing routes or actions. Relevant evidence: ${truncateWords(decision.whatPlayerKnows || decision.setupText || decision.questionText, 28)}.`
      : "";
    const lighting = lightingDirection(mood, sceneText);
    const exactLocation = clean(scene.location);
    const typeDirection = sceneTypeDirection(scene, heroName);
    const prompt = [
      `Cinematic animated adventure scene in ${style}.`,
      `Main character: ${truncateWords(bible.heroVisualDescription, 38)}. Show ${mood.toLowerCase()} through the face, hands and posture, never explanatory text.`,
      `Setting: ${exactLocation ? `${exactLocation} inside ` : ""}${truncateWords(bible.worldVisualDescription, 32)}. Scene ${Number(input.sceneIndex || 0) + 1} of "${clean(input.storyTitle, "the approved story")}"; preserve its biome, era and architecture.`,
      "Continuity lock: use the same character design as previous scenes, the same outfit unless the approved story explicitly changes it, and a consistent world aesthetic. Preserve face, hair, body proportions, outfit colors, accessories and left-right placement.",
      `Camera direction: ${camera}, cinematic composition with a clear focal action, readable faces and strong depth.`,
      `Visible action: ${truncateWords(action, 34)}`,
      typeDirection,
      `Lighting and atmosphere: ${lighting}; effects support the action rather than hide it.`,
      `Safety: suitable for ${clean(input.ageBand, "ages 7-13")}; exciting danger without graphic violence or frightening realism. No text, UI, watermarks or logos.`,
      objectDirection,
      decisionDirection,
      supporting,
    ].join(" ");
    return limitWords(prompt);
  }

  /**
   * @param {SceneVisualPromptInput} input
   * @returns {string}
   */
  function buildSceneVisualPromptSummary(input = {}) {
    const scene = input.scene || {};
    const characters = Array.isArray(input.characters) ? input.characters : [];
    const heroName = clean(characters[0]?.name || characters[0]?.recipe?.identity?.name, "OPREALM protagonist");
    const worldName = clean(input.world?.name, "the selected location");
    const action = stripGeneric(firstSentences(scene.userVisualDirection || scene.sourcePassage || scene.storyExcerpt || scene.passage || scene.prompt, 2), heroName, worldName);
    return sentence(action || `${heroName} performs the scene's central visible action in ${worldName}`);
  }

  function validateSceneVisualPrompt(prompt, input = {}) {
    const text = clean(prompt);
    const scene = input.scene || {};
    const characters = Array.isArray(input.characters) ? input.characters : [];
    const names = list(scene.charactersPresent).concat(characters.map((character) => clean(character.name)).filter(Boolean));
    const warnings = [];
    if (/\bthe hero\b|\bstory world\b/i.test(text)) warnings.push("generic placeholder");
    if (/\bmysterious clue\b/i.test(text) && !clean(scene.keyObject)) warnings.push("unnamed clue");
    if (names.length && !names.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text))) warnings.push("missing named character");
    if (!/(?:holds?|grabs?|runs?|kneels?|raises?|opens?|strikes?|pulls?|pushes?|climbs?|jumps?|turns?|points?|shields?|carries?|reaches?)/i.test(text)) warnings.push("missing visible action");
    if (!/(?:wide|close-up|close up|over-the-shoulder|over shoulder|low angle|high angle|POV|tracking|dutch angle|drone|medium shot)/i.test(text)) warnings.push("missing camera");
    if (!/(?:light|lighting|moonlit|sunset|firelight|torchlight|neon|fog|rain|glow|shadow|aurora)/i.test(text)) warnings.push("missing lighting");
    if (!/same character design as previous scenes/i.test(text) || !/same outfit unless/i.test(text) || !/same world aesthetic|consistent world aesthetic/i.test(text)) warnings.push("missing continuity lock");
    return { passed: warnings.length === 0, warnings };
  }

  const api = {
    buildSceneVisualPrompt,
    buildSceneVisualPromptSummary,
    createContinuityBible,
    validateSceneVisualPrompt,
  };

  globalScope.OPREALMSceneVisualPrompt = api;
  if (globalScope.document?.documentElement) {
    globalScope.document.documentElement.dataset.sceneVisualPromptEngine = "2";
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
