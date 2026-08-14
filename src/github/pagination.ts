import { sha256Digest } from "../canonical-json.js";
import type { GitHubRequest } from "./api-types.js";
import { GitHubAdapterError, makeDiagnostic, diagnosticFrom, type GitHubDiagnostic } from "./diagnostics.js";
import { GitHubClient } from "./client.js";
import type { RequestPhase } from "./request-budget.js";

export interface PageCollection<T> {
  items: T[];
  complete: boolean;
  permissionState: "sufficient" | "insufficient" | "unknown";
  diagnostics: GitHubDiagnostic[];
  pageDigests: string[];
}

function parseLinkParts(header: string): Array<{ url: string; rel: string[] }> {
  return header.split(/,(?=\s*<)/).flatMap((part) => {
    const match = /^\s*<([^>]+)>\s*(.*)$/.exec(part);
    if (match === null) return [];
    const parameters = match[2] ?? "";
    const rel = /rel\s*=\s*"([^"]+)"/i.exec(parameters)?.[1] ?? /rel\s*=\s*([^;\s]+)/i.exec(parameters)?.[1] ?? "";
    const url = match[1];
    if (url === undefined) return [];
    return [{ url, rel: rel.split(/\s+/).filter(Boolean) }];
  });
}

export function parseNextLink(link: string | undefined, origin: string): string | undefined {
  if (link === undefined) return undefined;
  const next = parseLinkParts(link).find((part) => part.rel.includes("next"));
  if (next === undefined) return undefined;
  const url = new URL(next.url, origin);
  if (url.origin !== origin || url.protocol !== "https:" || url.username.length > 0 || url.password.length > 0) {
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "GitHub pagination pointed outside the configured API origin.", { remediation: "Discard the snapshot and rerun with a trusted GitHub API origin." }));
  }
  return url.toString();
}

function requestFromNextUrl(value: string, origin: string): GitHubRequest {
  const url = new URL(value);
  if (url.origin !== origin) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", "The next-page URL origin changed.", { remediation: "Discard the snapshot and inspect the API response provenance." }));
  const query: Record<string, string> = {};
  for (const [key, item] of url.searchParams.entries()) query[key] = item;
  return { method: "GET", path: url.pathname, ...(Object.keys(query).length === 0 ? {} : { query }) };
}

export async function collectPaginated<T>(
  client: GitHubClient,
  initial: GitHubRequest,
  group: string,
  parse: (body: unknown) => T[],
  identity: (item: T) => string,
  options: { phase?: RequestPhase; maxItems?: number; allowConfirmedAbsence?: boolean; pageSize?: number } = {},
): Promise<PageCollection<T>> {
  const items: T[] = [];
  const diagnostics: GitHubDiagnostic[] = [];
  const pageDigests: string[] = [];
  const seenPages = new Set<string>();
  const seenItems = new Set<string>();
  let request = initial;
  let complete = true;
  let permissionState: "sufficient" | "insufficient" | "unknown" = "sufficient";
  const maxItems = options.maxItems ?? client.budget.limits.maxItemsPerGroup;
  const pageSize = options.pageSize ?? (typeof initial.query?.per_page === "number" ? initial.query.per_page : 100);
  while (true) {
    try {
      const response = await client.request(request, group, options.phase ?? "collection");
      if (response.status === 403) {
        complete = false; permissionState = "insufficient";
        diagnostics.push(makeDiagnostic("GITHUB_PERMISSION_INSUFFICIENT", `GitHub denied the ${group} collection.`, { observation: group, permissionState, remediation: `Grant the minimum read permission for ${group}, or keep the dependent requirement non-ready.` }));
        break;
      }
      if (response.status === 404 && options.allowConfirmedAbsence === true) {
        complete = true;
        permissionState = "sufficient";
        break;
      }
      if (response.status === 404) {
        complete = false; permissionState = "unknown";
        diagnostics.push(makeDiagnostic("GITHUB_RESOURCE_NOT_VISIBLE", `GitHub did not expose the ${group} resource.`, { observation: group, permissionState, remediation: `Confirm repository visibility and endpoint permission for ${group}; a hidden 404 is not treated as absence.` }));
        break;
      }
      const pageKey = JSON.stringify(request);
      if (seenPages.has(pageKey)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `The ${group} pagination cursor repeated.`, { observation: group }));
      seenPages.add(pageKey);
      const parsed = parse(response.body);
      pageDigests.push(sha256Digest(response.body));
      if (!client.budget.recordPage(group)) {
        complete = false;
        diagnostics.push(makeDiagnostic("GITHUB_PAGINATION_LIMIT", `The ${group} pagination budget was exhausted.`, { observation: group, remediation: "Rerun with a bounded page budget that proves the complete collection." }));
        break;
      }
      for (const item of parsed) {
        if (items.length >= maxItems) {
          client.budget.recordItemCap(group);
          complete = false;
          diagnostics.push(makeDiagnostic("GITHUB_ITEM_LIMIT", `The ${group} item budget was exhausted.`, { observation: group, remediation: "Reduce the collection or raise the reviewed item cap; truncated evidence cannot satisfy a requirement." }));
          break;
        }
        const key = identity(item);
        if (seenItems.has(key)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `The ${group} collection repeated an immutable item identity.`, { observation: group, remediation: "Discard the snapshot; repeated page data cannot be promoted to complete evidence." }));
        seenItems.add(key);
        items.push(item);
      }
      if (!complete) break;
      const next = parseNextLink(response.headers.link, client.origin);
      if (next === undefined && parsed.length >= pageSize) {
        complete = false;
        diagnostics.push(makeDiagnostic("GITHUB_PAGINATION_LIMIT", `The ${group} response reached its page-size boundary without a trusted next link.`, { observation: group, remediation: "Require a trustworthy end-of-pagination signal before treating the collection as complete." }));
      }
      if (next === undefined) break;
      request = requestFromNextUrl(next, client.origin);
    } catch (error) {
      const diagnostic = diagnosticFrom(error);
      diagnostics.push(diagnostic);
      complete = false;
      permissionState = diagnostic.permissionState;
      break;
    }
  }
  return { items, complete, permissionState, diagnostics, pageDigests };
}
