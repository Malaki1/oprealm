const main = document.querySelector("#realmReelsMain");
const toast = document.querySelector("#reelsToast");
const path = window.location.pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/realmreels";
const routeId = path.split("/").filter(Boolean).at(-1);
const state = {
  account: null,
  reels: [],
  reel: null,
  selectedFrame: 0,
  history: [],
  future: [],
  playing: false,
  playTimer: 0,
  playElapsed: 0,
  captions: true,
  previewTracked: false,
  create: {
    genre: "mystery", templateId: "who-is-lying", durationSeconds: 60, difficulty: "medium",
    twistLevel: "medium", visualStyle: "realistic", voiceStyle: "dramatic", ageBand: "13-16", idea: "",
  },
};

const genres = [
  ["mystery", "🕵️", "Mystery"], ["dating", "💗", "Dating"], ["horror", "💀", "Horror"],
  ["fantasy", "🐉", "Fantasy"], ["survival", "🔥", "Survival"], ["funny", "😆", "Funny"],
  ["riches", "💎", "Riches"], ["adventure", "🏔️", "Adventure"],
];
const templates = {
  mystery: [["who-is-lying","Who Is Lying?","Uncover the truth before time runs out.","❓"],["find-the-culprit","Find The Culprit","Follow the clues. Catch the culprit.","🧵"],["who-stole-it","Who Stole It?","Someone took the crown. Who did it?","👑"],["sabotaged","Sabotaged!","Someone sabotaged the mission.","💥"],["midnight-killer","Midnight Killer","Find the safe suspect before midnight.","🕛"]],
  dating: [["say-the-right-thing","Say The Right Thing","Pick the line that builds chemistry.","💬"],["pick-your-date","Pick Your Date","Choose the personality that fits you.","💗"],["win-the-princess","Win The Princess","Make the brave, kind choice.","👸"],["love-triangle","Love Triangle","Read the signals before choosing.","💞"],["first-date-disaster","First Date Disaster","Recover from an awkward moment.","🍝"],["secret-crush-test","Secret Crush Test","Spot the clues and choose wisely.","💌"]],
  horror: [["choose-your-protector","Choose Your Protector","One protects you. One betrays you.","🛡️"],["open-the-door","Open The Door?","Something is waiting outside.","🚪"],["hide-or-run","Hide Or Run?","The footsteps are getting closer.","👣"],["trust-the-ghost","Trust The Ghost?","The ghost knows a secret route.","👻"],["survive-the-night","Survive The Night","Make it safely until sunrise.","🌙"]],
  fantasy: [["choose-your-dragon","Choose Your Dragon","Each dragon grants a different fate.","🐉"],["choose-your-kingdom","Choose Your Kingdom","Rule wisely or awaken a curse.","🏰"],["magical-companion","Choose Your Magical Companion","One companion hides a secret.","🦄"],["cursed-object","Choose The Cursed Object","Power always has a price.","🔮"]],
  survival: [["choose-your-shelter","Choose Your Shelter","The storm reaches you in minutes.","⛺"],["choose-your-teammate","Choose Your Teammate","Trust decides who makes it home.","🤝"],["choose-your-weapon","Choose Your Weapon","One tool is not what it seems.","🧰"],["survive-the-island","Survive The Island","Resources are vanishing fast.","🏝️"]],
  funny: [["weird-roommate","Choose Your Weird Roommate","Every roommate has a ridiculous secret.","🛋️"],["cursed-superpower","Pick Your Cursed Superpower","Great power. Terrible side effects.","🦸"],["ridiculous-pet","Choose Your Ridiculous Pet","Cute, chaotic, or secretly royal?","🦆"]],
  riches: [["billionaire-mentor","Choose Your Billionaire Mentor","One offers wisdom. One offers shortcuts.","💎"],["luxury-life","Pick Your Luxury Life","Every dream hides a trade-off.","🏝️"],["choose-your-investment","Choose Your Investment","Balance risk, reward, and kindness.","📈"]],
  adventure: [["choose-your-quest","Choose Your Quest","Three paths. One legendary ending.","🏔️"],["lost-temple","The Lost Temple","Choose the clue that opens the gate.","🗿"],["sky-pirates","Join The Sky Pirates","Pick a crew before the storm arrives.","🏴‍☠️"],["portal-choice","Choose A Portal","Each portal leads to a different world.","🌀"]],
};
const styleArt = {
  realistic: "/assets/homepage/ChatGPT Image May 25, 2026, 03_04_11 PM.png",
  cinematic: "/assets/homepage/thumbnails/fantasy-story.png",
  animated: "/assets/homepage/thumbnails/space-adventure.png",
  comic: "/assets/homepage/cards/story-games.png",
  fantasy: "/assets/homepage/thumbnails/dragon-quest.png",
};

boot();

async function boot() {
  markActiveNav();
  state.account = await fetchJson("/api/account").catch(() => null);
  if (path === "/realmreels/create") return renderCreate();
  if (path.startsWith("/realmreels/director/")) return loadReelAnd(renderDirector);
  if (path.startsWith("/realmreels/preview/")) return loadReelAnd(renderPreview);
  if (path === "/realmreels/exports") return renderExports();
  return renderLibrary();
}

