import { determineFinalStatus } from "./contract/status-precedence.js";
import { decisionInputDigest, normalizedPolicyDigest, receiptDigest as calculateReceiptDigest } from "./evidence/digests.js";
import { evidenceReference, resolveCheckEvidence } from "./evidence/source-verifier.js";
import { EVALUATOR_VERSION } from "./version.js";
import type {
  ContributionReceiptCore,
  EvaluationInput,
  HumanGate,
  PatchgatePolicy,
  Requirement,
  RequirementResult,
  ReviewSnapshot,
} from "./types.js";

const PATCHGATE_SOURCE = "patchgate.yml";

function compareIds(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function requirement(input: Omit<Requirement, "evidenceRefs"> & { evidenceRefs?: string[] }): Requirement {
  return { ...input, evidenceRefs: input.evidenceRefs ?? [] };
}

function policyObservationComplete(input: EvaluationInput): boolean {
  return input.observations.policySources.length > 0 && input.observations.policySources.every((meta) => meta.complete && meta.permissionState === "sufficient");
}

function groupAvailable(input: EvaluationInput, group: keyof EvaluationInput["observations"]): boolean {
  if (group === "policySources") return policyObservationComplete(input);
  const meta = input.observations[group];
  return !Array.isArray(meta) && meta.complete && meta.permissionState === "sufficient";
}

function hasPatchgateSource(input: EvaluationInput): boolean {
  if (!policyObservationComplete(input)) return false;
  if (input.policy === null) return false;
  const sources = input.policySources.filter((source) => source.kind === "patchgate" && source.identity === PATCHGATE_SOURCE && source.authority === "enforced");
  if (sources.length !== 1) return false;
  const source = sources[0]!;
  return source.revision === input.revisions.baseSha && source.digest === input.policyDigest && source.contractDigest === normalizedPolicyDigest(input.policy);
}

function hasBasePolicySource(input: EvaluationInput, kind: "codeowners" | "ruleset" | "branch_protection"): boolean {
  return input.policySources.some((source) => source.kind === kind && source.revision === input.revisions.baseSha && source.authority === "enforced");
}

function matchedPath(paths: string[], patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*");
    const matcher = new RegExp(`^${escaped}$`);
    return paths.some((path) => matcher.test(path));
  });
}

function changedPolicyPaths(policy: PatchgatePolicy): string[] {
  return [PATCHGATE_SOURCE, ...(policy.policyChanges?.paths ?? [])];
}

function qualifiedApprovals(reviews: ReviewSnapshot[], targetSha: string, owners: string[]): ReviewSnapshot[] {
  const activeByActor = new Map<number, ReviewSnapshot[]>();
  for (const review of reviews.filter((candidate) => candidate.active)) {
    const current = activeByActor.get(review.actorId) ?? [];
    current.push(review);
    activeByActor.set(review.actorId, current);
  }
  const eligible: ReviewSnapshot[] = [];
  for (const actorReviews of activeByActor.values()) {
    if (actorReviews.some((review) => review.state !== "APPROVED")) continue;
    const review = actorReviews.find((candidate) =>
      candidate.state === "APPROVED" &&
      candidate.commitId === targetSha &&
      candidate.qualified &&
      candidate.qualification.complete &&
      candidate.qualification.permissionState === "sufficient" &&
      !candidate.isAuthor &&
      !candidate.isBot &&
      principalMatches(candidate, owners),
    );
    if (review !== undefined) eligible.push(review);
  }
  return eligible;
}

function hasUnknownQualification(reviews: ReviewSnapshot[], targetSha: string, owners: string[]): boolean {
  return reviews.some((review) =>
    review.active &&
    review.state === "APPROVED" &&
    review.commitId === targetSha &&
    !review.isAuthor &&
    !review.isBot &&
    (owners.length === 0 || owners.includes(review.login) || owners.includes(`@${review.login}`) || review.teams.some((team) => owners.includes(team))) &&
    (!review.qualification.complete || review.qualification.permissionState !== "sufficient" || !principalMatches(review, owners)),
  );
}

