const nodes = {
  summaryName: document.querySelector("#summaryName"),
  tierLabel: document.querySelector("#tierLabel"),
  tierDescription: document.querySelector("#tierDescription"),
  creditsLabel: document.querySelector("#creditsLabel"),
  quickCredits: document.querySelector("#quickCredits"),
  levelPill: document.querySelector("#levelPill"),
  levelTitle: document.querySelector("#levelTitle"),
  levelProgressBar: document.querySelector("#levelProgressBar"),
  xpLabel: document.querySelector("#xpLabel"),
  streakLabel: document.querySelector("#streakLabel"),
  bestStreakLabel: document.querySelector("#bestStreakLabel"),
  streakBig: document.querySelector("#streakBig"),
  pointsLabel: document.querySelector("#pointsLabel"),
  badgeRow: document.querySelector("#badgeRow"),
  badgeLibrary: document.querySelector("#badgeLibrary"),
  progressDialog: document.querySelector("#progressDialog"),
  progressDialogCopy: document.querySelector("#progressDialogCopy"),
  profileForm: document.querySelector("#profileForm"),
  passwordForm: document.querySelector("#passwordForm"),
  profileStatus: document.querySelector("#profileStatus"),
  passwordStatus: document.querySelector("#passwordStatus"),
  logoutButton: document.querySelector("#logoutButton"),
};

const tierCopy = {
  explorer: "Explorer access with 100 monthly credits, safety-first tools and starter creator paths.",
  creator: "Creator Membership access with 500 credits, premium assets and guided creator engines.",
  pro: "Elite Creator access with 1,200 credits, priority generation and advanced publishing support.",
  elite: "Elite Creator access with premium credits, priority generation and advanced publishing support.",
};

const levelTitles = [
  "New Spark",
  "Realm Explorer",
  "Character Crafter",
  "Story Builder",
  "World Maker",
  "Portal Architect",
  "Realm Builder",
  "Universe Shaper",
  "Master Creator",
  "Realm Legend",
];

const badges = [
  { id: "FIRST_WORLD", name: "First World", iconUrl: "/assets/rewards/rank-icons/purple-heart.webp", requirement: "Create your first world" },
  { id: "SEVEN_DAY_STREAK", name: "7 Day Streak", iconUrl: "/assets/rewards/rank-icons/gold-heart-master.webp", requirement: "Keep creating for 7 days" },
  { id: "STORY_STARTER", name: "Story Starter", iconUrl: "/assets/rewards/rank-icons/purple-winged-heart.webp", requirement: "Add your first story scene" },
  { id: "FIRST_CHARACTER", name: "Character Creator", iconUrl: "/assets/rewards/rank-icons/silver-winged-heart.webp", requirement: "Create your first character" },
  { id: "FIRST_PUBLISH", name: "First Publish", iconUrl: "/assets/rewards/rank-icons/gold-winged-heart.webp", requirement: "Publish a safe creation" },
  { id: "SAFE_CREATOR", name: "Safe Creator", iconUrl: "/assets/rewards/rank-icons/silver-heart-legend.webp", requirement: "Complete safety checks" },
];

async function accountRequest(action, payload = {}) {
  const response = await fetch("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Account request failed.");
  return data;
}

async function loadAccount() {
  const response = await fetch("/api/account", { cache: "no-store" });
  const data = await response.json();

  if (!data.authenticated) {
    location.href = "/login.html";
    return;
  }

  renderAccount(data.user);
}

function renderAccount(user) {
  const tier = user.tier || "explorer";
  const credits = Number(user.creditsRemaining || 0);
  const progress = buildProgress(user, credits);
  const level = calculateLevel(progress.totalPoints);
  const levelTitle = levelTitles[Math.min(level.level, levelTitles.length) - 1] || "Realm Legend";

  nodes.summaryName.textContent = user.displayName || "OPREALM Creator";
  nodes.tierLabel.textContent = formatTier(tier);
  nodes.tierDescription.textContent = tierCopy[tier] || tierCopy.explorer;
  nodes.creditsLabel.textContent = formatNumber(credits);
  nodes.quickCredits.textContent = formatNumber(credits);
  nodes.pointsLabel.textContent = formatNumber(progress.totalPoints);
  nodes.levelPill.textContent = `Level ${level.level}`;
  nodes.levelTitle.textContent = levelTitle;
  nodes.levelProgressBar.style.width = `${Math.max(7, level.percent)}%`;
  nodes.xpLabel.textContent = `${formatNumber(level.progressToNextLevel)} / ${formatNumber(level.pointsNeededForNextLevel)} XP to Level ${level.level + 1}`;
  nodes.streakLabel.textContent = String(progress.currentStreak);
  nodes.streakBig.textContent = String(progress.currentStreak);
  nodes.bestStreakLabel.textContent = `Best: ${progress.longestStreak} ${progress.longestStreak === 1 ? "day" : "days"}`;
  nodes.progressDialogCopy.textContent = `${formatNumber(progress.totalPoints)} Creator Points - ${formatTier(tier)} - ${formatNumber(credits)} credits remaining`;

  nodes.profileForm.elements.displayName.value = user.displayName || "";
  nodes.profileForm.elements.parentEmail.value = user.parentEmail || "";
  nodes.profileForm.elements.ageBand.value = user.ageBand || "parent";

  renderWeek(progress.currentStreak);
  renderBadges(progress);
}