function markActiveNav() {
  const active = path.includes("/create") ? "create" : path.includes("/exports") ? "exports" : "library";
  document.querySelector(`[data-reels-nav="${active}"]`)?.classList.add("is-active");
}

async function loadReelAnd(renderer) {
  const id = routeId;
  const data = await api(`/api/realm-reels?id=${encodeURIComponent(id)}`, { method: "GET" }).catch((error) => ({ error: error.message }));
  if (!data?.ok || !data.reel) {
    main.innerHTML = emptyState("🎬", "RealmReel not found", data?.error || "This reel may have been deleted.", "/realmreels", "Back to My Reels");
    return;
  }
  state.reel = data.reel;
  renderer();
}

function renderCreate() {
  document.title = "Create RealmReel | OPRealm";
  main.innerHTML = `
    ${pageHead("✦ Create Your RealmReel", "AI-powered choice reels that go viral.", `
      <a class="rr-button" href="/realmreels">My Reels</a><a class="rr-button" href="#templates">Templates</a>
      <a class="rr-button" href="/realmreels/exports">Exports</a><button class="rr-button primary" data-new-reel>New Reel</button>`)}
    <section class="rr-panel rr-progress">
      ${["Choose Template","Customize","Generate","Preview & Export"].map((label,index)=>`<div class="rr-progress-step ${index===0?"is-active":""}"><span>${index+1}</span>${label}</div>`).join("")}
    </section>
    <section class="rr-panel rr-create-config">
      <h2 class="rr-section-title">1. Choose a Genre</h2>
      <div class="rr-genre-grid">${genres.map(([id,icon,label])=>`<button class="rr-genre-card ${id===state.create.genre?"is-selected":""}" data-genre="${id}"><span>${icon}</span><strong>${label}</strong></button>`).join("")}</div>
      <div class="rr-divider"></div>
      <h2 class="rr-section-title" id="templates">2. Choose a Template</h2>
      <div class="rr-template-row" id="rrTemplateRow"></div>
    </section>
    <div class="rr-create-bottom">
      <section class="rr-panel rr-settings">
        <h2 class="rr-section-title">3. Customize Your Reel</h2>
        ${settingsGroup("Length", "durationSeconds", [[30,"30s"],[60,"60s"],[90,"90s"]])}
        ${settingsGroup("Difficulty", "difficulty", [["easy","Easy"],["medium","Medium"],["hard","Hard"],["impossible","Impossible"]])}
        ${settingsGroup("Twist Level", "twistLevel", [["low","Low"],["medium","Medium"],["high","High"]])}
        <div class="rr-settings-group"><strong>Visual Style</strong><div class="rr-style-grid">${Object.entries(styleArt).map(([id,url])=>`<button class="rr-style-choice ${id===state.create.visualStyle?"is-selected":""}" data-setting="visualStyle" data-value="${id}" data-label="${titleCase(id)}" style="background-image:url('${url}')"></button>`).join("")}</div></div>
        ${settingsGroup("Voice Style", "voiceStyle", [["dramatic","Dramatic Narrator"],["mysterious","Mysterious Narrator"],["calm","Calm Narrator"],["funny","Funny Narrator"]])}
        ${settingsGroup("Age Band (Content Safety)", "ageBand", [["8-10","8-10"],["10-12","10-12"],["13-16","13-16"],["16+","16+"]])}
        <div class="rr-settings-group"><strong>Add Your Idea (Optional)</strong><textarea class="rr-idea" id="rrIdea" maxlength="180" placeholder="Describe your reel idea in one sentence...">${escapeHtml(state.create.idea)}</textarea></div>
        <button class="rr-generate" id="generateRealmReel">✦ Generate Reel</button>
      </section>
      <section class="rr-panel rr-preview-panel">
        <div class="rr-panel-head"><h2>Reel Preview <small style="color:#9fa7b3;font-weight:500">(Storyboard)</small></h2><span class="rr-button" style="min-height:28px;padding:0 10px">▯ 9:16</span></div>
        <div class="rr-preview-layout">
          ${phoneMarkup(createPreviewFrame(), 0)}
          <div>
            <div class="rr-panel-head"><h3>Storyboard Frames</h3><span style="color:#a94fff;font-size:.65rem">Preview</span></div>
            <div class="rr-storyboard-strip">${["Hook","Choice","Outcome","Choice","Twist","Ending","CTA"].map((label,index)=>miniFrame(label,index,index===0)).join("")}</div>
            <div class="rr-panel" style="margin-top:12px;padding:13px">
              <h3 style="margin:0 0 10px;font-size:.8rem">Reel Summary</h3>
              ${summaryRow("Genre",titleCase(state.create.genre))}${summaryRow("Template",selectedTemplate()[1])}${summaryRow("Length",`${state.create.durationSeconds} Seconds`)}${summaryRow("Choices","2 Main Choices")}${summaryRow("CTA Type","Play Full Story")}
            </div>
          </div>
        </div>
      </section>
    </div>
    <section class="rr-panel" style="margin-top:12px;padding:14px">
      <h2 class="rr-section-title">What Happens Next?</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <article class="rr-panel" style="padding:14px"><h3 style="margin:0">📖 Expand Into Full Story</h3><p style="color:#aeb6c1;font-size:.65rem;line-height:1.45">Turn this reel into a full interactive story game with more choices, deeper plot, and multiple endings.</p><a class="rr-button primary" href="/storyboard">Expand Now →</a></article>
        <article class="rr-panel" style="padding:14px"><h3 style="margin:0">🎬 Generate More Reels</h3><p style="color:#aeb6c1;font-size:.65rem;line-height:1.45">Create more short reels from different moments, endings, or characters.</p><button class="rr-button primary" data-new-reel>Generate More →</button></article>
      </div>
    </section>`;
  renderTemplates();
  bindCreate();
}

