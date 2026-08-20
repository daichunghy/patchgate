import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateContribution } from "../../src/evaluator.js";
import { GitHubClient } from "../../src/github/client.js";
import { recordedResponse, RecordedGitHubTransport, type RecordedExchange } from "../../src/github/mock-transport.js";
import { canonicalJson } from "../../src/canonical-json.js";
import { assertRedacted, redactForReport } from "../../src/github/redaction.js";
import { buildGitHubSnapshot } from "../../src/github/snapshot-builder.js";
import type { GitHubSnapshotRequest } from "../../src/github/identity.js";

interface Fixture {
  request: GitHubSnapshotRequest & { allowConfirmedAbsence?: boolean };
  exchanges: RecordedExchange[];
}

interface FixtureManifest {
  cases: Array<{ id: string; path: string; variant?: string; kind: string; expected: Record<string, unknown> & { requestSequence?: string[] } }>;
}

async function fixture(name: string): Promise<Fixture> {
  return JSON.parse(await readFile(resolve("fixtures/api", name), "utf8")) as Fixture;
}

function client(exchanges: readonly RecordedExchange[]): { client: GitHubClient; transport: RecordedGitHubTransport } {
  const transport = new RecordedGitHubTransport(exchanges);
  return { transport, client: new GitHubClient(transport) };
}

function branchProtectionBody(requiredApprovingReviewCount: number): Record<string, unknown> {
  return {
    required_status_checks: {
      strict: true,
      contexts: ["unit"],
      checks: [{ context: "unit", app_id: null }],
    },
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: requiredApprovingReviewCount,
      require_last_push_approval: false,
      bypass_pull_request_allowances: { users: [], teams: [], apps: [] },
    },
    bypass_pull_request_allowances: { users: [], teams: [], apps: [] },
  };
}

