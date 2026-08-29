import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, "..");
const defaultCli = resolve(workspaceRoot, "dist", "src", "cli.js");

function usage() {
  return [
    "Usage: node scripts/first-use-preflight.mjs [options]",
    "",
    "Options:",
    "  --repo <path>       Git clone to inspect (default: current directory)",
    "  --base <ref>        Trusted Git ref (default: HEAD)",
    "  --cli <path>        Built PatchGate CLI (default: dist/src/cli.js)",
    "  --expect <outcome>  any | valid | missing-policy (for regression probes)",
    "  --json              Print a machine-readable summary",
    "  --help              Show this help",
  ].join("\n");
}

function parseOptions(argv) {
  const options = {
    repo: process.cwd(),
    base: "HEAD",
    cli: defaultCli,
    expect: "any",
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument !== "--repo" && argument !== "--base" && argument !== "--cli" && argument !== "--expect") {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    index += 1;
    if (argument === "--repo") options.repo = value;
    else if (argument === "--base") options.base = value;
    else if (argument === "--cli") options.cli = value;
    else options.expect = value;
  }
  if (!["any", "valid", "missing-policy"].includes(options.expect)) {
    throw new Error("--expect must be any, valid, or missing-policy");
  }
  return options;
}

function print(value, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `First-use preflight: ${value.status}`,
    `Repository: ${value.repository}`,
    `Base: ${value.base}`,
    ...(value.revision === undefined ? [] : [`Resolved revision: ${value.revision}`]),
    ...(value.policy === undefined ? [] : [`Policy: ${value.policy}`]),
    `CLI exit: ${value.cliExit}`,
    `Outcome: ${value.outcome}`,
    `Next: ${value.nextStep}`,
  ].join("\n") + "\n");
}

function guidanceSummary(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && item.present === true)
    .map((item) => ({ path: item.path, classification: item.classification, diagnosticId: item.diagnosticId }));
}

function validResult(payload, options, cliExit) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new Error("preflight JSON is not an object");
  const policySource = payload.policySource;
  if (policySource === null || typeof policySource !== "object" || Array.isArray(policySource)) throw new Error("preflight JSON has no policy source");
  if (payload.mode !== "git_ref") throw new Error(`expected git_ref mode, received ${String(payload.mode)}`);
  if (typeof policySource.revision !== "string" || !/^[0-9a-f]{40}$/i.test(policySource.revision)) throw new Error("trusted Git ref did not resolve to a full commit SHA");
  if (policySource.identity !== "patchgate.yml" && policySource.identity !== ".github/patchgate.yml") throw new Error(`unsupported policy identity: ${String(policySource.identity)}`);
  if (payload.enforcement !== "not_enabled") throw new Error("local preflight unexpectedly reports enforcement enabled");
  if (typeof payload.authority !== "string" || !payload.authority.includes("not authenticated GitHub evidence")) throw new Error("preflight authority boundary is missing or changed");
  const summary = {
    harness: "first-use-preflight",
    status: "valid_local_policy",
    outcome: "worked",
    repository: resolve(options.repo),
    base: options.base,
    revision: policySource.revision,
    policy: policySource.identity,
    policyDigest: payload.policyDigest,
    contractDigest: payload.contractDigest,
    enforcement: payload.enforcement,
    guidance: guidanceSummary(payload.guidance),
    cliExit,
    nextStep: "Review the local policy and bind it to the intended GitHub workflow before enabling enforcement.",
  };
  if (options.expect === "missing-policy") throw new Error("expected missing-policy but preflight returned a valid policy");
  return summary;
}

function missingPolicyResult(options, cliExit, stderr) {
  const missingPolicy = /POLICY_INVALID/.test(stderr) && (
    /no supported patchgate\.yml found/i.test(stderr) ||
    /fatal: path '(?:patchgate\.yml|\.github\/patchgate\.yml)' does not exist in/i.test(stderr)
  );
  if (!missingPolicy) return undefined;
  if (options.expect === "valid") throw new Error("expected valid but the trusted base has no PatchGate policy");
  return {
    harness: "first-use-preflight",
    status: "missing_trusted_policy",
    outcome: "did_not_reach_first_result",
    repository: resolve(options.repo),
    base: options.base,
    cliExit,
    contract: "Discovery-only guidance cannot become an enforceable PatchGate policy.",
    nextStep: "Add patchgate.yml or .github/patchgate.yml to the trusted base, commit it, and rerun this command.",
  };
}

function main() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`first-use-preflight: ${error instanceof Error ? error.message : "invalid options"}\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  const cliPath = resolve(options.cli);
  if (!existsSync(cliPath)) {
    process.stderr.write(`first-use-preflight: built CLI not found at ${cliPath}; run npm run build first.\n`);
    process.exitCode = 2;
    return;
  }
  const result = spawnSync(process.execPath, [cliPath, "preflight", "--repo", resolve(options.repo), "--base", options.base, "--json"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  const cliExit = result.status ?? 1;
  if (result.error !== undefined) {
    process.stderr.write(`first-use-preflight: could not start CLI: ${result.error.message}\n`);
    process.exitCode = 1;
    return;
  }
  if (cliExit === 0) {
    try {
      const summary = validResult(JSON.parse(result.stdout), options, cliExit);
      print(summary, options.json);
      process.exitCode = 0;
      return;
    } catch (error) {
      process.stderr.write(`first-use-preflight: invalid successful preflight result: ${error instanceof Error ? error.message : "unknown result"}\n`);
      process.exitCode = 1;
      return;
    }
  }
  const missing = missingPolicyResult(options, cliExit, result.stderr);
  if (missing !== undefined) {
    print(missing, options.json);
    process.exitCode = options.expect === "missing-policy" ? 0 : 2;
    return;
  }
  process.stderr.write(`first-use-preflight: CLI failed with exit ${cliExit}: ${result.stderr.trim() || "no diagnostic"}\n`);
  process.exitCode = cliExit === 2 ? 2 : 1;
}

main();
