export type ReelGenre = "mystery" | "dating" | "horror" | "fantasy" | "survival" | "funny" | "riches" | "adventure";
export type ReelAgeBand = "8-10" | "10-12" | "13-16" | "16+";
export type ReelTone = "funny" | "dramatic" | "creepy" | "romantic" | "chaotic" | "epic";

export interface ReelCharacter {
  id: string;
  name: string;
  role: "option" | "guide" | "villain" | "date" | "suspect" | "creature" | "mentor";
  appearance: string;
  personality: string;
  secret?: string;
  warningLine?: string;
  trustworthiness?: "safe" | "uncertain" | "dangerous" | "secretly_good" | "secretly_bad";
}

export interface ReelCTA {
  type: "play_full_story" | "create_your_own" | "make_this_reel" | "visit_realmverse";
  targetType: string;
  headline: string;
  buttonText: string;
  targetUrl?: string;
  targetId?: string;
  trackingCode?: string;
}

export interface ReelSeed {
  id: string;
  creatorId: string;
  sourceType: "quick_prompt" | "creator_bible" | "story_game" | "storybook" | "realmverse_creation";
  sourceId?: string;
  genre: ReelGenre;
  templateId: string;
  hook: string;
  theme: string;
  tone: ReelTone;
  ageBand: ReelAgeBand;
  durationSeconds: 30 | 60 | 90;
  difficulty: "easy" | "medium" | "hard" | "impossible";
  voiceStyle: "dramatic" | "mysterious" | "funny" | "calm";
  worldSeed: { worldName: string; setting: string; visualStyle: string; dangerLevel: string };
  characterSeed: { characters: ReelCharacter[] };
  decisionTreeSeed: { startingChoiceCount: 2 | 3; depth: number; endingCount: number; twistLevel: "low" | "medium" | "high" };
  cta: ReelCTA;
  safetyNotes: string;
}
