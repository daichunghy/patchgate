import { assertRedacted, redactForReport, safeDisplayText } from "./github/redaction.js";

export interface SupportBundle {
  schemaVersion: "0.1";
  bundleType: "patchgate-support";
  generatedAt: string;
  source: "github_snapshot_report" | "contribution_receipt" | "unknown";
  identity?: {
    owner?: string;
    name?: string;
    pullRequest?: number;
    baseSha?: string;
    headSha?: string;
    testedSha?: string;
    targetKind?: string;
  };
  status?: string;
  reasonIds: string[];
  diagnostics: Array<Record<string, unknown>>;
  capability?: unknown;
  metrics?: unknown;
  observations?: unknown;
  policySources?: unknown;
  summary: {
    changedPathCount?: number;
    linkedIssueCount?: number;
    reviewCount?: number;
    checkCount?: number;
    requirementCount?: number;
    policySourceCount?: number;
  };
  privacy: {
    excludedData: string[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? safeDisplayText(value, "support bundle value", 1_000) : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function selectedIdentity(value: unknown): SupportBundle["identity"] | undefined {
  if (!isRecord(value)) return undefined;
  const identity: NonNullable<SupportBundle["identity"]> = {};
  for (const key of ["owner", "name", "baseSha", "headSha", "testedSha", "targetKind"] as const) {
    const item = stringValue(value[key]);
    if (item !== undefined) identity[key] = item;
  }
  const pullRequest = numberValue(value.pullRequest ?? value.pullRequestNumber);
  if (pullRequest !== undefined) identity.pullRequest = pullRequest;
  return Object.keys(identity).length === 0 ? undefined : identity;
}

function selectedDiagnostics(value: unknown): Array<Record<string, unknown>> {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.filter(isRecord).map((diagnostic) => {
    const output: Record<string, unknown> = {};
    for (const key of ["id", "message", "remediation", "observation", "complete", "permissionState", "retryable", "snapshotEvaluable", "exitCode"] as const) {
      const item = diagnostic[key];
      if (typeof item === "string") output[key] = safeDisplayText(item, `support diagnostic ${key}`, 2_000);
      else if (typeof item === "boolean" || (typeof item === "number" && Number.isInteger(item))) output[key] = item;
    }
    return output;
  });
}

function collectionCount(value: unknown, key: string): number | undefined {
  if (!isRecord(value) || !Array.isArray(value[key])) return undefined;
  return value[key].length;
}

function selectedStatus(value: unknown): { status?: string; reasonIds: string[] } {
  if (!isRecord(value)) return { reasonIds: [] };
  const final = isRecord(value.final) ? value.final : value;
  const status = stringValue(final.status);
  const reasonIds = Array.isArray(final.reasonIds) ? final.reasonIds.filter((item): item is string => typeof item === "string").map((item) => safeDisplayText(item, "support reason", 300)) : [];
  return { ...(status === undefined ? {} : { status }), reasonIds };
}

export function buildSupportBundle(input: unknown, generatedAt: string): SupportBundle {
  const report = isRecord(input) ? input : {};
  const snapshot = isRecord(report.snapshot) ? report.snapshot : report;
  const receipt = isRecord(report.evidence) ? report : undefined;
  const identity = selectedIdentity(report.identity) ?? selectedIdentity(receipt?.repository);
  const revisions = isRecord(snapshot.revisions) ? snapshot.revisions : isRecord(receipt?.revisions) ? receipt.revisions : undefined;
  const revisionIdentity = selectedIdentity(revisions);
  const mergedIdentity = identity === undefined && revisionIdentity === undefined ? undefined : { ...(identity ?? {}), ...(revisionIdentity ?? {}) };
  const status = selectedStatus(report.evaluation ?? report).status ?? selectedStatus(receipt).status;
  const reasonIds = selectedStatus(report.evaluation ?? report).reasonIds.length > 0 ? selectedStatus(report.evaluation ?? report).reasonIds : selectedStatus(receipt).reasonIds;
  const evidence = isRecord(report.snapshot) ? report.snapshot : receipt;
  const summary: SupportBundle["summary"] = {};
  const countFields: Array<[string, keyof SupportBundle["summary"]]> = [
    ["changedPaths", "changedPathCount"], ["linkedIssues", "linkedIssueCount"], ["reviews", "reviewCount"],
    ["checks", "checkCount"], ["requirements", "requirementCount"], ["policySources", "policySourceCount"],
  ];
  for (const [collection, field] of countFields) {
    const count = collectionCount(evidence, collection);
    if (count !== undefined) summary[field] = count;
  }
  const rawBundle: SupportBundle = {
    schemaVersion: "0.1",
    bundleType: "patchgate-support",
    generatedAt: safeDisplayText(generatedAt, "support bundle timestamp", 100),
    source: report.kind === "built" || report.kind === "rejected" ? "github_snapshot_report" : receipt === undefined ? "unknown" : "contribution_receipt",
    ...(mergedIdentity === undefined ? {} : { identity: mergedIdentity }),
    ...(status === undefined ? {} : { status }),
    reasonIds,
    diagnostics: selectedDiagnostics(report.diagnostics ?? report.diagnostic ?? receipt?.diagnostics),
    ...(report.capability === undefined ? {} : { capability: report.capability }),
    ...(report.metrics === undefined ? {} : { metrics: report.metrics }),
    ...(isRecord(snapshot.observations) ? { observations: snapshot.observations } : isRecord(receipt?.observations) ? { observations: receipt.observations } : {}),
    ...(Array.isArray(snapshot.policySources) ? { policySources: snapshot.policySources } : Array.isArray(receipt?.policySources) ? { policySources: receipt.policySources } : {}),
    summary,
    privacy: { excludedData: ["pr_bodies", "comments", "tokens", "workflow_logs", "artifacts", "email_addresses"] },
  };
  const sanitized = redactForReport(rawBundle) as SupportBundle;
  assertRedacted(sanitized);
  return sanitized;
}
