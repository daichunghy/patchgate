import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const bundleRoot = path.join(root, "dist", "action");
const actionMetadata = path.join(root, "action.yml");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patchgate-consumer-fixture-"));
const consumerRoot = path.join(tempRoot, "consumer");
const consumerActionRoot = path.join(consumerRoot, ".github", "actions", "patchgate");
const workflowPath = path.join(consumerRoot, ".github", "workflows", "patchgate.yml");

function fail(message) {
  console.error(`consumer fixture failed: ${message}`);
  process.exitCode = 1;
}

try {
  if (!fs.existsSync(bundleRoot) || !fs.existsSync(actionMetadata)) {
    fail("run npm run bundle:action before the consumer fixture");
  } else {
    fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
    fs.mkdirSync(consumerActionRoot, { recursive: true });

    const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    if (!/^[0-9a-f]{40}$/i.test(commitSha)) fail(`current commit is not a full SHA: ${commitSha}`);

    fs.writeFileSync(workflowPath, `name: Consumer PatchGate\n\non:\n  pull_request:\n\npermissions:\n  contents: read\n  checks: write\n\njobs:\n  evaluate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: daichunghy/patchgate@${commitSha}\n        with:\n          fail-on: never\n          create-check-run: false\n`, "utf8");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    if (!workflow.includes(`uses: daichunghy/patchgate@${commitSha}`)) fail("consumer workflow lost its pinned Action reference");

    fs.copyFileSync(actionMetadata, path.join(consumerActionRoot, "action.yml"));
    fs.cpSync(bundleRoot, path.join(consumerActionRoot, "dist", "action"), { recursive: true });

    const copiedFiles = [];
    const walk = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(entryPath);
        else copiedFiles.push(path.relative(consumerActionRoot, entryPath));
      }
    };
    walk(consumerActionRoot);
    if (copiedFiles.some((file) => file.startsWith("src/") || file.startsWith("schemas/") || file.includes("node_modules/"))) {
      fail("consumer bundle copied source schemas or node_modules");
    }

    const eventPath = path.join(consumerRoot, "merge-group-event.json");
    const outputPath = path.join(consumerRoot, "github-output.txt");
    const summaryPath = path.join(consumerRoot, "step-summary.md");
    fs.writeFileSync(eventPath, JSON.stringify({ merge_group: { head_sha: "merge-group-fixture-sha" } }), "utf8");
    fs.writeFileSync(outputPath, "", "utf8");
    fs.writeFileSync(summaryPath, "", "utf8");

    const result = spawnSync(process.execPath, [path.join(consumerActionRoot, "dist", "action", "index.js")], {
      cwd: consumerRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "merge_group",
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        GITHUB_WORKSPACE: consumerRoot,
        INPUT_FAIL_ON: "never",
        INPUT_CREATE_CHECK_RUN: "false",
        GITHUB_TOKEN: "",
      },
    });

    const output = fs.readFileSync(outputPath, "utf8");
    const summary = fs.readFileSync(summaryPath, "utf8");
    if (result.status !== 0) fail(`shadow merge-group execution exited ${result.status}: ${result.stderr}`);
    if (!output.includes("status=evidence_missing")) fail("merge-group result was not written as evidence_missing");
    if (!summary.includes("merge_group")) fail("merge-group boundary was not explained in the summary");
    if (process.exitCode !== 1) console.log("consumer fixture passed: full-SHA reference, clean-room bundle and non-blocking merge-group boundary verified");
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
