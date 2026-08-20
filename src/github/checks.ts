import { sha256Digest } from "../canonical-json.js";
import type { CheckEvidence, ObservationMeta } from "../types.js";
import type { RawCheckRun, RawWorkflowRun } from "./api-types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { collectPaginated } from "./pagination.js";
import { collectWorkflowRuns } from "./workflows.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { safeAllowlistedString } from "./redaction.js";

export interface ChecksResult {
  checks: CheckEvidence[];
  meta: ObservationMeta;
  checkRunsMeta: ObservationMeta;
  workflowMeta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
}

function parseCheckRuns(body: unknown): RawCheckRun[] {
  if (!isRecord(body) || !Array.isArray(body.check_runs)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The check-runs response was malformed.", { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
  const total = readPositiveInt(body, "total_count");
  if (total !== undefined && total > 1000) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PAGINATION_LIMIT", "The check-runs response cannot prove all check suites beyond GitHub's 1,000-suite limit.", { observation: "checks" }));
  return body.check_runs.map((value, index) => {
    if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Check run ${index} was malformed.`, { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
    const id = readPositiveInt(value, "id");
    const name = readString(value, "name");
    const status = readString(value, "status");
    const headSha = readString(value, "head_sha");
    if (id === undefined || name === undefined || status === undefined || headSha === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Check run ${index} lacked immutable identity fields.`, { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
    if (status !== "queued" && status !== "in_progress" && status !== "completed") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Check run ${id} had an unsupported status.`, { observation: "checks", snapshotEvaluable: false, exitCode: 2 }));
    const conclusion = readString(value, "conclusion");
    const app = isRecord(value.app) ? { id: readPositiveInt(value.app, "id"), slug: readString(value.app, "slug") } : undefined;
    const suite = isRecord(value.check_suite) ? { id: readPositiveInt(value.check_suite, "id") } : undefined;
    if (suite?.id === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Check run ${id} lacked an immutable check-suite relation.`, { observation: "checks" }));
    return { id, name: safeAllowlistedString(name, `check ${id} name`, 500), status, head_sha: headSha, ...(conclusion === undefined ? {} : { conclusion }), ...(app === undefined ? {} : { app: { ...(app.id === undefined ? {} : { id: app.id }), ...(app.slug === undefined ? {} : { slug: app.slug }) } }), check_suite: { id: suite.id } };
  });
}

function workflowsForCheck(check: RawCheckRun, workflows: readonly RawWorkflowRun[]): RawWorkflowRun[] {
  const suiteId = check.check_suite?.id;
  return workflows.filter((run) => run.check_suite_id === suiteId && run.head_sha === check.head_sha);
}

function isActionsApp(appId: number | undefined, appSlug: string | undefined): boolean {
  return appId === 15368 && appSlug?.toLowerCase() === "github-actions";
}

