import { sha256Digest, sha256Text } from "../canonical-json.js";
import { assertEvaluationInput } from "../contract/validation.js";
import { normalizedObservationDigest } from "../evidence/digests.js";
import type { EvaluationInput, EvaluationObservations, ObservationMeta, PolicySource, ReviewabilitySnapshot } from "../types.js";
import { GitHubClient } from "./client.js";
import { capabilityReport, type GitHubCapabilityReport } from "./capabilities.js";
import { collectChangedPaths, type ChangedPathsResult } from "./changed-paths.js";
import { collectCodeowners, type CodeownersResult } from "./codeowners.js";
import { collectLinkedIssues, type LinkedIssuesResult } from "./linked-issues.js";
import { collectChecks, type ChecksResult } from "./checks.js";
import { collectReviews, type ReviewsResult } from "./reviews.js";
import { qualifyReviews } from "./permissions.js";
import { collectRulesets, type RulesetsResult } from "./rulesets.js";
import { collectBranchProtection, type BranchProtectionResult } from "./branch-protection.js";
import { GitHubAdapterError, diagnosticFrom, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { resolvePullRequestIdentity, type GitHubSnapshotRequest, type SnapshotIdentity } from "./identity.js";
import { assertObservationStable, assertTargetStable } from "./toctou.js";

export interface SnapshotBuilderOptions {
  allowConfirmedAbsence?: boolean;
}

export interface RequestSnapshotBuildResult {
  kind: "built";
  input: EvaluationInput;
  identity: SnapshotIdentity;
  diagnostics: GitHubDiagnostic[];
  metrics: ReturnType<GitHubClient["budget"]["snapshot"]>;
  capability: GitHubCapabilityReport;
}

export interface RejectedSnapshotBuildResult {
  kind: "rejected";
  diagnostic: GitHubDiagnostic;
  metrics: ReturnType<GitHubClient["budget"]["snapshot"]>;
  capability?: GitHubCapabilityReport;
}

export type SnapshotBuildResult = RequestSnapshotBuildResult | RejectedSnapshotBuildResult;

interface CollectedSnapshot {
  policy: Awaited<ReturnType<typeof import("./contents.js").fetchTrustedBasePolicy>>;
  changed: ChangedPathsResult;
  linked: LinkedIssuesResult;
  checks: ChecksResult;
  reviews: ReviewsResult;
  codeowners: CodeownersResult;
  rulesets: RulesetsResult;
  branchProtection: BranchProtectionResult;
  reviewability: ReviewabilitySnapshot;
}

function unique(values: readonly string[]): string[] { return [...new Set(values)].sort(); }

function reviewability(changed: ChangedPathsResult): ReviewabilitySnapshot {
  const domains = unique(changed.paths.map((path) => path.split("/")[0] ?? "root"));
  const generatedFileCount = changed.files.filter((file) => /(^|\/)(generated|dist|vendor)(\/|$)|\.(lock|snap)$/.test(file.path)).length;
  return { fileCount: changed.files.length, ownershipDomains: domains, generatedFileCount, boundaryCount: domains.length };
}

function metaWithDigest(meta: ObservationMeta, digest: string, complete: boolean): ObservationMeta {
  const { normalizedDigest: _normalizedDigest, ...rest } = meta;
  return complete ? { ...rest, normalizedDigest: digest } : rest;
}

function sourceMeta(source: PolicySource, meta: ObservationMeta): ObservationMeta {
  return { ...meta, source: { kind: meta.source.kind, identity: source.identity } };
}

function policySources(collected: CollectedSnapshot): PolicySource[] {
  return [collected.policy.source, collected.codeowners.source, collected.rulesets.source, collected.branchProtection.source].filter((source): source is PolicySource => source !== undefined);
}

function buildInput(identity: SnapshotIdentity, collected: CollectedSnapshot): EvaluationInput {
  const sources = policySources(collected);
  const policyDigest = collected.policy.rawBytesDigest ?? collected.policy.artifact?.digest ?? sha256Text("");
  const inputBase: Omit<EvaluationInput, "observations"> = {
    schemaVersion: "0.1",
    repository: { owner: identity.owner, name: identity.name, pullRequest: identity.pullRequestNumber },
    revisions: { baseSha: identity.baseSha, headSha: identity.headSha, ...(identity.mergeSha === undefined ? {} : { mergeSha: identity.mergeSha }), testedSha: identity.testedSha, targetKind: identity.targetKind },
    policy: collected.policy.artifact?.policy ?? null,
    policySources: sources,
    policyDigest,
    changedPaths: collected.changed.paths,
    linkedIssues: collected.linked.issues,
    reviews: collected.reviews.reviews,
    checks: collected.checks.checks,
    ownershipRequirements: collected.codeowners.requirements,
    reviewability: collected.reviewability,
  };
  const observationsWithoutDigests: EvaluationObservations = {
    policySources: sources.map((source) => sourceMeta(source, source.kind === "patchgate" ? collected.policy.meta : source.kind === "codeowners" ? collected.codeowners.meta : source.kind === "ruleset" ? collected.rulesets.meta : collected.branchProtection.meta)),
    changedPaths: collected.changed.meta,
    linkedIssues: collected.linked.meta,
    reviews: collected.reviews.meta,
    checks: collected.checks.meta,
    ownership: { ...collected.codeowners.meta, complete: collected.codeowners.meta.complete && collected.changed.meta.complete, permissionState: collected.codeowners.meta.complete && collected.changed.meta.complete ? collected.codeowners.meta.permissionState : "unknown" },
    reviewability: { source: { kind: "github", identity: "reviewability" }, revision: identity.testedSha, retrievedAt: collected.changed.meta.retrievedAt, complete: collected.changed.meta.complete, permissionState: collected.changed.meta.complete ? "sufficient" : "unknown" },
  };
  const preliminary = { ...inputBase, observations: observationsWithoutDigests };
  const observations: EvaluationObservations = {
    policySources: observationsWithoutDigests.policySources.map((meta) => metaWithDigest(meta, normalizedObservationDigest(preliminary, "policySources"), meta.complete)),
    changedPaths: metaWithDigest(observationsWithoutDigests.changedPaths, normalizedObservationDigest(preliminary, "changedPaths"), observationsWithoutDigests.changedPaths.complete),
    linkedIssues: metaWithDigest(observationsWithoutDigests.linkedIssues, normalizedObservationDigest(preliminary, "linkedIssues"), observationsWithoutDigests.linkedIssues.complete),
    reviews: metaWithDigest(observationsWithoutDigests.reviews, normalizedObservationDigest(preliminary, "reviews"), observationsWithoutDigests.reviews.complete),
    checks: metaWithDigest(observationsWithoutDigests.checks, normalizedObservationDigest(preliminary, "checks"), observationsWithoutDigests.checks.complete),
    ownership: metaWithDigest(observationsWithoutDigests.ownership, normalizedObservationDigest(preliminary, "ownership"), observationsWithoutDigests.ownership.complete),
    reviewability: metaWithDigest(observationsWithoutDigests.reviewability, normalizedObservationDigest(preliminary, "reviewability"), observationsWithoutDigests.reviewability.complete),
  };
  return { ...inputBase, observations };
}

async function collectAll(client: GitHubClient, identity: SnapshotIdentity, options: SnapshotBuilderOptions, phase: "collection" | "finalization"): Promise<CollectedSnapshot> {
  const allowConfirmedAbsence = options.allowConfirmedAbsence ?? false;
  const policy = await import("./contents.js").then(({ fetchTrustedBasePolicy }) => fetchTrustedBasePolicy(client, identity.owner, identity.name, identity.baseSha, allowConfirmedAbsence, phase));
  const changed = await collectChangedPaths(client, identity.owner, identity.name, identity.pullRequestNumber, identity.headSha, phase);
  const codeowners = await collectCodeowners(client, identity.owner, identity.name, identity.baseSha, changed.paths, allowConfirmedAbsence, phase);
  const linked = await collectLinkedIssues(client, identity.owner, identity.name, identity.pullRequestNumber, identity.headSha, phase);
  const checks = await collectChecks(client, identity.owner, identity.name, identity.testedSha, phase);
  const rawReviews = await collectReviews(client, identity.owner, identity.name, identity.pullRequestNumber, identity.testedSha, identity.authorId, phase);
  const principals = unique([...(identity.owner.length > 0 ? [] : []), ...(codeowners.requirements.flatMap((requirement) => requirement.owners)), ...(policy.artifact?.policy.sensitivePaths?.flatMap((rule) => rule.requiredReviewers) ?? [])]);
  const qualified = await qualifyReviews(client, rawReviews.reviews, identity.owner, identity.name, principals, phase);
  const reviews: ReviewsResult = { ...rawReviews, reviews: qualified.reviews, collaboratorMeta: qualified.collaboratorMeta, teamMeta: qualified.teamMeta, diagnostics: [...rawReviews.diagnostics, ...qualified.diagnostics] };
  const rulesets = await collectRulesets(client, identity.owner, identity.name, identity.baseRef, identity.baseSha, allowConfirmedAbsence, phase);
  const branchProtection = await collectBranchProtection(client, identity.owner, identity.name, identity.baseRef, identity.baseSha, allowConfirmedAbsence, phase);
  return { policy, changed, codeowners, linked, checks, reviews, rulesets, branchProtection, reviewability: reviewability(changed) };
}

function allDiagnostics(collected: CollectedSnapshot): GitHubDiagnostic[] {
  return [...collected.policy.diagnostics, ...collected.changed.diagnostics, ...collected.codeowners.diagnostics, ...collected.linked.diagnostics, ...collected.checks.diagnostics, ...collected.reviews.diagnostics, ...collected.rulesets.diagnostics, ...collected.branchProtection.diagnostics];
}

function inputGroupDigests(input: EvaluationInput): Record<string, string> {
  return { policySources: normalizedObservationDigest(input, "policySources"), changedPaths: normalizedObservationDigest(input, "changedPaths"), linkedIssues: normalizedObservationDigest(input, "linkedIssues"), reviews: normalizedObservationDigest(input, "reviews"), checks: normalizedObservationDigest(input, "checks"), ownership: normalizedObservationDigest(input, "ownership"), reviewability: normalizedObservationDigest(input, "reviewability") };
}

function fatalNativeDiagnostic(collected: CollectedSnapshot): GitHubDiagnostic | undefined {
  if (!collected.rulesets.meta.complete || !collected.branchProtection.meta.complete) return makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "Native ruleset or branch-protection visibility is incomplete; the current evaluator cannot safely treat unknown native controls as absent.", { remediation: "Grant the documented native-control read permissions and rerun, or implement a versioned native requirement contract.", snapshotEvaluable: false, exitCode: 2 });
  if (collected.rulesets.decisionBearing || collected.branchProtection.decisionBearing) return makeDiagnostic("GITHUB_API_UNSUPPORTED", "An applicable decision-bearing native control cannot be represented by the current EvaluationInput/evaluator contract.", { remediation: "Use the explicit patchgate.yml rule path or extend the versioned evaluator contract before evaluating this repository.", snapshotEvaluable: false, exitCode: 2 });
  return undefined;
}