function renderTemplates() {
  const row = document.querySelector("#rrTemplateRow");
  if (!row) return;
  const art = Object.values(styleArt);
  row.innerHTML = templates[state.create.genre].map((item,index)=>`
    <button class="rr-template-card ${item[0]===state.create.templateId?"is-selected":""}" data-template="${item[0]}">
      <span class="rr-template-art" style="background-image:linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.55)),url('${art[index%art.length]}')">${item[3]}</span>
      <span class="rr-template-copy"><strong>${item[1]}</strong><small>${item[2]}</small></span>
    </button>`).join("");
  row.querySelectorAll("[data-template]").forEach((button)=>button.addEventListener("click",()=>{
    state.create.templateId=button.dataset.template;
    renderTemplates();
    updateCreatePreview();
    track("template_selected",{templateId:state.create.templateId});
  }));
}

function bindCreate() {
  document.querySelectorAll("[data-genre]").forEach((button)=>button.addEventListener("click",()=>{
    state.create.genre=button.dataset.genre;
    state.create.templateId=templates[state.create.genre][0][0];
    renderCreate();
    track("genre_selected",{genre:state.create.genre});
  }));
  document.querySelectorAll("[data-setting]").forEach((button)=>button.addEventListener("click",()=>{
    const key=button.dataset.setting;
    const raw=button.dataset.value;
    state.create[key]=key==="durationSeconds"?Number(raw):raw;
    renderCreate();
  }));
  document.querySelector("#rrIdea")?.addEventListener("input",(event)=>{state.create.idea=event.target.value;});
  document.querySelector("#generateRealmReel")?.addEventListener("click",generateReel);
  document.querySelectorAll("[data-new-reel]").forEach((button)=>button.addEventListener("click",()=>window.location.href="/realmreels/create"));
}

async function generateReel() {
  const button=document.querySelector("#generateRealmReel");
  button.disabled=true;button.textContent="✦ Building Decision Tree...";
  try {
    const data=await api("/api/realm-reels",{method:"POST",body:{action:"create",settings:{...state.create,idea:document.querySelector("#rrIdea")?.value||""}}});
    if(!data.ok) throw new Error(data.error||"Could not generate RealmReel.");
    window.location.href=`/realmreels/director/${data.reel.id}`;
  } catch(error) {
    if(/log in/i.test(error.message)) showToast("Please log in to generate and save RealmReels.",true);
    else showToast(error.message,true);
    button.disabled=false;button.textContent="✦ Generate Reel";
  }
}

async function renderLibrary() {
  document.title="My RealmReels | OPRealm";
  main.innerHTML=pageHead("🎬 My RealmReels","Create, edit, preview and expand your short-form choice stories.",`<a class="rr-button" href="/realmreels/exports">Exports</a><a class="rr-button primary" href="/realmreels/create">+ New Reel</a>`) + `<div class="reels-loading"><span></span><strong>Loading your reels...</strong></div>`;
  try {
    const data=await api("/api/realm-reels",{method:"GET"});
    state.reels=data.reels||[];
    main.innerHTML=pageHead("🎬 My RealmReels","Create, edit, preview and expand your short-form choice stories.",`<a class="rr-button" href="/realmreels/exports">Exports</a><a class="rr-button primary" href="/realmreels/create">+ New Reel</a>`) +
      (state.reels.length?`<section class="rr-library-grid">${state.reels.map(reelCard).join("")}</section>`:emptyState("🎬","No RealmReels yet","Choose a viral template and create your first pick-your-path reel.","/realmreels/create","Create RealmReel"));
    bindLibrary();
  } catch(error) {
    main.innerHTML=pageHead("🎬 My RealmReels","Create, edit, preview and expand your short-form choice stories.",`<a class="rr-button primary" href="/realmreels/create">+ New Reel</a>`) + emptyState("🔐","Log in to see your reels",error.message,"/login","Log In");
  }
}

