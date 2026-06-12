const PROJECT_KEY = "oprealm_storyboard_project_v1";
const PUBLISH_KEY = "oprealm_publishing_studio_v1";
const project = readStorage(PROJECT_KEY);
let publishing = readStorage(PUBLISH_KEY);
let activeStep = publishing.activeStep || "celebrate";
let selectedSceneId = "";
let coverProgressTimer = null;

const steps = ["celebrate", "cover", "edit", "scenes", "details", "preview", "publish"];
const scenes = Array.isArray(project.scenes) ? project.scenes : [];
const storyTitle = project.storyDraft?.title || project.title || "My OPRealm Story";
const hero = (project.characters || []).find((item) => item.id === project.activeCharacterId) || project.characters?.[0] || {};
const world = (project.worlds || []).find((item) => item.id === project.activeWorldId) || project.worlds?.[0] || {};

function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; }
}
function savePublishing() {
  publishing.activeStep = activeStep;
  publishing.updatedAt = new Date().toISOString();
  localStorage.setItem(PUBLISH_KEY, JSON.stringify(publishing));
}
function imageForScene(scene) { return scene?.generatedImageUrl || scene?.imageDataUrl || ""; }
function selectedCover() {
  return publishing.covers?.[publishing.selectedCoverIndex || 0]?.imageDataUrl
    || imageForScene(scenes[0])
    || hero.imageUrl
    || world.imageUrl
    || "/assets/homepage/cards/story-games.png";
}

function hydrate() {
  if (!project.storyDraft?.approved || !scenes.length) {
    window.location.replace("/storyboard-scenes.html");
    return;
  }
  publishing = {
    ...publishing,
    title: publishing.title || storyTitle,
    subtitle: publishing.subtitle || project.storyDraft?.summary?.slice(0, 90) || "",
    author: publishing.author || "OPRealm Creator",
    description: publishing.description || project.storyDraft?.summary || scenes.slice(0, 3).map((scene) => scene.storyExcerpt || scene.prompt).join(" ").slice(0, 600),
    genre: publishing.genre || "Fantasy Adventure",
    age: publishing.age || "8-10",
    tags: publishing.tags || deriveTags(),
    selectedCoverIndex: Number(publishing.selectedCoverIndex || 0),
    coverColour: publishing.coverColour || "#fff4d6",
    coverEffect: publishing.coverEffect || "glow",
    coverPosition: publishing.coverPosition || "bottom",
    coverFont: publishing.coverFont || "storybook",
  };
  if (!publishing.covers?.length) publishing.covers = fallbackCoverConcepts();
  savePublishing();
  renderSummary();
  renderCovers();
  renderCoverEditor();
  renderScenes();
  hydrateMetadata();
  renderPreview();
  showStep(activeStep);
  bindEvents();
  if (publishing.creationId) {
    document.querySelector("#publishStoryButton").textContent = "Update RealmVerse Cover";
    document.querySelector("#publishPermission").nextElementSibling.textContent = "I have reviewed these updates and want to apply them to my RealmVerse story.";
  }
}

