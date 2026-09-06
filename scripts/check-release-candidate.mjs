import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const actionText = fs.readFileSync(path.join(root, "action.yml"), "utf8");
const rollbackText = fs.readFileSync(path.join(root, "docs/releases/beta-release-and-rollback.md"), "utf8");
const checklistText = fs.readFileSync(path.join(root, "docs/release-candidate-checklist.md"), "utf8");
const failures = [];

if (packageJson.private === true) failures.push("package.json must publish the maintainer-authorized scoped prerelease; private:true blocks installation");
if (packageJson.name !== "@daichunghy/patchgate") failures.push("the npm package name must stay scoped as @daichunghy/patchgate because the unscoped name belongs to another project");
if (typeof packageJson.version !== "string" || !/^0\.1\.0-beta\.\d+$/.test(packageJson.version)) failures.push("the current package version must be an explicit 0.1.0 beta prerelease");
if (!actionText.includes("main: 'dist/action/index.js'")) failures.push("root action.yml must point to the committed bundle");
for (const requiredText of [
  "same immutable candidate",
  "fail-on: never",
  "create-check-run: true",
  "Previous known-good SHA",
  "Rollback is a consumer workflow change",
]) {
  if (!rollbackText.includes(requiredText)) failures.push(`beta rollback runbook is missing: ${requiredText}`);
}
if (checklistText.includes("no public Action tag")) {
  failures.push("release-candidate checklist contains the stale no-public-Action claim");
}
if (!checklistText.includes("v0.1.0-beta.5")) {
  failures.push("release-candidate checklist must name the current public beta tag");
}
for (const relativePath of ["LICENSE", "README.md", "action.yml", "dist/action/index.js", "dist/src/cli.js"]) {
  if (!fs.existsSync(path.join(root, relativePath))) failures.push(`missing release artifact: ${relativePath}`);
}
const pack = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8" });
if (pack.status !== 0) {
  failures.push(`npm pack --dry-run failed: ${pack.stderr.trim()}`);
} else {
  try {
    const manifest = JSON.parse(pack.stdout);
    const files = new Set((manifest[0]?.files ?? []).map((entry) => entry.path));
    for (const expected of ["package.json", "README.md", "LICENSE", "action.yml", "dist/action/index.js", "dist/src/cli.js"]) {
      if (!files.has(expected)) failures.push(`npm pack output is missing ${expected}`);
    }
    if ([...files].some((file) => file.includes("node_modules/"))) failures.push("npm pack output contains node_modules");
  } catch (error) {
    failures.push(`could not parse npm pack manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`release candidate check failed: ${failure}`);
  process.exit(1);
}

console.log(`release candidate checks passed: ${packageJson.name}@${packageJson.version} is the authorized scoped prerelease with a complete CLI/Action pack surface`);
