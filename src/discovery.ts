import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { PatchgatePolicy } from "./types.js";

export type GuidanceClassification = "advisory" | "needs_confirmation" | "unsupported";
export type GuidanceDiagnosticId =
  | "DISCOVERY_NOT_PRESENT"
  | "DISCOVERY_ADVISORY"
  | "DISCOVERY_NEEDS_CONFIRMATION"
  | "DISCOVERY_UNSUPPORTED"
  | "DISCOVERY_POLICY_CONFLICT"
  | "DISCOVERY_SIZE_LIMIT";

export interface GuidanceFinding {
  path: string;
  present: boolean;
  classification: GuidanceClassification;
  authority: "discovery_only";
  diagnosticId: GuidanceDiagnosticId;
  summary: string;
  remediation: string;
  signals: string[];
}

const guidancePaths = [
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "README.md",
  ".github/pull_request_template.md",
];
const MAX_GUIDANCE_BYTES = 256 * 1024;
const execFileAsync = promisify(execFile);

interface GuidanceContext {
  policy: PatchgatePolicy | undefined;
}

function policyConflictSignals(text: string, policy: PatchgatePolicy | undefined): string[] {
  if (policy === undefined) return [];
  const signals: string[] = [];
  const hasIssueRule = policy.issueLinkage?.required === true;
  const hasCheckRule = (policy.requiredChecks?.length ?? 0) > 0;
  const hasOwnerRule = policy.ownership?.requireCodeOwnerApproval === true || (policy.sensitivePaths?.length ?? 0) > 0;
  const hasReviewabilityRule = policy.reviewability !== undefined;
  const hasPolicyChangeRule = policy.policyChanges !== undefined;
  if (/\b(must|required|mandatory|need to)\b[^\n.]{0,80}\b(issue|ticket|tracking issue)\b/i.test(text) && !hasIssueRule) signals.push("issue_linkage");
  if (/\b(required|mandatory|must)\b[^\n.]{0,80}\b(check|status check|workflow|ci)\b/i.test(text) && !hasCheckRule) signals.push("required_checks");
  if (/\b(codeowner|code owners|owner approval|security reviewer|reviewer approval)\b/i.test(text) && !hasOwnerRule) signals.push("ownership");
  if (/\b(reviewability|changed files?|file budget|ownership domains?)\b/i.test(text) && !hasReviewabilityRule) signals.push("reviewability");
  if (/\b(policy|governance) changes?\b/i.test(text) && !hasPolicyChangeRule) signals.push("policy_changes");
  return signals;
}

function classifyGuidance(path: string, text: string | undefined, context: GuidanceContext): GuidanceFinding {
  if (text === undefined) {
    return {
      path,
      present: false,
      classification: "advisory",
      authority: "discovery_only",
      diagnosticId: "DISCOVERY_NOT_PRESENT",
      summary: "No discovery-only guidance file was found.",
      remediation: "No action is required; verify trusted structured policy separately.",
      signals: [],
    };
  }
  const unsupportedSignals: string[] = [];
  if (/\b(must|shall|required to|use|uses|supports?|run|runs|deploy|replace)\b[^\n.]{0,60}\b(gitlab|bitbucket|azure devops|jenkins)\b/i.test(text)) unsupportedSignals.push("unsupported_platform");
  if (/\b(must|shall|required to|use|uses|supports?|detects?|replace)\b[^\n.]{0,60}\b(ai[- ]authorship|ai[- ]generated code detector|code correctness oracle)\b/i.test(text)) unsupportedSignals.push("unsupported_product_claim");
  const conflictSignals = policyConflictSignals(text, context.policy);
  const directiveSignals: string[] = [];
  if (/\b(pull requests?|changes?)\s+(must|shall|required|need to)\b/i.test(text)) directiveSignals.push("directive");
  if (/\b(required|mandatory|must)\b[^\n.]{0,80}\b(check|status check|workflow|ci|approval|reviewer|issue)\b/i.test(text)) directiveSignals.push("governance_candidate");
  if (unsupportedSignals.length > 0) {
    return {
      path,
      present: true,
      classification: "unsupported",
      authority: "discovery_only",
      diagnosticId: "DISCOVERY_UNSUPPORTED",
      summary: "Guidance mentions a platform or product behavior outside the supported PatchGate scope.",
      remediation: "Keep this as advisory documentation; use a supported native control or document the limitation explicitly.",
      signals: unsupportedSignals,
    };
  }
  if (conflictSignals.length > 0) {
    return {
      path,
      present: true,
      classification: "needs_confirmation",
      authority: "discovery_only",
      diagnosticId: "DISCOVERY_POLICY_CONFLICT",
      summary: "Prose appears to declare governance that is not enabled in the trusted structured policy.",
      remediation: "Confirm the rule in patchgate.yml or the native GitHub control; prose alone never blocks a result.",
      signals: conflictSignals,
    };
  }
  if (directiveSignals.length > 0) {
    return {
      path,
      present: true,
      classification: "needs_confirmation",
      authority: "discovery_only",
      diagnosticId: "DISCOVERY_NEEDS_CONFIRMATION",
      summary: "Directive-like governance language was discovered but is not enforceable from prose.",
      remediation: "Confirm an intended rule in patchgate.yml or the native GitHub control before relying on it.",
      signals: directiveSignals,
    };
  }
  return {
    path,
    present: true,
    classification: "advisory",
    authority: "discovery_only",
    diagnosticId: "DISCOVERY_ADVISORY",
    summary: "Guidance was discovered for human context only.",
    remediation: "Review the guidance and keep each enforceable rule in trusted structured policy.",
    signals: [],
  };
}

