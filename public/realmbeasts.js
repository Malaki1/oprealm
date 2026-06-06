const rarities = {
  common: { label: "Common", weight: 52, statMultiplier: 1, color: "#9fb0d0" },
  rare: { label: "Rare", weight: 28, statMultiplier: 1.12, color: "#3ea7ff" },
  epic: { label: "Epic", weight: 14, statMultiplier: 1.28, color: "#a34cff" },
  legendary: { label: "Legendary", weight: 5, statMultiplier: 1.5, color: "#ffbd31" },
  mythic: { label: "Mythic", weight: 1, statMultiplier: 1.82, color: "#ff4fcf" }
};

const traitPools = {
  body: [
    { id: "wolf", name: "Dire Pup", rarity: "common", hp: 8, attack: 6, defense: 2, speed: 8, radius: "48% 52% 44% 56%" },
    { id: "drake", name: "Baby Drake", rarity: "rare", hp: 12, attack: 8, defense: 5, speed: 5, radius: "54% 46% 50% 50%" },
    { id: "golem", name: "Crystal Golem", rarity: "epic", hp: 18, attack: 6, defense: 12, speed: 1, radius: "28% 28% 38% 38%" },
    { id: "spirit", name: "Star Spirit", rarity: "legendary", hp: 10, attack: 14, defense: 7, speed: 12, radius: "48% 52% 52% 48%" },
    { id: "ancient", name: "Ancient Mythling", rarity: "mythic", hp: 16, attack: 18, defense: 12, speed: 14, radius: "42% 58% 46% 54%" }
  ],
  palette: [
    { id: "storm", name: "Storm Blue", rarity: "rare", primary: "#2f73ff", secondary: "#8eeeff", accent: "#ffdd4a", aura: "rgba(22, 231, 255, 0.52)", attack: 4 },
    { id: "ember", name: "Ember Gold", rarity: "rare", primary: "#ff6f3c", secondary: "#ffd36a", accent: "#ff3f72", aura: "rgba(255, 111, 60, 0.52)", attack: 5 },
    { id: "slime", name: "Slime Jade", rarity: "common", primary: "#35e68a", secondary: "#b9ffdd", accent: "#66ffd5", aura: "rgba(84, 255, 159, 0.45)", hp: 6 },
    { id: "void", name: "Void Violet", rarity: "epic", primary: "#5e35ff", secondary: "#d78cff", accent: "#ff43c7", aura: "rgba(142, 66, 255, 0.58)", speed: 5 },
    { id: "royal", name: "Royal Prism", rarity: "legendary", primary: "#ffca3a", secondary: "#16e7ff", accent: "#ff43c7", aura: "rgba(255, 202, 58, 0.62)", attack: 7, defense: 4 }
  ],
  horns: [
    { id: "none", name: "No Horns", rarity: "common" },
    { id: "twin", name: "Twin Horns", rarity: "rare", attack: 4 },
    { id: "crown", name: "Crown Horns", rarity: "epic", attack: 6, defense: 3 },
    { id: "halo", name: "Astral Halo", rarity: "legendary", attack: 7, speed: 4 }
  ],
  wings: [
    { id: "none", name: "No Wings", rarity: "common" },
    { id: "small", name: "Sprite Wings", rarity: "rare", speed: 5 },
    { id: "dragon", name: "Dragon Wings", rarity: "epic", attack: 4, speed: 7 },
    { id: "celestial", name: "Celestial Wings", rarity: "legendary", attack: 6, speed: 10 }
  ],
  tail: [
    { id: "stub", name: "Stub Tail", rarity: "common", defense: 1 },
    { id: "bolt", name: "Bolt Tail", rarity: "rare", speed: 4 },
    { id: "crystal", name: "Crystal Tail", rarity: "epic", defense: 6 },
    { id: "comet", name: "Comet Tail", rarity: "legendary", attack: 5, speed: 5 }
  ],
  marking: [
    { id: "stripe", name: "Arc Stripes", rarity: "common", speed: 2 },
    { id: "rune", name: "Rune Glow", rarity: "rare", attack: 3 },
    { id: "star", name: "Star Sigil", rarity: "epic", attack: 4, defense: 3 },
    { id: "royal", name: "Royal Crest", rarity: "legendary", hp: 8, attack: 5, defense: 5 }
  ]
};

