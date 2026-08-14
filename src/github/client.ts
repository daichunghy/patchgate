import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";
import { GITHUB_ACCEPT, GITHUB_API_ORIGIN, GITHUB_API_VERSION, type GitHubReadTransport, type GitHubRequest, type GitHubResponse, type SafeResponseHeaders } from "./api-types.js";
import { BudgetLedger, type RequestPhase } from "./request-budget.js";
import { boundedRetryDelay, type RetryClock } from "./retry.js";

const GRAPHQL_DOCUMENTS: Record<string, string> = {
  pullRequestClosingIssues: `query PullRequestClosingIssues($owner: String!, $name: String!, $number: Int!, $first: Int!, $after: String) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { closingIssuesReferences(first: $first, after: $after, userLinkedOnly: true) { nodes { issue { id repository { nameWithOwner id } number } } pageInfo { hasNextPage endCursor } } } } }`,
};

export interface GitHubClientOptions {
  origin?: string;
  apiVersion?: string;
  userAgent?: string;
  token?: string;
  maxResponseBytes?: number;
  clock?: RetryClock;
}

const SAFE_HEADERS = new Set(["link", "etag", "last-modified", "x-ratelimit-remaining", "x-ratelimit-reset", "x-ratelimit-resource", "retry-after", "x-github-api-version", "content-type", "location"]);

function trustedOrigin(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username.length > 0 || parsed.password.length > 0 || parsed.pathname !== "/" || parsed.search.length > 0 || parsed.hash.length > 0) throw new Error("GitHub API origin must be a trusted HTTPS origin without credentials or path components");
  return parsed.origin;
}

function safeHeaders(headers: Headers): SafeResponseHeaders {
  const output: SafeResponseHeaders = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (!SAFE_HEADERS.has(lower)) continue;
    if (lower === "link") output.link = value;
    else if (lower === "etag") output.etag = value;
    else if (lower === "last-modified") output["last-modified"] = value;
    else if (lower === "x-ratelimit-remaining") output["x-ratelimit-remaining"] = value;
    else if (lower === "x-ratelimit-reset") output["x-ratelimit-reset"] = value;
    else if (lower === "x-ratelimit-resource") output["x-ratelimit-resource"] = value;
    else if (lower === "retry-after") output["retry-after"] = value;
    else if (lower === "x-github-api-version") output["x-github-api-version"] = value;
    else if (lower === "content-type") output["content-type"] = value;
    else if (lower === "location") output.location = value;
  }
  return output;
}

