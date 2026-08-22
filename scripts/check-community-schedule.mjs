import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workflowPath = resolve(".github/workflows/community-discussion-schedule.yml");
const postsPath = resolve(".github/community-posts.json");

function fail(message) {
  throw new Error(`community schedule check failed: ${message}`);
}

const workflow = await readFile(workflowPath, "utf8");
const posts = JSON.parse(await readFile(postsPath, "utf8"));

if (!workflow.includes("discussions: write")) fail("workflow must request discussions: write");
if (!workflow.includes("GH_TOKEN: ${{ github.token }}")) fail("workflow must use the repository-scoped built-in token");
if (workflow.includes("PATCHGATE_DISCUSSION_TOKEN")) fail("workflow must not require a personal token secret");
if (!workflow.includes("workflow_dispatch") || !workflow.includes("publish=true")) fail("manual publish guard is missing");
if (!workflow.includes("discussions(first:100") || !workflow.includes("A discussion with this title already exists")) fail("duplicate-title guard is missing");
if (!Array.isArray(posts) || posts.length < 3) fail("at least three scheduled posts are required");

const titles = new Set();
const dates = [];
for (const [index, post] of posts.entries()) {
  if (post === null || typeof post !== "object") fail(`post ${index + 1} is not an object`);
  if (typeof post.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(post.date)) fail(`post ${index + 1} has an invalid ISO date`);
  if (typeof post.title !== "string" || post.title.trim().length < 20) fail(`post ${index + 1} needs a specific title`);
  if (typeof post.body !== "string" || post.body.trim().length < 120) fail(`post ${index + 1} needs substantive hand-written copy`);
  if (titles.has(post.title)) fail(`duplicate title: ${post.title}`);
  titles.add(post.title);
  dates.push(Date.parse(`${post.date}T00:00:00Z`));
}

for (let index = 1; index < dates.length; index += 1) {
  if (dates[index] <= dates[index - 1]) fail("scheduled dates must be strictly increasing");
  if (dates[index] - dates[index - 1] !== 2 * 24 * 60 * 60 * 1000) fail("scheduled posts must be exactly two days apart");
}

console.log(`community schedule checks passed: ${posts.length} unique substantive posts, two-day cadence, built-in token and duplicate guard`);
