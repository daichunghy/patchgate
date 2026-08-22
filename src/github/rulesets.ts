import { sha256Digest } from "../canonical-json.js";
import type { NativeRuleset, ObservationMeta, PolicySource } from "../types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { collectPaginated } from "./pagination.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";

export type NormalizedRuleset = NativeRuleset;
export interface RulesetsResult { rulesets: NormalizedRuleset[]; source?: PolicySource; meta: ObservationMeta; diagnostics: GitHubDiagnostic[]; decisionBearing: boolean }

interface ParsedRuleset extends NativeRuleset { complete: boolean }

interface RuleControls {
  requiredChecks: Array<{ context: string; appId?: number }>;
  requiredApprovals: number;
  requireCodeOwnerReviews: boolean;
  requireLastPushApproval: boolean;
  staleReviews: boolean;
  requiredReviewThreadResolution: boolean;
  unsupported: boolean;
  complete: boolean;
}

function emptyControls(): RuleControls {
  return { requiredChecks: [], requiredApprovals: 0, requireCodeOwnerReviews: false, requireLastPushApproval: false, staleReviews: false, requiredReviewThreadResolution: false, unsupported: false, complete: true };
}

function safePattern(pattern: string): boolean { return !/[?\[\]]/.test(pattern); }

function matchesRefPattern(pattern: string, ref: string): boolean {
  if (pattern === "~ALL" || pattern === ref) return true;
  if (pattern === "~DEFAULT_BRANCH" || !pattern.includes("*") || !safePattern(pattern)) return false;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(ref);
}

function parseRefConditions(value: unknown, baseRef: string): { applicable: boolean; complete: boolean } {
  if (value === undefined) return { applicable: true, complete: true };
  if (!isRecord(value) || !isRecord(value.ref_name)) return { applicable: false, complete: false };
  const includeValue = value.ref_name.include;
  const excludeValue = value.ref_name.exclude;
  if (!Array.isArray(includeValue) || (excludeValue !== undefined && !Array.isArray(excludeValue))) return { applicable: false, complete: false };
  const include = includeValue.filter((item): item is string => typeof item === "string");
  const exclude = excludeValue === undefined ? [] : excludeValue.filter((item): item is string => typeof item === "string");
  const complete = include.length === includeValue.length && exclude.length === (Array.isArray(excludeValue) ? excludeValue.length : 0) && [...include, ...exclude].every(safePattern) && ![...include, ...exclude].includes("~DEFAULT_BRANCH");
  const ref = `refs/heads/${baseRef}`;
  const included = include.length === 0 || include.some((pattern) => matchesRefPattern(pattern, ref));
  const excluded = exclude.some((pattern) => matchesRefPattern(pattern, ref));
  return { applicable: included && !excluded, complete };
}

function mergeCheck(target: Array<{ context: string; appId?: number }>, check: { context: string; appId?: number }): void {
  const existing = target.find((candidate) => candidate.context === check.context);
  if (existing === undefined) target.push(check);
  else if (existing.appId === undefined && check.appId !== undefined) existing.appId = check.appId;
}

function parseRuleControls(rulesValue: unknown): { ruleTypes: string[]; controls: RuleControls } {
  const controls = emptyControls();
  if (!Array.isArray(rulesValue)) return { ruleTypes: [], controls: { ...controls, complete: false } };
  const ruleTypes: string[] = [];
  for (const rule of rulesValue) {
    if (!isRecord(rule) || typeof rule.type !== "string" || rule.type.trim().length === 0) { controls.complete = false; continue; }
    const type = rule.type;
    ruleTypes.push(type);
    if (type === "required_status_checks") {
      const parameters = isRecord(rule.parameters) ? rule.parameters : undefined;
      const checksValue = parameters?.required_status_checks;
      if (!Array.isArray(checksValue)) { controls.complete = false; continue; }
      for (const check of checksValue) {
        if (!isRecord(check) || typeof check.context !== "string" || check.context.trim().length === 0) { controls.complete = false; continue; }
        const integrationId = check.integration_id;
        if (integrationId !== undefined && integrationId !== null && (typeof integrationId !== "number" || !Number.isInteger(integrationId) || integrationId < 1)) { controls.complete = false; continue; }
        mergeCheck(controls.requiredChecks, { context: check.context, ...(typeof integrationId === "number" ? { appId: integrationId } : {}) });
      }
      continue;
    }
    if (type === "pull_request") {
      const parameters = isRecord(rule.parameters) ? rule.parameters : undefined;
      const requiredApprovals = parameters?.required_approving_review_count;
      const codeOwner = parameters?.require_code_owner_review;
      const lastPush = parameters?.require_last_push_approval;
      const stale = parameters?.dismiss_stale_reviews_on_push;
      const threads = parameters?.required_review_thread_resolution;
      if (typeof requiredApprovals !== "number" || !Number.isInteger(requiredApprovals) || requiredApprovals < 0 || typeof codeOwner !== "boolean" || typeof lastPush !== "boolean" || typeof stale !== "boolean" || typeof threads !== "boolean") {
        controls.complete = false;
      } else {
        controls.requiredApprovals = Math.max(controls.requiredApprovals, requiredApprovals);
        controls.requireCodeOwnerReviews = controls.requireCodeOwnerReviews || codeOwner;
        controls.requireLastPushApproval = controls.requireLastPushApproval || lastPush;
        controls.staleReviews = controls.staleReviews || stale;
        controls.requiredReviewThreadResolution = controls.requiredReviewThreadResolution || threads;
      }
      const mergeMethods = parameters?.allowed_merge_methods;
      if (mergeMethods !== undefined && (!Array.isArray(mergeMethods) || mergeMethods.some((method) => typeof method !== "string") || !["merge", "squash", "rebase"].every((method) => (mergeMethods as unknown[]).includes(method)))) controls.unsupported = true;
      continue;
    }
    controls.unsupported = true;
  }
  controls.requiredChecks.sort((left, right) => left.context.localeCompare(right.context) || (left.appId ?? 0) - (right.appId ?? 0));
  return { ruleTypes: [...new Set(ruleTypes)].sort(), controls };
}

