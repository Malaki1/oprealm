const FALLBACK_CREATIONS = [
  { id: "shark-girl", title: "Shark Girl and the Echoes of Amazonia", type: "story", creator: "Mal", planet: "Lumora", genre: "Adventure", age: "8-10", rating: 4.8, views: "5.4K", image: "/assets/character-creator/environments/underwater-realm.png", description: "A legendary adventure of memory, courage, and the heart of the ocean.", url: "/ai-storybook.html" },
  { id: "crystal-heist", title: "The Crystal Heist", type: "game", creator: "Nova", planet: "Frozora", genre: "Fantasy", age: "10-12", rating: 4.6, views: "3.2K", image: "/assets/project-space-shooter-cover.png", description: "Race through a frozen crystal city before the moon vault closes forever.", url: "/story-game.html" },
  { id: "skyborn", title: "Skyborn Legends", type: "comic", creator: "Zane", planet: "Aethera", genre: "Adventure", age: "8-10", rating: 4.7, views: "2.9K", image: "/assets/home-path-story-games.png", description: "Young riders and storm dragons defend the floating kingdoms.", url: "/story-game.html" },
  { id: "verdant", title: "Verdant Whispers", type: "world", creator: "Luna", planet: "Verdantia", genre: "Mystery", age: "6-8", rating: 4.5, views: "2.5K", image: "/assets/character-creator/environments/enchanted-forest.png", description: "A living forest remembers every promise ever made beneath its branches.", url: "/galaxy.html" },
  { id: "timekeeper", title: "The Lost Timekeeper", type: "story", creator: "Kai", planet: "Chronara", genre: "Mystery", age: "10-12", rating: 4.6, views: "2.1K", image: "/assets/character-creator/environments/magic-portal-studio.png", description: "A clockmaker's apprentice discovers a doorway into stolen moments.", url: "/ai-storybook.html?demo=1" },
  { id: "kora", title: "Legend of Kora", type: "movie", creator: "PixelDreams", planet: "Lumora", genre: "Adventure", age: "8-10", rating: 4.8, views: "6.1K", image: "/assets/character-creator/environments/fantasy-grove.png", description: "An ocean guardian rises when an ancient beacon wakes below the reef.", url: "/ai-storybook.html?demo=1" },
  { id: "neon-beat", title: "Neon Beat Run", type: "music", creator: "StarCoder", planet: "Mechalon", genre: "Sci-Fi", age: "10-12", rating: 4.4, views: "1.8K", image: "/assets/studio/thumbnails/thumb-neon-beat.png", description: "A playable synthwave soundtrack built for racing through a robot city.", url: "/studio/music.html" },
  { id: "lava-kingdom", title: "Infernia Rising", type: "world", creator: "WildForge", planet: "Infernia", genre: "Fantasy", age: "13+", rating: 4.7, views: "3.8K", image: "/assets/character-creator/environments/lava-planet.png", description: "Explore a volcanic realm where cities move with the lava tides.", url: "/galaxy.html" },
  { id: "robot-factory", title: "Mechalon Factory", type: "game", creator: "CircuitKid", planet: "Mechalon", genre: "Sci-Fi", age: "8-10", rating: 4.5, views: "2.2K", image: "/assets/studio/thumbnails/thumb-lava-obby.png", description: "Restore a runaway robot factory by teaching its machines to cooperate.", url: "/story-game.html" },
];

const CATEGORIES = [
  ["story", "Stories", "1.8K", "&#128214;", "/assets/home-path-story-games.png"],
  ["movie", "Movies", "620", "&#127916;", "/assets/studio/cards/card-movies.png"],
  ["music", "Music", "940", "&#9835;", "/assets/studio/cards/card-music.png"],
  ["game", "Games", "2.4K", "&#127918;", "/assets/studio/cards/card-games.png"],
  ["comic", "Comics", "780", "&#128172;", "/assets/homepage/tools/asset-library.png"],
  ["world", "Worlds", "1.2K", "&#9732;", "/assets/character-creator/environments/sky-islands.png"],
];

const TYPE_MAP = {
  story_game: "story", web_game: "game", pixel_game: "game", trailer: "movie",
  comic: "comic", music: "music", sound: "music", world: "world", story: "story",
  movie: "movie", game: "game",
};

let creations = [...FALLBACK_CREATIONS];
let activeType = "all";
let heroIndex = 0;
let heroTimer = null;

const searchInput = document.querySelector("#realmSearch");
const genreFilter = document.querySelector("#genreFilter");
const ageFilter = document.querySelector("#ageFilter");
const trendingGrid = document.querySelector("#trendingGrid");
const newGrid = document.querySelector("#newGrid");

