import type { ReelScript } from "../schema/ReelScript";
import type { ReelStoryboardFrame } from "../schema/ReelStoryboard";
export function generateReelScript(reelId: string, frames: ReelStoryboardFrame[]): ReelScript {
  return { reelId, totalDurationSeconds: frames.reduce((sum, frame) => sum + frame.durationSeconds, 0), beats: frames.map((frame) => ({ frameId: frame.id, headline: frame.headlineText, caption: frame.captionText || "", narration: frame.narrationText || "", curiosityLoop: frame.frameType === "cta" ? "Continue on OPRealm" : "What happens next?", durationSeconds: frame.durationSeconds })) };
}
