import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const roots = ["README.md", "AGENTS.md", ".github", "docs"];
const files = [];

async function collect(path) {
  const information = await stat(path);
  if (information.isDirectory()) {
    for (const entry of await readdir(path)) await collect(resolve(path, entry));
    return;
  }
  if (extname(path).toLowerCase() === ".md") files.push(path);
}

for (const root of roots) await collect(resolve(root));

const failures = [];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  let fenced = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(linkPattern)) {
      let target = (match[1] ?? "").trim();
      if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
      const titleStart = target.search(/\s+["'].*["']\s*$/);
      if (titleStart >= 0) target = target.slice(0, titleStart).trim();
      if (target === "" || target.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(target) || /^(?:mailto|tel):/i.test(target)) continue;
      const [path] = target.split("#", 1);
      if (path === "") continue;
      let decoded;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        failures.push(`${file}:${index + 1}: malformed link target '${target}'`);
        continue;
      }
      const candidate = resolve(dirname(file), decoded);
      try {
        await stat(candidate);
      } catch {
        failures.push(`${file}:${index + 1}: missing target '${target}'`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`documentation link checks passed: ${files.length} Markdown files scanned`);
