import type { ReelCTA } from "./ReelSeed";
export type ReelFrameType = "hook" | "choice" | "countdown" | "outcome" | "twist" | "reveal" | "ending" | "cta";
export interface ReelStoryboardFrame {
  id: string; order: number; durationSeconds: number; frameType: ReelFrameType;
  headlineText: string; captionText?: string; narrationText?: string;
  imagePrompt?: string; imageUrl?: string; videoPrompt?: string; videoUrl?: string;
  transition: "cut" | "zoom" | "glitch" | "swipe" | "flash" | "blur";
  audioCue?: "tick" | "sting" | "boom" | "reveal" | "success" | "fail" | "romantic" | "creepy";
  cta?: ReelCTA; metadata?: Record<string, unknown>;
}
