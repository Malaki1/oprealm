async function loadStudioAccount() {
  const createLink = document.querySelector(".launcher-header .button-primary");
  try {
    const response = await fetch("/api/account", { cache: "no-store" });
    const data = await response.json();
    if (data?.authenticated && createLink) {
      createLink.textContent = "Create";
      createLink.href = "#studioDescribe";
    }
  } catch {
    // The prompt launcher still works without account metadata.
  }
}

const studioPromptForm = document.querySelector("[data-studio-prompt-form]");
const studioPromptInput = document.querySelector("#studioIdeaPrompt");
const studioVoiceButton = document.querySelector("[data-studio-voice]");
const studioUploadButton = document.querySelector("[data-studio-upload]");
const studioUploadInput = document.querySelector("[data-studio-upload-input]");
const studioRandomButton = document.querySelector("[data-studio-random]");
const studioChipButtons = [...document.querySelectorAll("[data-studio-chip]")];

let studioVoiceRecognition = null;

const studioPromptIdeas = [
  "a futuristic racing game in space",
  "a friendly dragon quest inside a floating castle",
  "a candy planet adventure with robot pets",
  "a mystery school story where choices unlock secret rooms",
  "a lava world where a brave hero escapes robot sharks",
];

function sendStudioPrompt(extra = "") {
  const cleaner = window.OPREALMRealmSpark?.cleanIdea || ((value) => String(value || "").trim());
  const idea = cleaner(studioPromptInput?.value || extra || "");

  if (!idea || idea.length < 4) {
    if (studioPromptInput) {
      studioPromptInput.placeholder = "Type, say, draw or pick a quick idea first...";
      studioPromptInput.focus();
    }
    return;
  }

  window.OPREALMRealmSpark?.saveSparkInput?.(idea);
  localStorage.setItem("oprealm_home_prompt", idea);
  localStorage.setItem("oprealm_studio_prompt", idea);
  const url = new URL("/realm-spark-loading.html", window.location.origin);
  url.searchParams.set("idea", idea);
  window.location.href = url.toString();
}

function setStudioVoiceState(isListening) {
  if (!studioVoiceButton) return;
  studioVoiceButton.classList.toggle("is-listening", isListening);
  studioVoiceButton.setAttribute("aria-label", isListening ? "Stop listening" : "Start voice prompt");
}

function startStudioVoicePrompt() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (studioPromptInput) {
      studioPromptInput.placeholder = "Voice works best in Chrome or Edge. Type your idea here...";
      studioPromptInput.focus();
    }
    return;
  }

  if (studioVoiceRecognition) {
    studioVoiceRecognition.stop();
    studioVoiceRecognition = null;
    setStudioVoiceState(false);
    return;
  }

  const recognition = new SpeechRecognition();
  studioVoiceRecognition = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    setStudioVoiceState(true);
    if (studioPromptInput) studioPromptInput.placeholder = "Listening... say your idea";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript && studioPromptInput) studioPromptInput.value = transcript;
  };

  recognition.onerror = () => {
    setStudioVoiceState(false);
    studioVoiceRecognition = null;
    if (studioPromptInput) studioPromptInput.placeholder = "I couldn't hear that. Try typing your idea...";
  };

  recognition.onend = () => {
    setStudioVoiceState(false);
    studioVoiceRecognition = null;
    if (studioPromptInput) studioPromptInput.placeholder = "Describe your idea...";
  };

  recognition.start();
}

studioPromptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  sendStudioPrompt();
});

studioVoiceButton?.addEventListener("click", startStudioVoicePrompt);

studioUploadButton?.addEventListener("click", () => {
  studioUploadInput?.click();
});

studioUploadInput?.addEventListener("change", () => {
  const fileName = studioUploadInput.files?.[0]?.name;
  if (fileName && studioPromptInput && !studioPromptInput.value.trim()) {
    studioPromptInput.value = `Create something inspired by ${fileName}`;
    sendStudioPrompt(studioPromptInput.value);
  }
});

studioRandomButton?.addEventListener("click", () => {
  if (!studioPromptInput) return;
  const idea = studioPromptIdeas[Math.floor(Math.random() * studioPromptIdeas.length)];
  studioPromptInput.value = idea;
  sendStudioPrompt(idea);
});

studioChipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.studioChip;
    if (action === "voice") {
      startStudioVoicePrompt();
      return;
    }
    if (action === "draw") {
      studioUploadInput?.click();
      return;
    }

    const chipPrompts = {
      inspire: "Surprise me with a magical game idea",
      trending: "Show me a trending kid-friendly game concept",
      remix: "Remix my idea into something more exciting",
      "build-game": "Help me build this as a playable game",
      "make-story": "Turn this idea into an interactive story",
    };
    const idea = studioPromptInput?.value
      ? `${studioPromptInput.value}. ${chipPrompts[action] || ""}`.trim()
      : chipPrompts[action] || "";
    if (studioPromptInput) studioPromptInput.value = idea;
    sendStudioPrompt(idea);
  });
});

loadStudioAccount();
