import type {
  ContributionReceipt,
  EvaluationInput,
  EvaluationObservations,
  ObservationMeta,
} from "../types.js";
import { canonicalJson, compareTextUnit, sha256Digest } from "../canonical-json.js";

export type SemanticCheckEvidence = Omit<EvaluationInput["checks"][number], "retrievedAt">;

export type SemanticEvaluationInput = Omit<EvaluationInput, "checks" | "observations"> & {
  checks: SemanticCheckEvidence[];
  observations: SemanticObservations;
};

export type SemanticObservationMeta = Omit<ObservationMeta, "retrievedAt" | "responseDigest">;

export interface SemanticObservations {
  policySources: SemanticObservationMeta[];
  changedPaths: SemanticObservationMeta;
  linkedIssues: SemanticObservationMeta;
  reviews: SemanticObservationMeta;
  checks: SemanticObservationMeta;
  ownership: SemanticObservationMeta;
  reviewability: SemanticObservationMeta;
}

function sortCanonical<T>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => compareTextUnit(canonicalJson(left), canonicalJson(right)));
}

function sortText(values: readonly string[]): string[] {
  return [...values].sort(compareTextUnit);
}

function normalizePolicy(policy: EvaluationInput["policy"]): EvaluationInput["policy"] {
  if (policy === null) return null;
  return {
    ...policy,
    ...(policy.requiredChecks === undefined
      ? {}
      : { requiredChecks: sortCanonical(policy.requiredChecks.map((rule) => ({ ...rule, acceptableConclusions: sortText(rule.acceptableConclusions) }))) }),
    ...(policy.sensitivePaths === undefined
      ? {}
      : { sensitivePaths: sortCanonical(policy.sensitivePaths.map((rule) => ({ ...rule, patterns: sortText(rule.patterns), requiredReviewers: sortText(rule.requiredReviewers) }))) }),
    ...(policy.policyChanges === undefined
      ? {}
      : { policyChanges: { ...policy.policyChanges, paths: sortText(policy.policyChanges.paths) } }),
  };
}

export function normalizedPolicyDigest(policy: NonNullable<EvaluationInput["policy"]>): string {
  return sha256Digest(normalizePolicy(policy));
}

function semanticObservationMeta(meta: ObservationMeta): SemanticObservationMeta {
  const { retrievedAt: _retrievedAt, responseDigest: _responseDigest, ...semantic } = meta;
  return semantic;
}

function normalizeObservations(observations: EvaluationObservations): SemanticObservations {
  return {
    policySources: sortCanonical(observations.policySources.map(semanticObservationMeta)),
    changedPaths: semanticObservationMeta(observations.changedPaths),
    linkedIssues: semanticObservationMeta(observations.linkedIssues),
    reviews: semanticObservationMeta(observations.reviews),
    checks: semanticObservationMeta(observations.checks),
    ownership: semanticObservationMeta(observations.ownership),
    reviewability: semanticObservationMeta(observations.reviewability),
  };
}

export type ObservationDigestInput = Pick<
  EvaluationInput,
  "policySources" | "changedPaths" | "linkedIssues" | "reviews" | "checks" | "ownershipRequirements"
> & {
  reviewability?: EvaluationInput["reviewability"];
};

function normalizedItems(input: ObservationDigestInput, group: keyof EvaluationObservations): unknown {
  switch (group) {
    case "policySources":
      return sortCanonical(input.policySources);
    case "changedPaths":
      return sortText(input.changedPaths);
    case "linkedIssues":
      return sortCanonical(input.linkedIssues);
    case "reviews":
      return sortCanonical(input.reviews.map((review) => ({ ...review, teams: sortText(review.teams), teamIds: [...review.teamIds].sort((a, b) => a - b) })));
    case "checks":
      return sortCanonical(input.checks.map(({ retrievedAt: _retrievedAt, ...check }) => check));
    case "ownership":
      return sortCanonical(input.ownershipRequirements.map((requirement) => ({ ...requirement, owners: sortText(requirement.owners) })));
    case "reviewability":
      return input.reviewability === undefined ? null : { ...input.reviewability, ownershipDomains: sortText(input.reviewability.ownershipDomains) };
  }
}

