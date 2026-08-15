import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assertContributionReceipt, assertEvaluationInput, ContractValidationError } from "../src/contract/validation.js";
import { createTrustedPolicyArtifact } from "../src/policy.js";
import { normalizedObservationDigest, receiptDigest } from "../src/evidence/digests.js";
import { sha256Digest } from "../src/canonical-json.js";
import { evaluate, fixture, review, withInput, withPolicy } from "./helpers.js";
import type { EvaluationInput, FinalStatus, PatchgatePolicy, RequirementResult } from "../src/types.js";

interface ManifestBaseEntry {
  id: string;
  path: string;
}

interface EvaluateManifestEntry extends ManifestBaseEntry {
  kind: "evaluate";
  expected: { status: FinalStatus; exit: 0 | 1; reasonIds: string[]; requirementResults: Array<{ id: string; result: RequirementResult }>; digestRelation?: "equal" | "different" };
}

interface RejectManifestEntry extends ManifestBaseEntry {
  kind: "reject";
  expected: { exit: 2; diagnosticId: string };
}

interface AssertManifestEntry extends ManifestBaseEntry {
  kind: "assert";
  expected: { exit: 0; diagnosticId?: string };
}

type ManifestEntry = EvaluateManifestEntry | RejectManifestEntry | AssertManifestEntry;

interface Manifest {
  version: number;
  roots: string[];
  exclusions: Array<{ path: string; reason: string }>;
  commands: { evaluate: string; reject: string; assert: string };
  entries: ManifestEntry[];
}

async function manifest(): Promise<Manifest> {
  return JSON.parse(await readFile(resolve("fixtures/manifest.json"), "utf8")) as Manifest;
}

function policyWith(overrides: Partial<PatchgatePolicy>): PatchgatePolicy {
  return {
    version: 1,
    issueLinkage: { required: true },
    requiredChecks: [{ id: "unit", name: "unit", target: "head", acceptableConclusions: ["success"], expectedSource: { kind: "github_actions_workflow", appId: 15368, workflowPath: ".github/workflows/ci.yml", event: "pull_request" } }],
    ...overrides,
  };
}

function incomplete(input: EvaluationInput, group: keyof EvaluationInput["observations"]): EvaluationInput {
  const meta = input.observations[group];
  if (Array.isArray(meta)) return input;
  return withInput(input, { observations: { ...input.observations, [group]: { ...meta, complete: false, permissionState: "unknown" } } });
}

