const summaryName = document.querySelector("#summaryName");
const summaryEmail = document.querySelector("#summaryEmail");
const tierLabel = document.querySelector("#tierLabel");
const tierDescription = document.querySelector("#tierDescription");
const creditsLabel = document.querySelector("#creditsLabel");
const safetyLabel = document.querySelector("#safetyLabel");
const profileForm = document.querySelector("#profileForm");
const passwordForm = document.querySelector("#passwordForm");
const profileStatus = document.querySelector("#profileStatus");
const passwordStatus = document.querySelector("#passwordStatus");
const logoutButton = document.querySelector("#logoutButton");

const tierCopy = {
  explorer: "Free safety-first access with starter credits and beginner onboarding.",
  creator: "Creator Membership access for one creation path, reviewed library submissions and AI tools.",
  pro: "Creator Pro access for the full course library, priority AI tools and advanced support.",
  elite: "Elite Creator Intensive access with guided mentorship and advanced project support.",
};

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
  const response = await fetch("/api/account");
  const data = await response.json();

  if (!data.authenticated) {
    location.href = "/login.html";
    return;
  }

  const user = data.user;
  const tier = user.tier || "explorer";
  summaryName.textContent = user.displayName || "OPREALM Creator";
  summaryEmail.textContent = user.email || "";
  tierLabel.textContent = formatTier(tier);
  tierDescription.textContent = tierCopy[tier] || tierCopy.explorer;
  creditsLabel.textContent = String(user.creditsRemaining ?? 0);
  safetyLabel.textContent = user.safetyCompleted ? "Complete" : "Not complete yet";

  profileForm.elements.displayName.value = user.displayName || "";
  profileForm.elements.parentEmail.value = user.parentEmail || "";
  profileForm.elements.ageBand.value = user.ageBand || "parent";
}

function formatTier(tier) {
  return {
    explorer: "Explorer Pass",
    creator: "Creator Membership",
    pro: "Creator Pro",
    elite: "Elite Creator",
    intensive: "Elite Creator",
  }[tier] || "Explorer Pass";
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileStatus.textContent = "Saving profile...";
  try {
    await accountRequest("update_profile", Object.fromEntries(new FormData(profileForm).entries()));
    profileStatus.textContent = "Profile saved.";
    await loadAccount();
  } catch (error) {
    profileStatus.textContent = error.message;
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordStatus.textContent = "Updating password...";
  try {
    await accountRequest("change_password", Object.fromEntries(new FormData(passwordForm).entries()));
    passwordStatus.textContent = "Password updated.";
    passwordForm.reset();
  } catch (error) {
    passwordStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await accountRequest("logout");
  location.href = "/login.html";
});

loadAccount().catch(() => {
  location.href = "/login.html";
});
