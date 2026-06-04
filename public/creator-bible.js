(function () {
  "use strict";

  const PROJECT_KEY = "oprealm_storyboard_project_v1";
  const BIBLE_KEY = "oprealm_creator_bible_v1";
  const EXPORT_MANIFEST_KEY = "oprealm_export_manifest_v1";
  const REALMBEASTS_KEY = "oprealm_realmbeasts_config_v1";

  const FALLBACK_WORLD = {
    id: "world-default",
    name: "Surprise Magical Realm",
    description:
      "A bright, kid-friendly realm with a central hero platform, glowing portals, floating islands, hidden paths and soft magical light.",
    style: "cinematic 3D fantasy",
    mood: ["magical", "adventurous", "safe"],
    imageUrl: "/assets/character-creator/environments/magic-portal-studio.png"
  };

  const STORY_BEATS = [
    { title: "The Spark", purpose: "intro", mood: "wonder", camera: "wide shot" },
    { title: "The First Discovery", purpose: "chapter", mood: "curious", camera: "medium shot" },
    { title: "The Big Choice", purpose: "chapter", mood: "brave", camera: "over-the-shoulder" },
    { title: "The Challenge", purpose: "rising action", mood: "action", camera: "low angle" },
    { title: "The Climax", purpose: "climax", mood: "epic", camera: "dramatic wide" },
    { title: "The Lesson", purpose: "ending", mood: "hopeful", camera: "warm close-up" }
  ];

  function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, " ");
  }

  function cleanText(value, fallback, maxLength) {
    const text = stripHtml(value)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const safe = text || fallback || "";
    return safe.length > maxLength ? safe.slice(0, maxLength).trim() : safe;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeId(prefix, seed) {
    const base = cleanText(seed || Math.random().toString(36).slice(2), "item", 48)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${prefix}-${base || Date.now()}`;
  }

  function hashText(value) {
    const text = cleanText(value, "", 1000);
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function readProject() {
    return readJson(PROJECT_KEY, {});
  }

  function deriveAgeBand(project) {
    const character = asArray(project.characters)[0] || {};
    const age = Number(character.age || character.characterAge || 10);
    if (age <= 9) return "6-9";
    if (age <= 12) return "10-12";
    return "13-16";
  }

  function buildWorld(project) {
    const active = asArray(project.worlds).find((world) => world.id === project.activeWorldId);
    const world = active || asArray(project.worlds)[0] || FALLBACK_WORLD;
    const description = cleanText(world.description || world.prompt || world.hook, FALLBACK_WORLD.description, 900);
    const moods = asArray(world.mood || world.moods)
      .map((mood) => cleanText(mood, "", 32))
      .filter(Boolean);

    return {
      id: cleanText(world.id, safeId("world", world.name), 80),
      name: cleanText(world.name, FALLBACK_WORLD.name, 80),
      theme: cleanText(world.type || world.theme || "custom realm", "custom realm", 60),
      biome: cleanText(world.biome || inferBiome(description), "fantasy", 60),
      mood: moods.length ? moods : inferMoods(description),
      timeOfDay: cleanText(world.timeOfDay, "golden cinematic light", 60),
      visualKeywords: keywordList(description, 12),
      dangerLevel: inferDangerLevel(description),
      imageUrl: cleanText(world.imageUrl, FALLBACK_WORLD.imageUrl, 260),
      locations: [
        {
          id: "location-main-platform",
          name: "Central Hero Platform",
          description: cleanText(
            world.platformDescription,
            "A clear circular stage in the foreground where characters can stand, surrounded by reusable environmental landmarks.",
            260
          )
        },
        {
          id: "location-feature",
          name: cleanText(world.landmark || "Main Landmark", "Main Landmark", 80),
          description
        }
      ]
    };
  }

  function buildCharacters(project) {
    const records = asArray(project.characters).filter(Boolean);
    if (!records.length) {
      return [
        {
          id: "character-hero",
          name: "Hero",
          role: "main hero",
          species: "human",
          personality: ["brave", "curious", "kind"],
          powers: ["imagination spark"],
          weaknesses: ["needs friends to solve the biggest problems"],
          appearance: "A kid-friendly adventurer with expressive eyes, a readable silhouette and a consistent outfit.",
          outfit: "adventure outfit",
          accessories: [],
          voice: "young adventurer",
          imageUrl: ""
        }
      ];
    }

    return records.map((character, index) => {
      const traits = asArray(character.traits || character.personality)
        .map((trait) => cleanText(trait, "", 40))
        .filter(Boolean);
      const components = character.components || {};
      const accessories = asArray(character.accessories || components.accessories)
        .map((item) => cleanText(item.name || item, "", 50))
        .filter(Boolean);

      return {
        id: cleanText(character.id, safeId("character", character.name || index), 80),
        name: cleanText(character.name, index === 0 ? "Hero" : `Hero ${index + 1}`, 60),
        role: cleanText(character.role || (index === 0 ? "main hero" : "companion"), "main hero", 80),
        species: cleanText(character.species || character.type, "human", 60),
        personality: traits.length ? traits : ["brave", "curious"],
        powers: asArray(character.powers).map((power) => cleanText(power, "", 60)).filter(Boolean),
        weaknesses: asArray(character.weaknesses).map((weakness) => cleanText(weakness, "", 80)).filter(Boolean),
        appearance: cleanText(character.description || character.prompt || character.appearance, "Kid-friendly original character.", 900),
        outfit: cleanText(character.outfit || components.outfit || components.customOutfit, "custom outfit", 180),
        accessories,
        voice: cleanText(character.voice || character.voicePreview, "young adventurer", 80),
        imageUrl: cleanText(character.imageUrl || character.generatedImageUrl, "", 260),
        style: cleanText(character.style || character.masterStyle, "", 80),
        consistencyLocked: character.consistencyLocked !== false
      };
    });
  }

  function buildObjects(project) {
    return asArray(project.objects)
      .filter(Boolean)
      .map((object, index) => ({
        id: cleanText(object.id, safeId("object", object.name || index), 80),
        name: cleanText(object.name, `Object ${index + 1}`, 60),
        kind: cleanText(object.kind || "prop", "prop", 40),
        description: cleanText(object.description || object.prompt, "Reusable story prop.", 360),
        imageUrl: cleanText(object.imageUrl, "", 260),
        consistencyLocked: object.consistencyLocked !== false
      }));
  }

  function buildScenes(project, world, characters, objects) {
    const sourceScenes = asArray(project.scenes).filter(Boolean);
    const heroName = characters[0] ? characters[0].name : "the hero";
    const pet = objects.find((object) => object.kind === "pet");
    const petText = pet ? ` and ${pet.name}` : "";

    if (!sourceScenes.length) {
      return STORY_BEATS.map((beat, index) => ({
        id: `scene-${index + 1}`,
        order: index + 1,
        title: index === 0 ? `${heroName} enters ${world.name}` : beat.title,
        purpose: beat.purpose,
        locationId: world.locations[0].id,
        charactersPresent: characters.map((character) => character.id),
        objectsPresent: objects.slice(0, 3).map((object) => object.id),
        action: defaultSceneAction(beat, heroName, petText, world),
        dialogue: "",
        choiceOptions: defaultChoices(beat, heroName),
        cameraDirection: beat.camera,
        mood: beat.mood,
        visualPrompt: defaultVisualPrompt(beat, heroName, petText, world, characters),
        generatedImageUrl: "",
        status: "draft"
      }));
    }

    const normalized = sourceScenes.map((scene, index) => {
      const beat = STORY_BEATS[Math.min(index, STORY_BEATS.length - 1)];
      const title = cleanText(scene.title, index === 0 ? `${heroName} enters ${world.name}` : beat.title, 90);
      const prompt = cleanText(scene.prompt || scene.action || scene.description, defaultSceneAction(beat, heroName, petText, world), 900);
      return {
        id: cleanText(scene.id, `scene-${index + 1}`, 80),
        order: Number(scene.order || index + 1),
        title,
        purpose: cleanText(scene.purpose, beat.purpose, 40),
        locationId: cleanText(scene.selectedWorldId || scene.locationId, world.locations[0].id, 80),
        charactersPresent: asArray(scene.selectedCharacterIds).length
          ? asArray(scene.selectedCharacterIds)
          : characters.map((character) => character.id),
        objectsPresent: asArray(scene.selectedObjectIds).length
          ? asArray(scene.selectedObjectIds)
          : objects.slice(0, 3).map((object) => object.id),
        action: prompt,
        dialogue: cleanText(scene.dialogue, "", 360),
        choiceOptions: asArray(scene.choiceOptions).length ? scene.choiceOptions : defaultChoices(beat, heroName),
        cameraDirection: cleanText(scene.cameraAngle || scene.cameraDirection, beat.camera, 80),
        mood: cleanText(scene.mood, beat.mood, 60),
        visualPrompt: cleanText(scene.visualPrompt, defaultVisualPrompt(beat, heroName, petText, world, characters, prompt), 1200),
        generatedImageUrl: cleanText(scene.generatedImageUrl || scene.imageUrl, "", 260),
        status: cleanText(scene.status, scene.generatedImageUrl ? "complete" : "draft", 30)
      };
    });

    while (normalized.length < STORY_BEATS.length) {
      const beat = STORY_BEATS[normalized.length];
      normalized.push({
        id: `scene-${normalized.length + 1}`,
        order: normalized.length + 1,
        title: beat.title,
        purpose: beat.purpose,
        locationId: world.locations[0].id,
        charactersPresent: characters.map((character) => character.id),
        objectsPresent: objects.slice(0, 3).map((object) => object.id),
        action: defaultSceneAction(beat, heroName, petText, world),
        dialogue: "",
        choiceOptions: defaultChoices(beat, heroName),
        cameraDirection: beat.camera,
        mood: beat.mood,
        visualPrompt: defaultVisualPrompt(beat, heroName, petText, world, characters),
        generatedImageUrl: "",
        status: "draft"
      });
    }

    return normalized.sort((a, b) => a.order - b.order);
  }

  function buildStory(project, scenes, world, characters) {
    const hero = characters[0] || { name: "the hero" };
    const premise = cleanText(
      project.premise || project.idea || project.sparkIdea,
      `${hero.name} discovers that ${world.name} needs courage, teamwork and imagination to become safe again.`,
      700
    );
    return {
      premise,
      goal: cleanText(project.goal, `Help ${world.name} while learning that creativity works best with kindness.`, 260),
      conflict: cleanText(project.conflict, "A mysterious challenge blocks the path forward.", 260),
      lesson: cleanText(project.lesson, "Bravery matters most when it protects friends and helps others.", 220),
      genre: cleanText(project.genre, inferGenre(world, scenes), 80),
      tone: cleanText(project.tone, "adventurous, funny, safe and cinematic", 100),
      endingStyle: cleanText(project.endingStyle, "satisfying hopeful ending", 80),
      sceneCount: scenes.length
    };
  }

  function compileCreatorBible(projectOrOptions, maybeOptions) {
    const project = projectOrOptions && (projectOrOptions.characters || projectOrOptions.worlds || projectOrOptions.scenes)
      ? projectOrOptions
      : readProject();
    const options = projectOrOptions && !(projectOrOptions.characters || projectOrOptions.worlds || projectOrOptions.scenes)
      ? projectOrOptions || {}
      : maybeOptions || {};
    const world = buildWorld(project);
    const characters = buildCharacters(project);
    const objects = buildObjects(project);
    const scenes = buildScenes(project, world, characters, objects);
    const story = buildStory(project, scenes, world, characters);
    const globalStyle = cleanText(project.globalStyle || characters[0].style || "premium kid-friendly cinematic 3D", "premium kid-friendly cinematic 3D", 120);
    const selectedOutcome = cleanText(options.outcome || project.selectedOutcome || "realm_beasts", "realm_beasts", 60);

    const bible = {
      schemaVersion: "1.0",
      id: cleanText(project.bibleId, safeId("bible", `${story.premise}-${world.name}`), 100),
      userId: cleanText(project.userId || project.webUserId, "local_creator", 80),
      projectName: cleanText(project.title || project.projectName || story.premise, `${world.name} Adventure`, 90),
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ageBand: cleanText(project.ageBand || deriveAgeBand(project), "10-12", 20),
      safetyRating: null,
      world,
      characters,
      objects,
      story,
      scenes,
      style: {
        masterStyle: globalStyle,
        colorPalette: keywordList([world.name, world.description, globalStyle].join(" "), 8),
        consistencyRules: [
          "Keep character faces, outfits, colours and proportions consistent.",
          "Keep the world landmarks, central platform and lighting logic consistent.",
          "Keep props and pets recognizable across scenes and game exports."
        ]
      },
      selectedOutcome,
      generationSettings: {
        visibility: "private_until_parent_or_admin_review",
        moderationRequired: true,
        outputQuality: "premium",
        interactionRequiredAfterBible: "test_before_publish_only"
      },
      exportManifest: null
    };

    bible.safetyRating = runSafetyChecks(bible);
    bible.exportManifest = generateOutcomeManifest(bible, selectedOutcome);
    return bible;
  }

  function runSafetyChecks(bible) {
    const text = [
      bible.projectName,
      bible.world.description,
      bible.story.premise,
      bible.story.conflict,
      ...bible.characters.map((character) => character.appearance),
      ...bible.scenes.map((scene) => scene.action)
    ].join(" ").toLowerCase();
    const blocked = ["blood", "gore", "self-harm", "sexual", "drugs", "hate"];
    const warnings = blocked.filter((term) => text.includes(term));
    return {
      status: warnings.length ? "needs_review" : "approved_for_private_generation",
      ageBand: bible.ageBand,
      warnings,
      publicSharing: "requires_review",
      directMessaging: "disabled",
      notes: warnings.length
        ? "Potentially sensitive terms were found. Keep the project private until reviewed."
        : "No obvious safety flags found in the local Creator Bible compiler."
    };
  }

  function generateOutcomeManifest(bible, outcome) {
    const normalized = cleanText(outcome, "realm_beasts", 60);
    const supported = {
      realm_beasts: "playable_prototype",
      realm_stories: "ready_for_story_player",
      realm_survivors: "design_ready",
      realm_cards: "design_ready",
      realm_pets: "design_ready",
      realm_defense: "planned",
      realm_racers: "planned",
      realm_builders: "planned",
      realm_quest: "planned",
      realm_party: "blocked_until_multiplayer_safety"
    };
    return {
      id: safeId("manifest", `${bible.id}-${normalized}`),
      outcome: normalized,
      status: supported[normalized] || "design_ready",
      generatedAt: new Date().toISOString(),
      requiredAssets: [
        "hero character portrait",
        "world background",
        "primary creature or companion",
        "six story beat scene prompts",
        "safe publish thumbnail"
      ],
      safety: bible.safetyRating.status,
      testBeforePublish: [
        "Open generated game preview.",
        "Check all images are child-safe.",
        "Confirm the first play loop works.",
        "Submit to library review queue."
      ]
    };
  }

  function generateRealmBeastsConfig(bible) {
    const hero = bible.characters[0] || {};
    const pet = bible.objects.find((object) => object.kind === "pet") || bible.objects[0];
    const seed = hashText(`${bible.projectName}-${hero.name}-${bible.world.name}-${bible.story.premise}`);
    const element = inferElement(bible.world, hero, pet);
    const rarity = inferRarity(seed, bible.characters.length, bible.objects.length);
    const beastName = cleanText(
      pet && pet.kind === "pet" ? pet.name : `${hero.name || "Hero"}'s RealmBeast`,
      "Sparkfang",
      60
    );

    return {
      schemaVersion: "1.0",
      bibleId: bible.id,
      title: `${beastName}: ${bible.world.name}`,
      mode: "realm_beasts",
      status: "local_playable_prototype",
      creator: {
        heroName: cleanText(hero.name, "Hero", 60),
        ageBand: bible.ageBand,
        style: bible.style.masterStyle
      },
      beast: {
        id: safeId("beast", beastName),
        name: beastName,
        rarity,
        elements: element,
        personality: asArray(hero.personality).slice(0, 4),
        appearancePrompt: cleanText(
          pet ? pet.description : `${beastName} is inspired by ${hero.name}, ${bible.world.name} and the project's magical visual style.`,
          "A friendly original creature with readable shape language and glowing powers.",
          700
        ),
        stats: statsFromSeed(seed),
        abilities: beastAbilities(element, hero, bible.world),
        evolutionTree: [
          { level: 1, name: beastName, form: "Hatchling" },
          { level: 12, name: `${beastName} Prime`, form: "Evolved" },
          { level: 25, name: `${beastName} Legend`, form: "Legendary" }
        ],
        artAssetUrl: pet && pet.imageUrl ? pet.imageUrl : hero.imageUrl || bible.world.imageUrl
      },
      arena: {
        id: safeId("arena", bible.world.name),
        name: `${bible.world.name} Battle Arena`,
        backgroundAssetUrl: bible.world.imageUrl,
        description: bible.world.description,
        hazards: arenaHazards(bible.world),
        rewards: ["RealmDex entry", "creator points", "evolution spark"]
      },
      battleRules: {
        mode: "auto",
        winCondition: "reduce_enemy_hp",
        maxTurns: 8,
        childControls: ["cheer", "power boost", "defend"],
        safety: "no gore, no realistic injury, fantasy impact effects only"
      },
      realmDexCard: {
        title: beastName,
        subtitle: `${rarity} ${element.join(" / ")} RealmBeast`,
        shareStatus: "private_until_review",
        lore: `${beastName} was born from ${hero.name || "a hero"}'s imagination in ${bible.world.name}.`
      },
      exportManifest: generateOutcomeManifest(bible, "realm_beasts")
    };
  }

  function saveBible(bible) {
    return writeJson(BIBLE_KEY, bible || compileCreatorBible());
  }

  function saveRealmBeastsConfig(config) {
    return writeJson(REALMBEASTS_KEY, config);
  }

  function keywordList(text, limit) {
    const ignore = new Set(["the", "and", "with", "that", "this", "from", "into", "your", "their", "where", "when", "safe", "story"]);
    const words = cleanText(text, "", 1000)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !ignore.has(word));
    return Array.from(new Set(words)).slice(0, limit);
  }

  function inferBiome(text) {
    const source = text.toLowerCase();
    if (source.includes("lava") || source.includes("volcano")) return "volcanic";
    if (source.includes("ocean") || source.includes("underwater")) return "ocean";
    if (source.includes("forest") || source.includes("jungle")) return "forest";
    if (source.includes("space") || source.includes("planet")) return "space";
    if (source.includes("city") || source.includes("cyber")) return "cyber city";
    return "fantasy realm";
  }

  function inferMoods(text) {
    const source = text.toLowerCase();
    const moods = [];
    if (source.includes("funny")) moods.push("funny");
    if (source.includes("mystery") || source.includes("secret")) moods.push("mysterious");
    if (source.includes("epic") || source.includes("battle")) moods.push("epic");
    if (source.includes("cozy") || source.includes("cute")) moods.push("cozy");
    if (source.includes("scary") || source.includes("shadow")) moods.push("spooky-safe");
    return moods.length ? moods : ["magical", "adventurous"];
  }

  function inferDangerLevel(text) {
    const source = text.toLowerCase();
    if (source.includes("lava") || source.includes("boss") || source.includes("survival")) return "medium fantasy danger";
    if (source.includes("cozy") || source.includes("cute")) return "low";
    return "light adventure";
  }

  function inferGenre(world, scenes) {
    const text = `${world.description} ${scenes.map((scene) => scene.action).join(" ")}`.toLowerCase();
    if (text.includes("mystery") || text.includes("clue")) return "mystery adventure";
    if (text.includes("space") || text.includes("robot")) return "sci-fi adventure";
    if (text.includes("dragon") || text.includes("magic")) return "fantasy adventure";
    return "adventure";
  }

  function inferElement(world, hero, pet) {
    const source = `${world.name} ${world.description} ${hero.appearance || ""} ${pet ? pet.description : ""}`.toLowerCase();
    if (source.includes("lava") || source.includes("fire") || source.includes("volcano")) return ["fire"];
    if (source.includes("ocean") || source.includes("water") || source.includes("underwater")) return ["water"];
    if (source.includes("forest") || source.includes("jungle") || source.includes("nature")) return ["nature"];
    if (source.includes("space") || source.includes("robot") || source.includes("electric")) return ["electric"];
    if (source.includes("shadow") || source.includes("mystery")) return ["shadow"];
    return ["arcane"];
  }

  function inferRarity(seed, characterCount, objectCount) {
    const score = (seed % 100) + characterCount * 4 + objectCount * 3;
    if (score > 105) return "mythic";
    if (score > 82) return "legendary";
    if (score > 58) return "epic";
    if (score > 35) return "rare";
    return "common";
  }

  function statsFromSeed(seed) {
    return {
      attack: 58 + (seed % 33),
      defense: 54 + ((seed >> 3) % 35),
      speed: 50 + ((seed >> 5) % 38),
      magic: 60 + ((seed >> 7) % 35)
    };
  }

  function beastAbilities(elements, hero, world) {
    const element = elements[0] || "arcane";
    const trait = asArray(hero.personality)[0] || "brave";
    const worldKeyword = keywordList(world.description, 1)[0] || "realm";
    return [
      `${titleCase(element)} Spark`,
      `${titleCase(trait)} Guard`,
      `${titleCase(worldKeyword)} Burst`
    ];
  }

  function arenaHazards(world) {
    const biome = world.biome.toLowerCase();
    if (biome.includes("volcanic")) return ["glowing lava cracks", "floating ember stones"];
    if (biome.includes("ocean")) return ["bubble currents", "swirling whirlpools"];
    if (biome.includes("forest")) return ["vine gates", "glowing mushroom pads"];
    if (biome.includes("space")) return ["low-gravity jumps", "meteor spark trails"];
    return ["portal pulses", "crystal light beams"];
  }

  function defaultSceneAction(beat, heroName, petText, world) {
    const templates = {
      intro: `${heroName}${petText} arrives on the central platform of ${world.name} and notices the first magical sign that something needs help.`,
      chapter: `${heroName}${petText} discovers a clue that reveals the heart of the adventure and points toward a bigger choice.`,
      "rising action": `${heroName}${petText} faces a playful but exciting challenge that tests courage, kindness and imagination.`,
      climax: `${heroName}${petText} makes the brave choice that saves the realm and changes the story's direction.`,
      ending: `${heroName}${petText} shares what they learned, helps the realm glow again and unlocks a hopeful ending.`
    };
    return templates[beat.purpose] || templates.chapter;
  }

  function defaultChoices(beat, heroName) {
    if (beat.purpose === "ending") return ["Celebrate with friends", "Share the lesson"];
    if (beat.purpose === "climax") return ["Be brave", "Protect the team"];
    return [`Follow ${heroName}'s idea`, "Look for another clue"];
  }

  function defaultVisualPrompt(beat, heroName, petText, world, characters, action) {
    const characterStyle = characters[0] && characters[0].style ? characters[0].style : "kid-friendly cinematic 3D";
    return cleanText(
      `${action || defaultSceneAction(beat, heroName, petText, world)} Use ${characterStyle}. Show ${heroName}${petText} clearly on a central platform inside ${world.name}. Keep the same character outfit, colours, facial features and proportions. Preserve the world's landmarks and mood: ${world.description}`,
      "",
      1200
    );
  }

  function titleCase(value) {
    return cleanText(value, "", 40).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  window.OPREALMCreatorBible = {
    PROJECT_KEY,
    BIBLE_KEY,
    EXPORT_MANIFEST_KEY,
    REALMBEASTS_KEY,
    readProject,
    compileCreatorBible,
    saveBible,
    runSafetyChecks,
    generateOutcomeManifest,
    generateRealmBeastsConfig,
    saveRealmBeastsConfig
  };
})();
