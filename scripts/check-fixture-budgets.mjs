import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

const root = resolve("fixtures/api");
const files = (await readdir(root)).filter((file) => file.endsWith(".json") && file !== "manifest.json");
let failures = 0;
for (const file of files) {
  const path = resolve(root, file);
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(value.exchanges)) {
    console.error(`${file}: exchanges must be an array`);
    failures += 1;
    continue;
  }
  for (const [index, exchange] of value.exchanges.entries()) {
    const actual = Buffer.byteLength(typeof exchange.response.body === "string" ? exchange.response.body : canonical(exchange.response.body), "utf8");
    if (actual > 2 * 1024 * 1024 || exchange.response.bytes < actual) {
      console.error(`${file} exchange ${index}: declared response bytes under-report the payload or exceed 2 MiB`);
      failures += 1;
    }
    if (!Number.isInteger(exchange.response.bytes) || exchange.response.bytes < 0) {
      console.error(`${file} exchange ${index}: response bytes must be a non-negative integer`);
      failures += 1;
    }
  }
}
if (failures > 0) process.exitCode = 1;
else console.log(`fixture budget checks passed: ${files.length} API fixtures`);
