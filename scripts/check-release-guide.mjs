import { spawnSync } from "node:child_process";
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
const beta5Tag = "v0.1.0-beta.5";
const beta4Tag = "v0.1.0-beta.4";
const previousReleaseSha = "d8c67a848a95d456707e6c580a43e4e56e6071a0";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) return { ok: false, detail: result.error.message };
  if (result.status !== 0) {
    return { ok: false, detail: result.stderr.trim() || `exit status ${result.status}` };
  }
  return { ok: true, value: result.stdout.trim() };
}

function readGit(args, label) {
  const result = runGit(args);
  if (!result.ok) {
    failures.push(`${label} failed: ${result.detail}`);
    return null;
  }
  return result.value;
}

function requireTag(tag) {
  const ref = `refs/tags/${tag}`;
  const result = runGit(["show-ref", "--verify", "--quiet", ref]);
  if (!result.ok) {
    const detail = result.detail === "exit status 1" ? "the ref is not present" : result.detail;
    failures.push(
      `${tag} is unavailable in this checkout; fetch tags before running check:release-guide ` +
      `(CI checkout must retain tags): ${detail}`,
    );
    return false;
  }
  return true;
}

function requireGitType(spec, expected, label) {
  const actual = readGit(["cat-file", "-t", spec], `${label} object lookup`);
  if (actual && actual !== expected) {
    failures.push(`${label} must be a ${expected}; found ${actual}`);
  }
  return actual === expected;
}

function requireText(text, expected, label) {
  if (!text.includes(expected)) failures.push(`${label} is missing '${expected}'`);
}

const sourceSha = metadata.match(/\*\*Action source commit:\*\* `([0-9a-f]{40})`/i)?.[1];
const tagObjectSha = metadata.match(/\*\*Annotated tag object:\*\* `([0-9a-f]{40})`/i)?.[1];
if (!sourceSha) failures.push("beta.5 metadata must record a full Action source commit SHA");
if (!tagObjectSha) failures.push("beta.5 metadata must record a full annotated tag object SHA");

if (requireTag(beta5Tag)) {
  const beta5Ref = `refs/tags/${beta5Tag}`;
  const actualTagType = readGit(["cat-file", "-t", beta5Ref], `${beta5Tag} tag type`);
  const actualTagObjectSha = readGit(["rev-parse", "--verify", "--quiet", beta5Ref], `${beta5Tag} tag object`);
  const actualSourceSha = readGit(["rev-parse", "--verify", "--quiet", `${beta5Ref}^{commit}`], `${beta5Tag} source commit`);

  if (actualTagType && actualTagType !== "tag") {
    failures.push(`${beta5Tag} must be an annotated tag; found ${actualTagType}`);
  }
  if (tagObjectSha && actualTagObjectSha && actualTagObjectSha !== tagObjectSha) {
    failures.push(`${beta5Tag} tag object does not match metadata: expected ${tagObjectSha}, found ${actualTagObjectSha}`);
  }
  if (sourceSha && actualSourceSha && actualSourceSha !== sourceSha) {
    failures.push(`${beta5Tag} does not resolve to the metadata source commit: expected ${sourceSha}, found ${actualSourceSha}`);
  }
  if (actualSourceSha) {
    requireGitType(actualSourceSha, "commit", `${beta5Tag} source commit`);
    requireGitType(`${actualSourceSha}:action.yml`, "blob", `${beta5Tag} source action.yml`);
    requireGitType(`${actualSourceSha}:dist/action/index.js`, "blob", `${beta5Tag} source dist/action/index.js`);
  }
}

if (!/^[0-9a-f]{40}$/i.test(previousReleaseSha)) {
  failures.push("beta.4 reference must be a full 40-character commit SHA");
} else {
  requireGitType(previousReleaseSha, "commit", "beta.4 reference");
  if (requireTag(beta4Tag)) {
    const beta4Ref = `refs/tags/${beta4Tag}`;
    const actualBeta4Sha = readGit(["rev-parse", "--verify", "--quiet", `${beta4Ref}^{commit}`], `${beta4Tag} source commit`);
    if (actualBeta4Sha && actualBeta4Sha !== previousReleaseSha) {
      failures.push(`${beta4Tag} does not resolve to the documented commit: expected ${previousReleaseSha}, found ${actualBeta4Sha}`);
    }
  }
}

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
