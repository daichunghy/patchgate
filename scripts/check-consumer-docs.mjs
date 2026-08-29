#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const currentTag = "v0.1.0-beta.5";
const currentReleaseUrl = `https://github.com/daichunghy/patchgate/releases/tag/${currentTag}`;
const surfaces = [
  "README.md",
  "docs/github-action-usage.md",
  "docs/getting-started.md",
  "docs/releases/beta-release-and-rollback.md",
];
const failures = [];

for (const relativePath of surfaces) {
  const text = readFileSync(join(root, relativePath), "utf8");
  if (!text.includes(currentTag)) failures.push(`${relativePath} must name ${currentTag}`);
  if (!text.includes(currentReleaseUrl)) failures.push(`${relativePath} must link the ${currentTag} release`);
}

const usage = readFileSync(join(root, "docs/github-action-usage.md"), "utf8");
if (!usage.includes(`uses: daichunghy/patchgate@${currentTag}`)) {
  failures.push("docs/github-action-usage.md must pin the current beta in consumer examples");
}
if (usage.includes("beta.2 posts a Check Run")) {
  failures.push("docs/github-action-usage.md contains the stale beta.2 Check Run claim");
}
if (!usage.includes("snapshot-rejection Check Runs are included in beta.5")) {
  failures.push("docs/github-action-usage.md must state the current snapshot-rejection Check Run behavior");
}

const readme = readFileSync(join(root, "README.md"), "utf8");
if (readme.includes("uses: daichunghy/patchgate@v0.1.0-beta.2")) {
  failures.push("README.md must not teach the superseded beta.2 Action reference");
}

if (failures.length > 0) {
  process.stderr.write(`consumer documentation check failed:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`consumer documentation check passed: ${surfaces.length} public surfaces reference ${currentTag}\n`);