function normalizeCreation(item, index) {
  const type = TYPE_MAP[item.type] || "story";
  return {
    id: item.id || `creation-${index}`,
    title: item.title || "Untitled Creation",
    type,
    creator: item.creator || item.creator_name || item.seller_name || "OPREALM Creator",
    planet: item.planet || planetForType(type),
    genre: item.genre || genreFromTags(item.tags) || "Adventure",
    age: item.age || item.age_band || "8-10",
    rating: Number(item.rating || (4.4 + (index % 5) * 0.1).toFixed(1)),
    views: item.views || `${1 + index}.${(index * 7) % 10}K`,
    image: item.image || item.thumbnail_url || fallbackImage(type, index),
    hasPublishedCover: Boolean(item.hasPublishedCover || item.thumbnail_url?.startsWith("/api/creation-cover")),
    description: item.description || "A new community creation waiting to be explored.",
    url: item.url || item.media_url || creationUrl(type),
  };
}

function filteredCreations() {
  const query = searchInput.value.trim().toLowerCase();
  const genre = genreFilter.value;
  const age = ageFilter.value;
  return creations.filter((item) => {
    const haystack = `${item.title} ${item.creator} ${item.planet} ${item.genre} ${item.type} ${item.description}`.toLowerCase();
    return (activeType === "all" || item.type === activeType)
      && (genre === "all" || item.genre === genre)
      && (age === "all" || item.age === age)
      && (!query || haystack.includes(query));
  });
}

function render() {
  const filtered = filteredCreations();
  trendingGrid.innerHTML = filtered.length
    ? filtered.slice(0, 10).map((item, index) => creationCard(item, index)).join("")
    : emptyState();
  newGrid.innerHTML = filtered.length
    ? [...filtered].reverse().slice(0, 8).map((item) => creationCard(item)).join("")
    : emptyState();
  bindCreationCards();
}

function creationCard(item, index = 0) {
  return `<article class="creation-card${index === 0 ? " is-leading" : ""}${item.hasPublishedCover ? " has-book-cover" : ""}" data-creation-id="${escapeAttribute(item.id)}">
    <button class="card-art" type="button" aria-label="View ${escapeAttribute(item.title)} details" style="--card-image:url('${escapeCssUrl(item.image)}')">
      ${index === 0 ? '<span class="rank-badge">1</span>' : ""}
      <span class="creation-type">${escapeHtml(item.type)}</span>
      <span class="card-play" aria-hidden="true">&#9654;</span>
    </button>
    <div class="card-copy">
      <h3>${escapeHtml(item.title)}</h3>
      <p>by ${escapeHtml(item.creator)}</p>
      <a href="/planet-hub.html?planet=${encodeURIComponent(item.planet.toLowerCase())}">&#10022; Planet ${escapeHtml(item.planet)}</a>
      <div><span>&#9733; ${item.rating.toFixed(1)}</span><span>&#9829; ${escapeHtml(item.views)}</span></div>
    </div>
  </article>`;
}

function renderCategories() {
  document.querySelector("#categoryGrid").innerHTML = CATEGORIES.map(([type, label, count, icon, image]) => `
    <button class="category-card" type="button" data-category="${type}" style="--category-image:url('${image}')">
      <span>${icon}</span><strong>${label}</strong><small>${count} creations</small>
    </button>`).join("");
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => setType(button.dataset.category)));
}

function renderCreators() {
  const creators = [
    ["Mal", "5.4K", "/assets/character-creator/styles/anime.png"],
    ["Nova", "4.1K", "/assets/homepage/mascot/orbit.png"],
    ["Zane", "3.8K", "/assets/studio/orbit/orbit-celebrate.png"],
    ["Luna", "3.2K", "/assets/studio/orbit/orbit-default.png"],
  ];
  document.querySelector("#topCreators").innerHTML = creators.map(([name, followers, image], index) => `
    <article><b>${index + 1}</b><img src="${image}" alt="" /><div><strong>${name}</strong><span>${followers} followers</span></div><button type="button">Follow</button></article>`).join("");
  document.querySelectorAll("#topCreators button").forEach((button) => button.addEventListener("click", () => {
    button.classList.toggle("is-following");
    button.textContent = button.classList.contains("is-following") ? "Following" : "Follow";
  }));
}

function renderHero() {
  const featured = creations.slice(0, 5);
  if (!featured.length) return;
  heroIndex %= featured.length;
  const item = featured[heroIndex];
  const featuredHero = document.querySelector("#featuredHero");
  featuredHero.style.setProperty("--hero-image", `url("${item.image}")`);
  featuredHero.classList.toggle("has-book-cover", item.hasPublishedCover);
  document.querySelector("#featuredTitle").textContent = item.title;
  document.querySelector("#featuredDescription").textContent = item.description;
  document.querySelector("#featuredCreator").textContent = item.creator;
  document.querySelector("#featuredPlanet").textContent = `✦ Planet ${item.planet}`;
  document.querySelector("#featuredPlanet").href = `/planet-hub.html?planet=${encodeURIComponent(item.planet.toLowerCase())}`;
  document.querySelector("#featuredPlay").href = item.url;
  document.querySelector("#featuredPlay").textContent = `▶ ${playLabel(item.type)}`;
  document.querySelector("#heroDots").innerHTML = featured.map((_, index) => `<button type="button" data-hero-index="${index}" class="${index === heroIndex ? "is-active" : ""}" aria-label="Show featured creation ${index + 1}"></button>`).join("");
  document.querySelectorAll("[data-hero-index]").forEach((button) => button.addEventListener("click", () => {
    heroIndex = Number(button.dataset.heroIndex);
    renderHero();
    restartHeroTimer();
  }));
}

