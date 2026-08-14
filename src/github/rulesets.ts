import { sha256Digest } from "../canonical-json.js";
import type { ObservationMeta, PolicySource } from "../types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { collectPaginated } from "./pagination.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";

export interface NormalizedRuleset { id: number; name: string; sourceType: string; source: string; enforcement: "active" | "evaluate" | "disabled" | "unknown"; applicable: boolean; decisionBearing: boolean; ruleTypes: string[]; bypassVisible: boolean }
export interface RulesetsResult { rulesets: NormalizedRuleset[]; source?: PolicySource; meta: ObservationMeta; diagnostics: GitHubDiagnostic[]; decisionBearing: boolean }

interface ParsedRuleset { id: number; name: string; sourceType: string; source: string; enforcement: string; applicable: boolean; decisionBearing: boolean; ruleTypes: string[]; bypassVisible: boolean; complete: boolean }

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
    const rulesValue = value.rules;
    const ruleTypes = Array.isArray(rulesValue) ? rulesValue.flatMap((rule) => isRecord(rule) && typeof rule.type === "string" ? [rule.type] : []) : [];
    const conditions = isRecord(value.conditions) && isRecord(value.conditions.ref_name) ? value.conditions.ref_name : undefined;
    const include = conditions && Array.isArray(conditions.include) ? conditions.include.filter((item): item is string => typeof item === "string") : [];
    const exactBaseRef = `refs/heads/${baseRef}`;
    const applicable = target === "branch" && (include.length === 0 || include.includes("~ALL") || include.includes(exactBaseRef));
    const bypassVisible = Array.isArray(value.bypass_actors);
    const rulesKnown = Array.isArray(rulesValue) && ruleTypes.length === rulesValue.length;
    const conditionsKnown = value.conditions === undefined || (isRecord(value.conditions) && isRecord(value.conditions.ref_name));
    return { id, name, sourceType, source, enforcement, ruleTypes, applicable, decisionBearing: enforcement === "active" && ruleTypes.length > 0, bypassVisible, complete: enforcementKnown && conditionsKnown && rulesKnown && (enforcement !== "active" || bypassVisible) };
  });
}

export async function collectRulesets(client: GitHubClient, owner: string, name: string, baseRef: string, baseSha: string, allowConfirmedAbsence = false, phase: "collection" | "finalization" = "collection"): Promise<RulesetsResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  try {
    const collection = await collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/rulesets`, query: { includes_parents: true, per_page: 100 } }, "rulesets", (body) => parseRulesets(body, baseRef), (rule) => String(rule.id), { phase, allowConfirmedAbsence, pageSize: 100 });
    const parsed = collection.items;
    const rulesets: NormalizedRuleset[] = parsed.map((rule) => ({ id: rule.id, name: rule.name, sourceType: rule.sourceType, source: rule.source, enforcement: rule.enforcement === "active" || rule.enforcement === "evaluate" || rule.enforcement === "disabled" ? rule.enforcement : "unknown", applicable: rule.applicable && (baseRef.length > 0), decisionBearing: rule.decisionBearing && rule.applicable, ruleTypes: rule.ruleTypes, bypassVisible: rule.bypassVisible }));
    const complete = parsed.every((rule) => rule.complete);
    const diagnostics = [...collection.diagnostics];
    if (!complete) diagnostics.push(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "A native ruleset had unsupported enforcement, condition, or bypass visibility semantics.", { observation: "rulesets", remediation: "Confirm the effective native ruleset shape or extend the versioned native-control contract before evaluating." }));
    const decisionBearing = rulesets.some((rule) => rule.applicable && rule.decisionBearing);
    const finalComplete = collection.complete && complete && diagnostics.length === 0;
    return { rulesets, ...(finalComplete ? { source: { kind: "ruleset" as const, identity: "repository-rulesets", revision: baseSha, digest: sha256Digest(rulesets), authority: "enforced" as const } } : {}), meta: { source: { kind: "github", identity: "repository-rulesets" }, revision: baseSha, retrievedAt, complete: finalComplete, permissionState: finalComplete ? "sufficient" : collection.permissionState, responseDigest: sha256Digest(collection.pageDigests) }, diagnostics, decisionBearing: finalComplete && decisionBearing };
  } catch (error) {
    const diagnostic = error instanceof GitHubAdapterError ? error.diagnostic : makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "Ruleset normalization failed.", { observation: "rulesets", snapshotEvaluable: false, exitCode: 2 });
    return { rulesets: [], meta: { source: { kind: "github", identity: "repository-rulesets" }, revision: baseSha, retrievedAt, complete: false, permissionState: diagnostic.permissionState }, diagnostics: [diagnostic], decisionBearing: false };
  }
}
