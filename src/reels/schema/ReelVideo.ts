export interface VideoSceneBlueprint {
  frameId: string;
  sceneType: "hook" | "choice" | "countdown" | "outcome" | "twist" | "reveal" | "ending" | "cta";
  emotion: "wonder" | "fear" | "joy" | "suspense" | "anger" | "sadness" | "romance" | "comedy";
  intensity: number; characterAction: string; environmentAction: string; cameraShot: string;
  cameraMovement: string; lighting: string; atmosphere: string; duration: number;
  visualStyle: string; finalVideoPrompt: string;
}
