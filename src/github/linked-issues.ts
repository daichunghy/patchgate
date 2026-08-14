import { sha256Digest } from "../canonical-json.js";
import type { LinkedIssue, ObservationMeta } from "../types.js";
import { isRecord, readString, readPositiveInt } from "./api-types.js";
import type { RawGraphQlIssue } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { redactForReport, safeAllowlistedString } from "./redaction.js";

export interface LinkedIssuesResult {
  issues: LinkedIssue[];
  meta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
}

function parseIssue(value: unknown): RawGraphQlIssue | undefined {
  if (!isRecord(value) || !isRecord(value.repository)) return undefined;
  const nameWithOwner = readString(value.repository, "nameWithOwner");
  const repositoryId = readString(value.repository, "id");
  const number = readPositiveInt(value, "number");
  const issueId = readString(value, "id");
  if (nameWithOwner === undefined || number === undefined || repositoryId === undefined || issueId === undefined) return undefined;
  return { repository: { nameWithOwner: safeAllowlistedString(nameWithOwner, "linked issue repository", 500), id: safeAllowlistedString(repositoryId, "linked issue repository ID", 500) }, number, id: safeAllowlistedString(issueId, "linked issue ID", 500) };
}

export async function collectLinkedIssues(client: GitHubClient, owner: string, name: string, pullNumber: number, headSha: string, phase: "collection" | "finalization" = "collection"): Promise<LinkedIssuesResult> {
  const issues: LinkedIssue[] = [];
  const diagnostics: GitHubDiagnostic[] = [];
  let after: string | null = null;
  let complete = true;
  let pages = 0;
  const seenNatural = new Set<string>();
  const seenImmutable = new Set<string>();
  const responseDigests: string[] = [];
  const retrievedAt = new Date(client.clock.now()).toISOString();
  while (true) {
    pages += 1;
    if (!client.budget.recordPage("linkedIssues")) { complete = false; diagnostics.push(makeDiagnostic("GITHUB_PAGINATION_LIMIT", "Linked-issue pagination exceeded the bounded page budget.", { observation: "linkedIssues" })); break; }
    try {
      const response = await client.request({ method: "POST", path: "/graphql", operation: "pullRequestClosingIssues", variables: { owner, name, number: pullNumber, first: 100, after } }, "linkedIssues", phase);
      responseDigests.push(sha256Digest(redactForReport({ status: response.status, headers: response.headers, body: response.body })));
      if (response.status === 403 || response.status === 404) { complete = false; diagnostics.push(makeDiagnostic(response.status === 403 ? "GITHUB_PERMISSION_INSUFFICIENT" : "GITHUB_RESOURCE_NOT_VISIBLE", "Native linked-issue relationship is not visible to the configured credential.", { observation: "linkedIssues", permissionState: response.status === 403 ? "insufficient" : "unknown" })); break; }
      if (!isRecord(response.body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The linked-issue GraphQL response was not an object.", { observation: "linkedIssues", snapshotEvaluable: false, exitCode: 2 }));
      if (Array.isArray(response.body.errors) && response.body.errors.length > 0) throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "GitHub returned GraphQL errors or partial linked-issue data.", { observation: "linkedIssues", remediation: "Grant the required read capability or keep issue linkage non-ready." }));
      const data = response.body.data;
      if (!isRecord(data) || !isRecord(data.repository) || !isRecord(data.repository.pullRequest) || !isRecord(data.repository.pullRequest.closingIssuesReferences)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "GitHub did not expose the documented closingIssuesReferences connection.", { observation: "linkedIssues" }));
      const connection = data.repository.pullRequest.closingIssuesReferences;
      const nodes = connection.nodes;
      if (!Array.isArray(nodes)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The linked-issue node list was missing or malformed.", { observation: "linkedIssues", snapshotEvaluable: false, exitCode: 2 }));
      const pageInfo = connection.pageInfo;
      if (!isRecord(pageInfo) || typeof pageInfo.hasNextPage !== "boolean") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The linked-issue pageInfo was missing or malformed.", { observation: "linkedIssues", snapshotEvaluable: false, exitCode: 2 }));
      for (const node of nodes) {
        const issue = isRecord(node) ? parseIssue(node.issue) : undefined;
        if (issue === undefined) { complete = false; diagnostics.push(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "A linked-issue node lacked immutable repository/number identity.", { observation: "linkedIssues" })); continue; }
        if (issue.repository.nameWithOwner.toLowerCase() !== `${owner}/${name}`.toLowerCase()) { complete = false; diagnostics.push(makeDiagnostic("GITHUB_API_UNSUPPORTED", "Cross-repository linked issues are outside the current v0.1 evaluator contract.", { observation: "linkedIssues", remediation: "Use same-repository native linked issues or add a versioned cross-repository policy contract." })); continue; }
        const naturalKey = `${issue.repository.nameWithOwner.toLowerCase()}#${issue.number}`;
        const repositoryId = issue.repository.id;
        const issueId = issue.id;
        if (repositoryId === undefined || issueId === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "A linked issue lost immutable identity during normalization.", { observation: "linkedIssues", snapshotEvaluable: false, exitCode: 2 }));
        const immutableKey = `${repositoryId}\u0000${issueId}`;
        if (seenNatural.has(naturalKey) || seenImmutable.has(immutableKey)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "The linked-issue connection repeated an issue identity.", { observation: "linkedIssues" }));
        seenNatural.add(naturalKey);
        seenImmutable.add(immutableKey);
        issues.push({ repository: issue.repository.nameWithOwner, number: issue.number, repositoryId, issueId, linked: true });
      }
      if (pageInfo.hasNextPage !== true) break;
      const cursor = typeof pageInfo.endCursor === "string" ? pageInfo.endCursor : undefined;
      if (cursor === undefined || cursor.length === 0 || pages >= client.budget.limits.maxPagesPerGroup) { complete = false; diagnostics.push(makeDiagnostic("GITHUB_PAGINATION_LIMIT", "Linked-issue pagination did not provide a safe bounded cursor.", { observation: "linkedIssues" })); break; }
      after = cursor;
    } catch (error) {
      const diagnostic = error instanceof GitHubAdapterError ? error.diagnostic : makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Linked-issue retrieval failed at the API boundary.", { observation: "linkedIssues", snapshotEvaluable: false, exitCode: 2 });
      complete = false; diagnostics.push(diagnostic); break;
    }
  }
  return { issues: issues.sort((a, b) => a.repository.localeCompare(b.repository) || a.number - b.number), meta: { source: { kind: "github", identity: "graphql:closingIssuesReferences" }, revision: headSha, retrievedAt, complete, permissionState: complete ? "sufficient" : diagnostics.some((item) => item.permissionState === "insufficient") ? "insufficient" : "unknown", responseDigest: sha256Digest(responseDigests) }, diagnostics };
}
