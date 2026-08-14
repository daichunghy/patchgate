import type { PermissionState } from "../types.js";

export type DiagnosticId =
  | "GITHUB_AUTH_REQUIRED"
  | "GITHUB_AUTH_INVALID"
  | "GITHUB_PERMISSION_INSUFFICIENT"
  | "GITHUB_RESOURCE_NOT_VISIBLE"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_RETRY_EXHAUSTED"
  | "GITHUB_TIMEOUT"
  | "GITHUB_RESPONSE_MALFORMED"
  | "GITHUB_RESPONSE_TOO_LARGE"
  | "GITHUB_PAGINATION_LIMIT"
  | "GITHUB_ITEM_LIMIT"
  | "GITHUB_API_UNSUPPORTED"
  | "GITHUB_TARGET_CHANGED"
  | "GITHUB_IDENTITY_MISMATCH"
  | "GITHUB_PROVENANCE_AMBIGUOUS"
  | "GITHUB_CACHE_IDENTITY_MISMATCH"
  | "GITHUB_REQUEST_BUDGET"
  | "GITHUB_RESPONSE_REDIRECT"
  | "GITHUB_PATH_INVALID"
  | "GITHUB_POLICY_INVALID"
  | "GITHUB_POLICY_ABSENT";

export interface GitHubDiagnostic {
  id: DiagnosticId;
  message: string;
  remediation: string;
  observation?: string;
  complete: boolean;
  permissionState: PermissionState;
  retryable: boolean;
  snapshotEvaluable: boolean;
  exitCode: 1 | 2;
}

const defaultRemediation = "Inspect the authenticated read-only capability and rerun the snapshot against the same target SHA.";

export function makeDiagnostic(
  id: DiagnosticId,
  message: string,
  options: Partial<Omit<GitHubDiagnostic, "id" | "message">> = {},
): GitHubDiagnostic {
  const snapshotEvaluable = options.snapshotEvaluable ?? true;
  return {
    id,
    message,
    remediation: options.remediation ?? defaultRemediation,
    ...(options.observation === undefined ? {} : { observation: options.observation }),
    complete: options.complete ?? false,
    permissionState: options.permissionState ?? "unknown",
    retryable: options.retryable ?? false,
    snapshotEvaluable,
    exitCode: options.exitCode ?? (snapshotEvaluable ? 1 : 2),
  };
}

export class GitHubAdapterError extends Error {
  readonly diagnostic: GitHubDiagnostic;

  constructor(diagnostic: GitHubDiagnostic) {
    super(diagnostic.message);
    this.name = "GitHubAdapterError";
    this.diagnostic = diagnostic;
  }
}

export function diagnosticFrom(error: unknown, fallback: DiagnosticId = "GITHUB_RESPONSE_MALFORMED"): GitHubDiagnostic {
  if (error instanceof GitHubAdapterError) return error.diagnostic;
  const message = error instanceof Error ? error.message : "GitHub adapter operation failed";
  return makeDiagnostic(fallback, message, { snapshotEvaluable: false, exitCode: 2 });
}