const abilities = {
  "pounce": { name: "Primal Pounce", type: "dash", element: "nature", energy: 2, cooldown: 1, power: 26, summary: "Dash strike" },
  "storm": { name: "Storm Blast", type: "projectile", element: "electric", energy: 3, cooldown: 1, power: 31, summary: "Bolt damage" },
  "shield": { name: "Crystal Guard", type: "shield", element: "crystal", energy: 3, cooldown: 2, shield: 26, summary: "Gain shield" },
  "heal": { name: "Glow Heal", type: "heal", element: "light", energy: 3, cooldown: 2, heal: 28, summary: "Restore HP" },
  "ultimate": { name: "Realm Surge", type: "ultimate", element: "galaxy", energy: 8, cooldown: 4, power: 58, summary: "Ultimate" }
};

const vfxColors = {
  nature: "#54ff9f",
  electric: "#16e7ff",
  crystal: "#a34cff",
  light: "#fff3a6",
  galaxy: "#ff43c7",
  fire: "#ff6f3c"
};

const state = {
  coins: 12500,
  shards: 860,
  hatchCount: 3,
  collection: [],
  selectedId: "",
  opponent: null,
  player: null,
  status: "ready",
  lobbyStatus: "idle",
  matchTimer: null,
  pendingOpponent: null,
  turn: 1,
  log: []
};

const refs = {
  coins: document.querySelector("[data-coins]"),
  shards: document.querySelector("[data-shards]"),
  hatchCount: document.querySelector("[data-hatch-count]"),
  reveal: document.querySelector("[data-reveal]"),
  traits: document.querySelector("[data-traits]"),
  collection: document.querySelector("[data-collection]"),
  collected: document.querySelector("[data-collected]"),
  playerStatus: document.querySelector('[data-status="player"]'),
  opponentStatus: document.querySelector('[data-status="opponent"]'),
  playerBeast: document.querySelector('[data-beast="player"]'),
  opponentBeast: document.querySelector('[data-beast="opponent"]'),
  abilities: document.querySelector("[data-abilities]"),
  log: document.querySelector("[data-log]"),
  turn: document.querySelector("[data-turn]"),
  battleState: document.querySelector("[data-battle-state]"),
  lobby: document.querySelector("[data-lobby]"),
  lobbyStatus: document.querySelector("[data-lobby-status]"),
  vfx: document.querySelector("[data-vfx]"),
  number: document.querySelector("[data-number]")
};

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + rarities[item.rarity].weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= rarities[item.rarity].weight;
    if (roll <= 0) return item;
  }
  return items[0];
}

function highestRarity(traits) {
  const order = ["common", "rare", "epic", "legendary", "mythic"];
  return traits.reduce((best, trait) => (order.indexOf(trait.rarity) > order.indexOf(best) ? trait.rarity : best), "common");
}

function mintBeast(forOpponent = false) {
  const traits = {
    body: weightedPick(traitPools.body),
    palette: weightedPick(traitPools.palette),
    horns: weightedPick(traitPools.horns),
    wings: weightedPick(traitPools.wings),
    tail: weightedPick(traitPools.tail),
    marking: weightedPick(traitPools.marking)
  };
  const traitList = Object.values(traits);
  const rarity = highestRarity(traitList);
  const multiplier = rarities[rarity].statMultiplier;
  const base = { hp: 88, attack: 18, defense: 12, speed: 10 };
  const stats = traitList.reduce(
    (total, trait) => ({
      hp: total.hp + (trait.hp || 0),
      attack: total.attack + (trait.attack || 0),
      defense: total.defense + (trait.defense || 0),
      speed: total.speed + (trait.speed || 0)
    }),
    base
  );
  const serial = Math.floor(10000 + Math.random() * 90000);
  const name = forOpponent ? "Shadowmint" : `${traits.palette.name.split(" ")[0]} ${traits.body.name}`;

  return {
    id: `beast-${Date.now()}-${serial}`,
    serial,
    name,
    rarity,
    level: forOpponent ? 11 : 1,
    recoveryEndsAt: 0,
    defeatCountToday: 0,
    traits,
    stats: {
      maxHp: Math.round(stats.hp * multiplier),
      attack: Math.round(stats.attack * multiplier),
      defense: Math.round(stats.defense * multiplier),
      speed: Math.round(stats.speed * multiplier),
      energy: 10
    },
    abilities: ["pounce", "storm", "shield", "heal", "ultimate"]
  };
}

