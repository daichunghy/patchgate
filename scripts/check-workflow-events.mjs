import { readFile } from "node:fs/promises";

const requiredWorkflow = await readFile(".github/workflows/ci.yml", "utf8");
const analysisWorkflow = await readFile(".github/workflows/codeql.yml", "utf8");

function assertMergeGroupTrigger(workflow, label) {
  if (!/^\s{2}merge_group:\s*$/m.test(workflow) || !/^\s{4}types:\s*\[checks_requested\]\s*$/m.test(workflow)) {
    throw new Error(`${label} must run on merge_group checks_requested events`);
  }
}

assertMergeGroupTrigger(requiredWorkflow, ".github/workflows/ci.yml");
assertMergeGroupTrigger(analysisWorkflow, ".github/workflows/codeql.yml");
console.log("workflow event checks passed: required CI and CodeQL cover merge_group checks_requested");
