const planets = [
  {
    id: "lumora",
    name: "Lumora",
    subtitle: "Crystal Jungle World",
    owner: "Mal",
    level: 42,
    xp: "15,230 / 28,000 XP",
    progress: 54,
    visitors: "1,204",
    species: 24,
    games: 12,
    rating: "4.8",
    featuredBeast: "Tempest Lord",
    beastRarity: "Legendary",
    rarity: "Epic",
    biome: "Crystal Jungle",
    tags: ["featured", "trending", "beasts", "stories", "crystal", "stormbyte", "electric"],
    resources: ["Glowberry", "Moon Nectar", "Crystal Flower", "Thunder Moss", "+8"],
    position: [50, 47],
    size: "xl",
    color: "crystal",
  },
  {
    id: "infernia",
    name: "Infernia",
    subtitle: "Volcanic Wasteland",
    owner: "LavaLex",
    level: 31,
    xp: "9,800 / 18,000 XP",
    progress: 48,
    visitors: "2.1K",
    species: 18,
    games: 9,
    rating: "4.6",
    featuredBeast: "Ashfang",
    beastRarity: "Epic",
    rarity: "Rare",
    biome: "Fire / Lava",
    tags: ["featured", "trending", "beasts", "lava", "fire"],
    resources: ["Ember Root", "Lava Pearl", "Ash Crystal", "+5"],
    position: [20, 29],
    size: "lg",
    color: "lava",
  },
  {
    id: "skyterra",
    name: "Skyterra",
    subtitle: "Floating Isles",
    owner: "CloudCrafter",
    level: 28,
    xp: "7,420 / 15,000 XP",
    progress: 49,
    visitors: "1.8K",
    species: 20,
    games: 8,
    rating: "4.7",
    featuredBeast: "Windwhisk",
    beastRarity: "Rare",
    rarity: "Rare",
    biome: "Floating Isles",
    tags: ["featured", "new", "stories", "sky", "wind"],
    resources: ["Windfeather", "Cloud Moss", "Sky Shard", "+6"],
    position: [43, 22],
    size: "md",
    color: "sky",
  },
  {
    id: "slimoon",
    name: "Slimoon",
    subtitle: "Slime Ocean Planet",
    owner: "Gloopi",
    level: 19,
    xp: "4,050 / 9,000 XP",
    progress: 45,
    visitors: "892",
    species: 14,
    games: 6,
    rating: "4.4",
    featuredBeast: "Jellyjaw",
    beastRarity: "Rare",
    rarity: "Common",
    biome: "Slime / Toxic",
    tags: ["new", "slime", "toxic"],
    resources: ["Slime Pearl", "Glowcap", "Green Nectar", "+4"],
    position: [67, 24],
    size: "lg",
    color: "slime",
  },
  {
    id: "mechalon",
    name: "Mechalon",
    subtitle: "Robot Factory World",
    owner: "BoltKid",
    level: 22,
    xp: "5,720 / 11,000 XP",
    progress: 52,
    visitors: "950",
    species: 11,
    games: 7,
    rating: "4.5",
    featuredBeast: "Gearmaw",
    beastRarity: "Epic",
    rarity: "Rare",
    biome: "Robot Factory",
    tags: ["creators", "beasts", "robot", "metal"],
    resources: ["Spark Gear", "Battery Bloom", "Iron Seed", "+5"],
    position: [22, 55],
    size: "md",
    color: "metal",
  },
  {
    id: "frozora",
    name: "Frozora",
    subtitle: "Ice Crystal World",
    owner: "SnowNova",
    level: 25,
    xp: "6,100 / 12,500 XP",
    progress: 49,
    visitors: "1.2K",
    species: 16,
    games: 8,
    rating: "4.6",
    featuredBeast: "Frosthorn",
    beastRarity: "Epic",
    rarity: "Rare",
    biome: "Ice / Crystal",
    tags: ["featured", "beasts", "crystal", "ice"],
    resources: ["Frost Lily", "Ice Crystal", "Dream Petal", "+7"],
    position: [78, 55],
    size: "md",
    color: "ice",
  },
  {
    id: "mycelia",
    name: "Mycelia",
    subtitle: "Magic Mushroom Forest",
    owner: "MushMira",
    level: 21,
    xp: "5,300 / 10,800 XP",
    progress: 49,
    visitors: "1.1K",
    species: 19,
    games: 5,
    rating: "4.3",
    featuredBeast: "Sporetail",
    beastRarity: "Rare",
    rarity: "Common",
    biome: "Magic Mushroom",
    tags: ["new", "stories", "mushroom", "forest"],
    resources: ["Glowcap", "Spore Dust", "Mossberry", "+4"],
    position: [36, 69],
    size: "sm",
    color: "mushroom",
  },
  {
    id: "sandora",
    name: "Sandora",
    subtitle: "Sunken Desert World",
    owner: "DuneDani",
    level: 33,
    xp: "10,400 / 19,000 XP",
    progress: 55,
    visitors: "1.6K",
    species: 17,
    games: 10,
    rating: "4.7",
    featuredBeast: "Mirageclaw",
    beastRarity: "Legendary",
    rarity: "Epic",
    biome: "Sunken Desert",
    tags: ["trending", "creators", "stories", "desert"],
    resources: ["Sun Seed", "Amber Dust", "Oasis Drop", "+6"],
    position: [70, 76],
    size: "md",
    color: "desert",
  },
];