function createRuntime(beast, startingEnergy = 6) {
  return {
    beast,
    hp: beast.stats.maxHp,
    energy: startingEnergy,
    shield: 0,
    cooldowns: Object.fromEntries(beast.abilities.map((id) => [id, 0]))
  };
}

function hatchBeast() {
  if (state.hatchCount <= 0 && state.coins < 500) return;
  if (state.hatchCount > 0) {
    state.hatchCount -= 1;
  } else {
    state.coins -= 500;
  }

  const beast = mintBeast();
  state.collection.unshift(beast);
  state.selectedId = beast.id;
  state.player = createRuntime(beast);
  state.opponent = null;
  state.pendingOpponent = null;
  state.status = "ready";
  state.lobbyStatus = "idle";
  state.turn = 1;
  state.log = [`Egg hatched: ${beast.name} #${beast.serial}.`, `${beast.name} is ready for the lobby.`];
  render();
  refs.reveal.classList.add("is-hatching");
  window.setTimeout(() => refs.reveal.classList.remove("is-hatching"), 700);
}

function startMatch(beastId = state.selectedId) {
  const beast = state.collection.find((item) => item.id === beastId) || state.collection[0];
  if (!beast) return;
  if (!isBeastReady(beast)) {
    state.selectedId = beast.id;
    state.status = "ready";
    state.lobbyStatus = "blocked";
    state.log = [`${beast.name} is resting. Ready in ${formatRemaining(beast.recoveryEndsAt)}.`];
    render();
    return;
  }
  state.selectedId = beast.id;
  state.player = createRuntime(beast);
  state.opponent = state.pendingOpponent ? createRuntime(state.pendingOpponent, 6) : createRuntime(mintBeast(true), 6);
  state.pendingOpponent = null;
  state.status = "player_turn";
  state.lobbyStatus = "in_battle";
  state.turn = 1;
  state.log = [`${beast.name} faces ${state.opponent.beast.name}.`];
  render();
}

function selectBeast(beastId = state.selectedId) {
  const beast = state.collection.find((item) => item.id === beastId) || state.collection[0];
  if (!beast) return;
  if (state.matchTimer) window.clearTimeout(state.matchTimer);
  state.matchTimer = null;
  state.selectedId = beast.id;
  state.player = createRuntime(beast);
  state.opponent = null;
  state.pendingOpponent = null;
  state.status = "ready";
  state.lobbyStatus = isBeastReady(beast) ? "idle" : "blocked";
  state.turn = 1;
  state.log = isBeastReady(beast)
    ? [`${beast.name} selected. Enter the lobby to find an opponent.`]
    : [`${beast.name} is resting. Ready in ${formatRemaining(beast.recoveryEndsAt)}.`];
  render();
}

function findMatch() {
  const beast = state.collection.find((item) => item.id === state.selectedId);
  if (!beast) return;
  if (!isBeastReady(beast)) {
    state.lobbyStatus = "blocked";
    state.log.unshift(`${beast.name} is resting. Ready in ${formatRemaining(beast.recoveryEndsAt)}.`);
    render();
    return;
  }
  if (state.matchTimer) window.clearTimeout(state.matchTimer);
  state.player = createRuntime(beast);
  state.opponent = null;
  state.pendingOpponent = null;
  state.status = "lobby";
  state.lobbyStatus = "searching";
  state.log = [`${beast.name} joined the online lobby. Searching for an opponent...`];
  render();
  state.matchTimer = window.setTimeout(() => {
    state.pendingOpponent = mintBeast(true);
    state.lobbyStatus = "opponent_found";
    state.log.push(`Opponent found: ${state.pendingOpponent.name}. Starting battle...`);
    render();
    state.matchTimer = window.setTimeout(() => startMatch(beast.id), 1100);
  }, 2200);
}

function render() {
  refs.coins.textContent = state.coins.toLocaleString();
  refs.shards.textContent = state.shards.toLocaleString();
  refs.hatchCount.textContent = state.hatchCount > 0 ? `${state.hatchCount} Free` : "500 Coins";
  refs.collected.textContent = `${state.collection.length}/128`;
  refs.turn.textContent = `Turn ${state.turn}`;
  refs.battleState.textContent = state.status.replace("_", " ");
  updateRecoveryTimers();
  renderReveal();
  renderTraits();
  renderCollection();
  renderStatus();
  renderBeasts();
  renderAbilities();
  renderLog();
  renderLobby();
}

