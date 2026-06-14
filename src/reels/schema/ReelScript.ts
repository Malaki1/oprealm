export interface ReelScriptBeat {
  frameId: string; headline: string; caption: string; narration: string;
  curiosityLoop: string; durationSeconds: number;
}
export interface ReelScript { reelId: string; beats: ReelScriptBeat[]; totalDurationSeconds: number }
