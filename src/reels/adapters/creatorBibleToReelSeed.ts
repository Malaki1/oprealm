import { generateReelSeed } from "../../../functions/_lib/realm-reels.mjs";
export function creatorBibleToReelSeed(bible: Record<string, unknown>) { return generateReelSeed({ sourceType: "creator_bible", sourceId: bible.id, genre: bible.genre, idea: bible.summary, ageBand: bible.ageBand }); }