function deriveTags() {
  const settings = project.storySettings || {};
  return [settings.storyType, settings.lessonTheme, world.name, hero.name].filter(Boolean).join(", ").replace(/-/g, " ");
}
function fallbackCoverConcepts() {
  const available = scenes.filter((scene) => imageForScene(scene));
  const picks = [available[0], available[Math.floor(available.length / 2)], available[available.length - 1]].filter(Boolean);
  while (picks.length < 3) picks.push(available[0] || {});
  return picks.map((scene, index) => ({
    id: `cover-${index + 1}`,
    imageDataUrl: imageForScene(scene) || selectedCover(),
    label: ["Epic Storybook", "Character Spotlight", "Adventure Promise"][index],
    note: ["Best match", "Hero-focused", "World-focused"][index],
  }));
}
function renderSummary() {
  document.querySelector("#summaryTitle").textContent = publishing.title;
  document.querySelector("#summaryChapters").textContent = `${scenes.length} illustrated scenes`;
  document.querySelector("#summaryCover").src = selectedCover();
  document.querySelector("#celebrationSceneCount").textContent = `${scenes.length} Illustrated Scenes`;
  document.querySelector("#sceneCountStatus").textContent = `${scenes.length} Ready`;
  const readyImages = scenes.filter((scene) => imageForScene(scene)).length;
  document.querySelector("#illustrationStatus").textContent = `${readyImages}/${scenes.length}`;
  const score = Math.min(100, Math.round(70 + (readyImages / Math.max(1, scenes.length)) * 20 + (publishing.description ? 5 : 0) + (publishing.covers?.length >= 3 ? 5 : 0)));
  document.querySelector("#qualityScore").textContent = `${score}%`;
  document.querySelector("#qualityStatus").textContent = score >= 95 ? "Passed" : "Ready";
}
function showStep(step) {
  activeStep = steps.includes(step) ? step : "celebrate";
  document.querySelectorAll("[data-studio-step]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.studioStep === activeStep));
  document.querySelectorAll("[data-progress-step]").forEach((item) => {
    const index = steps.indexOf(item.dataset.progressStep);
    const current = steps.indexOf(activeStep);
    item.classList.toggle("is-complete", index < current);
    item.classList.toggle("is-current", index === current);
    const small = item.querySelector("small");
    if (small) small.textContent = index < current ? "Complete" : index === current ? "In Progress" : "Pending";
  });
  if (activeStep === "preview") renderPreview();
  if (activeStep === "cover" && !publishing.aiCoversGenerated) generateCovers();
  savePublishing();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderCovers() {
  const grid = document.querySelector("#coverGrid");
  grid.innerHTML = (publishing.covers || []).map((cover, index) => `<button class="cover-card ${index === publishing.selectedCoverIndex ? "is-selected" : ""}" data-cover-index="${index}" type="button"><img src="${escapeAttribute(cover.imageDataUrl)}" alt="Cover concept ${index + 1}" /><em>${index === publishing.selectedCoverIndex ? "✓" : index + 1}</em><div><strong>${escapeHtml(cover.label || `Cover ${index + 1}`)}</strong><span>${escapeHtml(cover.note || "Professional story cover")}</span></div></button>`).join("");
  grid.querySelectorAll("[data-cover-index]").forEach((button) => button.addEventListener("click", () => {
    publishing.selectedCoverIndex = Number(button.dataset.coverIndex);
    savePublishing(); renderCovers(); renderCoverEditor(); renderSummary();
  }));
}
function renderCoverEditor() {
  document.querySelector("#coverEditorImage").src = selectedCover();
  document.querySelector("#coverTitleInput").value = publishing.title;
  document.querySelector("#coverSubtitleInput").value = publishing.subtitle;
  document.querySelector("#coverAuthorInput").value = publishing.author;
  document.querySelector("#coverFontSelect").value = publishing.coverFont;
  document.querySelector("#coverPreviewTitle").textContent = publishing.title;
  document.querySelector("#coverPreviewSubtitle").textContent = publishing.subtitle;
  document.querySelector("#coverPreviewAuthor").textContent = `By ${publishing.author}`;
  const layer = document.querySelector("#coverTextLayer");
  layer.style.setProperty("--cover-colour", publishing.coverColour);
  layer.className = `cover-text cover-position-${publishing.coverPosition} cover-effect-${publishing.coverEffect} cover-font-${publishing.coverFont}`;
  document.querySelectorAll("[data-cover-colour]").forEach((button) => button.classList.toggle("is-selected", button.dataset.coverColour === publishing.coverColour));
  document.querySelectorAll("[data-cover-effect]").forEach((button) => button.classList.toggle("is-selected", button.dataset.coverEffect === publishing.coverEffect));
  document.querySelectorAll("[data-cover-position]").forEach((button) => button.classList.toggle("is-selected", button.dataset.coverPosition === publishing.coverPosition));
}
function renderScenes() {
  const grid = document.querySelector("#publishSceneGrid");
  grid.innerHTML = scenes.map((scene, index) => `<article class="publish-scene-card ${scene.id === selectedSceneId ? "is-selected" : ""}"><img src="${escapeAttribute(imageForScene(scene))}" alt="" /><strong>${index + 1}. ${escapeHtml(scene.title || `Scene ${index + 1}`)}</strong><button data-publish-scene="${escapeAttribute(scene.id)}" type="button">Edit Scene</button></article>`).join("");
  grid.querySelectorAll("[data-publish-scene]").forEach((button) => button.addEventListener("click", () => openSceneEditor(button.dataset.publishScene)));
}
function openSceneEditor(sceneId) {
  const scene = scenes.find((item) => item.id === sceneId);
  if (!scene) return;
  selectedSceneId = sceneId;
  document.querySelector("#sceneEditorImage").src = imageForScene(scene);
  document.querySelector("#sceneEditorTitle").value = scene.title || "";
  document.querySelector("#sceneEditorText").value = scene.storyExcerpt || scene.prompt || "";
  document.querySelector("#sceneEditorPanel").hidden = false;
  renderScenes();
  document.querySelector("#sceneEditorPanel").scrollIntoView({ behavior: "smooth", block: "center" });
}
function hydrateMetadata() {
  document.querySelector("#metadataTitle").value = publishing.title;
  document.querySelector("#metadataGenre").value = publishing.genre;
  document.querySelector("#metadataAge").value = publishing.age;
  document.querySelector("#metadataDescription").value = publishing.description;
  document.querySelector("#metadataTags").value = publishing.tags;
  document.querySelector("#descriptionCount").textContent = publishing.description.length;
}
function updateMetadata() {
  publishing.title = document.querySelector("#metadataTitle").value.trim() || publishing.title;
  publishing.genre = document.querySelector("#metadataGenre").value;
  publishing.age = document.querySelector("#metadataAge").value;
  publishing.description = document.querySelector("#metadataDescription").value.trim();
  publishing.tags = document.querySelector("#metadataTags").value.trim();
  document.querySelector("#descriptionCount").textContent = publishing.description.length;
  savePublishing(); renderSummary();
}
function renderPreview() {
  document.querySelector("#cardPreviewImage").src = selectedCover();
  document.querySelector("#cardPreviewTitle").textContent = publishing.title;
  document.querySelector("#cardPreviewDescription").textContent = publishing.description;
  document.querySelector("#cardPreviewGenre").textContent = publishing.genre;
  document.querySelector("#cardPreviewAuthor").textContent = `By ${publishing.author}`;
  document.querySelector("#cardPreviewAge").textContent = `Ages ${publishing.age}`;
  document.querySelector("#cardPreviewScenes").textContent = `${scenes.length} scenes`;
}
async function generateCovers() {
  if (document.querySelector("#coverLoading").hidden === false) return;
  const loading = document.querySelector("#coverLoading");
  const grid = document.querySelector("#coverGrid");
  loading.hidden = false; grid.hidden = true;
  let percent = 3;
  setCoverProgress(percent);
  coverProgressTimer = window.setInterval(() => { percent = Math.min(94, percent + Math.max(1, Math.ceil((94 - percent) * .06))); setCoverProgress(percent); }, 700);
  const generatedCovers = [];
  try {
    for (let conceptIndex = 0; conceptIndex < 3; conceptIndex += 1) {
      document.querySelector("#coverLoadingTitle").textContent = `Designing cover ${conceptIndex + 1} of 3...`;
      document.querySelector("#coverLoadingMessage").textContent = ["Finding the strongest story moment.", "Creating a memorable hero-focused direction.", "Turning the world into an irresistible adventure promise."][conceptIndex];
      const response = await fetch("/api/story-cover-images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        conceptIndex, title: publishing.title, summary: project.storyDraft?.summary || publishing.description, theme: project.storySettings?.lessonTheme || "", genre: publishing.genre,
        hero: { name: hero.name, description: hero.prompt || hero.description, style: hero.masterStyle || hero.style, outfit: hero.customOutfit || hero.outfit },
        world: { name: world.name, description: world.description || world.prompt },
      })});
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.cover?.imageDataUrl) throw new Error(data.error || `Cover ${conceptIndex + 1} could not finish.`);
      generatedCovers.push({ id: `ai-cover-${Date.now()}-${conceptIndex}`, imageDataUrl: await compressImage(data.cover.imageDataUrl), label: data.cover.label, note: data.cover.note });
      setCoverProgress(Math.round(((conceptIndex + 1) / 3) * 100));
    }
    publishing.covers = generatedCovers;
    publishing.selectedCoverIndex = 0; publishing.aiCoversGenerated = true; savePublishing();
    setCoverProgress(100); renderCovers(); renderCoverEditor(); renderSummary();
  } catch (error) {
    if (generatedCovers.length) {
      publishing.covers = [...generatedCovers, ...(publishing.covers || []).slice(generatedCovers.length, 3)];
      publishing.selectedCoverIndex = 0;
      savePublishing();
      renderCovers();
      renderCoverEditor();
      renderSummary();
    }
    document.querySelector("#coverLoadingTitle").textContent = "Your cover concepts are ready to customize";
    document.querySelector("#coverLoadingMessage").textContent = `${error.message || "AI covers are temporarily unavailable."} OPRealm kept three professional layouts from your story artwork.`;
  } finally {
    window.clearInterval(coverProgressTimer);
    window.setTimeout(() => { loading.hidden = true; grid.hidden = false; }, 500);
  }
}
function setCoverProgress(percent) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  document.querySelector("#coverLoadingRing").style.setProperty("--progress", `${safe * 3.6}deg`);
  document.querySelector("#coverLoadingPercent").textContent = `${safe}%`;
}
async function compressImage(dataUrl) {
  if (!dataUrl?.startsWith("data:image/")) return dataUrl;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 900;
      canvas.getContext("2d").drawImage(image, 0, 0, 600, 900);
      resolve(canvas.toDataURL("image/jpeg", .78));
    };
    image.onerror = () => resolve(dataUrl); image.src = dataUrl;
  });
}
async function renderPublishedCover() {
  const source = selectedCover();
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  drawCoverImage(context, image, canvas.width, canvas.height);

  const isTop = publishing.coverPosition === "top";
  const gradient = context.createLinearGradient(0, isTop ? 0 : 760, 0, isTop ? 590 : 1350);
  if (isTop) {
    gradient.addColorStop(0, "rgba(2,6,19,.94)");
    gradient.addColorStop(1, "rgba(2,6,19,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 900, 620);
  } else {
    gradient.addColorStop(0, "rgba(2,6,19,0)");
    gradient.addColorStop(1, "rgba(2,6,19,.96)");
    context.fillStyle = gradient;
    context.fillRect(0, 730, 900, 620);
  }

  const titleY = isTop ? 125 : 1010;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = publishing.coverColour || "#fff4d6";
  context.font = `800 76px ${coverCanvasFont()}`;
  applyCoverTextEffect(context);
  const titleLines = wrapCanvasText(context, publishing.title, 760, 3);
  titleLines.forEach((line, index) => context.fillText(line.toUpperCase(), 450, titleY + index * 74));
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  const detailsY = titleY + titleLines.length * 74 + 22;
  context.fillStyle = "#ffffff";
  context.font = `700 31px ${coverCanvasFont()}`;
  const subtitleLines = wrapCanvasText(context, publishing.subtitle, 720, 2);
  subtitleLines.forEach((line, index) => context.fillText(line, 450, detailsY + index * 38));
  context.font = "600 24px Arial, sans-serif";
  context.fillText(`By ${publishing.author}`, 450, detailsY + subtitleLines.length * 38 + 22);
  return canvas.toDataURL("image/jpeg", .88);
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected cover could not be loaded."));
    image.src = source;
  });
}
function drawCoverImage(context, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}
function coverCanvasFont() {
  if (publishing.coverFont === "cinematic") return "Georgia, serif";
  return "'Arial Rounded MT Bold', 'Trebuchet MS', Arial, sans-serif";
}
function applyCoverTextEffect(context) {
  if (publishing.coverEffect === "none") return;
  context.shadowColor = publishing.coverEffect === "shadow" ? "#000000" : "#8b45ff";
  context.shadowBlur = publishing.coverEffect === "shadow" ? 0 : 24;
  context.shadowOffsetX = publishing.coverEffect === "shadow" ? 7 : 0;
  context.shadowOffsetY = publishing.coverEffect === "shadow" ? 7 : 0;
}
function wrapCanvasText(context, value, maxWidth, maxLines) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : ["Untitled Story"];
}
async function publishStory() {
  const button = document.querySelector("#publishStoryButton");
  const status = document.querySelector("#publishStatus");
  button.disabled = true; status.textContent = "Submitting your book to the RealmVerse review team...";
  updateMetadata();
  try {
    status.textContent = "Preparing your finished cover card...";
    const coverImageDataUrl = await renderPublishedCover();
    status.textContent = publishing.creationId
      ? "Updating your RealmVerse book and cover..."
      : "Submitting your book to the RealmVerse review team...";
    const response = await fetch("/api/creations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      title: publishing.title, type: "story_game", description: publishing.description, mediaUrl: `${location.origin}/ai-storybook.html`,
      creationId: publishing.creationId || "",
      coverImageDataUrl,
      tags: publishing.tags, ageBand: publishing.age, projectSnapshot: {
        projectId: project.id,
        storybookId: project.storybookId,
        sceneCount: scenes.length,
        genre: publishing.genre,
        age: publishing.age,
        publishing: {
          title: publishing.title,
          subtitle: publishing.subtitle,
          author: publishing.author,
          genre: publishing.genre,
          coverColour: publishing.coverColour,
          coverEffect: publishing.coverEffect,
          coverPosition: publishing.coverPosition,
          coverFont: publishing.coverFont,
        },
      },
    })});
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Publishing could not finish.");
    publishing.publishedAt = new Date().toISOString(); publishing.creationId = data.id; publishing.reviewStatus = data.reviewStatus; savePublishing();
    document.querySelectorAll(".studio-step").forEach((panel) => panel.classList.remove("is-active"));
    document.querySelector("#launchSuccess").hidden = false;
    localStorage.setItem("oprealm_recent_publication", JSON.stringify({ title: publishing.title, image: selectedCover(), href: "/publishing-studio.html", publishedAt: publishing.publishedAt, reviewStatus: data.reviewStatus }));
    window.OPREALMRefreshCreatorSteps?.();
  } catch (error) {
    status.textContent = error.message || "Publishing could not finish.";
    button.disabled = false;
  }
}
function bindEvents() {
  document.querySelectorAll("[data-next-step]").forEach((button) => button.addEventListener("click", () => { if (activeStep === "details") updateMetadata(); showStep(button.dataset.nextStep); }));
  document.querySelectorAll("[data-previous-step]").forEach((button) => button.addEventListener("click", () => showStep(button.dataset.previousStep)));
  document.querySelector("#generateCoversButton").addEventListener("click", generateCovers);
  ["coverTitleInput","coverSubtitleInput","coverAuthorInput","coverFontSelect"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", () => {
    publishing.title = document.querySelector("#coverTitleInput").value; publishing.subtitle = document.querySelector("#coverSubtitleInput").value; publishing.author = document.querySelector("#coverAuthorInput").value; publishing.coverFont = document.querySelector("#coverFontSelect").value; savePublishing(); renderCoverEditor(); renderSummary();
  }));
  document.querySelectorAll("[data-cover-colour]").forEach((button) => button.addEventListener("click", () => { publishing.coverColour = button.dataset.coverColour; savePublishing(); renderCoverEditor(); }));
  document.querySelectorAll("[data-cover-effect]").forEach((button) => button.addEventListener("click", () => { publishing.coverEffect = button.dataset.coverEffect; savePublishing(); renderCoverEditor(); }));
  document.querySelectorAll("[data-cover-position]").forEach((button) => button.addEventListener("click", () => { publishing.coverPosition = button.dataset.coverPosition; savePublishing(); renderCoverEditor(); }));
  document.querySelector("#saveSceneEditButton").addEventListener("click", () => {
    const scene = scenes.find((item) => item.id === selectedSceneId); if (!scene) return;
    scene.title = document.querySelector("#sceneEditorTitle").value.trim(); scene.storyExcerpt = document.querySelector("#sceneEditorText").value.trim(); scene.prompt = scene.storyExcerpt;
    project.updatedAt = new Date().toISOString(); localStorage.setItem(PROJECT_KEY, JSON.stringify(project)); renderScenes();
    document.querySelector("#sceneEditorPanel").hidden = true;
  });
  ["metadataTitle","metadataGenre","metadataAge","metadataDescription","metadataTags"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", updateMetadata));
  document.querySelector("#publishPermission").addEventListener("change", (event) => document.querySelector("#publishStoryButton").disabled = !event.target.checked);
  document.querySelector("#publishStoryButton").addEventListener("click", publishStory);
}
function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
hydrate();
