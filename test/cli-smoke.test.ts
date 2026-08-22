import { afterEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fixture, review, withInput, withPolicy } from "./helpers.js";
import type { EvaluationInput, PatchgatePolicy } from "../src/types.js";

const tempDirectories: string[] = [];
const CLI_PROCESS_TEST_TIMEOUT = 15_000;

function runCli(inputPath: string): { exit: number | null; status?: string; stderr: string } {
  const result = spawnSync(process.execPath, [resolve("dist/src/cli.js"), "evaluate", "--event", inputPath], { encoding: "utf8" });
  let status: string | undefined;
  try {
    status = (JSON.parse(result.stdout) as { final?: { status?: string } }).final?.status;
  } catch {
    status = undefined;
  }
  return { exit: result.status, ...(status === undefined ? {} : { status }), stderr: result.stderr.trim() };
}

function runCommand(args: string[], cwd?: string): { exit: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [resolve("dist/src/cli.js"), ...args], { encoding: "utf8", ...(cwd === undefined ? {} : { cwd }) });
  return { exit: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function writeInput(input: EvaluationInput): string {
  const directory = mkdtempSync("/tmp/patchgate-cli-smoke-");
  tempDirectories.push(directory);
  const path = join(directory, "event.json");
  writeFileSync(path, JSON.stringify(input), "utf8");
  return path;
}

function sensitivePolicy(): PatchgatePolicy {
  return {
    version: 1,
    issueLinkage: { required: true },
    requiredChecks: [{ id: "unit", name: "unit", target: "head", acceptableConclusions: ["success"], expectedSource: { kind: "github_actions_workflow", appId: 15368, workflowPath: ".github/workflows/ci.yml", event: "pull_request" } }],
    sensitivePaths: [{ id: "auth", patterns: ["src/auth/**"], requiredReviewers: ["@security"], requiredCount: 1, humanGate: true }],
  };
}

afterEach(() => {
  while (tempDirectories.length > 0) rmSync(tempDirectories.pop()!, { recursive: true, force: true });
});

describe("CLI process smoke contract", () => {
  it("provides safe init, validate, preflight and doctor UX", async () => {
    const directory = mkdtempSync("/tmp/patchgate-cli-ux-");
    tempDirectories.push(directory);
    const rootHelp = runCommand(["--help"]);
    expect(rootHelp.exit).toBe(0);
    expect(rootHelp.stdout).toContain("PatchGate CLI");
    expect(rootHelp.stdout).toContain("preflight");
    expect(rootHelp.stdout).toContain("doctor");
    expect(rootHelp.stdout).toContain("--json");
    expect(rootHelp.stdout).toContain("--fail-on");
    expect(rootHelp.stdout).toContain("--report");
    expect(rootHelp.stdout).toContain("--output");

    const rootVersion = runCommand(["--version"]);
    expect(rootVersion.exit).toBe(0);
    expect(rootVersion.stdout).toContain("patchgate v0.1.0-dev");

    const preflightHelp = runCommand(["preflight", "--help"]);
    expect(preflightHelp.exit).toBe(0);
    expect(preflightHelp.stdout).toContain("Usage: patchgate preflight");

    const nestedInitDir = join(directory, "nested", "try");
    const nestedInit = runCommand(["init", "--path", nestedInitDir, "--json"]);
    expect(nestedInit.exit).toBe(0);
    expect(JSON.parse(nestedInit.stdout)).toMatchObject({ status: "created", enforcement: "not_enabled" });
    const githubInitDir = join(directory, "github-init");
    const githubInit = runCommand(["init", "--path", githubInitDir, "--github-dir", "--json"]);
    expect(githubInit.exit).toBe(0);
    expect(JSON.parse(githubInit.stdout).path).toContain(`${join(".github", "patchgate.yml")}`);
    const noGitDoctor = runCommand(["doctor", "--base", nestedInitDir, "--json"]);
    expect(noGitDoctor.exit).toBe(0);
    expect(JSON.parse(noGitDoctor.stdout)).toMatchObject({ status: "ready_for_local_preflight" });
    const initialized = runCommand(["init", "--path", directory, "--json"]);
    expect(initialized.exit).toBe(0);
    expect(JSON.parse(initialized.stdout)).toMatchObject({ status: "created", enforcement: "not_enabled" });
    const draft = readFileSync(join(directory, "patchgate.yml"), "utf8");
    expect(draft).toContain("docs/patchgate.example.yml");
    expect(draft).toContain("# issue_linkage:");
    expect(draft).toContain("# required_checks:");
    expect(draft).toContain("# ownership:");
    expect(draft).toContain("# sensitive_paths:");
    expect(draft).toContain("# policy_changes:");
    expect(draft).toContain("# reviewability:");
    expect(draft).not.toMatch(/^issue_linkage:/m);
    expect(draft).not.toMatch(/^required_checks:/m);
    const validated = runCommand(["validate", "--policy", join(directory, "patchgate.yml"), "--json"]);
    expect(validated.exit).toBe(0);
    expect(JSON.parse(validated.stdout)).toMatchObject({ policy: { version: 1 } });
    const validatedViaBase = runCommand(["validate", "--base", join(directory, "patchgate.yml"), "--json"]);
    expect(validatedViaBase.exit).toBe(0);
    expect(JSON.parse(validatedViaBase.stdout)).toMatchObject({ policy: { version: 1 } });
    const overwrite = runCommand(["init", "--path", directory]);
    expect(overwrite.exit).toBe(2);
    expect(overwrite.stderr).toContain("INIT_TARGET_EXISTS");
    const preflight = runCommand(["preflight", "--base", resolve("docs/patchgate.example.yml")]);
    expect(preflight.exit).toBe(0);
    expect(preflight.stdout).toContain("Status: valid local policy");
    expect(preflight.stdout).toContain("Enforcement: not enabled");
    expect(preflight.stdout).toContain("Discovery-only guidance:");
    const preflightJson = runCommand(["preflight", "--base", resolve("docs/patchgate.example.yml"), "--json"]);
    expect(JSON.parse(preflightJson.stdout)).toMatchObject({ mode: "local_file" });
    expect(JSON.parse(preflightJson.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ path: "README.md", authority: "discovery_only", diagnosticId: expect.any(String) })]));

    const guidanceDirectory = mkdtempSync("/tmp/patchgate-cli-guidance-");
    tempDirectories.push(guidanceDirectory);
    writeFileSync(join(guidanceDirectory, "patchgate.yml"), "version: 1\n", "utf8");
    writeFileSync(join(guidanceDirectory, "README.md"), "Pull requests must link an issue before review.\n", "utf8");
    const guidance = runCommand(["preflight", "--base", join(guidanceDirectory, "patchgate.yml"), "--json"]);
    expect(JSON.parse(guidance.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ path: "README.md", classification: "needs_confirmation", diagnosticId: "DISCOVERY_POLICY_CONFLICT" })]));

    writeFileSync(join(guidanceDirectory, "README.md"), "Pull requests must use GitLab CI.\n", "utf8");
    const unsupportedGuidance = runCommand(["preflight", "--base", join(guidanceDirectory, "patchgate.yml"), "--json"]);
    expect(JSON.parse(unsupportedGuidance.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ path: "README.md", classification: "unsupported", diagnosticId: "DISCOVERY_UNSUPPORTED" })]));

    const missingPolicy = runCommand(["preflight", "--base", resolve("fixtures/repositories/missing-policy"), "--json"]);
    expect(missingPolicy.exit).toBe(2);
    expect(missingPolicy.stderr).toContain("POLICY_INVALID");
    const conflictFixture = runCommand(["preflight", "--base", resolve("fixtures/repositories/conflicting-prose/patchgate.yml"), "--json"]);
    expect(conflictFixture.exit).toBe(0);
    expect(JSON.parse(conflictFixture.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ diagnosticId: "DISCOVERY_POLICY_CONFLICT", classification: "needs_confirmation", signals: ["issue_linkage"] })]));
    const unsupportedFixture = runCommand(["preflight", "--base", resolve("fixtures/repositories/unsupported-guidance/patchgate.yml"), "--json"]);
    expect(unsupportedFixture.exit).toBe(0);
    expect(JSON.parse(unsupportedFixture.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ diagnosticId: "DISCOVERY_UNSUPPORTED", classification: "unsupported" })]));
    const doctor = runCommand(["doctor", "--base", resolve("fixtures/repositories/missing-policy"), "--json"]);
    expect(doctor.exit).toBe(1);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ status: "attention", mode: "local" });
    const doctorReady = runCommand(["doctor", "--base", resolve("docs/patchgate.example.yml"), "--json"]);
    expect(doctorReady.exit).toBe(0);
    expect(JSON.parse(doctorReady.stdout)).toMatchObject({ status: "ready_for_local_preflight", mode: "local" });
    const githubDirDoctor = runCommand(["doctor", "--base", resolve("fixtures/repositories/github-dir-policy"), "--json"]);
    expect(githubDirDoctor.exit).toBe(0);
    expect(JSON.parse(githubDirDoctor.stdout)).toMatchObject({ status: "ready_for_local_preflight", mode: "local" });
    const githubDirPreflight = runCommand(["preflight", "--base", resolve("fixtures/repositories/github-dir-policy"), "--json"]);
    expect(githubDirPreflight.exit).toBe(0);
    expect(JSON.parse(githubDirPreflight.stdout).policySource.identity).toBe(".github/patchgate.yml");

    const gitDirectory = mkdtempSync("/tmp/patchgate-cli-git-ref-");
    tempDirectories.push(gitDirectory);
    cpSync(resolve("fixtures/repositories/head-only-policy"), gitDirectory, { recursive: true });
    writeFileSync(join(gitDirectory, "README.md"), "Pull requests must link an issue before review.\n", "utf8");
    expect(spawnSync("git", ["-C", gitDirectory, "init", "-q", "-b", "main"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", gitDirectory, "config", "user.email", "test@example.invalid"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", gitDirectory, "config", "user.name", "PatchGate Test"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", gitDirectory, "add", "patchgate.yml", "README.md"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", gitDirectory, "commit", "-q", "-m", "baseline"], { encoding: "utf8" }).status).toBe(0);
    const gitPreflight = runCommand(["preflight", "--base", "HEAD", "--repo", gitDirectory, "--json"]);
    expect(gitPreflight.exit).toBe(0);
    expect(JSON.parse(gitPreflight.stdout)).toMatchObject({ mode: "git_ref", policySource: { revision: expect.stringMatching(/^[0-9a-f]{40}$/) } });
    expect(JSON.parse(gitPreflight.stdout).guidance).toEqual(expect.arrayContaining([expect.objectContaining({ path: "README.md", classification: "needs_confirmation", diagnosticId: "DISCOVERY_POLICY_CONFLICT" })]));
    writeFileSync(join(gitDirectory, "patchgate.yml"), "version: 1\nissueLinkage:\n  required: true\n", "utf8");
    const cwdGitDirectory = mkdtempSync("/tmp/patchgate-cli-git-ref-cwd-");
    tempDirectories.push(cwdGitDirectory);
    mkdirSync(join(cwdGitDirectory, ".github"));
    writeFileSync(join(cwdGitDirectory, ".github", "patchgate.yml"), "version: 1\n", "utf8");
    expect(spawnSync("git", ["-C", cwdGitDirectory, "init", "-q", "-b", "main"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", cwdGitDirectory, "config", "user.email", "test@example.invalid"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", cwdGitDirectory, "config", "user.name", "PatchGate Test"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", cwdGitDirectory, "add", ".github/patchgate.yml"], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("git", ["-C", cwdGitDirectory, "commit", "-q", "-m", "baseline"], { encoding: "utf8" }).status).toBe(0);
    const cwdGitPreflight = runCommand(["preflight", "--base", "main", "--json"], cwdGitDirectory);
    expect(cwdGitPreflight.exit).toBe(0);
    expect(JSON.parse(cwdGitPreflight.stdout)).toMatchObject({ mode: "git_ref", policySource: { identity: ".github/patchgate.yml", revision: expect.stringMatching(/^[0-9a-f]{40}$/) } });
    const nonJsDoctor = runCommand(["doctor", "--base", cwdGitDirectory, "--json"]);
    expect(nonJsDoctor.exit).toBe(0);
    expect(JSON.parse(nonJsDoctor.stdout)).toMatchObject({ status: "ready_for_local_preflight", mode: "local" });
    expect(JSON.parse(nonJsDoctor.stdout).checks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "package", status: "passed" })]));
    const headChangeIgnored = runCommand(["preflight", "--base", "HEAD", "--repo", gitDirectory, "--json"]);
    expect(JSON.parse(headChangeIgnored.stdout).policy).toEqual({ version: 1 });
  }, CLI_PROCESS_TEST_TIMEOUT);

  it("maps valid and evaluable non-ready snapshots to exit 0/1", async () => {
    const base = await fixture();
    expect(runCli(writeInput(base))).toMatchObject({ exit: 0, status: "ready_for_review" });
    expect(runCli(writeInput(withInput(base, { linkedIssues: [] })))).toMatchObject({ exit: 1, status: "blocked" });
    // Default --fail-on is "blocked" with Action precedence semantics:
    // blocked, evidence_missing and policy_ambiguous exit 1, while
    // human_review_required stays non-failing until the threshold is raised.
    expect(runCli(writeInput(withInput(base, { policy: { version: 1 } })))).toMatchObject({ exit: 1, status: "policy_ambiguous" });
    expect(runCli(writeInput(withInput(base, { observations: { ...base.observations, linkedIssues: { ...base.observations.linkedIssues, complete: false, permissionState: "unknown", normalizedDigest: undefined } } })))).toMatchObject({ exit: 1, status: "evidence_missing" });
    const failOnNever = runCommand(["evaluate", "--event", writeInput(withInput(base, { linkedIssues: [] })), "--fail-on", "never"]);
    expect(failOnNever.exit).toBe(0);
    expect(JSON.parse(failOnNever.stdout).final.status).toBe("blocked");
    const failOnEvidenceOnly = runCommand(["evaluate", "--event", writeInput(withInput(base, { linkedIssues: [] })), "--fail-on", "evidence_missing"]);
    expect(failOnEvidenceOnly.exit).toBe(0);
    expect(JSON.parse(failOnEvidenceOnly.stdout).final.status).toBe("blocked");
    const missingFailOnValue = runCommand(["evaluate", "--event", writeInput(base), "--fail-on"]);
    expect(missingFailOnValue.exit).toBe(2);
    expect(missingFailOnValue.stderr).toContain("FAIL_ON_INVALID");
    const bogusFailOn = runCommand(["evaluate", "--event", writeInput(base), "--fail-on", "bogus"]);
    expect(bogusFailOn.exit).toBe(2);
    expect(bogusFailOn.stderr).toContain("FAIL_ON_INVALID");
    const rejectedNever = runCommand(["github", "snapshot", "--mock-fixture", resolve("fixtures/api/merge-group-unsupported.json"), "--fail-on", "never"]);
    expect(rejectedNever.exit).toBe(0);
    expect(runCli(writeInput(withInput(withPolicy(base, sensitivePolicy()), { changedPaths: ["src/auth/token.ts"], reviews: [] })))).toMatchObject({ exit: 0, status: "human_review_required" });
    expect(runCli(writeInput(withInput(base, { revisions: { ...base.revisions, testedSha: "foreign-sha" } })))).toMatchObject({ exit: 2 });
  }, CLI_PROCESS_TEST_TIMEOUT);

  it("replays the authenticated GitHub snapshot fixture without network access", () => {
    const outputDirectory = mkdtempSync("/tmp/patchgate-github-cli-");
    tempDirectories.push(outputDirectory);
    const outputPath = join(outputDirectory, "snapshot.json");
    const replay = runCommand(["github", "snapshot", "--mock-fixture", resolve("fixtures/api/happy-path.json"), "--output", outputPath]);
    expect(replay.exit).toBe(0);
    const report = JSON.parse(readFileSync(outputPath, "utf8")) as { identity?: { baseSha?: string }; evaluation?: { status?: string }; snapshot?: { observations?: { checks?: { complete?: boolean } } } };
    expect(report).toMatchObject({ identity: { baseSha: "base-sha" }, evaluation: { status: "ready_for_review" }, snapshot: { observations: { checks: { complete: true } } } });

    const supportPath = join(outputDirectory, "support.json");
    const support = runCommand(["support-bundle", "--input", outputPath, "--output", supportPath]);
    expect(support.exit).toBe(0);
    const supportBundle = JSON.parse(readFileSync(supportPath, "utf8")) as Record<string, unknown>;
    expect(supportBundle).toMatchObject({ bundleType: "patchgate-support", source: "github_snapshot_report", privacy: { excludedData: expect.arrayContaining(["pr_bodies", "comments", "tokens"]) } });
    expect(JSON.stringify(supportBundle)).not.toContain("patchgate.yml\n");
    expect(supportBundle).not.toHaveProperty("snapshot");

    const unsupported = runCommand(["github", "snapshot", "--mock-fixture", resolve("fixtures/api/merge-group-unsupported.json")]);
    expect(unsupported.exit).toBe(1);
    expect(JSON.parse(unsupported.stdout)).toMatchObject({ kind: "rejected", diagnostic: { id: "GITHUB_API_UNSUPPORTED" } });

    const malformedFixture = join(outputDirectory, "malformed-api-fixture.json");
    writeFileSync(malformedFixture, JSON.stringify({ request: {}, exchanges: [{ response: {} }] }), "utf8");
    const malformed = runCommand(["github", "snapshot", "--mock-fixture", malformedFixture]);
    expect(malformed.exit).toBe(2);
    expect(malformed.stderr).toContain("GITHUB_FIXTURE_INVALID");
    const underReportedFixture = join(outputDirectory, "under-reported-api-fixture.json");
    writeFileSync(underReportedFixture, JSON.stringify({ request: { owner: "example", name: "service", pullNumber: 7, eventKind: "pull_request", targetKind: "head" }, exchanges: [{ request: { method: "GET", path: "/repos/example/service" }, response: { status: 200, headers: {}, body: { id: 1 }, bytes: 1 } }] }), "utf8");
    const underReported = runCommand(["github", "snapshot", "--mock-fixture", underReportedFixture]);
    expect(underReported.exit).toBe(2);
    expect(underReported.stderr).toContain("GITHUB_FIXTURE_INVALID");
    const invalidLiveAbsence = runCommand(["github", "snapshot", "--live", "--repo", "example/service", "--pull", "7", "--allow-confirmed-absence"]);
    expect(invalidLiveAbsence.exit).toBe(2);
    expect(invalidLiveAbsence.stderr).toContain("GITHUB_CONFIRMED_ABSENCE_MOCK_ONLY");
  }, CLI_PROCESS_TEST_TIMEOUT);

  it("maps required-check and review evidence matrix cases", async () => {
    const base = await fixture();
    expect(runCli(writeInput(withInput(base, { checks: base.checks.map((check) => ({ ...check, conclusion: "failure" })) })))).toMatchObject({ exit: 1, status: "blocked" });
    expect(runCli(writeInput(withInput(base, { observations: { ...base.observations, checks: { ...base.observations.checks, complete: false, permissionState: "unknown", normalizedDigest: undefined } } })))).toMatchObject({ exit: 1, status: "evidence_missing" });
    expect(runCli(writeInput(withInput(base, { checks: [base.checks[0]!, { ...base.checks[0]!, workflowRunId: 102, conclusion: "failure" }] })))).toMatchObject({ exit: 1, status: "evidence_missing" });
    const sensitive = withPolicy(base, sensitivePolicy());
    expect(runCli(writeInput(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], observations: { ...sensitive.observations, reviews: { ...sensitive.observations.reviews, complete: false, permissionState: "unknown", normalizedDigest: undefined } } })))).toMatchObject({ exit: 1, status: "evidence_missing" });
    expect(runCli(writeInput(withInput(sensitive, { changedPaths: ["src/auth/token.ts"], reviews: [review()] })))).toMatchObject({ exit: 0, status: "ready_for_review" });
  }, CLI_PROCESS_TEST_TIMEOUT);

  it("returns stable exit 2 diagnostics for malformed, unsupported and identity-invalid inputs", async () => {
    const malformed = runCli(resolve("fixtures/cli/malformed.json"));
    expect(malformed.exit).toBe(2);
    expect(malformed.stderr).toContain("JSON_MALFORMED");
    const unsupported = runCli(resolve("fixtures/cli/unsupported-schema-version.json"));
    expect(unsupported.exit).toBe(2);
    expect(unsupported.stderr).toContain("INPUT_VERSION_UNSUPPORTED");
    const base = await fixture();
    const invalidTimestamp = structuredClone(base);
    invalidTimestamp.checks[0]!.retrievedAt = "2026-02-30T00:00:00Z";
    expect(runCli(writeInput(invalidTimestamp))).toMatchObject({ exit: 2 });
    const missingConclusion = structuredClone(base);
    delete missingConclusion.checks[0]!.conclusion;
    expect(runCli(writeInput(missingConclusion))).toMatchObject({ exit: 2 });
    const missingAppIdentity = structuredClone(base);
    missingAppIdentity.checks[0]!.sourceStrength = "github_app_expected";
    delete missingAppIdentity.checks[0]!.appId;
    delete missingAppIdentity.checks[0]!.checkRunId;
    expect(runCli(writeInput(missingAppIdentity))).toMatchObject({ exit: 2 });
  }, CLI_PROCESS_TEST_TIMEOUT);
});