const layer = document.querySelector("#planetLayer");
const strip = document.querySelector("#worldStrip");
const search = document.querySelector("#galaxySearch");
const resultCount = document.querySelector("#resultCount");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const drawer = document.querySelector(".planet-drawer");
let activeFilter = "featured";
let selectedPlanet = planets[0];

function matchesPlanet(planet, query) {
  const haystack = [
    planet.name,
    planet.subtitle,
    planet.owner,
    planet.biome,
    planet.featuredBeast,
    planet.beastRarity,
    planet.rarity,
    ...planet.tags,
    ...planet.resources,
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function filteredPlanets() {
  const query = search.value.trim();
  return planets.filter((planet) => {
    const inFilter = activeFilter === "featured" ? planet.tags.includes("featured") : planet.tags.includes(activeFilter);
    return (query ? matchesPlanet(planet, query) : inFilter) || planet.id === selectedPlanet.id;
  });
}

function planetButton(planet) {
  const button = document.createElement("button");
  button.className = `planet-node planet-${planet.color} planet-${planet.size}`;
  button.type = "button";
  button.style.left = `${planet.position[0]}%`;
  button.style.top = `${planet.position[1]}%`;
  button.dataset.planetId = planet.id;
  button.innerHTML = `
    <span class="planet-art" aria-hidden="true"></span>
    <strong>${planet.name}</strong>
    <small>${planet.subtitle}</small>
    <em>${planet.visitors}</em>
  `;
  button.addEventListener("click", () => selectPlanet(planet.id));
  return button;
}

function worldCard(planet) {
  const card = document.createElement("button");
  card.className = `world-card planet-${planet.color}`;
  card.type = "button";
  card.dataset.planetId = planet.id;
  card.innerHTML = `
    <span class="mini-planet" aria-hidden="true"></span>
    <strong>${planet.name}</strong>
    <small>${planet.subtitle}</small>
    <em>${planet.visitors} visitors</em>
  `;
  card.addEventListener("click", () => selectPlanet(planet.id));
  return card;
}

function render() {
  const visible = filteredPlanets();
  layer.replaceChildren(...visible.map(planetButton));
  strip.replaceChildren(...visible.map(worldCard));
  resultCount.textContent = `${visible.length} planet${visible.length === 1 ? "" : "s"}`;
  document.querySelectorAll(`[data-planet-id="${selectedPlanet.id}"]`).forEach((node) => node.classList.add("is-selected"));
}

function selectPlanet(id) {
  selectedPlanet = planets.find((planet) => planet.id === id) || planets[0];
  updateDrawer();
  render();
  drawer.classList.add("is-open");
}

function updateDrawer() {
  document.querySelector("#planetPreview").className = `planet-preview planet-${selectedPlanet.color}`;
  document.querySelector("#planetRarity").textContent = `${selectedPlanet.rarity} Planet`;
  document.querySelector("#planetName").textContent = selectedPlanet.name;
  document.querySelector("#planetOwner").textContent = `${selectedPlanet.subtitle} · By ${selectedPlanet.owner}`;
  document.querySelector("#planetLevel").textContent = selectedPlanet.level;
  document.querySelector("#planetXp").textContent = selectedPlanet.xp;
  document.querySelector("#planetProgress").style.width = `${selectedPlanet.progress}%`;
  document.querySelector("#planetStats").innerHTML = `
    <span><b>Visitors Today</b><strong>${selectedPlanet.visitors}</strong></span>
    <span><b>Native Species</b><strong>${selectedPlanet.species}</strong></span>
    <span><b>Games</b><strong>${selectedPlanet.games}</strong></span>
    <span><b>Rating</b><strong>${selectedPlanet.rating}</strong></span>
  `;
  document.querySelector("#featuredBeast").textContent = selectedPlanet.featuredBeast;
  document.querySelector("#beastRarity").textContent = selectedPlanet.beastRarity;
  document.querySelector("#beastPortrait").className = `beast-token planet-${selectedPlanet.color}`;
  document.querySelector("#resourceList").innerHTML = selectedPlanet.resources.map((resource) => `<span>${resource}</span>`).join("");
  document.querySelector("#visitPlanetButton").href = `/planet-hub.html?planet=${selectedPlanet.id}`;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

search.addEventListener("input", render);
document.querySelector(".drawer-close").addEventListener("click", () => drawer.classList.remove("is-open"));
document.querySelector("#favoriteButton").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("is-active");
  event.currentTarget.textContent = event.currentTarget.classList.contains("is-active") ? "Favourited" : "Favourite";
});
document.querySelector("#followButton").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("is-active");
  event.currentTarget.textContent = event.currentTarget.classList.contains("is-active") ? "Following" : "Follow";
});

updateDrawer();
render();
