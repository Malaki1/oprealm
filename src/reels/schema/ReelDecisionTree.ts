export type ReelOutcomeType = "reward" | "punishment" | "twist" | "betrayal" | "success" | "rejection" | "survival" | "failure";
export interface ReelChoiceOption { id: string; label: string; characterId?: string; outcomeNodeId: string; outcomeType: ReelOutcomeType; shortHint?: string }
export interface ReelDecisionNode { id: string; order: number; prompt: string; countdownSeconds: number; options: ReelChoiceOption[]; visualPrompt: string; narrationText: string; frameType: "hook_choice" | "decision" | "consequence" | "reveal" | "ending" | "cta" }
export interface ReelOutcomeNode { id: string; parentChoiceId: string; narrationText: string; visualPrompt: string; nextDecisionId?: string; endingId?: string }
export interface ReelEnding { id: string; title: string; outcomeType: "best" | "good" | "bad" | "funny" | "secret" | "disaster" | "romantic_success" | "rejection"; narrationText: string; visualPrompt: string }
export interface ReelDecisionTree { id: string; reelSeedId: string; startingNodeId: string; decisions: ReelDecisionNode[]; outcomes: ReelOutcomeNode[]; endings: ReelEnding[] }
