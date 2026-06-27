export interface ReelExportJob {
  id: string; reelId: string; status: "draft" | "rendering" | "ready" | "failed";
  outputUrl: string; aspectRatio: "9:16"; durationSeconds: number; createdAt: string;
}
