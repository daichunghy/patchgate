import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { determineFinalStatus } from "./status-precedence.js";
import { MAX_COLLECTION_ITEMS, MAX_NESTED_ENTRIES, MAX_STRING_LENGTH } from "./bounds.js";
import { canonicalJson, sha256Digest } from "../canonical-json.js";
import { receiptDigest } from "../evidence/digests.js";
import { evidenceReference } from "../evidence/source-verifier.js";
import type { ContributionReceipt, EvaluationInput, EvaluationObservations, ObservationMeta, PatchgatePolicy, ReceiptEvidence } from "../types.js";
import policySchema from "../../schemas/patchgate-policy.schema.json" with { type: "json" };
import inputSchema from "../../schemas/evaluation-input.schema.json" with { type: "json" };
import receiptSchema from "../../schemas/contribution-receipt.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(policySchema as object);
ajv.addSchema(inputSchema as object);
ajv.addSchema(receiptSchema as object);
const policyValidator = ajv.getSchema("https://patchgate.dev/schemas/patchgate-policy/0.1") as ValidateFunction<unknown>;
const inputValidator = ajv.getSchema("https://patchgate.dev/schemas/evaluation-input/0.1") as ValidateFunction<unknown>;
const receiptValidator = ajv.getSchema("https://patchgate.dev/schemas/contribution-receipt/0.1") as ValidateFunction<unknown>;

export class ContractValidationError extends Error {
  readonly issues: readonly ErrorObject[];
  readonly diagnosticId: string;

  constructor(message: string, issues: readonly ErrorObject[] = [], diagnosticId = "CONTRACT_INVALID") {
    super(message);
    this.name = "ContractValidationError";
    this.issues = issues;
    this.diagnosticId = diagnosticId;
  }
}

function fail(message: string, diagnosticId = "CONTRACT_INVALID"): never {
  throw new ContractValidationError(message, [], diagnosticId);
}

function validate(value: unknown, validator: ValidateFunction<unknown>, label: string): void {
  if (validator(value)) return;
  const details = (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ");
  throw new ContractValidationError(`${label} is invalid${details.length > 0 ? `: ${details}` : ""}`, validator.errors ?? [], "SCHEMA_INVALID");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: string, label: string): void {
  if (value.trim().length === 0) fail(`${label} must contain a non-whitespace character`);
  if (value.length > MAX_STRING_LENGTH) fail(`${label} exceeds the parser safety limit`, "RESOURCE_LIMIT_EXCEEDED");
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) fail(`${label} must not contain duplicates`, "DUPLICATE_IDENTITY");
}

function assertCollectionSize(values: readonly unknown[], label: string): void {
  if (values.length > MAX_COLLECTION_ITEMS) fail(`${label} exceeds the maximum accepted collection size`, "RESOURCE_LIMIT_EXCEEDED");
}

function assertNestedEntryCount(values: readonly unknown[], label: string): void {
  if (values.length > MAX_NESTED_ENTRIES) fail(`${label} exceeds the maximum nested-entry limit`, "RESOURCE_LIMIT_EXCEEDED");
}

function assertPolicySemantics(policy: PatchgatePolicy): void {
  assertNestedEntryCount(policy.requiredChecks ?? [], "policy required checks");
  assertNestedEntryCount(policy.sensitivePaths ?? [], "policy sensitive paths");
  assertNestedEntryCount(policy.policyChanges?.paths ?? [], "policy change paths");
  const ids = [...(policy.requiredChecks ?? []).map((rule) => rule.id), ...(policy.sensitivePaths ?? []).map((rule) => rule.id)];
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate !== undefined) fail(`policy rule id must be unique: ${duplicate}`, "DUPLICATE_RULE_ID");
  for (const rule of policy.requiredChecks ?? []) {
    assertNestedEntryCount(rule.acceptableConclusions, `required check ${rule.id} acceptable conclusions`);
    assertString(rule.id, "required check id");
    assertString(rule.name, `required check ${rule.id} name`);
    rule.acceptableConclusions.forEach((conclusion) => assertString(conclusion, `required check ${rule.id} conclusion`));
    if (rule.acceptableConclusions.length === 0) fail(`required check ${rule.id} must declare at least one acceptable conclusion`);
    if (rule.expectedSource.kind === "github_app_expected" && rule.expectedSource.appId === undefined) fail(`required check ${rule.id} must identify expected immutable App identity`);
    if (rule.expectedSource.kind === "github_actions_workflow" && (rule.expectedSource.appId === undefined || (rule.expectedSource.workflowId === undefined && rule.expectedSource.workflowPath === undefined))) {
      fail(`required check ${rule.id} must identify expected workflow identity`);
    }
  }
  for (const rule of policy.sensitivePaths ?? []) {
    assertNestedEntryCount(rule.patterns, `sensitive path rule ${rule.id} patterns`);
    assertNestedEntryCount(rule.requiredReviewers, `sensitive path rule ${rule.id} reviewers`);
    assertString(rule.id, "sensitive path rule id");
    rule.patterns.forEach((pattern) => assertString(pattern, `sensitive path rule ${rule.id} pattern`));
    rule.requiredReviewers.forEach((reviewer) => assertString(reviewer, `sensitive path rule ${rule.id} reviewer`));
    if (rule.requiredCount < 1 || !Number.isInteger(rule.requiredCount)) fail(`sensitive path rule ${rule.id} requiredCount must be a positive integer`);
  }
  for (const budget of Object.values(policy.reviewability?.budgets ?? {})) {
    if (!Number.isInteger(budget) || budget < 0) fail("reviewability budgets must be non-negative integers");
  }
}

