import type { ReelStoryboardFrame } from "../schema/ReelStoryboard";
export function generateReelImagePrompts(frames: ReelStoryboardFrame[]): string[] { return frames.map((frame) => frame.imagePrompt || ""); }
