export const SCENE_IMAGE_MODES = Object.freeze({
  draft: Object.freeze({
    id: "draft",
    label: "Draft",
    model: "gpt-image-1-mini",
    quality: "low",
    size: "1536x1024",
    credits: 1,
    estimatedCostUsd: 0.006,
  }),
  final: Object.freeze({
    id: "final",
    label: "Final",
    model: "gpt-image-1.5",
    quality: "high",
    size: "1536x1024",
    credits: 24,
    estimatedCostUsd: 0.2,
  }),
});

export function sceneImageMode(value) {
  return SCENE_IMAGE_MODES[String(value || "").toLowerCase()] || SCENE_IMAGE_MODES.draft;
}