export function assertPatchgatePolicy(value: unknown): asserts value is PatchgatePolicy {
  validate(value, policyValidator, "PatchGate policy");
  assertPolicySemantics(value as PatchgatePolicy);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortCanonical<T>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => compareText(canonicalJson(left), canonicalJson(right)));
}

function sortText(values: readonly string[]): string[] {
  return [...values].sort(compareText);
}

function expectedObservationDigest(input: Pick<EvaluationInput, "policySources" | "changedPaths" | "linkedIssues" | "reviews" | "checks" | "ownershipRequirements"> & { reviewability?: EvaluationInput["reviewability"] | undefined }, group: keyof EvaluationObservations): string {
  switch (group) {
    case "policySources": return sha256Digest(sortCanonical(input.policySources));
    case "changedPaths": return sha256Digest(sortText(input.changedPaths));
    case "linkedIssues": return sha256Digest(sortCanonical(input.linkedIssues));
    case "reviews": return sha256Digest(sortCanonical(input.reviews.map((review) => ({ ...review, teams: sortText(review.teams), teamIds: [...review.teamIds].sort((a, b) => a - b) }))));
    case "checks": return sha256Digest(sortCanonical(input.checks.map(({ retrievedAt: _retrievedAt, ...check }) => check)));
    case "ownership": return sha256Digest(sortCanonical(input.ownershipRequirements.map((item) => ({ ...item, owners: sortText(item.owners) }))));
    case "reviewability": return sha256Digest(input.reviewability === undefined ? null : { ...input.reviewability, ownershipDomains: sortText(input.reviewability.ownershipDomains) });
  }
}

function validateObservationMeta(meta: ObservationMeta | ObservationMeta[], label: string, expectedDigest: string): void {
  const entries = Array.isArray(meta) ? meta : [meta];
  assertCollectionSize(entries, `${label} observation metadata`);
  for (const item of entries) {
    assertUtcTimestamp(item.retrievedAt, `${label}.retrievedAt`);
    assertString(item.source.kind, `${label}.source.kind`);
    assertString(item.source.identity, `${label}.source.identity`);
    if (item.revision !== undefined) assertString(item.revision, `${label}.revision`);
    if (item.nextCursor !== undefined) assertString(item.nextCursor, `${label}.nextCursor`);
    if (item.complete && item.permissionState !== "sufficient") fail(`${label} complete observation requires sufficient permission`, "OBSERVATION_INVARIANT");
    if (item.complete && (item.truncated === true || item.nextCursor !== undefined)) fail(`${label} complete observation cannot be truncated or paginated`, "OBSERVATION_INVARIANT");
    if (item.normalizedDigest !== undefined && item.normalizedDigest !== expectedDigest) fail(`${label} normalizedDigest does not match its normalized items`, "OBSERVATION_DIGEST_MISMATCH");
    if (item.complete && item.normalizedDigest === undefined) fail(`${label} complete observation requires normalizedDigest`, "OBSERVATION_INVARIANT");
  }
}

function assertObservationRevision(meta: ObservationMeta, expectedRevision: string, label: string): void {
  if (meta.revision !== undefined && meta.revision !== expectedRevision) fail(`${label}.revision must match ${expectedRevision}`, "OBSERVATION_INVARIANT");
}

