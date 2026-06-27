export const IMAGE_COMPARISON_MODELS = Object.freeze([
  Object.freeze({ id: "openai-gpt-image-2-low", provider: "OpenAI", model: "gpt-image-2", quality: "low", cost: 0.005 }),
  Object.freeze({ id: "openai-gpt-image-mini-low", provider: "OpenAI", model: "gpt-image-1-mini", quality: "low", cost: 0.006 }),
  Object.freeze({ id: "openai-gpt-image-15-medium", provider: "OpenAI", model: "gpt-image-1.5", quality: "medium", cost: 0.05 }),
  Object.freeze({ id: "openai-gpt-image-15-high", provider: "OpenAI", model: "gpt-image-1.5", quality: "high", cost: 0.2 }),
  Object.freeze({ id: "google-gemini-25-flash-image", provider: "Google", model: "gemini-2.5-flash-image", quality: "1K", cost: 0.039 }),
  Object.freeze({ id: "google-gemini-31-flash-image", provider: "Google", model: "gemini-3.1-flash-image", quality: "1K", cost: 0.067 }),
  Object.freeze({ id: "google-gemini-3-pro-image", provider: "Google", model: "gemini-3-pro-image", quality: "1K", cost: 0.134 }),
  Object.freeze({ id: "bfl-flux-2-klein-4b", provider: "Black Forest Labs", model: "flux-2-klein-4b", quality: "1MP", cost: 0.014 }),
  Object.freeze({ id: "bfl-flux-2-pro", provider: "Black Forest Labs", model: "flux-2-pro-preview", quality: "1MP", cost: 0.03 }),
]);

export function selectedComparisonModels(ids) {
  const selected = new Set(Array.isArray(ids) ? ids.map(String) : []);
  return IMAGE_COMPARISON_MODELS.filter((item) => selected.has(item.id));
}
