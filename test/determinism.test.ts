import { describe, expect, it } from "vitest";
import { evaluate, fixture, refreshObservations, withInput } from "./helpers.js";
import { evaluateContribution } from "../src/evaluator.js";

describe("deterministic decision and receipt digests", () => {
  it("ignores retrieval and delivery timestamps", async () => {
    const input = await fixture();
    const first = evaluate(input);
    const second = evaluate(withInput(input, {
      checks: input.checks.map((check) => ({ ...check, retrievedAt: "2026-08-14T12:34:56.000Z" })),
      observations: { ...input.observations, checks: { ...input.observations.checks, retrievedAt: "2026-08-14T12:34:56.000Z" } },
    }));
    expect(second.decisionInputDigest).toBe(first.decisionInputDigest);
    expect(second.receiptDigest).toBe(first.receiptDigest);
  });

  it("keeps delivery timestamps outside the pure receipt digest", async () => {
    const input = await fixture();
    const first = evaluateContribution(input, "2026-08-13T00:00:00.000Z");
    const second = evaluateContribution(input, "2026-08-14T00:00:00.000Z");
    expect(first.evaluatedAt).not.toBe(second.evaluatedAt);
    expect(first.receiptDigest).toBe(second.receiptDigest);
  });

  it("changes both digests when semantic evidence or observation authority changes", async () => {
    const input = await fixture();
    const first = evaluate(input);
    const changed = withInput(input, {
      revisions: { ...input.revisions, headSha: "a-different-head", testedSha: "a-different-head" },
      checks: input.checks.map((check) => ({ ...check, testedSha: "a-different-head" })),
      observations: { ...input.observations, changedPaths: { ...input.observations.changedPaths, revision: "a-different-head" }, linkedIssues: { ...input.observations.linkedIssues, revision: "a-different-head" }, checks: { ...input.observations.checks, revision: "a-different-head" }, reviews: { ...input.observations.reviews, revision: "a-different-head" }, reviewability: { ...input.observations.reviewability, revision: "a-different-head" } },
    });
    const second = evaluate(changed);
    expect(second.decisionInputDigest).not.toBe(first.decisionInputDigest);
    expect(second.receiptDigest).not.toBe(first.receiptDigest);
  });

  it("keeps both digests stable when set-like observations are permuted", async () => {
    const input = await fixture();
    const first = evaluate(withInput(input, { changedPaths: ["src/b.ts", "src/a.ts"] }));
    const second = evaluate(withInput(input, { changedPaths: ["src/a.ts", "src/b.ts"] }));
    expect(second.decisionInputDigest).toBe(first.decisionInputDigest);
    expect(second.receiptDigest).toBe(first.receiptDigest);
  });

  it("changes the decision digest when completeness or permission changes", async () => {
    const input = await fixture();
    const first = evaluate(input);
    const changed = refreshObservations({ ...input, observations: { ...input.observations, checks: { ...input.observations.checks, complete: false, permissionState: "unknown", normalizedDigest: undefined } } });
    const second = evaluate(changed);
    expect(second.decisionInputDigest).not.toBe(first.decisionInputDigest);
  });

  it("does not retain mutable references from the input", async () => {
    const input = await fixture();
    const receipt = evaluate(input);
    input.checks[0]!.testedSha = "mutated-after-evaluation";
    input.changedPaths[0] = "mutated/path.ts";
    expect(receipt.evidence.checks[0]!.testedSha).toBe("head-sha");
    expect(receipt.changedPaths).toEqual(["src/service.ts"]);
  });
});
