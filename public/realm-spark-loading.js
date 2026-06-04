const phases = [
  "Reading your idea...",
  "Expanding your world concept...",
  "Choosing the perfect setting...",
  "Creating landmarks and mood...",
  "Preparing creator details...",
  "Saving your world starter...",
  "Opening the World Creator...",
];

const spark = window.OPREALMRealmSpark;
const statusNode = document.querySelector("#sparkStatus");
const progressNode = document.querySelector("#sparkProgress");
const ideaNode = document.querySelector("#sparkIdea");
const actions = document.querySelector("#sparkErrorActions");
const retryButton = document.querySelector("#sparkRetry");
const fallbackButton = document.querySelector("#sparkFallback");
const video = document.querySelector(".spark-video");

function setProgress(value) {
  if (progressNode) progressNode.style.setProperty("--progress", `${Math.max(4, Math.min(100, value))}%`);
}

function setStatus(index) {
  if (statusNode) statusNode.textContent = phases[Math.min(index, phases.length - 1)];
}

function readIdea() {
  const params = new URLSearchParams(window.location.search);
  return spark?.cleanIdea(params.get("idea"))
    || spark?.cleanIdea(localStorage.getItem(spark.ORIGINAL_IDEA_KEY))
    || spark?.cleanIdea(localStorage.getItem(spark.LEGACY_HOME_PROMPT_KEY))
    || "";
}

function showError(message) {
  if (statusNode) statusNode.textContent = message || "The World Creator could not finish that idea.";
  if (actions) actions.hidden = false;
  setProgress(100);
}

function finishWithOutput(idea, useFallback = false) {
  const sourceIdea = useFallback ? "a magical portal world with a brave hero and a mystery to solve" : idea;
  const output = spark.buildRealmSparkOutput(sourceIdea);
  output.startedFrom = "homepage";
  output.loadingCompletedAt = new Date().toISOString();
  localStorage.setItem(spark.OUTPUT_KEY, JSON.stringify(output));
  localStorage.setItem(spark.ORIGINAL_IDEA_KEY, output.originalIdea);
  setStatus(phases.length - 1);
  setProgress(100);
  window.setTimeout(() => {
    window.location.href = "/storyboard-world.html?from=home";
  }, 520);
}

function runSpark() {
  if (!spark) {
    showError("The OPREALM creator engine is still loading. Refresh and try again.");
    return;
  }

  const idea = readIdea();
  if (!idea) {
    showError("Type, speak or choose an idea first.");
    return;
  }

  if (ideaNode) ideaNode.textContent = `“${idea}”`;
  if (actions) actions.hidden = true;

  let phaseIndex = 0;
  let progress = 8;
  setStatus(phaseIndex);
  setProgress(progress);

  const timer = window.setInterval(() => {
    phaseIndex = Math.min(phases.length - 2, phaseIndex + 1);
    progress = Math.min(90, progress + 12 + Math.random() * 9);
    setStatus(phaseIndex);
    setProgress(progress);
  }, 560);

  window.setTimeout(() => {
    window.clearInterval(timer);
    try {
      finishWithOutput(idea);
    } catch {
      showError("The World Creator hit a wobble. You can retry or continue with a safe starter world.");
    }
  }, 3400);
}

video?.addEventListener("error", () => {
  video.classList.add("is-hidden");
});

retryButton?.addEventListener("click", runSpark);
fallbackButton?.addEventListener("click", () => finishWithOutput(readIdea(), true));

runSpark();
