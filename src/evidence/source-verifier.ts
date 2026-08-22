import type { CheckEvidence, ExpectedSource, RequiredCheckRule } from "../types.js";

export type CheckResolution =
  | { status: "passed"; evidence: CheckEvidence }
  | { status: "failed"; evidence: CheckEvidence; reason: "unacceptable_conclusion" }
  | { status: "missing"; reason: "no_candidate" | "wrong_target" | "wrong_source" | "pending" }
  | { status: "ambiguous"; reason: "duplicate_eligible_candidates" };

function matchesExpectedSource(check: CheckEvidence, expected: ExpectedSource): boolean {
  if (check.sourceStrength !== expected.kind) return false;
  if (expected.appSlug !== undefined && check.appSlug !== expected.appSlug) return false;
  if (expected.appId !== undefined && check.appId !== expected.appId) return false;
  if (expected.kind === "github_app_expected") {
    return check.checkRunId !== undefined;
  }
  if (expected.workflowId !== undefined && check.workflowId !== expected.workflowId) return false;
  if (expected.workflowPath !== undefined && check.workflowPath !== expected.workflowPath) return false;
  if (expected.event !== undefined && check.event !== expected.event) return false;
  return check.workflowRunId !== undefined && check.workflowRunAttempt !== undefined;
}

export function evidenceReference(check: CheckEvidence): string {
  if (check.sourceStrength === "github_app_expected" && check.checkRunId !== undefined) {
    return `check-run:${check.checkRunId}`;
  }
  if (
    check.sourceStrength === "github_actions_workflow" &&
    check.workflowRunId !== undefined &&
    check.workflowRunAttempt !== undefined
  ) {
    return `workflow-run:${check.workflowRunId}:attempt:${check.workflowRunAttempt}:check:${encodeURIComponent(check.name)}`;
  }
  return "";
}

export function resolveCheckEvidence(
  checks: readonly CheckEvidence[],
  rule: RequiredCheckRule,
  targetSha: string | undefined,
): CheckResolution {
  if (targetSha === undefined) return { status: "missing", reason: "wrong_target" };

  const namedCandidates = checks.filter((check) => check.name === rule.name);
  if (namedCandidates.length === 0) return { status: "missing", reason: "no_candidate" };
  const targetedCandidates = namedCandidates.filter((check) => check.testedSha === targetSha);
  if (targetedCandidates.length === 0) return { status: "missing", reason: "wrong_target" };
  const sourcedCandidates = targetedCandidates.filter((check) => matchesExpectedSource(check, rule.expectedSource));
  if (sourcedCandidates.length === 0) return { status: "missing", reason: "wrong_source" };
  if (sourcedCandidates.length > 1) return { status: "ambiguous", reason: "duplicate_eligible_candidates" };

  const candidate = sourcedCandidates[0];
  if (candidate === undefined) return { status: "missing", reason: "no_candidate" };
  if (candidate.status !== "completed") return { status: "missing", reason: "pending" };
  if (!rule.acceptableConclusions.includes(candidate.conclusion ?? "")) {
    return { status: "failed", evidence: candidate, reason: "unacceptable_conclusion" };
  }
  return { status: "passed", evidence: candidate };
}