function principalMatches(review: ReviewSnapshot, owners: string[]): boolean {
  if (owners.length === 0) return true;
  const bindings = review.qualification.principalBindings ?? [];
  return owners.some((owner) => bindings.some((binding) => binding.configuredPrincipal === owner && binding.membershipState === "active" && (binding.kind === "user" ? owner === review.login || owner === `@${review.login}` : review.teams.includes(owner) && review.teamIds.includes(binding.immutableId))));
}

function observationRequirement(id: string, group: string, remediation: string): Requirement {
  return requirement({ id, ruleClass: "policy_integrity", authority: "derived", source: `observation:${group}`, result: "unknown", severity: "evidence", observed: { observation: group }, remediation });
}

function policyRequirements(input: EvaluationInput): Requirement[] {
  const policyEvidenceRefs = input.policySources.some((source) => source.identity === PATCHGATE_SOURCE) ? ["policy-source:patchgate.yml"] : [];
  if (!policyObservationComplete(input) || input.policy === null || !hasPatchgateSource(input)) {
    return [requirement({
      id: "policy.base_revision",
      ruleClass: "policy_integrity",
      authority: "patchgate",
      source: PATCHGATE_SOURCE,
      result: "unknown",
      severity: "block",
      remediation: "Load patchgate.yml from the trusted PR base SHA and bind both its raw and normalized contract digests before evaluating the PR.",
      evidenceRefs: policyEvidenceRefs,
    })];
  }
  return [requirement({
    id: "policy.base_revision",
    ruleClass: "policy_integrity",
    authority: "patchgate",
    source: PATCHGATE_SOURCE,
    result: "passed",
    severity: "block",
    observed: { baseSha: input.revisions.baseSha },
    remediation: "Keep the policy source bound to the PR base SHA and its normalized contract digest.",
    evidenceRefs: policyEvidenceRefs,
  })];
}

function issueRequirements(input: EvaluationInput, policy: PatchgatePolicy): Requirement[] {
  if (!policy.issueLinkage?.required) return [];
  if (!groupAvailable(input, "linkedIssues")) return [observationRequirement("observation.linked_issues", "linkedIssues", "Retrieve complete, permission-sufficient linked-issue metadata; a body-only issue number is not verified linkage.")];
  const linked = input.linkedIssues.filter((issue) => issue.linked);
  return [requirement({
    id: "issue.linkage",
    ruleClass: "issue_linkage",
    authority: "patchgate",
    source: PATCHGATE_SOURCE,
    result: linked.length > 0 ? "passed" : "failed",
    severity: "block",
    observed: { linkedIssueCount: linked.length },
    remediation: "Link at least one valid issue through GitHub metadata; a body-only number is not sufficient evidence.",
    evidenceRefs: linked.map((issue) => `issue:${issue.repository}#${issue.number}:${issue.issueId}`),
  })];
}

