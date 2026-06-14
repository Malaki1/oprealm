import type { ReelDecisionTree } from "../schema/ReelDecisionTree";
export function validateReelDecisionTree(tree: ReelDecisionTree) { const errors = tree.decisions.some((node) => node.options.length < 2) ? ["Every decision needs at least two options."] : []; return { valid: !errors.length, errors }; }
