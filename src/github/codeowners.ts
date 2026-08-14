import type { ObservationMeta, OwnershipRequirement, PolicySource } from "../types.js";
import { isRecord, readString, readPositiveInt } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { safeAllowlistedString } from "./redaction.js";
import { sha256Digest, sha256Text } from "../canonical-json.js";

const CODEOWNERS_PATHS = [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"] as const;

interface CodeownersRule { pattern: string; owners: string[]; line: number }

export interface CodeownersResult {
  requirements: OwnershipRequirement[];
  source?: PolicySource;
  selectedPath?: string;
  meta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of line) {
    if (escaped) { current += char; escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (/\s/.test(char)) { if (current.length > 0) { tokens.push(current); current = ""; } continue; }
    current += char;
  }
  if (escaped) current += "\\";
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function parseRules(text: string): { rules: CodeownersRule[]; diagnostics: GitHubDiagnostic[] } {
  const rules: CodeownersRule[] = [];
  const diagnostics: GitHubDiagnostic[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const commentIndex = [...line].findIndex((char, charIndex) => char === "#" && (charIndex === 0 || /\s/.test(line[charIndex - 1] ?? "")));
    const content = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    if (content.trim().length === 0) return;
    const tokens = tokenize(content);
    if (tokens.length < 2) { diagnostics.push(makeDiagnostic("GITHUB_API_UNSUPPORTED", `CODEOWNERS line ${index + 1} is invalid under the supported subset.`, { observation: "ownership", remediation: "Use a valid CODEOWNERS pattern followed by at least one owner." })); return; }
    const pattern = tokens[0]!;
    if (pattern.startsWith("!") || pattern.includes("[") || pattern.includes("]") || pattern.includes("?")) { diagnostics.push(makeDiagnostic("GITHUB_API_UNSUPPORTED", `CODEOWNERS line ${index + 1} uses syntax outside the declared safe subset.`, { observation: "ownership", remediation: "Avoid negation, character classes, and unsupported wildcard syntax until a full conformance parser is adopted." })); return; }
    const owners = tokens.slice(1).map((owner) => safeAllowlistedString(owner, `CODEOWNERS line ${index + 1} owner`, 500));
    if (owners.some((owner) => owner.startsWith("@") && !owner.slice(1).includes("/") && owner.slice(1).length === 0)) { diagnostics.push(makeDiagnostic("GITHUB_API_UNSUPPORTED", `CODEOWNERS line ${index + 1} contains an empty owner.`, { observation: "ownership" })); return; }
    rules.push({ pattern: safeAllowlistedString(pattern, `CODEOWNERS line ${index + 1} pattern`, 100_000), owners, line: index + 1 });
  });
  return { rules, diagnostics };
}

function patternRegExp(pattern: string): RegExp {
  const anchored = pattern.startsWith("/");
  const value = pattern.replace(/^\//, "").replace(/\/$/, "/**");
  const escaped = value.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*");
  return new RegExp(anchored || value.includes("/") ? `^${escaped}$` : `^(?:.*/)?${escaped}$`);
}

function matchedOwners(rules: readonly CodeownersRule[], path: string): string[] {
  let owners: string[] = [];
  for (const rule of rules) if (patternRegExp(rule.pattern).test(path)) owners = rule.owners;
  return owners;
}

function decodeContent(body: unknown, path: string, cap: number): string {
  if (!isRecord(body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `CODEOWNERS response for ${path} was not an object.`, { observation: "ownership", snapshotEvaluable: false, exitCode: 2 }));
  const content = readString(body, "content");
  const encoding = readString(body, "encoding");
  const size = readPositiveInt(body, "size");
  if (readString(body, "path") !== path || content === undefined || encoding !== "base64" || size === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `CODEOWNERS response for ${path} had an unexpected encoding or identity.`, { observation: "ownership", snapshotEvaluable: false, exitCode: 2 }));
  if (size > cap) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_TOO_LARGE", `CODEOWNERS ${path} exceeded the response cap.`, { observation: "ownership" }));
  const compact = content.replace(/\s+/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `CODEOWNERS ${path} was not valid base64.`, { observation: "ownership", snapshotEvaluable: false, exitCode: 2 }));
  const bytes = Buffer.from(compact, "base64");
  if (bytes.length !== size) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `CODEOWNERS ${path} size did not match its bytes.`, { observation: "ownership", snapshotEvaluable: false, exitCode: 2 }));
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `CODEOWNERS ${path} was not valid UTF-8.`, { observation: "ownership", snapshotEvaluable: false, exitCode: 2 })); }
}