async function readGuidanceFile(path: string): Promise<string | undefined> {
  try {
    const fileStat = await stat(path);
    if (!fileStat.isFile()) return undefined;
    if (fileStat.size > MAX_GUIDANCE_BYTES) return undefined;
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

export async function discoverGuidance(target: string, policy?: PatchgatePolicy): Promise<GuidanceFinding[]> {
  const resolved = isAbsolute(target) ? target : resolve(target);
  const targetStat = await stat(resolved).catch(() => undefined);
  const root = targetStat?.isDirectory() === true ? resolved : dirname(resolved);
  return Promise.all(guidancePaths.map(async (relativePath) => {
    const absolutePath = join(root, relativePath);
    const fileStat = await stat(absolutePath).catch(() => undefined);
    if (fileStat?.isFile() === true && fileStat.size > MAX_GUIDANCE_BYTES) {
      return {
        path: relativePath,
        present: true,
        classification: "unsupported" as const,
        authority: "discovery_only" as const,
        diagnosticId: "DISCOVERY_SIZE_LIMIT" as const,
        summary: "Guidance file exceeds the bounded discovery read size.",
        remediation: "Review the file separately; discovery does not parse oversized guidance.",
        signals: ["size_limit"],
      };
    }
    return classifyGuidance(relativePath, await readGuidanceFile(absolutePath), { policy });
  }));
}

async function gitRevision(repositoryPath: string, ref: string): Promise<string> {
  const result = await execFileAsync("git", ["-C", repositoryPath, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"], { encoding: "utf8", maxBuffer: 64 * 1024 });
  const revision = result.stdout.trim();
  if (!/^[0-9a-f]{7,64}$/i.test(revision)) throw new Error("Git did not return a valid base commit for discovery");
  return revision;
}

async function readGitGuidance(repositoryPath: string, revision: string, path: string): Promise<string | undefined> {
  try {
    const result = await execFileAsync("git", ["-C", repositoryPath, "cat-file", "blob", revision + ":" + path], { encoding: "utf8", maxBuffer: MAX_GUIDANCE_BYTES + 1 });
    if (Buffer.byteLength(result.stdout, "utf8") > MAX_GUIDANCE_BYTES) return undefined;
    return result.stdout;
  } catch {
    return undefined;
  }
}

export async function discoverGuidanceFromGitRef(repositoryPath: string, ref: string, policy?: PatchgatePolicy): Promise<GuidanceFinding[]> {
  const revision = await gitRevision(repositoryPath, ref);
  return Promise.all(guidancePaths.map(async (path) => {
    const text = await readGitGuidance(repositoryPath, revision, path);
    if (text === undefined) {
      const exists = await execFileAsync("git", ["-C", repositoryPath, "cat-file", "-e", revision + ":" + path], { encoding: "utf8", maxBuffer: 64 * 1024 }).then(() => true).catch(() => false);
      return exists
        ? {
          path,
          present: true,
          classification: "unsupported" as const,
          authority: "discovery_only" as const,
          diagnosticId: "DISCOVERY_SIZE_LIMIT" as const,
          summary: "Guidance file exceeds the bounded discovery read size.",
          remediation: "Review the file separately; discovery does not parse oversized guidance.",
          signals: ["size_limit"],
        }
        : classifyGuidance(path, undefined, { policy });
    }
    return classifyGuidance(path, text, { policy });
  }));
}
