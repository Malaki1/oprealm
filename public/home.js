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
const homeRandomButton = document.querySelector("[data-home-random]");
const homeChipButtons = [...document.querySelectorAll("[data-home-chip]")];

let homeVoiceRecognition = null;

const homePromptIdeas = [
  "a futuristic racing game in space",
  "a friendly dragon quest inside a floating castle",
  "a candy planet adventure with robot pets",
  "a mystery school story where choices unlock secret rooms",
];

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
  homeVoiceButton.setAttribute("aria-label", isListening ? "Stop listening" : "Start voice prompt");
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
    homeVoiceRecognition.stop();
    homeVoiceRecognition = null;
    setHomeVoiceState(false);
    return;
  }

  const recognition = new SpeechRecognition();
  homeVoiceRecognition = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    setHomeVoiceState(true);
    if (homePromptInput) homePromptInput.placeholder = "Listening... say your idea";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript && homePromptInput) homePromptInput.value = transcript;
  };

  recognition.onerror = () => {
    setHomeVoiceState(false);
    homeVoiceRecognition = null;
    if (homePromptInput) homePromptInput.placeholder = "I couldn't hear that. Try typing your idea...";
  };

  recognition.onend = () => {
    setHomeVoiceState(false);
    homeVoiceRecognition = null;
    if (homePromptInput) homePromptInput.placeholder = "Describe your idea...";
  };

  recognition.start();
}

homePromptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  sendHomePrompt();
});

homeVoiceButton?.addEventListener("click", startHomeVoicePrompt);

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

homeRandomButton?.addEventListener("click", () => {
  if (!homePromptInput) return;
  const idea = homePromptIdeas[Math.floor(Math.random() * homePromptIdeas.length)];
  homePromptInput.value = idea;
  sendHomePrompt(idea);
});

homeChipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.homeChip;
    if (action === "voice") {
      startHomeVoicePrompt();
      return;
    }
    if (action === "draw") {
      homeUploadInput?.click();
      return;
    }
    const chipPrompts = {
      inspire: "Surprise me with a magical game idea",
      trending: "Show me a trending kid-friendly game concept",
      remix: "Remix my idea into something more exciting",
      "build-game": "Help me build this as a playable game",
      "make-story": "Turn this idea into an interactive story",
    };
    const idea = homePromptInput?.value
      ? `${homePromptInput.value}. ${chipPrompts[action] || ""}`.trim()
      : chipPrompts[action] || "";
    if (homePromptInput) homePromptInput.value = idea;
    sendHomePrompt(idea);
  });
});