function bindCreationCards() {
  document.querySelectorAll("[data-creation-id] .card-art").forEach((button) => button.addEventListener("click", () => {
    const id = button.closest("[data-creation-id]").dataset.creationId;
    const item = creations.find((creation) => creation.id === id);
    if (item) openCreationModal(item);
  }));
}

function openCreationModal(item) {
  document.querySelector("#modalArt").style.backgroundImage = `url("${item.image}")`;
  document.querySelector("#modalType").textContent = `${item.type} · ${item.genre} · Ages ${item.age}`;
  document.querySelector("#modalTitle").textContent = item.title;
  document.querySelector("#modalDescription").textContent = item.description;
  document.querySelector("#modalPlay").href = item.url;
  document.querySelector("#modalPlay").textContent = playLabel(item.type);
  document.querySelector("#modalPlanet").href = `/planet-hub.html?planet=${encodeURIComponent(item.planet.toLowerCase())}`;
  document.querySelector("#creationModal").hidden = false;
}

function setType(type) {
  activeType = type;
  document.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.type === type));
  render();
}

async function loadCreations() {
  try {
    const response = await fetch("/api/creations?status=approved&limit=80");
    const data = await response.json();
    if (response.ok && data.ok && data.creations?.length) {
      const live = data.creations.map(normalizeCreation);
      creations = [...live, ...FALLBACK_CREATIONS.filter((fallback) => !live.some((item) => item.title === fallback.title))];
    }
  } catch {
    // Curated content keeps RealmVerse useful while offline.
  }
  creations = creations.map(normalizeCreation);
  renderHero();
  render();
  restartHeroTimer();
}

function restartHeroTimer() {
  window.clearInterval(heroTimer);
  heroTimer = window.setInterval(() => {
    heroIndex = (heroIndex + 1) % Math.min(5, creations.length);
    renderHero();
  }, 9000);
}

function creationUrl(type) {
  return type === "story" ? "/ai-storybook.html" : type === "world" ? "/galaxy.html" : type === "music" ? "/studio/music.html" : "/story-game.html";
}

function playLabel(type) {
  return type === "movie" ? "Watch Movie" : type === "music" ? "Play Music" : type === "world" ? "Explore World" : type === "comic" ? "Read Comic" : type === "game" ? "Play Game" : "Play Story";
}

function planetForType(type) {
  return ({ story: "Lumora", movie: "Aethera", music: "Mechalon", game: "Frozora", comic: "Verdantia", world: "Infernia" })[type] || "Lumora";
}

function genreFromTags(tags) {
  const value = String(tags || "").toLowerCase();
  return ["Adventure", "Fantasy", "Sci-Fi", "Mystery", "Comedy"].find((genre) => value.includes(genre.toLowerCase())) || "";
}

function fallbackImage(type, index) {
  const pools = {
    story: ["/assets/home-path-story-games.png", "/assets/character-creator/environments/fantasy-grove.png"],
    movie: ["/assets/studio/cards/card-movies.png", "/assets/studio/thumbnails/thumb-space-adventure.png"],
    music: ["/assets/studio/cards/card-music.png", "/assets/studio/thumbnails/thumb-neon-beat.png"],
    game: ["/assets/studio/cards/card-games.png", "/assets/project-space-shooter-cover.png"],
    comic: ["/assets/homepage/tools/asset-library.png"],
    world: ["/assets/character-creator/environments/sky-islands.png", "/assets/character-creator/environments/enchanted-forest.png"],
  };
  const images = pools[type] || pools.story;
  return images[index % images.length];
}

function emptyState() {
  return '<div class="empty-discovery"><strong>No creations found in this realm.</strong><span>Try another search or filter.</span></div>';
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeCssUrl(value) {
  return String(value || "").replace(/['"\\()]/g, "");
}

document.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => setType(button.dataset.type)));
document.querySelectorAll("[data-scroll-target]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "center" })));
[searchInput, genreFilter, ageFilter].forEach((control) => control.addEventListener(control === searchInput ? "input" : "change", render));
document.querySelector("#clearFiltersButton").addEventListener("click", () => {
  searchInput.value = "";
  genreFilter.value = "all";
  ageFilter.value = "all";
  setType("all");
});
document.querySelector("#featuredInfoButton").addEventListener("click", () => openCreationModal(creations[heroIndex]));
document.querySelector("#closeCreationModal").addEventListener("click", () => document.querySelector("#creationModal").hidden = true);
document.querySelector("#creationModal").addEventListener("click", (event) => {
  if (event.target.id === "creationModal") event.currentTarget.hidden = true;
});
document.querySelector("#realmMenuButton").addEventListener("click", (event) => {
  const open = document.querySelector("#realmSidebar").classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    document.querySelector("#creationModal").hidden = true;
    document.querySelector("#realmSidebar").classList.remove("is-open");
  }
});

renderCategories();
renderCreators();
loadCreations();
