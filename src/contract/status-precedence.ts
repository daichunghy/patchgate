import type { FinalStatus, Requirement } from "../types.js";

export interface StatusDecisionRow {
  status: FinalStatus;
  condition: string;
}

export const STATUS_PRECEDENCE: readonly StatusDecisionRow[] = [
  {
    status: "policy_ambiguous",
    condition: "an unknown policy/authority requirement exists",
  },
  {
    status: "evidence_missing",
    condition: "an evidence requirement is unknown",
  },
  {
    status: "human_review_required",
    condition: "a human-gate requirement failed",
  },
  {
    status: "blocked",
    condition: "an enforceable blocking requirement failed",
  },
  {
    status: "ready_for_review",
    condition: "no higher-precedence condition exists",
  },
];

export function determineFinalStatus(requirements: readonly Requirement[]): FinalStatus {
  if (requirements.some((item) => item.result === "unknown" && item.severity !== "evidence")) {
    return "policy_ambiguous";
  }
  if (requirements.some((item) => item.result === "unknown" && item.severity === "evidence")) {
    return "evidence_missing";
  }
  if (requirements.some((item) => item.result === "failed" && item.severity === "human_gate")) {
    return "human_review_required";
  }
  if (requirements.some((item) => item.result === "failed" && item.severity === "block")) {
    return "blocked";
  }
  return "ready_for_review";
}
