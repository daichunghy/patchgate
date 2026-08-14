import { describe, expect, it } from "vitest";
import { assertContributionReceipt, assertEvaluationInput, assertPatchgatePolicy, ContractValidationError, parseEvaluationInputJson } from "../src/contract/validation.js";
import { receiptDigest } from "../src/evidence/digests.js";
import { evaluate, fixture, withInput } from "./helpers.js";
import type { PatchgatePolicy } from "../src/types.js";

function rejectsContract(action: () => void, diagnostic?: string): void {
  try {
    action();
    throw new Error("expected contract rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(ContractValidationError);
    if (diagnostic !== undefined) expect((error as ContractValidationError).diagnosticId).toBe(diagnostic);
  }
}

describe("runtime contract schemas", () => {
  it("accepts the complete versioned evaluation fixture and delivered receipt", async () => {
    const input = await fixture();
    expect(() => assertEvaluationInput(input)).not.toThrow();
    const receipt = evaluate(input);
    expect(() => assertContributionReceipt(receipt)).not.toThrow();
    expect(receipt.evaluatedAt).toBe("2026-08-13T00:00:00Z");
    expect(receipt.evaluatorVersion).toBe("0.1.0-dev");
  });

  it("rejects malformed and unversioned input before evaluation", () => {
    expect(() => parseEvaluationInputJson("{\"repository\":")).toThrow(/malformed/);
    rejectsContract(() => assertEvaluationInput({}), "INPUT_VERSION_REQUIRED");
    rejectsContract(() => assertEvaluationInput({ schemaVersion: "0.2" }), "INPUT_VERSION_UNSUPPORTED");
  });

  it("rejects target contradictions and invalid calendar timestamps", async () => {
    const input = await fixture();
    rejectsContract(() => assertEvaluationInput({ ...input, revisions: { ...input.revisions, testedSha: "unrelated-sha" } }), "TARGET_INVARIANT");
    rejectsContract(() => assertEvaluationInput(withInput(input, { checks: input.checks.map((check) => ({ ...check, retrievedAt: "2026-02-30T00:00:00Z" })) })), "TIMESTAMP_INVALID");
  });

  it("rejects a completed check without conclusion and source identity without immutable IDs", async () => {
    const input = await fixture();
    const { conclusion: _conclusion, ...completedWithoutConclusion } = input.checks[0]!;
    rejectsContract(() => assertEvaluationInput(withInput(input, { checks: [completedWithoutConclusion] })), "SCHEMA_INVALID");
    const appCheck = { ...input.checks[0]!, sourceStrength: "github_app_expected" as const, appId: undefined, workflowId: undefined, workflowPath: undefined, workflowRunId: undefined, workflowRunAttempt: undefined, event: undefined, checkRunId: undefined };
    rejectsContract(() => assertEvaluationInput(withInput(input, { checks: [appCheck] })), "SCHEMA_INVALID");
  });

  it("rejects metadata digest drift, incomplete+sufficient contradictions, unknown fields and bounds", async () => {
    const input = await fixture();
    rejectsContract(() => assertEvaluationInput({ ...input, observations: { ...input.observations, changedPaths: { ...input.observations.changedPaths, normalizedDigest: "sha256:" + "b".repeat(64) } } }), "OBSERVATION_DIGEST_MISMATCH");
    rejectsContract(() => assertEvaluationInput({ ...input, observations: { ...input.observations, checks: { ...input.observations.checks, complete: true, permissionState: "unknown" } } }), "OBSERVATION_INVARIANT");
    rejectsContract(() => assertEvaluationInput({ ...input, reviews: [{ ...input.reviews, unexpected: true }] }), "SCHEMA_INVALID");
    rejectsContract(() => assertEvaluationInput({ ...input, changedPaths: Array.from({ length: 3001 }, (_, index) => `path/${index}`) }), "SCHEMA_INVALID");
  });

  it("rejects duplicate source, review, check and rule identities", async () => {
    const input = await fixture();
    rejectsContract(() => assertEvaluationInput({ ...input, policySources: [input.policySources[0]!, input.policySources[0]!] }), "DUPLICATE_IDENTITY");
    const review = { reviewId: 1, actorId: 10, login: "r", state: "APPROVED" as const, commitId: "head-sha", qualified: true, teams: [], teamIds: [], qualification: { source: { kind: "github", identity: "permissions" }, complete: true, permissionState: "sufficient" as const }, isAuthor: false, isBot: false, active: true };
    const withReviews = withInput(input, { reviews: [review, { ...review, reviewId: 2 }] });
    expect(() => assertEvaluationInput(withReviews)).not.toThrow();
    rejectsContract(() => assertPatchgatePolicy({ ...input.policy!, requiredChecks: [{ ...input.policy!.requiredChecks![0]!, id: "same" }], sensitivePaths: [{ id: "same", patterns: ["src/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }), "DUPLICATE_RULE_ID");
  });

  it("rejects receipt mutations and missing evidence references even after rehash", async () => {
    const receipt = evaluate(await fixture());
    const forged = structuredClone(receipt);
    forged.requirements.push({ id: "fake", ruleClass: "required_check", authority: "patchgate", source: "patchgate.yml", result: "passed", severity: "block", remediation: "fake", evidenceRefs: ["workflow-run:999"] });
    forged.receiptDigest = receiptDigest(forged);
    rejectsContract(() => assertContributionReceipt(forged), "RECEIPT_REFERENCE_MISSING");
  });

  it("keeps the three version namespaces independent", async () => {
    const input = await fixture();
    const receipt = evaluate(input);
    expect(input.schemaVersion).toBe("0.1");
    expect(receipt.schemaVersion).toBe("0.1");
    expect(receipt.evaluatorVersion).toBe("0.1.0-dev");
    rejectsContract(() => assertContributionReceipt({ ...receipt, evaluatorVersion: "0.1.0" }), "SCHEMA_INVALID");
  });
});
