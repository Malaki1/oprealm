const forms = {
  login: document.querySelector("#loginForm"),
  register: document.querySelector("#registerForm"),
};

const statuses = {
  login: document.querySelector("#loginStatus"),
  register: document.querySelector("#registerStatus"),
};

const turnstileWidgets = {};
let config = {};

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

  const renderWhenReady = () => {
    if (!window.turnstile) {
      setTimeout(renderWhenReady, 100);
      return;
    }

    document.querySelectorAll("[data-turnstile]").forEach((slot) => {
      const name = slot.dataset.turnstile;
      try {
        turnstileWidgets[name] = window.turnstile.render(slot, {
          sitekey: config.turnstileSiteKey,
          theme: "dark",
          appearance: "always",
          callback: () => {
            if (statuses[name]) statuses[name].textContent = "";
          },
          "error-callback": () => {
            if (statuses[name]) statuses[name].textContent = "Human verification could not load. Please refresh and try again.";
          },
          "expired-callback": () => {
            if (statuses[name]) statuses[name].textContent = "Human verification expired. Please complete it again.";
          },
        });
      } catch (error) {
        slot.textContent = "Human verification could not load. Please refresh and try again.";
        slot.classList.add("turnstile-missing");
      }
    });
  };

  renderWhenReady();
}

function turnstileToken(name) {
  if (!window.turnstile || !turnstileWidgets[name]) return "";
  return window.turnstile.getResponse(turnstileWidgets[name]);
}

function resetTurnstile(name) {
  if (window.turnstile && turnstileWidgets[name]) window.turnstile.reset(turnstileWidgets[name]);
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
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Account request failed.");
  return data;
}

forms.login.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.login.textContent = "Checking account...";
  try {
    await postAccount("login", { ...formData(forms.login), turnstileToken: turnstileToken("login") });
    statuses.login.textContent = "Logged in. Opening the Studio...";
    location.href = "/studio";
  } catch (error) {
    statuses.login.textContent = error.message;
    resetTurnstile("login");
  }
});

forms.register.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.register.textContent = "Creating account...";
  try {
    await postAccount("register", { ...formData(forms.register), turnstileToken: turnstileToken("register") });
    statuses.register.textContent = "Account created. Opening memberships...";
    location.href = "/billing";
  } catch (error) {
    statuses.register.textContent = error.message;
    resetTurnstile("register");
  }
});

loadConfig();
