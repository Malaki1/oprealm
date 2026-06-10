const billingButtons = [...document.querySelectorAll("[data-billing-toggle]")];
const planCards = [...document.querySelectorAll("[data-plan-card]")];

function setBillingMode(mode) {
  const isYearly = mode === "yearly";

  billingButtons.forEach((button) => {
    const active = button.dataset.billingToggle === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  planCards.forEach((card) => {
    const priceValue = card.querySelector("[data-price-value]");
    const priceLabel = card.querySelector("[data-price-label]");
    const planNote = card.querySelector("[data-plan-note]");
    const cta = card.querySelector("[data-plan-cta]");

    if (priceValue) priceValue.textContent = isYearly ? card.dataset.yearlyPrice : card.dataset.monthlyPrice;
    if (priceLabel) priceLabel.textContent = isYearly ? card.dataset.yearlyLabel : card.dataset.monthlyLabel;
    if (planNote) planNote.textContent = isYearly ? card.dataset.yearlyNote : defaultPlanNote(card);
    if (cta) cta.textContent = isYearly ? "Claim 30% Yearly Savings" : defaultPlanCta(card);

    card.classList.toggle("is-yearly", isYearly);
  });
}

function defaultPlanNote(card) {
  return card.querySelector("p")?.textContent?.includes("Elite")
    ? "For the next generation"
    : "Unlimited creativity";
}

function defaultPlanCta(card) {
  return card.querySelector("p")?.textContent?.includes("Elite") ? "Start Elite" : "Start Creator";
}

billingButtons.forEach((button) => {
  button.addEventListener("click", () => setBillingMode(button.dataset.billingToggle || "monthly"));
});

const homePromptForm = document.querySelector("[data-home-prompt-form]");
const homePromptInput = document.querySelector("#homeIdeaPrompt");
const homeVoiceButton = document.querySelector("[data-home-voice]");
const homeUploadButton = document.querySelector("[data-home-upload]");
const homeUploadInput = document.querySelector("[data-home-upload-input]");

let homeVoiceRecognition = null;
let homeVoiceBaseText = "";
let homeVoicePointerActive = false;
let homeVoiceSuppressClick = false;

function sendHomePrompt(extra = "") {
  const cleaner = window.OPREALMRealmSpark?.cleanIdea || ((value) => String(value || "").trim());
  const idea = cleaner(homePromptInput?.value || extra || "");

  if (!idea || idea.length < 4) {
    if (homePromptInput) {
      homePromptInput.placeholder = "Type, say, draw or pick a quick idea first...";
      homePromptInput.focus();
    }
    return;
  }

  window.OPREALMRealmSpark?.saveSparkInput?.(idea);
  localStorage.setItem("oprealm_home_prompt", idea);
  const url = new URL("/realm-spark-loading.html", window.location.origin);
  url.searchParams.set("idea", idea);
  window.location.href = url.toString();
}

function setHomeVoiceState(isListening) {
  if (!homeVoiceButton) return;
  homeVoiceButton.classList.toggle("is-listening", isListening);
  homeVoiceButton.setAttribute("aria-label", isListening ? "Release to stop voice prompt" : "Hold to record voice prompt");
  homeVoiceButton.setAttribute("aria-pressed", String(isListening));
}

function stopHomeVoicePrompt() {
  if (!homeVoiceRecognition) return;
  try {
    homeVoiceRecognition.stop();
  } catch {
    homeVoiceRecognition = null;
    setHomeVoiceState(false);
  }
}

function startHomeVoicePrompt() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (homePromptInput) {
      homePromptInput.placeholder = "Voice works best in Chrome or Edge. Type your idea here...";
      homePromptInput.focus();
    }
    return;
  }

  if (homeVoiceRecognition) {
    stopHomeVoicePrompt();
    return;
  }

  const recognition = new SpeechRecognition();
  homeVoiceRecognition = recognition;
  homeVoiceBaseText = String(homePromptInput?.value || "").trim();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    setHomeVoiceState(true);
    if (homePromptInput) homePromptInput.placeholder = "Keep holding and describe your world...";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript && homePromptInput) {
      homePromptInput.value = [homeVoiceBaseText, transcript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    }
  };

  recognition.onerror = () => {
    setHomeVoiceState(false);
    homeVoiceRecognition = null;
    if (homePromptInput) homePromptInput.placeholder = "I couldn't hear that. Try typing your idea...";
  };

  recognition.onend = () => {
    setHomeVoiceState(false);
    homeVoiceRecognition = null;
    if (homePromptInput) homePromptInput.placeholder = homePromptInput.value.trim()
      ? "Add more detail or press generate..."
      : "Describe your idea...";
  };

  recognition.start();
}

function beginHoldVoicePrompt(event) {
  event.preventDefault();
  homeVoicePointerActive = true;
  homeVoiceSuppressClick = true;
  homeVoiceButton?.setPointerCapture?.(event.pointerId);
  startHomeVoicePrompt();
}

function endHoldVoicePrompt(event) {
  if (!homeVoicePointerActive) return;
  event?.preventDefault?.();
  homeVoicePointerActive = false;
  stopHomeVoicePrompt();
  window.setTimeout(() => {
    homeVoiceSuppressClick = false;
  }, 80);
}

homePromptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  sendHomePrompt();
});

homeVoiceButton?.addEventListener("pointerdown", beginHoldVoicePrompt);
homeVoiceButton?.addEventListener("pointerup", endHoldVoicePrompt);
homeVoiceButton?.addEventListener("pointercancel", endHoldVoicePrompt);
homeVoiceButton?.addEventListener("lostpointercapture", endHoldVoicePrompt);
homeVoiceButton?.addEventListener("click", (event) => {
  if (homeVoiceSuppressClick) {
    event.preventDefault();
    return;
  }
  startHomeVoicePrompt();
});
homeVoiceButton?.addEventListener("keydown", (event) => {
  if ((event.key === " " || event.key === "Enter") && !homeVoiceRecognition) {
    event.preventDefault();
    startHomeVoicePrompt();
  }
});
homeVoiceButton?.addEventListener("keyup", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    stopHomeVoicePrompt();
  }
});

homeUploadButton?.addEventListener("click", () => {
  homeUploadInput?.click();
});

homeUploadInput?.addEventListener("change", () => {
  const fileName = homeUploadInput.files?.[0]?.name;
  if (fileName && homePromptInput && !homePromptInput.value.trim()) {
    homePromptInput.value = `Create something inspired by ${fileName}`;
    sendHomePrompt(homePromptInput.value);
  }
});