function checkRequirements(input: EvaluationInput, policy: PatchgatePolicy): Requirement[] {
  const checksAvailable = groupAvailable(input, "checks");
  return (policy.requiredChecks ?? []).map((rule) => {
    if (!checksAvailable) return requirement({
      id: `check.${rule.id}`,
      ruleClass: "required_check",
      authority: "patchgate",
      source: PATCHGATE_SOURCE,
      result: "unknown",
      severity: "evidence",
      observed: { name: rule.name, resolution: "observation_incomplete" },
      remediation: `Retrieve complete check/workflow evidence for ${rule.name} from the configured target revision and expected source.`,
    });
    const targetSha = rule.target === input.revisions.targetKind ? input.revisions.testedSha : undefined;
    const resolution = resolveCheckEvidence(input.checks, rule, targetSha);
    const evidence = resolution.status === "passed" || resolution.status === "failed" ? resolution.evidence : undefined;
    const result = resolution.status === "passed" ? "passed" : resolution.status === "failed" ? "failed" : "unknown";
    const selectedIdentity = evidence === undefined ? {} : {
      selectedEvidenceRef: evidenceReference(evidence),
      selectedConclusion: evidence.conclusion ?? "",
      sourceStrength: evidence.sourceStrength,
      ...(evidence.appId === undefined ? {} : { appId: evidence.appId }),
      ...(evidence.checkRunId === undefined ? {} : { checkRunId: evidence.checkRunId }),
      ...(evidence.workflowId === undefined ? {} : { workflowId: evidence.workflowId }),
      ...(evidence.workflowPath === undefined ? {} : { workflowPath: evidence.workflowPath }),
      ...(evidence.workflowRunId === undefined ? {} : { workflowRunId: evidence.workflowRunId }),
      ...(evidence.workflowRunAttempt === undefined ? {} : { workflowRunAttempt: evidence.workflowRunAttempt }),
      ...(evidence.event === undefined ? {} : { event: evidence.event }),
    };
    const expectedIdentity = {
      expectedSourceKind: rule.expectedSource.kind,
      ...(rule.expectedSource.appSlug === undefined ? {} : { expectedAppSlug: rule.expectedSource.appSlug }),
      ...(rule.expectedSource.appId === undefined ? {} : { expectedAppId: rule.expectedSource.appId }),
      ...(rule.expectedSource.workflowId === undefined ? {} : { expectedWorkflowId: rule.expectedSource.workflowId }),
      ...(rule.expectedSource.workflowPath === undefined ? {} : { expectedWorkflowPath: rule.expectedSource.workflowPath }),
      ...(rule.expectedSource.event === undefined ? {} : { expectedEvent: rule.expectedSource.event }),
    };
    return requirement({
      id: `check.${rule.id}`,
      ruleClass: "required_check",
      authority: "patchgate",
      source: PATCHGATE_SOURCE,
      result,
      severity: resolution.status === "failed" ? "block" : "evidence",
      observed: {
        name: rule.name,
        target: rule.target,
        testedSha: input.revisions.testedSha,
        acceptableConclusions: rule.acceptableConclusions,
        resolution: resolution.status,
        ...(resolution.status === "passed" ? {} : { resolutionReason: resolution.reason }),
        ...expectedIdentity,
        ...selectedIdentity,
      },
      remediation: `Provide a completed ${rule.name} check from the expected source on the configured ${rule.target} revision.`,
      evidenceRefs: evidence === undefined ? [] : [evidenceReference(evidence)],
    });
  });
}

function ownershipRequirements(input: EvaluationInput, policy: PatchgatePolicy): Requirement[] {
  if (!policy.ownership?.requireCodeOwnerApproval) return [];
  if (!hasBasePolicySource(input, "codeowners")) return [observationRequirement("ownership.observation", "ownership", "Retrieve the complete CODEOWNERS-derived ownership requirement from the trusted base revision and record its source identity.")];
  if (!groupAvailable(input, "ownership")) return [observationRequirement("ownership.observation", "ownership", "Retrieve complete CODEOWNERS-derived ownership requirements from the trusted base revision.")];
  if (input.ownershipRequirements.length === 0) return [requirement({
    id: "ownership.no_match",
    ruleClass: "ownership",
    authority: "codeowners",
    source: "CODEOWNERS@base",
    result: "passed",
    severity: "human_gate",
    observed: { ownershipRequirementCount: 0 },
    remediation: "Retain the complete base CODEOWNERS observation proving that no ownership rule matched the changed paths.",
    evidenceRefs: ["observation:ownership"],
  })];
  if (!groupAvailable(input, "reviews")) return [observationRequirement("reviews.observation", "reviews", "Retrieve complete review and reviewer-qualification metadata before evaluating ownership approval.")];
  if (hasUnknownQualification(input.reviews, input.revisions.testedSha, input.ownershipRequirements.flatMap((item) => item.owners))) return [observationRequirement("reviews.qualification", "reviews", "Retrieve immutable actor/team qualification and sufficient permission before evaluating ownership approval.")];
  return input.ownershipRequirements.map((ownerRule) => {
    const approvals = qualifiedApprovals(input.reviews, input.revisions.testedSha, ownerRule.owners);
    const passed = approvals.length >= ownerRule.requiredCount;
    return requirement({
      id: `ownership.${ownerRule.id}`,
      ruleClass: "ownership",
      authority: "codeowners",
      source: "CODEOWNERS@base",
      result: passed ? "passed" : "failed",
      severity: "human_gate",
      observed: { requiredCount: ownerRule.requiredCount, approvedCount: approvals.length },
      remediation: `Obtain ${ownerRule.requiredCount} active, qualified CODEOWNERS approval on ${input.revisions.testedSha}.`,
      evidenceRefs: approvals.map((review) => `review:${review.reviewId}:actor:${review.actorId}:${review.commitId}`),
    });
  });
}

