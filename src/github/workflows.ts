import type { RawWorkflowRun } from "./api-types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { collectPaginated, type PageCollection } from "./pagination.js";
import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";

function parseRuns(body: unknown): RawWorkflowRun[] {
  if (!isRecord(body) || !Array.isArray(body.workflow_runs)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The workflow-runs response was malformed.", { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
  const total = readPositiveInt(body, "total_count");
  if (total !== undefined && total > 1000) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PAGINATION_LIMIT", "The workflow-runs search exceeded GitHub's documented 1,000-result search limit.", { observation: "checks", remediation: "Narrow the workflow-run query or treat required workflow evidence as incomplete." }));
  return body.workflow_runs.map((value, index) => {
    if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Workflow run ${index} was malformed.`, { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
    const id = readPositiveInt(value, "id");
    const headSha = readString(value, "head_sha");
    const event = readString(value, "event");
    const workflowId = readPositiveInt(value, "workflow_id");
    const status = readString(value, "status");
    const attempt = readPositiveInt(value, "run_attempt");
    if (id === undefined || headSha === undefined || event === undefined || workflowId === undefined || status === undefined || attempt === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Workflow run ${index} lacked immutable identity fields.`, { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
    const path = readString(value, "path");
    const conclusion = readString(value, "conclusion");
    const checkSuiteId = readPositiveInt(value, "check_suite_id");
    return { id, head_sha: headSha, event, workflow_id: workflowId, status, run_attempt: attempt, ...(path === undefined ? {} : { path }), ...(conclusion === undefined ? {} : { conclusion }), ...(checkSuiteId === undefined ? {} : { check_suite_id: checkSuiteId }) };
  });
}

export async function collectWorkflowRuns(client: GitHubClient, owner: string, name: string, testedSha: string, phase: "collection" | "finalization" = "collection"): Promise<PageCollection<RawWorkflowRun>> {
  return collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/runs`, query: { head_sha: testedSha, per_page: 100 } }, "workflows", parseRuns, (run) => `${run.id}:${run.run_attempt}`, { phase });
}

