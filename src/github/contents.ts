import { createHash } from "node:crypto";
import { sha256Digest } from "../canonical-json.js";
import { createTrustedPolicyArtifact, type TrustedPolicyArtifact } from "../policy.js";
import type { ObservationMeta, PolicySource } from "../types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubAdapterError, makeDiagnostic, diagnosticFrom, type GitHubDiagnostic } from "./diagnostics.js";
import { GitHubClient } from "./client.js";
import { redactForReport } from "./redaction.js";

export interface BasePolicyResult {
  artifact?: TrustedPolicyArtifact;
  source?: PolicySource;
  meta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
  rawDigest?: string;
  rawBytesDigest?: string;
}

function responseDigest(response: { status: number; headers: unknown; body: unknown }): string {
  return sha256Digest(redactForReport({ status: response.status, headers: response.headers, body: response.body }));
}

export async function fetchTrustedBasePolicy(client: GitHubClient, owner: string, name: string, baseSha: string, allowConfirmedAbsence = false, phase: "collection" | "finalization" = "collection"): Promise<BasePolicyResult> {
  const retrievedAt = new Date(client.clock.now()).toISOString();
  const policyPaths = ["patchgate.yml", ".github/patchgate.yml"] as const;
  let selectedPath: string = policyPaths[0];
  const responseDigests: string[] = [];
  try {
    let response: Awaited<ReturnType<GitHubClient["request"]>> | undefined;
    for (const path of policyPaths) {
      selectedPath = path;
      const candidate = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, query: { ref: baseSha } }, `base policy:${path}`, phase);
      responseDigests.push(responseDigest(candidate));
      if (candidate.status === 404 && path !== policyPaths[policyPaths.length - 1]) continue;
      response = candidate;
      break;
    }
    if (response === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESOURCE_NOT_VISIBLE", "The trusted base policy lookup did not return a terminal response.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    const responseDigestValue = sha256Digest(responseDigests);
    if (response.status === 403) return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: false, permissionState: "insufficient", responseDigest: responseDigestValue }, diagnostics: [makeDiagnostic("GITHUB_PERMISSION_INSUFFICIENT", "GitHub denied access to the trusted base policy.", { observation: "policySources", remediation: "Grant Contents: read to the read-only credential; do not use the PR head as a fallback." })] };
    if (response.status === 404) {
      const diagnosticId = allowConfirmedAbsence ? "GITHUB_POLICY_ABSENT" : "GITHUB_RESOURCE_NOT_VISIBLE";
      return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: allowConfirmedAbsence, permissionState: allowConfirmedAbsence ? "sufficient" : "unknown", responseDigest: responseDigestValue }, diagnostics: [makeDiagnostic(diagnosticId, allowConfirmedAbsence ? "No supported patchgate.yml path exists at the trusted base revision." : "The trusted base policy is not visible; a hidden 404 is not treated as absence.", { observation: "policySources", permissionState: allowConfirmedAbsence ? "sufficient" : "unknown", complete: allowConfirmedAbsence, remediation: allowConfirmedAbsence ? "Confirm whether the repository intentionally operates without a structured PatchGate policy; this is never an empty green policy." : "Confirm Contents: read and repository visibility, then rerun the snapshot." })] };
    }
    if (response.status !== 200 || !isRecord(response.body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The base policy contents response was not a successful file object.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    const type = readString(response.body, "type");
    const encoding = readString(response.body, "encoding");
    const content = readString(response.body, "content");
    const path = readString(response.body, "path");
    const size = readPositiveInt(response.body, "size");
    if (type !== "file" || encoding !== "base64" || content === undefined || path !== selectedPath || size === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The base policy file response had an unexpected encoding, path, or size.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    if (size > client.budget.limits.maxResponseBytes || content.length > client.budget.limits.maxResponseBytes * 2) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_TOO_LARGE", "The trusted base policy exceeded the configured response budget.", { observation: "policySources", remediation: "Reduce the policy artifact or raise the reviewed response cap." }));
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content.replace(/\s+/g, ""))) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The trusted base policy was not valid base64.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    const bytes = Buffer.from(content.replace(/\s+/g, ""), "base64");
    if (bytes.length !== size) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The trusted base policy byte count did not match the API size.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The trusted base policy was not valid UTF-8.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 })); }
    let artifact: TrustedPolicyArtifact;
    try { artifact = createTrustedPolicyArtifact(text, { identity: selectedPath, revision: baseSha }, selectedPath); } catch (error) { throw new GitHubAdapterError(makeDiagnostic("GITHUB_POLICY_INVALID", error instanceof Error ? error.message : "The trusted base policy failed validation.", { observation: "policySources", remediation: "Repair patchgate.yml at the base revision and rerun the snapshot." })); }
    const rawBytesDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const source: PolicySource = { ...artifact.source, digest: rawBytesDigest };
    return { artifact, source, rawDigest: rawBytesDigest, rawBytesDigest, meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: true, permissionState: "sufficient", responseDigest: responseDigestValue }, diagnostics: [] };
  } catch (error) {
    const diagnostic = diagnosticFrom(error, "GITHUB_POLICY_INVALID");
    return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: false, permissionState: diagnostic.permissionState, ...(responseDigests.length === 0 ? {} : { responseDigest: sha256Digest(responseDigests) }) }, diagnostics: [diagnostic] };
  }
}