function reelCard(reel) {
  return `<article class="rr-reel-card">
    <div class="rr-reel-card-art"><img src="${escapeAttr(reel.storyboard?.[0]?.imageUrl||styleArt.cinematic)}" alt=""><span>${escapeHtml(reel.status||"draft")}</span></div>
    <div class="rr-reel-card-copy"><h3>${escapeHtml(reel.title)}</h3><p>${titleCase(reel.seed?.genre)} · ${reel.durationSeconds}s · ${reel.storyboard?.length||0} frames</p>
    <div class="rr-card-actions"><a class="rr-button primary" href="/realmreels/director/${reel.id}">Edit</a><a class="rr-button" href="/realmreels/preview/${reel.id}">Preview</a><button class="rr-button danger" data-delete-reel="${reel.id}">Delete</button></div></div>
  </article>`;
}

function bindLibrary() {
  document.querySelectorAll("[data-delete-reel]").forEach((button)=>button.addEventListener("click",async()=>{
    if(!window.confirm("Delete this RealmReel?")) return;
    await api("/api/realm-reels",{method:"POST",body:{action:"delete",reelId:button.dataset.deleteReel}});
    renderLibrary();
  }));
}

function renderDirector() {
  document.title=`${state.reel.title} | Reel Director`;
  const frame=selectedFrame();
  main.innerHTML=`
    ${pageHead("🎬 Reel Director Studio","Edit your choice reel, tweak the story, and make it go viral.",`
      <button class="rr-button" id="undoReel">↶ Undo</button><button class="rr-button" id="redoReel">↷ Redo</button>
      <a class="rr-button primary" href="/realmreels/preview/${state.reel.id}">▶ Preview Reel</a><button class="rr-button" id="exportReel">⇧ Export Reel</button>`)}
    <div class="rr-director-grid">
      <section class="rr-director-phone">${phoneMarkup(frame,state.selectedFrame)}</section>
      <section class="rr-panel rr-editor">${sceneEditor(frame)}</section>
    </div>
    <section class="rr-panel rr-timeline-panel">
      <div class="rr-panel-head"><h3>Storyboard Timeline <small style="color:#9fa7b3;font-weight:500">(Drag to reorder scenes)</small></h3><span style="font-size:.65rem">Total Duration: ${state.reel.durationSeconds}s</span></div>
      <div class="rr-timeline" id="reelTimeline">${state.reel.storyboard.map(timelineCard).join("")}<button class="rr-timeline-card" id="addReelFrame" style="display:grid;place-items:center">+ Add Scene</button></div>
    </section>
    <div class="rr-bottom-grid">
      ${decisionTreePanel()}${charactersPanel()}${enhancePanel()}${expandPanel()}
    </div>
    <footer class="rr-director-footer"><span>Reel ID: ${state.reel.id.slice(0,8).toUpperCase()}</span><span>Template: ${escapeHtml(state.reel.title)}</span><span>Genre: ${titleCase(state.reel.seed.genre)}</span><span>Length: ${state.reel.durationSeconds} Seconds</span><span>Difficulty: ${titleCase(state.reel.settings.difficulty)}</span><span style="margin-left:auto;color:#65d884">● Auto-save is ON</span></footer>`;
  bindDirector();
}

function sceneEditor(frame) {
  const options=frame.metadata?.options||[];
  return `<div class="rr-editor-title"><h2>Scene ${state.selectedFrame+1} of ${state.reel.storyboard.length}</h2><span class="rr-type-pill">${frame.frameType} scene</span></div>
    <label class="rr-field"><span>Headline Text</span><input data-frame-field="headlineText" maxlength="80" value="${escapeAttr(frame.headlineText)}"></label>
    <div class="rr-editor-two">
      <label class="rr-field"><span>Narration</span><textarea data-frame-field="narrationText">${escapeHtml(frame.narrationText||"")}</textarea><button class="rr-button" data-regenerate-voice>↻ Regenerate Voice</button></label>
      <label class="rr-field"><span>Countdown</span><select data-meta-field="countdownSeconds"><option value="3">3 Seconds</option><option value="5">5 Seconds</option><option value="7">7 Seconds</option></select><div style="display:flex;gap:10px;margin-top:8px">${[3,2,1].map(n=>`<span class="rr-countdown" style="width:42px;height:42px;font-size:1rem">${n}</span>`).join("")}</div></label>
    </div>
    ${options.length?`<div class="rr-field"><span>Options</span>${options.map((option,index)=>`<div class="rr-option-editor"><input data-option-label="${index}" value="${escapeAttr(option.label)}"><select data-option-outcome="${index}">${["reward","punishment","twist","betrayal","success","rejection","survival","failure"].map(type=>`<option ${option.outcomeType===type?"selected":""}>${type}</option>`).join("")}</select><small>→ ${escapeHtml(option.outcomeNodeId)}</small><button class="rr-button" data-remove-option="${index}">×</button></div>`).join("")}<button class="rr-button" id="addReelOption">+ Add Option</button></div>`:""}
    <div class="rr-visual-editor"><img src="${escapeAttr(frame.imageUrl||styleArt.cinematic)}" alt=""><div>
      <label class="rr-field"><span>Image Prompt</span><textarea data-frame-field="imagePrompt">${escapeHtml(frame.imagePrompt||"")}</textarea></label>
      <div style="display:flex;gap:7px"><button class="rr-button" data-regenerate-image>↻ Regenerate Image</button><button class="rr-button" data-edit-prompt>✎ Edit Prompt</button></div>
    </div></div>
    <div class="rr-editor-two" style="margin-top:10px">
      <label class="rr-field"><span>Transition & Effects</span><select data-frame-field="transition">${["cut","zoom","glitch","swipe","flash","blur"].map(x=>`<option ${frame.transition===x?"selected":""}>${x}</option>`).join("")}</select></label>
      <label class="rr-field"><span>Audio Cue</span><select data-frame-field="audioCue">${["tick","sting","boom","reveal","success","fail","romantic","creepy"].map(x=>`<option ${frame.audioCue===x?"selected":""}>${x}</option>`).join("")}</select></label>
    </div>
    <label class="rr-field"><span>Video Prompt</span><textarea data-frame-field="videoPrompt">${escapeHtml(frame.videoPrompt||"")}</textarea></label>
    <div style="display:flex;gap:7px;justify-content:flex-end"><button class="rr-button danger" id="deleteReelFrame">Delete Scene</button><button class="rr-button primary" id="saveReelNow">Save Changes</button></div>`;
}

