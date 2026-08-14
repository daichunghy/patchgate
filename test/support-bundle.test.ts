import { describe, expect, it } from "vitest";
import { buildSupportBundle } from "../src/support-bundle.js";
import { assertRedacted } from "../src/github/redaction.js";
import { evaluate } from "./helpers.js";

describe("redacted support bundle", () => {
  it("keeps decision and capability diagnostics without copying snapshot payloads", async () => {
    const receipt = evaluate(await (await import("./helpers.js")).fixture());
    const bundle = buildSupportBundle({ kind: "built", identity: { owner: "example", name: "service", pullRequest: 7, baseSha: "base-sha", headSha: "head-sha", testedSha: "head-sha", targetKind: "head" }, evaluation: receipt.final, diagnostics: [{ id: "GITHUB_PERMISSION_INSUFFICIENT", message: "permission detail", remediation: "grant read", permissionState: "insufficient", complete: false, retryable: false, snapshotEvaluable: true, exitCode: 1 }], metrics: { responseBytes: 10 }, snapshot: { changedPaths: ["src/service.ts"], linkedIssues: [{ repository: "example/service", number: 12, repositoryId: "repo-1", issueId: "issue-12", linked: true }], reviews: [], checks: [], policySources: [], observations: { checks: { complete: true } }, body: "must not be retained" } }, "2026-08-13T00:00:00.000Z");
    assertRedacted(bundle);
    expect(bundle).toMatchObject({ source: "github_snapshot_report", status: receipt.final.status, summary: { changedPathCount: 1, linkedIssueCount: 1 }, privacy: { excludedData: expect.arrayContaining(["pr_bodies", "comments", "tokens"]) } });
    expect(bundle).not.toHaveProperty("snapshot");
    expect(JSON.stringify(bundle)).not.toContain("must not be retained");
  });

  it("accepts a receipt as offline support input", async () => {
    const receipt = evaluate(await (await import("./helpers.js")).fixture());
    const bundle = buildSupportBundle(receipt, "2026-08-13T00:00:00.000Z");
    expect(bundle).toMatchObject({ source: "contribution_receipt", status: receipt.final.status, summary: { changedPathCount: receipt.changedPaths.length, requirementCount: receipt.requirements.length } });
    expect(bundle.privacy.excludedData).toContain("workflow_logs");
  });
});