function scenario(input: EvaluationInput, id: string): EvaluationInput {
  const check = input.checks[0]!;
  switch (id) {
    case "valid-ready": return input;
    case "unsupported-input-version":
    case "schema-downgrade": return { ...input, schemaVersion: "0.2" as "0.1" };
    case "policy-object-digest-mismatch": return withInput(input, { policy: { version: 1 } });
    case "policy-source-conflict": return withInput(input, { policySources: [input.policySources[0]!, input.policySources[0]!] });
    case "wrong-head-target": return { ...input, revisions: { ...input.revisions, testedSha: "foreign-sha" } };
    case "merge-target-missing-sha": return { ...input, revisions: { ...input.revisions, targetKind: "merge", testedSha: "head-sha" } };
    case "merge-group-target-missing-sha": return { ...input, revisions: { ...input.revisions, targetKind: "merge_group", testedSha: "head-sha" } };
    case "incomplete-changed-paths": return incomplete(withPolicy(input, policyWith({ policyChanges: { mode: "blocked", paths: ["settings/**"] } })), "changedPaths");
    case "incomplete-linked-issues": return incomplete(input, "linkedIssues");
    case "complete-zero-linked-issues": return withInput(input, { linkedIssues: [] });
    case "wrong-workflow-identity": return withInput(input, { checks: [{ ...check, workflowPath: ".github/workflows/evil.yml" }] });
    case "failed-required-check": return withInput(input, { checks: [{ ...check, conclusion: "failure" }] });
    case "duplicate-eligible-check": return withInput(input, { checks: [check, { ...check, workflowRunId: 102 }] });
    case "stale-foreign-plus-valid": {
      const { workflowRunId: _workflowRunId, workflowRunAttempt: _workflowRunAttempt, ...foreign } = check;
      return withInput(input, { checks: [check, { ...foreign, testedSha: "old-sha", sourceStrength: "unattributed" }] });
    }
    case "reviews-unavailable": {
      const enabled = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
      return incomplete(withInput(enabled, { changedPaths: ["src/auth/token.ts"] }), "reviews");
    }
    case "same-actor-duplicate-approval": {
      const enabled = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 2, humanGate: true }] }));
      return withInput(enabled, { changedPaths: ["src/auth/token.ts"], reviews: [review(), review({ reviewId: 2 })] });
    }
    case "ownership-observation-missing": return incomplete(withPolicy(input, policyWith({ ownership: { requireCodeOwnerApproval: true } })), "ownership");
    case "advisory-reviewability-missing": return incomplete(input, "reviewability");
    case "blocking-reviewability-missing": return incomplete(withPolicy(input, policyWith({ reviewability: { mode: "blocking", budgets: { maxFiles: 3 } } })), "reviewability");
    case "completed-check-missing-conclusion": {
      const { conclusion: _conclusion, ...withoutConclusion } = check;
      return withInput(input, { checks: [withoutConclusion] });
    }
    case "github-app-check-missing-identity": {
      const { appId: _appId, checkRunId: _checkRunId, ...withoutIds } = check;
      return withInput(input, { checks: [{ ...withoutIds, sourceStrength: "github_app_expected" }] });
    }
    case "timestamp-only-replay": return withInput(input, { checks: [{ ...check, retrievedAt: "2026-08-14T12:34:56.000Z" }], observations: { ...input.observations, checks: { ...input.observations.checks, retrievedAt: "2026-08-14T12:34:56.000Z" } } });
    case "observation-order-permutation": return withInput(input, { changedPaths: ["src/b.ts", "src/a.ts"] });
    case "incomplete-checks-with-success": return incomplete(input, "checks");
    case "incomplete-reviews-with-approval": {
      const enabled = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
      return incomplete(withInput(enabled, { changedPaths: ["src/auth/token.ts"], reviews: [review()] }), "reviews");
    }
    case "success-plus-failure": return withInput(input, { checks: [check, { ...check, workflowRunId: 102, conclusion: "failure" }] });
    case "success-plus-pending": {
      const { conclusion: _conclusion, ...pending } = check;
      return withInput(input, { checks: [check, { ...pending, workflowRunId: 102, status: "queued" }] });
    }
    case "same-app-slug-wrong-immutable-id": return withInput(input, { checks: [{ ...check, appId: 999 }] });
    case "workflow-wrong-event": return withInput(input, { checks: [{ ...check, event: "push" }] });
    case "workflow-missing-run-attempt": {
      const { workflowRunAttempt: _workflowRunAttempt, ...withoutAttempt } = check;
      return withInput(input, { checks: [withoutAttempt] });
    }
    case "complete-sufficient-missing-normalized-digest": return { ...input, observations: { ...input.observations, checks: { ...input.observations.checks, normalizedDigest: undefined } } };
    case "item-changed-without-digest-update": return { ...input, checks: [{ ...check, conclusion: "failure" }] };
    case "incomplete-unused-observation": return incomplete(withPolicy(input, policyWith({ requiredChecks: [] })), "checks");
    case "maximum-accepted-collection": return withInput(input, { changedPaths: Array.from({ length: 3000 }, (_, index) => `src/file-${index}.ts`) });
    case "cap-plus-one-rejection": return withInput(input, { changedPaths: Array.from({ length: 3001 }, (_, index) => `src/file-${index}.ts`) });
    case "complete-policy-zero-enforceable-source": return withInput(input, { policy: null, policySources: [], observations: { ...input.observations, policySources: [] } });
    case "ownership-policy-missing-codeowners-source": {
      const enabled = withPolicy(input, policyWith({ ownership: { requireCodeOwnerApproval: true } }));
      return withInput(enabled, {
        policySources: enabled.policySources.filter((source) => source.kind !== "codeowners"),
        observations: { ...enabled.observations, policySources: enabled.observations.policySources.filter((meta) => meta.source.identity !== "codeowners") },
      });
    }
    case "current-approval-changes-requested": {
      const enabled = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
      return withInput(enabled, { changedPaths: ["src/auth/token.ts"], reviews: [review({ state: "CHANGES_REQUESTED" })] });
    }
    case "team-slug-missing-team-id": {
      const enabled = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
      return withInput(enabled, { changedPaths: ["src/auth/token.ts"], reviews: [review({ teamIds: [] })] });
    }
    case "actions-where-distinct-app-required": return withPolicy(input, policyWith({ requiredChecks: [{ id: "unit", name: "unit", target: "head", acceptableConclusions: ["success"], expectedSource: { kind: "github_app_expected", appId: 777 } }] }));
    case "fork-pr-readonly-observation": {
      const enabled = withPolicy(input, policyWith({ ownership: { requireCodeOwnerApproval: true }, sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
      const reviewsMeta = Array.isArray(enabled.observations.reviews) ? enabled.observations.reviews[0]! : enabled.observations.reviews;
      const ownershipMeta = Array.isArray(enabled.observations.ownership) ? enabled.observations.ownership[0]! : enabled.observations.ownership;
      return withInput(enabled, { 
        changedPaths: ["src/auth/token.ts"],
        observations: { 
          ...enabled.observations, 
          reviews: { ...reviewsMeta, complete: false, permissionState: "insufficient" }, 
          ownership: { ...ownershipMeta, complete: false, permissionState: "insufficient" } 
        } 
      });
    }
    case "generated-files-exceeds-budget": {
      const enabled = withPolicy(input, policyWith({ reviewability: { mode: "blocking", budgets: { maxGeneratedFiles: 5 } } }));
      return withInput(enabled, { reviewability: { fileCount: 20, ownershipDomains: [], generatedFileCount: 20, boundaryCount: 0 } });
    }
    case "merge-group-explicit-rejection":
      return { ...input, revisions: { ...input.revisions, targetKind: "merge_group", mergeGroupSha: "mg-sha", testedSha: "mg-sha" } };
    default: return input;
  }
}

async function executeAssertOracle(id: string, base: EvaluationInput): Promise<string | undefined> {
  const input = structuredClone(base);
  try {
    switch (id) {
      case "contradictory-rehashed-receipt": {
        const receipt = evaluate(withInput(input, { linkedIssues: [] }));
        receipt.final = { status: "ready_for_review", reasonIds: [] };
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      case "receipt-mutation-alias": {
        const receipt = evaluate(input);
        const before = receipt.receiptDigest;
        input.changedPaths[0] = "mutated.ts";
        if (receipt.receiptDigest !== before) throw new Error("receipt retained a mutable input alias");
        return undefined;
      }
      case "receipt-ref-nonexistent": {
        const receipt = evaluate(input);
        receipt.requirements.push({ id: "synthetic.check", ruleClass: "required_check", authority: "patchgate", source: "patchgate.yml", result: "passed", severity: "block", remediation: "synthetic", evidenceRefs: ["workflow-run:999"] });
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      case "core-without-clock": {
        const core = (await import("../src/evaluator-core.js")).evaluateValidated(input);
        assertContributionReceipt(core);
        return undefined;
      }
      case "rehashed-satisfied-human-gate-deleted-actor": {
        const sensitive = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
        const receipt = evaluate(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [review()] }));
        receipt.evidence.reviews = [];
        receipt.observations.reviews.normalizedDigest = sha256Digest([]);
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      case "selected-check-ref-wrong-identity": {
        const receipt = evaluate(input);
        receipt.evidence.checks[0]!.appId = 999;
        const { retrievedAt: _retrievedAt, ...selectedCheck } = receipt.evidence.checks[0]!;
        receipt.observations.checks.normalizedDigest = sha256Digest([selectedCheck]);
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      case "raw-constructor-self-relaxed": {
        const raw = await readFile(resolve("docs/patchgate.example.yml"), "utf8");
        const artifact = createTrustedPolicyArtifact(raw, { identity: "patchgate.yml", revision: "base-sha" });
        if (artifact.source.contractDigest !== artifact.contractDigest || artifact.policy.version !== 1 || artifact.policy.requiredChecks === undefined) throw new Error("trusted constructor returned an incomplete policy artifact");
        return undefined;
      }
      case "selected-check-unacceptable-conclusion": {
        const receipt = evaluate(input);
        receipt.evidence.checks[0]!.conclusion = "failure";
        receipt.observations.checks.normalizedDigest = normalizedObservationDigest(
          { ...input, checks: receipt.evidence.checks },
          "checks",
        );
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      case "human-gate-below-required-count": {
        const sensitive = withPolicy(input, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 2, humanGate: true }] }));
        const receipt = evaluate(withInput(sensitive, {
          changedPaths: ["src/auth/token.ts"],
          reviews: [review(), review({ reviewId: 2, actorId: 11, login: "reviewer-2" })],
        }));
        receipt.evidence.reviews = receipt.evidence.reviews.slice(0, 1);
        receipt.observations.reviews.normalizedDigest = normalizedObservationDigest(
          { ...input, reviews: receipt.evidence.reviews },
          "reviews",
        );
        receipt.humanGates[0]!.approvedBy = receipt.humanGates[0]!.approvedBy.slice(0, 1);
        const requirement = receipt.requirements.find((item) => item.id === "handoff.auth")!;
        requirement.evidenceRefs = requirement.evidenceRefs.slice(0, 1);
        requirement.observed = { ...requirement.observed, approvedCount: 1 };
        receipt.receiptDigest = receiptDigest(receipt);
        assertContributionReceipt(receipt);
        return undefined;
      }
      default:
        throw new Error(`unsupported assert fixture ${id}`);
    }
  } catch (error) {
    if (error instanceof ContractValidationError) return error.diagnosticId;
    throw error;
  }
}

