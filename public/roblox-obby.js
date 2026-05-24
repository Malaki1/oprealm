const obbyForm = document.querySelector("#obbyForm");
const obbyPrompt = document.querySelector("#obbyPrompt");
const obbyDifficulty = document.querySelector("#obbyDifficulty");
const obbyVoiceButton = document.querySelector("#obbyVoiceButton");
const copyObbyJsonButton = document.querySelector("#copyObbyJsonButton");
const obbyStatus = document.querySelector("#obbyStatus");
const obbyTitle = document.querySelector("#obbyTitle");
const obbyTheme = document.querySelector("#obbyTheme");
const obbyDifficultyLabel = document.querySelector("#obbyDifficultyLabel");
const obbySections = document.querySelector("#obbySections");
const obbyTrack = document.querySelector("#obbyTrack");
const obbySectionList = document.querySelector("#obbySectionList");

let obbyProject = loadObbyProject();

function saveObbyProject() {
  localStorage.setItem("oprealm_roblox_obby_project", JSON.stringify(obbyProject || {}));
}

function loadObbyProject() {
  try {
    return JSON.parse(localStorage.getItem("oprealm_roblox_obby_project") || "{}");
  } catch {
    return {};
  }
}

function renderObbyDashboard() {
  const plan = obbyProject?.plan;
  const obby = plan?.obby;
  const sections = obby?.sections || [];

  obbyTitle.textContent = obby?.title || "No obby yet";
  obbyTheme.textContent = plan?.theme || "Theme";
  obbyDifficultyLabel.textContent = plan?.difficulty || "Difficulty";
  obbySections.textContent = `${sections.length} section${sections.length === 1 ? "" : "s"}`;

  obbyTrack.innerHTML = sections.length
    ? [
      `<span>Spawn</span>`,
      ...sections.map((section, index) => `<span title="${escapeHtml(section.label)}">${String(index + 1).padStart(2, "0")}</span>`),
      `<span>Finish</span>`,
    ].join("")
    : `<span>Spawn</span><span>Checkpoint</span><span>Finish</span>`;

  obbySectionList.innerHTML = sections.length
    ? sections.map((section) => `
        <article>
          <strong>${escapeHtml(section.label)}</strong>
          <p>${escapeHtml(section.obstacle)} - ${escapeHtml(section.intensity)} - max gap ${escapeHtml(section.playabilityRules?.maxJumpGapStuds)} studs</p>
          <small>${(section.themeDressing || []).map(escapeHtml).join(" / ")}</small>
        </article>
      `).join("")
    : `<article><strong>Waiting for an idea</strong><p>The first version creates deterministic JSON for the Roblox plugin.</p></article>`;
}

async function generateObbyPlan() {
  const payload = {
    prompt: obbyPrompt.value,
    difficulty: obbyDifficulty.value,
    idempotencyKey: crypto.randomUUID?.() || `obby-${Date.now()}`,
  };

  obbyStatus.textContent = "Generating constrained obby spec...";
  const response = await fetch("/api/roblox-obby-plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not generate the obby spec.");

  obbyProject = { plan: result, updatedAt: new Date().toISOString() };
  saveObbyProject();
  renderObbyDashboard();
  obbyStatus.textContent = result.cached
    ? "Loaded from cache. No credits used."
    : "Obby spec ready. No credits used in this deterministic v1.";
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 401) {
      return { ok: false, error: "Please log in, then try generating again." };
    }
    return { ok: false, error: "The obby generator returned a web page instead of data. Please refresh and try again." };
  }
}

function startObbyVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    obbyStatus.textContent = "Voice input is not supported in this browser yet. Type the idea instead.";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-AU";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  obbyStatus.textContent = "Listening for your obby idea...";
  recognition.onresult = (event) => {
    obbyPrompt.value = event.results?.[0]?.[0]?.transcript || obbyPrompt.value;
    obbyStatus.textContent = "Voice idea added. Hit Generate Obby Spec.";
  };
  recognition.onerror = () => {
    obbyStatus.textContent = "Voice input stopped. You can type the idea instead.";
  };
  recognition.start();
}

async function copyObbyJson() {
  if (!obbyProject?.plan) {
    obbyStatus.textContent = "Generate an obby spec first.";
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(obbyProject.plan.pluginPayload, null, 2));
  obbyStatus.textContent = "Plugin JSON copied.";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

obbyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await generateObbyPlan();
  } catch (error) {
    obbyStatus.textContent = error.message || "Could not generate the obby spec.";
  }
});

obbyVoiceButton.addEventListener("click", startObbyVoiceInput);
copyObbyJsonButton.addEventListener("click", copyObbyJson);

renderObbyDashboard();
