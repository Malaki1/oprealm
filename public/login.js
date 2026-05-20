const forms = {
  login: document.querySelector("#loginForm"),
  register: document.querySelector("#registerForm"),
  resetRequest: document.querySelector("#resetRequestForm"),
  resetPassword: document.querySelector("#resetPasswordForm"),
};

const statuses = {
  login: document.querySelector("#loginStatus"),
  register: document.querySelector("#registerStatus"),
  resetRequest: document.querySelector("#resetRequestStatus"),
  resetPassword: document.querySelector("#resetPasswordStatus"),
};

const turnstileWidgets = {};
let config = {};
const resetToken = new URLSearchParams(location.search).get("reset");

async function loadConfig() {
  const response = await fetch("/api/site-config");
  config = await response.json();

  if (resetToken) {
    forms.resetPassword.hidden = false;
    forms.resetPassword.scrollIntoView({ block: "center" });
  }

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
      turnstileWidgets[name] = window.turnstile.render(slot, {
        sitekey: config.turnstileSiteKey,
        theme: "dark",
      });
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

forms.resetRequest.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.resetRequest.textContent = "Preparing reset...";
  try {
    const data = await postAccount("request_reset", { ...formData(forms.resetRequest), turnstileToken: turnstileToken("reset") });
    statuses.resetRequest.textContent = data.emailConfigured
      ? "If that account exists, reset instructions have been sent."
      : "Reset token created, but email sending is not configured yet.";
  } catch (error) {
    statuses.resetRequest.textContent = error.message;
    resetTurnstile("reset");
  }
});

forms.resetPassword.addEventListener("submit", async (event) => {
  event.preventDefault();
  statuses.resetPassword.textContent = "Updating password...";
  try {
    const data = await postAccount("reset_password", { ...formData(forms.resetPassword), token: resetToken });
    statuses.resetPassword.textContent = data.message || "Password updated.";
  } catch (error) {
    statuses.resetPassword.textContent = error.message;
  }
});

document.querySelectorAll("[data-panel='reset']").forEach((button) => {
  button.addEventListener("click", () => forms.resetRequest.scrollIntoView({ behavior: "smooth", block: "center" }));
});

loadConfig();
