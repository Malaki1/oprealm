import type { ReelChoiceOption } from "../schema/ReelDecisionTree";
export function ReelChoiceCards(options: ReelChoiceOption[]) { return options.slice(0, 3); }
