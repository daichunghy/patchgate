import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`missing agent-contract file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

const map = read("docs/agent-verification-map.md");
const protocol = read("docs/agent-evaluation-protocol.md");
const evalManifestText = read("fixtures/agent-evals/manifest.json");
const constitution = read("docs/PROJECT_CONSTITUTION.md");
const agents = read("AGENTS.md");
const packageJson = JSON.parse(read("package.json"));

let evalManifest = null;
if (evalManifestText) {
  try {
    evalManifest = JSON.parse(evalManifestText);
  } catch {
    failures.push("agent evaluation manifest is not valid JSON");
  }
}

for (const requiredText of [
  "docs/PROJECT_CONSTITUTION.md",
  "docs/implementation-roadmap.md",
  "docs/agent-work-packages.yml",
  "npm run verify",
  "testedSha",
  "pull_request_target",
  "merge_group",
  "Timeouts, unsupported tools and unreviewed agent summaries are not completion",
]) {
  if (!map.includes(requiredText)) failures.push(`verification map is missing: ${requiredText}`);
}

for (const requiredText of [
  "AG-01",
  "AG-10",
  "Functional correctness",
  "Contract fidelity",
  "Security",
  "Parent verification command and result",
  "zero false green",
]) {
  if (!protocol.includes(requiredText)) failures.push(`evaluation protocol is missing: ${requiredText}`);
}

const expectedEvaluationIds = new Set(["AG-01", "AG-02", "AG-03", "AG-04", "AG-05", "AG-06", "AG-07", "AG-08", "AG-09", "AG-10"]);
if (!evalManifest || evalManifest.version !== 1 || !Array.isArray(evalManifest.tasks)) {
  failures.push("agent evaluation manifest must declare version 1 and a tasks array");
} else {
  const actualIds = new Set();
  for (const task of evalManifest.tasks) {
    if (!task || typeof task !== "object") {
      failures.push("agent evaluation manifest contains a non-object task");
      continue;
    }
    if (typeof task.id !== "string" || actualIds.has(task.id)) failures.push(`agent evaluation task has a missing or duplicate ID: ${String(task.id)}`);
    if (typeof task.id === "string") actualIds.add(task.id);
    if (!Array.isArray(task.paths) || task.paths.length === 0) failures.push(`${task.id}: task must declare allowed paths`);
    if (!Array.isArray(task.commands) || task.commands.length === 0) failures.push(`${task.id}: task must declare acceptance commands`);
    if (typeof task.owner !== "string" || task.owner.length === 0) failures.push(`${task.id}: task must declare a risk owner`);
    if (task.risk === "critical" && task.humanReview !== true) failures.push(`${task.id}: critical task must require human review`);
    for (const command of task.commands ?? []) {
      if (typeof command !== "string" || !command.startsWith("npm run ")) failures.push(`${task.id}: acceptance command must use an npm run script: ${String(command)}`);
      const scriptName = typeof command === "string" ? command.slice("npm run ".length).trim() : "";
      if (scriptName && !packageJson.scripts?.[scriptName]) failures.push(`${task.id}: acceptance script is not declared in package.json: ${scriptName}`);
    }
  }
  for (const id of expectedEvaluationIds) if (!actualIds.has(id)) failures.push(`agent evaluation manifest is missing: ${id}`);
  for (const id of actualIds) if (!expectedEvaluationIds.has(id)) failures.push(`agent evaluation manifest contains unexpected task: ${id}`);
}

for (const requiredText of [
  "trusted base revision",
  "must not",
  "Definition of done",
]) {
  if (!constitution.includes(requiredText)) failures.push(`constitution anchor is missing: ${requiredText}`);
}

for (const requiredText of [
  "PROJECT_CONSTITUTION.md",
  "npm run verify",
  "docs/agent-verification-map.md",
  "docs/agent-evaluation-protocol.md",
]) {
  if (!agents.includes(requiredText)) failures.push(`AGENTS.md anchor is missing: ${requiredText}`);
}

if (typeof packageJson.scripts?.verify !== "string" || !packageJson.scripts.verify.includes("check:agent-contract")) {
  failures.push("package.json verify script must include check:agent-contract");
}
if (packageJson.scripts?.["agent-eval"] !== "node scripts/run-agent-eval.mjs") {
  failures.push("package.json must expose the manifest-backed agent-eval runner");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("agent contract ok: verification map and evaluation protocol are present");
}
