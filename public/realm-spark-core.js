(() => {
  const STORAGE = {
    input: "oprealm_realm_spark_original_idea_v1",
    output: "oprealm_realm_spark_output_v1",
    legacyHomePrompt: "oprealm_home_prompt",
  };

  const WORLD_LIBRARY = [
    {
      keys: ["lava", "volcano", "fire", "shark", "survival", "magma"],
      theme: "Lava planet",
      name: "Lava Survival Realm",
      type: "Survival World",
      moods: ["Epic", "Mysterious"],
      landmarks: ["Central hero platform", "Glowing portal", "Crystal towers"],
      rules: ["Choices unlock paths", "Crystals store memories"],
      visualStyle: "cinematic volcanic fantasy with neon purple crystals",
    },
    {
      keys: ["candy", "sweet", "cake", "rainbow", "cute", "lollipop"],
      theme: "Candy kingdom",
      name: "Candy Kingdom Quest",
      type: "Kingdom",
      moods: ["Magical", "Funny", "Cozy"],
      landmarks: ["Central hero platform", "Floating islands", "Secret bridge"],
      rules: ["Ideas open portals", "Choices unlock paths"],
      visualStyle: "bright pastel candy fantasy with soft toy-like detail",
    },
    {
      keys: ["dinosaur", "jungle", "rex", "prehistoric", "fossil"],
      theme: "Dinosaur jungle",
      name: "Dinosaur Jungle Realm",
      type: "Survival World",
      moods: ["Epic", "Mysterious"],
      landmarks: ["Central hero platform", "Ancient ruins", "Secret bridge"],
      rules: ["Choices unlock paths", "Crystals store memories"],
      visualStyle: "lush adventure jungle with ancient ruins and dinosaurs",
    },
    {
      keys: ["forest", "fairy", "enchanted", "magic", "tree", "crystal"],
      theme: "Enchanted forest",
      name: "Enchanted Forest Portal",
      type: "Mystery Place",
      moods: ["Magical", "Mysterious", "Cozy"],
      landmarks: ["Central hero platform", "Glowing portal", "Crystal towers"],
      rules: ["Ideas open portals", "Crystals store memories"],
      visualStyle: "glowing enchanted forest with lanterns, crystals and soft sunlight",
    },
    {
      keys: ["sky", "cloud", "island", "floating", "portal", "dragon"],
      theme: "Sky islands",
      name: "Sky Island Portal Realm",
      type: "Portal Hub",
      moods: ["Magical", "Epic"],
      landmarks: ["Central hero platform", "Floating islands", "Glowing portal"],
      rules: ["Ideas open portals", "Choices unlock paths"],
      visualStyle: "floating sky-island fantasy with portals and glowing clouds",
    },
    {
      keys: ["underwater", "ocean", "sea", "mermaid", "coral"],
      theme: "Underwater realm",
      name: "Underwater Secret Realm",
      type: "Mystery Place",
      moods: ["Magical", "Mysterious", "Cozy"],
      landmarks: ["Central hero platform", "Secret bridge", "Crystal towers"],
      rules: ["Music changes the sky", "Crystals store memories"],
      visualStyle: "safe underwater fantasy with coral temples and glowing blue light",
    },
  ];

  const FALLBACK_WORLD = {
    theme: "Magic portal studio",
    name: "Magic Portal Studio",
    type: "Portal Hub",
    moods: ["Magical", "Epic", "Mysterious"],
    landmarks: ["Central hero platform", "Glowing portal", "Floating islands"],
    rules: ["Ideas open portals", "Choices unlock paths"],
    visualStyle: "neon purple-blue portal fantasy with floating islands",
  };

  function cleanIdea(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .slice(0, 52);
  }

  function pickWorld(idea) {
    const lower = idea.toLowerCase();
    return WORLD_LIBRARY.find((world) => world.keys.some((key) => lower.includes(key))) || FALLBACK_WORLD;
  }

  function smartName(idea, picked) {
    const usefulWords = idea
      .replace(/[^a-z0-9 ]/gi, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !["make", "create", "with", "that", "where", "into", "game", "story"].includes(word.toLowerCase()))
      .slice(0, 4);
    return usefulWords.length >= 2 ? titleCase(`${usefulWords.join(" ")} Realm`) : picked.name;
  }

  function makeOutput(rawIdea) {
    const originalIdea = cleanIdea(rawIdea);
    const safeIdea = originalIdea || "A magical portal world where a brave creator discovers a new adventure.";
    const picked = pickWorld(safeIdea);
    const worldName = smartName(safeIdea, picked);
    const hook = `${worldName} turns "${safeIdea}" into a playable story world full of choices, surprises and safe adventure.`;
    const prompt = [
      `Create a kid-friendly ${picked.visualStyle} world inspired by: "${safeIdea}".`,
      `The scene needs a clear central hero platform in the foreground so characters can stand without being cropped.`,
      `Surround it with layered environmental detail, including ${picked.landmarks.join(", ").toLowerCase()}.`,
      `Mood: ${picked.moods.join(", ").toLowerCase()}.`,
      `World rules: ${picked.rules.join("; ").toLowerCase()}.`,
      "Keep the world cinematic, readable, safe for kids aged 6+, and ready to reuse across story scenes.",
    ].join(" ");

    return {
      id: `realm-spark-${Date.now()}`,
      createdAt: new Date().toISOString(),
      originalIdea: safeIdea,
      expandedIdea: hook,
      world: {
        name: worldName,
        hook: hook.slice(0, 100),
        type: picked.type,
        theme: picked.theme,
        moods: picked.moods,
        visualStyle: picked.visualStyle,
        landmarks: picked.landmarks,
        rules: picked.rules,
        memoryEnabled: true,
        prompt,
      },
      characters: [
        {
          name: "Hero Creator",
          role: "Main hero",
          traits: ["Brave", "Curious", "Resourceful"],
          visualPrompt: `A kid-friendly hero who belongs in ${worldName}, designed to match ${picked.visualStyle}.`,
        },
        {
          name: "Realm Guide",
          role: "Helper",
          traits: ["Funny", "Loyal", "Magical"],
          visualPrompt: `A small friendly guide character who helps explain the rules of ${worldName}.`,
        },
      ],
      story: {
        title: worldName,
        logline: hook,
        introScene: `The hero arrives on the central platform and sees the world created from their idea.`,
        conflict: "A strange challenge appears and the hero must choose a path.",
        climaxIdea: "The hero unlocks the biggest portal, secret or challenge in the realm.",
        endingIdea: "The world changes because of the choices the hero made.",
      },
      creativePathSuggestions: ["AI Story Game", "Story Book", "Movie Trailer", "Comic Book"],
    };
  }

  function saveSparkInput(idea) {
    const cleaned = cleanIdea(idea);
    localStorage.setItem(STORAGE.input, cleaned);
    localStorage.setItem(STORAGE.legacyHomePrompt, cleaned);
    return cleaned;
  }

  function saveSparkOutput(output) {
    localStorage.setItem(STORAGE.output, JSON.stringify(output));
    return output;
  }

  function readSparkOutput() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.output) || "null");
    } catch {
      localStorage.removeItem(STORAGE.output);
      return null;
    }
  }

  window.OPREALMRealmSpark = {
    STORAGE,
    cleanIdea,
    makeOutput,
    saveSparkInput,
    saveSparkOutput,
    readSparkOutput,
  };
})();