export async function collectChecks(client: GitHubClient, owner: string, name: string, testedSha: string, phase: "collection" | "finalization" = "collection"): Promise<ChecksResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  const diagnostics: GitHubDiagnostic[] = [];
  const checkPages = await collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(testedSha)}/check-runs`, query: { per_page: 100, filter: "all" } }, "checks", parseCheckRuns, (check) => String(check.id), { phase });
  const workflowPages = await collectWorkflowRuns(client, owner, name, testedSha, phase);
  diagnostics.push(...checkPages.diagnostics, ...workflowPages.diagnostics);
  const checks: CheckEvidence[] = [];
  const checkIds = new Set<number>();
  const workflowKeys = new Set<string>();
  for (const raw of checkPages.items) {
    if (checkIds.has(raw.id)) { diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Duplicate check-run identity ${raw.id} was returned.`, { observation: "checks" })); continue; }
    checkIds.add(raw.id);
    if (raw.head_sha !== testedSha) continue;
    const workflowCandidates = workflowsForCheck(raw, workflowPages.items);
    if (workflowCandidates.length > 1) {
      diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Check run ${raw.id} matched multiple workflow run attempts for the same immutable suite and SHA.`, { observation: "checks", remediation: "Use a documented immutable rerun selector or keep workflow evidence incomplete." }));
    }
    const workflow = workflowCandidates.length === 1 ? workflowCandidates[0] : undefined;
    const workflowAmbiguous = workflowCandidates.length > 1;
    if (workflow !== undefined) {
      const key = `${workflow.id}:${workflow.run_attempt}:${raw.name}`;
      if (workflowKeys.has(key)) diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Duplicate workflow run identity ${key} was returned.`, { observation: "checks" }));
      workflowKeys.add(key);
    }
    const appId = raw.app?.id;
    const appSlug = raw.app?.slug;
    const appIdentityPartial = (appId === 15368) !== (appSlug?.toLowerCase() === "github-actions");
    if (appIdentityPartial) diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Check run ${raw.id} reported a partial GitHub Actions App identity.`, { observation: "checks", remediation: "Require the immutable GitHub Actions App ID and slug pair before accepting workflow evidence." }));
    if (workflow !== undefined && appId !== undefined && isActionsApp(appId, appSlug) && !appIdentityPartial) {
      checks.push({ name: raw.name, status: raw.status as CheckEvidence["status"], ...(raw.conclusion === undefined || raw.conclusion === null ? {} : { conclusion: raw.conclusion }), testedSha: raw.head_sha, ...(appSlug === undefined ? {} : { appSlug }), appId, checkRunId: raw.id, checkSuiteId: raw.check_suite?.id, workflowId: workflow.workflow_id, ...(workflow.path === undefined ? {} : { workflowPath: workflow.path }), workflowRunId: workflow.id, workflowRunAttempt: workflow.run_attempt, event: workflow.event, sourceStrength: "github_actions_workflow", retrievedAt });
    } else if (workflow !== undefined && appId !== undefined) {
      diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `Check run ${raw.id} had a workflow relation but its App identity was not the GitHub Actions allowlist entry.`, { observation: "checks", remediation: "Verify the immutable GitHub Actions App identity before using workflow-bound evidence." }));
      checks.push({ name: raw.name, status: raw.status as CheckEvidence["status"], ...(raw.conclusion === undefined || raw.conclusion === null ? {} : { conclusion: raw.conclusion }), testedSha: raw.head_sha, checkSuiteId: raw.check_suite?.id, sourceStrength: "unattributed", retrievedAt });
    } else if (appId !== undefined && !workflowAmbiguous && !isActionsApp(appId, appSlug)) {
      checks.push({ name: raw.name, status: raw.status as CheckEvidence["status"], ...(raw.conclusion === undefined || raw.conclusion === null ? {} : { conclusion: raw.conclusion }), testedSha: raw.head_sha, ...(appSlug === undefined ? {} : { appSlug }), appId, checkRunId: raw.id, checkSuiteId: raw.check_suite?.id, sourceStrength: "github_app_expected", retrievedAt });
    } else {
      checks.push({ name: raw.name, status: raw.status as CheckEvidence["status"], ...(raw.conclusion === undefined || raw.conclusion === null ? {} : { conclusion: raw.conclusion }), testedSha: raw.head_sha, checkSuiteId: raw.check_suite?.id, sourceStrength: "unattributed", retrievedAt });
    }
  }
  const complete = checkPages.complete && workflowPages.complete && diagnostics.length === 0;
  const checkRunsMeta: ObservationMeta = {
    source: { kind: "github", identity: "check-runs" },
    revision: testedSha,
    retrievedAt,
    complete: checkPages.complete,
    permissionState: checkPages.permissionState,
    responseDigest: sha256Digest(checkPages.pageDigests),
  };
  const workflowMeta: ObservationMeta = {
    source: { kind: "github", identity: "workflow-runs" },
    revision: testedSha,
    retrievedAt,
    complete: workflowPages.complete,
    permissionState: workflowPages.permissionState,
    responseDigest: sha256Digest(workflowPages.pageDigests),
  };
  return { checks, checkRunsMeta, workflowMeta, meta: { source: { kind: "github", identity: "check-runs+workflow-runs" }, revision: testedSha, retrievedAt, complete, permissionState: checkPages.permissionState === "sufficient" && workflowPages.permissionState === "sufficient" && complete ? "sufficient" : checkPages.permissionState === "insufficient" || workflowPages.permissionState === "insufficient" ? "insufficient" : "unknown", responseDigest: sha256Digest({ checkPages: checkPages.pageDigests, workflowPages: workflowPages.pageDigests }) }, diagnostics };
}
