const planetThemes = {
  lumora: {
    name: "Lumora",
    subtitle: "Crystal Jungle World",
    beast: "Tempest Lord",
    resources: "Glowberry, Moon Nectar, Crystal Flower",
    className: "theme-crystal",
  },
  infernia: {
    name: "Infernia",
    subtitle: "Volcanic Wasteland",
    beast: "Ashfang",
    resources: "Ember Root, Lava Pearl, Ash Crystal",
    className: "theme-lava",
  },
  skyterra: {
    name: "Skyterra",
    subtitle: "Floating Isles Planet",
    beast: "Windwhisk",
    resources: "Windfeather, Cloud Moss, Sky Shard",
    className: "theme-sky",
  },
  slimoon: {
    name: "Slimoon",
    subtitle: "Slime Ocean Planet",
    beast: "Jellyjaw",
    resources: "Slime Pearl, Glowcap, Green Nectar",
    className: "theme-slime",
  },
  frozora: {
    name: "Frozora",
    subtitle: "Ice Crystal World",
    beast: "Frosthorn",
    resources: "Frost Lily, Ice Crystal, Dream Petal",
    className: "theme-ice",
  },
};

const zoneDetails = {
  merchant: {
    title: "Merchant Shop",
    body: "Buy lures, tool upgrades, rations and limited planet items from the creator's shop.",
    action: "Open Merchant",
  },
  portals: {
    title: "Game Portals",
    body: "Jump into mini-games and story worlds made by this planet's creator.",
    action: "View Portals",
  },
  arena: {
    title: "Beast Arena",
    body: "Challenge native beasts, test companions and earn RealmDex progress.",
    action: "Enter Arena",
    href: "/beast-hunt.html",
  },
  crafting: {
    title: "Crafting Station",
    body: "Combine harvested resources into lures, tranquilizers, trackers and tools.",
    action: "Start Crafting",
    href: "/crafting-station.html",
  },
  resources: {
    title: "Resource Nodes",
    body: "Harvest Glowberry, Thunder Moss, Moon Nectar and rare biome ingredients.",
    action: "Harvest",
    href: "/beast-hunt.html",
  },
  owner: {
    title: "Owner Avatar",
    body: "Meet the planet owner NPC, read the welcome message and start planet quests.",
    action: "Talk",
  },
  spawn: {
    title: "Guest Spawn",
    body: "Visitors land here before exploring shops, portals, beasts and resources.",
    action: "Start Tour",
  },
};

const params = new URLSearchParams(window.location.search);
const selectedId = params.get("planet") || "lumora";
const selectedTheme = planetThemes[selectedId] || planetThemes.lumora;
const zoneCard = document.querySelector("#zoneCard");
const zoneButtons = [...document.querySelectorAll("[data-zone]")];

function setTheme() {
  document.body.classList.add(selectedTheme.className);
  document.querySelector("#planetName").textContent = selectedTheme.name;
  document.querySelector("#planetSubtitle").textContent = selectedTheme.subtitle;
  document.querySelector("#mapPlanetName").textContent = selectedTheme.name;
  document.querySelector("#featuredBeast").textContent = selectedTheme.beast;
  document.querySelector("#resourceSummary").textContent = selectedTheme.resources;
}

function renderZone(zoneId) {
  const zone = zoneDetails[zoneId] || zoneDetails.spawn;
  const actionMarkup = zone.href
    ? `<a href="${zone.href}?planet=${selectedId}">${zone.action}</a>`
    : `<button type="button">${zone.action}</button>`;
  zoneCard.innerHTML = `
    <p class="eyebrow">Selected Zone</p>
    <h2>${zone.title}</h2>
    <p>${zone.body}</p>
    ${actionMarkup}
  `;
  zoneButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.zone === zoneId));
}

zoneButtons.forEach((button) => {
  button.addEventListener("click", () => renderZone(button.dataset.zone));
});

setTheme();
renderZone("spawn");
