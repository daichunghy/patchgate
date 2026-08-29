import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createFetchTransport, GitHubClient } from "../../src/github/client.js";
import { collectChangedPaths } from "../../src/github/changed-paths.js";
import { collectRulesets } from "../../src/github/rulesets.js";
import { collectReviews } from "../../src/github/reviews.js";
import { collectLinkedIssues } from "../../src/github/linked-issues.js";
import { collectBranchProtection } from "../../src/github/branch-protection.js";
import { collectChecks } from "../../src/github/checks.js";
import { parseNextLink } from "../../src/github/pagination.js";
import { assertRedacted, redactForReport } from "../../src/github/redaction.js";
import { BudgetLedger } from "../../src/github/request-budget.js";
import { recordedResponse, RecordedGitHubTransport } from "../../src/github/mock-transport.js";
import { buildGitHubSnapshot } from "../../src/github/snapshot-builder.js";
import type { RecordedExchange } from "../../src/github/mock-transport.js";
import type { GitHubSnapshotRequest } from "../../src/github/identity.js";

describe("GitHub adapter trust-boundary probes", () => {
  it("redacts credentials, bodies, comments, and secret-like query values", () => {
    const report = redactForReport({
      authorization: "Bearer secret",
      token: "secret",
      body: { code: "untrusted" },
      comment: "untrusted",
      url: "https://api.github.com/repos/example/service?token=secret&safe=1",
      nested: { password: "secret", safe: "ok\u001b[31m" },
      apiKey: "secret",
      api_key: "secret",
      credential: "secret",
      message: "Authorization: Bearer live-token",
      log: "line one\nforged-line",
    });
    assertRedacted(report);
    expect(JSON.stringify(report)).not.toContain("secret");
    expect(JSON.stringify(report)).not.toContain("untrusted");
    expect(JSON.stringify(report)).not.toContain("live-token");
    expect(JSON.stringify(report)).not.toContain("apiKey");
    expect(JSON.stringify(report)).not.toContain("\nforged-line");
    expect(report).toMatchObject({ url: "https://api.github.com/repos/example/service?token=[REDACTED]&safe=1" });
  });

  it("accepts only same-origin HTTPS pagination links", () => {
    expect(parseNextLink('<https://api.github.com/repos/example/service?page=2>; rel="next"', "https://api.github.com")).toBe("https://api.github.com/repos/example/service?page=2");
    expect(() => parseNextLink('<https://evil.example/page=2>; rel="next"', "https://api.github.com")).toThrow(/outside the configured API origin/);
  });

  it("rejects untrusted transport origins and oversize injected responses", async () => {
    expect(() => createFetchTransport({ origin: "http://api.github.com" })).toThrow(/trusted HTTPS origin/);
    const transport = new RecordedGitHubTransport([{ request: { method: "GET", path: "/repos/example/service" }, response: recordedResponse(200, { id: 1 }) }]);
    const client = new GitHubClient(transport, new BudgetLedger({ maxResponseBytes: 1 }));
    await expect(client.request({ method: "GET", path: "/repos/example/service" }, "test")).rejects.toMatchObject({ diagnostic: { id: "GITHUB_RESPONSE_TOO_LARGE" } });
  });

  it("sends the allowlisted GraphQL operation name that matches the document", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } } }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const transport = createFetchTransport({ token: "test-token" });
      await transport.request({ method: "POST", path: "/graphql", operation: "pullRequestClosingIssues", variables: { owner: "example", name: "service", number: 7, first: 100, after: null } });
      expect(requestBody).toMatchObject({ operationName: "PullRequestClosingIssues" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps 403 incomplete and enforces the documented changed-file ceiling", async () => {
    const denied = new GitHubClient(new RecordedGitHubTransport([{ request: { method: "GET", path: "/repos/example/service/pulls/7/files", query: { per_page: 100 } }, response: recordedResponse(403, { message: "Forbidden" }) }]));
    const deniedResult = await collectChangedPaths(denied, "example", "service", 7, "head-sha");
    expect(deniedResult.meta).toMatchObject({ complete: false, permissionState: "insufficient" });

    const files = Array.from({ length: 3000 }, (_, index) => ({ filename: `src/generated-${index}.ts`, status: "modified" }));
    const capped = new GitHubClient(new RecordedGitHubTransport([{ request: { method: "GET", path: "/repos/example/service/pulls/7/files", query: { per_page: 100 } }, response: recordedResponse(200, files) }]));
    const cappedResult = await collectChangedPaths(capped, "example", "service", 7, "head-sha");
    expect(cappedResult.meta.complete).toBe(false);
    expect(cappedResult.diagnostics.map((diagnostic) => diagnostic.id)).toContain("GITHUB_PAGINATION_LIMIT");
    expect(cappedResult.paths).toHaveLength(3000);
  });

  it("paginates inherited rulesets before declaring native visibility complete", async () => {
    const firstRequest = { method: "GET" as const, path: "/repos/example/service/rulesets", query: { includes_parents: true, per_page: 100 } };
    const secondRequest = { method: "GET" as const, path: "/repos/example/service/rulesets", query: { includes_parents: "true", per_page: "100", page: "2" } };
    const client = new GitHubClient(new RecordedGitHubTransport([
      { request: firstRequest, response: recordedResponse(200, [], { link: '<https://api.github.com/repos/example/service/rulesets?includes_parents=true&per_page=100&page=2>; rel="next"' }) },
      { request: secondRequest, response: recordedResponse(200, [{ id: 90, name: "protect-main", target: "branch", enforcement: "active", conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } }, rules: [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "unit" }], strict_required_status_checks_policy: true } }], bypass_actors: [] }]) },
    ]));
    const result = await collectRulesets(client, "example", "service", "main", "base-sha", true);
    expect(result.meta).toMatchObject({ complete: true, permissionState: "sufficient" });
    expect(result.rulesets).toHaveLength(1);
    expect(result.decisionBearing).toBe(true);
  });

  it("accepts GitHub's current direct Issue nodes for closingIssuesReferences", async () => {
    const request = { method: "POST" as const, path: "/graphql", operation: "pullRequestClosingIssues" as const, variables: { owner: "example", name: "service", number: 7, first: 100, after: null } };
    const client = new GitHubClient(new RecordedGitHubTransport([{ request, response: recordedResponse(200, { data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [{ id: "issue-12", repository: { nameWithOwner: "example/service", id: "issue-repo" }, number: 12 }], pageInfo: { hasNextPage: false, endCursor: null } } } } } }) }]));
    const result = await collectLinkedIssues(client, "example", "service", 7, "head-sha");
    expect(result.meta).toMatchObject({ complete: true, permissionState: "sufficient" });
    expect(result.issues).toEqual([{ repository: "example/service", number: 12, repositoryId: "issue-repo", issueId: "issue-12", linked: true }]);
  });

  it("derives current review state by submitted time rather than response order", async () => {
    const request = { method: "GET" as const, path: "/repos/example/service/pulls/7/reviews", query: { per_page: 100 } };
    const client = new GitHubClient(new RecordedGitHubTransport([{ request, response: recordedResponse(200, [
      { id: 20, user: { id: 10, login: "reviewer", type: "User" }, state: "APPROVED", commit_id: "head-sha", submitted_at: "2026-08-13T12:00:00Z" },
      { id: 21, user: { id: 10, login: "reviewer", type: "User" }, state: "CHANGES_REQUESTED", commit_id: "head-sha", submitted_at: "2026-08-13T11:00:00Z" },
    ]) }]));
    const result = await collectReviews(client, "example", "service", 7, "head-sha", undefined);
    expect(result.reviews.find((review) => review.reviewId === 20)?.active).toBe(true);
    expect(result.reviews.find((review) => review.reviewId === 21)?.active).toBe(false);
  });

  it("does not promote partial linked-issue or branch-protection shapes to complete", async () => {
    const linkedRequest = { method: "POST" as const, path: "/graphql", operation: "pullRequestClosingIssues" as const, variables: { owner: "example", name: "service", number: 7, first: 100, after: null } };
    const linkedClient = new GitHubClient(new RecordedGitHubTransport([{ request: linkedRequest, response: recordedResponse(200, { data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [] } } } } }) }]));
    const linked = await collectLinkedIssues(linkedClient, "example", "service", 7, "head-sha");
    expect(linked.meta.complete).toBe(false);

    const protectionRequest = { method: "GET" as const, path: "/repos/example/service/branches/main/protection" };
    const protectionClient = new GitHubClient(new RecordedGitHubTransport([{ request: protectionRequest, response: recordedResponse(200, {}) }]));
    const protection = await collectBranchProtection(protectionClient, "example", "service", "main", "base-sha");
    expect(protection.meta.complete).toBe(false);

    const malformedEntries = new GitHubClient(new RecordedGitHubTransport([{ request: protectionRequest, response: recordedResponse(200, { required_status_checks: { checks: [{ context: 123 }] }, required_pull_request_reviews: null }) }]));
    const malformed = await collectBranchProtection(malformedEntries, "example", "service", "main", "base-sha");
    expect(malformed.meta.complete).toBe(false);
    expect(malformed.diagnostics.map((diagnostic) => diagnostic.id)).toContain("GITHUB_RESPONSE_MALFORMED");
  });

  it("does not promote a workflow-bound check with a spoofed App identity", async () => {
    const checksRequest = { method: "GET" as const, path: "/repos/example/service/commits/head-sha/check-runs", query: { per_page: 100, filter: "all" } };
    const workflowsRequest = { method: "GET" as const, path: "/repos/example/service/actions/runs", query: { head_sha: "head-sha", per_page: 100 } };
    const github = new GitHubClient(new RecordedGitHubTransport([
      { request: checksRequest, response: recordedResponse(200, { total_count: 1, check_runs: [{ id: 50, name: "unit", status: "completed", conclusion: "success", head_sha: "head-sha", app: { id: 777, slug: "evil-app" }, check_suite: { id: 77 } }] }) },
      { request: workflowsRequest, response: recordedResponse(200, { total_count: 1, workflow_runs: [{ id: 101, run_attempt: 1, head_sha: "head-sha", event: "pull_request", workflow_id: 123, path: ".github/workflows/ci.yml", check_suite_id: 77, status: "completed", conclusion: "success" }] }) },
    ]));
    const result = await collectChecks(github, "example", "service", "head-sha");
    expect(result.meta.complete).toBe(false);
    expect(result.checks[0]).toMatchObject({ sourceStrength: "unattributed" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.id)).toContain("GITHUB_PROVENANCE_AMBIGUOUS");
  });

  it("bounds retries, rate-limit sleeps, conditional responses, and finalization reserve", async () => {
    const request = { method: "GET" as const, path: "/repos/example/service" };
    const transport = new RecordedGitHubTransport([
      { request, response: recordedResponse(500, { message: "temporary" }) },
      { request, response: recordedResponse(200, { id: 1 }) },
    ]);
    const sleeps: number[] = [];
    const retrying = new GitHubClient(transport, undefined, { clock: { now: () => 1_000, sleep: async (ms) => { sleeps.push(ms); } } });
    await expect(retrying.request(request, "repository")).resolves.toMatchObject({ status: 200 });
    expect(retrying.budget.snapshot()).toMatchObject({ retriesByReason: { server_5xx: 1 } });
    expect(sleeps).toEqual([]);

    const rateTransport = new RecordedGitHubTransport([
      { request, response: recordedResponse(429, { message: "slow down" }, { "retry-after": "1" }) },
      { request, response: recordedResponse(200, { id: 1 }) },
    ]);
    const rateSleeps: number[] = [];
    const rateClient = new GitHubClient(rateTransport, undefined, { clock: { now: () => 1_000, sleep: async (ms) => { rateSleeps.push(ms); } } });
    await expect(rateClient.request(request, "repository")).resolves.toMatchObject({ status: 200 });
    expect(rateSleeps).toEqual([1000]);
    expect(rateClient.budget.snapshot().retryAfterObservedMs).toEqual([1000]);

    const conditional = new GitHubClient(new RecordedGitHubTransport([{ request, response: recordedResponse(304, null) }]));
    await expect(conditional.request(request, "repository")).rejects.toMatchObject({ diagnostic: { id: "GITHUB_CACHE_IDENTITY_MISMATCH" } });
    expect(conditional.budget.snapshot().conditional304).toBe(1);

    const reserved = new BudgetLedger({ maxRequests: 4, finalizationReserveRequests: 2 });
    reserved.beginRequest("collection");
    reserved.beginRequest("collection");
    expect(() => reserved.beginRequest("collection")).toThrow(/collection request budget/);
    reserved.beginRequest("finalization");
    reserved.beginRequest("finalization");
  });

  it("rejects a pull-request target that changes before finalization", async () => {
    const fixture = JSON.parse(await readFile(resolve("fixtures/api/happy-path.json"), "utf8")) as { request: GitHubSnapshotRequest; exchanges: RecordedExchange[] };
    const exchanges = structuredClone(fixture.exchanges);
    const pullReads = exchanges.filter((exchange) => exchange.request.path === "/repos/example/service/pulls/7");
    const second = pullReads[1]!;
    const body = second.response.body as Record<string, unknown>;
    const head = body.head as Record<string, unknown>;
    second.response = { ...second.response, body: { ...body, head: { ...head, sha: "changed-head-sha" } } };
    const client = new GitHubClient(new RecordedGitHubTransport(exchanges));
    const result = await buildGitHubSnapshot(fixture.request, client, { allowConfirmedAbsence: true });
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.diagnostic.id).toBe("GITHUB_TARGET_CHANGED");
  });

  it("rejects a live head that no longer matches the workflow event head", async () => {
    const fixture = JSON.parse(await readFile(resolve("fixtures/api/happy-path.json"), "utf8")) as { request: GitHubSnapshotRequest; exchanges: RecordedExchange[] };
    const request = { ...fixture.request, expectedHeadSha: "event-head-sha" };
    const result = await buildGitHubSnapshot(request, new GitHubClient(new RecordedGitHubTransport(fixture.exchanges)), { allowConfirmedAbsence: true });
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.diagnostic.id).toBe("GITHUB_TARGET_CHANGED");
  });

  it("does not allow confirmed absence on an authenticated/live transport", async () => {
    const transport = new RecordedGitHubTransport([]);
    const client = new GitHubClient(transport, undefined, { token: "not-a-fixture-token" });
    const result = await buildGitHubSnapshot({ owner: "example", name: "service", pullNumber: 7, eventKind: "pull_request", targetKind: "head" }, client, { allowConfirmedAbsence: true });
    expect(result).toMatchObject({ kind: "rejected", diagnostic: { id: "GITHUB_API_UNSUPPORTED" } });
    expect(transport.requested()).toEqual([]);
  });

  it("reports check-runs and workflow-runs capability states independently", async () => {
    const fixture = JSON.parse(await readFile(resolve("fixtures/api/happy-path.json"), "utf8")) as { request: GitHubSnapshotRequest; exchanges: RecordedExchange[] };
    const exchanges = structuredClone(fixture.exchanges);
    for (const exchange of exchanges) {
      if (exchange.request.path.includes("/check-runs")) exchange.response = recordedResponse(403, { message: "Forbidden" });
    }
    const result = await buildGitHubSnapshot(fixture.request, new GitHubClient(new RecordedGitHubTransport(exchanges)), { allowConfirmedAbsence: true });
    expect(result.kind).toBe("built");
    if (result.kind !== "built") return;
    expect(result.capability.observations.find((observation) => observation.endpoint === "commits/{testedSha}/check-runs")?.state).toBe("insufficient");
    expect(result.capability.observations.find((observation) => observation.endpoint === "actions/runs?head_sha")?.state).toBe("sufficient");
  });
});