function renderReveal() {
  const beast = state.collection.find((item) => item.id === state.selectedId);
  if (!beast) {
    refs.reveal.innerHTML = "";
    return;
  }

  refs.reveal.innerHTML = `
    <div class="mint-card">
      <span class="rarity-pill" style="--rarity:${rarities[beast.rarity].color}">${rarities[beast.rarity].label}</span>
      <strong>${beast.name}</strong>
      <span>#${beast.serial} / ${beast.traits.body.name} / Lv. ${beast.level}</span>
      <span>HP ${beast.stats.maxHp} ATK ${beast.stats.attack} DEF ${beast.stats.defense} SPD ${beast.stats.speed}</span>
    </div>
  `;
}

function renderTraits() {
  const beast = state.collection.find((item) => item.id === state.selectedId);
  if (!beast) {
    refs.traits.innerHTML = "";
    return;
  }

  refs.traits.innerHTML = Object.entries(beast.traits)
    .map(
      ([key, trait]) => `
        <div class="trait-chip">
          <span>${key}</span>
          <strong>${trait.name}</strong>
        </div>
      `
    )
    .join("");
}

function renderCollection() {
  refs.collection.innerHTML = state.collection
    .map((beast) => {
      const selected = beast.id === state.selectedId ? " is-selected" : "";
      const resting = isBeastReady(beast) ? "" : " is-resting";
      const restLabel = isBeastReady(beast) ? "" : ` / Ready ${formatRemaining(beast.recoveryEndsAt)}`;
      return `
        <button class="collection-card${selected}${resting}" type="button" data-select="${beast.id}">
          <div class="collection-art">${beastMarkup(beast)}</div>
          <strong>${beast.name}</strong>
          <span>${rarities[beast.rarity].label} #${beast.serial}${restLabel}</span>
        </button>
      `;
    })
    .join("");
}

function renderStatus() {
  refs.playerStatus.innerHTML = statusMarkup(state.player, "Your Beast");
  refs.opponentStatus.innerHTML = statusMarkup(state.opponent, "Opponent");
}

function statusMarkup(runtime, label) {
  if (!runtime) return "";
  const hp = Math.max(0, Math.round((runtime.hp / runtime.beast.stats.maxHp) * 100));
  return `
    <div class="realm-status">
      <div class="realm-status-head">
        <strong>${runtime.beast.name}</strong>
        <em>${label} / ${rarities[runtime.beast.rarity].label}</em>
      </div>
      <div class="realm-meter" style="--value:${hp}%"><i></i></div>
      <div class="realm-status-sub">
        <span>HP ${runtime.hp}/${runtime.beast.stats.maxHp}</span>
        <span>Energy ${runtime.energy}</span>
        <span>Shield ${runtime.shield}</span>
      </div>
    </div>
  `;
}

function renderBeasts() {
  refs.playerBeast.innerHTML = state.player ? beastMarkup(state.player.beast) : "";
  refs.opponentBeast.innerHTML = state.opponent ? beastMarkup(state.opponent.beast) : "";
}

function beastMarkup(beast) {
  const palette = beast.traits.palette;
  const hornMarkup = beast.traits.horns.id === "none" ? "" : '<span class="beast-layer beast-horn"></span><span class="beast-layer beast-horn second"></span>';
  const wingMarkup = beast.traits.wings.id === "none" ? "" : '<span class="beast-layer beast-wing"></span>';
  return `
    <div class="layered-beast" style="--primary:${palette.primary};--secondary:${palette.secondary};--accent:${palette.accent};--aura:${palette.aura};--body-radius:${beast.traits.body.radius}">
      <span class="beast-layer beast-aura"></span>
      <span class="beast-layer beast-tail"></span>
      ${wingMarkup}
      <span class="beast-layer beast-body"></span>
      <span class="beast-layer beast-belly"></span>
      <span class="beast-layer beast-head"></span>
      ${hornMarkup}
      <span class="beast-layer beast-marking"></span>
    </div>
  `;
}

