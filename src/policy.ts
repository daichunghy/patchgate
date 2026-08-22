import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename, join } from "node:path";
import { parse } from "yaml";
import { sha256Text } from "./canonical-json.js";
import { normalizedPolicyDigest } from "./evidence/digests.js";
import { assertPatchgatePolicy } from "./contract/validation.js";
import type {
  ExpectedSource,
  PatchgatePolicy,
  PolicyChangePolicy,
  PolicySource,
  ReviewabilityPolicy,
  SensitivePathRule,
} from "./types.js";

export interface TrustedPolicyArtifact {
  path: string;
  digest: string;
  contractDigest: string;
  policy: PatchgatePolicy;
  source: PolicySource;
}

const execFileAsync = promisify(execFile);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function field(record: Record<string, unknown>, camel: string, snake: string): unknown {
  if (camel !== snake && record[camel] !== undefined && record[snake] !== undefined) {
    throw new Error(`${camel} and ${snake} must not both be provided`);
  }
  return record[camel] ?? record[snake];
}

function assertKnownKeys(record: Record<string, unknown>, allowed: readonly string[], context: string): void {
  const unknown = Object.keys(record).find((key) => !allowed.includes(key));
  if (unknown !== undefined) throw new Error(`${context}.${unknown} is an unsupported field`);
}

function nonEmpty(value: string, key: string): string {
  if (value.trim().length === 0) throw new Error(`${key} must be a non-empty string`);
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`${key} must be a non-empty string`);
  return nonEmpty(value, key);
}

function requiredNumber(record: Record<string, unknown>, camel: string, snake: string): number {
  const value = field(record, camel, snake);
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${camel} must be a finite number`);
  return value;
}

function requiredBoolean(record: Record<string, unknown>, camel: string, snake: string): boolean {
  const value = field(record, camel, snake);
  if (typeof value !== "boolean") throw new Error(`${camel} must be boolean`);
  return value;
}

function stringArray(value: unknown, key: string, minimum = 0): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${key} must be an array of non-empty strings`);
  }
  if (value.length < minimum) throw new Error(`${key} must contain at least ${minimum} item(s)`);
  if (new Set(value).size !== value.length) throw new Error(`${key} must not contain duplicate values`);
  return value;
}

function optionalRecord(record: Record<string, unknown>, camel: string, snake: string): Record<string, unknown> | undefined {
  const value = field(record, camel, snake);
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`${camel} must be an object`);
  return value;
}

function normalizeExpectedSource(value: unknown): ExpectedSource {
  if (value === undefined) throw new Error("requiredChecks.expectedSource is required");
  if (!isRecord(value)) throw new Error("expectedSource must be an object");
  assertKnownKeys(value, ["kind", "appSlug", "app_slug", "appId", "app_id", "workflowId", "workflow_id", "workflowPath", "workflow_path", "event"], "expectedSource");
  const kind = value.kind;
  if (kind !== "github_app_expected" && kind !== "github_actions_workflow") {
    throw new Error("expectedSource.kind is unsupported");
  }
  const appSlug = field(value, "appSlug", "app_slug");
  const appId = field(value, "appId", "app_id");
  const workflowId = field(value, "workflowId", "workflow_id");
  const workflowPath = field(value, "workflowPath", "workflow_path");
  const event = value.event;
  if (appSlug !== undefined && (typeof appSlug !== "string" || appSlug.trim().length === 0)) throw new Error("expectedSource.appSlug must be a non-empty string");
  if (appId !== undefined && (typeof appId !== "number" || !Number.isInteger(appId) || appId < 1)) throw new Error("expectedSource.appId must be a positive integer");
  if (workflowId !== undefined && (typeof workflowId !== "number" || !Number.isInteger(workflowId) || workflowId < 1)) throw new Error("expectedSource.workflowId must be a positive integer");
  if (workflowPath !== undefined && (typeof workflowPath !== "string" || workflowPath.trim().length === 0)) throw new Error("expectedSource.workflowPath must be a non-empty string");
  if (event !== undefined && (typeof event !== "string" || event.trim().length === 0)) throw new Error("expectedSource.event must be a non-empty string");
  if (kind === "github_app_expected" && appId === undefined) throw new Error("GitHub App expected source must identify an immutable appId");
  if (kind === "github_actions_workflow" && (appId === undefined || (workflowId === undefined && workflowPath === undefined))) {
    throw new Error("GitHub Actions expected source must identify appId and workflowId or workflowPath");
  }
  return {
    kind,
    ...(appSlug === undefined ? {} : { appSlug }),
    ...(appId === undefined ? {} : { appId }),
    ...(workflowId === undefined ? {} : { workflowId }),
    ...(workflowPath === undefined ? {} : { workflowPath }),
    ...(event === undefined ? {} : { event }),
  };
}

