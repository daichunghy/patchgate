import { assertContributionReceipt, assertEvaluationInput } from "./contract/validation.js";
import { deliverReceipt, evaluateValidated } from "./evaluator-core.js";
import type { ContributionReceipt, EvaluationInput } from "./types.js";

/** External-input boundary. The pure evaluator lives in evaluator-core.ts. */
export function evaluateContribution(input: EvaluationInput, evaluatedAt: string): ContributionReceipt {
  assertEvaluationInput(input);
  const receipt = deliverReceipt(evaluateValidated(input), evaluatedAt) as ContributionReceipt;
  assertContributionReceipt(receipt);
  return receipt;
}

export { deliverReceipt, evaluateValidated } from "./evaluator-core.js";