function renderAbilities() {
  if (!state.player) {
    refs.abilities.innerHTML = "";
    return;
  }
  const locked = state.status !== "player_turn";
  refs.abilities.innerHTML = state.player.beast.abilities
    .map((id) => {
      const ability = abilities[id];
      const cooldown = state.player.cooldowns[id] || 0;
      const disabled = locked || state.player.energy < ability.energy || cooldown > 0;
      return `
        <button class="realm-ability" type="button" data-ability="${id}" ${disabled ? "disabled" : ""}>
          <strong>${ability.name}</strong>
          <span>${ability.summary}</span>
          <span>${ability.energy} energy${cooldown ? ` / ${cooldown} cd` : ""}</span>
        </button>
      `;
    })
    .join("");
}

function renderLobby() {
  refs.lobby.classList.toggle("is-searching", state.lobbyStatus === "searching");
  refs.lobby.classList.toggle("is-found", state.lobbyStatus === "opponent_found");
  const beast = state.collection.find((item) => item.id === state.selectedId);
  const button = refs.lobby.querySelector('[data-action="find-match"]');
  if (!beast) {
    refs.lobbyStatus.textContent = "Hatch a beast before entering the lobby.";
    button.disabled = true;
    return;
  }
  if (!isBeastReady(beast)) {
    refs.lobbyStatus.textContent = `${beast.name} is resting. Ready in ${formatRemaining(beast.recoveryEndsAt)}.`;
    button.textContent = "Resting";
    button.disabled = true;
    return;
  }
  if (state.lobbyStatus === "searching") {
    refs.lobbyStatus.textContent = "Searching for another online player...";
    button.textContent = "Searching...";
    button.disabled = true;
    return;
  }
  if (state.lobbyStatus === "opponent_found") {
    refs.lobbyStatus.textContent = `Opponent found: ${state.pendingOpponent?.name || "Arena Rival"}.`;
    button.textContent = "Starting...";
    button.disabled = true;
    return;
  }
  if (state.status === "player_turn" || state.status === "opponent_turn" || state.status === "animating") {
    refs.lobbyStatus.textContent = "Battle in progress.";
    button.textContent = "In Battle";
    button.disabled = true;
    return;
  }
  refs.lobbyStatus.textContent = `${beast.name} is ready to queue.`;
  button.textContent = "Find Match";
  button.disabled = false;
}

function renderLog() {
  const result =
    state.status === "victory"
      ? `<p><strong>Victory.</strong> +120 XP, +50 coins, +1 shard.</p>`
      : state.status === "defeat"
        ? `<p><strong>Defeat.</strong> Upgrade traits or hatch another egg.</p>`
        : "";
  refs.log.innerHTML = state.log.slice(-8).map((line) => `<p>${line}</p>`).join("") + result;
}

function useAbility(id) {
  if (state.status !== "player_turn") return;
  resolveAbility(state.player, state.opponent, id, "player");
  if (state.status === "animating") {
    window.setTimeout(() => {
      finishAnimation();
      if (state.status === "opponent_turn") {
        const opponentAbility = chooseOpponentAbility();
        resolveAbility(state.opponent, state.player, opponentAbility, "opponent");
        window.setTimeout(finishAnimation, 900);
      }
    }, 900);
  }
}

function resolveAbility(source, target, id, side) {
  const ability = abilities[id];
  if (!ability || source.energy < ability.energy || source.cooldowns[id] > 0) return;
  source.energy -= ability.energy;
  source.cooldowns[id] = ability.cooldown;
  state.log.push(`${source.beast.name} used ${ability.name}.`);

  let number = 0;
  let numberKind = "damage";
  if (ability.power) {
    const raw = Math.max(1, Math.round(ability.power + source.beast.stats.attack * 0.7 - target.beast.stats.defense * 0.42));
    const absorbed = Math.min(target.shield, raw);
    number = raw - absorbed;
    target.shield -= absorbed;
    target.hp = Math.max(0, target.hp - number);
  }
  if (ability.shield) {
    source.shield += ability.shield;
    number = ability.shield;
    numberKind = "healing";
  }
  if (ability.heal) {
    source.hp = Math.min(source.beast.stats.maxHp, source.hp + ability.heal);
    number = ability.heal;
    numberKind = "healing";
  }

  state.status = "animating";
  playAnimation(side, ability, number, numberKind);
  render();
}

