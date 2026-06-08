const recipes = [
  {
    id: "stormbyte-lure",
    name: "Stormbyte Lure",
    rarity: "Epic",
    category: "lures",
    type: "Lure",
    owned: 2,
    cost: 250,
    use: "Attracts Stormbyte and increases encounter chance.",
    description: "A special lure that attracts Stormbyte and Electric-type beasts.",
    bestBeast: "Stormbyte",
    bestCopy: "Electric Beast - Encounter Chance: High",
    requirement: "Player Level 15+ - Ready",
    ingredients: [
      { name: "Glowberry", owned: 12, needed: 5 },
      { name: "Thunder Moss", owned: 8, needed: 3 },
      { name: "Moon Nectar", owned: 7, needed: 2 },
    ],
  },
  {
    id: "dream-mist-dart",
    name: "Dream Mist Dart",
    rarity: "Rare",
    category: "tranquilizers",
    type: "Tranquilizer",
    owned: 6,
    cost: 180,
    use: "Safely slows spooky or dream beasts during encounters.",
    description: "A gentle dart that releases a sleepy mist for careful captures.",
    bestBeast: "Sporetail",
    bestCopy: "Dream Beast - Capture Control: Medium",
    requirement: "Player Level 10+ - Ready",
    ingredients: [
      { name: "Dream Petal", owned: 5, needed: 2 },
      { name: "Moon Nectar", owned: 7, needed: 2 },
      { name: "Windfeather", owned: 6, needed: 1 },
    ],
  },
  {
    id: "calming-spray",
    name: "Calming Spray",
    rarity: "Uncommon",
    category: "tranquilizers",
    type: "Calming Tool",
    owned: 4,
    cost: 120,
    use: "Reduces panic during beast encounters.",
    description: "A safe calming mist for nervous or startled beasts.",
    bestBeast: "Windwhisk",
    bestCopy: "Fast Beast - Calm Chance: Medium",
    requirement: "Player Level 5+ - Ready",
    ingredients: [
      { name: "Glowberry", owned: 12, needed: 3 },
      { name: "Crystal Flower", owned: 9, needed: 2 },
      { name: "Moon Nectar", owned: 7, needed: 1 },
    ],
  },
  {
    id: "footprint-tracker",
    name: "Footprint Tracker",
    rarity: "Uncommon",
    category: "tools",
    type: "Tracker",
    owned: 3,
    cost: 160,
    use: "Reveals nearby tracks and clue direction.",
    description: "A pocket scanner that makes hidden beast trails easier to follow.",
    bestBeast: "Any Native Beast",
    bestCopy: "Tracking Tool - Clue Chance: Medium",
    requirement: "Player Level 6+ - Ready",
    ingredients: [
      { name: "Electric Crystal", owned: 3, needed: 1 },
      { name: "Thunder Moss", owned: 8, needed: 2 },
      { name: "Spark Root", owned: 4, needed: 1 },
    ],
  },
  {
    id: "rare-beast-detector",
    name: "Rare Beast Detector",
    rarity: "Rare",
    category: "tools",
    type: "Detector",
    owned: 1,
    cost: 320,
    use: "Highlights rare beast activity during migrations.",
    description: "A crystal-powered detector tuned for rare native species.",
    bestBeast: "Rare Beasts",
    bestCopy: "Detection Tool - Rare Signal: High",
    requirement: "Player Level 14+ - Ready",
    ingredients: [
      { name: "Electric Crystal", owned: 3, needed: 2 },
      { name: "Crystal Flower", owned: 9, needed: 3 },
      { name: "Windfeather", owned: 6, needed: 2 },
    ],
  },
  {
    id: "energy-snack",
    name: "Energy Boost Snack",
    rarity: "Common",
    category: "other",
    type: "Snack",
    owned: 9,
    cost: 80,
    use: "Restores stamina during long hunts.",
    description: "A crunchy snack for explorers and companion beasts.",
    bestBeast: "Companions",
    bestCopy: "Support Item - Energy Restore: Small",
    requirement: "Player Level 1+ - Ready",
    ingredients: [
      { name: "Spark Root", owned: 4, needed: 1 },
      { name: "Glowberry", owned: 12, needed: 2 },
      { name: "Thunder Moss", owned: 8, needed: 1 },
    ],
  },
];

const inventory = [
  ["Glowberry", 12],
  ["Thunder Moss", 8],
  ["Moon Nectar", 7],
  ["Crystal Flower", 9],
  ["Spark Root", 4],
  ["Windfeather", 6],
  ["Electric Crystal", 3],
  ["Dream Petal", 5],
];

const planetNames = {
  lumora: "Crystal Jungle Workshop",
  infernia: "Infernia Forge",
  skyterra: "Skyterra Cloud Workshop",
  slimoon: "Slimoon Mixing Lab",
  frozora: "Frozora Ice Workshop",
};

