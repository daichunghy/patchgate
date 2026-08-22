import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { evaluate } from "./helpers.js";
import { loadPatchgatePolicy } from "../src/policy.js";
import { fixture, refreshObservations, review, withInput, withPolicy } from "./helpers.js";
import type { EvaluationInput, PatchgatePolicy } from "../src/types.js";

function policyWith(overrides: Partial<PatchgatePolicy>): PatchgatePolicy {
  return {
    version: 1,
    issueLinkage: { required: true },
    requiredChecks: [{ id: "unit", name: "unit", target: "head", acceptableConclusions: ["success"], expectedSource: { kind: "github_actions_workflow", appId: 15368, workflowPath: ".github/workflows/ci.yml", event: "pull_request" } }],
    ...overrides,
  };
}

describe("evaluateContribution", () => {
  it("returns ready_for_review for a complete, linked, correctly sourced snapshot", async () => {
    const receipt = evaluate(await fixture());
    expect(receipt.final.status).toBe("ready_for_review");
    expect(receipt.requirements.find((item) => item.id === "check.unit")?.evidenceRefs).toEqual([
      "workflow-run:101:attempt:1:check:unit",
    ]);
  });

  it("distinguishes complete zero linked issues from unavailable linked issue data", async () => {
    const input = await fixture();
    const zero = withInput(input, { linkedIssues: [] });
    expect(evaluate(zero).final.status).toBe("blocked");
    const unavailable = withInput(zero, { observations: { ...zero.observations, linkedIssues: { ...zero.observations.linkedIssues, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(unavailable).final.status).toBe("evidence_missing");
  });

  it("does not let an item inside an incomplete checks collection create green", async () => {
    const input = await fixture();
    const incomplete = withInput(input, { observations: { ...input.observations, checks: { ...input.observations.checks, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    const result = evaluate(incomplete);
    expect(result.final.status).toBe("evidence_missing");
    expect(result.requirements.find((item) => item.id === "check.unit")?.result).toBe("unknown");
  });

  it("does not infer no sensitive-path match from incomplete changed paths", async () => {
    const input = await fixture();
    const policy = policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] });
    const changed = withPolicy(input, policy);
    const incomplete = withInput(changed, { observations: { ...changed.observations, changedPaths: { ...changed.observations.changedPaths, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(incomplete).final.status).toBe("evidence_missing");
  });

  it("requires complete changed paths even when no path rule is configured", async () => {
    const input = await fixture();
    const incomplete = withInput(input, { observations: { ...input.observations, changedPaths: { ...input.observations.changedPaths, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(incomplete).final.status).toBe("evidence_missing");
    expect(evaluate(incomplete).final.reasonIds).toContain("changed_paths.observation");
  });

  it("does not green an ownership-required policy when CODEOWNERS data is unavailable", async () => {
    const input = await fixture();
    const policy = policyWith({ ownership: { requireCodeOwnerApproval: true } });
    const ownership = withPolicy(input, policy);
    const unavailable = withInput(ownership, { observations: { ...ownership.observations, ownership: { ...ownership.observations.ownership, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(unavailable).final.status).toBe("evidence_missing");
  });

  it("requires a complete review observation before treating no approval as a human gate", async () => {
    const input = await fixture();
    const policy = policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] });
    const sensitive = withPolicy(input, policy);
    const unavailable = withInput(sensitive, { changedPaths: ["src/auth/token.ts"], observations: { ...sensitive.observations, reviews: { ...sensitive.observations.reviews, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(unavailable).final.status).toBe("evidence_missing");
  });

  it("requires a qualified current approval with immutable provenance", async () => {
    const input = await fixture();
    const policy = policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] });
    const sensitive = withPolicy(input, policy);
    const result = evaluate(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [review({ teams: ["@security"] })] }));
    expect(result.final.status).toBe("ready_for_review");
    expect(result.humanGates[0]?.approvedBy).toEqual(["actor:10"]);
    expect(result.humanGates[0]?.requiredCount).toBe(1);
  });

  it("deduplicates approvals by immutable actor and excludes an active current changes request", async () => {
    const input = await fixture();
    const policy = policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] });
    const sensitive = withPolicy(input, policy);
    const oldApproval = review({ reviewId: 1, active: false });
    const currentChanges = review({ reviewId: 2, state: "CHANGES_REQUESTED", active: true });
    const result = evaluate(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [oldApproval, currentChanges] }));
    expect(result.final.status).toBe("human_review_required");
  });

  it("derives policy change from canonical and configured paths", async () => {
    const input = await fixture();
    const policy = policyWith({ policyChanges: { mode: "human_review", paths: ["config/*.yml"] } });
    const changed = withPolicy(input, policy);
    const result = evaluate(withInput(changed, { changedPaths: ["patchgate.yml"] }));
    expect(result.final.status).toBe("human_review_required");
    expect(result.final.reasonIds).toContain("policy.change");
    const configured = evaluate(withInput(changed, { changedPaths: ["config/runtime.yml"] }));
    expect(configured.final.status).toBe("human_review_required");
  });

  it("reports policy ambiguity when normalized policy does not match the trusted source contract digest", async () => {
    const input = await fixture();
    const relaxed = withInput(input, { policy: { version: 1 } });
    expect(evaluate(relaxed).final.status).toBe("policy_ambiguous");
  });

  it("keeps advisory reviewability missing non-blocking and blocking mode non-ready", async () => {
    const input = await fixture();
    const advisory = withInput(input, { observations: { ...input.observations, reviewability: { ...input.observations.reviewability, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(advisory).final.status).toBe("ready_for_review");
    const blockingPolicy = policyWith({ reviewability: { mode: "blocking", budgets: { maxFiles: 3 } } });
    const blocking = withPolicy(input, blockingPolicy);
    const missing = withInput(blocking, { observations: { ...blocking.observations, reviewability: { ...blocking.observations.reviewability, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    expect(evaluate(missing).final.status).toBe("evidence_missing");
  });

  it("preserves semantic digests across audit timestamps", async () => {
    const input = await fixture();
    const first = evaluate(input);
    const second = evaluate(withInput(input, { observations: { ...input.observations, checks: { ...input.observations.checks, retrievedAt: "2026-08-14T12:34:56.000Z" } }, checks: input.checks.map((check) => ({ ...check, retrievedAt: "2026-08-14T12:34:56.000Z" })) }));
    expect(second.decisionInputDigest).toBe(first.decisionInputDigest);
    expect(second.receiptDigest).toBe(first.receiptDigest);
  });
});

describe("loadPatchgatePolicy", () => {
  it("returns raw and normalized contract digests from one policy artifact", async () => {
    const loaded = await loadPatchgatePolicy(resolve("docs/patchgate.example.yml"), { revision: "base-sha" });
    expect(loaded.source.revision).toBe("base-sha");
    expect(loaded.contractDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(loaded.source.contractDigest).toBe(loaded.contractDigest);
  });
});