function finishAnimation() {
  clearAnimation();
  if (state.player.hp <= 0) {
    state.status = "defeat";
    applyDefeatCooldown(state.player.beast);
  } else if (state.opponent.hp <= 0) {
    state.status = "victory";
    state.lobbyStatus = "idle";
    state.coins += 50;
    state.shards += 1;
  } else if (state.log[state.log.length - 1].startsWith(state.player.beast.name)) {
    state.status = "opponent_turn";
    refreshCreature(state.opponent);
  } else {
    state.status = "player_turn";
    state.turn += 1;
    refreshCreature(state.player);
  }
  render();
}

function refreshCreature(runtime) {
  runtime.energy = Math.min(runtime.beast.stats.energy, runtime.energy + 2);
  runtime.shield = Math.max(0, Math.round(runtime.shield * 0.5));
  Object.keys(runtime.cooldowns).forEach((id) => {
    runtime.cooldowns[id] = Math.max(0, runtime.cooldowns[id] - 1);
  });
}

function chooseOpponentAbility() {
  return (
    state.opponent.beast.abilities.find((id) => {
      const ability = abilities[id];
      return ability.power && state.opponent.energy >= ability.energy && state.opponent.cooldowns[id] <= 0;
    }) || "pounce"
  );
}

function isBeastReady(beast) {
  return !beast.recoveryEndsAt || beast.recoveryEndsAt <= Date.now();
}

function applyDefeatCooldown(beast) {
  beast.defeatCountToday += 1;
  const minutes = beast.defeatCountToday === 1 ? 5 : beast.defeatCountToday === 2 ? 15 : 30;
  beast.recoveryEndsAt = Date.now() + minutes * 60 * 1000;
  state.lobbyStatus = "idle";
  state.log.push(`${beast.name} is resting after battle. Ready in ${minutes}m.`);
}

function updateRecoveryTimers() {
  state.collection.forEach((beast) => {
    if (beast.recoveryEndsAt && beast.recoveryEndsAt <= Date.now()) {
      beast.recoveryEndsAt = 0;
    }
  });
}

function formatRemaining(timestamp) {
  const remaining = Math.max(0, timestamp - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.ceil((remaining % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function playAnimation(side, ability, number, numberKind) {
  clearAnimation();
  const source = side === "player" ? refs.playerBeast : refs.opponentBeast;
  const target = side === "player" ? refs.opponentBeast : refs.playerBeast;
  if (ability.type === "dash" || ability.type === "ultimate") source.classList.add("is-dashing");
  target.classList.add("is-hit");
  refs.vfx.style.setProperty("--vfx", vfxColors[ability.element] || "#ffffff");
  refs.vfx.classList.add("is-active");
  if (number) {
    refs.number.textContent = `${numberKind === "healing" ? "+" : "-"}${number}`;
    refs.number.className = `realm-number is-active ${numberKind === "healing" ? "is-heal" : ""} ${side === "player" ? "is-opponent-target" : "is-player-target"}`;
  }
}

function clearAnimation() {
  refs.playerBeast.classList.remove("is-dashing", "is-hit");
  refs.opponentBeast.classList.remove("is-dashing", "is-hit");
  refs.vfx.classList.remove("is-active");
  refs.number.className = "realm-number";
}

document.addEventListener("click", (event) => {
  const hatch = event.target.closest('[data-action="hatch"]');
  if (hatch) {
    hatchBeast();
    return;
  }

  const reset = event.target.closest('[data-action="reset"]');
  if (reset) {
    state.status = "ready";
    state.lobbyStatus = "idle";
    state.pendingOpponent = null;
    if (state.matchTimer) window.clearTimeout(state.matchTimer);
    state.matchTimer = null;
    selectBeast();
    return;
  }

  const find = event.target.closest('[data-action="find-match"]');
  if (find) {
    findMatch();
    return;
  }

  const ability = event.target.closest("[data-ability]");
  if (ability) {
    useAbility(ability.dataset.ability);
    return;
  }

  const selection = event.target.closest("[data-select]");
  if (selection) {
    selectBeast(selection.dataset.select);
  }
});

state.collection = [mintBeast(), mintBeast(), mintBeast()];
state.selectedId = state.collection[0].id;
selectBeast(state.selectedId);
