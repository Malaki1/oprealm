const resetForm = document.querySelector("#resetRequestForm");
const resetStatus = document.querySelector("#resetRequestStatus");
let config = {};

async function loadConfig() {
  const response = await fetch("/api/site-config");
  config = await response.json();

  if (!config.turnstileSiteKey) {
    const slot = document.querySelector("[data-turnstile='reset']");
    slot.textContent = "Human verification key is not configured yet.";
    slot.classList.add("turnstile-missing");
    return;
  }

  const slot = document.querySelector("[data-turnstile='reset']");
  slot.classList.add("cf-turnstile");
  slot.dataset.sitekey = config.turnstileSiteKey;
  slot.dataset.theme = "dark";
  slot.dataset.appearance = "always";

  loadTurnstileScript();
}

function loadTurnstileScript() {
  if (document.querySelector("script[data-turnstile-api]")) return;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileApi = "true";
  script.onerror = () => {
    const slot = document.querySelector("[data-turnstile='reset']");
    slot.textContent = "Human verification could not load. Please refresh and try again.";
    slot.classList.add("turnstile-missing");
  };
  document.head.append(script);
}

function turnstileToken() {
  return document.querySelector("[data-turnstile='reset'] [name='cf-turnstile-response']")?.value || document.querySelector("[name='cf-turnstile-response'][value]")?.value || "";
}

async function waitForTurnstileToken() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = turnstileToken();
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "";
}

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetStatus.textContent = "Preparing reset email...";

  const payload = {
    action: "request_reset",
    email: new FormData(resetForm).get("email"),
    turnstileToken: await waitForTurnstileToken(),
  };

  try {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Reset request failed.");
    resetStatus.textContent = data.emailConfigured
      ? "If that account exists, reset instructions have been sent."
      : "Reset flow is ready, but email sending is not configured yet.";
  } catch (error) {
    resetStatus.textContent = error.message;
    const slot = document.querySelector("[data-turnstile='reset']");
    if (window.turnstile && slot) window.turnstile.reset(slot);
  }
});

loadConfig();
