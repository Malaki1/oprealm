const libraryGrid = document.querySelector("#libraryGrid");
const libraryCount = document.querySelector("#libraryCount");
const librarySearch = document.querySelector("#librarySearch");
const libraryType = document.querySelector("#libraryType");
const libraryPrice = document.querySelector("#libraryPrice");
const marketplaceForm = document.querySelector("#marketplaceForm");
const marketStatus = document.querySelector("#marketStatus");

const fallbackListings = [
  {
    title: "Lava Portal Checkpoint Pack",
    type: "roblox_asset",
    description: "A sample Roblox-style checkpoint, portal and lava platform kit for future approved marketplace assets.",
    thumbnail_url: "/assets/project-obby-adventure-cover.png",
    asset_url: "",
    price_cents: 499,
    currency: "USD",
    license: "oprealm_remix",
    seller_name: "OPREALM Studio",
  },
  {
    title: "Fantasy Quest UI Kit",
    type: "ui_kit",
    description: "A sample story-game banner, button and panel pack that shows how UI assets can be sold after review.",
    thumbnail_url: "/assets/home-path-story-games.png",
    asset_url: "",
    price_cents: 299,
    currency: "USD",
    license: "personal_use",
    seller_name: "OPREALM Studio",
  },
  {
    title: "Cosmic Coin Loop",
    type: "music_loop",
    description: "A sample upbeat game loop listing slot for future approved member music assets.",
    thumbnail_url: "/assets/project-space-shooter-cover.png",
    asset_url: "",
    price_cents: 0,
    currency: "USD",
    license: "personal_use",
    seller_name: "OPREALM Studio",
  },
];

let listings = [];

function typeLabel(type) {
  return String(type || "asset").replace(/_/g, " ");
}

function licenseLabel(license) {
  return String(license || "personal_use").replace(/_/g, " ");
}

function priceLabel(listing) {
  const cents = Number(listing.price_cents || 0);
  if (cents <= 0) return "Free";
  const currency = listing.currency || "USD";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function renderLibrary() {
  const query = librarySearch.value.trim().toLowerCase();
  const type = libraryType.value;
  const price = libraryPrice.value;
  const filtered = listings.filter((listing) => {
    const text = `${listing.title} ${listing.type} ${listing.description} ${listing.tags || ""} ${listing.seller_name || ""}`.toLowerCase();
    const priceCents = Number(listing.price_cents || 0);
    const priceMatch = price === "all" || (price === "free" && priceCents <= 0) || (price === "paid" && priceCents > 0);
    return (type === "all" || listing.type === type) && priceMatch && (!query || text.includes(query));
  });

  libraryCount.textContent = String(filtered.length);
  libraryGrid.innerHTML = filtered.length
    ? filtered.map(renderListingCard).join("")
    : `
      <article class="builder-card">
        <p class="eyebrow">No results</p>
        <h3>No approved assets found</h3>
        <p>Try a different search or submit the first asset for review.</p>
      </article>
    `;
}

function renderListingCard(listing) {
  return `
    <article class="builder-card library-card marketplace-card">
      <div class="library-cover">
        ${
          listing.thumbnail_url
            ? `<img src="${escapeAttribute(listing.thumbnail_url)}" alt="${escapeAttribute(listing.title)} preview" loading="lazy" />`
            : `<div class="cover-placeholder" aria-hidden="true">${typeLabel(listing.type).slice(0, 2).toUpperCase()}</div>`
        }
        <span class="market-price">${escapeHtml(priceLabel(listing))}</span>
      </div>
      <div class="library-card-body">
        <p class="eyebrow">${escapeHtml(typeLabel(listing.type))}</p>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml(listing.description)}</p>
        <div class="market-meta">
          <span>${escapeHtml(listing.seller_name || "OPREALM Creator")}</span>
          <span>${escapeHtml(licenseLabel(listing.license))}</span>
        </div>
        ${
          listing.asset_url
            ? `<a class="button button-secondary" href="${escapeAttribute(listing.asset_url)}" target="_blank" rel="noopener">View Asset</a>`
            : `<button class="button button-secondary" type="button" disabled>Review Preview</button>`
        }
      </div>
    </article>
  `;
}

async function loadLibrary() {
  try {
    const response = await fetch("/api/marketplace?status=approved&limit=80");
    const data = await response.json();
    listings = data.ok && data.listings?.length ? data.listings : fallbackListings;
  } catch {
    listings = fallbackListings;
  }
  renderLibrary();
}

async function submitListing(event) {
  event.preventDefault();
  marketStatus.textContent = "Submitting marketplace listing for review...";

  const payload = {
    title: document.querySelector("#marketTitle").value,
    type: document.querySelector("#marketType").value,
    price: document.querySelector("#marketPrice").value,
    currency: document.querySelector("#marketCurrency").value,
    thumbnailUrl: document.querySelector("#marketThumbnail").value,
    assetUrl: document.querySelector("#marketAssetUrl").value,
    license: document.querySelector("#marketLicense").value,
    tags: document.querySelector("#marketTags").value,
    description: document.querySelector("#marketDescription").value,
  };

  try {
    const response = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not submit listing.");
    marketplaceForm.reset();
    marketStatus.textContent = "Listing submitted. It will appear in the marketplace after OPREALM review.";
  } catch (error) {
    marketStatus.textContent = error.message || "Could not submit listing right now.";
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

librarySearch.addEventListener("input", renderLibrary);
libraryType.addEventListener("change", renderLibrary);
libraryPrice.addEventListener("change", renderLibrary);
marketplaceForm?.addEventListener("submit", submitListing);
loadLibrary();
