import { sha256Digest } from "../canonical-json.js";
import type { NativeBranchProtection, ObservationMeta, PolicySource } from "../types.js";
import type { RawBranchProtection } from "./api-types.js";
import { isRecord } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";

export type NormalizedBranchProtection = NativeBranchProtection & { decisionBearing: boolean };
export interface BranchProtectionResult { protection?: NormalizedBranchProtection; source?: PolicySource; meta: ObservationMeta; diagnostics: GitHubDiagnostic[]; decisionBearing: boolean }

function parseProtection(body: unknown): RawBranchProtection {
  if (!isRecord(body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection response was not an object.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (!("required_status_checks" in body) || !("required_pull_request_reviews" in body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection response omitted required native-control fields.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (body.required_status_checks !== null && !isRecord(body.required_status_checks)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection required status checks had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (body.required_pull_request_reviews !== null && !isRecord(body.required_pull_request_reviews)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection review settings had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  const checks = isRecord(body.required_status_checks) && body.required_status_checks !== null ? body.required_status_checks : null;
  const reviews = isRecord(body.required_pull_request_reviews) && body.required_pull_request_reviews !== null ? body.required_pull_request_reviews : null;
  if (checks !== null && checks.strict !== undefined && typeof checks.strict !== "boolean") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection strict status checking had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (checks !== null && checks.contexts !== undefined && (!Array.isArray(checks.contexts) || checks.contexts.some((item) => typeof item !== "string" || item.trim().length === 0))) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection status-check contexts had an invalid entry.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (checks !== null && checks.checks !== undefined && (!Array.isArray(checks.checks) || checks.checks.some((item) => !isRecord(item) || typeof item.context !== "string" || (item.app_id !== undefined && item.app_id !== null && (typeof item.app_id !== "number" || !Number.isInteger(item.app_id) || item.app_id < 1))))) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection status-check entries had an invalid entry.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (reviews !== null && reviews.dismiss_stale_reviews !== undefined && typeof reviews.dismiss_stale_reviews !== "boolean") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection stale-review setting had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (reviews !== null && reviews.require_code_owner_reviews !== undefined && typeof reviews.require_code_owner_reviews !== "boolean") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection code-owner setting had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (reviews !== null && reviews.required_approving_review_count !== undefined && (typeof reviews.required_approving_review_count !== "number" || !Number.isInteger(reviews.required_approving_review_count) || reviews.required_approving_review_count < 0)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection approval count had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (reviews !== null && reviews.require_last_push_approval !== undefined && typeof reviews.require_last_push_approval !== "boolean") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection last-push approval setting had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (reviews !== null && reviews.bypass_pull_request_allowances !== undefined && !isRecord(reviews.bypass_pull_request_allowances)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection review bypass allowances had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  if (body.bypass_pull_request_allowances !== undefined && !isRecord(body.bypass_pull_request_allowances)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection bypass allowances had an invalid shape.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 }));
  const statusChecks = checks === null ? null : {
    ...(typeof checks.strict === "boolean" ? { strict: checks.strict } : {}),
    ...(Array.isArray(checks.contexts) ? { contexts: checks.contexts } : {}),
    ...(Array.isArray(checks.checks) ? { checks: checks.checks.map((item) => ({ context: item.context as string, ...(typeof item.app_id === "number" ? { app_id: item.app_id } : {}) })) } : {}),
  };
  const pullRequestReviews = reviews === null ? null : {
    ...(typeof reviews.dismiss_stale_reviews === "boolean" ? { dismiss_stale_reviews: reviews.dismiss_stale_reviews } : {}),
    ...(typeof reviews.require_code_owner_reviews === "boolean" ? { require_code_owner_reviews: reviews.require_code_owner_reviews } : {}),
    ...(typeof reviews.required_approving_review_count === "number" ? { required_approving_review_count: reviews.required_approving_review_count } : {}),
    ...(typeof reviews.require_last_push_approval === "boolean" ? { require_last_push_approval: reviews.require_last_push_approval } : {}),
    ...(isRecord(reviews.bypass_pull_request_allowances) ? { bypass_pull_request_allowances: reviews.bypass_pull_request_allowances } : {}),
  };
  return { required_status_checks: statusChecks, required_pull_request_reviews: pullRequestReviews, ...(isRecord(body.bypass_pull_request_allowances) ? { bypass_pull_request_allowances: body.bypass_pull_request_allowances } : {}) };
}

export async function collectBranchProtection(client: GitHubClient, owner: string, name: string, baseRef: string, baseSha: string, allowConfirmedAbsence = false, phase: "collection" | "finalization" = "collection"): Promise<BranchProtectionResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  const response = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches/${encodeURIComponent(baseRef)}/protection` }, "branch protection", phase);
  if (response.status === 404 && allowConfirmedAbsence) return { meta: { source: { kind: "github", identity: "branch-protection" }, revision: baseSha, retrievedAt, complete: true, permissionState: "sufficient", responseDigest: sha256Digest(response.body) }, diagnostics: [], decisionBearing: false };
  if (response.status === 403 || response.status === 404) return { meta: { source: { kind: "github", identity: "branch-protection" }, revision: baseSha, retrievedAt, complete: false, permissionState: response.status === 403 ? "insufficient" : "unknown" }, diagnostics: [makeDiagnostic(response.status === 403 ? "GITHUB_PERMISSION_INSUFFICIENT" : "GITHUB_RESOURCE_NOT_VISIBLE", "Branch-protection visibility is not sufficient to prove native control absence.", { observation: "branchProtection", permissionState: response.status === 403 ? "insufficient" : "unknown", remediation: "Grant the documented read capability or keep the native-control snapshot rejected." })], decisionBearing: false };
  try {
    const raw = parseProtection(response.body);
    const requiredChecksByContext = new Map<string, { context: string; appId?: number }>();
    for (const item of raw.required_status_checks?.checks ?? []) {
      if (item.context === undefined) continue;
      const existing = requiredChecksByContext.get(item.context);
      if (existing === undefined || (existing.appId === undefined && item.app_id !== undefined && item.app_id !== null)) {
        requiredChecksByContext.set(item.context, { context: item.context, ...(item.app_id === undefined || item.app_id === null ? {} : { appId: item.app_id }) });
      }
    }
    for (const context of raw.required_status_checks?.contexts ?? []) if (!requiredChecksByContext.has(context)) requiredChecksByContext.set(context, { context });
    const requiredChecks = [...requiredChecksByContext.values()].sort((left, right) => left.context.localeCompare(right.context) || (left.appId ?? 0) - (right.appId ?? 0));
    const review = raw.required_pull_request_reviews;
    const protection: NormalizedBranchProtection = { requiredChecks, requiredApprovals: review?.required_approving_review_count ?? 0, requireCodeOwnerReviews: review?.require_code_owner_reviews ?? false, requireLastPushApproval: review?.require_last_push_approval ?? false, staleReviews: review?.dismiss_stale_reviews ?? false, bypassVisible: review?.bypass_pull_request_allowances !== undefined, decisionBearing: requiredChecks.length > 0 || (review?.required_approving_review_count ?? 0) > 0 || review?.require_code_owner_reviews === true || review?.require_last_push_approval === true };
    return { protection, source: { kind: "branch_protection", identity: `branch-protection:${baseRef}`, revision: baseSha, digest: sha256Digest(protection), authority: "enforced" }, meta: { source: { kind: "github", identity: "branch-protection" }, revision: baseSha, retrievedAt, complete: true, permissionState: "sufficient", responseDigest: sha256Digest(response.body) }, diagnostics: [], decisionBearing: protection.decisionBearing };
  } catch (error) {
    const diagnostic = error instanceof GitHubAdapterError ? error.diagnostic : makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Branch-protection normalization failed.", { observation: "branchProtection", snapshotEvaluable: false, exitCode: 2 });
    return { meta: { source: { kind: "github", identity: "branch-protection" }, revision: baseSha, retrievedAt, complete: false, permissionState: diagnostic.permissionState }, diagnostics: [diagnostic], decisionBearing: false };
  }
}
