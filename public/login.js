const forms = {
  login: document.querySelector("#loginForm"),
  register: document.querySelector("#registerForm"),
};

const statuses = {
  login: document.querySelector("#loginStatus"),
  register: document.querySelector("#registerStatus"),
};

let config = {};
const nextPath = safeNextPath(new URLSearchParams(location.search).get("next"));

function safeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
async function loadConfig() {
  const response = await fetch("/api/site-config");
  config = await response.json();

  if (!config.turnstileSiteKey) {
    document.querySelectorAll(".turnstile-slot").forEach((slot) => {
      slot.textContent = "Human verification key is not configured yet.";
      slot.classList.add("turnstile-missing");
    });
    return;
  }

  document.querySelectorAll("[data-turnstile]").forEach((slot) => {
    slot.classList.add("cf-turnstile");
    slot.dataset.sitekey = config.turnstileSiteKey;
    slot.dataset.theme = "dark";
    slot.dataset.appearance = "always";
  });

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
    document.querySelectorAll(".turnstile-slot").forEach((slot) => {
      slot.textContent = "Human verification could not load. Please refresh and try again.";
      slot.classList.add("turnstile-missing");
    });
  };
  document.head.append(script);
}

function turnstileToken(name) {
  const slot = document.querySelector(`[data-turnstile="${name}"]`);
  return slot?.querySelector("[name='cf-turnstile-response']")?.value || document.querySelector("[name='cf-turnstile-response'][value]")?.value || "";
}

async function waitForTurnstileToken(name) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = turnstileToken(name);
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "";
}

function resetTurnstile(name) {
  const slot = document.querySelector(`[data-turnstile="${name}"]`);
  if (window.turnstile && slot) window.turnstile.reset(slot);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function postAccount(action, payload) {
  const response = await fetch("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { ok: false, error: "The account service is not responding correctly yet. Please ask an OPRealm admin to apply the latest deployment and database update." };

  if (!response.ok || !data.ok) throw new Error(data.error || "Account request failed.");
  return data;
}

forms.login.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.login.textContent = "Checking account...";
  try {
    await postAccount("login", formData(forms.login));
    statuses.login.textContent = "Logged in. Opening your account...";
    location.href = nextPath || "/account";
  } catch (error) {
    statuses.login.textContent = error.message;
  }
});

forms.register.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.register.textContent = "Creating account...";
  try {
    const token = await waitForTurnstileToken("register");
    await postAccount("register", { ...formData(forms.register), turnstileToken: token });
    statuses.register.textContent = nextPath ? "Account created. Opening your workspace..." : "Account created. Opening memberships...";
    location.href = nextPath || "/billing";
  } catch (error) {
    statuses.register.textContent = error.message;
    resetTurnstile("register");
  }
});

loadConfig();