function assertObservationContract(input: EvaluationInput): void {
  const observation = input.observations;
  if (observation.policySources.length !== input.policySources.length) fail("policy source observation metadata must correspond one-to-one with policy sources", "OBSERVATION_INVARIANT");
  for (let index = 0; index < observation.policySources.length; index += 1) {
    const meta = observation.policySources[index]!;
    const source = input.policySources[index]!;
    if (meta.source.identity !== source.identity) fail("policy source observation metadata cannot be swapped between source records", "OBSERVATION_INVARIANT");
    assertObservationRevision(meta, source.revision, `observations.policySources[${index}]`);
    validateObservationMeta(meta, `observations.policySources[${index}]`, expectedObservationDigest(input, "policySources"));
  }
  const groups: Array<[keyof EvaluationObservations, EvaluationObservations[keyof EvaluationObservations]]> = [
    ["changedPaths", observation.changedPaths], ["linkedIssues", observation.linkedIssues], ["reviews", observation.reviews], ["checks", observation.checks], ["ownership", observation.ownership], ["reviewability", observation.reviewability],
  ];
  for (const [group, meta] of groups) {
    if (Array.isArray(meta)) fail(`observations.${group} must contain one observation metadata record`, "OBSERVATION_INVARIANT");
    const expectedRevision = group === "ownership" ? input.revisions.baseSha : group === "changedPaths" || group === "linkedIssues" ? input.revisions.headSha : input.revisions.testedSha;
    assertObservationRevision(meta, expectedRevision, `observations.${group}`);
    validateObservationMeta(meta, `observations.${group}`, expectedObservationDigest(input, group));
  }
}

function assertCheckSemantics(input: EvaluationInput): void {
  const checkRunIds = new Set<number>();
  const workflowRunKeys = new Set<string>();
  for (const check of input.checks) {
    assertString(check.name, "check name");
    assertString(check.testedSha, `check ${check.name} testedSha`);
    if (check.conclusion !== undefined) assertString(check.conclusion, `check ${check.name} conclusion`);
    if (check.status === "completed" && check.conclusion === undefined) fail(`completed check ${check.name} must record a conclusion`, "CHECK_CONCLUSION_MISSING");
    assertUtcTimestamp(check.retrievedAt, "check retrievedAt");
    if (check.checkRunId !== undefined) {
      if (checkRunIds.has(check.checkRunId)) fail(`duplicate checkRunId ${check.checkRunId}`, "DUPLICATE_EVIDENCE_ID");
      checkRunIds.add(check.checkRunId);
    }
    if (check.workflowRunId !== undefined && check.workflowRunAttempt !== undefined) {
      const key = `${check.workflowRunId}:${check.workflowRunAttempt}`;
      if (workflowRunKeys.has(key)) fail(`duplicate workflow run identity ${key}`, "DUPLICATE_EVIDENCE_ID");
      workflowRunKeys.add(key);
    }
    if (check.sourceStrength === "github_app_expected" && (check.appId === undefined || check.checkRunId === undefined)) fail(`GitHub App check ${check.name} must record appId and checkRunId`, "CHECK_IDENTITY_MISSING");
    if (check.sourceStrength === "github_actions_workflow" && (check.appId === undefined || check.workflowRunId === undefined || check.workflowRunAttempt === undefined || check.event === undefined || (check.workflowId === undefined && check.workflowPath === undefined))) {
      fail(`GitHub Actions check ${check.name} must record appId, workflow identity, run identity, attempt, and event`, "CHECK_IDENTITY_MISSING");
    }
    if (input.revisions.targetKind === "merge_group" && check.event !== undefined && check.event !== "merge_group") fail(`check ${check.name} event is incompatible with merge_group target`, "TARGET_INVARIANT");
  }
}

