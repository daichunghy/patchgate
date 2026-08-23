#!/usr/bin/env node
import { readFile, stat, writeFile } from "node:fs/promises";
import { canonicalJson } from "./canonical-json.js";
import { ContractValidationError, parseEvaluationInputJson } from "./contract/validation.js";
import { evaluateContribution } from "./evaluator.js";
import { BudgetLedger } from "./github/request-budget.js";
import { createFetchTransport, GitHubClient } from "./github/client.js";
import { isRecord, type GitHubQueryValue, type GitHubRequest, type GitHubResponse, type SafeResponseHeaders } from "./github/api-types.js";
import { RecordedGitHubTransport } from "./github/mock-transport.js";
import { assertRedacted, redactForReport, safeAllowlistedString } from "./github/redaction.js";
import { buildGitHubSnapshot } from "./github/snapshot-builder.js";
import { buildSupportBundle } from "./support-bundle.js";
import type { RecordedExchange } from "./github/mock-transport.js";
import type { GitHubSnapshotRequest } from "./github/identity.js";
import { isGitWorkTree, loadPatchgatePolicy, loadPatchgatePolicyFromGitRefWithFallback } from "./policy.js";
import { discoverGuidance, discoverGuidanceFromGitRef } from "./discovery.js";
import { EVALUATOR_VERSION } from "./version.js";
import { shouldFailAction, snapshotRejectionExitCode, type ActionInputs } from "./action/index.js";
import {
  CliDiagnosticError,
  doctor,
  initPolicy,
  preflightResult,
  renderDoctorHuman,
  renderInitHuman,
  renderPreflightHuman,
  renderValidationHuman,
} from "./cli/ux.js";

