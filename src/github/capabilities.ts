import type { PermissionState } from "../types.js";
import type { GitHubDiagnostic } from "./diagnostics.js";
import type { SnapshotIdentity } from "./identity.js";

export interface CapabilityObservation {
  endpoint: string;
  capability: string;
  state: PermissionState | "supported" | "unsupported";
  affectedRequirements: string[];
  remediation: string;
}

export interface GitHubCapabilityReport {
  authKind: "authenticated_token" | "anonymous" | "mock";
  apiOrigin: string;
  apiVersion: string;
  repository?: { owner: string; name: string; repositoryId: number };
  target?: { pullRequest: number; baseSha: string; headSha: string; testedSha: string; targetKind: string };
  observations: CapabilityObservation[];
  diagnostics: GitHubDiagnostic[];
  supportedPlatform: "github.com" | "ghes_unsupported";
}

export function capabilityReport(identity: SnapshotIdentity | undefined, authKind: GitHubCapabilityReport["authKind"], apiOrigin: string, apiVersion: string, observations: CapabilityObservation[], diagnostics: GitHubDiagnostic[]): GitHubCapabilityReport {
  return { authKind, apiOrigin, apiVersion, ...(identity === undefined ? {} : { repository: { owner: identity.owner, name: identity.name, repositoryId: identity.repositoryId }, target: { pullRequest: identity.pullRequestNumber, baseSha: identity.baseSha, headSha: identity.headSha, testedSha: identity.testedSha, targetKind: identity.targetKind } }), observations, diagnostics, supportedPlatform: apiOrigin === "https://api.github.com" ? "github.com" : "ghes_unsupported" };
}
