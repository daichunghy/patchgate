import { access, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { loadPatchgatePolicy, type TrustedPolicyArtifact } from "../policy.js";
import type { GuidanceFinding } from "../discovery.js";

export class CliDiagnosticError extends Error {
  constructor(readonly diagnosticId: string, message: string) {
    super(message);
    this.name = "CliDiagnosticError";
  }
}

export interface PreflightResult {
  mode: "local_file" | "git_ref";
  policyPath: string;
  policyDigest: string;
  contractDigest: string;
  policySource: TrustedPolicyArtifact["source"];
  policy: TrustedPolicyArtifact["policy"];
  guidance: GuidanceFinding[];
  authority: string;
  enforcement: "not_enabled";
  ruleSummary: {
    issueLinkage: boolean;
    requiredChecks: number;
    ownership: boolean;
    sensitivePathRules: number;
    policyChanges: boolean;
    reviewability: boolean;
  };
  nextSteps: string[];
}

export interface DoctorCheck {
  id: "policy" | "git_repository" | "package" | "network";
  status: "passed" | "attention";
  message: string;
  detail?: string;
}

export interface DoctorResult {
  mode: "local";
  targetPath: string;
  status: "ready_for_local_preflight" | "attention";
  checks: DoctorCheck[];
  nextSteps: string[];
}

const draftPolicy = [
  "version: 1",
  "",
  "# Draft only: this file does not enable a GitHub check or change a ruleset.",
  "# Add explicit rules after reviewing the policy contract and trusted-base model.",
  "# See docs/patchgate.example.yml for a complete illustrative policy.",
  "",
].join("\n");

function ruleSummary(artifact: TrustedPolicyArtifact): PreflightResult["ruleSummary"] {
  const policy = artifact.policy;
  return {
    issueLinkage: policy.issueLinkage?.required === true,
    requiredChecks: policy.requiredChecks?.length ?? 0,
    ownership: policy.ownership?.requireCodeOwnerApproval === true,
    sensitivePathRules: policy.sensitivePaths?.length ?? 0,
    policyChanges: policy.policyChanges !== undefined,
    reviewability: policy.reviewability !== undefined,
  };
}

export function preflightResult(artifact: TrustedPolicyArtifact, guidance: GuidanceFinding[] = []): PreflightResult {
  const mode = artifact.source.revision === "local" ? "local_file" : "git_ref";
  return {
    mode,
    policyPath: artifact.path,
    policyDigest: artifact.digest,
    contractDigest: artifact.contractDigest,
    policySource: artifact.source,
    policy: artifact.policy,
    guidance,
    authority: mode === "local_file"
      ? "enforced at the supplied local path; a GitHub adapter must bind this to the PR base SHA"
      : "read from the supplied local Git base revision; this is not authenticated GitHub evidence",
    enforcement: "not_enabled",
    ruleSummary: ruleSummary(artifact),
    nextSteps: [
      mode === "local_file"
        ? "Bind this policy to a trusted base Git revision before evaluating a pull request."
        : "Confirm the Git ref and commit are the intended trusted base before evaluating a pull request.",
      "Use `patchgate validate --policy <path>` after editing the file.",
      "Local preflight does not configure or change GitHub enforcement.",
    ],
  };
}

export function renderPreflightHuman(result: PreflightResult): string {
  const summary = result.ruleSummary;
  return [
    "PatchGate preflight",
    "Status: valid local policy",
    "Mode: " + (result.mode === "local_file" ? "local file" : "trusted Git ref (local object)"),
    "Policy: " + result.policyPath,
    "Rules: issue-linkage=" + (summary.issueLinkage ? "on" : "off") +
      ", checks=" + summary.requiredChecks +
      ", ownership=" + (summary.ownership ? "on" : "off") +
      ", sensitive-paths=" + summary.sensitivePathRules +
      ", policy-changes=" + (summary.policyChanges ? "on" : "off") +
      ", reviewability=" + (summary.reviewability ? "on" : "off"),
    "Policy digest: " + result.policyDigest,
    "Contract digest: " + result.contractDigest,
    "Authority: " + result.authority,
    "Enforcement: not enabled",
    "Discovery-only guidance: " + (result.guidance.filter((item) => item.present).map((item) => item.path + " [" + item.classification + "]").join(", ") || "none found") + " (never enforcement)",
    ...result.guidance.filter((item) => item.present).map((item) => "Guidance " + item.path + ": " + item.summary + " Diagnostic=" + item.diagnosticId + ". Remediation: " + item.remediation),
    "Next:",
    ...result.nextSteps.map((step) => "- " + step),
  ].join("\n");
}

export function renderValidationHuman(result: PreflightResult): string {
  return [
    "PatchGate validate",
    "Status: valid",
    "Policy: " + result.policyPath,
    "Contract digest: " + result.contractDigest,
    "No GitHub ruleset or enforcement setting was changed.",
  ].join("\n");
}

function pathForTarget(target: string): string {
  return isAbsolute(target) ? target : resolve(target);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initPolicy(target = "."): Promise<{ path: string; status: "created"; enforcement: "not_enabled"; nextSteps: string[] }> {
  const requested = pathForTarget(target);
  let targetPath = requested;
  if (!requested.endsWith(".yml") && !requested.endsWith(".yaml")) {
    const targetStat = await stat(requested).catch(() => undefined);
    if (targetStat !== undefined && !targetStat.isDirectory()) {
      throw new CliDiagnosticError("INIT_TARGET_NOT_DIRECTORY", "init target must be a directory or .yml file: " + target);
    }
    targetPath = join(requested, "patchgate.yml");
  }
  if (await exists(targetPath)) {
    throw new CliDiagnosticError("INIT_TARGET_EXISTS", "refusing to overwrite existing policy: " + targetPath);
  }
  const parent = dirname(targetPath);
  if (!(await exists(parent))) {
    throw new CliDiagnosticError("INIT_PARENT_MISSING", "init parent directory does not exist: " + parent);
  }
  try {
    await writeFile(targetPath, draftPolicy, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new CliDiagnosticError("INIT_TARGET_EXISTS", "refusing to overwrite existing policy: " + targetPath);
    }
    throw error;
  }
  return {
    path: targetPath,
    status: "created",
    enforcement: "not_enabled",
    nextSteps: [
      "Edit the draft with explicit rules and trusted source expectations.",
      "Run `patchgate validate --policy <path>`.",
      "A draft never enables enforcement or changes a GitHub ruleset.",
    ],
  };
}

export function renderInitHuman(result: Awaited<ReturnType<typeof initPolicy>>): string {
  return [
    "PatchGate init",
    "Created: " + result.path,
    "Status: draft only",
    "Enforcement: not enabled",
    "Next:",
    ...result.nextSteps.map((step) => "- " + step),
  ].join("\n");
}

async function localRoot(target: string): Promise<string> {
  const resolved = pathForTarget(target);
  const targetStat = await stat(resolved).catch(() => undefined);
  if (targetStat?.isFile()) return dirname(resolved);
  return resolved;
}

async function findUp(startDir: string, name: string): Promise<string | undefined> {
  let current = startDir;
  while (true) {
    const candidate = join(current, name);
    if (await exists(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

export async function doctor(target = "."): Promise<DoctorResult> {
  const root = await localRoot(target);
  const checks: DoctorCheck[] = [];
  try {
    const artifact = await loadPatchgatePolicy(target);
    checks.push({ id: "policy", status: "passed", message: "PatchGate policy is valid", detail: artifact.path });
  } catch (error) {
    checks.push({
      id: "policy",
      status: "attention",
      message: "PatchGate policy is missing or invalid",
      detail: error instanceof Error ? error.message : "policy could not be loaded",
    });
  }
  const gitPath = await findUp(root, ".git");
  checks.push(gitPath !== undefined
    ? { id: "git_repository", status: "passed", message: "Git repository metadata is present", detail: gitPath }
    : { id: "git_repository", status: "attention", message: "No local Git repository was detected", detail: "Local preflight still works; Git-ref mode needs a repository." });
  const packagePath = await findUp(root, "package.json");
  if (packagePath !== undefined) {
    try {
      const packageRecord: unknown = JSON.parse(await readFile(packagePath, "utf8")) as unknown;
      if (packageRecord !== null && typeof packageRecord === "object" && !Array.isArray(packageRecord)) {
        const packageName = (packageRecord as { name?: unknown }).name;
        checks.push(typeof packageName === "string" && packageName.length > 0
          ? { id: "package", status: "passed", message: "package.json is readable", detail: packageName }
          : { id: "package", status: "attention", message: "package.json has no readable package name" });
      } else {
        checks.push({ id: "package", status: "attention", message: "package.json is not a JSON object" });
      }
    } catch (error) {
      checks.push({ id: "package", status: "attention", message: "package.json is not valid JSON", detail: error instanceof Error ? error.message : "invalid JSON" });
    }
  } else {
    checks.push({
      id: "package",
      status: "passed",
      message: "package.json is not required for local preflight",
      detail: "Node/package metadata is informational; non-JS repositories can still run doctor and preflight.",
    });
  }
  checks.push({ id: "network", status: "passed", message: "Network is not required for local doctor checks", detail: "Authenticated GitHub retrieval is not being claimed." });
  const attention = checks.some((check) => check.status === "attention");
  return {
    mode: "local",
    targetPath: root,
    status: attention ? "attention" : "ready_for_local_preflight",
    checks,
    nextSteps: attention
      ? [
        "Resolve policy diagnostics before relying on local preflight.",
        "Use a Git repository for trusted Git-ref preflight when available.",
        "A doctor result does not configure GitHub or prove authenticated API access.",
      ]
      : ["Run `patchgate preflight --base <policy-path>` to inspect the validated policy."],
  };
}

export function renderDoctorHuman(result: DoctorResult): string {
  return [
    "PatchGate doctor",
    "Status: " + result.status,
    "Target: " + result.targetPath,
    "Checks:",
    ...result.checks.map((check) => "- " + (check.status === "passed" ? "PASS" : "ATTENTION") + " " + check.id + ": " + check.message + (check.detail === undefined ? "" : " (" + check.detail + ")")),
    "Next:",
    ...result.nextSteps.map((step) => "- " + step),
  ].join("\n");
}
