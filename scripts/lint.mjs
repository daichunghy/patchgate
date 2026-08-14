import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    if (entry.isFile() && path.endsWith(".ts")) files.push(path);
  }
  return files;
}

const files = await filesIn("src");
const violations = [];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  if (/\bany\b/.test(contents)) violations.push(`${file}: production TypeScript must not use any`);
  if (/pull_request_target[\s\S]{0,1200}(checkout|npm install|npm test|npm run|make test)/i.test(contents)) {
    violations.push(`${file}: privileged workflow must not execute pull-request code`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`lint ok: ${files.length} TypeScript source files`);
}
