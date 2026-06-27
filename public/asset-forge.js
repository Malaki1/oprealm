const main=document.querySelector("#forgeMain");
const toast=document.querySelector("#forgeToast");
const route=location.pathname.replace(/\/+$/,"").split("/").filter(Boolean)[0]||"dashboard";
const state={projects:[],project:null,selectedAsset:null,filter:"all",status:"all",query:"",demo:false,busy:false};
const steps=["upload","style-analysis","asset-map","asset-checklist","generation-queue","asset-gallery","export"];
const categoryIcons={icons:"◉",buttons:"▰",badges:"◆",characters:"♟",avatars:"●",mascots:"♞",illustrations:"▧",cards:"▤",tabs:"▱",navigation:"☰",effects:"✦",backgrounds:"▨",decorative:"✣",sprites:"♙",props:"◇",loading:"◌",status:"✓",marketing:"☆",forms:"▭",charts:"▥",widgets:"▦"};

boot();
async function boot(){
  bindShell();
  markNavigation();
  await loadProjects();
  const requestedId=route==="projects"?location.pathname.split("/").filter(Boolean)[1]:"";
  const saved=localStorage.getItem("forge_project_id");
  state.project=state.projects.find(p=>p.id===(requestedId||saved))||state.projects[0]||null;
  if(state.project)localStorage.setItem("forge_project_id",state.project.id);
  updateProjectMini();
  render();
}
function bindShell(){
  document.querySelector("#forgeMenu")?.addEventListener("click",()=>document.querySelector(".forge-sidebar")?.classList.toggle("open"));
}
function markNavigation(){
  document.querySelectorAll("[data-route]").forEach(a=>a.classList.toggle("active",a.dataset.route===route||(route==="projects"&&a.dataset.route==="dashboard")));
  const index=steps.indexOf(route);
  document.querySelectorAll(".forge-steps a").forEach((a,i)=>{a.classList.toggle("active",i===index);a.classList.toggle("done",index>i)});
}
async function loadProjects(){
  try{const data=await api("/api/asset-forge");state.projects=data.projects||[]}
  catch(error){state.demo=true;state.projects=[sampleProject()];if(!/log in/i.test(error.message))notify(error.message,true)}
}
function render(){
  if(route==="dashboard"||route==="projects")return renderDashboard();
  if(route==="upload")return renderUpload();
  if(!state.project)return renderNoProject();
  if(route==="style-analysis")return renderAnalysis();
  if(route==="design-system")return renderDesignSystem();
  if(route==="asset-map")return renderAssetMap();
  if(route==="asset-checklist")return renderChecklist();
  if(route==="design-director")return renderDirector();
  if(route==="generation-queue")return renderQueue();
  if(route==="asset-gallery")return renderGallery();
  if(route==="export")return renderExport();
  if(route==="settings")return renderSettings();
  renderDashboard();
}
function header(title,subtitle,actions=""){
  const loginAction=state.demo?`<a class="btn primary" href="${attr(loginUrl())}">Log In</a>`:"";
  return `${state.demo?authNotice():""}<header class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="head-actions">${actions}${loginAction}</div></header>`;
}
function loginUrl(){return `/login?next=${encodeURIComponent(location.pathname+location.search)}`}
function authNotice(){return `<section class="panel auth-notice"><div><strong>Preview mode</strong><span>Log in to upload mockups, save projects, generate assets and export files.</span></div><a class="btn primary" href="${attr(loginUrl())}">Log In to Continue</a></section>`}
function requireLogin(message="Log in to continue."){notify(message,true);setTimeout(()=>location.href=loginUrl(),350)}
function renderDashboard(){
  document.title="Dashboard | Mockup Asset Forge";
  main.innerHTML=header("Asset Forge Dashboard","Manage mockup analysis and reusable production asset projects.",`<a class="btn primary" href="/upload">＋ New Project</a>`) +
  `<section class="dashboard-grid">
    ${metric("Projects",state.projects.length,"Active workspaces")}
    ${metric("Detected Assets",state.projects.reduce((n,p)=>n+(p.assets?.length||0),0),"Across all projects")}
    ${metric("Production Ready",state.projects.reduce((n,p)=>n+(p.assets||[]).filter(a=>["approved","optimized"].includes(a.status)).length,0),"QA approved")}
    ${metric("Exports",state.projects.reduce((n,p)=>n+(p.exports?.length||0),0),"Downloadable packs")}
  </section>
  <section class="projects-grid">${state.projects.map(projectCard).join("")}</section>`;
  document.querySelectorAll("[data-open-project]").forEach(button=>button.addEventListener("click",()=>{selectProject(button.dataset.openProject);location.href="/asset-checklist"}));
}
function metric(label,value,note){return `<article class="panel metric"><small>${esc(label)}</small><strong>${value}</strong><span class="muted">${esc(note)}</span></article>`}
function projectCard(project){
  const mockup=project.mockups?.[0];
  return `<article class="panel project-card"><div class="project-thumb">${mockup?.url?`<img src="${attr(mockup.url)}" alt="">`:`<span style="font-size:3rem">◇</span>`}</div><div class="project-copy"><span class="badge">${esc(project.status)}</span><h3>${esc(project.name)}</h3><p>${esc(project.description)}</p><div class="progress"><i style="width:${project.progress||0}%"></i></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><small class="muted">${project.assets?.length||0} assets · ${project.progress||0}%</small><button class="btn" data-open-project="${attr(project.id)}">Open</button></div></div></article>`;
}
function renderUpload(){
  document.title="Upload Mockup | Mockup Asset Forge";
  main.innerHTML=header("Upload Mockup","Start with one screen or add multiple screens for a complete application.")+
  `<div class="upload-layout"><section class="panel panel-pad">
    <div class="dropzone" id="dropzone"><input id="mockupFile" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" hidden>
      <span style="font-size:3.6rem;color:#ad57ff">⇧</span><strong>Drop a mockup here</strong>
      <p>PNG, JPG, WEBP, SVG or PDF up to 15 MB. Use a high-resolution image with clear visibility of UI elements.</p>
      <button class="btn primary" id="chooseMockup">Choose File</button><small class="muted">Screenshots are references only. The Forge creates reusable assets rather than crops.</small>
    </div></section>
    <aside class="panel panel-pad"><div class="panel-title"><h2>Project Details</h2></div><div class="form-grid">
      <div class="field"><label>Project name</label><input id="projectName" value="${attr(state.project?.name||"")}" placeholder="Example: Fintech Mobile App"></div>
      <div class="field"><label>Description</label><textarea id="projectDescription" rows="5" placeholder="What is this interface and what assets do you need?">${esc(state.project?.description||"")}</textarea></div>
      <button class="btn primary" id="createEmptyProject">${state.demo?"Log In to Upload":state.project?"Add Additional Screen":"Create Project"}</button>
      ${state.demo?`<p class="muted">Your selected file stays on your device until you are logged in and start the upload.</p>`:""}
    </div></aside></div>`;
  const input=document.querySelector("#mockupFile"),zone=document.querySelector("#dropzone");
  document.querySelector("#chooseMockup").textContent=state.demo?"Log In to Choose File":"Choose File";
  document.querySelector("#chooseMockup").onclick=()=>state.demo?requireLogin("Log in, then choose your mockup."):input.click();
  zone.ondragover=e=>{e.preventDefault();zone.classList.add("drag")};zone.ondragleave=()=>zone.classList.remove("drag");
  zone.ondrop=e=>{e.preventDefault();zone.classList.remove("drag");handleUpload(e.dataTransfer.files[0])};
  input.onchange=()=>handleUpload(input.files[0]);
  document.querySelector("#createEmptyProject").onclick=async()=>{if(state.project){input.click();return}await createProject()};
}
async function createProject(){
  if(state.demo)return requireLogin("Log in to create a saved project.");
  const name=document.querySelector("#projectName").value.trim()||"Untitled Asset Project";
  const description=document.querySelector("#projectDescription").value.trim();
  const data=await api("/api/asset-forge",{method:"POST",body:{action:"create",name,description}});
  state.project=data.project;state.projects.unshift(data.project);selectProject(data.project.id);notify("Project created. Choose a mockup to continue.");
}
async function handleUpload(file){
  if(!file)return;
  if(state.demo)return requireLogin("Log in, then choose your mockup again to upload it.");
  if(!state.project)await createProject();
  const dataUrl=await readFile(file);
  let dimensions={width:0,height:0};
  if(file.type.startsWith("image/")&&file.type!=="image/svg+xml")dimensions=await imageDimensions(dataUrl);
  setBusy(true,"Uploading mockup...");
  try{
    const data=await api("/api/asset-forge",{method:"POST",body:{action:"upload",projectId:state.project.id,fileName:file.name,dataUrl,...dimensions}});
    state.project=data.project;replaceProject();notify("Mockup uploaded. Starting visual analysis.");
    await analyseCurrent();
  }catch(error){notify(error.message,true);setBusy(false)}
}
async function analyseCurrent(returnPath="/style-analysis"){
  setBusy(true,"Analysing layout, style, components and reusable assets...");
  try{const data=await api("/api/asset-forge",{method:"POST",body:{action:"analyse",projectId:state.project.id}});state.project=data.project;replaceProject();selectProject(state.project.id);location.href=returnPath}
  catch(error){notify(error.message,true);setBusy(false)}
}
function renderAnalysis(){
  document.title="Style Analysis | Mockup Asset Forge";
  const p=state.project,a=p.styleAnalysis,m=p.mockups?.at(-1);
  if(!a)return renderNeedsAnalysis();
  main.innerHTML=header("Style Analysis",`AI vision report for ${p.name}`,`<a class="btn" href="/design-system">Open Design System</a><a class="btn primary" href="/asset-map">Continue to Asset Map</a>`)+
  `<div class="analysis-layout"><aside class="panel panel-pad mockup-card"><div class="panel-title"><h2>Uploaded Mockup</h2><span class="badge">${m?.width||0}×${m?.height||0}</span></div>${m?.url?`<img src="${attr(m.url)}" alt="Uploaded mockup">`:""}<h3>${esc(m?.name||p.name)}</h3><p class="muted">${formatBytes(m?.byteLength||0)}</p></aside>
  <section class="analysis-cards">
    ${analysisCard("Style Name",a.styleName,a.styleSummary)}
    ${analysisCard("Audience & Complexity",a.audience,`Complexity: ${a.complexityLevel}`)}
    ${analysisCard("Design Language",a.designLanguage,a.layout)}
    ${analysisCard("Visual Mood",a.visualMood,a.hierarchy)}
    <article class="panel analysis-card" style="grid-column:1/-1"><h3>Extracted Palette</h3><div class="palette">${p.designSystem.colors.map(c=>`<span class="swatch" title="${attr(c.value)}" style="background:${attr(c.value)}"></span>`).join("")}</div></article>
    <article class="panel analysis-card" style="grid-column:1/-1"><h3>Detected Components</h3><div>${a.detectedComponentTypes.map(x=>`<span class="badge" style="margin:3px">${esc(x)}</span>`).join("")}</div></article>
  </section></div>`;
}
function analysisCard(title,strong,copy){return `<article class="panel analysis-card"><h3>${esc(title)}</h3><strong>${esc(strong)}</strong><p>${esc(copy)}</p></article>`}
function renderDesignSystem(){
  document.title="Design System | Mockup Asset Forge";const d=state.project.designSystem;
  if(!d)return renderNeedsAnalysis();
  main.innerHTML=header("Design System","Extracted tokens and production rules for consistent asset creation.",`<button class="btn" id="downloadRulebook">⇩ style-profile.json</button><a class="btn primary" href="/asset-map">Map Assets</a>`)+
  `<section class="panel panel-pad"><div class="panel-title"><h2>Color Tokens</h2><span class="badge">${d.colors.length} colors</span></div><div class="token-grid">${d.colors.map(c=>`<article class="token-card panel"><div style="height:70px;border-radius:6px;background:${attr(c.value)}"></div><strong>${esc(c.token)}</strong><code>${esc(c.value)}</code></article>`).join("")}</div></section>
  <section class="analysis-cards" style="margin-top:12px">${ruleCard("Typography",d.typography.map(t=>`${t.token}: ${t.size}px / ${t.weight}`))}${ruleCard("Spacing Scale",d.spacing.map(x=>`${x}px`))}${ruleCard("Radius Scale",d.radii.map(x=>`${x}px`))}${ruleCard("Animation",[`Easing: ${d.animationRules.easing}`,`Durations: ${d.animationRules.duration.join(", ")}ms`])}</section>`;
  document.querySelector("#downloadRulebook").onclick=()=>downloadJson("style-profile.json",state.project.styleProfile);
}
function ruleCard(title,items){return `<article class="panel panel-pad"><h3>${esc(title)}</h3>${items.map(x=>`<p class="muted">${esc(x)}</p>`).join("")}</article>`}
function renderAssetMap(){
  document.title="Asset Map | Mockup Asset Forge";const p=state.project,m=p.mockups?.at(-1),regions=p.regions.filter(r=>r.assetId).slice(0,36);
  const overlays=regions.map((r,i)=>{const a=p.assets.find(x=>x.id===r.assetId)||p.assets[r.assetIndex];return `<button class="region" data-region="${i}" aria-label="${attr(a?.name||`Region ${i+1}`)}" title="${attr(a?.name||`Region ${i+1}`)}" style="left:${regionPercent(r.x,m?.width)}%;top:${regionPercent(r.y,m?.height)}%;width:${regionPercent(r.width,m?.width)}%;height:${regionPercent(r.height,m?.height)}%"><span>${i+1}</span><i class="region-handle" data-resize-region="${i}"></i></button>`}).join("");
  const list=regions.map((r,i)=>{const a=p.assets.find(x=>x.id===r.assetId)||p.assets[r.assetIndex];return `<button data-region-link="${i}"><span>${i+1}. ${esc(a?.name||"Detected asset")}</span><span class="badge">${esc(a?.category||r.category)}</span></button>`}).join("");
  main.innerHTML=header("Asset Map","Review tightly detected asset bounds. Regions identify specific reusable visuals, never broad screenshot sections.",`<button class="btn" id="refineRegions">Refine Positions</button><button class="btn" id="addRegionAsset">+ Add Asset</button><a class="btn primary" href="/asset-checklist">Approve Map</a>`)+
  `<div class="map-help">Drag boxes to move them. Drag the lower-right handle to resize. Corrections auto-save.</div><div class="map-layout"><section class="panel map-canvas"><div class="map-image">${m?.url?`<img src="${attr(m.url)}" alt="">`:""}${overlays}</div>${regions.length?"":`<div class="map-empty"><strong>No precise positions saved yet.</strong><span>Run Refine Positions to locate each visible asset.</span></div>`}</section><aside class="panel panel-pad"><div class="panel-title"><h2>Detected Regions</h2><span class="badge">${regions.length}</span></div><div class="summary-list region-list">${list}</div></aside></div>`;
  document.querySelector("#addRegionAsset").onclick=addAssetDialog;
  document.querySelector("#refineRegions").onclick=()=>state.demo?requireLogin("Log in to refine saved asset positions."):analyseCurrent("/asset-map");
  document.querySelectorAll("[data-region],[data-region-link]").forEach(btn=>btn.onclick=()=>selectRegion(Number(btn.dataset.region??btn.dataset.regionLink)));
  bindRegionEditing(regions,m);
}
function regionPercent(value,total){return Math.max(0,Math.min(100,(Number(value||0)/Math.max(1,Number(total||1)))*100))}
function selectRegion(index){document.querySelectorAll(".region,[data-region-link]").forEach(x=>x.classList.remove("active"));document.querySelector(`[data-region="${index}"]`)?.classList.add("active");document.querySelector(`[data-region-link="${index}"]`)?.classList.add("active")}
function bindRegionEditing(regions,mockup){
  if(state.demo)return;
  const image=document.querySelector(".map-image"),sourceWidth=Number(mockup?.width||1),sourceHeight=Number(mockup?.height||1);
  document.querySelectorAll(".region").forEach(box=>box.onpointerdown=event=>{
    event.preventDefault();event.stopPropagation();
    const index=Number(box.dataset.region),region=regions[index],resizing=event.target.matches("[data-resize-region]");
    const startX=event.clientX,startY=event.clientY,start={x:region.x,y:region.y,width:region.width,height:region.height};
    box.setPointerCapture(event.pointerId);selectRegion(index);
    box.onpointermove=move=>{
      const rect=image.getBoundingClientRect(),dx=(move.clientX-startX)/rect.width*sourceWidth,dy=(move.clientY-startY)/rect.height*sourceHeight;
      if(resizing){region.width=Math.max(4,Math.min(sourceWidth-region.x,start.width+dx));region.height=Math.max(4,Math.min(sourceHeight-region.y,start.height+dy))}
      else{region.x=Math.max(0,Math.min(sourceWidth-region.width,start.x+dx));region.y=Math.max(0,Math.min(sourceHeight-region.height,start.y+dy))}
      box.style.left=`${regionPercent(region.x,sourceWidth)}%`;box.style.top=`${regionPercent(region.y,sourceHeight)}%`;box.style.width=`${regionPercent(region.width,sourceWidth)}%`;box.style.height=`${regionPercent(region.height,sourceHeight)}%`;
    };
    box.onpointerup=()=>{box.onpointermove=null;box.onpointerup=null;clearTimeout(bindRegionEditing.saveTimer);bindRegionEditing.saveTimer=setTimeout(()=>saveCurrent(false).then(()=>notify("Asset position saved.")),250)};
  });
}
function renderAssetMapLegacy(){
  document.title="Asset Map | Mockup Asset Forge";const p=state.project,m=p.mockups?.at(-1);
  main.innerHTML=header("Asset Map","Review detected regions. Regions are references for new reusable assets, never screenshot crops.",`<button class="btn" id="addRegionAsset">＋ Add Asset</button><a class="btn primary" href="/asset-checklist">Approve Map</a>`)+
  `<div class="map-layout"><section class="panel map-canvas"><div class="map-image">${m?.url?`<img src="${attr(m.url)}" alt="">`:""}${p.regions.slice(0,24).map((r,i)=>`<button class="region" data-region="${i}" style="left:${r.x/(m?.width||1600)*100}%;top:${r.y/(m?.height||1000)*100}%;width:${r.width/(m?.width||1600)*100}%;height:${r.height/(m?.height||1000)*100}%">${i+1}</button>`).join("")}</div></section>
  <aside class="panel panel-pad"><div class="panel-title"><h2>Detected Regions</h2><span class="badge">${p.regions.length}</span></div><div class="summary-list">${p.assets.slice(0,24).map((a,i)=>`<div><span>${i+1}. ${esc(a.name)}</span><span class="badge">${esc(a.category)}</span></div>`).join("")}</div></aside></div>`;
  document.querySelector("#addRegionAsset").onclick=addAssetDialog;
  document.querySelectorAll("[data-region]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".region").forEach(x=>x.classList.remove("active"));btn.classList.add("active")});
}
function renderChecklist(){
  document.title="Asset Checklist | Mockup Asset Forge";const p=state.project;
  const assets=filteredAssets();if(!state.selectedAsset||!p.assets.some(a=>a.id===state.selectedAsset.id))state.selectedAsset=assets[0]||p.assets[0];
  main.innerHTML=`<div class="forge-checklist">
    <aside class="check-left">
      ${mockupPanel(p)}
      ${styleSummaryPanel(p)}
      ${categoriesPanel(p)}
    </aside>
    <section>
      <div class="panel asset-table">
        <div class="toolbar"><div><strong>Asset Checklist</strong> <span class="badge">${p.assets.length} Assets</span></div>
          <select id="categoryFilter"><option value="all">All Categories</option>${unique(p.assets.map(a=>a.category)).map(c=>`<option ${state.filter===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
          <select id="statusFilter"><option value="all">All Status</option>${unique(p.assets.map(a=>a.status)).map(c=>`<option ${state.status===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
          <input class="search" id="assetSearch" placeholder="⌕ Search assets..." value="${attr(state.query)}"><button class="btn primary" id="addAsset">＋ Add Asset</button>
        </div>
        <div class="table-wrap"><table class="assets"><thead><tr><th>✓</th><th>Asset</th><th>Category</th><th>Size</th><th>Background</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${assets.map(assetRow).join("")}</tbody></table></div>
        <div class="table-actions"><span>${p.assets.filter(a=>a.selected).length} assets selected</span><div class="head-actions"><button class="btn primary" id="generateSelected">↻ Generate Selected</button><button class="btn" id="generateApproved">▷ Generate All Approved</button><a class="btn" href="/generation-queue">Ⅱ View Queue</a></div></div>
      </div>
      ${queueStrip(p)}
    </section>
    <aside class="check-right">${assetPreviewPanel(state.selectedAsset)}${assetDetailsPanel(state.selectedAsset)}<section class="panel panel-pad"><h3>☼ Pro Tip</h3><p class="muted">Use high-resolution mockups with clear visibility of UI elements. Avoid blurry or low-quality references.</p></section></aside>
  </div>`;
  bindChecklist();
}
function mockupPanel(p){const m=p.mockups?.at(-1);return `<section class="panel panel-pad mockup-card"><div class="panel-title"><h3>Uploaded Mockup</h3></div>${m?.url?`<img src="${attr(m.url)}" alt="">`:""}<small class="muted">${esc(m?.name||"mockup")}</small></section>`}
function styleSummaryPanel(p){const a=p.styleAnalysis;return `<section class="panel panel-pad"><div class="panel-title"><h3>Style Analysis Summary</h3><a class="btn" href="/style-analysis">View Report</a></div><div class="summary-list"><div><span>Style Name</span><strong>${esc(a?.styleName||"Pending")}</strong></div></div><p class="prompt-copy">${esc(a?.styleSummary||"Analyse the mockup to extract its visual system.")}</p><div class="palette">${(p.designSystem?.colors||[]).slice(0,7).map(c=>`<span class="swatch" style="background:${attr(c.value)}"></span>`).join("")}</div></section>`}
function categoriesPanel(p){const counts=Object.entries(groupCount(p.assets,"category"));return `<section class="panel panel-pad"><div class="panel-title"><h3>Detected Asset Categories</h3><span class="muted">${counts.length} found</span></div><div class="analysis-cards">${counts.slice(0,8).map(([c,n])=>`<div class="panel panel-pad"><span>${categoryIcons[c]||"◇"}</span> <strong>${esc(c)}</strong><b style="float:right">${n}</b></div>`).join("")}</div></section>`}
function assetRow(a){return `<tr data-asset-row="${a.id}"><td><input class="check" type="checkbox" data-select="${a.id}" ${a.selected?"checked":""}></td><td><div class="asset-name"><span class="asset-icon">${categoryIcons[a.category]||"◇"}</span><span><strong>${esc(a.name)}</strong><small>${esc(a.purpose)}</small></span></div></td><td><span class="badge">${esc(a.category)}</span></td><td>${esc(a.recommendedDimensions)}</td><td>${esc(a.background)}</td><td><span class="badge ${a.priority==="high"?"red":a.priority==="medium"?"orange":""}">${esc(a.priority)}</span></td><td>${statusBadge(a.status)}</td><td><div class="row-actions"><button class="icon-btn" data-view="${a.id}" title="Preview">⊙</button><button class="icon-btn" data-generate="${a.id}" title="Generate">↻</button></div></td></tr>`}
function statusBadge(s){const cls=["approved","optimized","complete"].includes(s)?"green":s==="generating"?"blue":s==="needs_revision"?"red":"";return `<span class="badge ${cls}">${esc(s.replaceAll("_"," "))}</span>`}
function assetPreviewPanel(a){return `<section class="panel panel-pad"><div class="panel-title"><h3>Asset Preview</h3></div><div class="preview-box">${a?.outputUrl?`<img src="${attr(a.outputUrl)}" alt="${attr(a.name)}">`:`<span class="preview-fallback"></span>`}</div><h4>${esc(a?.slug||"select-an-asset")}.${a?.exportFormat==="svg"?"svg":"png"}</h4><small class="muted">${esc(a?.recommendedDimensions||"")} · ${a?.exportFormat?.toUpperCase()||""}</small></section>`}
function assetDetailsPanel(a){if(!a)return "";return `<section class="panel panel-pad details"><div class="panel-title"><h3>Asset Details</h3><button class="btn" id="editAsset">Edit</button></div><dl><dt>Name</dt><dd>${esc(a.name)}</dd><dt>Category</dt><dd>${esc(a.category)}</dd><dt>Background</dt><dd>${esc(a.background)}</dd><dt>Priority</dt><dd>${statusBadge(a.priority)}</dd><dt>Status</dt><dd>${statusBadge(a.status)}</dd></dl><div><small class="muted">Generation Prompt</small><p class="prompt-copy">${esc(a.prompt)}</p></div><div><small class="muted">Negative Prompt</small><p class="prompt-copy">${esc(a.negativePrompt)}</p></div><button class="btn primary" id="regenerateAsset">↻ ${a.outputUrl?"Regenerate":"Generate"} Asset</button>${a.outputUrl?`<a class="btn" href="${attr(a.outputUrl)}" download>⇩ Download Asset</a>`:""}</section>`}
function queueStrip(p){const jobs=(p.queue||[]).slice(0,3);if(!jobs.length)return "";return `<section class="panel panel-pad"><div class="panel-title"><h3>Generation Queue</h3><span class="badge">${jobs.filter(j=>j.status==="processing").length} in progress</span></div><div class="queue-strip">${jobs.map(j=>{const a=p.assets.find(x=>x.id===j.assetId);return `<article class="panel queue-card"><div class="preview-box">${a?.outputUrl?`<img src="${attr(a.outputUrl)}">`:"◇"}</div><div><h4>${esc(a?.slug||"asset")}.${a?.exportFormat||"png"}</h4><div class="progress"><i style="width:${j.progress||0}%"></i></div><small>${j.progress||0}%</small></div></article>`}).join("")}<a class="btn" href="/generation-queue">Open Queue</a></div></section>`}
function bindChecklist(){
  document.querySelector("#categoryFilter").onchange=e=>{state.filter=e.target.value;renderChecklist()};
  document.querySelector("#statusFilter").onchange=e=>{state.status=e.target.value;renderChecklist()};
  document.querySelector("#assetSearch").oninput=e=>{
    state.query=e.target.value;
    clearTimeout(bindChecklist.searchTimer);
    bindChecklist.searchTimer=setTimeout(()=>{
      renderChecklist();
      const search=document.querySelector("#assetSearch");
      search?.focus();
      search?.setSelectionRange(state.query.length,state.query.length);
    },120);
  };
  document.querySelector("#addAsset").onclick=addAssetDialog;
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{state.selectedAsset=state.project.assets.find(a=>a.id===b.dataset.view);renderChecklist()});
  document.querySelectorAll("[data-generate]").forEach(b=>b.onclick=()=>generateOne(b.dataset.generate));
  document.querySelectorAll("[data-select]").forEach(b=>b.onchange=()=>{const a=state.project.assets.find(x=>x.id===b.dataset.select);a.selected=b.checked;saveCurrent(false)});
  document.querySelector("#regenerateAsset")?.addEventListener("click",()=>generateOne(state.selectedAsset.id));
  document.querySelector("#generateSelected").onclick=()=>generateBatch(state.project.assets.filter(a=>a.selected&&!["approved","optimized"].includes(a.status)));
  document.querySelector("#generateApproved").onclick=()=>generateBatch(state.project.assets.filter(a=>a.approved&&!["approved","optimized"].includes(a.status)));
}
function filteredAssets(){return state.project.assets.filter(a=>(state.filter==="all"||a.category===state.filter)&&(state.status==="all"||a.status===state.status)&&(!state.query||`${a.name} ${a.purpose}`.toLowerCase().includes(state.query.toLowerCase())))}
async function addAssetDialog(){
  const name=prompt("Asset name");if(!name)return;const category=prompt("Category (icons, buttons, characters, backgrounds, effects)", "icons")||"icons";
  if(state.demo){notify("Demo asset added locally.");state.project.assets.push({...sampleProject().assets[0],id:crypto.randomUUID(),name,category});return render()}
  const data=await api("/api/asset-forge",{method:"POST",body:{action:"add_asset",projectId:state.project.id,name,category}});state.project=data.project;replaceProject();render();
}
async function generateOne(id){
  if(state.demo)return notify("Log in to generate production assets.",true);
  notify("Generating asset with the project style rulebook...");
  try{const data=await api("/api/asset-forge",{method:"POST",body:{action:"generate",projectId:state.project.id,assetId:id}});state.project=data.project;state.selectedAsset=data.asset;replaceProject();render();notify("Asset generated and quality checked.")}
  catch(error){notify(error.message,true)}
}
async function generateBatch(assets){
  if(!assets.length)return notify("No eligible assets selected.");
  if(state.demo)return requireLogin("Log in to generate production assets.");
  notify(`Queueing all ${assets.length} assets for background generation...`);
  try{
    const data=await api("/api/asset-forge",{method:"POST",body:{action:"generate_batch",projectId:state.project.id,assetIds:assets.map(asset=>asset.id),idempotencyKey:crypto.randomUUID()}});
    state.project=data.project;replaceProject();render();notify(`${data.queued} assets queued. Generation will continue in the background.`);
    pollAssetBatch(data.jobId);
  }catch(error){notify(error.message,true)}
}
async function pollAssetBatch(jobId){
  for(let attempt=0;attempt<180;attempt+=1){
    await delay(attempt<10?3000:6000);
    try{
      const job=await api(`/api/generation-job?id=${encodeURIComponent(jobId)}`);
      if(job.status==="completed"){
        await reloadCurrentProject();
        render();
        const failed=job.failed?.length||0;
        notify(`${job.completed||0} assets completed${failed?`, ${failed} failed`:""}.`,failed>0);
        return;
      }
      if(job.status==="failed"){
        await reloadCurrentProject();render();notify(job.error||"Asset generation batch failed.",true);return;
      }
    }catch(error){if(attempt>5){notify(error.message,true);return}}
  }
  notify("Generation is still running. You can monitor it in Generation Queue.");
}
async function reloadCurrentProject(){const data=await api(`/api/asset-forge?id=${encodeURIComponent(state.project.id)}`);state.project=data.project;replaceProject()}
function renderDirector(){
  document.title="Design Director | Mockup Asset Forge";const p=state.project;
  main.innerHTML=header("Design Director","Review what should exist, how it should scale, and which formats belong in production.",`<a class="btn primary" href="/asset-checklist">Approve Plan</a>`)+
  `<section class="panel asset-table"><div class="table-wrap"><table class="assets"><thead><tr><th>Asset</th><th>Purpose</th><th>Usage</th><th>Format</th><th>Display</th><th>Export</th><th>Variants</th></tr></thead><tbody>${p.assets.map(a=>`<tr><td><strong>${esc(a.name)}</strong><br><span class="badge">${esc(a.category)}</span></td><td>${esc(a.purpose)}</td><td>${esc(a.usageFrequency)}</td><td>${a.exportFormat.toUpperCase()}</td><td>${a.sizing.displayWidth}×${a.sizing.displayHeight}</td><td>${a.sizing.exportWidth}×${a.sizing.exportHeight}</td><td>${a.variants.map(v=>`<span class="badge">${esc(v)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div></section>`;
}
function renderQueue(){
  document.title="Generation Queue | Mockup Asset Forge";const p=state.project,jobs=p.queue||[];
  main.innerHTML=header("Generation Queue","Prioritized generation jobs with retry-ready status records.",`<a class="btn" href="/asset-checklist">Add Assets</a><a class="btn primary" href="/asset-gallery">Open Gallery</a>`)+
  `<section class="panel panel-pad">${jobs.length?`<div class="queue-strip" style="grid-template-columns:repeat(3,1fr)">${jobs.map(j=>{const a=p.assets.find(x=>x.id===j.assetId);return `<article class="panel queue-card"><div class="preview-box">${a?.outputUrl?`<img src="${attr(a.outputUrl)}">`:"◇"}</div><div><span class="badge">${esc(j.status)}</span><h4>${esc(a?.name||"Generation job")}</h4><div class="progress"><i style="width:${j.progress}%"></i></div><small>${j.progress}% · ${esc(a?.priority||"medium")} priority</small></div></article>`}).join("")}</div>`:`<div class="empty"><span>☷</span><h2>No generation jobs yet</h2><p>Select assets in the checklist and generate them individually or as a batch.</p><a class="btn primary" href="/asset-checklist">Open Checklist</a></div>`}</section>`;
}
function renderGallery(){
  document.title="Asset Gallery | Mockup Asset Forge";const generated=state.project.assets.filter(a=>a.outputUrl);
  main.innerHTML=header("Asset Gallery","Review, approve, regenerate, optimize and download generated assets.",`<a class="btn" href="/generation-queue">Queue</a><a class="btn primary" href="/export">Export Pack</a>`)+
  (generated.length?`<section class="gallery-grid">${generated.map(a=>`<article class="panel gallery-card"><div class="gallery-art"><img src="${attr(a.outputUrl)}" alt="${attr(a.name)}"></div><div class="gallery-copy"><span class="badge green">${a.quality?.overallScore||"—"} QA</span><h3>${esc(a.name)}</h3><p class="muted">${esc(a.category)} · ${esc(a.recommendedDimensions)} · ${a.exportFormat.toUpperCase()}</p><div class="head-actions"><a class="btn" href="${attr(a.outputUrl)}" download>Download</a><button class="btn primary" data-optimize="${a.id}">Optimize</button></div></div></article>`).join("")}</section>`:`<div class="panel empty"><span>▧</span><h2>Your generated assets will appear here</h2><p>The gallery includes metadata, prompts, quality scores and production actions.</p><a class="btn primary" href="/asset-checklist">Generate Assets</a></div>`);
  document.querySelectorAll("[data-optimize]").forEach(b=>b.onclick=()=>optimizeOne(b.dataset.optimize));
}
async function optimizeOne(id){if(state.demo)return notify("Log in to optimize saved assets.",true);const data=await api("/api/asset-forge",{method:"POST",body:{action:"optimize",projectId:state.project.id,assetId:id}});state.project=data.project;replaceProject();render();notify("Optimized variants recorded.")}
function renderExport(){
  document.title="Export Pack | Mockup Asset Forge";const p=state.project,approved=p.assets.filter(a=>["approved","optimized","complete"].includes(a.status)),folders=unique(approved.map(a=>a.category));
  main.innerHTML=header("Export Asset Pack","Package approved assets, rulebooks, prompts and QA reports into a production ZIP.",`<button class="btn primary" id="buildExport">⇩ Build Project.zip</button>`)+
  `<div class="export-layout"><section class="panel panel-pad"><div class="panel-title"><h2>Package Contents</h2><span class="badge">${approved.length} assets</span></div><div class="folder-tree">${folders.map(f=>`<div class="folder">▣ /assets/${esc(f)} <strong style="float:right">${approved.filter(a=>a.category===f).length}</strong></div>`).join("")}</div>
  <h3>Project Files</h3>${["style-profile.json","design-system.json","asset-manifest.json","prompts.json","quality-report.json","README.txt"].map(f=>`<p class="panel panel-pad">◇ ${f}</p>`).join("")}</section>
  <aside class="panel panel-pad"><h2>Export Summary</h2><div class="summary-list"><div><span>Project</span><strong>${esc(p.name)}</strong></div><div><span>Approved assets</span><strong>${approved.length}</strong></div><div><span>Folders</span><strong>${folders.length}</strong></div><div><span>Completion</span><strong>${p.progress}%</strong></div></div>${p.exports?.[0]?`<a class="btn primary" style="margin-top:18px;width:100%" href="${attr(p.exports[0].url)}">⇩ Download ${esc(p.exports[0].fileName)}</a>`:""}</aside></div>`;
  document.querySelector("#buildExport").onclick=buildExport;
}
async function buildExport(){if(state.demo)return notify("Log in to build a downloadable ZIP.",true);notify("Packaging asset files and project rulebooks...");const data=await api("/api/asset-forge",{method:"POST",body:{action:"export",projectId:state.project.id}});state.project=data.project;replaceProject();render();notify("Project ZIP is ready.")}
function renderSettings(){
  document.title="Settings | Mockup Asset Forge";
  main.innerHTML=header("Workspace Settings","Configure generation defaults and quality thresholds.")+
  `<div class="analysis-cards"><section class="panel panel-pad form-grid"><h2>Generation</h2><div class="field"><label>Default quality</label><select><option>Draft · low cost</option><option>Production</option></select></div><div class="field"><label>Auto-regenerate threshold</label><input type="number" value="85"></div><div class="field"><label>Default background</label><select><option>Smart by category</option><option>Transparent</option><option>Opaque</option></select></div><button class="btn primary" id="saveForgeSettings">Save Settings</button></section><section class="panel panel-pad"><h2>Security</h2><p class="muted">Provider keys remain server-side. Uploads are MIME checked, size limited, stored in owned R2 paths, and served through authenticated file routes.</p><p class="muted">Generation and project mutations use server-side rate limiting.</p></section></div>`;
  document.querySelector("#saveForgeSettings").onclick=()=>notify("Settings saved locally.");
}
function renderNoProject(){main.innerHTML=header("No Project Selected","Upload a mockup or choose an existing project.")+`<div class="panel empty"><span>◇</span><h2>Start an Asset Forge project</h2><p>Upload any interface mockup to extract its design system and create a production asset plan.</p><a class="btn primary" href="/upload">Upload Mockup</a></div>`}
function renderNeedsAnalysis(){main.innerHTML=header("Analysis Required","Run visual analysis before opening this workspace.")+`<div class="panel empty"><span>◉</span><h2>Analyse the uploaded mockup</h2><p>The analysis creates the design rulebook, component inventory and intelligent asset sizing plan.</p><button class="btn primary" id="runAnalysis">Analyse Mockup</button></div>`;document.querySelector("#runAnalysis").onclick=analyseCurrent}
function setBusy(busy,message){state.busy=busy;if(busy)main.innerHTML=`<div class="forge-loader"><span></span><strong>${esc(message)}</strong></div>`}
function selectProject(id){state.project=state.projects.find(p=>p.id===id)||state.project;localStorage.setItem("forge_project_id",id);updateProjectMini()}
function replaceProject(){const i=state.projects.findIndex(p=>p.id===state.project.id);if(i>=0)state.projects[i]=state.project;else state.projects.unshift(state.project);updateProjectMini()}
function updateProjectMini(){const box=document.querySelector("#forgeProjectMini");if(!box)return;if(!state.project)return;box.querySelector("strong").textContent=state.project.name;box.querySelector("span").textContent=`${state.project.progress}% Complete · ${state.project.assets?.length||0} assets`;box.querySelector("i").style.width=`${state.project.progress}%`}
async function saveCurrent(show=true){if(state.demo)return;try{const data=await api("/api/asset-forge",{method:"POST",body:{action:"save",project:state.project}});state.project=data.project;replaceProject();if(show)notify("Project saved.")}catch(error){notify(error.message,true)}}
async function api(url,options={}){const response=await fetch(url,{method:options.method||"GET",headers:options.body?{"content-type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false){const error=new Error(data.error||`Request failed (${response.status})`);error.status=response.status;throw error}return data}
function notify(message,error=false){toast.hidden=false;toast.textContent=message;toast.style.borderColor=error?"#a33b4a":"#7e3bc0";clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.hidden=true,4200)}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function imageDimensions(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>resolve({width:0,height:0});img.src=src})}
function downloadJson(name,data){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function unique(items){return [...new Set(items.filter(Boolean))]}
function groupCount(items,key){return items.reduce((out,item)=>(out[item[key]]=(out[item[key]]||0)+1,out),{})}
function formatBytes(n){if(!n)return "—";return n>1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.round(n/1024)} KB`}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(v){return esc(v)}
function sampleProject(){
  const colors=["#8b35f5","#5e24c6","#1677bd","#24a9a1","#e39b2b","#df3f89","#9d3e96"];
  const names=["Body Tab Icon","Face Tab Icon","Hair Tab Icon","Outfit Tab Icon","Accessories Icon","Personality Icon","Voice Icon","Companion Icon","Lock Icon","Save Button Icon","Magical Platform","Companion Dragon"];
  const cats=["icons","icons","icons","icons","icons","icons","icons","icons","icons","icons","effects","characters"];
  const assets=names.map((name,i)=>({id:`sample-${i}`,name,slug:name.toLowerCase().replaceAll(" ","-"),category:cats[i],purpose:`Reusable ${name.toLowerCase()} for product navigation`,usageFrequency:i<6?"frequent":"occasional",exportFormat:i<10?"svg":"png",recommendedDimensions:i<10?"512x512":"1024x1024",sizing:{displayWidth:i<10?32:256,displayHeight:i<10?32:256,exportWidth:i<10?512:1024,exportHeight:i<10?512:1024,retinaMultiplier:4},background:"transparent",priority:i<5?"high":"medium",status:i<4?"approved":i===4?"generating":"pending",approved:i<10,selected:i<4,variants:["original","optimized","retina","thumbnail"],prompt:`Create a reusable production-quality ${cats[i]} asset named ${name}. Match a dark fantasy RPG interface with neon purple glow, polished 2.5D detail, clean edges and real transparency.`,negativePrompt:"No text, watermark, logo, frame, screenshot remnants, cropped edges or blur.",outputUrl:i<4?"/assets/icons/essential/favorite.svg":"",quality:i<4?{overallScore:94}:null,createdAt:new Date().toISOString()}));
  return {id:"demo-fantasy-rpg",name:"Fantasy RPG UI",description:"High-detail fantasy RPG interface with neon purple and blue accents.",status:"analysed",progress:46,mockups:[{name:"fantasy-rpg-ui-mockup.png",url:"/assets/roblox-creator-dashboard-inspo.png",width:1600,height:1000,byteLength:2490368}],styleAnalysis:{styleName:"Dark Fantasy RPG UI",styleSummary:"High-detail fantasy RPG interface with neon purple and blue accents, glowing effects, rounded panels, and polished 2.5D illustration style.",audience:"Fantasy game players and creators",complexityLevel:"High",designLanguage:"Glassmorphism panels with glowing 2.5D iconography",visualMood:"Magical, premium, immersive",layout:"Persistent sidebar, central production table, contextual inspector",hierarchy:"Strong workspace hierarchy",detectedComponentTypes:["navigation","cards","icons","tables","status badges","preview panels"]},designSystem:{colors:colors.map((value,i)=>({token:`color-${i+1}`,value})),typography:[{token:"display",size:32,weight:800}],spacing:[4,8,12,16,24,32,48],radii:[4,8,12,16,24],animationRules:{easing:"cubic-bezier(.2,.8,.2,1)",duration:[120,180,240]}},styleProfile:{visualIdentity:"Dark Fantasy RPG UI"},assets,regions:assets.map((a,i)=>({id:`r-${i}`,x:(i%4)*380+30,y:Math.floor(i/4)*280+35,width:300,height:210,category:a.category,confidence:.9})),queue:[{id:"q1",assetId:"sample-4",status:"processing",progress:67,jobType:"generate"},{id:"q2",assetId:"sample-10",status:"processing",progress:45,jobType:"generate"},{id:"q3",assetId:"sample-11",status:"processing",progress:22,jobType:"generate"}],exports:[],createdAt:new Date().toISOString()};
}