function renderRootHelp(): string {
  return [
    `PatchGate CLI (v${EVALUATOR_VERSION})`,
    "Deterministic GitHub pull-request review-readiness evaluator and governance gate.",
    "",
    "Usage:",
    "  patchgate <command> [options]",
    "",
    "Commands:",
    "  preflight        Preflight check repository guidance and trusted policy",
    "  doctor           Diagnose local environment, Git metadata, and policy status",
    "  init             Initialize a safe draft patchgate.yml policy in a directory",
    "  validate         Validate a patchgate.yml policy contract and compute its digest",
    "  evaluate         Pure deterministic evaluation of a normalized snapshot",
    "  github snapshot  Build a normalized snapshot from live GitHub API or recorded fixture",
    "  support-bundle   Generate a redacted support and debug bundle from a receipt/report",
    "",
    "Flags:",
    "  -h, --help       Show help for PatchGate or a specific subcommand",
    "  -v, --version    Show current PatchGate evaluator version",
    "  --json           Machine-readable JSON output (preflight/validate/init/doctor)",
    "  --fail-on <level>  Same as the Action input (not a total severity order):",
    "                   never | blocked (default) | human_review_required |",
    "                   evidence_missing | policy_ambiguous",
    "                   blocked fails blocked/evidence_missing/policy_ambiguous;",
    "                   evidence_missing matches only that status",
    "  --report <path>  Write the evaluate receipt JSON (evaluate; --output is an alias)",
    "  --output <path>  Write github snapshot, support-bundle, or evaluate receipt JSON",
    "",
    "Examples:",
    "  patchgate preflight --base .",
    "  patchgate preflight --base main",
    "  patchgate preflight --base main --repo .",
    "  patchgate doctor --base .",
    "  patchgate init --path .",
    "  patchgate init --path . --github-dir",
    "  patchgate validate --policy patchgate.yml",
    "  patchgate validate --base patchgate.yml",
    "  patchgate evaluate --event snapshot.json --report receipt.json",
    "  patchgate evaluate --event snapshot.json --fail-on never",
  ].join("\n");
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

interface SnapshotFixture {
  request: GitHubSnapshotRequest & { allowConfirmedAbsence?: boolean };
  exchanges: RecordedExchange[];
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

const SAFE_FIXTURE_HEADERS = new Set(["link", "etag", "last-modified", "x-ratelimit-remaining", "x-ratelimit-reset", "x-ratelimit-resource", "retry-after", "x-github-api-version", "content-type", "location"]);

function parseFixtureRequest(value: unknown, label: string): GitHubRequest {
  if (!isRecord(value) || (value.method !== "GET" && value.method !== "POST") || typeof value.path !== "string" || !value.path.startsWith("/") || value.path.startsWith("//") || value.path.includes("\0")) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} has an invalid method or path.`);
  safeAllowlistedString(value.path, `${label} path`, 10_000);
  const query: Record<string, GitHubQueryValue> = {};
  if (value.query !== undefined) {
    if (!isRecord(value.query)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} query must be an object.`);
    for (const [key, item] of Object.entries(value.query)) {
      if (!isPrimitive(item) || item === null) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} query values must be scalar.`);
      query[safeAllowlistedString(key, `${label} query key`, 200)] = item;
    }
  }
  const base: GitHubRequest = { method: value.method, path: value.path, ...(Object.keys(query).length === 0 ? {} : { query }) };
  if (value.method === "POST") {
    if (value.path !== "/graphql" || value.operation !== "pullRequestClosingIssues" || !isRecord(value.variables)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} must use the allowlisted GraphQL operation.`);
    const variables: Record<string, string | number | null> = {};
    for (const [key, item] of Object.entries(value.variables)) {
      if (typeof item !== "string" && typeof item !== "number" && item !== null) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} GraphQL variables must be scalar.`);
      variables[safeAllowlistedString(key, `${label} variable key`, 200)] = item;
    }
    return { ...base, operation: "pullRequestClosingIssues", variables };
  }
  if (value.operation !== undefined || value.variables !== undefined) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `${label} GET request cannot contain GraphQL data.`);
  return base;
}

function parseFixture(value: unknown): SnapshotFixture {
  if (!isRecord(value) || !isRecord(value.request) || !Array.isArray(value.exchanges)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", "The mock fixture must contain request and exchanges.");
  const rawRequest = value.request;
  if (typeof rawRequest.owner !== "string" || typeof rawRequest.name !== "string" || (rawRequest.eventKind !== "pull_request" && rawRequest.eventKind !== "merge_group") || (rawRequest.targetKind !== "head" && rawRequest.targetKind !== "merge" && rawRequest.targetKind !== "merge_group")) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", "The mock fixture request identity is invalid.");
  safeAllowlistedString(rawRequest.owner, "fixture owner", 200);
  safeAllowlistedString(rawRequest.name, "fixture repository", 200);
  if (rawRequest.pullNumber !== undefined && (typeof rawRequest.pullNumber !== "number" || !Number.isInteger(rawRequest.pullNumber) || rawRequest.pullNumber < 1)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", "The mock fixture pull number is invalid.");
  if (rawRequest.allowConfirmedAbsence !== undefined && typeof rawRequest.allowConfirmedAbsence !== "boolean") throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", "The mock fixture absence flag is invalid.");
  const request: SnapshotFixture["request"] = { owner: rawRequest.owner, name: rawRequest.name, ...(rawRequest.pullNumber === undefined ? {} : { pullNumber: rawRequest.pullNumber }), eventKind: rawRequest.eventKind, targetKind: rawRequest.targetKind, ...(rawRequest.allowConfirmedAbsence === undefined ? {} : { allowConfirmedAbsence: rawRequest.allowConfirmedAbsence }) };
  const exchanges: RecordedExchange[] = value.exchanges.map((item, index) => {
    if (!isRecord(item) || !isRecord(item.response)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `Fixture exchange ${index} is invalid.`);
    const parsedRequest = parseFixtureRequest(item.request, `fixture exchange ${index}`);
    const rawResponse = item.response;
    if (typeof rawResponse.status !== "number" || !Number.isInteger(rawResponse.status) || rawResponse.status < 100 || rawResponse.status > 599 || typeof rawResponse.bytes !== "number" || !Number.isInteger(rawResponse.bytes) || rawResponse.bytes < 0 || !isRecord(rawResponse.headers)) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `Fixture response ${index} has invalid status, headers, or byte count.`);
    const headers: SafeResponseHeaders = {};
    for (const [key, header] of Object.entries(rawResponse.headers)) {
      const normalized = key.toLowerCase();
      if (!SAFE_FIXTURE_HEADERS.has(normalized) || typeof header !== "string") throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `Fixture response ${index} contains an unsafe or unsupported header.`);
      if (normalized === "link") headers.link = header;
      else if (normalized === "etag") headers.etag = header;
      else if (normalized === "last-modified") headers["last-modified"] = header;
      else if (normalized === "x-ratelimit-remaining") headers["x-ratelimit-remaining"] = header;
      else if (normalized === "x-ratelimit-reset") headers["x-ratelimit-reset"] = header;
      else if (normalized === "x-ratelimit-resource") headers["x-ratelimit-resource"] = header;
      else if (normalized === "retry-after") headers["retry-after"] = header;
      else if (normalized === "x-github-api-version") headers["x-github-api-version"] = header;
      else if (normalized === "content-type") headers["content-type"] = header;
      else if (normalized === "location") headers.location = header;
    }
    assertRedacted(rawResponse.body);
    const actualBytes = Buffer.byteLength(typeof rawResponse.body === "string" ? rawResponse.body : canonicalJson(rawResponse.body), "utf8");
    if (rawResponse.bytes < actualBytes) throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", `Fixture response ${index} under-reports its response byte count.`);
    const response: GitHubResponse<unknown> = { status: rawResponse.status, headers, body: rawResponse.body, bytes: rawResponse.bytes };
    return { request: parsedRequest, response };
  });
  return { request, exchanges };
}

function parseRepositoryArgument(value: string | undefined): { owner: string; name: string } {
  if (value === undefined) throw new CliDiagnosticError("GITHUB_REPOSITORY_REQUIRED", "github snapshot requires --repo <owner/name>.");
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) throw new CliDiagnosticError("GITHUB_REPOSITORY_INVALID", "--repo must be exactly owner/name.");
  return { owner: parts[0]!, name: parts[1]! };
}

function parsePullNumber(value: string | undefined): number {
  const pullNumber = Number(value);
  if (value === undefined || !Number.isInteger(pullNumber) || pullNumber < 1) throw new CliDiagnosticError("GITHUB_PULL_NUMBER_INVALID", "github snapshot requires a positive --pull number.");
  return pullNumber;
}

// Mirrors the Action input contract so CLI and Action failures agree.
// Default "blocked" means blocked/evidence_missing/policy_ambiguous fail;
// human_review_required does not until the threshold is raised.
function parseFailOnArgument(): ActionInputs["failOn"] {
  const index = process.argv.indexOf("--fail-on");
  if (index === -1) return "blocked";
  const raw = process.argv[index + 1];
  const valid = ["never", "blocked", "human_review_required", "evidence_missing", "policy_ambiguous"] as const;
  if (raw === undefined || raw.startsWith("-") || !(valid as readonly string[]).includes(raw)) {
    throw new CliDiagnosticError("FAIL_ON_INVALID", `--fail-on must be one of: ${valid.join(", ")}.`);
  }
  return raw as ActionInputs["failOn"];
}

// --report remains the documented evaluate flag; --output is the cross-command
// write-path alias. Different values fail closed instead of picking a winner.
function parseEvaluateReportPath(): string | undefined {
  const report = argument("--report");
  const output = argument("--output");
  if (report !== undefined && output !== undefined && report !== output) {
    throw new CliDiagnosticError("REPORT_OUTPUT_CONFLICT", "--report and --output must not name different receipt paths for evaluate.");
  }
  return report ?? output;
}

async function githubSnapshotCommand(): Promise<void> {
  const failOn = parseFailOnArgument();
  const fixturePath = argument("--mock-fixture");
  let request: GitHubSnapshotRequest;
  let client: GitHubClient;
  let allowConfirmedAbsence = hasFlag("--allow-confirmed-absence");
  if (fixturePath !== undefined) {
    let parsed: unknown;
    try { parsed = JSON.parse(await readFile(fixturePath, "utf8")) as unknown; } catch { throw new CliDiagnosticError("GITHUB_FIXTURE_INVALID", "The mock fixture is not valid JSON."); }
    const fixture = parseFixture(parsed);
    request = fixture.request;
    allowConfirmedAbsence = fixture.request.allowConfirmedAbsence ?? allowConfirmedAbsence;
    client = new GitHubClient(new RecordedGitHubTransport(fixture.exchanges), new BudgetLedger());
  } else {
    if (allowConfirmedAbsence) throw new CliDiagnosticError("GITHUB_CONFIRMED_ABSENCE_MOCK_ONLY", "--allow-confirmed-absence is valid only with --mock-fixture; live 404 responses remain unknown.");
    if (!hasFlag("--live")) throw new CliDiagnosticError("GITHUB_LIVE_CONFIRMATION_REQUIRED", "Live GitHub retrieval requires --live and PATCHGATE_GITHUB_TOKEN; use --mock-fixture for local replay.");
    const token = process.env.PATCHGATE_GITHUB_TOKEN;
    if (token === undefined || token.length === 0) throw new CliDiagnosticError("GITHUB_AUTH_REQUIRED", "PATCHGATE_GITHUB_TOKEN is required for live read-only retrieval.");
    const repository = parseRepositoryArgument(argument("--repo"));
    const target = argument("--target") ?? "head";
    if (target !== "head" && target !== "merge") throw new CliDiagnosticError("GITHUB_TARGET_INVALID", "--target must be head or merge.");
    request = { ...repository, pullNumber: parsePullNumber(argument("--pull")), eventKind: "pull_request", targetKind: target };
    client = new GitHubClient(createFetchTransport({ token }), new BudgetLedger(), { token });
  }
  const result = await buildGitHubSnapshot(request, client, { allowConfirmedAbsence });
  const evaluation = result.kind === "built" ? evaluateContribution(result.input, new Date().toISOString()) : undefined;
  const report = result.kind === "built"
    ? { kind: result.kind, identity: result.identity, capability: result.capability, metrics: result.metrics, diagnostics: result.diagnostics, snapshot: result.input, evaluation: evaluation!.final }
    : { kind: result.kind, diagnostic: result.diagnostic, capability: result.capability, metrics: result.metrics };
  const safeReport = redactForReport(report);
  assertRedacted(safeReport);
  const outputPath = argument("--output");
  if (outputPath === undefined) print(safeReport);
  else await writeFile(outputPath, `${JSON.stringify(safeReport, null, 2)}\n`, "utf8");
  if (result.kind === "rejected") process.exitCode = snapshotRejectionExitCode(failOn);
  else if (evaluation !== undefined && shouldFailAction(evaluation.final.status, failOn)) process.exitCode = 1;
}

async function supportBundleCommand(): Promise<void> {
  const inputPath = argument("--input");
  if (inputPath === undefined) throw new CliDiagnosticError("SUPPORT_INPUT_REQUIRED", "support-bundle requires --input <report-or-receipt.json>.");
  let input: unknown;
  try { input = JSON.parse(await readFile(inputPath, "utf8")) as unknown; } catch { throw new CliDiagnosticError("SUPPORT_INPUT_INVALID", "The support-bundle input is not valid JSON."); }
  const bundle = buildSupportBundle(input, new Date().toISOString());
  const outputPath = argument("--output");
  if (outputPath === undefined) print(bundle);
  else await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
}

async function existingFilesystemTarget(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() || info.isDirectory();
  } catch {
    return false;
  }
}

async function resolvePreflightGitRepository(base: string, explicitRepo: string | undefined): Promise<string | undefined> {
  if (explicitRepo !== undefined) return explicitRepo;
  if (await existingFilesystemTarget(base)) return undefined;
  const cwd = process.cwd();
  if (await isGitWorkTree(cwd)) return cwd;
  return undefined;
}

async function policyCommand(path: string, command: "preflight" | "validate", repositoryPath?: string): Promise<void> {
  let loaded;
  try {
    loaded = repositoryPath === undefined
      ? await loadPatchgatePolicy(path)
      : await loadPatchgatePolicyFromGitRefWithFallback(repositoryPath, path);
  } catch (error) {
    const message = error instanceof Error ? error.message : "policy could not be loaded";
    throw new CliDiagnosticError("POLICY_INVALID", command + " could not load policy: " + message);
  }
  const guidance = repositoryPath === undefined
    ? await discoverGuidance(path, loaded.policy)
    : await discoverGuidanceFromGitRef(repositoryPath, path, loaded.policy);
  const result = preflightResult(loaded, guidance);
  if (hasFlag("--json")) print(result);
  else process.stdout.write((command === "preflight" ? renderPreflightHuman(result) : renderValidationHuman(result)) + "\n");
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    process.stdout.write(renderRootHelp() + "\n");
    return;
  }

  if (command === "--version" || command === "-v") {
    process.stdout.write(`patchgate v${EVALUATOR_VERSION}\n`);
    return;
  }

  if (hasFlag("--help") || hasFlag("-h")) {
    if (command === "github" && process.argv[3] === "snapshot") {
      process.stdout.write("Usage: patchgate github snapshot (--mock-fixture <path> | --live --repo <owner/name> --pull <number> [--target <head|merge>]) [--output <path>] [--fail-on <never|blocked|human_review_required|evidence_missing|policy_ambiguous>]\n");
      return;
    }
    if (command === "support-bundle") {
      process.stdout.write("Usage: patchgate support-bundle --input <report-or-receipt.json> [--output <path>]\n");
      return;
    }
    if (command === "init") {
      process.stdout.write("Usage: patchgate init [--path <directory-or-file>] [--github-dir] [--json]\n");
      return;
    }
    if (command === "validate") {
      process.stdout.write("Usage: patchgate validate (--policy|--base) <policy-file-or-directory> [--json]\n");
      return;
    }
    if (command === "doctor") {
      process.stdout.write("Usage: patchgate doctor [--base <path>] [--json]\n");
      return;
    }
    if (command === "preflight") {
      process.stdout.write("Usage: patchgate preflight --base <policy-file-or-git-ref> [--repo <local-repository>] [--json]\n");
      return;
    }
    if (command === "evaluate") {
      process.stdout.write("Usage: patchgate evaluate --event <normalized-snapshot.json> [--report <receipt.json> | --output <receipt.json>] [--fail-on <never|blocked|human_review_required|evidence_missing|policy_ambiguous>]\n");
      return;
    }
    process.stdout.write(renderRootHelp() + "\n");
    return;
  }

  if (command === "github" && process.argv[3] === "snapshot") {
    await githubSnapshotCommand();
    return;
  }
  if (command === "support-bundle") {
    await supportBundleCommand();
    return;
  }
  if (command === "init") {
    const result = await initPolicy(argument("--path") ?? ".", { githubDir: hasFlag("--github-dir") });
    if (hasFlag("--json")) print(result);
    else process.stdout.write(renderInitHuman(result) + "\n");
    return;
  }
  if (command === "validate") {
    const policyPath = argument("--policy") ?? argument("--base");
    if (policyPath === undefined) {
      console.error("Usage: patchgate validate (--policy|--base) <policy-file-or-directory> [--json]");
      process.exitCode = 2;
      return;
    }
    await policyCommand(policyPath, "validate");
    return;
  }
  if (command === "doctor") {
    const result = await doctor(argument("--base") ?? argument("--path") ?? ".");
    if (hasFlag("--json")) print(result);
    else process.stdout.write(renderDoctorHuman(result) + "\n");
    if (result.status !== "ready_for_local_preflight") process.exitCode = 1;
    return;
  }
  if (command === "preflight") {
    const basePath = argument("--base");
    if (basePath === undefined) {
      console.error("Usage: patchgate preflight --base <policy-file-or-git-ref> [--repo <local-repository>] [--json]");
      process.exitCode = 2;
      return;
    }
    await policyCommand(basePath, "preflight", await resolvePreflightGitRepository(basePath, argument("--repo")));
    return;
  }
  const eventPath = argument("--event");
  if (command !== "evaluate" || eventPath === undefined) {
    console.error("Usage: patchgate evaluate --event <normalized-snapshot.json> [--report <receipt.json> | --output <receipt.json>] [--fail-on <never|blocked|human_review_required|evidence_missing|policy_ambiguous>]\nRun 'patchgate --help' to see all available commands.");
    process.exitCode = 2;
    return;
  }
  const failOn = parseFailOnArgument();
  const reportPath = parseEvaluateReportPath();
  const input = parseEvaluationInputJson(await readFile(eventPath, "utf8"));
  const receipt = evaluateContribution(input, new Date().toISOString());
  const output = `${JSON.stringify(receipt, null, 2)}\n`;
  if (reportPath === undefined) process.stdout.write(output);
  else await writeFile(reportPath, output, "utf8");
  if (shouldFailAction(receipt.final.status, failOn)) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  if (error instanceof ContractValidationError) {
    console.error("PatchGate contract error [" + error.diagnosticId + "]: " + error.message);
  } else if (error instanceof CliDiagnosticError) {
    console.error("PatchGate CLI error [" + error.diagnosticId + "]: " + error.message);
 } else if (error instanceof Error) {
    console.error("PatchGate error: " + error.message);
  } else {
    console.error("PatchGate error: operation failed");
  }
  process.exitCode = 2;
}
