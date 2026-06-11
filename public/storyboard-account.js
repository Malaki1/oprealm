const CREATOR_PROJECT_KEY = "oprealm_storyboard_project_v1";
const AI_STORY_SOURCE_KEY = "oprealm_ai_storybook_source";

async function hydrateStoryboardAccountStatus() {
  const creditPills = document.querySelectorAll("[data-credit-pill]");
  if (!creditPills.length) return;
  try {
    const response = await fetch("/api/account", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.user) throw new Error(data.error || "Not logged in");
    const credits = Number(data.user.creditsRemaining ?? 0);
    creditPills.forEach((pill) => {
      pill.textContent = String(credits);
      pill.title = "Creator credits";
    });
  } catch {
    creditPills.forEach((pill) => {
      pill.textContent = "Log in";
      pill.title = "Log in to use Creator credits";
    });
  }
}

function readCreatorStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function creatorStepState() {
  const project = readCreatorStorage(CREATOR_PROJECT_KEY);
  const activeWorld = (project.worlds || []).find((item) => item.id === project.activeWorldId) || project.worlds?.[0];
  const activeCharacter = (project.characters || []).find((item) => item.id === project.activeCharacterId) || project.characters?.[0];
  const scenes = project.scenes || [];
  const allSceneImagesSaved = scenes.length >= 8 && scenes.every((scene) => Boolean(scene.generatedImageUrl || scene.imageDataUrl));
  const aiStorySource = readCreatorStorage(AI_STORY_SOURCE_KEY);
  return {
    world: Boolean(activeWorld && (activeWorld.generatedImageUrl || activeWorld.imageUrl)),
    character: Boolean(activeCharacter && (activeCharacter.imageUrl || activeCharacter.imageDataUrl || activeCharacter.recipe?.generation?.generatedImageUrl)),
    storyBuilder: Boolean(project.storyDraft?.approved),
    storyScenes: Boolean(project.storyDraft?.approved && scenes.length >= 8),
    aiStory: Boolean(aiStorySource.createdAt && allSceneImagesSaved),
  };
}

function ensureAiStoryNavLink(nav) {
  let link = nav.querySelector('[data-creator-step="aiStory"], a[href="/ai-storybook.html"]');
  if (link) return link;
  const storyScenesLink = nav.querySelector('a[href="/storyboard-scenes.html"]');
  const storyLink = nav.querySelector('a[href="/storyboard.html"]');
  const anchor = storyScenesLink || storyLink;
  if (!anchor) return null;
  link = document.createElement("a");
  link.href = "/ai-storybook.html";
  link.dataset.creatorStep = "aiStory";
  link.textContent = "AI Story";
  anchor.insertAdjacentElement("afterend", link);
  return link;
}

function markCreatorStep(link, complete) {
  if (!link) return;
  let tick = link.querySelector(".creator-step-tick");
  if (!tick) {
    tick = document.createElement("span");
    tick.className = "creator-step-tick";
    tick.setAttribute("aria-hidden", "true");
    tick.textContent = "\u2713";
    link.appendChild(tick);
  }
  link.classList.toggle("is-step-complete", complete);
  tick.hidden = !complete;
  link.title = complete ? `${link.childNodes[0]?.textContent?.trim() || "Step"} saved` : "";
}

function refreshCreatorStepTicks() {
  const state = creatorStepState();
  document.querySelectorAll(".storyboard-nav").forEach((nav) => {
    ensureAiStoryNavLink(nav);
    markCreatorStep(nav.querySelector('a[href="/storyboard-world.html"]'), state.world);
    markCreatorStep(nav.querySelector('a[href="/storyboard-character.html"]'), state.character);
    markCreatorStep(nav.querySelector('a[href="/storyboard.html"]'), state.storyBuilder);
    markCreatorStep(nav.querySelector('a[href="/storyboard-scenes.html"], a[href="/storyboard-scenes"]'), state.storyScenes);
    markCreatorStep(nav.querySelector('[data-creator-step="aiStory"], a[href="/ai-storybook.html"]'), state.aiStory);
  });

  if (document.body.classList.contains("storyboard-body")) return;
  const game = document.querySelector("#storyGame");
  if (!game) return;
  let trail = game.querySelector(".creator-step-trail");
  if (!trail) {
    trail = document.createElement("nav");
    trail.className = "creator-step-trail";
    trail.setAttribute("aria-label", "Story creation progress");
    game.appendChild(trail);
  }
  trail.innerHTML = [
    ["World", "/storyboard-world.html", state.world],
    ["Character", "/storyboard-character.html", state.character],
    ["Story Builder", "/storyboard.html", state.storyBuilder],
    ["Story Board (Scenes)", "/storyboard-scenes.html", state.storyScenes],
    ["AI Story Generator", "/ai-storybook.html", state.aiStory],
    ["My Account", "/account.html", false],
  ].map(([label, href, complete], index) => {
    const current = window.location.pathname.startsWith(href.replace(".html", ""));
    return `${index ? '<span aria-hidden="true">&gt;</span>' : ""}<a href="${href}" class="${complete ? "is-complete" : ""}" ${current ? 'aria-current="page"' : ""}>${label}${complete ? " \u2713" : ""}</a>`;
  }).join("");
}

window.OPREALMRefreshCreatorSteps = refreshCreatorStepTicks;
window.addEventListener("storage", refreshCreatorStepTicks);
hydrateStoryboardAccountStatus();
refreshCreatorStepTicks();
