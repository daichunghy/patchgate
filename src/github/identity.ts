import { sha256Digest } from "../canonical-json.js";
import { safeAllowlistedString } from "./redaction.js";
import type { RawPullRequest, RawRepository, RawUser } from "./api-types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";
import { GitHubClient } from "./client.js";
import type { RequestPhase } from "./request-budget.js";

export interface GitHubSnapshotRequest {
  owner: string;
  name: string;
  pullNumber?: number;
  eventKind: "pull_request" | "merge_group";
  targetKind: "head" | "merge" | "merge_group";
}

export interface SnapshotIdentity {
  apiOrigin: string;
  apiVersion: string;
  repositoryId: number;
  owner: string;
  name: string;
  pullRequestId: number;
  pullRequestNumber: number;
  eventKind: "pull_request";
  baseRef: string;
  baseSha: string;
  headRepositoryId: number;
  headRef: string;
  headSha: string;
  mergeSha?: string;
  testedSha: string;
  targetKind: "head" | "merge";
  authorId?: number;
  retrievalStartedAt: string;
  provenanceDigest: string;
}

export interface RawIdentityRead {
  repository: RawRepository;
  pullRequest: RawPullRequest;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `${label} response was not an object.`, { snapshotEvaluable: false, exitCode: 2 }));
  return value;
}

function parseRepository(value: unknown): RawRepository {
  const object = requireObject(value, "repository");
  const id = readPositiveInt(object, "id");
  const name = readString(object, "name");
  const fullName = readString(object, "full_name");
  if (id === undefined || name === undefined || fullName === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Repository identity fields were missing.", { snapshotEvaluable: false, exitCode: 2 }));
  const defaultBranch = readString(object, "default_branch");
  return { id, name, full_name: fullName, ...(defaultBranch === undefined ? {} : { default_branch: defaultBranch }) };
}

function parseUser(value: unknown): RawUser | undefined {
  if (!isRecord(value)) return undefined;
  const id = readPositiveInt(value, "id");
  const login = readString(value, "login");
  if (id === undefined || login === undefined) return undefined;
  const type = readString(value, "type");
  return { id, login, ...(type === undefined ? {} : { type }) };
}

function parseRepositoryRef(value: unknown, label: string): { id: number; full_name?: string; name?: string } {
  const object = requireObject(value, label);
  const id = readPositiveInt(object, "id");
  if (id === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `${label} repository ID was missing.`, { snapshotEvaluable: false, exitCode: 2 }));
  const fullName = readString(object, "full_name");
  const name = readString(object, "name");
  return { id, ...(fullName === undefined ? {} : { full_name: fullName }), ...(name === undefined ? {} : { name }) };
}

