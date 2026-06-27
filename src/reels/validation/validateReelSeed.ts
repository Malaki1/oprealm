import type { ReelSeed } from "../schema/ReelSeed";
export function validateReelSeed(seed: ReelSeed) { const errors = []; if (!seed.id) errors.push("id"); if (!seed.genre) errors.push("genre"); if (!seed.characterSeed.characters.length) errors.push("characters"); return { valid: !errors.length, errors }; }
