import type { ReelScript } from "../schema/ReelScript";
export function validateReelScript(script: ReelScript) { const long = script.beats.filter((beat) => beat.narration.length > 180); return { valid: !long.length, errors: long.map((beat) => `${beat.frameId} narration is too long.`) }; }