function capabilityObservations(collected: CollectedSnapshot): Array<Parameters<typeof capabilityReport>[4][number]> {
  return [
    { endpoint: "contents/patchgate.yml", capability: "contents:read", state: collected.policy.meta.permissionState, affectedRequirements: ["policy.base_revision"], remediation: "Grant Contents: read or keep policy authority ambiguous." },
    { endpoint: "pulls/files", capability: "pull requests:read", state: collected.changed.meta.permissionState, affectedRequirements: ["changed_paths", "ownership", "human_handoff"], remediation: "Grant Pull requests: read." },
    { endpoint: "graphql:closingIssuesReferences", capability: "pull requests:read", state: collected.linked.meta.permissionState, affectedRequirements: ["issue.linkage"], remediation: "Grant the documented GraphQL/pull-request read capability; body-only issue text is not a substitute." },
    { endpoint: "commits/{testedSha}/check-runs", capability: "checks:read", state: collected.checks.checkRunsMeta.permissionState, affectedRequirements: ["required_check"], remediation: "Grant Checks: read for the exact tested SHA." },
    { endpoint: "actions/runs?head_sha", capability: "actions:read", state: collected.checks.workflowMeta.permissionState, affectedRequirements: ["required_check"], remediation: "Grant Actions: read so workflow ID, run attempt, event and suite relation can be verified." },
    { endpoint: "pulls/reviews", capability: "pull requests:read", state: collected.reviews.meta.permissionState, affectedRequirements: ["ownership", "human_handoff"], remediation: "Grant Pull requests: read and collaborator/team visibility." },
    { endpoint: "collaborators/{login}/permission", capability: "repository collaborator visibility", state: collected.reviews.collaboratorMeta.permissionState, affectedRequirements: ["ownership", "human_handoff"], remediation: "Grant collaborator permission visibility; an unverified reviewer is not qualified." },
    { endpoint: "teams/{slug}+memberships/{login}", capability: "organization members:read", state: collected.reviews.teamMeta.permissionState, affectedRequirements: ["ownership", "human_handoff"], remediation: "Grant team identity and membership visibility, or keep team-backed qualification unknown." },
    { endpoint: "contents/CODEOWNERS@base", capability: "contents:read", state: collected.codeowners.meta.permissionState, affectedRequirements: ["ownership"], remediation: "Grant Contents: read for the CODEOWNERS search order at base SHA." },
    { endpoint: "rulesets+branch-protection", capability: "metadata/administration:read", state: collected.rulesets.meta.complete && collected.branchProtection.meta.complete ? "sufficient" : "unknown", affectedRequirements: ["native controls"], remediation: "Grant native-control read permissions; inaccessible controls are not absent." },
  ];
}

