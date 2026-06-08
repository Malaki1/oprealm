const huntData = {
  lumora: {
    planet: "Lumora",
    biome: "Crystal Jungle",
    beast: "Stormbyte",
    rarity: "Rare Beast",
    lure: "Electro Berry",
    theme: "theme-crystal",
    clues: [
      { label: "Energy Footprints", found: true },
      { label: "Scratch Marks", found: true },
      { label: "Broken Crystal", found: false },
      { label: "Howling Call", found: false },
    ],
  },
  infernia: {
    planet: "Infernia",
    biome: "Volcanic Wasteland",
    beast: "Ashfang",
    rarity: "Epic Beast",
    lure: "Ember Snack",
    theme: "theme-lava",
    clues: [
      { label: "Scorched Tracks", found: true },
      { label: "Ash Claw Marks", found: true },
      { label: "Lava Ripple", found: false },
      { label: "Smoke Roar", found: false },
    ],
  },
  skyterra: {
    planet: "Skyterra",
    biome: "Floating Isles",
    beast: "Windwhisk",
    rarity: "Rare Beast",
    lure: "Cloud Nectar",
    theme: "theme-sky",
    clues: [
      { label: "Feather Drift", found: true },
      { label: "Wind Scratch", found: true },
      { label: "Cloud Print", found: false },
      { label: "Sky Chirp", found: false },
    ],
  },
  frozora: {
    planet: "Frozora",
    biome: "Ice Crystal World",
    beast: "Frosthorn",
    rarity: "Epic Beast",
    lure: "Frost Lily",
    theme: "theme-ice",
    clues: [
      { label: "Ice Hoofprints", found: true },
      { label: "Frozen Bark", found: true },
      { label: "Cracked Shard", found: false },
      { label: "Cold Echo", found: false },
    ],
  },
};

const params = new URLSearchParams(window.location.search);
const planetId = params.get("planet") || "lumora";
const hunt = huntData[planetId] || huntData.lumora;
const clueList = document.querySelector("#clueList");
const hotbarButtons = [...document.querySelectorAll("[data-tool]")];
const eventCard = document.querySelector("#huntEventCard");
let secondsRemaining = 15 * 60 + 32;

function renderHunt() {
  document.body.classList.add(hunt.theme);
  document.querySelector("#backToHub").href = `/planet-hub.html?planet=${planetId}`;
  document.querySelector("#craftingLink").href = `/crafting-station.html?planet=${planetId}`;
  document.querySelector("#planetBiome").textContent = hunt.biome;
  document.querySelector("#huntPlanetName").textContent = `${hunt.planet} Planet`;
  document.querySelector("#mapPlanet").textContent = hunt.planet;
  document.querySelector("#targetName").textContent = hunt.beast;
  document.querySelector("#targetRarity").textContent = hunt.rarity;
  document.querySelector("#toastBeast").textContent = hunt.beast;
  document.querySelector("#lureName").textContent = hunt.lure;
  document.querySelector("#beastEncounter strong").textContent = hunt.beast;
  renderClues();
}

function renderClues() {
  const foundCount = hunt.clues.filter((clue) => clue.found).length;
  document.querySelector("#clueCount").textContent = `${foundCount} / ${hunt.clues.length}`;
  document.querySelector("#clueProgress").style.width = `${(foundCount / hunt.clues.length) * 100}%`;
  document.querySelector("#toastCopy").textContent = `Follow the energy trail. Clues found: ${foundCount} / ${hunt.clues.length}`;
  clueList.innerHTML = hunt.clues
    .map((clue) => `<li class="${clue.found ? "is-found" : ""}"><span>${clue.found ? "OK" : ""}</span>${clue.label}</li>`)
    .join("");
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `00:${minutes}:${seconds}`;
}

function updateTimer() {
  secondsRemaining = Math.max(0, secondsRemaining - 1);
  document.querySelector("#lureTimer").textContent = formatTimer(secondsRemaining);
}

hotbarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    hotbarButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    const toolName = button.querySelector("strong").textContent;
    eventCard.innerHTML = `
      <p class="eyebrow">Tool Selected</p>
      <h2>${toolName} ready.</h2>
      <p>Use it when ${hunt.beast} gets close enough to interact.</p>
    `;
  });
});

document.querySelector("#beastEncounter").addEventListener("click", () => {
  const nextClue = hunt.clues.find((clue) => !clue.found);
  if (nextClue) {
    nextClue.found = true;
    renderClues();
    eventCard.innerHTML = `
      <p class="eyebrow">Clue Found</p>
      <h2>${nextClue.label}</h2>
      <p>${hunt.beast} is closer. Keep following the trail to complete the encounter.</p>
    `;
    return;
  }

  eventCard.innerHTML = `
    <p class="eyebrow">Encounter Ready</p>
    <h2>${hunt.beast} revealed.</h2>
    <p>Use calming spray or a tranquilizer to begin the capture sequence.</p>
  `;
});

document.querySelector("#cancelLureButton").addEventListener("click", () => {
  secondsRemaining = 0;
  updateTimer();
  eventCard.innerHTML = `
    <p class="eyebrow">Lure Cancelled</p>
    <h2>Tracking paused.</h2>
    <p>Return to crafting to make another lure or restart the hunt from the Beast Arena.</p>
  `;
});

renderHunt();
setInterval(updateTimer, 1000);
