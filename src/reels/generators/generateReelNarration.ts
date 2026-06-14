import type { ReelStoryboardFrame } from "../schema/ReelStoryboard";
export function generateReelNarration(frames: ReelStoryboardFrame[]): string[] { return frames.map((frame) => frame.narrationText || frame.captionText || frame.headlineText); }
