import { cpSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface HarnessResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function prepareHarnessWithSpacedPath(): { harnessPath: string; networkGuardPath: string } {
  const temporaryRoot = realpathSync(mkdtempSync(join(tmpdir(), "patchgate-live-smoke-entrypoint-")));
  const spacedRoot = join(temporaryRoot, "repository with spaces");
  const spacedDistRoot = join(spacedRoot, "dist");
  const spacedScriptsRoot = join(spacedDistRoot, "scripts");
  mkdirSync(spacedScriptsRoot, { recursive: true });
  symlinkSync(resolve("node_modules"), join(spacedRoot, "node_modules"), "dir");
  cpSync(resolve("dist/scripts/live-smoke-harness.js"), join(spacedScriptsRoot, "live-smoke-harness.js"));
  cpSync(resolve("dist/src"), join(spacedDistRoot, "src"), { recursive: true });
  cpSync(resolve("schemas"), join(spacedDistRoot, "schemas"), { recursive: true });

  const networkGuardPath = join(temporaryRoot, "network-guard.cjs");
  writeFileSync(
    networkGuardPath,
    "globalThis.fetch = () => { process.stderr.write('UNEXPECTED_NETWORK_REQUEST\\n'); process.exit(97); };\n",
    "utf8",
  );

  return {
    harnessPath: join(spacedScriptsRoot, "live-smoke-harness.js"),
    networkGuardPath,
  };
}

function runHarness(harnessPath: string, networkGuardPath: string, token: string): HarnessResult {
  const result = spawnSync(process.execPath, [harnessPath], {
    cwd: resolve("."),
    encoding: "utf8",
    env: {
      ...process.env,
      PATCHGATE_GITHUB_TOKEN: token,
      GITHUB_TOKEN: "",
      GH_TOKEN: "",
      PATCHGATE_LIVE_SMOKE_AUTHORIZED: "",
      NODE_OPTIONS: `--require=${networkGuardPath}`,
    },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("live smoke harness entry point", () => {
  it("runs directly from a path with spaces and fails closed without a token", () => {
    const { harnessPath, networkGuardPath } = prepareHarnessWithSpacedPath();
    const result = runHarness(harnessPath, networkGuardPath, "");

    expect(result.status, `${harnessPath}\n${JSON.stringify(result)}`).toBe(1);
    expect(result.stdout, result.stderr).toContain("PatchGate G3 Live Read-Only Smoke Test Harness");
    expect(result.stderr).toContain("GitHub token is missing");
    expect(result.stderr).not.toContain("UNEXPECTED_NETWORK_REQUEST");
  });

  it("fails closed without authorization before making a network request", () => {
    const { harnessPath, networkGuardPath } = prepareHarnessWithSpacedPath();
    const result = runHarness(harnessPath, networkGuardPath, "test-token");

    expect(result.status, `${harnessPath}\n${JSON.stringify(result)}`).toBe(1);
    expect(result.stdout, result.stderr).toContain("PatchGate G3 Live Read-Only Smoke Test Harness");
    expect(result.stderr).toContain("Live smoke requires PATCHGATE_LIVE_SMOKE_AUTHORIZED=yes");
    expect(result.stderr).not.toContain("UNEXPECTED_NETWORK_REQUEST");
  });
});
