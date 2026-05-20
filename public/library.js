const libraryGrid = document.querySelector("#libraryGrid");
const libraryCount = document.querySelector("#libraryCount");
const librarySearch = document.querySelector("#librarySearch");
const libraryType = document.querySelector("#libraryType");

const fallbackCreations = [
  {
    title: "Pixel Moon Quest",
    type: "pixel_game",
    description: "A sample 2D platform adventure showing how OPREALM creations will appear after review.",
    thumbnail_url: "/assets/project-pixel-quest-cover.png",
    media_url: "",
  },
  {
    title: "Dragon Realm Trailer Pack",
    type: "trailer",
    description: "A sample trailer concept with scenes, music direction and a safe showcase plan.",
    thumbnail_url: "/assets/project-dragon-realm-cover.png",
    media_url: "",
  },
  {
    title: "Cosmic Coin Loop",
    type: "music",
    description: "A sample upbeat game music loop slot for future approved member creations.",
    thumbnail_url: "/assets/project-space-shooter-cover.png",
    media_url: "",
  },
];

let creations = [];

function typeLabel(type) {
  return String(type || "creation").replace(/_/g, " ");
}

function renderLibrary() {
  const query = librarySearch.value.trim().toLowerCase();
  const type = libraryType.value;
  const filtered = creations.filter((creation) => {
    const text = `${creation.title} ${creation.type} ${creation.description}`.toLowerCase();
    return (type === "all" || creation.type === type) && (!query || text.includes(query));
  });

  libraryCount.textContent = String(filtered.length);
  libraryGrid.innerHTML = filtered.length
    ? filtered
        .map(
          (creation) => `
            <article class="builder-card library-card">
              <div class="library-cover">
                ${
                  creation.thumbnail_url
                    ? `<img src="${creation.thumbnail_url}" alt="${creation.title} cover" loading="lazy" />`
                    : `<div class="cover-placeholder" aria-hidden="true">${typeLabel(creation.type).slice(0, 2).toUpperCase()}</div>`
                }
              </div>
              <div class="library-card-body">
              <p class="eyebrow">${typeLabel(creation.type)}</p>
              <h3>${creation.title}</h3>
              <p>${creation.description}</p>
              ${
                creation.media_url
                  ? `<a class="button button-secondary" href="${creation.media_url}" target="_blank" rel="noopener">Open Creation</a>`
                  : ""
              }
              </div>
            </article>
          `,
        )
        .join("")
    : `
      <article class="builder-card">
        <p class="eyebrow">No results</p>
        <h3>No approved creations found</h3>
        <p>Try a different search or check back after new projects are reviewed.</p>
      </article>
    `;
}

async function loadLibrary() {
  try {
    const response = await fetch("/api/creations?status=approved&limit=60");
    const data = await response.json();
    creations = data.ok && data.creations?.length ? data.creations : fallbackCreations;
  } catch {
    creations = fallbackCreations;
  }
  renderLibrary();
}

librarySearch.addEventListener("input", renderLibrary);
libraryType.addEventListener("change", renderLibrary);
loadLibrary();
