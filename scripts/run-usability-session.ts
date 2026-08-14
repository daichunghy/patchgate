#!/usr/bin/env node
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

interface TaskRecord {
  taskId: string;
  taskTitle: string;
  durationMs: number;
  completed: boolean;
  notes: string;
}

const records: TaskRecord[] = [];
const tempDirs: string[] = [];

function cleanup(): void {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
}

function runCli(args: string[], cwd?: string): { exit: number | null; stdout: string; stderr: string } {
  const cliPath = resolve("dist/src/cli.js");
  const res = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: cwd ?? process.cwd(),
    encoding: "utf8",
  });
  return { exit: res.status, stdout: res.stdout.trim(), stderr: res.stderr.trim() };
}

async function runSession(): Promise<void> {
  console.log("==================================================================");
  console.log("  PatchGate G2 Preflight Usability Session Runner (PG-211/UR-001)");
  console.log("==================================================================\n");

  try {
    // ---------------------------------------------------------
    // Task T1: Create a safe PatchGate draft
    // ---------------------------------------------------------
    console.log("▶ Executing Task T1: Initialize safe policy draft (`patchgate init`)...");
    const t1Dir = mkdtempSync("/tmp/patchgate-usability-t1-");
    tempDirs.push(t1Dir);
    const startT1 = Date.now();
    const resT1 = runCli(["init", "--path", t1Dir]);
    const durationT1 = Date.now() - startT1;

    const t1Success = resT1.exit === 0 && resT1.stdout.includes("Status: draft only") && resT1.stdout.includes("Enforcement: not enabled");
    records.push({
      taskId: "T1",
      taskTitle: "Initialize draft policy",
      durationMs: durationT1,
      completed: t1Success,
      notes: t1Success ? "Draft created with 'Enforcement: not enabled'" : "Failed to init draft",
    });
    console.log(`  ✓ T1 completed in ${durationT1}ms [Success: ${t1Success}]\n`);

    // ---------------------------------------------------------
    // Task T2: Validate draft & run local preflight
    // ---------------------------------------------------------
    console.log("▶ Executing Task T2: Validate policy & run local preflight...");
    const startT2 = Date.now();
    const resT2Validate = runCli(["validate", "--policy", join(t1Dir, "patchgate.yml")]);
    const resT2Preflight = runCli(["preflight", "--base", join(t1Dir, "patchgate.yml")]);
    const durationT2 = Date.now() - startT2;

    const t2Success = resT2Validate.exit === 0 && resT2Preflight.exit === 0 && resT2Preflight.stdout.includes("Status: valid local policy");
    records.push({
      taskId: "T2",
      taskTitle: "Validate policy & local preflight",
      durationMs: durationT2,
      completed: t2Success,
      notes: t2Success ? "Valid local policy confirmed without raw JSON dependency" : "Validation or preflight failed",
    });
    console.log(`  ✓ T2 completed in ${durationT2}ms [Success: ${t2Success}]\n`);

    // ---------------------------------------------------------
    // Task T3: Git-ref preflight vs dirty working tree
    // ---------------------------------------------------------
    console.log("▶ Executing Task T3: Inspect Git-ref authority vs uncommitted working tree...");
    const t3Dir = mkdtempSync("/tmp/patchgate-usability-t3-");
    tempDirs.push(t3Dir);
    spawnSync("git", ["-C", t3Dir, "init", "-q", "-b", "main"]);
    spawnSync("git", ["-C", t3Dir, "config", "user.email", "usability@patchgate.dev"]);
    spawnSync("git", ["-C", t3Dir, "config", "user.name", "PatchGate Usability"]);
    writeFileSync(join(t3Dir, "patchgate.yml"), "version: 1\nissueLinkage:\n  required: true\n", "utf8");
    spawnSync("git", ["-C", t3Dir, "add", "patchgate.yml"]);
    spawnSync("git", ["-C", t3Dir, "commit", "-q", "-m", "base policy"]);

    // Dirty working tree self-relaxation
    writeFileSync(join(t3Dir, "patchgate.yml"), "version: 1\n", "utf8");

    const startT3 = Date.now();
    const resT3 = runCli(["preflight", "--base", "HEAD", "--repo", t3Dir, "--json"]);
    const durationT3 = Date.now() - startT3;

    const parsedT3 = JSON.parse(resT3.stdout) as { policy?: { issueLinkage?: { required?: boolean } } };
    const t3Success = resT3.exit === 0 && parsedT3.policy?.issueLinkage?.required === true;
    records.push({
      taskId: "T3",
      taskTitle: "Git-ref authority over working tree",
      durationMs: durationT3,
      completed: t3Success,
      notes: t3Success ? "Working-tree self-relaxation safely ignored; base commit governs" : "Failed to bind to HEAD",
    });
    console.log(`  ✓ T3 completed in ${durationT3}ms [Success: ${t3Success}]\n`);

    // ---------------------------------------------------------
    // Task T4: Prose conflict & unsupported guidance
    // ---------------------------------------------------------
    console.log("▶ Executing Task T4: Discover prose conflict and unsupported guidance...");
    const startT4 = Date.now();
    const resT4Conflict = runCli(["preflight", "--base", resolve("fixtures/repositories/conflicting-prose/patchgate.yml")]);
    const resT4Unsupported = runCli(["preflight", "--base", resolve("fixtures/repositories/unsupported-guidance/patchgate.yml")]);
    const durationT4 = Date.now() - startT4;

    const t4Success = resT4Conflict.exit === 0 &&
      resT4Conflict.stdout.includes("DISCOVERY_POLICY_CONFLICT") &&
      resT4Unsupported.exit === 0 &&
      resT4Unsupported.stdout.includes("DISCOVERY_UNSUPPORTED");
    records.push({
      taskId: "T4",
      taskTitle: "Prose guidance classification",
      durationMs: durationT4,
      completed: t4Success,
      notes: t4Success ? "Prose classified as advisory/needs_confirmation without blocking" : "Guidance classification failed",
    });
    console.log(`  ✓ T4 completed in ${durationT4}ms [Success: ${t4Success}]\n`);

    // ---------------------------------------------------------
    // Task T5: Doctor diagnostics on missing policy
    // ---------------------------------------------------------
    console.log("▶ Executing Task T5: Doctor diagnostics on missing policy repository...");
    const t5Dir = mkdtempSync("/tmp/patchgate-usability-t5-");
    tempDirs.push(t5Dir);
    const startT5 = Date.now();
    const resT5 = runCli(["doctor", "--base", t5Dir]);
    const durationT5 = Date.now() - startT5;

    const t5Success = resT5.exit === 1 && resT5.stdout.includes("PatchGate policy is missing or invalid");
    records.push({
      taskId: "T5",
      taskTitle: "Doctor diagnostic check",
      durationMs: durationT5,
      completed: t5Success,
      notes: t5Success ? "Doctor clearly identified missing policy and provided remediation" : "Doctor failed to diagnose",
    });
    console.log(`  ✓ T5 completed in ${durationT5}ms [Success: ${t5Success}]\n`);

    // ---------------------------------------------------------
    // Session Summary Table
    // ---------------------------------------------------------
    console.log("------------------------------------------------------------------");
    console.log("             G2 Usability Session Telemetry Report                ");
    console.log("------------------------------------------------------------------");
    console.log("| Task | Title                               | Time (ms) | Status |");
    console.log("|------|-------------------------------------|-----------|--------|");
    for (const r of records) {
      const statusStr = r.completed ? "PASS ✅" : "FAIL ❌";
      console.log(`| ${r.taskId.padEnd(4)} | ${r.taskTitle.padEnd(35)} | ${String(r.durationMs).padStart(9)} | ${statusStr} |`);
    }
    console.log("------------------------------------------------------------------");

    const allPassed = records.every((r) => r.completed);
    if (!allPassed) {
      console.error("\n❌ Usability session encountered failed tasks.");
      process.exit(1);
    } else {
      console.log("\n✅ All G2 Usability tasks verified successfully with clean-room isolation.\n");
    }
  } finally {
    cleanup();
  }
}

runSession().catch((err) => {
  console.error("Fatal error in usability session runner:", err);
  process.exit(1);
});