function assertReviewSemantics(input: EvaluationInput): void {
  const reviewIds = new Set<number>();
  const actorIds = new Set<number>();
  for (const review of input.reviews) {
    if (reviewIds.has(review.reviewId)) fail(`duplicate reviewId ${review.reviewId}`, "DUPLICATE_EVIDENCE_ID");
    reviewIds.add(review.reviewId);
    assertString(review.login, "reviewer login");
    assertString(review.commitId, `review ${review.login} commitId`);
    if (actorIds.has(review.actorId) && review.active && review.state === "APPROVED") {
      // Multiple historical events are allowed, but the evaluator counts an actor once.
    }
    actorIds.add(review.actorId);
    assertUniqueStrings(review.teams, `review ${review.login} teams`);
    if (new Set(review.teamIds).size !== review.teamIds.length) fail(`review ${review.login} teamIds must be unique`, "DUPLICATE_IDENTITY");
    assertString(review.qualification.source.kind, `review ${review.login} qualification source kind`);
    assertString(review.qualification.source.identity, `review ${review.login} qualification source identity`);
    if (review.qualification.revision !== undefined) assertString(review.qualification.revision, `review ${review.login} qualification revision`);
    if (review.qualification.revision !== undefined && review.qualification.revision !== input.revisions.testedSha) fail(`review ${review.login} qualification revision must match testedSha`, "OBSERVATION_INVARIANT");
    const bindings = review.qualification.principalBindings ?? [];
    const bindingKeys = bindings.map((binding) => `${binding.kind}\u0000${binding.configuredPrincipal}\u0000${binding.immutableId}`);
    assertUniqueStrings(bindingKeys, `review ${review.login} qualification principals`);
    for (const binding of bindings) {
      assertString(binding.configuredPrincipal, `review ${review.login} configured principal`);
      if (!Number.isInteger(binding.immutableId) || binding.immutableId < 1) fail(`review ${review.login} qualification principal must have an immutable positive ID`, "OBSERVATION_INVARIANT");
    }
  }
}

function assertInputVersion(value: unknown): void {
  if (!isRecord(value) || value.schemaVersion === undefined) fail("evaluation input must declare schemaVersion", "INPUT_VERSION_REQUIRED");
  if (value.schemaVersion !== "0.1") fail(`unsupported evaluation input schemaVersion: ${String(value.schemaVersion)}`, "INPUT_VERSION_UNSUPPORTED");
}

export function assertEvaluationInput(value: unknown): asserts value is EvaluationInput {
  assertInputVersion(value);
  validate(value, inputValidator, "evaluation input");
  const input = value as EvaluationInput;
  if (input.policy !== null) assertPatchgatePolicy(input.policy);
  assertString(input.repository.owner, "repository owner");
  assertString(input.repository.name, "repository name");
  assertString(input.revisions.baseSha, "baseSha");
  assertString(input.revisions.headSha, "headSha");
  assertString(input.revisions.testedSha, "testedSha");
  if (input.revisions.targetKind === "head" && input.revisions.testedSha !== input.revisions.headSha) fail("head evaluation testedSha must equal headSha", "TARGET_INVARIANT");
  if (input.revisions.targetKind === "merge" && (input.revisions.mergeSha === undefined || input.revisions.testedSha !== input.revisions.mergeSha)) fail("merge evaluation testedSha must equal the declared mergeSha", "TARGET_INVARIANT");
  if (input.revisions.targetKind === "merge_group" && (input.revisions.mergeGroupSha === undefined || input.revisions.testedSha !== input.revisions.mergeGroupSha)) fail("merge-group evaluation testedSha must equal the declared mergeGroupSha", "TARGET_INVARIANT");
  assertCollectionSize(input.policySources, "policy sources");
  assertCollectionSize(input.changedPaths, "changed paths");
  assertCollectionSize(input.linkedIssues, "linked issues");
  assertCollectionSize(input.reviews, "reviews");
  assertCollectionSize(input.checks, "checks");
  assertCollectionSize(input.ownershipRequirements, "ownership requirements");
  const sourceKeys = input.policySources.map((source) => `${source.kind}\u0000${source.identity}`);
  assertUniqueStrings(sourceKeys, "policy source identities");
  for (const source of input.policySources) {
    assertString(source.identity, "policy source identity");
    assertString(source.revision, `policy source ${source.identity} revision`);
    if (source.revision !== input.revisions.baseSha) fail(`policy source ${source.identity} must be bound to baseSha`, "POLICY_SOURCE_REVISION_MISMATCH");
  }
  assertUniqueStrings(input.changedPaths, "changed paths");
  input.changedPaths.forEach((path) => assertString(path, "changed path"));
  const linkedIssueKeys = input.linkedIssues.map((issue) => `${issue.repository.toLowerCase()}#${issue.number}`);
  assertUniqueStrings(linkedIssueKeys, "linked issues");
  const linkedIssueImmutableKeys = input.linkedIssues.map((issue) => `${issue.repositoryId}\u0000${issue.issueId}`);
  assertUniqueStrings(linkedIssueImmutableKeys, "linked issue immutable identities");
  for (const issue of input.linkedIssues) {
    assertString(issue.repositoryId, "linked issue repositoryId");
    assertString(issue.issueId, "linked issue issueId");
  }
  const ownershipIds = input.ownershipRequirements.map((requirement) => requirement.id);
  assertUniqueStrings(ownershipIds, "ownership requirement ids");
  for (const requirement of input.ownershipRequirements) {
    assertString(requirement.id, "ownership requirement id");
    assertUniqueStrings(requirement.owners, `ownership requirement ${requirement.id} owners`);
    requirement.owners.forEach((owner) => assertString(owner, `ownership requirement ${requirement.id} owner`));
    if (requirement.requiredCount < 1 || !Number.isInteger(requirement.requiredCount)) fail(`ownership requirement ${requirement.id} requiredCount must be a positive integer`);
  }
  assertCheckSemantics(input);
  assertReviewSemantics(input);
  if (input.reviewability !== undefined) assertUniqueStrings(input.reviewability.ownershipDomains, "reviewability ownership domains");
  assertObservationContract(input);
}

