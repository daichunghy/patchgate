import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workflowRoot = resolve(".github/workflows");
const workflowFiles = (await readdir(workflowRoot)).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
const findings = [];
for (const file of workflowFiles) {
  const contents = await readFile(resolve(workflowRoot, file), "utf8");
  const usesPattern = /uses:\s*actions\/[^\s@]+@([^\s#]+)/g;
  for (const match of contents.matchAll(usesPattern)) {
    const ref = match[1] ?? "";
    if (!/^[0-9a-f]{40}$/i.test(ref)) findings.push(`${file}: third-party Action ref '${ref}' is not pinned to a 40-character commit SHA`);
  }
}
if (findings.length > 0) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`workflow pin checks passed: ${workflowFiles.length} workflow files`);
}
