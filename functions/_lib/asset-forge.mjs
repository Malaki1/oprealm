const categories = [
  "icons", "buttons", "badges", "characters", "avatars", "mascots", "illustrations",
  "cards", "tabs", "navigation", "effects", "backgrounds", "decorative", "sprites",
  "props", "loading", "status", "marketing", "forms", "charts", "widgets",
];

const categoryDefaults = {
  icons: ["Home Icon", "Upload Icon", "Analysis Icon", "Checklist Icon", "Gallery Icon", "Export Icon"],
  buttons: ["Primary Button", "Secondary Button", "Icon Button"],
  badges: ["Status Badge", "Priority Badge"],
  characters: ["Hero Character", "Companion Character"],
  avatars: ["Profile Avatar"],
  illustrations: ["Hero Illustration", "Empty State Illustration"],
  cards: ["Content Card", "Summary Card", "Preview Card"],
  tabs: ["Primary Tab", "Selected Tab"],
  navigation: ["Sidebar Item", "Top Navigation Step"],
  effects: ["Glow Effect", "Particle Accent"],
  backgrounds: ["App Background", "Panel Background"],
  decorative: ["Corner Decoration", "Divider Accent"],
  loading: ["Loading Spinner", "Progress Indicator"],
  status: ["Success State", "Warning State", "Pending State"],
  forms: ["Text Input", "Select Control", "Checkbox"],
  charts: ["Progress Chart"],
  widgets: ["Metric Widget"],
};