function parsePullRequest(value: unknown): RawPullRequest {
  const object = requireObject(value, "pull request");
  const id = readPositiveInt(object, "id");
  const number = readPositiveInt(object, "number");
  const base = requireObject(object.base, "pull request base");
  const head = requireObject(object.head, "pull request head");
  const baseRef = readString(base, "ref");
  const baseSha = readString(base, "sha");
  const headRef = readString(head, "ref");
  const headSha = readString(head, "sha");
  if (id === undefined || number === undefined || baseRef === undefined || baseSha === undefined || headRef === undefined || headSha === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Pull-request target identity fields were missing.", { snapshotEvaluable: false, exitCode: 2 }));
  const safeBaseRef = safeAllowlistedString(baseRef, "pull request base ref", 500);
  const safeBaseSha = safeAllowlistedString(baseSha, "pull request base SHA", 200);
  const safeHeadRef = safeAllowlistedString(headRef, "pull request head ref", 500);
  const safeHeadSha = safeAllowlistedString(headSha, "pull request head SHA", 200);
  const merge = object.merge_commit_sha;
  if (merge !== undefined && merge !== null && typeof merge !== "string") throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Pull-request merge_commit_sha was malformed.", { snapshotEvaluable: false, exitCode: 2 }));
  const author = parseUser(object.user);
  const safeMerge = merge === undefined || merge === null ? undefined : safeAllowlistedString(merge, "pull request merge SHA", 200);
  return { id, number, base: { ref: safeBaseRef, sha: safeBaseSha, repo: parseRepositoryRef(base.repo, "base") }, head: { ref: safeHeadRef, sha: safeHeadSha, repo: parseRepositoryRef(head.repo, "head") }, ...(safeMerge === undefined ? {} : { merge_commit_sha: safeMerge }), ...(author === undefined ? {} : { user: author }) };
}

function normalizedName(value: string, label: string): string {
  const normalized = safeAllowlistedString(value.trim(), label, 200);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(normalized)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_IDENTITY_MISMATCH", `${label} must be a GitHub-compatible repository segment.`, { snapshotEvaluable: false, exitCode: 2 }));
  return normalized;
}

export async function resolvePullRequestIdentity(
  client: GitHubClient,
  request: GitHubSnapshotRequest,
  phase: RequestPhase = "collection",
): Promise<SnapshotIdentity> {
  if (request.eventKind === "merge_group" || request.targetKind === "merge_group" || request.pullNumber === undefined) {
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "The current scalar EvaluationInput cannot represent authenticated merge-group membership.", {
      remediation: "Use a pull_request head/merge target, or add a versioned merge-group identity contract before enabling merge-queue evaluation.",
      snapshotEvaluable: false,
      exitCode: 2,
    }));
  }
  const owner = normalizedName(request.owner, "repository owner");
  const name = normalizedName(request.name, "repository name");
  if (!Number.isInteger(request.pullNumber) || request.pullNumber < 1) throw new GitHubAdapterError(makeDiagnostic("GITHUB_IDENTITY_MISMATCH", "Pull-request number must be a positive integer.", { snapshotEvaluable: false, exitCode: 2 }));
  const repoResponse = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` }, "repository identity", phase);
  if (repoResponse.status === 403 || repoResponse.status === 404) throw new GitHubAdapterError(makeDiagnostic(repoResponse.status === 403 ? "GITHUB_PERMISSION_INSUFFICIENT" : "GITHUB_RESOURCE_NOT_VISIBLE", "Repository identity is not visible to the configured credential.", { permissionState: repoResponse.status === 403 ? "insufficient" : "unknown", snapshotEvaluable: false, exitCode: 2 }));
  const repository = parseRepository(repoResponse.body);
  const pullResponse = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${request.pullNumber}` }, "pull-request identity", phase);
  if (pullResponse.status === 403 || pullResponse.status === 404) throw new GitHubAdapterError(makeDiagnostic(pullResponse.status === 403 ? "GITHUB_PERMISSION_INSUFFICIENT" : "GITHUB_RESOURCE_NOT_VISIBLE", "Pull-request identity is not visible to the configured credential.", { permissionState: pullResponse.status === 403 ? "insufficient" : "unknown", snapshotEvaluable: false, exitCode: 2 }));
  const pullRequest = parsePullRequest(pullResponse.body);
  if (pullRequest.number !== request.pullNumber || repository.name.toLowerCase() !== name.toLowerCase() || repository.full_name.toLowerCase() !== `${owner}/${name}`.toLowerCase()) {
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_IDENTITY_MISMATCH", "GitHub returned a repository or pull-request identity different from the trusted request.", { snapshotEvaluable: false, exitCode: 2 }));
  }
  if (pullRequest.base.repo.id !== repository.id || (pullRequest.base.repo.full_name !== undefined && pullRequest.base.repo.full_name.toLowerCase() !== repository.full_name.toLowerCase())) throw new GitHubAdapterError(makeDiagnostic("GITHUB_IDENTITY_MISMATCH", "The pull request base repository identity did not match the repository identity read from the API.", { snapshotEvaluable: false, exitCode: 2 }));
  const mergeSha = typeof pullRequest.merge_commit_sha === "string" ? pullRequest.merge_commit_sha : undefined;
  const targetKind: "head" | "merge" = request.targetKind === "merge" ? "merge" : "head";
  if (targetKind === "merge" && mergeSha === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "The pull request has no immutable merge SHA for the requested merge target.", { remediation: "Evaluate the head target or wait for GitHub to provide a merge commit SHA.", snapshotEvaluable: false, exitCode: 2 }));
  const testedSha = targetKind === "merge" ? mergeSha! : pullRequest.head.sha;
  const immutable = {
    apiOrigin: client.origin,
    apiVersion: client.apiVersion,
    repositoryId: repository.id,
    owner,
    name,
    pullRequestId: pullRequest.id,
    pullRequestNumber: pullRequest.number,
    eventKind: "pull_request" as const,
    baseRef: pullRequest.base.ref,
    baseSha: pullRequest.base.sha,
    headRepositoryId: pullRequest.head.repo.id,
    headRef: pullRequest.head.ref,
    headSha: pullRequest.head.sha,
    ...(mergeSha === undefined ? {} : { mergeSha }),
    testedSha,
    targetKind,
    ...(pullRequest.user?.id === undefined ? {} : { authorId: pullRequest.user.id }),
  };
  return { ...immutable, retrievalStartedAt: new Date(client.clock.now()).toISOString(), provenanceDigest: sha256Digest(immutable) };
}

export function sameSnapshotIdentity(left: SnapshotIdentity, right: SnapshotIdentity): boolean {
  return left.provenanceDigest === right.provenanceDigest && left.repositoryId === right.repositoryId && left.pullRequestId === right.pullRequestId && left.pullRequestNumber === right.pullRequestNumber && left.owner === right.owner && left.name === right.name && left.eventKind === right.eventKind && left.baseRef === right.baseRef && left.baseSha === right.baseSha && left.headRepositoryId === right.headRepositoryId && left.headRef === right.headRef && left.headSha === right.headSha && left.mergeSha === right.mergeSha && left.testedSha === right.testedSha && left.targetKind === right.targetKind;
}
