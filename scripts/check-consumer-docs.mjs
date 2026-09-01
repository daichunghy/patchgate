#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const releaseDoc = readFileSync(
  join(root, "docs/releases/beta-release-and-rollback.md"),
  "utf8",
);
const releaseMatch = releaseDoc.match(
  /\[\`(v\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)\`\]\(https:\/\/github\.com\/daichunghy\/patchgate\/releases\/tag\/\1\)/,
);
const failures = [];

if (!releaseMatch) {
  failures.push(
    "release runbook must link the current public release using a self-consistent tag and URL",
  );
}

const currentTag = releaseMatch?.[1] ?? "";
const currentReleaseUrl = currentTag
  ? `https://github.com/daichunghy/patchgate/releases/tag/${currentTag}`
  : "";
// The README is intentionally release-agnostic. Release assertions belong in
// the focused consumer and release runbooks so the front page can stay useful
// between releases.
const surfaces = [
  "docs/github-action-usage.md",
  "docs/getting-started.md",
  "docs/releases/beta-release-and-rollback.md",
];

for (const relativePath of surfaces) {
  const text = readFileSync(join(root, relativePath), "utf8");
  if (currentTag && !text.includes(currentTag)) {
    failures.push(`${relativePath} must name ${currentTag}`);
  }
  if (currentReleaseUrl && !text.includes(currentReleaseUrl)) {
    failures.push(`${relativePath} must link the ${currentTag} release`);
  }
}

const usage = readFileSync(join(root, "docs/github-action-usage.md"), "utf8");
if (currentTag && !usage.includes(`uses: daichunghy/patchgate@${currentTag}`)) {
  failures.push(
    "docs/github-action-usage.md must pin the current public release in consumer examples",
  );
}
if (usage.includes("beta.2 posts a Check Run")) {
  failures.push("docs/github-action-usage.md contains the stale beta.2 Check Run claim");
}
if (!usage.includes("snapshot-rejection Check Runs are included in the public beta")) {
  failures.push(
    "docs/github-action-usage.md must describe snapshot-rejection Check Run behavior without a release-specific claim",
  );
}

if (failures.length > 0) {
  process.stderr.write(`consumer documentation check failed:\\n${failures.join("\\n")}\\n`);
  process.exit(1);
}

process.stdout.write(
  `consumer documentation check passed: ${surfaces.length} focused public surfaces follow the canonical release runbook\\n`,
);