function parseRulesets(body: unknown, baseRef: string): ParsedRuleset[] {
  if (!Array.isArray(body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The repository rulesets response was not an array.", { observation: "rulesets", snapshotEvaluable: false, exitCode: 2 }));
  return body.map((value, index) => {
    if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Ruleset ${index} was malformed.`, { observation: "rulesets", snapshotEvaluable: false, exitCode: 2 }));
    const id = readPositiveInt(value, "id");
    const name = readString(value, "name");
    const enforcement = readString(value, "enforcement");
    if (id === undefined || name === undefined || enforcement === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Ruleset ${index} lacked identity or enforcement.`, { observation: "rulesets", snapshotEvaluable: false, exitCode: 2 }));
    const sourceType = readString(value, "source_type") ?? "unknown";
    const source = readString(value, "source") ?? "unknown";
    const target = readString(value, "target") ?? "branch";
    const enforcementKnown = enforcement === "active" || enforcement === "evaluate" || enforcement === "disabled";
    const parsedControls = parseRuleControls(value.rules);
    const conditions = parseRefConditions(value.conditions, baseRef);
    const bypassVisible = Array.isArray(value.bypass_actors);
    const applicable = target === "branch" && conditions.applicable;
    const decisionBearing = enforcement === "active" && applicable && (parsedControls.ruleTypes.length > 0 || parsedControls.controls.unsupported);
    const complete = enforcementKnown && conditions.complete && parsedControls.controls.complete && (!decisionBearing || bypassVisible) && (!decisionBearing || !parsedControls.controls.unsupported);
    const controls = parsedControls.controls;
    return { id, name, sourceType, source, enforcement: enforcement === "active" || enforcement === "evaluate" || enforcement === "disabled" ? enforcement : "unknown", applicable, requiredChecks: controls.requiredChecks, requiredApprovals: controls.requiredApprovals, requireCodeOwnerReviews: controls.requireCodeOwnerReviews, requireLastPushApproval: controls.requireLastPushApproval, staleReviews: controls.staleReviews, requiredReviewThreadResolution: controls.requiredReviewThreadResolution, bypassVisible, ruleTypes: parsedControls.ruleTypes, decisionBearing, complete };
  });
}

export async function collectRulesets(client: GitHubClient, owner: string, name: string, baseRef: string, baseSha: string, allowConfirmedAbsence = false, phase: "collection" | "finalization" = "collection"): Promise<RulesetsResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  try {
    const collection = await collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/rulesets`, query: { includes_parents: true, per_page: 100 } }, "rulesets", (body) => parseRulesets(body, baseRef), (rule) => String(rule.id), { phase, allowConfirmedAbsence, pageSize: 100 });
    const parsed = collection.items;
    const rulesets: NormalizedRuleset[] = parsed.map(({ complete: _complete, ...rule }) => rule);
    const complete = parsed.every((rule) => rule.complete);
    const diagnostics = [...collection.diagnostics];
    if (!complete) diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "A native ruleset had unsupported enforcement, condition, bypass visibility, or rule semantics.", { observation: "rulesets", remediation: "Use only the supported required-status-check and pull-request subset, or extend the versioned native-control contract before evaluating." }));
    const decisionBearing = rulesets.some((rule) => rule.applicable && rule.decisionBearing);
    const finalComplete = collection.complete && complete && diagnostics.length === 0;
    return { rulesets, ...(finalComplete ? { source: { kind: "ruleset" as const, identity: "repository-rulesets", revision: baseSha, digest: sha256Digest(rulesets), authority: "enforced" as const } } : {}), meta: { source: { kind: "github", identity: "repository-rulesets" }, revision: baseSha, retrievedAt, complete: finalComplete, permissionState: finalComplete ? "sufficient" : collection.permissionState, responseDigest: sha256Digest(collection.pageDigests) }, diagnostics, decisionBearing: finalComplete && decisionBearing };
  } catch (error) {
    const diagnostic = error instanceof GitHubAdapterError ? error.diagnostic : makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Ruleset normalization failed.", { observation: "rulesets", snapshotEvaluable: false, exitCode: 2 });
    return { rulesets: [], meta: { source: { kind: "github", identity: "repository-rulesets" }, revision: baseSha, retrievedAt, complete: false, permissionState: diagnostic.permissionState }, diagnostics: [diagnostic], decisionBearing: false };
  }
}
