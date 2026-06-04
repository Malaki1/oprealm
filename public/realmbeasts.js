(function () {
  "use strict";

  const demoProject = {
    title: "Stormbyte and the Candy Forest",
    worlds: [
      {
        id: "world-demo",
        name: "Candy Thunder Forest",
        description:
          "A glowing candy forest with floating gumdrop islands, soft lightning crystals, rainbow bridges and a clear central platform for creature battles.",
        mood: ["magical", "funny", "epic"],
        imageUrl: "/assets/character-creator/environments/candy-kingdom.png"
      }
    ],
    activeWorldId: "world-demo",
    characters: [
      {
        id: "character-demo",
        name: "Luna",
        role: "creator hero",
        traits: ["brave", "curious", "kind"],
        description: "A bright young creator with a purple hoodie, adventure backpack and a playful imagination.",
        style: "premium 3D cartoon"
      }
    ],
    objects: [
      {
        id: "pet-demo",
        kind: "pet",
        name: "Stormbyte",
        description: "A lightning tiger cub with crystal wings, soft blue fur, slime sparkle powers and friendly oversized eyes.",
        imageUrl: "/assets/homepage/cards/art-studio.png"
      }
    ],
    scenes: []
  };

  let bible;
  let config;
  let battleTurn = 0;

  function boot() {
    if (!window.OPREALMCreatorBible) return;
    bible = window.OPREALMCreatorBible.compileCreatorBible({ outcome: "realm_beasts" });
    config = window.OPREALMCreatorBible.generateRealmBeastsConfig(bible);
    renderBibleStatus();
    renderConfig(false);
    bindEvents();
  }

  function bindEvents() {
    byId("buildRealmBeast").addEventListener("click", () => {
      bible = window.OPREALMCreatorBible.compileCreatorBible({ outcome: "realm_beasts" });
      config = window.OPREALMCreatorBible.generateRealmBeastsConfig(bible);
      window.OPREALMCreatorBible.saveBible(bible);
      window.OPREALMCreatorBible.saveRealmBeastsConfig(config);
      renderBibleStatus(true);
      renderConfig(true);
    });

    byId("useDemoBeast").addEventListener("click", () => {
      bible = window.OPREALMCreatorBible.compileCreatorBible(demoProject, { outcome: "realm_beasts" });
      config = window.OPREALMCreatorBible.generateRealmBeastsConfig(bible);
      window.OPREALMCreatorBible.saveBible(bible);
      window.OPREALMCreatorBible.saveRealmBeastsConfig(config);
      renderBibleStatus(true);
      renderConfig(true);
    });

    byId("runBattle").addEventListener("click", runBattle);
    byId("saveDraft").addEventListener("click", saveDraft);
  }

  function renderBibleStatus(ready) {
    const hasProject = Boolean(bible && bible.projectName);
    byId("bibleStatus").textContent = ready || hasProject ? "Creator Bible ready" : "Demo-ready export mode";
    byId("bibleProjectName").textContent = bible ? bible.projectName : "No project loaded yet";
    if (bible && bible.world && bible.world.imageUrl) {
      byId("realmbeastHeroImage").src = bible.world.imageUrl;
    }
  }

  function renderConfig(isBuilt) {
    if (!config) return;
    byId("hubTitle").textContent = config.arena.name;
    byId("hubDescription").textContent = config.arena.description;
    byId("beastName").textContent = config.beast.name;
    byId("beastSubtitle").textContent = `${titleCase(config.beast.rarity)} ${config.beast.elements.join(" / ")} RealmBeast`;
    byId("beastImage").src = config.beast.artAssetUrl || config.arena.backgroundAssetUrl || "/assets/oprealm-ai-coach-small.png";
    byId("hatchTitle").textContent = isBuilt ? "New creature discovered" : "Ready to hatch";
    byId("hatchText").textContent = isBuilt
      ? `${config.beast.name} hatched with ${config.beast.abilities.join(", ")}.`
      : "Build from the Creator Bible to reveal the creature.";
    byId("playerFighter").textContent = config.beast.name;
    byId("dexRarity").textContent = titleCase(config.beast.rarity);
    byId("dexName").textContent = config.realmDexCard.title;
    byId("dexLore").textContent = config.realmDexCard.lore;
    setHp(100, 100);
    renderStats();
  }

  function renderStats() {
    const statGrid = byId("statGrid");
    const stats = config.beast.stats;
    statGrid.innerHTML = Object.keys(stats)
      .map((key) => `<span><b>${titleCase(key)}</b><strong>${stats[key]}</strong></span>`)
      .join("");
  }

  function runBattle() {
    if (!config) return;
    battleTurn += 1;
    const attack = config.beast.stats.attack + battleTurn * 3;
    const defense = config.beast.stats.defense;
    const playerHp = Math.max(22, 100 - battleTurn * (14 + (battleTurn % 2) * 4));
    const rivalHp = Math.max(0, 100 - battleTurn * Math.round((attack + defense) / 18));
    setHp(playerHp, rivalHp);

    if (rivalHp <= 0) {
      byId("battleLog").textContent = `${config.beast.name} wins with ${config.beast.abilities[battleTurn % config.beast.abilities.length]} and unlocks a RealmDex reward.`;
      battleTurn = 0;
      return;
    }

    byId("battleLog").textContent = `${config.beast.name} uses ${config.beast.abilities[battleTurn % config.beast.abilities.length]}. Shadow Rival is down to ${rivalHp}% HP.`;
  }

  function saveDraft() {
    if (!config) return;
    const draft = {
      savedAt: new Date().toISOString(),
      bible,
      realmBeasts: config,
      publishStatus: "private_test_draft"
    };
    localStorage.setItem("oprealm_realmbeasts_test_draft_v1", JSON.stringify(draft));
    byId("dexLore").textContent = "Saved as a private test draft. Next step is admin/parent review before public library publishing.";
  }

  function setHp(player, rival) {
    byId("playerHp").style.width = `${player}%`;
    byId("rivalHp").style.width = `${rival}%`;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