function normalizePolicy(parsed: Record<string, unknown>): PatchgatePolicy {
  assertKnownKeys(parsed, ["version", "issueLinkage", "issue_linkage", "requiredChecks", "required_checks", "ownership", "sensitivePaths", "sensitive_paths", "policyChanges", "policy_changes", "reviewability"], "policy");
  const normalized: PatchgatePolicy = { version: 1 };
  const issueLinkage = optionalRecord(parsed, "issueLinkage", "issue_linkage");
  if (issueLinkage !== undefined) {
    assertKnownKeys(issueLinkage, ["required"], "issueLinkage");
    normalized.issueLinkage = { required: requiredBoolean(issueLinkage, "required", "required") };
  }

  const checks = field(parsed, "requiredChecks", "required_checks");
  if (checks !== undefined) {
    if (!Array.isArray(checks)) throw new Error("requiredChecks must be an array");
    normalized.requiredChecks = checks.map((item) => {
      if (!isRecord(item)) throw new Error("requiredChecks entries must be objects");
      assertKnownKeys(item, ["id", "name", "target", "acceptableConclusions", "acceptable_conclusions", "expectedSource", "expected_source"], "requiredChecks entry");
      const target = requiredString(item, "target");
      if (target !== "head" && target !== "merge" && target !== "merge_group") throw new Error("requiredChecks.target is unsupported");
      const conclusions = stringArray(field(item, "acceptableConclusions", "acceptable_conclusions"), "acceptableConclusions", 1);
      const expectedSource = normalizeExpectedSource(field(item, "expectedSource", "expected_source"));
      return { id: requiredString(item, "id"), name: requiredString(item, "name"), target, acceptableConclusions: conclusions, expectedSource };
    });
  }

  const ownership = optionalRecord(parsed, "ownership", "ownership");
  if (ownership !== undefined) {
    assertKnownKeys(ownership, ["requireCodeOwnerApproval", "require_code_owner_approval"], "ownership");
    normalized.ownership = { requireCodeOwnerApproval: requiredBoolean(ownership, "requireCodeOwnerApproval", "require_code_owner_approval") };
  }

  const sensitivePaths = field(parsed, "sensitivePaths", "sensitive_paths");
  if (sensitivePaths !== undefined) {
    if (!Array.isArray(sensitivePaths)) throw new Error("sensitivePaths must be an array");
    normalized.sensitivePaths = sensitivePaths.map((item): SensitivePathRule => {
      if (!isRecord(item)) throw new Error("sensitivePaths entries must be objects");
      assertKnownKeys(item, ["id", "patterns", "requiredReviewers", "required_reviewers", "requiredCount", "required_count", "humanGate", "human_gate"], "sensitivePaths entry");
      return {
        id: requiredString(item, "id"),
        patterns: stringArray(item.patterns, "patterns", 1),
        requiredReviewers: stringArray(field(item, "requiredReviewers", "required_reviewers"), "requiredReviewers", 1),
        requiredCount: requiredNumber(item, "requiredCount", "required_count"),
        humanGate: requiredBoolean(item, "humanGate", "human_gate"),
      };
    });
  }

  const policyChanges = optionalRecord(parsed, "policyChanges", "policy_changes");
  if (policyChanges !== undefined) {
    assertKnownKeys(policyChanges, ["mode", "paths"], "policyChanges");
    const mode = requiredString(policyChanges, "mode");
    if (mode !== "advisory" && mode !== "human_review" && mode !== "blocked") throw new Error("policyChanges.mode is unsupported");
    normalized.policyChanges = { mode, paths: stringArray(policyChanges.paths, "policyChanges.paths", 1) } satisfies PolicyChangePolicy;
  }

  const reviewability = optionalRecord(parsed, "reviewability", "reviewability");
  if (reviewability !== undefined) {
    assertKnownKeys(reviewability, ["mode", "budgets"], "reviewability");
    const mode = requiredString(reviewability, "mode");
    if (mode !== "advisory" && mode !== "blocking") throw new Error("reviewability.mode is unsupported");
    const budgets = optionalRecord(reviewability, "budgets", "budgets");
    if (budgets === undefined) throw new Error("reviewability.budgets is required");
    assertKnownKeys(budgets, ["maxFiles", "max_files", "maxOwnershipDomains", "max_ownership_domains", "maxGeneratedFiles", "max_generated_files", "maxBoundaries", "max_boundaries"], "reviewability.budgets");
    const result: ReviewabilityPolicy["budgets"] = {};
    const budgetFields: Array<[keyof ReviewabilityPolicy["budgets"], string, string]> = [
      ["maxFiles", "maxFiles", "max_files"],
      ["maxOwnershipDomains", "maxOwnershipDomains", "max_ownership_domains"],
      ["maxGeneratedFiles", "maxGeneratedFiles", "max_generated_files"],
      ["maxBoundaries", "maxBoundaries", "max_boundaries"],
    ];
    for (const [key, camel, snake] of budgetFields) {
      const value = field(budgets, camel, snake);
      if (value !== undefined) {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) throw new Error(`${camel} must be a non-negative integer`);
        result[key] = value;
      }
    }
    normalized.reviewability = { mode, budgets: result };
  }
  assertPatchgatePolicy(normalized);
  return normalized;
}

