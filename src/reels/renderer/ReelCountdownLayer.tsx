export function ReelCountdownLayer(seconds: number) { return { seconds: Math.max(1, Math.min(10, seconds)) }; }