function humanHandoffRequirements(input: EvaluationInput, policy: PatchgatePolicy): { requirements: Requirement[]; gates: HumanGate[] } {
  const requirements: Requirement[] = [];
  const gates: HumanGate[] = [];
  if (!groupAvailable(input, "changedPaths")) {
    return { requirements: [observationRequirement("changed_paths.observation", "changedPaths", "Retrieve the complete changed-path collection before deciding policy-change or sensitive-path matches.")], gates };
  }
  for (const rule of policy.sensitivePaths ?? []) {
    if (!matchedPath(input.changedPaths, rule.patterns)) continue;
    if (!groupAvailable(input, "reviews")) {
      requirements.push(requirement({ id: `handoff.${rule.id}`, ruleClass: "human_handoff", authority: "patchgate", source: PATCHGATE_SOURCE, result: "unknown", severity: "evidence", observed: { matched: true, requiredCount: rule.requiredCount, resolution: "reviews_unavailable" }, remediation: `Retrieve complete qualified-review evidence for sensitive path rule ${rule.id}.` }));
      gates.push({ id: rule.id, reason: `Sensitive path rule matched: ${[...rule.patterns].sort().join(", ")}`, satisfied: false, requiredReviewers: rule.requiredReviewers, requiredCount: rule.requiredCount, approvedBy: [] });
      continue;
    }
    if (hasUnknownQualification(input.reviews, input.revisions.testedSha, rule.requiredReviewers)) {
      requirements.push(requirement({ id: `handoff.${rule.id}`, ruleClass: "human_handoff", authority: "patchgate", source: PATCHGATE_SOURCE, result: "unknown", severity: "evidence", observed: { matched: true, requiredCount: rule.requiredCount, resolution: "qualification_unavailable" }, remediation: `Retrieve immutable reviewer/team qualification evidence for sensitive path rule ${rule.id}.` }));
      gates.push({ id: rule.id, reason: `Sensitive path rule matched: ${[...rule.patterns].sort().join(", ")}`, satisfied: false, requiredReviewers: rule.requiredReviewers, requiredCount: rule.requiredCount, approvedBy: [] });
      continue;
    }
    const approvals = qualifiedApprovals(input.reviews, input.revisions.testedSha, rule.requiredReviewers);
    const satisfied = approvals.length >= rule.requiredCount;
    const gate: HumanGate = { id: rule.id, reason: `Sensitive path rule matched: ${[...rule.patterns].sort().join(", ")}`, satisfied, requiredReviewers: rule.requiredReviewers, requiredCount: rule.requiredCount, approvedBy: approvals.map((review) => `actor:${review.actorId}`) };
    gates.push(gate);
    requirements.push(requirement({ id: `handoff.${rule.id}`, ruleClass: "human_handoff", authority: "patchgate", source: PATCHGATE_SOURCE, result: satisfied ? "passed" : "failed", severity: rule.humanGate ? "human_gate" : "block", observed: { matched: true, requiredCount: rule.requiredCount, approvedCount: approvals.length }, remediation: `Obtain the configured human approval for ${rule.id}; PatchGate cannot force an agent to stop.`, evidenceRefs: approvals.map((review) => `review:${review.reviewId}:actor:${review.actorId}:${review.commitId}`) }));
  }
  if (policy.policyChanges !== undefined) {
    if (!matchedPath(input.changedPaths, changedPolicyPaths(policy))) return { requirements, gates };
    const result: RequirementResult = policy.policyChanges.mode === "advisory" ? "advisory" : "failed";
    requirements.push(requirement({ id: "policy.change", ruleClass: "human_handoff", authority: "patchgate", source: PATCHGATE_SOURCE, result, severity: policy.policyChanges.mode === "blocked" ? "block" : "human_gate", observed: { changedPaths: input.changedPaths }, remediation: "Review and merge the policy change under the trusted base policy; it cannot relax its own PR evaluation.", evidenceRefs: ["observation:changedPaths"] }));
  }
  return { requirements, gates };
}

