import { describe, expect, it } from "vitest";
import { determineFinalStatus, STATUS_PRECEDENCE } from "../src/contract/status-precedence.js";
import type { Requirement } from "../src/types.js";

function requirement(id: string, result: Requirement["result"], severity: Requirement["severity"]): Requirement {
  return { id, ruleClass: "policy_integrity", authority: "derived", source: "test", result, severity, remediation: "repair the fixture", evidenceRefs: [] };
}

describe("final status precedence", () => {
  it.each([
    [[requirement("policy", "unknown", "block"), requirement("check", "failed", "block")], "policy_ambiguous"],
    [[requirement("check", "unknown", "evidence"), requirement("gate", "failed", "human_gate")], "evidence_missing"],
    [[requirement("gate", "failed", "human_gate"), requirement("check", "failed", "block")], "human_review_required"],
    [[requirement("check", "failed", "block")], "blocked"],
    [[requirement("advisory", "advisory", "advisory")], "ready_for_review"],
    [[requirement("pass", "passed", "block")], "ready_for_review"],
  ])("returns %s for the requirement combination", (requirements, expected) => {
    expect(determineFinalStatus(requirements)).toBe(expected);
  });

  it("exposes the documented precedence table", () => {
    expect(STATUS_PRECEDENCE.map((row) => row.status)).toEqual(["policy_ambiguous", "evidence_missing", "human_review_required", "blocked", "ready_for_review"]);
  });
});