export async function collectCodeowners(client: GitHubClient, owner: string, name: string, baseSha: string, changedPaths: readonly string[], allowConfirmedAbsence = false, phase: "collection" | "finalization" = "collection"): Promise<CodeownersResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  const diagnostics: GitHubDiagnostic[] = [];
  let selectedPath: string | undefined;
  let text: string | undefined;
  let rawDigest: string | undefined;
  for (const path of CODEOWNERS_PATHS) {
    const response = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, query: { ref: baseSha } }, `CODEOWNERS:${path}`, phase);
    if (response.status === 200) { selectedPath = path; text = decodeContent(response.body, path, client.budget.limits.maxResponseBytes); rawDigest = sha256Text(text); break; }
    if (response.status === 403) { diagnostics.push(makeDiagnostic("GITHUB_PERMISSION_INSUFFICIENT", `GitHub denied CODEOWNERS lookup at ${path}.`, { observation: "ownership", permissionState: "insufficient" })); break; }
    if (response.status !== 404 || !allowConfirmedAbsence) { diagnostics.push(makeDiagnostic("GITHUB_RESOURCE_NOT_VISIBLE", `CODEOWNERS lookup at ${path} was not proven absent.`, { observation: "ownership", permissionState: "unknown" })); break; }
  }
  if (text === undefined || selectedPath === undefined || rawDigest === undefined) {
    const complete = allowConfirmedAbsence && diagnostics.length === 0;
    return { requirements: [], meta: { source: { kind: "github", identity: "codeowners" }, revision: baseSha, retrievedAt, complete, permissionState: complete ? "sufficient" : diagnostics.some((item) => item.permissionState === "insufficient") ? "insufficient" : "unknown", responseDigest: sha256Digest(diagnostics) }, diagnostics };
  }
  const parsed = parseRules(text);
  diagnostics.push(...parsed.diagnostics);
  const grouped = new Map<string, string[]>();
  for (const path of changedPaths) {
    const owners = matchedOwners(parsed.rules, path);
    if (owners.length === 0) continue;
    if (owners.some((ownerName) => ownerName.startsWith("@") && !ownerName.slice(1).includes("/") && ownerName.slice(1).length > 0)) diagnostics.push(makeDiagnostic("GITHUB_API_UNSUPPORTED", `CODEOWNERS owner syntax without an organization-qualified team is not used for authenticated qualification: ${owners.join(", ")}.`, { observation: "ownership", remediation: "Use @org/team for team owners or a user owner that can be qualified through the collaborator endpoint." }));
    const key = JSON.stringify([...owners].sort());
    const existing = grouped.get(key) ?? [];
    existing.push(path);
    grouped.set(key, existing);
  }
  const requirements: OwnershipRequirement[] = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key], index) => ({ id: `codeowners.${index + 1}`, owners: JSON.parse(key) as string[], requiredCount: 1 }));
  const complete = diagnostics.length === 0;
  return { requirements, selectedPath, source: { kind: "codeowners", identity: selectedPath, revision: baseSha, digest: rawDigest, authority: "enforced" }, meta: { source: { kind: "github", identity: selectedPath }, revision: baseSha, retrievedAt, complete, permissionState: complete ? "sufficient" : "unknown", responseDigest: sha256Digest({ rawDigest, rules: parsed.rules }) }, diagnostics };
}
