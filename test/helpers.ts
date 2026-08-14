import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizedObservationDigest, normalizedPolicyDigest } from "../src/evidence/digests.js";
import { evaluateContribution } from "../src/evaluator.js";
import type { EvaluationInput, EvaluationObservations, ReviewSnapshot } from "../src/types.js";

export const FIXED_EVALUATED_AT = "2026-08-13T00:00:00Z";

export async function fixture(): Promise<EvaluationInput> {
  return JSON.parse(await readFile(resolve("fixtures/pr-ready.json"), "utf8")) as EvaluationInput;
}

export function refreshObservations(input: EvaluationInput): EvaluationInput {
  const observations: EvaluationObservations = structuredClone(input.observations);
  const groups: Array<keyof EvaluationObservations> = ["changedPaths", "linkedIssues", "reviews", "checks", "ownership", "reviewability"];
  for (const group of groups) {
    const meta = observations[group];
    if (Array.isArray(meta)) continue;
    const updated = { ...meta, normalizedDigest: normalizedObservationDigest(input, group) };
    if (group === "changedPaths") observations.changedPaths = updated;
    if (group === "linkedIssues") observations.linkedIssues = updated;
    if (group === "reviews") observations.reviews = updated;
    if (group === "checks") observations.checks = updated;
    if (group === "ownership") observations.ownership = updated;
    if (group === "reviewability") observations.reviewability = updated;
  }
  if (observations.policySources.length === input.policySources.length) {
    observations.policySources = observations.policySources.map((meta) => ({ ...meta, normalizedDigest: normalizedObservationDigest(input, "policySources") }));
  }
  return { ...input, observations };
}

export function withInput(input: EvaluationInput, overrides: Partial<EvaluationInput>): EvaluationInput {
  return refreshObservations({ ...input, ...overrides });
}

export function withPolicy(input: EvaluationInput, policy: EvaluationInput["policy"]): EvaluationInput {
  if (policy === null) return withInput(input, { policy });
  return withInput(input, {
    policy,
    policySources: input.policySources.map((source) => source.kind === "patchgate" && source.identity === "patchgate.yml" ? { ...source, contractDigest: policy === null ? undefined : normalizedPolicyDigest(policy) } : source),
  });
}

export function evaluate(input: EvaluationInput) {
  return evaluateContribution(input, FIXED_EVALUATED_AT);
}

export function review(overrides: Partial<ReviewSnapshot> = {}): ReviewSnapshot {
  return {
    reviewId: 1,
    actorId: 10,
    login: "reviewer",
    state: "APPROVED",
    commitId: "head-sha",
    qualified: true,
    teams: ["@security"],
    teamIds: [20],
    qualification: { source: { kind: "github", identity: "permissions" }, revision: "head-sha", complete: true, permissionState: "sufficient", principalBindings: [{ configuredPrincipal: "@security", kind: "team", immutableId: 20, membershipState: "active" }] },
    isAuthor: false,
    isBot: false,
    active: true,
    ...overrides,
  };
}
