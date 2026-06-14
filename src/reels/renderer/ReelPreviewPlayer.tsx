import type { ReelStoryboardFrame } from "../schema/ReelStoryboard";
export interface ReelPreviewPlayerProps { frames: ReelStoryboardFrame[]; activeFrame: number; playing: boolean; captions: boolean }
export function ReelPreviewPlayer(props: ReelPreviewPlayerProps): ReelPreviewPlayerProps { return props; }
