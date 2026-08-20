import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const actionText = fs.readFileSync(path.join(root, "action.yml"), "utf8");
const failures = [];

if (packageJson.private !== true) failures.push("package.json must remain private until a maintainer authorizes a public release");
if (typeof packageJson.version !== "string" || !packageJson.version.endsWith("-dev")) failures.push("the current package version must remain an explicit development version");
if (!actionText.includes("main: 'dist/action/index.js'")) failures.push("root action.yml must point to the committed bundle");
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

console.log(`release candidate checks passed: ${packageJson.name}@${packageJson.version} remains an unpublished development package with a complete CLI/Action pack surface`);