function parseBody(text: string, contentType: string | undefined): unknown {
  if (text.length === 0) return null;
  if (contentType?.toLowerCase().includes("json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }
  return text;
}

function encodeRequestUrl(origin: string, input: GitHubRequest): URL {
  if (!input.path.startsWith("/") || input.path.startsWith("//") || input.path.includes("\0")) throw new Error("GitHub request path is invalid");
  const url = new URL(input.path, origin);
  if (url.origin !== origin || url.protocol !== "https:" || url.username.length > 0 || url.password.length > 0) throw new Error("GitHub request origin is not trusted");
  if (input.query !== undefined) {
    for (const [key, value] of Object.entries(input.query)) url.searchParams.set(key, String(value));
  }
  return url;
}

export function createFetchTransport(options: GitHubClientOptions = {}): GitHubReadTransport {
  const origin = options.origin ?? GITHUB_API_ORIGIN;
  const normalizedOrigin = trustedOrigin(origin);
  const apiVersion = options.apiVersion ?? GITHUB_API_VERSION;
  const userAgent = options.userAgent ?? "patchgate-github-adapter/0.1";
  const maxResponseBytes = options.maxResponseBytes ?? 2 * 1024 * 1024;
  const timeoutMs = 15_000;
  return {
    async request(input): Promise<GitHubResponse<unknown>> {
      if (input.method === "GET" && (input.operation !== undefined || input.variables !== undefined)) throw new Error("GET request cannot carry a GraphQL operation");
      const url = encodeRequestUrl(normalizedOrigin, input);
      const headers = new Headers({ Accept: GITHUB_ACCEPT, "X-GitHub-Api-Version": apiVersion, "User-Agent": userAgent });
      if (options.token !== undefined) headers.set("Authorization", `Bearer ${options.token}`);
      if (input.method === "POST") {
        if (input.operation !== "pullRequestClosingIssues" || input.path !== "/graphql" || input.variables === undefined) throw new Error("GraphQL operation is not allowlisted");
        headers.set("Content-Type", "application/json");
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: input.method,
          headers,
          redirect: "manual",
          signal: controller.signal,
          ...(input.method === "POST" ? { body: JSON.stringify({ query: GRAPHQL_DOCUMENTS.pullRequestClosingIssues, operationName: "pullRequestClosingIssues", variables: input.variables }) } : {}),
        });
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maxResponseBytes) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_TOO_LARGE", "GitHub response exceeded the configured byte budget.", { remediation: "Reduce the requested collection or raise the bounded response limit after review." }));
        const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        return { status: response.status, headers: safeHeaders(response.headers), body: parseBody(text, response.headers.get("content-type") ?? undefined), bytes: bytes.byteLength };
      } catch (error) {
        if (error instanceof GitHubAdapterError) throw error;
        if (error instanceof Error && error.name === "AbortError") throw new GitHubAdapterError(makeDiagnostic("GITHUB_TIMEOUT", "GitHub request timed out.", { retryable: true }));
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export class GitHubClient {
  readonly transport: GitHubReadTransport;
  readonly budget: BudgetLedger;
  readonly origin: string;
  readonly apiVersion: string;
  readonly authKind: "authenticated_token" | "anonymous" | "mock";
  readonly clock: RetryClock;

  constructor(transport: GitHubReadTransport, budget = new BudgetLedger(), options: GitHubClientOptions = {}) {
    this.transport = transport;
    this.budget = budget;
    this.origin = trustedOrigin(options.origin ?? GITHUB_API_ORIGIN);
    this.apiVersion = options.apiVersion ?? GITHUB_API_VERSION;
    this.authKind = options.token === undefined ? "mock" : "authenticated_token";
    this.clock = options.clock ?? { now: () => Date.now(), sleep: async (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)) };
  }

  async request(input: GitHubRequest, group: string, phase: RequestPhase = "collection"): Promise<GitHubResponse<unknown>> {
    if (input.method === "POST" && (input.path !== "/graphql" || input.operation !== "pullRequestClosingIssues" || input.variables === undefined)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "The requested POST operation is not allowlisted.", { remediation: "Use only the documented read-only GraphQL operation." }));
    if (input.method === "GET" && (input.operation !== undefined || input.variables !== undefined)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", "The requested GET operation carried unexpected GraphQL data.", { remediation: "Use a plain allowlisted REST GET request." }));
    let attempt = 0;
    while (true) {
      this.budget.beginRequest(phase);
      try {
        const response = await this.transport.request(input);
        if (!Number.isInteger(response.bytes) || response.bytes < 0 || response.bytes > this.budget.limits.maxResponseBytes) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_TOO_LARGE", "The injected GitHub response exceeded the configured response byte budget.", { remediation: "Discard the response and keep the bounded response limit enforced by the transport." }));
        this.budget.recordResponseBytes(response.bytes);
        const remaining = response.headers["x-ratelimit-remaining"] === undefined ? undefined : Number(response.headers["x-ratelimit-remaining"]);
        const resetAt = response.headers["x-ratelimit-reset"] === undefined ? undefined : Number(response.headers["x-ratelimit-reset"]);
        this.budget.recordRateLimit(Number.isFinite(remaining) ? remaining : undefined, Number.isFinite(resetAt) ? resetAt : undefined, response.headers["x-ratelimit-resource"]);
        if (response.status === 304) this.budget.recordConditional(true);
        if (response.status >= 200 && response.status < 300) { this.budget.recordSuccess(); return response; }
        if (response.status === 401) throw new GitHubAdapterError(makeDiagnostic("GITHUB_AUTH_INVALID", "GitHub rejected the configured credential.", { remediation: "Use a read-only credential with the documented repository and organization permissions." }));
        if (response.status === 304) throw new GitHubAdapterError(makeDiagnostic("GITHUB_CACHE_IDENTITY_MISMATCH", "GitHub returned 304 but no validated authenticated cache body is available for reuse.", { remediation: "Retry without conditional cache state or use the deferred no-cache adapter path." }));
        if (response.status === 302 || (response.status >= 300 && response.status < 400)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_REDIRECT", "GitHub returned a redirect; the adapter never follows redirects.", { remediation: "Use the configured GitHub API origin and inspect the endpoint configuration." }));
        const isRateLimited = response.status === 429 || (response.status === 403 && (response.headers["retry-after"] !== undefined || response.headers["x-ratelimit-remaining"] === "0"));
        const retryable = isRateLimited || response.status >= 500;
        if (retryable && attempt < this.budget.limits.maxRetriesPerRequest) {
          attempt += 1;
          await boundedRetryDelay(isRateLimited ? (response.headers["retry-after"] === undefined ? "primary_rate_limit" : "secondary_rate_limit") : "server_5xx", response.headers, this.budget, this.clock);
          continue;
        }
        this.budget.recordFailure();
        if (isRateLimited) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RATE_LIMITED", `GitHub rate-limited the ${group} request.`, { remediation: "Wait for the bounded reset/retry window and rerun the snapshot.", permissionState: "unknown" }));
        if (response.status === 403) return response;
        if (response.status === 404) return response;
        throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `GitHub returned HTTP ${response.status} for the ${group} request.`, { remediation: "Inspect the endpoint capability and rerun against the same immutable target." }));
      } catch (error) {
        if (error instanceof GitHubAdapterError) {
          if (error.diagnostic.retryable && attempt < this.budget.limits.maxRetriesPerRequest) {
            attempt += 1;
            await boundedRetryDelay(error.diagnostic.id === "GITHUB_TIMEOUT" ? "network_timeout" : "server_5xx", {}, this.budget, this.clock);
            continue;
          }
          this.budget.recordFailure();
          throw error;
        }
        this.budget.recordFailure();
        throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The injected GitHub transport failed without a safe response.", { snapshotEvaluable: false, exitCode: 2 }));
      }
    }
  }
}