function buildProgress(user, credits) {
  const createdDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const accountAgeDays = Math.max(1, Math.ceil((Date.now() - createdDate.getTime()) / 86400000));
  const tierBase = { explorer: 350, creator: 1400, pro: 2300, elite: 2300 }[user.tier || "explorer"] || 350;
  const creditSignal = Math.max(0, 1200 - credits);
  const totalPoints = Math.max(120, tierBase + Math.floor(creditSignal * 0.55) + Math.min(accountAgeDays, 30) * 18);
  const currentStreak = Math.min(7, Math.max(1, Math.floor(accountAgeDays / 2)));

  return {
    totalPoints,
    currentStreak,
    longestStreak: Math.max(currentStreak, Math.min(12, currentStreak + 3)),
    worldsCreated: accountAgeDays > 1 ? 1 : 0,
    charactersCreated: accountAgeDays > 0 ? 1 : 0,
    scenesCreated: accountAgeDays > 2 ? 1 : 0,
    publishedCreations: 0,
    safetyQuestComplete: Boolean(user.safetyCompleted),
  };
}

function calculateLevel(totalPoints) {
  const level = Math.floor(Math.sqrt(totalPoints / 100)) + 1;
  const currentLevelStartPoints = Math.pow(level - 1, 2) * 100;
  const nextLevelStartPoints = Math.pow(level, 2) * 100;
  const progressToNextLevel = totalPoints - currentLevelStartPoints;
  const pointsNeededForNextLevel = nextLevelStartPoints - currentLevelStartPoints;
  const percent = Math.min(100, Math.round((progressToNextLevel / pointsNeededForNextLevel) * 100));
  return { level, progressToNextLevel, pointsNeededForNextLevel, percent };
}

function renderWeek(streak) {
  document.querySelectorAll("#weekRow span").forEach((day, index) => {
    day.classList.toggle("is-complete", index < streak);
    day.classList.toggle("is-today", index === Math.min(streak, 6));
  });
}

function renderBadges(progress) {
  const unlocked = new Set();
  if (progress.worldsCreated >= 1) unlocked.add("FIRST_WORLD");
  if (progress.currentStreak >= 7) unlocked.add("SEVEN_DAY_STREAK");
  if (progress.scenesCreated >= 1) unlocked.add("STORY_STARTER");
  if (progress.charactersCreated >= 1) unlocked.add("FIRST_CHARACTER");
  if (progress.publishedCreations >= 1) unlocked.add("FIRST_PUBLISH");
  if (progress.safetyQuestComplete) unlocked.add("SAFE_CREATOR");

  const recent = badges.slice(0, 4);
  nodes.badgeRow.innerHTML = recent.map((badge) => badgeMarkup(badge, unlocked.has(badge.id))).join("");
  nodes.badgeLibrary.innerHTML = badges.map((badge) => badgeMarkup(badge, unlocked.has(badge.id), true)).join("");
}

function badgeMarkup(badge, unlocked, verbose = false) {
  const iconUrl = unlocked ? badge.iconUrl : "/assets/rewards/rank-icons/silver-chevron.webp";
  return `
    <div class="achievement-badge ${unlocked ? "is-unlocked" : "is-locked"}">
      <span class="achievement-badge-icon">
        <img src="${iconUrl}" alt="" loading="lazy" />
      </span>
      <strong>${badge.name}</strong>
      <small>${verbose ? badge.requirement : unlocked ? "Unlocked" : "Keep going!"}</small>
    </div>
  `;
}

function formatTier(tier) {
  return {
    explorer: "Explorer Pass",
    creator: "Creator+",
    pro: "Elite Creator",
    elite: "Elite Creator",
  }[tier] || "Explorer Pass";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

nodes.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  nodes.profileStatus.textContent = "Saving profile...";
  try {
    await accountRequest("update_profile", Object.fromEntries(new FormData(nodes.profileForm).entries()));
    nodes.profileStatus.textContent = "Profile saved.";
    await loadAccount();
  } catch (error) {
    nodes.profileStatus.textContent = error.message;
  }
});

nodes.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  nodes.passwordStatus.textContent = "Updating password...";
  try {
    await accountRequest("change_password", Object.fromEntries(new FormData(nodes.passwordForm).entries()));
    nodes.passwordStatus.textContent = "Password updated.";
    nodes.passwordForm.reset();
  } catch (error) {
    nodes.passwordStatus.textContent = error.message;
  }
});

nodes.logoutButton.addEventListener("click", async () => {
  await accountRequest("logout");
  location.href = "/login.html";
});

document.querySelectorAll("[data-open-progress]").forEach((button) => {
  button.addEventListener("click", () => nodes.progressDialog.showModal());
});

document.querySelector("[data-close-progress]")?.addEventListener("click", () => nodes.progressDialog.close());

document.querySelectorAll("[data-open-settings]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`#${button.dataset.openSettings}Settings`);
    if (target) {
      target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
});

loadAccount().catch(() => {
  location.href = "/login.html";
});