function reviewabilityRequirements(input: EvaluationInput, policy: PatchgatePolicy): Requirement[] {
  if (policy.reviewability === undefined) return [];
  if (!groupAvailable(input, "reviewability")) {
    return [requirement({ id: "reviewability.snapshot", ruleClass: "reviewability", authority: "patchgate", source: PATCHGATE_SOURCE, result: policy.reviewability.mode === "advisory" ? "advisory" : "unknown", severity: policy.reviewability.mode === "advisory" ? "advisory" : "evidence", remediation: "Provide a complete reviewability snapshot for the configured mode." })];
  }
  if (input.reviewability === undefined) {
    return [requirement({ id: "reviewability.snapshot", ruleClass: "reviewability", authority: "patchgate", source: PATCHGATE_SOURCE, result: policy.reviewability.mode === "advisory" ? "advisory" : "unknown", severity: policy.reviewability.mode === "advisory" ? "advisory" : "evidence", remediation: "Provide a normalized reviewability snapshot from the trusted adapter." })];
  }
  const snapshot = input.reviewability;
  const checks: Array<[string, number | undefined, number, string]> = [
    ["files", policy.reviewability.budgets.maxFiles, snapshot.fileCount, "files"],
    ["ownership_domains", policy.reviewability.budgets.maxOwnershipDomains, snapshot.ownershipDomains.length, "ownership domains"],
    ["generated_files", policy.reviewability.budgets.maxGeneratedFiles, snapshot.generatedFileCount, "generated files"],
    ["boundaries", policy.reviewability.budgets.maxBoundaries, snapshot.boundaryCount, "subsystem boundaries"],
  ];
  return checks.filter(([, limit]) => limit !== undefined).map(([name, limit, actual, label]) => {
    const passed = actual <= (limit as number);
    return requirement({ id: `reviewability.${name}`, ruleClass: "reviewability", authority: "patchgate", source: PATCHGATE_SOURCE, result: passed ? "passed" : policy.reviewability?.mode === "blocking" ? "failed" : "advisory", severity: policy.reviewability?.mode === "blocking" ? "block" : "advisory", observed: { actual, limit: limit as number }, remediation: `Keep ${label} at or below ${limit as number}, or split the contribution and document the boundary.`, evidenceRefs: ["observation:reviewability"] });
  });
}

export function evaluateValidated(input: EvaluationInput): ContributionReceiptCore {
  const requirements = policyRequirements(input);
  const handoff: { requirements: Requirement[]; gates: HumanGate[] } = { requirements: [], gates: [] };
  if (input.policy !== null && hasPatchgateSource(input)) {
    requirements.push(...issueRequirements(input, input.policy));
    requirements.push(...checkRequirements(input, input.policy));
    requirements.push(...ownershipRequirements(input, input.policy));
    const calculatedHandoff = humanHandoffRequirements(input, input.policy);
    handoff.requirements.push(...calculatedHandoff.requirements);
    handoff.gates.push(...calculatedHandoff.gates);
    requirements.push(...reviewabilityRequirements(input, input.policy));
  }
  const orderedRequirements = [...requirements, ...handoff.requirements].sort(compareIds);
  const core: ContributionReceiptCore = structuredClone({
    schemaVersion: "0.1",
    evaluatorVersion: EVALUATOR_VERSION,
    repository: input.repository,
    revisions: input.revisions,
    policyDigest: input.policyDigest,
    decisionInputDigest: decisionInputDigest(input),
    receiptDigest: "sha256:" + "0".repeat(64),
    changedPaths: input.changedPaths,
    policySources: input.policySources,
    observations: input.observations,
    evidence: { checks: input.checks, linkedIssues: input.linkedIssues, reviews: input.reviews, ownershipRequirements: input.ownershipRequirements },
    requirements: orderedRequirements,
    ...(input.reviewability === undefined ? {} : { reviewability: input.reviewability }),
    humanGates: handoff.gates.sort(compareIds),
    final: { status: determineFinalStatus(orderedRequirements), reasonIds: orderedRequirements.filter((item) => item.result !== "passed").map((item) => item.id) },
  });
  return { ...core, receiptDigest: calculateReceiptDigest(core) };
}

export function deliverReceipt(core: ContributionReceiptCore, evaluatedAt: string): ContributionReceiptCore & { evaluatedAt: string } {
  return { ...structuredClone(core), evaluatedAt };
}