function refSet(evidence: ReceiptEvidence): Set<string> {
  const refs = new Set<string>();
  for (const group of ["changedPaths", "linkedIssues", "reviews", "checks", "ownership", "reviewability"]) refs.add(`observation:${group}`);
  for (const check of evidence.checks) {
    const reference = evidenceReference(check);
    if (reference.length > 0) refs.add(reference);
  }
  for (const issue of evidence.linkedIssues) if (issue.linked) refs.add(`issue:${issue.repository}#${issue.number}:${issue.issueId}`);
  for (const review of evidence.reviews) refs.add(`review:${review.reviewId}:actor:${review.actorId}:${review.commitId}`);
  return refs;
}

function reviewMatchesQualifiedPrincipal(review: ContributionReceipt["evidence"]["reviews"][number], owners: readonly string[]): boolean {
  if (owners.length === 0) return true;
  const bindings = review.qualification.principalBindings ?? [];
  return owners.some((owner) => bindings.some((binding) => binding.configuredPrincipal === owner && binding.membershipState === "active" && (binding.kind === "user" ? owner === review.login || owner === `@${review.login}` : review.teams.includes(owner) && review.teamIds.includes(binding.immutableId))));
}

function assertReceiptEvidenceIntegrity(receipt: ContributionReceipt): void {
  const refs = refSet(receipt.evidence);
  const policySourceRefs = new Set(receipt.policySources.map((source) => `policy-source:${source.identity}`));
  for (const requirement of receipt.requirements) {
    for (const reference of requirement.evidenceRefs) {
      if (!refs.has(reference) && !policySourceRefs.has(reference)) fail(`requirement ${requirement.id} references missing evidence ${reference}`, "RECEIPT_REFERENCE_MISSING");
    }
    if (requirement.result === "passed" && ["issue_linkage", "required_check", "ownership", "human_handoff"].includes(requirement.ruleClass) && requirement.evidenceRefs.length === 0) fail(`passed requirement ${requirement.id} must reference selected evidence`, "RECEIPT_REFERENCE_MISSING");
    if (requirement.result === "passed" && requirement.ruleClass === "issue_linkage") {
      const linkedRefs = requirement.evidenceRefs.filter((reference) => reference.startsWith("issue:"));
      if (linkedRefs.length === 0 || linkedRefs.some((reference) => {
        const issue = /^issue:([^#]+)#(\d+):(.+)$/.exec(reference);
        return issue === null || !receipt.evidence.linkedIssues.some((candidate) => candidate.repository === issue[1] && candidate.number === Number(issue[2]) && candidate.issueId === issue[3] && candidate.linked);
      })) fail(`passed issue requirement ${requirement.id} must reference verified linked issue evidence`, "RECEIPT_EVIDENCE_INCONSISTENT");
    }
    if (requirement.result === "passed" && (requirement.ruleClass === "ownership" || requirement.ruleClass === "human_handoff")) {
      const reviewRefs = requirement.evidenceRefs.filter((reference) => reference.startsWith("review:"));
      const owners = requirement.ruleClass === "human_handoff"
        ? receipt.humanGates.find((gate) => gate.id === requirement.id.slice("handoff.".length))?.requiredReviewers ?? []
        : receipt.evidence.ownershipRequirements.find((item) => item.id === requirement.id.slice("ownership.".length))?.owners ?? [];
      const supportingActors = new Set<number>();
      if (reviewRefs.length === 0 || reviewRefs.some((reference) => {
        const match = /^review:(\d+):actor:(\d+):(.+)$/.exec(reference);
        if (match === null) return true;
        const review = receipt.evidence.reviews.find((candidate) => candidate.reviewId === Number(match[1]) && candidate.actorId === Number(match[2]) && candidate.commitId === match[3]);
        if (review === undefined || !review.qualified || !review.active || review.state !== "APPROVED" || review.commitId !== receipt.revisions.testedSha || review.qualification.complete !== true || review.qualification.permissionState !== "sufficient" || review.isAuthor || review.isBot || !reviewMatchesQualifiedPrincipal(review, owners)) return true;
        supportingActors.add(review.actorId);
        return false;
      })) fail(`passed ${requirement.ruleClass} requirement ${requirement.id} must reference qualified current review evidence`, "RECEIPT_EVIDENCE_INCONSISTENT");
      const configuredCount = requirement.ruleClass === "human_handoff"
        ? receipt.humanGates.find((gate) => gate.id === requirement.id.slice("handoff.".length))?.requiredCount
        : receipt.evidence.ownershipRequirements.find((item) => item.id === requirement.id.slice("ownership.".length))?.requiredCount;
      const observedRequiredCount = requirement.observed?.requiredCount;
      const observedApprovedCount = requirement.observed?.approvedCount;
      if (configuredCount === undefined || !Number.isInteger(configuredCount) || configuredCount < 1 || observedRequiredCount !== configuredCount) {
        fail(`passed ${requirement.ruleClass} requirement ${requirement.id} must preserve its configured requiredCount`, "RECEIPT_EVIDENCE_INCONSISTENT");
      }
      if (supportingActors.size < configuredCount || observedApprovedCount !== supportingActors.size) {
        fail(`passed ${requirement.ruleClass} requirement ${requirement.id} does not have enough distinct approved actors`, "RECEIPT_EVIDENCE_INCONSISTENT");
      }
    }
    if (requirement.result === "passed" && requirement.ruleClass === "required_check") {
      for (const reference of requirement.evidenceRefs) {
        const check = receipt.evidence.checks.find((candidate) => reference === evidenceReference(candidate));
        if (check === undefined || check.testedSha !== receipt.revisions.testedSha || check.status !== "completed" || check.conclusion === undefined) fail(`passed check requirement ${requirement.id} selected invalid evidence`, "RECEIPT_EVIDENCE_INCONSISTENT");
        const observed = requirement.observed ?? {};
        const observedRef = observed.selectedEvidenceRef;
        if (typeof observedRef === "string" && observedRef !== reference) fail(`passed check requirement ${requirement.id} selected evidence reference is inconsistent`, "RECEIPT_EVIDENCE_INCONSISTENT");
        if (observed.name !== check.name || observed.testedSha !== check.testedSha || observed.target !== receipt.revisions.targetKind || observed.resolution !== "passed") {
          fail(`passed check requirement ${requirement.id} selected check name, target, or resolution is inconsistent`, "RECEIPT_EVIDENCE_INCONSISTENT");
        }
        if (observed.selectedConclusion !== check.conclusion || !Array.isArray(observed.acceptableConclusions) || !observed.acceptableConclusions.includes(check.conclusion)) {
          fail(`passed check requirement ${requirement.id} selected an unacceptable conclusion`, "RECEIPT_EVIDENCE_INCONSISTENT");
        }
        if (observed.expectedSourceKind !== check.sourceStrength || observed.expectedAppId !== check.appId) {
          fail(`passed check requirement ${requirement.id} does not match its expected immutable source`, "RECEIPT_EVIDENCE_INCONSISTENT");
        }
        const expectedFields: Array<[string, string | number | undefined]> = [["expectedAppSlug", check.appSlug], ["expectedWorkflowId", check.workflowId], ["expectedWorkflowPath", check.workflowPath], ["expectedEvent", check.event]];
        for (const [field, actual] of expectedFields) if (observed[field] !== undefined && observed[field] !== actual) fail(`passed check requirement ${requirement.id} expected ${field} is inconsistent`, "RECEIPT_EVIDENCE_INCONSISTENT");
        if (check.sourceStrength === "github_actions_workflow" && observed.expectedWorkflowId === undefined && observed.expectedWorkflowPath === undefined) {
          fail(`passed check requirement ${requirement.id} must preserve its expected workflow identity`, "RECEIPT_EVIDENCE_INCONSISTENT");
        }
        const identityFields: Array<[string, string | number | undefined]> = [["sourceStrength", check?.sourceStrength], ["appId", check?.appId], ["checkRunId", check?.checkRunId], ["workflowId", check?.workflowId], ["workflowPath", check?.workflowPath], ["workflowRunId", check?.workflowRunId], ["workflowRunAttempt", check?.workflowRunAttempt], ["event", check?.event]];
        for (const [field, actual] of identityFields) if (observed[field] !== undefined && observed[field] !== actual) fail(`passed check requirement ${requirement.id} selected ${field} is inconsistent`, "RECEIPT_EVIDENCE_INCONSISTENT");
    }
  }
  const checkRunIds = receipt.evidence.checks.flatMap((check) => check.checkRunId === undefined ? [] : [check.checkRunId]);
  if (new Set(checkRunIds).size !== checkRunIds.length) fail("receipt evidence contains duplicate checkRunId values", "DUPLICATE_EVIDENCE_ID");
  const workflowRunKeys = receipt.evidence.checks.flatMap((check) => check.workflowRunId === undefined || check.workflowRunAttempt === undefined ? [] : [`${check.workflowRunId}:${check.workflowRunAttempt}`]);
  if (new Set(workflowRunKeys).size !== workflowRunKeys.length) fail("receipt evidence contains duplicate workflow run identities", "DUPLICATE_EVIDENCE_ID");
}
  for (const gate of receipt.humanGates) {
    const requirement = receipt.requirements.find((item) => item.id === `handoff.${gate.id}`);
    if (requirement === undefined) fail(`human gate ${gate.id} has no matching requirement`, "RECEIPT_GATE_INCONSISTENT");
    const approvedActors = new Set(receipt.evidence.reviews.filter((review) => review.active && review.state === "APPROVED" && review.commitId === receipt.revisions.testedSha && review.qualified && review.qualification.complete && review.qualification.permissionState === "sufficient" && !review.isAuthor && !review.isBot && reviewMatchesQualifiedPrincipal(review, gate.requiredReviewers)).map((review) => `actor:${review.actorId}`));
    if (!Number.isInteger(gate.requiredCount) || gate.requiredCount < 1) fail(`human gate ${gate.id} has an invalid requiredCount`, "RECEIPT_GATE_INCONSISTENT");
    if (gate.approvedBy.some((actor) => !approvedActors.has(actor))) fail(`human gate ${gate.id} references an unavailable approved actor`, "RECEIPT_GATE_INCONSISTENT");
    const requirementApprovedActors = new Set(requirement.evidenceRefs.filter((reference) => reference.startsWith("review:")).map((reference) => {
      const match = /^review:\d+:actor:(\d+):/.exec(reference);
      return match === null ? undefined : `actor:${match[1]}`;
    }).filter((actor): actor is string => actor !== undefined));
    const approvedBySet = new Set(gate.approvedBy);
    if (approvedBySet.size !== gate.approvedBy.length || approvedBySet.size !== requirementApprovedActors.size || [...approvedBySet].some((actor) => !requirementApprovedActors.has(actor))) fail(`human gate ${gate.id} approvedBy does not exactly match its requirement evidence`, "RECEIPT_GATE_INCONSISTENT");
    const countSatisfied = approvedBySet.size >= gate.requiredCount;
    if (gate.satisfied !== countSatisfied || gate.satisfied !== (requirement.result === "passed")) fail(`human gate ${gate.id} does not match its required approval count or requirement`, "RECEIPT_GATE_INCONSISTENT");
  }
}

function assertReceiptObservationContract(receipt: ContributionReceipt): void {
  const sourceInput = {
    policySources: receipt.policySources,
    changedPaths: receipt.changedPaths,
    linkedIssues: receipt.evidence.linkedIssues,
    reviews: receipt.evidence.reviews,
    checks: receipt.evidence.checks,
    ownershipRequirements: receipt.evidence.ownershipRequirements,
    reviewability: receipt.reviewability,
  };
  const expected = (group: keyof EvaluationObservations): string => expectedObservationDigest(sourceInput, group);
  if (receipt.observations.policySources.length !== receipt.policySources.length) fail("receipt policy source observation metadata must correspond one-to-one with policy sources", "OBSERVATION_INVARIANT");
  for (let index = 0; index < receipt.observations.policySources.length; index += 1) {
    const meta = receipt.observations.policySources[index]!;
    if (meta.source.identity !== receipt.policySources[index]!.identity) fail("receipt policy source observation metadata cannot be swapped", "OBSERVATION_INVARIANT");
    assertObservationRevision(meta, receipt.policySources[index]!.revision, `receipt.observations.policySources[${index}]`);
    validateObservationMeta(meta, `receipt.observations.policySources[${index}]`, expected("policySources"));
  }
  const groups: Array<[keyof EvaluationObservations, ObservationMeta]> = [
    ["changedPaths", receipt.observations.changedPaths], ["linkedIssues", receipt.observations.linkedIssues], ["reviews", receipt.observations.reviews], ["checks", receipt.observations.checks], ["ownership", receipt.observations.ownership], ["reviewability", receipt.observations.reviewability],
  ];
  for (const [group, meta] of groups) {
    const expectedRevision = group === "ownership" ? receipt.revisions.baseSha : group === "changedPaths" || group === "linkedIssues" ? receipt.revisions.headSha : receipt.revisions.testedSha;
    assertObservationRevision(meta, expectedRevision, `receipt.observations.${group}`);
    validateObservationMeta(meta, `receipt.observations.${group}`, expected(group));
  }
}

export function assertContributionReceipt(value: unknown): asserts value is ContributionReceipt {
  validate(value, receiptValidator, "ContributionReceipt");
  const receipt = value as ContributionReceipt;
  assertUtcTimestamp(receipt.evaluatedAt, "evaluatedAt");
  const requirementIds = receipt.requirements.map((requirement) => requirement.id);
  assertUniqueStrings(requirementIds, "ContributionReceipt requirement id");
  const expectedStatus = determineFinalStatus(receipt.requirements);
  if (receipt.final.status !== expectedStatus) fail(`ContributionReceipt final status must be ${expectedStatus}`, "RECEIPT_STATE_INCONSISTENT");
  const expectedReasons = receipt.requirements.filter((item) => item.result !== "passed").map((item) => item.id);
  if (expectedReasons.length !== receipt.final.reasonIds.length || expectedReasons.some((id, index) => receipt.final.reasonIds[index] !== id)) fail("ContributionReceipt reasonIds do not match its non-passing requirements", "RECEIPT_STATE_INCONSISTENT");
  const receiptSourceKeys = receipt.policySources.map((source) => `${source.kind}\u0000${source.identity}`);
  assertUniqueStrings(receiptSourceKeys, "ContributionReceipt policy source identities");
  for (const source of receipt.policySources) if (source.revision !== receipt.revisions.baseSha) fail(`ContributionReceipt policy source ${source.identity} must be bound to baseSha`, "POLICY_SOURCE_REVISION_MISMATCH");
  const patchgateSource = receipt.policySources.find((source) => source.kind === "patchgate" && source.identity === "patchgate.yml");
  if (patchgateSource !== undefined && patchgateSource.digest !== receipt.policyDigest) fail("ContributionReceipt policyDigest does not match patchgate.yml source digest", "RECEIPT_EVIDENCE_INCONSISTENT");
  for (const check of receipt.evidence.checks) assertUtcTimestamp(check.retrievedAt, "check retrievedAt");
  const reviewIds = receipt.evidence.reviews.map((review) => review.reviewId);
  assertUniqueStrings(reviewIds.map(String), "ContributionReceipt review identities");
  for (const review of receipt.evidence.reviews) if (review.qualification.revision !== undefined && review.qualification.revision !== receipt.revisions.testedSha) fail(`ContributionReceipt review ${review.reviewId} qualification must be bound to testedSha`, "OBSERVATION_INVARIANT");
  assertReceiptObservationContract(receipt);
  assertReceiptEvidenceIntegrity(receipt);
  const expectedDigest = receiptDigest(receipt);
  if (receipt.receiptDigest !== expectedDigest) fail("ContributionReceipt receiptDigest does not match its deterministic receipt core", "RECEIPT_DIGEST_MISMATCH");
}

function assertUtcTimestamp(value: string, label: string): void {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{3}))?Z$/.exec(value);
  if (match === null) fail(`${label} must be a UTC ISO-8601 timestamp`, "TIMESTAMP_INVALID");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(`${label} must be a valid timestamp`, "TIMESTAMP_INVALID");
  const expected = match[2] === undefined ? `${match[1]}.000Z` : value;
  if (new Date(timestamp).toISOString() !== expected) fail(`${label} must be a valid calendar timestamp`, "TIMESTAMP_INVALID");
}

export function parseEvaluationInputJson(contents: string): EvaluationInput {
  let value: unknown;
  try {
    value = JSON.parse(contents) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "malformed JSON";
    fail(`evaluation input JSON is malformed: ${detail}`, "JSON_MALFORMED");
  }
  assertEvaluationInput(value);
  return value;
}