describe("authenticated GitHub adapter fixtures", () => {
  it("builds a complete base-bound head snapshot and evaluates it deterministically", async () => {
    const recorded = await fixture("happy-path.json");
    const { client: github, transport } = client(recorded.exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github, ...(recorded.request.allowConfirmedAbsence === undefined ? [] : [{ allowConfirmedAbsence: recorded.request.allowConfirmedAbsence }]));

    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    expect(result.identity.repositoryId).toBe(1);
    expect(result.identity.headRepositoryId).toBe(2);
    expect(result.identity.baseSha).toBe("base-sha");
    expect(result.identity.testedSha).toBe("head-sha");
    const policyExchange = recorded.exchanges.find((exchange) => exchange.request.path.endsWith("/contents/patchgate.yml"));
    const policyBody = policyExchange?.response.body as Record<string, unknown>;
    const rawPolicyDigest = `sha256:${createHash("sha256").update(Buffer.from(String(policyBody.content), "base64")).digest("hex")}`;
    expect(result.input.policySources.find((source) => source.kind === "patchgate")?.digest).toBe(rawPolicyDigest);
    expect(result.input.linkedIssues).toEqual([{ repository: "example/service", number: 12, repositoryId: "issue-repo", issueId: "issue-12", linked: true }]);
    expect(result.input.checks[0]).toMatchObject({ workflowRunId: 101, workflowRunAttempt: 1, workflowId: 123, testedSha: "head-sha" });
    expect(result.input.observations.policySources.every((meta) => meta.complete)).toBe(true);
    expect(result.metrics.requests.finalizationAttempted).toBeGreaterThan(0);
    expect(result.metrics.requests.attempted).toBe(result.metrics.requests.succeeded + result.metrics.requests.failed);
    expect(transport.remainingResponses()).toBe(0);

    const receipt = evaluateContribution(result.input, "2026-08-13T00:00:00.000Z");
    expect(receipt.final.status).toBe("ready_for_review");
    expect(receipt.requirements.filter((requirement) => requirement.result !== "passed")).toEqual([]);
  });

  it("falls back to the supported .github/patchgate.yml base-policy path", async () => {
    const recorded = await fixture("happy-path.json");
    const exchanges = structuredClone(recorded.exchanges);
    const policyResponses = exchanges.filter((exchange) => exchange.request.path === "/repos/example/service/contents/patchgate.yml");
    const policyBodies = policyResponses.map((exchange) => exchange.response.body as Record<string, unknown>);
    for (const exchange of policyResponses) exchange.response = recordedResponse(404, { message: "Not Found" });
    for (const body of policyBodies) {
      exchanges.push({
        request: { method: "GET", path: "/repos/example/service/contents/.github/patchgate.yml", query: { ref: "base-sha" } },
        response: recordedResponse(200, { ...body, path: ".github/patchgate.yml" }),
      });
    }
    const { client: github } = client(exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github, { allowConfirmedAbsence: true });

    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    expect(result.input.policySources.find((source) => source.kind === "patchgate")?.identity).toBe(".github/patchgate.yml");
    expect(evaluateContribution(result.input, "2026-08-13T00:00:00.000Z").final.status).toBe("ready_for_review");
  });

  it("rejects merge-group requests before making an API call", async () => {
    const recorded = await fixture("merge-group-unsupported.json");
    const { client: github, transport } = client([]);
    const result = await buildGitHubSnapshot(recorded.request, github);

    expect(result.kind).toBe("rejected");
    if (result.kind !== "rejected") return;
    expect(result.diagnostic.id).toBe("GITHUB_API_UNSUPPORTED");
    expect(transport.requested()).toEqual([]);
  });

  it("rejects a repository permission failure before collection", async () => {
    const recorded = await fixture("permission-denied.json");
    const { client: github } = client(recorded.exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github);
    expect(result).toMatchObject({ kind: "rejected", diagnostic: { id: "GITHUB_PERMISSION_INSUFFICIENT" } });
    if (result.kind === "rejected") expect(result.capability?.observations).toContainEqual(expect.objectContaining({ endpoint: "repos/{owner}/{name}", state: "insufficient" }));
  });

  it("rejects an applicable active native control the scalar evaluator cannot represent", async () => {
    const recorded = await fixture("happy-path.json");
    const exchanges = structuredClone(recorded.exchanges);
    for (const exchange of exchanges) {
      if (exchange.request.path === "/repos/example/service/rulesets") {
        const body = [{ id: 90, name: "protect-main", target: "branch", enforcement: "active", conditions: { ref_name: { include: ["refs/heads/main"] } }, rules: [{ type: "required_status_checks" }], bypass_actors: [] }];
        exchange.response = recordedResponse(exchange.response.status, body, { ...exchange.response.headers });
      }
    }
    const { client: github } = client(exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github, { allowConfirmedAbsence: true });
    expect(result).toMatchObject({ kind: "rejected", diagnostic: { id: "GITHUB_API_UNSUPPORTED" } });
  });

  it("evaluates branch-protection checks from a normalized, base-bound native contract", async () => {
    const recorded = await fixture("happy-path.json");
    const exchanges = structuredClone(recorded.exchanges);
    for (const exchange of exchanges) {
      if (exchange.request.path === "/repos/example/service/branches/main/protection") exchange.response = recordedResponse(200, branchProtectionBody(0));
    }
    const { client: github } = client(exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github, { allowConfirmedAbsence: true });

    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    expect(result.input.nativeControls?.branchProtection?.requiredChecks).toEqual([{ context: "unit" }]);
    expect(result.input.policySources.find((source) => source.kind === "branch_protection")?.digest).toBeDefined();
    const receipt = evaluateContribution(result.input, "2026-08-13T00:00:00.000Z");
    expect(receipt.final.status).toBe("ready_for_review");
    expect(receipt.requirements).toEqual(expect.arrayContaining([expect.objectContaining({ id: "native.branch_protection.check.1", authority: "branch_protection", result: "passed" })]));
  });

  it("turns native branch-protection approval requirements into an explicit human gate", async () => {
    const recorded = await fixture("happy-path.json");
    const exchanges = structuredClone(recorded.exchanges);
    for (const exchange of exchanges) {
      if (exchange.request.path === "/repos/example/service/branches/main/protection") exchange.response = recordedResponse(200, branchProtectionBody(1));
    }
    const { client: github } = client(exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github, { allowConfirmedAbsence: true });

    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    const receipt = evaluateContribution(result.input, "2026-08-13T00:00:00.000Z");
    expect(receipt.final.status).toBe("human_review_required");
    expect(receipt.requirements).toEqual(expect.arrayContaining([expect.objectContaining({ id: "handoff.native.branch_protection.required_approvals", result: "failed", authority: "branch_protection" })]));
    expect(receipt.humanGates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "native.branch_protection.required_approvals", satisfied: false, requiredCount: 1 })]));
  });

  it("does not treat an unconfirmed native-control 404 as absence", async () => {
    const recorded = await fixture("happy-path.json");
    const { client: github } = client(recorded.exchanges);
    const result = await buildGitHubSnapshot(recorded.request, github);
    expect(result).toMatchObject({ kind: "rejected", diagnostic: { id: "GITHUB_PROVENANCE_AMBIGUOUS" } });
  });

  it("builds the merge target from the immutable merge SHA", async () => {
    const recorded = await fixture("happy-path.json");
    const exchanges = structuredClone(recorded.exchanges);
    const mergeSha = "merge-sha";
    for (const exchange of exchanges) {
      if (exchange.request.path.includes("/commits/head-sha/")) exchange.request.path = exchange.request.path.replace("/commits/head-sha/", `/commits/${mergeSha}/`);
      if (exchange.request.query?.head_sha === "head-sha") exchange.request = { ...exchange.request, query: { ...exchange.request.query, head_sha: mergeSha } };
      if (exchange.request.path === "/repos/example/service/pulls/7") {
        const body = exchange.response.body as Record<string, unknown>;
        exchange.response = { ...exchange.response, body: { ...body, merge_commit_sha: mergeSha } };
      }
      if (exchange.request.path === "/repos/example/service/commits/merge-sha/check-runs") {
        const body = exchange.response.body as Record<string, unknown>;
        const runs = Array.isArray(body.check_runs) ? body.check_runs.map((run) => ({ ...(run as Record<string, unknown>), head_sha: mergeSha })) : body.check_runs;
        exchange.response = { ...exchange.response, body: { ...body, check_runs: runs } };
      }
      if (exchange.request.path === "/repos/example/service/actions/runs") {
        const body = exchange.response.body as Record<string, unknown>;
        const runs = Array.isArray(body.workflow_runs) ? body.workflow_runs.map((run) => ({ ...(run as Record<string, unknown>), head_sha: mergeSha })) : body.workflow_runs;
        exchange.response = { ...exchange.response, body: { ...body, workflow_runs: runs } };
      }
      if (exchange.request.path.endsWith("/contents/patchgate.yml")) {
        const body = exchange.response.body as Record<string, unknown>;
        const policy = Buffer.from(String(body.content), "base64").toString("utf8").replace("target: head", "target: merge");
        exchange.response = { ...exchange.response, body: { ...body, content: Buffer.from(policy).toString("base64"), size: Buffer.byteLength(policy) } };
      }
    }
    const { client: github } = client(exchanges);
    const result = await buildGitHubSnapshot({ ...recorded.request, targetKind: "merge" }, github, { allowConfirmedAbsence: true });
    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    expect(result.identity.mergeSha).toBe(mergeSha);
    expect(result.identity.testedSha).toBe(mergeSha);
    expect(result.input.revisions.targetKind).toBe("merge");
    expect(evaluateContribution(result.input, "2026-08-13T00:00:00.000Z").final.status).toBe("ready_for_review");
  });

  it("keeps the API fixture manifest bijective with owned JSON fixtures", async () => {
    const manifest = JSON.parse(await readFile(resolve("fixtures/api/manifest.json"), "utf8")) as FixtureManifest;
    const files = (await readdir(resolve("fixtures/api"))).filter((file) => file.endsWith(".json") && file !== "manifest.json").map((file) => `fixtures/api/${file}`).sort();
    const references = [...new Set(manifest.cases.map((item) => item.path))].sort();
    expect(references).toEqual(files);
    expect(new Set(manifest.cases.map((item) => item.id)).size).toBe(manifest.cases.length);
    for (const item of manifest.cases) {
      expect(files).toContain(item.path);
      const recorded = await fixture(item.path.slice("fixtures/api/".length));
      let exchanges = structuredClone(recorded.exchanges);
      const request = item.variant === "merge-target" ? { ...recorded.request, targetKind: "merge" as const } : recorded.request;
      if (item.variant === "merge-target") {
        for (const exchange of exchanges) {
          if (exchange.request.path.includes("/commits/head-sha/")) exchange.request.path = exchange.request.path.replace("/commits/head-sha/", "/commits/merge-sha/");
          if (exchange.request.query?.head_sha === "head-sha") exchange.request = { ...exchange.request, query: { ...exchange.request.query, head_sha: "merge-sha" } };
          if (exchange.request.path === "/repos/example/service/pulls/7") {
            const body = exchange.response.body as Record<string, unknown>;
            exchange.response = { ...exchange.response, body: { ...body, merge_commit_sha: "merge-sha" } };
          }
          if (exchange.request.path === "/repos/example/service/commits/merge-sha/check-runs") {
            const body = exchange.response.body as Record<string, unknown>;
            const runs = Array.isArray(body.check_runs) ? body.check_runs.map((run) => ({ ...(run as Record<string, unknown>), head_sha: "merge-sha" })) : body.check_runs;
            exchange.response = { ...exchange.response, body: { ...body, check_runs: runs } };
          }
          if (exchange.request.path === "/repos/example/service/actions/runs") {
            const body = exchange.response.body as Record<string, unknown>;
            const runs = Array.isArray(body.workflow_runs) ? body.workflow_runs.map((run) => ({ ...(run as Record<string, unknown>), head_sha: "merge-sha" })) : body.workflow_runs;
            exchange.response = { ...exchange.response, body: { ...body, workflow_runs: runs } };
          }
          if (exchange.request.path.endsWith("/contents/patchgate.yml")) {
            const body = exchange.response.body as Record<string, unknown>;
            const policy = Buffer.from(String(body.content), "base64").toString("utf8").replace("target: head", "target: merge");
            exchange.response = { ...exchange.response, body: { ...body, content: Buffer.from(policy).toString("base64"), size: Buffer.byteLength(policy) } };
          }
        }
      }
      const { client: github, transport } = client(exchanges);
      const result = await buildGitHubSnapshot(request, github, { allowConfirmedAbsence: true });
      expect(github.budget.snapshot().requests.attempted).toBeGreaterThanOrEqual(Number(item.expected.minAttemptedRequests ?? 0));
      expect(github.budget.snapshot().responseBytes).toBeLessThanOrEqual(Number(item.expected.maxResponseBytes ?? 2097152));
      if (item.kind === "reject") {
        expect(result.kind).toBe("rejected");
        if (result.kind === "rejected") {
          expect(result.diagnostic.id).toBe(item.expected.diagnosticId);
          expect(result.diagnostic.exitCode).toBe(item.expected.exit);
        }
      } else {
        expect(result.kind).toBe("built");
        if (result.kind === "built") {
          expect(evaluateContribution(result.input, "2026-08-13T00:00:00.000Z").final.status).toBe(item.expected.status);
          expect(Object.values(result.input.observations).flatMap((value) => Array.isArray(value) ? value : [value]).every((meta) => meta.complete && meta.permissionState === "sufficient")).toBe(item.expected.complete);
          expect(result.input.policySources.every((source) => /^sha256:[0-9a-f]{64}$/.test(source.digest))).toBe(true);
          const observationMetas = Object.values(result.input.observations).flatMap((value) => Array.isArray(value) ? value : [value]);
          expect(observationMetas.every((meta) => /^sha256:[0-9a-f]{64}$/.test(meta.normalizedDigest ?? ""))).toBe(true);
          expect(result.metrics.caps).toEqual(item.expected.caps ?? []);
          const report = redactForReport({ input: result.input, diagnostics: result.diagnostics, metrics: result.metrics, capability: result.capability });
          assertRedacted(report);
          expect(item.expected.redacted).toBe(true);
        }
      }
      expect(transport.remainingResponses()).toBe(Number(item.expected.remainingResponses));
      const uniqueRequests = [...new Map(exchanges.map((exchange) => [canonicalJson(exchange.request), exchange.request])).values()];
      const expectedRequests = item.kind === "reject"
        ? exchanges.slice(0, Number(item.expected.requestCount ?? 0)).map((exchange) => exchange.request)
        : Array.from({ length: 2 }, () => uniqueRequests).flat();
      expect(transport.requested()).toEqual(expectedRequests);
      expect(transport.requested().map((request) => `${request.method} ${request.path}`)).toEqual(item.expected.requestSequence);
      expect(transport.requested()).toHaveLength(Number(item.expected.requestCount));
    }
    expect(manifest.cases.map((item) => item.id)).toEqual(expect.arrayContaining(["github-pr-happy-path", "github-pr-merge-target-derived", "github-merge-group-unsupported", "github-repository-permission-denied"]));
  });
});
