const form = document.querySelector("#storyGeneratorForm");
const generateButton = document.querySelector("#generateStoryButton");
const statusNode = document.querySelector("#generatorStatus");
const emptyResult = document.querySelector("#emptyResult");
const generatedResult = document.querySelector("#generatedResult");
const openStoryMakerButton = document.querySelector("#openStoryMakerButton");
let generatedStory = null;

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  generateButton.disabled = true;
  generateButton.textContent = "Creating your adventure...";
  statusNode.textContent = "Orbit is building the hero, world, scenes and choices.";
  statusNode.classList.remove("is-error");
  try {
    const response = await fetch("/api/story-generator", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Story generation failed.");
    generatedStory = data.story;
    renderStory(generatedStory);
    statusNode.textContent = `Story created using ${data.creditsUsed} Creator credits.`;
  } catch (error) {
    statusNode.textContent = error.message || "Story generation failed.";
    statusNode.classList.add("is-error");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Generate My Story";
  }
});

openStoryMakerButton?.addEventListener("click", () => {
  if (!generatedStory) return;
  localStorage.setItem("oprealm_story_game_project", JSON.stringify(toStoryProject(generatedStory)));
  window.location.href = "/story-game.html";
});

function renderStory(story) {
  emptyResult.hidden = true;
  generatedResult.hidden = false;
  document.querySelector("#resultTitle").textContent = story.title;
  document.querySelector("#resultSynopsis").textContent = story.synopsis;
  document.querySelector("#resultHero").textContent = story.character.name;
  document.querySelector("#resultHeroCopy").textContent = `${story.character.type}. ${story.character.personality}`;
  document.querySelector("#resultWorld").textContent = story.world.name;
  document.querySelector("#resultWorldCopy").textContent = story.world.description;
  document.querySelector("#resultScenes").innerHTML = story.scenes.map((scene, index) => `
    <article>
      <span>${index + 1}</span>
      <div><strong>${escapeHtml(scene.title)}</strong><p>${escapeHtml(scene.prompt)}</p></div>
    </article>
  `).join("");
}

function toStoryProject(story) {
  const character = {
    name: story.character.name,
    prompt: story.character.description,
    type: story.character.type,
    personality: story.character.personality,
    style: story.character.visualStyle,
    safety: "Friendly and safe for all ages",
    imageDataUrl: "",
  };
  return {
    title: story.title,
    synopsis: story.synopsis,
    character,
    characters: [character],
    world: story.world,
    scenes: story.scenes.map((scene, index) => ({
      title: scene.title,
      prompt: scene.prompt,
      camera: "Wide cinematic reveal",
      background: story.world.name,
      character: "Use saved character",
      mood: scene.mood,
      type: scene.type,
      choices: "2 choices",
      x: 40 + (index % 4) * 290,
      y: 40 + Math.floor(index / 4) * 190,
      routes: scene.choices.map((choice, choiceIndex) => ({
        choiceIndex,
        targetIndex: Math.max(0, Math.min(story.scenes.length - 1, choice.targetScene - 1)),
        direction: choiceIndex ? "down" : "right",
        label: choice.label,
      })),
    })),
    generatedAt: new Date().toISOString(),
    generatorSource: "ai_story_generator",
  };
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