function bindDirector() {
  document.querySelectorAll("[data-frame-index]").forEach((card)=>{
    card.addEventListener("click",()=>{state.selectedFrame=Number(card.dataset.frameIndex);renderDirector();});
    card.addEventListener("dragstart",()=>{card.classList.add("is-dragging");card.dataset.dragging="true";});
    card.addEventListener("dragend",()=>card.classList.remove("is-dragging"));
    card.addEventListener("dragover",(event)=>event.preventDefault());
    card.addEventListener("drop",(event)=>{
      event.preventDefault();const source=document.querySelector('[data-dragging="true"]');if(!source)return;
      mutate(()=>{const from=Number(source.dataset.frameIndex),to=Number(card.dataset.frameIndex);const [item]=state.reel.storyboard.splice(from,1);state.reel.storyboard.splice(to,0,item);state.reel.storyboard.forEach((x,i)=>x.order=i);state.selectedFrame=to;});
    });
  });
  document.querySelectorAll("[data-frame-field]").forEach((field)=>field.addEventListener("change",()=>mutate(()=>{selectedFrame()[field.dataset.frameField]=field.value;})));
  document.querySelectorAll("[data-option-label]").forEach((field)=>field.addEventListener("change",()=>mutate(()=>{selectedFrame().metadata.options[Number(field.dataset.optionLabel)].label=field.value;})));
  document.querySelectorAll("[data-option-outcome]").forEach((field)=>field.addEventListener("change",()=>mutate(()=>{selectedFrame().metadata.options[Number(field.dataset.optionOutcome)].outcomeType=field.value;})));
  document.querySelectorAll("[data-remove-option]").forEach((button)=>button.addEventListener("click",()=>mutate(()=>selectedFrame().metadata.options.splice(Number(button.dataset.removeOption),1))));
  document.querySelector("#addReelOption")?.addEventListener("click",()=>mutate(()=>{selectedFrame().metadata.options.push({id:crypto.randomUUID(),label:"New Option",outcomeNodeId:"next-scene",outcomeType:"twist"});}));
  document.querySelector("#addReelFrame")?.addEventListener("click",()=>mutate(()=>{const previous=selectedFrame();state.reel.storyboard.push({...structuredClone(previous),id:crypto.randomUUID(),order:state.reel.storyboard.length,headlineText:"NEW CHOICE",captionText:"What do you do next?"});state.selectedFrame=state.reel.storyboard.length-1;}));
  document.querySelector("#deleteReelFrame")?.addEventListener("click",()=>{if(state.reel.storyboard.length<=2)return showToast("A reel needs at least two frames.",true);mutate(()=>{state.reel.storyboard.splice(state.selectedFrame,1);state.reel.storyboard.forEach((x,i)=>x.order=i);state.selectedFrame=Math.max(0,state.selectedFrame-1);});});
  document.querySelector("#undoReel")?.addEventListener("click",undo);
  document.querySelector("#redoReel")?.addEventListener("click",redo);
  document.querySelector("#saveReelNow")?.addEventListener("click",saveReel);
  document.querySelector("#exportReel")?.addEventListener("click",exportCurrentReel);
  document.querySelector("[data-regenerate-image]")?.addEventListener("click",()=>mutate(()=>{selectedFrame().imageUrl=nextMockImage(selectedFrame().imageUrl);}));
  document.querySelector("[data-regenerate-voice]")?.addEventListener("click",()=>showToast("Mock narration refreshed. Voice generation can be connected to ElevenLabs next."));
  document.querySelectorAll("[data-enhance]").forEach((button)=>button.addEventListener("click",()=>enhance(button.dataset.enhance)));
  document.querySelectorAll("[data-expand-target]").forEach((button)=>button.addEventListener("click",()=>expand(button.dataset.expandTarget)));
}