export async function buildGitHubSnapshot(request: GitHubSnapshotRequest, client: GitHubClient, options: SnapshotBuilderOptions = {}): Promise<SnapshotBuildResult> {
  let identity: SnapshotIdentity | undefined;
  try {
    if (options.allowConfirmedAbsence === true && client.authKind !== "mock") throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "Confirmed resource absence is available only for recorded/mock transports; live 404 responses remain unknown.", { remediation: "Remove --allow-confirmed-absence from live retrieval or use an explicit authenticated absence contract.", snapshotEvaluable: false, exitCode: 2 }));
    identity = await resolvePullRequestIdentity(client, request);
    const collected = await collectAll(client, identity, options, "collection");
    const nativeFailure = fatalNativeDiagnostic(collected);
    if (nativeFailure !== undefined) return { kind: "rejected", diagnostic: nativeFailure, metrics: client.budget.snapshot(), capability: capabilityReport(identity, client.authKind, client.origin, client.apiVersion, capabilityObservations(collected), allDiagnostics(collected)) };
    const firstInput = buildInput(identity, collected);
    assertEvaluationInput(firstInput);
    const initialDigests = inputGroupDigests(firstInput);
    const rereadIdentity = await resolvePullRequestIdentity(client, request, "finalization");
    assertTargetStable(identity, rereadIdentity);
    const reread = await collectAll(client, rereadIdentity, options, "finalization");
    const rereadNativeFailure = fatalNativeDiagnostic(reread);
    if (rereadNativeFailure !== undefined) return { kind: "rejected", diagnostic: rereadNativeFailure, metrics: client.budget.snapshot(), capability: capabilityReport(identity, client.authKind, client.origin, client.apiVersion, capabilityObservations(reread), allDiagnostics(reread)) };
    const rereadInput = buildInput(rereadIdentity, reread);
    assertEvaluationInput(rereadInput);
    const rereadDigests = inputGroupDigests(rereadInput);
    for (const group of Object.keys(initialDigests)) assertObservationStable(group, initialDigests[group]!, rereadDigests[group]!);
    if (collected.policy.rawDigest !== reread.policy.rawDigest) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "The trusted base policy changed during finalization.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    if (collected.rulesets.source?.digest !== reread.rulesets.source?.digest || collected.branchProtection.source?.digest !== reread.branchProtection.source?.digest) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "Native control provenance changed during finalization.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    const diagnostics = allDiagnostics(collected);
    const capability = capabilityReport(identity, client.authKind, client.origin, client.apiVersion, capabilityObservations(collected), diagnostics);
    return { kind: "built", input: firstInput, identity, diagnostics, metrics: client.budget.snapshot(), capability };
  } catch (error) {
    const diagnostic = diagnosticFrom(error, "GITHUB_PROVENANCE_AMBIGUOUS");
    const observations = identity === undefined ? [{ endpoint: "repos/{owner}/{name}", capability: "repository metadata:read", state: diagnostic.permissionState, affectedRequirements: ["repository.identity"], remediation: "Grant repository metadata read and pull-request visibility to the authenticated read-only credential." }] : [];
    return { kind: "rejected", diagnostic, metrics: client.budget.snapshot(), capability: capabilityReport(identity, client.authKind, client.origin, client.apiVersion, observations, [diagnostic]) };
  }
}
