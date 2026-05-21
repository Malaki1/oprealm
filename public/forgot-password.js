const resetForm = document.querySelector("#resetRequestForm");
const resetStatus = document.querySelector("#resetRequestStatus");
let resetWidget = null;
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

  const renderWhenReady = () => {
    if (!window.turnstile) {
      setTimeout(renderWhenReady, 100);
      return;
    }

    resetWidget = window.turnstile.render("[data-turnstile='reset']", {
      sitekey: config.turnstileSiteKey,
      theme: "dark",
      appearance: "always",
    });
  };

  renderWhenReady();
}

function turnstileToken() {
  if (!window.turnstile || !resetWidget) return "";
  return window.turnstile.getResponse(resetWidget);
}

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetStatus.textContent = "Preparing reset email...";

  const payload = {
    action: "request_reset",
    email: new FormData(resetForm).get("email"),
    turnstileToken: turnstileToken(),
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
    if (window.turnstile && resetWidget) window.turnstile.reset(resetWidget);
  }
});

loadConfig();