export function createTrustedPolicyArtifact(
  contents: string,
  expected: { identity: string; revision: string },
  path = expected.identity,
): TrustedPolicyArtifact {
  const parsed: unknown = parse(contents);
  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error(`${basename(path)} must be a PatchGate policy with version: 1`);
  }
  const policy = normalizePolicy(parsed);
  const digest = sha256Text(contents);
  const contractDigest = normalizedPolicyDigest(policy);
  const source: PolicySource = {
    kind: "patchgate",
    identity: expected.identity,
    revision: expected.revision,
    digest,
    contractDigest,
    authority: "enforced",
  };
  return { path, digest, contractDigest, policy, source };
}

export async function loadPatchgatePolicy(
  basePath: string,
  expected: { identity?: string; revision?: string } = {},
): Promise<TrustedPolicyArtifact> {
  const baseStat = await stat(basePath);
  if (!baseStat.isDirectory()) {
    const contents = await readFile(basePath, "utf8");
    return createTrustedPolicyArtifact(
      contents,
      { identity: expected.identity ?? "patchgate.yml", revision: expected.revision ?? "local" },
      basePath,
    );
  }
  // Match the adapter contract: the trusted policy may live at the repository
  // root or under .github/, in that order.
  for (const candidate of ["patchgate.yml", join(".github", "patchgate.yml")] as const) {
    const policyPath = join(basePath, candidate);
    let contents: string;
    try {
      contents = await readFile(policyPath, "utf8");
    } catch {
      continue;
    }
    return createTrustedPolicyArtifact(
      contents,
      { identity: expected.identity ?? candidate, revision: expected.revision ?? "local" },
      policyPath,
    );
  }
  throw new Error(`ENOENT: no supported patchgate.yml found in ${basePath} (tried patchgate.yml and .github/patchgate.yml)`);
}

export async function isGitWorkTree(repositoryPath: string): Promise<boolean> {
  try {
    const result = await execFileAsync("git", ["-C", repositoryPath, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8", maxBuffer: 64 * 1024 });
    return result.stdout.trim() === "true";
  } catch {
    return false;
  }
}

function isMissingGitBlob(error: unknown): boolean {
  const err = error as { stderr?: string; message?: string };
  const text = `${err.stderr ?? ""} ${err.message ?? ""}`.toLowerCase();
  return (
    text.includes("not a valid object name") ||
    text.includes("does not exist") ||
    text.includes("exists on disk, but not in") ||
    text.includes("bad file")
  );
}

export async function loadPatchgatePolicyFromGitRefWithFallback(
  repositoryPath: string,
  ref: string,
): Promise<TrustedPolicyArtifact> {
  try {
    return await loadPatchgatePolicyFromGitRef(repositoryPath, ref, "patchgate.yml");
  } catch (rootError) {
    if (!isMissingGitBlob(rootError)) throw rootError;
    return await loadPatchgatePolicyFromGitRef(repositoryPath, ref, join(".github", "patchgate.yml"));
  }
}

export async function loadPatchgatePolicyFromGitRef(
  repositoryPath: string,
  ref: string,
  identity = "patchgate.yml",
): Promise<TrustedPolicyArtifact> {
  if (ref.trim().length === 0) throw new Error("Git base ref must be non-empty");
  if (identity.includes("\0") || identity.startsWith("/") || identity.includes("..")) {
    throw new Error("Git policy identity must be a repository-relative path");
  }
  const revisionResult = await execFileAsync("git", ["-C", repositoryPath, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"], { encoding: "utf8", maxBuffer: 64 * 1024 });
  const revision = revisionResult.stdout.trim();
  if (!/^[0-9a-f]{7,64}$/i.test(revision)) throw new Error("Git did not return a valid base commit");
  const contentsResult = await execFileAsync("git", ["-C", repositoryPath, "cat-file", "blob", revision + ":" + identity], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  return createTrustedPolicyArtifact(contentsResult.stdout, { identity, revision }, repositoryPath + "@" + ref + ":" + identity);
}