const params = new URLSearchParams(window.location.search);
const planetId = params.get("planet") || "lumora";
let activeCategory = "all";
let selectedRecipe = recipes[0];
let quantity = 1;

const recipeList = document.querySelector("#recipeList");
const ingredientRow = document.querySelector("#ingredientRow");
const inventoryList = document.querySelector("#inventoryList");
const categoryButtons = [...document.querySelectorAll("[data-category]")];

function filteredRecipes() {
  return activeCategory === "all" ? recipes : recipes.filter((recipe) => recipe.category === activeCategory);
}

function renderRecipes() {
  recipeList.innerHTML = filteredRecipes()
    .map((recipe) => `
      <button class="recipe-card ${recipe.id === selectedRecipe.id ? "is-active" : ""}" type="button" data-recipe="${recipe.id}">
        <span class="recipe-icon rarity-${recipe.rarity.toLowerCase()}"></span>
        <div><strong>${recipe.name}</strong><small>${recipe.rarity}</small></div>
        <em>You own: ${recipe.owned}</em>
      </button>
    `)
    .join("");

  [...recipeList.querySelectorAll("[data-recipe]")].forEach((button) => {
    button.addEventListener("click", () => {
      selectedRecipe = recipes.find((recipe) => recipe.id === button.dataset.recipe) || recipes[0];
      quantity = 1;
      renderAll();
    });
  });
}

function renderSelectedRecipe() {
  document.querySelector("#selectedRarity").textContent = selectedRecipe.rarity;
  document.querySelector("#selectedName").textContent = selectedRecipe.name;
  document.querySelector("#selectedDescription").textContent = selectedRecipe.description;
  document.querySelector("#itemPreview").className = `item-preview rarity-${selectedRecipe.rarity.toLowerCase()}`;
  document.querySelector("#craftCost").textContent = selectedRecipe.cost * quantity;
  document.querySelector("#quantityValue").textContent = quantity;
  document.querySelector("#aboutRarity").textContent = selectedRecipe.rarity;
  document.querySelector("#aboutType").textContent = selectedRecipe.type;
  document.querySelector("#aboutUse").textContent = selectedRecipe.use;
  document.querySelector("#bestBeast").textContent = selectedRecipe.bestBeast;
  document.querySelector("#bestBeastCopy").textContent = selectedRecipe.bestCopy;
  document.querySelector("#requirementLine").textContent = selectedRecipe.requirement;
  document.querySelector("#beastToken").className = `rarity-token rarity-${selectedRecipe.rarity.toLowerCase()}`;
}

function renderIngredients() {
  ingredientRow.innerHTML = selectedRecipe.ingredients
    .map((item) => {
      const needed = item.needed * quantity;
      const ready = item.owned >= needed;
      return `
        <article class="${ready ? "is-ready" : "is-short"}">
          <span></span>
          <strong>${item.name}</strong>
          <small>${item.owned} / ${needed}</small>
        </article>
      `;
    })
    .join("");
}

function renderInventory() {
  inventoryList.innerHTML = inventory
    .map(([name, count]) => `<article><span></span><strong>${name}</strong><small>${count}</small></article>`)
    .join("");
}

function renderAll() {
  renderRecipes();
  renderSelectedRecipe();
  renderIngredients();
  renderInventory();
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    categoryButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    const visible = filteredRecipes();
    selectedRecipe = visible.includes(selectedRecipe) ? selectedRecipe : visible[0] || recipes[0];
    renderAll();
  });
});

document.querySelector("#increaseQuantity").addEventListener("click", () => {
  quantity = Math.min(9, quantity + 1);
  renderAll();
});

document.querySelector("#decreaseQuantity").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  renderAll();
});

document.querySelector("#craftButton").addEventListener("click", () => {
  const canCraft = selectedRecipe.ingredients.every((item) => item.owned >= item.needed * quantity);
  document.querySelector("#bonusLine").textContent = canCraft
    ? `${selectedRecipe.name} queued. Mock inventory updates will arrive when storage is wired.`
    : `Not enough ingredients for ${quantity} ${selectedRecipe.name}.`;
});

document.querySelector("#discoverButton").addEventListener("click", () => {
  document.querySelector("#bonusLine").textContent = "Recipe discovery will use planet resources, player level and beast migration events.";
});

document.querySelector("#workshopName").textContent = planetNames[planetId] || planetNames.lumora;
document.querySelector("#backToHub").href = `/planet-hub.html?planet=${planetId}`;
document.querySelector("#huntLink").href = `/beast-hunt.html?planet=${planetId}`;
document.querySelector("#leaveLink").href = `/planet-hub.html?planet=${planetId}`;
document.querySelector("#recipesLink").href = `/crafting-station.html?planet=${planetId}`;

renderAll();