describe("executable compatibility and replay fixture manifest", () => {
  it("has a one-to-one manifest mapping for every owned fixture", async () => {
    const spec = await manifest();
    const listed = new Set(spec.entries.map((entry) => entry.path));
    const actual: string[] = [];
    async function walk(directory: string): Promise<void> {
      const entries = await (await import("node:fs/promises")).readdir(resolve(directory), { withFileTypes: true });
      for (const entry of entries) {
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile() && entry.name.endsWith(".json")) actual.push(path);
      }
    }
    for (const root of spec.roots) await walk(root);
    const exclusions = new Set(spec.exclusions.map((entry) => entry.path));
    expect(actual.filter((path) => !exclusions.has(path)).sort()).toEqual([...listed].sort());
    expect(spec.entries).toHaveLength(53);
    expect(spec.commands).toEqual({ evaluate: "patchgate evaluate --event <fixture>", reject: "assertEvaluationInput(<fixture>)", assert: "assertContributionReceipt(<derived-receipt>)" });
  });

  it("executes every manifest oracle", async () => {
    const spec = await manifest();
    const base = await fixture();
    for (const entry of spec.entries) {
      const descriptor = JSON.parse(await readFile(resolve(entry.path), "utf8")) as { scenario?: string };
      expect(descriptor.scenario, entry.id).toBe(entry.id);
      if (entry.kind === "assert") {
        expect(entry.expected.exit, entry.id).toBe(0);
        expect(await executeAssertOracle(entry.id, base), entry.id).toBe(entry.expected.diagnosticId);
        continue;
      }
      const input = scenario(base, entry.id);
      if (entry.kind === "reject") {
        expect(entry.expected.exit, entry.id).toBe(2);
        try {
          assertEvaluationInput(input);
          throw new Error(`fixture ${entry.id} unexpectedly validated`);
        } catch (error) {
          expect(error).toBeInstanceOf(ContractValidationError);
          expect((error as ContractValidationError).diagnosticId).toBe(entry.expected.diagnosticId);
        }
        continue;
      }
      const receipt = evaluate(input);
      expect(receipt.final.status, entry.id).toBe(entry.expected.status);
      expect(receipt.final.status === "ready_for_review" ? 0 : 1, entry.id).toBe(entry.expected.exit);
      expect(receipt.final.reasonIds, entry.id).toEqual(entry.expected.reasonIds ?? receipt.final.reasonIds);
      expect(receipt.requirements.map((item) => ({ id: item.id, result: item.result })), entry.id).toEqual(entry.expected.requirementResults);
      if (entry.expected.digestRelation === "equal") {
        const comparison = entry.id === "observation-order-permutation" ? evaluate(withInput(base, { changedPaths: ["src/a.ts", "src/b.ts"] })) : evaluate(base);
        expect(receipt.receiptDigest).toBe(comparison.receiptDigest);
      }
    }
  });

  it("covers receipt/core and trusted-constructor oracles", async () => {
    const base = await fixture();
    const contradictory = evaluate(withInput(base, { linkedIssues: [] }));
    contradictory.final = { status: "ready_for_review", reasonIds: [] };
    contradictory.receiptDigest = receiptDigest(contradictory);
    expect(() => assertContributionReceipt(contradictory)).toThrow(/status|reasonIds/);

    const sensitive = withPolicy(base, policyWith({ sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }] }));
    const gated = evaluate(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [review()] }));
    gated.evidence.reviews = [];
    gated.observations.reviews.normalizedDigest = sha256Digest([]);
    gated.receiptDigest = receiptDigest(gated);
    expect(() => assertContributionReceipt(gated)).toThrow(/missing evidence/);

    const selected = evaluate(base);
    selected.evidence.checks[0]!.appId = 999;
    const { retrievedAt: _retrievedAt, ...selectedCheck } = selected.evidence.checks[0]!;
    selected.observations.checks.normalizedDigest = sha256Digest([selectedCheck]);
    selected.receiptDigest = receiptDigest(selected);
    expect(() => assertContributionReceipt(selected)).toThrow(/expected immutable source|selected appId/);

    const missingRef = evaluate(base);
    missingRef.requirements.push({ id: "synthetic.check", ruleClass: "required_check", authority: "patchgate", source: "patchgate.yml", result: "passed", severity: "block", remediation: "synthetic", evidenceRefs: ["workflow-run:999"] });
    missingRef.receiptDigest = receiptDigest(missingRef);
    expect(() => assertContributionReceipt(missingRef)).toThrow(/missing evidence/);

    const core = (await import("../src/evaluator-core.js")).evaluateValidated(base);
    expect(() => assertContributionReceipt(core)).toThrow();

    const raw = await readFile(resolve("docs/patchgate.example.yml"), "utf8");
    const artifact = createTrustedPolicyArtifact(raw, { identity: "patchgate.yml", revision: "base-sha" });
    expect(artifact.source.contractDigest).toBe(artifact.contractDigest);
    expect(artifact.policy).not.toEqual({ version: 1 });

    const alias = evaluate(base);
    const before = alias.receiptDigest;
    base.changedPaths[0] = "mutated.ts";
    expect(alias.receiptDigest).toBe(before);
  });
});
