export const GITHUB_API_VERSION = "2026-03-10" as const;
export const GITHUB_API_ORIGIN = "https://api.github.com" as const;
export const GITHUB_ACCEPT = "application/vnd.github+json" as const;

export type GitHubHttpMethod = "GET" | "POST";
export type GitHubOperation = "pullRequestClosingIssues";
export type GitHubQueryValue = string | number | boolean;

export interface GitHubRequest {
  method: GitHubHttpMethod;
  path: string;
  query?: Readonly<Record<string, GitHubQueryValue>>;
  operation?: GitHubOperation;
  variables?: Readonly<Record<string, string | number | null>>;
}

export interface SafeResponseHeaders {
  link?: string;
  etag?: string;
  "last-modified"?: string;
  "x-ratelimit-remaining"?: string;
  "x-ratelimit-reset"?: string;
  "x-ratelimit-resource"?: string;
  "retry-after"?: string;
  "x-github-api-version"?: string;
  "content-type"?: string;
  location?: string;
}

export interface GitHubResponse<T = unknown> {
  status: number;
  headers: SafeResponseHeaders;
  body: T;
  bytes: number;
}

export interface GitHubReadTransport {
  request(input: GitHubRequest): Promise<GitHubResponse<unknown>>;
}

export interface RawRepository {
  id: number;
  name: string;
  full_name: string;
  default_branch?: string;
  owner?: RawUser;
}

export interface RawRepositoryRef {
  id: number;
  full_name?: string;
  name?: string;
}

export interface RawUser {
  id: number;
  login: string;
  type?: string;
}

export interface RawPullRequest {
  id: number;
  number: number;
  state?: string;
  base: { ref: string; sha: string; repo: RawRepositoryRef };
  head: { ref: string; sha: string; repo: RawRepositoryRef };
  merge_commit_sha?: string | null;
  user?: RawUser;
}

export interface RawPullFile {
  filename: string;
  status: string;
  previous_filename?: string;
}

export interface RawContentFile {
  type: "file";
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
}

export interface RawReview {
  id: number;
  user: RawUser | null;
  state: string;
  commit_id: string;
  submitted_at?: string | null;
  author_association?: string;
}

export interface RawCheckRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  head_sha: string;
  app?: { id?: number; slug?: string } | null;
  check_suite?: { id: number } | null;
}

export interface RawWorkflowRun {
  id: number;
  run_attempt?: number;
  head_sha: string;
  event: string;
  workflow_id: number;
  path?: string;
  check_suite_id?: number;
  status: string;
  conclusion?: string | null;
}

export interface RawCollaboratorPermission {
  user?: RawUser;
  permission?: string;
  role_name?: string;
}

export interface RawTeam {
  id: number;
  slug: string;
  name?: string;
  organization?: { login: string };
}

export interface RawTeamMembership {
  state: string;
  role?: string;
  user?: RawUser;
}

export interface RawRuleset {
  id: number;
  name: string;
  target?: string;
  source_type?: string;
  source?: string;
  enforcement: string;
  bypass_actors?: Array<{ actor_id?: number; actor_type?: string; bypass_mode?: string }>;
  conditions?: Record<string, unknown>;
  rules?: Array<{ type?: string; parameters?: Record<string, unknown> }>;
  node_id?: string;
}

export interface RawBranchProtection {
  required_status_checks?: {
    strict?: boolean;
    contexts?: string[];
    checks?: Array<{ context?: string; app_id?: number | null }>;
  } | null;
  required_pull_request_reviews?: {
    dismiss_stale_reviews?: boolean;
    require_code_owner_reviews?: boolean;
    required_approving_review_count?: number;
    require_last_push_approval?: boolean;
    bypass_pull_request_allowances?: Record<string, unknown>;
  } | null;
  bypass_pull_request_allowances?: Record<string, unknown>;
}

export interface RawWorkflowRunsPage {
  total_count?: number;
  workflow_runs: RawWorkflowRun[];
}

export interface RawGraphQlIssue {
  repository: { nameWithOwner: string; id?: string };
  number: number;
  id?: string;
}

export interface RawGraphQlClosingIssues {
  data?: {
    repository?: {
      pullRequest?: {
        closingIssuesReferences?: {
          nodes?: Array<RawGraphQlIssue | { issue?: RawGraphQlIssue | null } | null>;
          pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
        };
      } | null;
    };
  };
  errors?: Array<{ type?: string; message?: string }>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "string" ? item : undefined;
}

export function readPositiveInt(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "number" && Number.isInteger(item) && item > 0 ? item : undefined;
}

export function hasArray(value: unknown, key: string): value is Record<string, unknown> & { [key: string]: unknown[] } {
  return isRecord(value) && Array.isArray(value[key]);
}
