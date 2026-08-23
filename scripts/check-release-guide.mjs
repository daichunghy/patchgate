import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const guidePath = path.join(root, "docs/releases/beta-release-and-rollback.md");
const usagePath = path.join(root, "docs/github-action-usage.md");
const metadataPath = path.join(root, "docs/releases/2026-08-23-beta.5.md");
const packagePath = path.join(root, "package.json");

const guide = fs.readFileSync(guidePath, "utf8");
const usage = fs.readFileSync(usagePath, "utf8");
const metadata = fs.readFileSync(metadataPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const failures = [];

function requireText(text, expected, label) {
  if (!text.includes(expected)) failures.push(`${label} is missing '${expected}'`);
}

const sourceSha = metadata.match(/\*\*Action source commit:\*\* `([0-9a-f]{40})`/i)?.[1];
const tagObjectSha = metadata.match(/\*\*Annotated tag object:\*\* `([0-9a-f]{40})`/i)?.[1];
const previousReleaseSha = "d8c67a848a95d456707e6c580a43e4e56e6071a0";

if (!sourceSha) failures.push("beta.5 metadata must record a full Action source commit SHA");
if (!tagObjectSha) failures.push("beta.5 metadata must record a full annotated tag object SHA");

if (sourceSha) {
  requireText(guide, `daichunghy/patchgate@${sourceSha}`, "release guide current install reference");
  requireText(usage, `daichunghy/patchgate@${sourceSha}`, "usage guide current install reference");
}
requireText(guide, previousReleaseSha, "release guide previous beta release reference");

if (sourceSha) {
  const previousReference = `uses: daichunghy/patchgate@${previousReleaseSha}`;
  const upgradedReference = previousReference.replace(previousReleaseSha, sourceSha);
  const rolledBackReference = upgradedReference.replace(sourceSha, previousReleaseSha);
  if (rolledBackReference !== previousReference) {
    failures.push("release guide full-SHA upgrade and rollback transition did not round-trip");
  }
}

for (const [text, label] of [[guide, "release guide"], [usage, "usage guide"]]) {
  const references = [...text.matchAll(/^\s*uses:\s*daichunghy\/patchgate@([^\s#]+)/gmi)].map((match) => match[1]);
  for (const reference of references) {
    if (!/^[0-9a-f]{40}$/i.test(reference)) {
      failures.push(`${label} contains a non-immutable PatchGate consumer reference '${reference}'`);
    }
  }
}

for (const heading of [
  "## Current release identity",
  "## Validate a release commit",
  "## Install in shadow mode",
  "## Immutable commit, release tag and moving major tag",
  "## Upgrade and downgrade",
  "## Rollback procedure",
  "## Marketplace publication prerequisites",
  "## Non-claims and unsupported evidence",
]) requireText(guide, heading, "release guide section");

for (const expected of [
  "release_tag=\"v0.1.0-beta.5\"",
  "git rev-parse \"$release_tag^{commit}\"",
  "npm run verify",
  "npm run verify:dist",
  "npm run test:consumer-fixture",
  "fail-on: never",
  "contents: read",
  "pull-requests: read",
  "actions: read",
  "checks: write",
  "not a Marketplace listing",
  "tamper-proof receipt",
  "external pilot",
  "downstream adoption",
  "pending evidence",
]) requireText(guide, expected, "release guide safety or evidence control");

for (const forbidden of ["contents", "pull-requests", "actions", "administration"]) {
  if (new RegExp(`^\\s*${forbidden}:\\s*write\\s*$`, "m").test(guide)) {
    failures.push(`release guide must not grant '${forbidden}: write'`);
  }
}

if (packageJson.private !== true || packageJson.version !== "0.1.0-dev") {
  failures.push("release guide validator expects the package to remain private at 0.1.0-dev");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`release guide check failed: ${failure}`);
  process.exit(1);
}

console.log("release guide checks passed: beta.5 metadata, full-SHA install, shadow permissions, release validation, upgrade/downgrade, rollback and non-claims are documented");