function timelineCard(frame,index) {
  return `<article class="rr-timeline-card ${index===state.selectedFrame?"is-selected":""}" data-frame-index="${index}" data-type="${frame.frameType}" data-ending="${frame.metadata?.endingType||""}" draggable="true">
    <em>${index+1}</em><img src="${escapeAttr(frame.imageUrl||styleArt.cinematic)}" alt=""><strong>${frame.frameType}</strong><small>${escapeHtml(frame.headlineText)}</small><small>${frame.durationSeconds}s</small></article>`;
}

function decisionTreePanel() {
  return `<section class="rr-panel rr-bottom-panel"><h3>Decision Tree</h3><p>Visual branch summary</p><div class="rr-tree"><span class="rr-tree-node">HOOK</span><span>↓</span><span class="rr-tree-node">${escapeHtml(state.reel.decisionTree.decisions[0]?.prompt||"Choice")}</span><div class="rr-tree-row"><span class="rr-tree-node">Safe path</span><span class="rr-tree-node">Risk path</span></div><div class="rr-tree-row"><span class="rr-tree-node">Good ending</span><span class="rr-tree-node">Twist ending</span></div></div></section>`;
}
function charactersPanel() {
  return `<section class="rr-panel rr-bottom-panel"><h3>Characters</h3><p>Manage characters in this reel</p>${state.reel.characters.map((character,index)=>`<div class="rr-character-row"><img src="${Object.values(styleArt)[index%5]}" alt=""><div><strong>${escapeHtml(character.name)}</strong><small>${titleCase(character.role)} · ${escapeHtml(character.trustworthiness||"uncertain")}</small></div><button class="rr-button">✎</button></div>`).join("")}</section>`;
}
function enhancePanel() {
  const items=[["drama","Make More Dramatic ✨"],["twist","Add Bigger Twist 😈"],["humor","Make Funnier 😄"],["betrayal","Add Betrayal 🗡"],["suspense","Increase Suspense 😱"],["hook","Improve Hook 🎯"],["retention","Optimize for Retention 📈"]];
  return `<section class="rr-panel rr-bottom-panel"><h3>AI Enhance</h3><p>Make your reel even more engaging</p><div class="rr-enhance-list">${items.map(([id,label])=>`<button data-enhance="${id}">${label}</button>`).join("")}</div></section>`;
}
function expandPanel() {
  return `<section class="rr-panel rr-bottom-panel"><h3>Expand This Reel</h3><p>Turn this reel into a larger interactive experience.</p><div class="rr-expand-list"><button data-expand-target="storybook">📖 Create Full AI Story Book<br><small>Chapters & Illustrations</small></button><button data-expand-target="story_game">🎮 Create AI Story Game<br><small>Choices & Endings</small></button><button data-expand-target="comic">💬 Create Comic</button><button data-expand-target="movie">🎬 Create Movie Trailer</button></div></section>`;
}

function mutate(callback) {
  state.history.push(structuredClone(state.reel));
  if(state.history.length>30) state.history.shift();
  state.future=[];
  callback();
  renderDirector();
  scheduleSave();
}
function undo(){if(!state.history.length)return;state.future.push(structuredClone(state.reel));state.reel=state.history.pop();state.selectedFrame=Math.min(state.selectedFrame,state.reel.storyboard.length-1);renderDirector();}
function redo(){if(!state.future.length)return;state.history.push(structuredClone(state.reel));state.reel=state.future.pop();state.selectedFrame=Math.min(state.selectedFrame,state.reel.storyboard.length-1);renderDirector();}
let saveTimer=0;
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveReel,700);}
async function saveReel(){try{const data=await api("/api/realm-reels",{method:"POST",body:{action:"save",reel:state.reel}});state.reel=data.reel||state.reel;showToast("RealmReel saved.");}catch(error){showToast(error.message,true);}}
async function enhance(type){try{const data=await api("/api/realm-reels",{method:"POST",body:{action:"enhance",reelId:state.reel.id,enhancement:type}});state.history.push(structuredClone(state.reel));state.reel=data.reel;renderDirector();showToast("Reel enhanced.");}catch(error){showToast(error.message,true);}}
async function expand(target){try{const data=await api("/api/realm-reels",{method:"POST",body:{action:"expand",reelId:state.reel.id,target}});localStorage.setItem("oprealm_reel_story_seed",JSON.stringify(data.storySeed));window.location.href=target==="story_game"?"/story-game":"/storyboard";}catch(error){showToast(error.message,true);}}
async function exportCurrentReel(){try{const data=await api("/api/realm-reels",{method:"POST",body:{action:"export",reelId:state.reel.id}});showToast("Mock export is ready.");window.location.href="/realmreels/exports";}catch(error){showToast(error.message,true);}}

