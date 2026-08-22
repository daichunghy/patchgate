import { readFile } from "node:fs/promises";

const requiredWorkflow = await readFile(".github/workflows/ci.yml", "utf8");
const analysisWorkflow = await readFile(".github/workflows/codeql.yml", "utf8");
const shadowWorkflow = await readFile(".github/workflows/patchgate-shadow.yml", "utf8");

function assertMergeGroupTrigger(workflow, label) {
  if (!/^\s{2}merge_group:\s*$/m.test(workflow) || !/^\s{4}types:\s*\[checks_requested\]\s*$/m.test(workflow)) {
    throw new Error(`${label} must run on merge_group checks_requested events`);
  }
}

assertMergeGroupTrigger(requiredWorkflow, ".github/workflows/ci.yml");
assertMergeGroupTrigger(analysisWorkflow, ".github/workflows/codeql.yml");

function assertShadowPermission(workflow, permission, level) {
  const pattern = new RegExp(`^\\s{2}${permission}:\\s+${level}\\s*$`, "m");
  if (!pattern.test(workflow)) throw new Error(`.github/workflows/patchgate-shadow.yml must request ${permission}: ${level}`);
}

for (const [permission, level] of [["checks", "write"], ["actions", "read"], ["pull-requests", "read"], ["contents", "read"]]) {
  assertShadowPermission(shadowWorkflow, permission, level);
}
console.log("workflow event and shadow-permission checks passed: required CI/CodeQL cover merge_group checks_requested and the Action can verify workflow provenance");