export function normalizedObservationDigest(input: ObservationDigestInput, group: keyof EvaluationObservations): string {
  return sha256Digest(normalizedItems(input, group));
}

export function normalizedItemsDigest(group: keyof EvaluationObservations, items: unknown): string {
  return sha256Digest(items);
}

export function semanticDecisionInput(input: EvaluationInput): SemanticEvaluationInput {
  return {
    ...input,
    policy: normalizePolicy(input.policy),
    policySources: sortCanonical(input.policySources),
    changedPaths: sortText(input.changedPaths),
    linkedIssues: sortCanonical(input.linkedIssues),
    reviews: sortCanonical(input.reviews.map((review) => ({ ...review, teams: sortText(review.teams), teamIds: [...review.teamIds].sort((a, b) => a - b) }))),
    checks: sortCanonical(input.checks.map(({ retrievedAt: _retrievedAt, ...check }) => check)),
    ownershipRequirements: sortCanonical(input.ownershipRequirements.map((requirement) => ({ ...requirement, owners: sortText(requirement.owners) }))),
    observations: normalizeObservations(input.observations),
    ...(input.reviewability === undefined ? {} : { reviewability: { ...input.reviewability, ownershipDomains: sortText(input.reviewability.ownershipDomains) } }),
  };
}

export function decisionInputDigest(input: EvaluationInput): string {
  return sha256Digest(semanticDecisionInput(input));
}

function normalizeObserved(observed: Record<string, string | number | boolean | string[]> | undefined): Record<string, string | number | boolean | string[]> | undefined {
  if (observed === undefined) return undefined;
  return Object.fromEntries(Object.entries(observed).map(([key, value]) => [key, Array.isArray(value) ? sortText(value) : value]));
}

export function receiptDigest(receipt: Omit<ContributionReceipt, "evaluatedAt"> | ContributionReceipt): string {
  const { receiptDigest: _receiptDigest, ...withoutDigest } = receipt;
  const core = "evaluatedAt" in withoutDigest ? (() => { const { evaluatedAt: _evaluatedAt, ...rest } = withoutDigest; return rest; })() : withoutDigest;
  const requirements = core.requirements.map((item) => ({
    ...item,
    ...(item.observed === undefined ? {} : { observed: normalizeObserved(item.observed) }),
    evidenceRefs: sortText(item.evidenceRefs),
  }));
  const humanGates = core.humanGates.map((gate) => ({ ...gate, requiredReviewers: sortText(gate.requiredReviewers), approvedBy: sortText(gate.approvedBy) }));
  const evidence = {
    ...core.evidence,
    checks: sortCanonical(core.evidence.checks.map(({ retrievedAt: _retrievedAt, ...check }) => check)),
    linkedIssues: sortCanonical(core.evidence.linkedIssues),
    reviews: sortCanonical(core.evidence.reviews.map((review) => ({ ...review, teams: sortText(review.teams), teamIds: [...review.teamIds].sort((a, b) => a - b) }))),
    ownershipRequirements: sortCanonical(core.evidence.ownershipRequirements.map((requirement) => ({ ...requirement, owners: sortText(requirement.owners) }))),
  };
  return sha256Digest({
    ...core,
    changedPaths: sortText(core.changedPaths),
    policySources: sortCanonical(core.policySources),
    observations: normalizeObservations(core.observations),
    requirements: sortCanonical(requirements),
    humanGates: sortCanonical(humanGates),
    final: { ...core.final, reasonIds: sortText(core.final.reasonIds) },
    ...(core.reviewability === undefined ? {} : { reviewability: { ...core.reviewability, ownershipDomains: sortText(core.reviewability.ownershipDomains) } }),
    evidence,
  });
}