function renderPreview() {
  document.title=`Preview ${state.reel.title} | RealmReels`;
  const frame=selectedFrame();
  main.innerHTML=`
    ${pageHead("▶ Reel Preview",state.reel.title,`<a class="rr-button" href="/realmreels/director/${state.reel.id}">Edit Reel</a><button class="rr-button primary" id="previewExport">⇧ Export</button>`)}
    <div class="rr-preview-page">
      <section>${phoneMarkup(frame,state.selectedFrame)}</section>
      <section class="rr-panel rr-preview-controls">
        <h2>${escapeHtml(state.reel.title)}</h2><p>Preview your finished 9:16 reel. Captions, countdowns, choices, endings, and the OPRealm CTA are rendered from the saved storyboard.</p>
        <button class="rr-button primary" id="togglePreviewPlayback">${state.playing?"Pause":"Play"} Reel</button>
        <input class="rr-scrubber" id="previewScrubber" type="range" min="0" max="${state.reel.storyboard.length-1}" value="${state.selectedFrame}">
        <div class="rr-toggle-row"><span>Captions</span><button class="rr-button" id="toggleCaptions">${state.captions?"On":"Off"}</button></div>
        <div class="rr-toggle-row"><span>Current frame</span><strong>${state.selectedFrame+1} / ${state.reel.storyboard.length}</strong></div>
        <div class="rr-toggle-row"><span>Frame type</span><strong>${titleCase(frame.frameType)}</strong></div>
        <div class="rr-toggle-row"><span>Total duration</span><strong>${state.reel.durationSeconds}s</strong></div>
        ${frame.frameType==="cta"?`<a class="rr-button primary" id="previewCta" href="${escapeAttr(state.reel.cta.targetUrl||"/storyboard")}">${escapeHtml(state.reel.cta.buttonText)}</a>`:""}
        <div class="rr-storyboard-strip">${state.reel.storyboard.map((item,index)=>miniFrame(item.frameType,index,index===state.selectedFrame,item.imageUrl)).join("")}</div>
      </section>
    </div>`;
  bindPreview();
  if (!state.previewTracked) {
    state.previewTracked=true;
    track("reel_previewed",{},state.reel.id);
  }
}

function bindPreview() {
  document.querySelector("#togglePreviewPlayback")?.addEventListener("click",()=>{state.playing=!state.playing;if(state.playing)startPlayback();else stopPlayback();renderPreview();});
  document.querySelector("#previewScrubber")?.addEventListener("input",(event)=>{state.selectedFrame=Number(event.target.value);state.playElapsed=0;renderPreview();});
  document.querySelector("#toggleCaptions")?.addEventListener("click",()=>{state.captions=!state.captions;renderPreview();});
  document.querySelectorAll("[data-mini-frame]").forEach((button)=>button.addEventListener("click",()=>{state.selectedFrame=Number(button.dataset.miniFrame);renderPreview();}));
  document.querySelector("#previewExport")?.addEventListener("click",exportCurrentReel);
  document.querySelector("#previewCta")?.addEventListener("click",()=>track("cta_clicked",{type:state.reel.cta.type},state.reel.id));
}
function startPlayback(){clearTimeout(state.playTimer);const duration=(selectedFrame().durationSeconds||4)*1000;state.playTimer=setTimeout(()=>{if(!state.playing)return;state.selectedFrame=(state.selectedFrame+1)%state.reel.storyboard.length;renderPreview();startPlayback();},duration);}
function stopPlayback(){clearTimeout(state.playTimer);state.playTimer=0;}

async function renderExports() {
  document.title="RealmReels Exports | OPRealm";
  main.innerHTML=pageHead("⇧ RealmReels Exports","Mock MP4 export jobs and ready-to-share preview links.",`<a class="rr-button primary" href="/realmreels/create">+ New Reel</a>`) + `<div class="reels-loading"><span></span><strong>Loading exports...</strong></div>`;
  try {
    const data=await api("/api/realm-reels?status=exported",{method:"GET"});
    const reels=data.reels||[];
    main.innerHTML=pageHead("⇧ RealmReels Exports","Mock MP4 export jobs and ready-to-share preview links.",`<a class="rr-button primary" href="/realmreels/create">+ New Reel</a>`) +
      (reels.length?`<section class="rr-export-list">${reels.map(reel=>`<article class="rr-export-row"><img src="${escapeAttr(reel.storyboard?.[0]?.imageUrl||styleArt.cinematic)}" alt=""><div><strong>${escapeHtml(reel.title)}</strong><small>Ready · 9:16 · ${reel.durationSeconds}s · Mock MP4 placeholder</small></div><a class="rr-button primary" href="/realmreels/preview/${reel.id}?export=1">Open Export</a></article>`).join("")}</section>`:emptyState("⇧","No exports yet","Export a finished RealmReel from the Director Studio.","/realmreels","My Reels"));
  } catch(error){main.innerHTML+=emptyState("🔐","Log in to see exports",error.message,"/login","Log In");}
}

