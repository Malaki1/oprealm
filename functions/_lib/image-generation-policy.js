export const SCENE_IMAGE_MODES = Object.freeze({
  draft: Object.freeze({
    id: "draft",
    label: "Draft",
    provider: "black_forest_labs",
    model: "flux-2-pro-preview",
    quality: "production",
    size: "1344x768",
    credits: 1,
    estimatedCostUsd: 0.045,
  }),
  final: Object.freeze({
    id: "final",
    label: "Final",
    provider: "black_forest_labs",
    model: "flux-2-pro-preview",
    quality: "production",
    size: "1344x768",
    credits: 24,
    estimatedCostUsd: 0.045,
  }),
});

export function sceneImageMode(value, options = {}) {
  const selected = SCENE_IMAGE_MODES[String(value || "").toLowerCase()] || SCENE_IMAGE_MODES.draft;
  return options.testMode && selected.id === "final" ? SCENE_IMAGE_MODES.draft : selected;
}
