import { sha256Digest } from "../canonical-json.js";
import type { ObservationMeta } from "../types.js";
import { isRecord, readString } from "./api-types.js";
import { collectPaginated, type PageCollection } from "./pagination.js";
import { GitHubClient } from "./client.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { safeAllowlistedString } from "./redaction.js";

export interface ChangedFile {
  path: string;
  status: string;
  previousPath?: string;
}

export interface ChangedPathsResult {
  files: ChangedFile[];
  paths: string[];
  meta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
}

function normalizePath(value: string, label: string): string {
  const path = safeAllowlistedString(value, label, 100_000);
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path) || path.includes("\0") || path.split(/[\\/]/).some((segment) => segment === ".." || segment === ".")) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PATH_INVALID", `${label} is absolute or traversal-shaped.`, { observation: "changedPaths", remediation: "Discard the snapshot and inspect the GitHub changed-file response." }));
  return path;
}

function parseFiles(body: unknown): ChangedFile[] {
  if (!Array.isArray(body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The changed-files response was not an array.", { observation: "changedPaths", snapshotEvaluable: false, exitCode: 2 }));
  return body.map((value, index) => {
    if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Changed-file item ${index} was not an object.`, { observation: "changedPaths", snapshotEvaluable: false, exitCode: 2 }));
    const filename = readString(value, "filename");
    const status = readString(value, "status");
    if (filename === undefined || status === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Changed-file item ${index} lacked filename or status.`, { observation: "changedPaths", snapshotEvaluable: false, exitCode: 2 }));
    const previous = readString(value, "previous_filename");
    return { path: normalizePath(filename, `changed file ${index}`), status: safeAllowlistedString(status, `changed file ${index} status`, 64), ...(previous === undefined ? {} : { previousPath: normalizePath(previous, `renamed file ${index}`) }) };
  });
}

function pageCollectionToResult(collection: PageCollection<ChangedFile>, client: GitHubClient, headSha: string): ChangedPathsResult {
  const paths = new Set<string>();
  for (const file of collection.items) { paths.add(file.path); if (file.previousPath !== undefined) paths.add(file.previousPath); }
  let complete = collection.complete;
  const diagnostics = [...collection.diagnostics];
  if (collection.items.length >= 3000) { complete = false; client.budget.recordCap("github_file_ceiling_3000"); diagnostics.push(makeDiagnostic("GITHUB_PAGINATION_LIMIT", "GitHub file retrieval reached the documented 3,000-file ceiling; completeness cannot be proven.", { observation: "changedPaths", remediation: "Split the pull request or use a deliberately supported larger-file retrieval strategy." })); }
  const files = [...collection.items].sort((a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status));
  return {
    files,
    paths: [...paths].sort(),
    meta: { source: { kind: "github", identity: "pull-request-files" }, revision: headSha, retrievedAt: new Date(client.clock.now()).toISOString(), complete, permissionState: collection.permissionState, responseDigest: sha256Digest(collection.pageDigests) },
    diagnostics,
  };
}

export async function collectChangedPaths(client: GitHubClient, owner: string, name: string, pullNumber: number, headSha: string, phase: "collection" | "finalization" = "collection"): Promise<ChangedPathsResult> {
  const collection = await collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${pullNumber}/files`, query: { per_page: 100 } }, "changedPaths", parseFiles, (item) => `${item.path}\u0000${item.previousPath ?? ""}`, { phase });
  return pageCollectionToResult(collection, client, headSha);
}