function phoneMarkup(frame,index) {
  const options=frame?.metadata?.options||state.reel?.decisionTree?.decisions?.[0]?.options||[{label:"ACCUSE HIM",shortHint:"He seems suspicious."},{label:"ACCUSE HER",shortHint:"She's not who she says."}];
  const title=frame?.headlineText||"WHO IS LYING?";
  return `<div class="rr-phone"><div class="rr-phone-screen">
    <img class="rr-phone-image" src="${escapeAttr(frame?.imageUrl||styleArt.realistic)}" alt=""><span class="rr-phone-shade"></span>
    <div class="rr-phone-content"><h2>${headlineMarkup(title)}</h2>${state.captions!==false?`<p>${escapeHtml(frame?.captionText||"You must find the truth before time runs out.")}</p>`:""}<span class="rr-phone-spacer"></span>
    ${frame?.frameType==="cta"?`<div class="rr-choice-cards" style="grid-template-columns:1fr"><div class="rr-choice-card"><strong>${escapeHtml(state.reel?.cta?.buttonText||"PLAY ON OPREALM")}</strong><small>${escapeHtml(state.reel?.cta?.headline||"Want the full interactive version?")}</small></div></div>`:
      options.length?`<div class="rr-choice-cards">${options.slice(0,2).map(option=>`<div class="rr-choice-card"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.shortHint||"Choose carefully.")}</small></div>`).join("")}</div><span class="rr-countdown">${frame?.metadata?.countdownSeconds||3}</span>`:""}
    <div class="rr-phone-controls"><div class="rr-progress-bar"><span style="width:${Math.max(5,((index+1)/(state.reel?.storyboard?.length||12))*100)}%"></span></div><div class="rr-player-row"><span>▶</span><span>00:${String(index*5+2).padStart(2,"0")} / 00:${state.reel?.durationSeconds||60}</span><span style="margin-left:auto">🔊　⛶</span></div></div>
    </div></div></div>`;
}

function settingsGroup(label,key,options) {
  return `<div class="rr-settings-group"><strong>${label}</strong><div class="rr-segmented">${options.map(([value,text])=>`<button class="rr-chip ${String(state.create[key])===String(value)?"is-selected":""}" data-setting="${key}" data-value="${value}">${text}</button>`).join("")}</div></div>`;
}
function selectedTemplate(){return templates[state.create.genre].find(item=>item[0]===state.create.templateId)||templates[state.create.genre][0];}
function createPreviewFrame(){const item=selectedTemplate();return{headlineText:item[1].toUpperCase(),captionText:item[2],imageUrl:styleArt[state.create.visualStyle],frameType:"choice",metadata:{countdownSeconds:3,options:[{label:"ACCUSE HIM",shortHint:"He seems suspicious."},{label:"ACCUSE HER",shortHint:"She's not who she says."}]}};}
function updateCreatePreview(){renderCreate();}
function miniFrame(label,index,selected=false,image=""){return `<button class="rr-mini-frame ${selected?"is-selected":""}" data-mini-frame="${index}"><img src="${escapeAttr(image||Object.values(styleArt)[index%5])}" alt=""><span>${index+1} ${titleCase(label)}</span></button>`;}
function summaryRow(label,value){return `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;color:#aeb6c1;font-size:.64rem"><span>${label}</span><strong style="color:#e8ebef">${escapeHtml(value)}</strong></div>`;}
function pageHead(title,subtitle,actions=""){return `<header class="rr-page-head"><div><h1>${title}</h1><p>${escapeHtml(subtitle)}</p></div><div class="rr-head-actions">${actions}</div></header>`;}
function emptyState(icon,title,copy,href,label){return `<section class="rr-empty"><span>${icon}</span><h2 style="margin:0;color:#fff">${escapeHtml(title)}</h2><p style="margin:0;max-width:500px">${escapeHtml(copy)}</p><a class="rr-button primary" href="${href}">${escapeHtml(label)}</a></section>`;}
function selectedFrame(){return state.reel.storyboard[state.selectedFrame]||state.reel.storyboard[0];}
function headlineMarkup(value){const words=escapeHtml(value).split(" ");if(words.length<2)return words[0]||"";return `${words.slice(0,-1).join(" ")} <span>${words.at(-1)}</span>`;}
function nextMockImage(current){const values=Object.values(styleArt);const index=values.indexOf(current);return values[(index+1)%values.length];}
function titleCase(value){return String(value||"").replaceAll("_"," ").replace(/\b\w/g,(m)=>m.toUpperCase());}
function escapeHtml(value){return String(value||"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
function escapeAttr(value){return escapeHtml(value).replaceAll("`","");}
function showToast(message,error=false){toast.hidden=false;toast.textContent=message;toast.className=`reels-toast${error?" is-error":""}`;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3500);}

async function api(url,{method="GET",body}={}) {
  const response=await fetch(url,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok===false) throw new Error(data.error||`Request failed (${response.status}).`);
  return data;
}
async function fetchJson(url){const response=await fetch(url,{cache:"no-store"});return response.json();}
function track(eventType,metadata={},reelId=""){if(!state.account?.authenticated)return;fetch("/api/realm-reels",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"analytics",reelId,eventType,metadata})}).catch(()=>{});}
