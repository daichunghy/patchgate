import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dossierPath = resolve("docs/application/codex-for-open-source-form-draft.md");
const dossier = await readFile(dossierPath, "utf8");

function fail(message) {
  throw new Error(`application dossier check failed: ${message}`);
}

function fieldBody(heading) {
  const codeFence = "```";
  const startMarker = `${heading}\n\n${codeFence}text\n`;
  const start = dossier.indexOf(startMarker);
  if (start < 0) fail(`missing copy-ready field: ${heading}`);
  const bodyStart = start + startMarker.length;
  const end = dossier.indexOf(`\n${codeFence}`, bodyStart);
  if (end < 0) fail(`unterminated copy-ready field: ${heading}`);
  return dossier.slice(bodyStart, end);
}

if (!dossier.includes("https://openai.com/form/codex-for-oss/")) fail("official form URL is missing");
if (!dossier.includes("[FILL BEFORE SUBMISSION]")) fail("manual applicant placeholders are missing");
if (!dossier.includes("[CONFIRM PRIMARY OR CORE MAINTAINER]")) fail("maintainer-role confirmation is missing");

const fields = {
  qualification: fieldBody("### Why does this repository qualify? (maximum 500 characters)"),
  credits: fieldBody("### How will you use API credits for your project? (maximum 500 characters)"),
  context: fieldBody("### Anything else we should know? (maximum 500 characters)"),
};

for (const [name, value] of Object.entries(fields)) {
  if (value.length > 500) fail(`${name} is ${value.length} characters; maximum is 500`);
  if (value.trim().length < 80) fail(`${name} is too short to be useful`);
}

console.log(`application dossier checks passed: qualification=${fields.qualification.length}, credits=${fields.credits.length}, context=${fields.context.length} characters`);