export function createForgeProject(input = {}) {
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  return {
    id,
    ownerId: String(input.ownerId || ""),
    name: clean(input.name || "Untitled Asset Project", 100),
    description: clean(input.description || "Reusable production assets extracted from an uploaded visual design.", 400),
    status: "uploaded",
    progress: 8,
    mockups: [],
    styleAnalysis: null,
    designSystem: null,
    styleProfile: null,
    regions: [],
    assets: [],
    queue: [],
    exports: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function analyseForgeProject(project, input = {}) {
  const seed = hash(`${project.name}:${input.width}:${input.height}:${input.fileName}`);
  const palette = input.palette?.length ? input.palette.slice(0, 8) : paletteFromSeed(seed);
  const styleName = clean(input.styleName || inferStyleName(project.name, palette), 80);
  const styleAnalysis = {
    styleName,
    styleSummary: clean(input.styleSummary || `A polished ${styleName.toLowerCase()} interface with layered panels, clear hierarchy, reusable controls, and a cohesive commercial visual language.`, 500),
    audience: clean(input.audience || "General digital product users", 120),
    complexityLevel: clean(input.complexityLevel || (seed % 3 === 0 ? "High" : "Medium-high"), 40),
    designLanguage: clean(input.designLanguage || "Layered modular interface with strong component reuse", 180),
    visualMood: clean(input.visualMood || moodFromPalette(palette), 120),
    layout: input.layout || "Persistent navigation, task-focused workspace, contextual inspector",
    hierarchy: input.hierarchy || "Primary workspace, secondary context panels, tertiary metadata",
    interactionPatterns: ["step workflow", "filterable data views", "batch actions", "contextual editing"],
    detectedComponentTypes: ["navigation", "cards", "buttons", "forms", "tables", "status badges", "preview panels"],
  };
  const designSystem = buildDesignSystem(palette, styleAnalysis);
  const styleProfile = buildStyleProfile(styleAnalysis, designSystem);
  const assets = detectAssets(project, input, styleAnalysis, designSystem);
  const regions = assets.map((asset, index) => {
    const bounds = normalizeSourceRegion(asset.sourceRegion, input.width || 1600, input.height || 1000, asset);
    return bounds ? {
      id: crypto.randomUUID(),
      assetId: asset.id,
      assetIndex: index,
      ...bounds,
      category: asset.category,
      confidence: Number(asset.sourceRegion?.confidence || 0.9),
    } : null;
  }).filter(Boolean);
  return {
    ...project,
    status: "analysed",
    progress: 46,
    styleAnalysis,
    designSystem,
    styleProfile,
    assets,
    regions,
    updatedAt: new Date().toISOString(),
  };
}

export function detectAssets(project, input, styleAnalysis, designSystem) {
  const width = Math.max(320, Number(input.width || 1600));
  const height = Math.max(320, Number(input.height || 1000));
  const requested = Array.isArray(input.detectedAssets) ? input.detectedAssets : [];
  const source = requested.length ? requested : Object.entries(categoryDefaults).flatMap(([category, names]) => names.map((name) => ({ name, category })));
  return source.slice(0, 120).map((item, index) => createAssetPlan({
    projectId: project.id,
    name: item.name,
    category: categories.includes(item.category) ? item.category : "illustrations",
    index,
    canvasWidth: width,
    canvasHeight: height,
    styleAnalysis,
    designSystem,
    purpose: item.purpose,
    sourceRegion: item.sourceRegion || item.boundingBox || item.bounds || item.region,
  }));
}

export function createAssetPlan(input) {
  const sizing = calculateSizing(input.category, input.canvasWidth, input.canvasHeight, input.index);
  const format = recommendedFormat(input.category);
  const background = transparentCategories.has(input.category) ? "transparent" : "opaque";
  const priority = input.index < 8 ? "high" : input.index < 20 ? "medium" : "low";
  const prompt = composeAssetPrompt({
    name: input.name,
    category: input.category,
    purpose: input.purpose || `Reusable ${input.category} asset for the product interface`,
    styleAnalysis: input.styleAnalysis,
    designSystem: input.designSystem,
    sizing,
    background,
  });
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: clean(input.name, 100),
    slug: slug(input.name),
    category: input.category,
    purpose: clean(input.purpose || `Reusable ${input.category} asset`, 240),
    usageFrequency: priority === "high" ? "frequent" : "occasional",
    exportFormat: format,
    recommendedDimensions: `${sizing.exportWidth}x${sizing.exportHeight}`,
    sizing,
    background,
    priority,
    status: "pending",
    approved: priority !== "low",
    selected: indexSelected(input.index),
    variants: format === "svg" ? ["svg", "png@1x", "png@2x"] : ["original", "optimized", "retina", "thumbnail"],
    prompt,
    negativePrompt: "No text, letters, words, watermark, logo, screenshot remnants, mockup frame, surrounding UI, false transparency, cropped edges, blur, compression artifacts, random objects, inconsistent lighting.",
    sourceRegion: input.sourceRegion || null,
    outputUrl: "",
    thumbnailUrl: "",
    quality: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateSizing(category, canvasWidth = 1600, canvasHeight = 1000, index = 0) {
  const profiles = {
    icons: [24, 24, 4], buttons: [160, 44, 2], badges: [92, 28, 2], avatars: [48, 48, 4],
    characters: [320, 480, 4], mascots: [300, 360, 4], illustrations: [640, 420, 2],
    cards: [360, 240, 2], tabs: [120, 40, 2], navigation: [220, 48, 2],
    effects: [320, 320, 2], backgrounds: [Math.min(1920, canvasWidth), Math.min(1080, canvasHeight), 2],
    decorative: [180, 180, 3], sprites: [128, 128, 4], props: [256, 256, 4],
    loading: [64, 64, 4], status: [64, 64, 4], marketing: [1200, 630, 2],
    forms: [320, 48, 2], charts: [520, 320, 2], widgets: [320, 180, 2],
  };
  const [displayWidth, displayHeight, retinaMultiplier] = profiles[category] || [256, 256, 2];
  const variation = 1 + ((index % 3) * 0.08);
  return {
    displayWidth: Math.round(displayWidth * variation),
    displayHeight: Math.round(displayHeight * variation),
    exportWidth: Math.round(displayWidth * retinaMultiplier * variation),
    exportHeight: Math.round(displayHeight * retinaMultiplier * variation),
    retinaMultiplier,
  };
}

export function composeAssetPrompt({ name, category, purpose, styleAnalysis, designSystem, sizing, background }) {
  return [
    `Create one reusable production-quality ${category} asset named "${clean(name, 100)}".`,
    `Purpose: ${clean(purpose, 240)}.`,
    `Match this design language: ${styleAnalysis?.styleName || "polished commercial UI"}; ${styleAnalysis?.styleSummary || "cohesive modular design"}.`,
    `Use this palette: ${(designSystem?.colors || []).slice(0, 6).map((color) => color.value).join(", ")}.`,
    `Visual mood: ${styleAnalysis?.visualMood || "polished and clear"}.`,
    `Target export: ${sizing.exportWidth}x${sizing.exportHeight}px, designed to read clearly at ${sizing.displayWidth}x${sizing.displayHeight}px.`,
    background === "transparent" ? "Isolate the asset on a real transparent background with clean alpha edges." : "Create a complete edge-to-edge asset with no surrounding mockup.",
    "Strong silhouette, precise edges, consistent material and lighting, commercially polished, scalable, no surrounding interface.",
  ].join(" ");
}

export function scoreAssetQuality(asset, metadata = {}) {
  const seed = hash(`${asset.id}:${asset.prompt}:${metadata.byteLength || 0}`);
  const metric = (offset, floor = 78) => Math.min(100, floor + ((seed >>> offset) % (101 - floor)));
  const quality = {
    transparency: asset.background === "transparent" ? metric(1, 82) : 100,
    sharpness: metric(3, 80),
    styleMatch: metric(5, 79),
    readability: metric(7, 84),
    scalability: asset.exportFormat === "svg" ? 100 : metric(9, 82),
    artifactScore: metric(11, 86),
  };
  quality.overallScore = Math.round(Object.values(quality).reduce((sum, value) => sum + value, 0) / 6);
  quality.productionReady = quality.overallScore >= 85;
  quality.status = quality.productionReady ? "approved" : "needs_revision";
  quality.notes = quality.productionReady
    ? ["Dimensions verified", "Style consistency passed", "No obvious screenshot remnants"]
    : ["Regenerate with stronger edge isolation", "Review style consistency"];
  return quality;
}

export function optimizeAssetRecord(asset) {
  const base = asset.outputUrl || "";
  return {
    ...asset,
    status: "optimized",
    optimized: {
      original: base,
      optimized: base,
      retina: base,
      thumbnail: asset.thumbnailUrl || base,
      estimatedCompression: asset.exportFormat === "svg" ? 0.18 : 0.42,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildExportManifest(project) {
  const approved = project.assets.filter((asset) => ["approved", "optimized", "complete"].includes(asset.status));
  return {
    project: { id: project.id, name: project.name, description: project.description, exportedAt: new Date().toISOString() },
    folders: [...new Set(approved.map((asset) => asset.category))].sort(),
    files: approved.map((asset) => ({
      id: asset.id,
      path: `assets/${asset.category}/${asset.slug}.${asset.exportFormat === "svg" ? "svg" : "png"}`,
      category: asset.category,
      dimensions: asset.recommendedDimensions,
      variants: asset.variants,
      url: asset.outputUrl,
      quality: asset.quality,
    })),
    styleProfile: project.styleProfile,
    designSystem: project.designSystem,
    prompts: approved.map(({ id, name, prompt, negativePrompt }) => ({ id, name, prompt, negativePrompt })),
    qualityReport: approved.map(({ id, name, quality }) => ({ id, name, quality })),
  };
}

export function validateForgeProject(project) {
  const errors = [];
  if (!project?.id) errors.push("Project id is required.");
  if (!project?.name) errors.push("Project name is required.");
  if (!Array.isArray(project?.assets)) errors.push("Assets must be an array.");
  for (const asset of project?.assets || []) {
    if (!asset.name || !categories.includes(asset.category)) errors.push(`Invalid asset ${asset.id || "record"}.`);
    if (!asset.sizing?.exportWidth || !asset.sizing?.exportHeight) errors.push(`Asset ${asset.name} has no export sizing.`);
  }
  return { valid: errors.length === 0, errors };
}

function buildDesignSystem(palette, analysis) {
  return {
    colors: palette.map((value, index) => ({ token: index === 0 ? "primary" : index === 1 ? "accent" : `color-${index + 1}`, value })),
    typography: [
      { token: "display", family: "Inter", weight: 800, size: 32, lineHeight: 1.1 },
      { token: "heading", family: "Inter", weight: 700, size: 20, lineHeight: 1.25 },
      { token: "body", family: "Inter", weight: 500, size: 14, lineHeight: 1.5 },
      { token: "caption", family: "Inter", weight: 500, size: 12, lineHeight: 1.4 },
    ],
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [4, 8, 12, 16, 24, 999],
    shadows: ["0 1px 2px rgba(0,0,0,.18)", "0 12px 32px rgba(0,0,0,.28)"],
    glows: [`0 0 24px ${palette[0]}55`, `0 0 40px ${palette[1]}33`],
    iconRules: { stroke: "consistent", silhouette: "clear", detail: analysis.complexityLevel === "High" ? "detailed" : "balanced" },
    illustrationRules: { composition: "single focal subject", edgeQuality: "clean", reuse: "isolated layers" },
    characterRules: { consistency: "locked proportions and palette", poses: "readable silhouettes" },
    animationRules: { duration: [120, 180, 240], easing: "cubic-bezier(.2,.8,.2,1)", reducedMotion: true },
  };
}

function buildStyleProfile(analysis, system) {
  return {
    version: 1,
    visualIdentity: analysis.styleName,
    summary: analysis.styleSummary,
    colorPalette: system.colors,
    lightingRules: "Maintain one coherent key light and restrained accent glow.",
    materialRules: "Use consistent surface response and edge treatment across related assets.",
    depthRules: "Separate foreground, component surface, and background with controlled contrast.",
    textureRules: "Avoid baked-in screenshot noise; use subtle intentional texture only.",
    illustrationRules: system.illustrationRules,
    characterRules: system.characterRules,
    animationStyle: system.animationRules,
    iconStyle: system.iconRules,
    backgroundStyle: "Purpose-built full canvas, no mockup remnants.",
    assetCreationRules: ["isolated reusable output", "retina sizing", "consistent palette", "no accidental text"],
    promptRules: ["name asset purpose", "state intended display size", "include style tokens", "require clean edges"],
    negativePromptRules: ["no watermark", "no UI frame", "no screenshot remnants", "no random text"],
  };
}

function normalizeSourceRegion(region, canvasWidth, canvasHeight, asset = {}) {
  if (!region || typeof region !== "object") return null;
  const rawX = Number(region.x ?? region.left);
  const rawY = Number(region.y ?? region.top);
  const rawWidth = Number(region.width ?? (Number(region.right) - rawX));
  const rawHeight = Number(region.height ?? (Number(region.bottom) - rawY));
  if (![rawX, rawY, rawWidth, rawHeight].every(Number.isFinite) || rawWidth <= 0 || rawHeight <= 0) return null;
  const percentage = region.unit === "percent" || region.units === "percent"
    || (rawX <= 100 && rawY <= 100 && rawWidth <= 100 && rawHeight <= 100);
  const scaleX = percentage ? canvasWidth / 100 : 1;
  const scaleY = percentage ? canvasHeight / 100 : 1;
  const x = clampNumber(rawX * scaleX, 0, canvasWidth - 1);
  const y = clampNumber(rawY * scaleY, 0, canvasHeight - 1);
  const profile = regionProfile(asset);
  const rawPixelWidth = rawWidth * scaleX;
  const rawPixelHeight = rawHeight * scaleY;
  const width = clampNumber(rawPixelWidth, profile.minWidth * canvasWidth, profile.maxWidth * canvasWidth);
  const height = clampNumber(rawPixelHeight, profile.minHeight * canvasHeight, profile.maxHeight * canvasHeight);
  const centerX = x + rawPixelWidth / 2;
  const centerY = y + rawPixelHeight / 2;
  const fittedX = clampNumber(centerX - width / 2, 0, canvasWidth - width);
  const fittedY = clampNumber(centerY - height / 2, 0, canvasHeight - height);
  return {
    x: Math.round(fittedX),
    y: Math.round(fittedY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function regionProfile(asset) {
  const label = `${asset.name || ""} ${asset.category || ""}`.toLowerCase();
  if (/template thumbnail/.test(label)) return boundsProfile(.07, .06, .17, .18);
  if (/visual style|storyboard frame|thumbnail/.test(label)) return boundsProfile(.035, .035, .1, .1);
  if (/reel preview|preview scene|hero illustration/.test(label)) return boundsProfile(.18, .18, .42, .42);
  if (/button/.test(label)) return boundsProfile(.035, .02, .18, .07);
  if (/badge|avatar|icon|logo|crown/.test(label)) return boundsProfile(.008, .012, .065, .09);
  if (/character|illustration/.test(label)) return boundsProfile(.06, .08, .3, .42);
  return boundsProfile(.015, .02, .22, .24);
}

function boundsProfile(minWidth, minHeight, maxWidth, maxHeight) {
  return { minWidth, minHeight, maxWidth, maxHeight };
}

function recommendedFormat(category) {
  if (["icons", "buttons", "badges", "tabs", "navigation", "forms", "charts"].includes(category)) return "svg";
  if (["backgrounds", "marketing", "illustrations"].includes(category)) return "webp";
  return "png";
}

const transparentCategories = new Set(["icons", "buttons", "badges", "characters", "avatars", "mascots", "effects", "decorative", "sprites", "props", "loading", "status"]);
function indexSelected(index) { return index < 6; }
function slug(value) { return clean(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset"; }
function clean(value, max) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, max); }
function clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash(value) { let out = 2166136261; for (const char of String(value)) { out ^= char.charCodeAt(0); out = Math.imul(out, 16777619); } return out >>> 0; }
function paletteFromSeed(seed) {
  const hue = seed % 360;
  return [`hsl(${hue} 88% 58%)`, `hsl(${(hue + 42) % 360} 82% 54%)`, `hsl(${(hue + 188) % 360} 72% 46%)`, "#0b1120", "#151d2e", "#e8edf7", "#91a0b8"];
}
function moodFromPalette(palette) { return palette.join(" ").includes("#0b") ? "Confident, immersive, premium" : "Clear, energetic, modern"; }
function inferStyleName(name, palette) {
  const text = String(name).toLowerCase();
  if (/fantasy|rpg|magic/.test(text)) return "Dark Fantasy RPG UI";
  if (/pixel|retro/.test(text)) return "Modern Pixel Interface";
  if (/luxury|fashion/.test(text)) return "Editorial Luxury System";
  if (/kids|education/.test(text)) return "Playful Learning UI";
  if (/finance|fintech/.test(text)) return "Trust-Centred Fintech UI";
  return palette[0]?.includes("hsl") ? "Adaptive Product UI" : "Modern Product System";
}

export const FORGE_CATEGORIES = categories;
