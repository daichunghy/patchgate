import { describe, expect, it } from "vitest";
import { formatMarkdownSummary, parseActionInputs, shouldFailAction, snapshotRejectionExitCode } from "../src/action/index.js";
import type { ContributionReceipt } from "../src/types.js";

describe("GitHub Action runner unit tests", () => {
  describe("parseActionInputs", () => {
    it("returns default values when environment variables are unset", () => {
      const inputs = parseActionInputs({});
      expect(inputs.failOn).toBe("blocked");
      expect(inputs.githubToken).toBe("");
      expect(inputs.reportPath).toBe("patchgate-receipt.json");
      expect(inputs.createCheckRun).toBe(true);
      expect(inputs.checkName).toBe("PatchGate Review Gate");
    });

    it("parses custom input parameters from environment variables", () => {
      const inputs = parseActionInputs({
        INPUT_FAIL_ON: "human_review_required",
        INPUT_GITHUB_TOKEN: "github-token-placeholder",
        INPUT_REPORT_PATH: "custom-dir/receipt.json",
        INPUT_CREATE_CHECK_RUN: "true",
        INPUT_CHECK_NAME: "Custom Gate",
      });
      expect(inputs.failOn).toBe("human_review_required");
      expect(inputs.githubToken).toBe("github-token-placeholder");
      expect(inputs.reportPath).toBe("custom-dir/receipt.json");
      expect(inputs.createCheckRun).toBe(true);
      expect(inputs.checkName).toBe("Custom Gate");
    });

    it("parses runner-native dashed input names (INPUT_GITHUB-TOKEN et al.)", () => {
      const inputs = parseActionInputs({
        "INPUT_FAIL-ON": "never",
        "INPUT_GITHUB-TOKEN": "runner-token-placeholder",
        "INPUT_REPORT-PATH": "runner/receipt.json",
        "INPUT_CREATE-CHECK-RUN": "true",
        "INPUT_CHECK-NAME": "Runner Gate",
      });
      expect(inputs.failOn).toBe("never");
      expect(inputs.githubToken).toBe("runner-token-placeholder");
      expect(inputs.reportPath).toBe("runner/receipt.json");
      expect(inputs.createCheckRun).toBe(true);
      expect(inputs.checkName).toBe("Runner Gate");
    });

    it("prefers the runner-native dashed form over the underscore fallback", () => {
      const inputs = parseActionInputs({
        "INPUT_GITHUB-TOKEN": "dashed-token",
        INPUT_GITHUB_TOKEN: "underscore-token",
      });
      expect(inputs.githubToken).toBe("dashed-token");
    });

    it("falls back to default when fail-on is an invalid string", () => {
      const inputs = parseActionInputs({
        INPUT_FAIL_ON: "invalid_status",
      });
      expect(inputs.failOn).toBe("blocked");
    });
  });

  describe("shouldFailAction", () => {
    it("never fails when failOn is 'never'", () => {
      expect(shouldFailAction("ready_for_review", "never")).toBe(false);
      expect(shouldFailAction("blocked", "never")).toBe(false);
      expect(shouldFailAction("human_review_required", "never")).toBe(false);
      expect(shouldFailAction("evidence_missing", "never")).toBe(false);
      expect(shouldFailAction("policy_ambiguous", "never")).toBe(false);
    });

    it("fails on blocked, evidence_missing, and policy_ambiguous when failOn is 'blocked'", () => {
      expect(shouldFailAction("ready_for_review", "blocked")).toBe(false);
      expect(shouldFailAction("blocked", "blocked")).toBe(true);
      expect(shouldFailAction("evidence_missing", "blocked")).toBe(true);
      expect(shouldFailAction("policy_ambiguous", "blocked")).toBe(true);
      expect(shouldFailAction("human_review_required", "blocked")).toBe(false);
    });

    it("fails on human_review_required and all blocking states when failOn is 'human_review_required'", () => {
      expect(shouldFailAction("ready_for_review", "human_review_required")).toBe(false);
      expect(shouldFailAction("human_review_required", "human_review_required")).toBe(true);
      expect(shouldFailAction("blocked", "human_review_required")).toBe(true);
      expect(shouldFailAction("evidence_missing", "human_review_required")).toBe(true);
    });
  });

  describe("snapshot rejection handling", () => {
    it("keeps shadow mode non-blocking while enforcing modes fail", () => {
      expect(snapshotRejectionExitCode("never")).toBe(0);
      expect(snapshotRejectionExitCode("blocked")).toBe(1);
      expect(snapshotRejectionExitCode("evidence_missing")).toBe(1);
    });
  });

  describe("formatMarkdownSummary", () => {
    it("formats markdown summary for ready_for_review receipt", () => {
      const mockReceipt: ContributionReceipt = {
        schemaVersion: "0.1",
        evaluatorVersion: "0.1.0-dev",
        repository: { owner: "patchgate", name: "core", pullRequest: 42 },
        revisions: {
          baseSha: "0123456789abcdef0123456789abcdef01234567",
          headSha: "abcdef0123456789abcdef0123456789abcdef01",
          testedSha: "abcdef0123456789abcdef0123456789abcdef01",
          targetKind: "head",
        },
        policyDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        decisionInputDigest: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        receiptDigest: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
        changedPaths: ["src/index.ts"],
        policySources: [],
        observations: {
          policySources: [],
          changedPaths: { source: { kind: "git", identity: "paths" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
          linkedIssues: { source: { kind: "git", identity: "issues" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
          reviews: { source: { kind: "git", identity: "reviews" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
          checks: { source: { kind: "git", identity: "checks" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
          ownership: { source: { kind: "git", identity: "ownership" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
          reviewability: { source: { kind: "git", identity: "reviewability" }, retrievedAt: "2026-08-14T00:00:00Z", complete: true, permissionState: "sufficient" },
        },
        evidence: { checks: [], linkedIssues: [], reviews: [], ownershipRequirements: [] },
        requirements: [
          {
            id: "policy.base_revision",
            ruleClass: "policy_integrity",
            authority: "patchgate",
            source: "patchgate.yml",
            result: "passed",
            severity: "block",
            remediation: "Keep policy bound to base SHA.",
            evidenceRefs: [],
          },
        ],
        humanGates: [],
        final: { status: "ready_for_review", reasonIds: [] },
        evaluatedAt: "2026-08-14T00:00:00Z",
      };

      const markdown = formatMarkdownSummary(mockReceipt);
      expect(markdown).toContain("### ✅ PatchGate Review Gate: `READY_FOR_REVIEW`");
      expect(markdown).toContain("`patchgate/core` PR #42");
      expect(markdown).toContain("| `policy.base_revision` | ✅ Passed | `block` | Keep policy bound to base SHA. |");
    });
  });

  describe("action environment outputs & runner helpers", () => {
    it("skips non-PR events gracefully", async () => {
      const { runAction } = await import("../src/action/index.js");
      const { writeFileSync, mkdtempSync } = await import("node:fs");
      const { join } = await import("node:path");

      const tmpDir = mkdtempSync("/tmp/patchgate-action-test-");
      const eventFile = join(tmpDir, "event.json");
      writeFileSync(eventFile, JSON.stringify({ push: { ref: "refs/heads/main" } }), "utf8");

      const exitCode = await runAction({
        GITHUB_EVENT_PATH: eventFile,
        GITHUB_EVENT_NAME: "push",
      });
      expect(exitCode).toBe(0);
    });

    it("returns an explicit non-ready result for unsupported merge groups", async () => {
      const { runAction } = await import("../src/action/index.js");
      const { writeFileSync, mkdtempSync, readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = mkdtempSync("/tmp/patchgate-action-test-");
      const eventFile = join(tmpDir, "event.json");
      const outputFile = join(tmpDir, "output.txt");
      const summaryFile = join(tmpDir, "summary.md");
      writeFileSync(eventFile, JSON.stringify({ merge_group: { head_sha: "merge-group-sha" } }), "utf8");
      writeFileSync(outputFile, "", "utf8");
      writeFileSync(summaryFile, "", "utf8");
      const exitCode = await runAction({ GITHUB_EVENT_PATH: eventFile, GITHUB_EVENT_NAME: "merge_group", GITHUB_OUTPUT: outputFile, GITHUB_STEP_SUMMARY: summaryFile, INPUT_FAIL_ON: "never" });
      expect(exitCode).toBe(0);
      expect(readFileSync(outputFile, "utf8")).toContain("status=evidence_missing");
      expect(readFileSync(summaryFile, "utf8")).toContain("merge_group");
    });

    it("returns error code when event payload is invalid or missing required fields", async () => {
      const { runAction } = await import("../src/action/index.js");
      const { writeFileSync, mkdtempSync } = await import("node:fs");
      const { join } = await import("node:path");

      const tmpDir = mkdtempSync("/tmp/patchgate-action-test-");
      const eventFile = join(tmpDir, "event.json");
      writeFileSync(eventFile, JSON.stringify({ pull_request: {} }), "utf8");

      const exitCode = await runAction({
        GITHUB_EVENT_PATH: eventFile,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_TOKEN: "mock-token",
      });
      expect(exitCode).toBe(2);
    });

    it("writes outputs to GITHUB_OUTPUT and summary to GITHUB_STEP_SUMMARY", async () => {
      const { setActionOutput, appendStepSummary } = await import("../src/action/index.js");
      const { writeFileSync, readFileSync, mkdtempSync } = await import("node:fs");
      const { join } = await import("node:path");

      const tmpDir = mkdtempSync("/tmp/patchgate-action-test-");
      const outputFile = join(tmpDir, "output.txt");
      const summaryFile = join(tmpDir, "summary.md");
      writeFileSync(outputFile, "", "utf8");
      writeFileSync(summaryFile, "", "utf8");

      setActionOutput("status", "ready_for_review", { GITHUB_OUTPUT: outputFile });
      appendStepSummary("# Test Summary", { GITHUB_STEP_SUMMARY: summaryFile });

      expect(readFileSync(outputFile, "utf8")).toBe("status=ready_for_review\n");
      expect(readFileSync(summaryFile, "utf8")).toBe("# Test Summary\n");
    });

    it("writes multiline outputs with a safe command-file delimiter", async () => {
      const { setActionOutput } = await import("../src/action/index.js");
      const { writeFileSync, readFileSync, mkdtempSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = mkdtempSync("/tmp/patchgate-action-test-");
      const outputFile = join(tmpDir, "output.txt");
      writeFileSync(outputFile, "", "utf8");
      setActionOutput("summary-markdown", "line one\nline two", { GITHUB_OUTPUT: outputFile });
      const output = readFileSync(outputFile, "utf8");
      expect(output).toMatch(/^summary-markdown<<patchgate_[^\n]+\nline one\nline two\npatchgate_[^\n]+\n$/);
    });

    it("updates an existing check run instead of creating a duplicate", async () => {
      const { upsertCheckRun } = await import("../src/action/index.js");
      const calls: Array<{ url: string; method: string }> = [];
      const fetchMock: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? "GET" });
        if (init?.method === "GET") return new Response(JSON.stringify({ check_runs: [{ id: 42, name: "PatchGate Review Gate", head_sha: "head-sha" }] }), { status: 200 });
        return new Response("{}", { status: 200 });
      };
      await upsertCheckRun({
        owner: "example",
        name: "service",
        headSha: "head-sha",
        checkName: "PatchGate Review Gate",
        status: "ready_for_review",
        summaryMarkdown: "summary",
        token: "test-token",
        receipt: { receiptDigest: "sha256:receipt", decisionInputDigest: "sha256:input", evaluatedAt: "2026-08-20T00:00:00Z" },
      }, fetchMock);
      expect(calls.map((call) => call.method)).toEqual(["GET", "PATCH"]);
      expect(calls[1]?.url).toContain("/check-runs/42");
    });

    it("posts a neutral rejection check run with the diagnostic and remediation", async () => {
      const { upsertRejectionCheckRun } = await import("../src/action/index.js");
      const calls: Array<{ url: string; method: string; body?: string | undefined }> = [];
      const fetchMock: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : undefined });
        if (init?.method === "GET") return new Response(JSON.stringify({ check_runs: [] }), { status: 200 });
        return new Response("{}", { status: 200 });
      };
      await upsertRejectionCheckRun({
        owner: "example",
        name: "service",
        headSha: "head-sha",
        checkName: "PatchGate Review Gate",
        diagnostic: { id: "GITHUB_IDENTITY_INVALID", message: "Repository identity failed validation.", remediation: "Check owner/name and rerun." },
        summaryMarkdown: "### ❌ PatchGate Snapshot Rejected",
        token: "test-token",
      }, fetchMock);
      expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
      const body = JSON.parse(calls[1]?.body ?? "{}") as { conclusion?: string; output?: { title?: string; text?: string } };
      expect(body.conclusion).toBe("neutral");
      expect(body.output?.title).toBe("PatchGate: SNAPSHOT REJECTED");
      expect(body.output?.text).toContain("GITHUB_IDENTITY_INVALID");
      expect(body.output?.text).toContain("Check owner/name and rerun.");
    });

    it("updates an existing rejection check run instead of creating a duplicate", async () => {
      const { upsertRejectionCheckRun } = await import("../src/action/index.js");
      const calls: Array<{ url: string; method: string }> = [];
      const fetchMock: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? "GET" });
        if (init?.method === "GET") return new Response(JSON.stringify({ check_runs: [{ id: 7, name: "PatchGate Review Gate", head_sha: "head-sha" }] }), { status: 200 });
        return new Response("{}", { status: 200 });
      };
      await upsertRejectionCheckRun({
        owner: "example",
        name: "service",
        headSha: "head-sha",
        checkName: "PatchGate Review Gate",
        diagnostic: { id: "GITHUB_POLICY_INVALID", message: "Trusted base policy failed validation." },
        summaryMarkdown: "rejected",
        token: "test-token",
      }, fetchMock);
      expect(calls.map((call) => call.method)).toEqual(["GET", "PATCH"]);
      expect(calls[1]?.url).toContain("/check-runs/7");
    });
  });
});
