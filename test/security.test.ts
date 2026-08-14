import { describe, expect, it } from "vitest";
import { assertContributionReceipt, assertEvaluationInput, ContractValidationError } from "../src/contract/validation.js";
import { normalizedObservationDigest, receiptDigest } from "../src/evidence/digests.js";
import { sha256Digest } from "../src/canonical-json.js";
import { evaluate, fixture, review, withInput, withPolicy } from "./helpers.js";

describe("local security and false-green probes", () => {
  it("does not admit a self-relaxed normalized policy with the old source claim", async () => {
    const input = await fixture();
    expect(evaluate(withInput(input, { policy: { version: 1 } })).final.status).toBe("policy_ambiguous");
  });

  it("does not allow incomplete check or review collections to hide a pass", async () => {
    const input = await fixture();
    const checkUnknown = withInput(input, { observations: { ...input.observations, checks: { ...input.observations.checks, complete: false, permissionState: "unknown" } } });
    expect(evaluate(checkUnknown).final.status).toBe("evidence_missing");
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] };
    const sensitive = withPolicy(input, policy);
    const reviewUnknown = withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [review()], observations: { ...sensitive.observations, reviews: { ...sensitive.observations.reviews, complete: false, permissionState: "unknown" } } });
    expect(evaluate(reviewUnknown).final.status).toBe("evidence_missing");
  });

  it("rejects immutable identity omissions before the evaluator", async () => {
    const input = await fixture();
    const check = { ...input.checks[0]!, sourceStrength: "github_app_expected" as const };
    delete check.appId;
    delete check.checkRunId;
    expect(() => assertEvaluationInput(withInput(input, { checks: [check] }))).toThrow(ContractValidationError);
  });

  it("rejects linked issue evidence without immutable repository and issue identity", async () => {
    const input = await fixture();
    const issue = { ...input.linkedIssues[0]! } as { repository: string; number: number; linked: boolean; repositoryId?: string; issueId?: string };
    delete issue.repositoryId;
    delete issue.issueId;
    expect(() => assertEvaluationInput(withInput(input, { linkedIssues: [issue] as never }))).toThrow(ContractValidationError);
  });

  it("rejects duplicate linked issue immutable identities", async () => {
    const input = await fixture();
    const duplicate = { ...input.linkedIssues[0]!, number: 13 };
    expect(() => assertEvaluationInput(withInput(input, { linkedIssues: [input.linkedIssues[0]!, duplicate] }))).toThrow(/linked issue immutable identities/);
  });

  it("rejects rehashed receipts whose selected evidence or actor reference was removed", async () => {
    const input = await fixture();
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] };
    const receipt = evaluate(withInput(withPolicy(input, policy), { changedPaths: ["src/auth/token.ts"], reviews: [review()] }));
    receipt.evidence.reviews = [];
    receipt.observations.reviews.normalizedDigest = "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/missing evidence/);
  });

  it("rejects a rehashed satisfied gate when reviewer qualification is changed", async () => {
    const input = await fixture();
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] };
    const receipt = evaluate(withInput(withPolicy(input, policy), { changedPaths: ["src/auth/token.ts"], reviews: [review()] }));
    receipt.evidence.reviews[0]!.qualified = false;
    receipt.observations.reviews.normalizedDigest = sha256Digest(receipt.evidence.reviews.map((item) => ({ ...item, teams: [...item.teams].sort(), teamIds: [...item.teamIds].sort((a, b) => a - b) })));
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/unavailable approved actor|human gate|qualified current review/);
  });

  it("rejects rehashed receipts that replace concrete evidence with an observation claim", async () => {
    const receipt = evaluate(await fixture());
    const issueRequirement = receipt.requirements.find((item) => item.id === "issue.linkage");
    expect(issueRequirement).toBeDefined();
    issueRequirement!.evidenceRefs = ["observation:linkedIssues"];
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/verified linked issue evidence/);
  });

  it("rejects a rehashed passed check whose selected conclusion is no longer acceptable", async () => {
    const input = await fixture();
    const receipt = evaluate(input);
    receipt.evidence.checks[0]!.conclusion = "failure";
    receipt.observations.checks.normalizedDigest = normalizedObservationDigest(
      { ...input, checks: receipt.evidence.checks },
      "checks",
    );
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/unacceptable conclusion/);
  });

  it("rejects a rehashed satisfied gate that falls below its configured approval count", async () => {
    const input = await fixture();
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 2, humanGate: true }] };
    const secondReview = review({ reviewId: 2, actorId: 11, login: "reviewer-2" });
    const receipt = evaluate(withInput(withPolicy(input, policy), { changedPaths: ["src/auth/token.ts"], reviews: [review(), secondReview] }));
    receipt.evidence.reviews = receipt.evidence.reviews.slice(0, 1);
    receipt.observations.reviews.normalizedDigest = normalizedObservationDigest(
      { ...input, reviews: receipt.evidence.reviews },
      "reviews",
    );
    const gate = receipt.humanGates[0]!;
    gate.approvedBy = gate.approvedBy.slice(0, 1);
    const requirement = receipt.requirements.find((item) => item.id === "handoff.auth")!;
    requirement.evidenceRefs = requirement.evidenceRefs.slice(0, 1);
    requirement.observed = { ...requirement.observed, approvedCount: 1 };
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/enough distinct approved actors|required approval count/);
  });

  it("rejects rehashed receipts whose policy source leaves the base revision", async () => {
    const receipt = evaluate(await fixture());
    receipt.policySources[0]!.revision = "foreign-base";
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/baseSha/);
  });

  it("rejects rehashed gates when a team-backed approval loses immutable team identity", async () => {
    const input = await fixture();
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] };
    const receipt = evaluate(withInput(withPolicy(input, policy), { changedPaths: ["src/auth/token.ts"], reviews: [review()] }));
    receipt.evidence.reviews[0]!.teamIds = [];
    receipt.observations.reviews.normalizedDigest = normalizedObservationDigest({ ...input, reviews: receipt.evidence.reviews }, "reviews");
    receipt.receiptDigest = receiptDigest(receipt);
    expect(() => assertContributionReceipt(receipt)).toThrow(/qualified current review|unavailable approved actor/);
  });

  it("does not treat an unrelated team ID as the configured team approval", async () => {
    const input = await fixture();
    const policy = { ...input.policy!, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] };
    const spoofed = review({ qualification: { source: { kind: "github", identity: "permissions" }, revision: "head-sha", complete: true, permissionState: "sufficient", principalBindings: [{ configuredPrincipal: "@security", kind: "team", immutableId: 999, membershipState: "active" }] } });
    expect(evaluate(withInput(withPolicy(input, policy), { changedPaths: ["src/auth/token.ts"], reviews: [spoofed] })).final.status).toBe("evidence_missing");
  });

  it("keeps Action workflow evidence distinct from an expected GitHub App", async () => {
    const input = await fixture();
    const appPolicy = { ...input.policy!, requiredChecks: [{ id: "unit", name: "unit", target: "head" as const, acceptableConclusions: ["success"], expectedSource: { kind: "github_app_expected" as const, appId: 777 } }] };
    expect(evaluate(withPolicy(input, appPolicy)).final.status).toBe("evidence_missing");
  });
});
