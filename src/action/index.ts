import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evaluateContribution } from "../evaluator.js";
import { GITHUB_ACCEPT, GITHUB_API_VERSION } from "../github/api-types.js";
import { createFetchTransport, GitHubClient } from "../github/client.js";
import { buildGitHubSnapshot } from "../github/snapshot-builder.js";
import type { GitHubSnapshotRequest } from "../github/identity.js";
import type { ContributionReceipt, FinalStatus } from "../types.js";

export interface ActionInputs {
  failOn: "never" | "blocked" | "human_review_required" | "evidence_missing" | "policy_ambiguous";
  githubToken: string;
  reportPath: string;
  createCheckRun: boolean;
  checkName: string;
}

const MAX_ACTION_SUMMARY_LENGTH = 64_000;

// The GitHub Actions runner exports inputs as INPUT_<NAME> with dashes
// preserved (e.g. `github-token` -> `INPUT_GITHUB-TOKEN`). Accept that form
// first and keep the underscore form as a fallback for non-runner callers.
function actionInput(env: NodeJS.ProcessEnv, dashedName: string, underscoreName: string): string | undefined {
  const dashed = env[`INPUT_${dashedName}`];
  if (dashed !== undefined && dashed.trim().length > 0) return dashed;
  return env[`INPUT_${underscoreName}`];
}

export function parseActionInputs(env: NodeJS.ProcessEnv = process.env): ActionInputs {
  const failOnRaw = actionInput(env, "FAIL-ON", "FAIL_ON")?.trim() || "blocked";
  const validFailOns = ["never", "blocked", "human_review_required", "evidence_missing", "policy_ambiguous"] as const;
  const failOn = validFailOns.includes(failOnRaw as ActionInputs["failOn"]) ? (failOnRaw as ActionInputs["failOn"]) : "blocked";

  const reportPath = actionInput(env, "REPORT-PATH", "REPORT_PATH")?.trim() || "patchgate-receipt.json";
  const checkName = actionInput(env, "CHECK-NAME", "CHECK_NAME")?.trim() || "PatchGate Review Gate";
  assertActionText(reportPath, "report-path", 500);
  assertActionText(checkName, "check-name", 200);
  return {
    failOn,
    githubToken: actionInput(env, "GITHUB-TOKEN", "GITHUB_TOKEN")?.trim() || env.GITHUB_TOKEN?.trim() || "",
    reportPath,
    createCheckRun: (actionInput(env, "CREATE-CHECK-RUN", "CREATE_CHECK_RUN") ?? "true").trim().toLowerCase() === "true",
    checkName,
  };
}

function assertActionText(value: string, label: string, maxLength: number): void {
  if (value.length === 0 || value.length > maxLength || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new Error(`PatchGate Action ${label} contains unsafe or oversized text.`);
  }
}

export function setActionOutput(name: string, value: string, env: NodeJS.ProcessEnv = process.env): void {
  const outputFile = env.GITHUB_OUTPUT;
  if (outputFile && existsSync(outputFile)) {
    assertActionText(name, "output name", 200);
    const delimiterBase = `patchgate_${randomUUID()}`;
    let delimiter = delimiterBase;
    while (value.includes(delimiter)) delimiter = `${delimiterBase}_${randomUUID()}`;
    if (value.includes("\n") || value.includes("\r")) {
      appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, "utf8");
    } else {
      assertActionText(value, `output ${name}`, 1_000_000);
      appendFileSync(outputFile, `${name}=${value}\n`, "utf8");
    }
  }
}

export function appendStepSummary(markdown: string, env: NodeJS.ProcessEnv = process.env): void {
  const summaryFile = env.GITHUB_STEP_SUMMARY;
  if (summaryFile && existsSync(summaryFile)) {
    appendFileSync(summaryFile, `${markdown}\n`, "utf8");
  }
}

function markdownCell(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/`/g, "&#96;");
}

function resolveReportPath(reportPath: string, env: NodeJS.ProcessEnv): string {
  const workspace = resolve(env.GITHUB_WORKSPACE?.trim() || process.cwd());
  if (reportPath.startsWith("/") || reportPath.includes("\\")) throw new Error("PatchGate Action report-path must be a relative POSIX path inside GITHUB_WORKSPACE.");
  const candidate = resolve(workspace, reportPath);
  const relative = candidate === workspace ? "" : candidate.slice(workspace.length + 1);
  if (relative === "" || relative === ".." || relative.startsWith("../")) throw new Error("PatchGate Action report-path must stay inside GITHUB_WORKSPACE.");
  return candidate;
}

export function shouldFailAction(status: FinalStatus, failOn: ActionInputs["failOn"]): boolean {
  if (failOn === "never") return false;
  if (failOn === status) return true;
  if (failOn === "blocked") {
    return status === "blocked" || status === "evidence_missing" || status === "policy_ambiguous";
  }
  if (failOn === "human_review_required") {
    return status === "blocked" || status === "human_review_required" || status === "evidence_missing" || status === "policy_ambiguous";
  }
  return false;
}

export function snapshotRejectionExitCode(failOn: ActionInputs["failOn"]): 0 | 1 {
  return shouldFailAction("evidence_missing", failOn) ? 1 : 0;
}

export function formatMarkdownSummary(receipt: ContributionReceipt): string {
  const statusEmoji: Record<FinalStatus, string> = {
    ready_for_review: "✅",
    blocked: "🛑",
    human_review_required: "👤",
    evidence_missing: "🔍",
    policy_ambiguous: "⚠️",
  };
  const icon = statusEmoji[receipt.final.status] ?? "ℹ️";
  const title = `### ${icon} PatchGate Review Gate: \`${receipt.final.status.toUpperCase()}\``;

  const repoInfo = `**Repository:** \`${receipt.repository.owner}/${receipt.repository.name}\` PR #${receipt.repository.pullRequest}<br>
**Target Kind:** \`${receipt.revisions.targetKind}\`<br>
**Tested SHA:** \`${markdownCell(receipt.revisions.testedSha)}\`<br>
**PR Head SHA:** \`${markdownCell(receipt.revisions.headSha)}\`<br>
**Base SHA:** \`${markdownCell(receipt.revisions.baseSha)}\`<br>
**Commit Binding:** ${receipt.revisions.targetKind === "head"
    ? receipt.revisions.testedSha === receipt.revisions.headSha ? "✅ `testedSha` equals `headSha`" : "❌ `testedSha` does not equal `headSha`"
    : "ℹ️ tested revision is the declared merge target; PR head is recorded separately"}<br>
**Policy Digest:** \`${receipt.policyDigest.slice(0, 18)}...\`  
**Receipt Digest:** \`${receipt.receiptDigest.slice(0, 18)}...\``;

  const rows = receipt.requirements.map((req) => {
    const statusIcon = req.result === "passed" ? "✅ Passed" : req.result === "failed" ? "❌ Failed" : req.result === "advisory" ? "ℹ️ Advisory" : "❓ Unknown";
    return `| \`${markdownCell(req.id)}\` | ${statusIcon} | \`${markdownCell(req.severity)}\` | ${markdownCell(req.remediation)} |`;
  });

  const table = `| Requirement | Result | Severity | Remediation |
|---|---|---|---|
${rows.join("\n")}`;

  let gatesSection = "";
  if (receipt.humanGates.length > 0) {
    const gateRows = receipt.humanGates.map((gate) => {
      const state = gate.satisfied ? "✅ Satisfied" : "⏳ Pending Approval";
      const reviewers = gate.requiredReviewers.join(", ") || "None";
      const approved = gate.approvedBy.join(", ") || "None";
      return `| \`${markdownCell(gate.id)}\` | ${state} | ${markdownCell(reviewers)} (need ${gate.requiredCount}) | ${markdownCell(approved)} | ${markdownCell(gate.reason)} |`;
    });
    gatesSection = `\n\n#### 👤 Human Review Boundaries\n| Gate ID | Status | Required Reviewers | Approved By | Reason |\n|---|---|---|---|---|\n${gateRows.join("\n")}`;
  }

  let reviewabilitySection = "";
  if (receipt.reviewability) {
    const r = receipt.reviewability;
    reviewabilitySection = `\n\n#### 📊 Reviewability Signals\n- **Changed Files:** \`${r.fileCount}\`\n- **Generated Files:** \`${r.generatedFileCount}\`\n- **Ownership Domains:** \`${r.ownershipDomains.join(", ") || "none"}\` (\`${r.boundaryCount}\` boundaries)`;
  }

  const provenanceDetails = `\n\n<details>\n<summary>🔐 <b>Audit & Provenance Metadata</b></summary>\n\n- **Evaluator Version:** \`${receipt.evaluatorVersion}\`\n- **Schema Version:** \`${receipt.schemaVersion}\`\n- **Evaluated At:** \`${receipt.evaluatedAt}\`\n- **Decision Input Digest:** \`${receipt.decisionInputDigest}\`\n- **Receipt Digest:** \`${receipt.receiptDigest}\`\n- **Policy Sources:** ${receipt.policySources.map((s) => `\`${s.kind}:${s.identity}@${s.revision.slice(0, 7)}\``).join(", ") || "none"}\n\n</details>`;

  const summary = `${title}\n\n${repoInfo}\n\n${table}${gatesSection}${reviewabilitySection}${provenanceDetails}\n`;
  return summary.length <= MAX_ACTION_SUMMARY_LENGTH
    ? summary
    : `${summary.slice(0, MAX_ACTION_SUMMARY_LENGTH - 120)}\n\n> Summary truncated to keep GitHub Action output bounded. The full receipt remains at the configured report path.\n`;
}


interface EventPayload {
  pull_request?: {
    number?: number;
    head?: { sha?: string };
    base?: { sha?: string; ref?: string };
  };
  repository?: {
    name?: string;
    owner?: { login?: string; name?: string };
  };
}

export async function runAction(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const inputs = parseActionInputs(env);

  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    console.error("PatchGate Action: GITHUB_EVENT_PATH is missing or does not exist.");
    return 2;
  }

  let eventPayload: EventPayload;
  try {
    eventPayload = JSON.parse(readFileSync(eventPath, "utf8")) as EventPayload;
  } catch (err) {
    console.error("PatchGate Action: Failed to parse GITHUB_EVENT_PATH payload as JSON.", err);
    return 2;
  }

  const eventName = env.GITHUB_EVENT_NAME || "pull_request";
  if (eventName === "merge_group") {
    const message = "PatchGate does not yet support authenticated merge-group membership in the current scalar contract.";
    setActionOutput("status", "evidence_missing", env);
    appendStepSummary(`### ⚠️ PatchGate Unsupported Target\n\n**Event:** \`merge_group\`  \n**Status:** \`evidence_missing\`  \n**Remediation:** Use a pull_request head/merge target or extend the versioned merge-group contract before enforcing this event.\n`, env);
    console.warn(`PatchGate Action: ${message}`);
    return shouldFailAction("evidence_missing", inputs.failOn) ? 1 : 0;
  }
  if (eventName !== "pull_request" && eventName !== "pull_request_target") {
    console.log(`PatchGate Action: Skipping execution for unsupported event '${eventName}'. Only pull_request events are evaluated.`);
    return 0;
  }

  const pullNumber = eventPayload.pull_request?.number;
  const owner = eventPayload.repository?.owner?.login || eventPayload.repository?.owner?.name;
  const name = eventPayload.repository?.name;
  const eventHeadSha = eventPayload.pull_request?.head?.sha;

  if (typeof pullNumber !== "number" || !Number.isInteger(pullNumber) || pullNumber < 1 || typeof owner !== "string" || owner.length === 0 || typeof name !== "string" || name.length === 0 || typeof eventHeadSha !== "string" || eventHeadSha.trim().length === 0) {
    console.error("PatchGate Action: Pull request number, repository identity, or event head SHA is missing or invalid.");
    return 2;
  }

  if (!inputs.githubToken) {
    console.error("PatchGate Action: GitHub token is missing. Provide github-token input or GITHUB_TOKEN environment variable.");
    return 2;
  }

  const transport = createFetchTransport({
    token: inputs.githubToken,
    userAgent: "patchgate-action/0.1.0",
  });
  const client = new GitHubClient(transport, undefined, {
    token: inputs.githubToken,
  });

  const snapshotRequest: GitHubSnapshotRequest = {
    owner,
    name,
    pullNumber,
    expectedHeadSha: eventHeadSha,
    eventKind: "pull_request",
    targetKind: "head",
  };

  console.log(`PatchGate Action: Building snapshot for ${owner}/${name}#${pullNumber}...`);
  const snapshotResult = await buildGitHubSnapshot(snapshotRequest, client);

  if (snapshotResult.kind === "rejected") {
    const diagnostic = snapshotResult.diagnostic;
    console.error(`PatchGate Action: Snapshot rejected — [${diagnostic.id}] ${diagnostic.message}`);
    if (diagnostic.remediation) {
      console.error(`Remediation: ${diagnostic.remediation}`);
    }
    const errorMarkdown = `### ❌ PatchGate Snapshot Rejected\n\n**Event PR Head SHA:** \`${markdownCell(eventHeadSha)}\`  \n**Diagnostic:** \`${diagnostic.id}\`  \n**Message:** ${diagnostic.message}  \n**Remediation:** ${diagnostic.remediation ?? "None"}\n`;
    setActionOutput("status", "evidence_missing", env);
    setActionOutput("summary-markdown", errorMarkdown, env);
    appendStepSummary(errorMarkdown, env);
    if (inputs.createCheckRun && inputs.githubToken) {
      const headSha = eventPayload.pull_request?.head?.sha;
      if (headSha === undefined) {
        console.warn("PatchGate Action: Event payload has no pull-request head SHA; rejection check-run was not posted.");
      } else {
        await upsertRejectionCheckRun({
          owner,
          name,
          headSha,
          checkName: inputs.checkName,
          diagnostic: { id: diagnostic.id, message: diagnostic.message, remediation: diagnostic.remediation },
          summaryMarkdown: errorMarkdown,
          token: inputs.githubToken,
        });
      }
    }
    return snapshotRejectionExitCode(inputs.failOn);
  }

  const evaluatedAt = new Date().toISOString();
  const receipt = evaluateContribution(snapshotResult.input, evaluatedAt);

  let resolvedReportPath: string;
  try {
    resolvedReportPath = resolveReportPath(inputs.reportPath, env);
  } catch (error) {
    console.error(`PatchGate Action: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  try {
    mkdirSync(dirname(resolvedReportPath), { recursive: true });
    writeFileSync(resolvedReportPath, JSON.stringify(receipt, null, 2), "utf8");
    console.log(`PatchGate Action: ContributionReceipt written to ${resolvedReportPath}`);
  } catch (err) {
    console.warn(`PatchGate Action: Could not write receipt report file: ${err instanceof Error ? err.message : String(err)}`);
  }

  const summaryMarkdown = formatMarkdownSummary(receipt);
  setActionOutput("status", receipt.final.status, env);
  setActionOutput("receipt-path", resolvedReportPath, env);
  setActionOutput("decision-input-digest", receipt.decisionInputDigest, env);
  setActionOutput("receipt-digest", receipt.receiptDigest, env);
  setActionOutput("target-kind", receipt.revisions.targetKind, env);
  setActionOutput("tested-sha", receipt.revisions.testedSha, env);
  setActionOutput("head-sha", receipt.revisions.headSha, env);
  setActionOutput("summary-markdown", summaryMarkdown, env);
  appendStepSummary(summaryMarkdown, env);

  console.log(`\n========================================`);
  console.log(`PatchGate Evaluation Result: ${receipt.final.status.toUpperCase()}`);
  console.log(`Decision Input Digest: ${receipt.decisionInputDigest}`);
  console.log(`Receipt Digest:        ${receipt.receiptDigest}`);
  console.log(`========================================\n`);

  if (inputs.createCheckRun && inputs.githubToken) {
    await postCheckRun({
      owner,
      name,
      headSha: receipt.revisions.testedSha,
      checkName: inputs.checkName,
      status: receipt.final.status,
      receipt,
      summaryMarkdown,
      token: inputs.githubToken,
    });
  }

  if (shouldFailAction(receipt.final.status, inputs.failOn)) {
    console.error(`PatchGate Action: Evaluation result '${receipt.final.status}' triggered fail-on policy '${inputs.failOn}'.`);
    return 1;
  }

  console.log(`PatchGate Action: Evaluation passed review-readiness gate.`);
  return 0;
}

export interface CheckRunParams {
  owner: string;
  name: string;
  headSha: string;
  checkName: string;
  status: FinalStatus;
  receipt: Pick<ContributionReceipt, "receiptDigest" | "decisionInputDigest" | "evaluatedAt" | "revisions">;
  summaryMarkdown: string;
  token: string;
}

interface CheckRunRecord { id?: number; name?: string; head_sha?: string; }

interface CheckRunPayload {
  name: string;
  head_sha: string;
  status: "completed";
  conclusion: "success" | "failure" | "action_required" | "neutral";
  completed_at: string;
  output: { title: string; summary: string; text: string };
}

async function deliverCheckRun(params: { owner: string; name: string; headSha: string; token: string }, payload: CheckRunPayload, fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.name)}`;
    const lookupUrl = `${apiUrl}/commits/${encodeURIComponent(params.headSha)}/check-runs?check_name=${encodeURIComponent(payload.name)}&filter=latest&per_page=100`;
    const lookup = await fetchImpl(lookupUrl, {
      method: "GET",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: GITHUB_ACCEPT,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "patchgate-action/0.1.0",
      },
    });
    if (!lookup.ok) {
      console.warn(`PatchGate Action: Notice — Could not look up an existing check-run (HTTP ${lookup.status}); no check-run write was attempted.`);
      return;
    }
    const lookupBody = await lookup.json() as { check_runs?: CheckRunRecord[] };
    const existing = Array.isArray(lookupBody.check_runs)
      ? lookupBody.check_runs.filter((item) => item.id !== undefined && item.name === payload.name && item.head_sha === params.headSha).sort((left, right) => (right.id ?? 0) - (left.id ?? 0))[0]
      : undefined;
    const url = existing?.id === undefined ? `${apiUrl}/check-runs` : `${apiUrl}/check-runs/${existing.id}`;
    const res = await fetchImpl(url, {
      method: existing?.id === undefined ? "POST" : "PATCH",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: GITHUB_ACCEPT,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "patchgate-action/0.1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`PatchGate Action: Notice — Could not post check-run (HTTP ${res.status}). Verify that 'checks: write' permission is granted.`);
    } else {
      console.log(`PatchGate Action: Check run '${payload.name}' successfully ${existing?.id === undefined ? "created" : "updated"} with conclusion '${payload.conclusion}'.`);
    }
  } catch (err) {
    console.warn(`PatchGate Action: Check run posting skipped (${err instanceof Error ? err.message : String(err)}).`);
  }
}

export async function upsertCheckRun(params: CheckRunParams, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (params.headSha !== params.receipt.revisions.testedSha) {
    throw new Error("PatchGate Action: Check Run head SHA must equal the receipt tested SHA.");
  }
  if (params.receipt.revisions.targetKind === "head" && params.receipt.revisions.testedSha !== params.receipt.revisions.headSha) {
    throw new Error("PatchGate Action: A head-target Check Run requires tested SHA to equal the PR head SHA.");
  }
  const conclusionMap: Record<FinalStatus, "success" | "failure" | "action_required" | "neutral"> = {
    ready_for_review: "success",
    blocked: "failure",
    human_review_required: "action_required",
    evidence_missing: "neutral",
    policy_ambiguous: "neutral",
  };

  const payload: CheckRunPayload = {
    name: params.checkName,
    head_sha: params.headSha,
    status: "completed",
    conclusion: conclusionMap[params.status],
    completed_at: new Date().toISOString(),
    output: {
      title: `PatchGate: ${params.status.toUpperCase().replace(/_/g, " ")}`,
      summary: params.summaryMarkdown,
      text: `Target kind: ${params.receipt.revisions.targetKind}\nTested SHA: \`${params.receipt.revisions.testedSha}\`\nPR head SHA: \`${params.receipt.revisions.headSha}\`\nReceipt Digest: \`${params.receipt.receiptDigest}\`\nDecision Input Digest: \`${params.receipt.decisionInputDigest}\`\nEvaluated At: ${params.receipt.evaluatedAt}`,
    },
  };
  await deliverCheckRun(params, payload, fetchImpl);
}

export interface RejectionCheckRunParams {
  owner: string;
  name: string;
  headSha: string;
  checkName: string;
  diagnostic: { id: string; message: string; remediation?: string | undefined };
  summaryMarkdown: string;
  token: string;
}

export async function upsertRejectionCheckRun(params: RejectionCheckRunParams, fetchImpl: typeof fetch = fetch): Promise<void> {
  const payload: CheckRunPayload = {
    name: params.checkName,
    head_sha: params.headSha,
    status: "completed",
    conclusion: "neutral",
    completed_at: new Date().toISOString(),
    output: {
      title: "PatchGate: SNAPSHOT REJECTED",
      summary: params.summaryMarkdown,
      text: `Target kind: head\nEvent PR head SHA: \`${params.headSha}\`\nDiagnostic: ${params.diagnostic.id}\nRemediation: ${params.diagnostic.remediation ?? "None"}`,
    },
  };
  await deliverCheckRun(params, payload, fetchImpl);
}

const postCheckRun = upsertCheckRun;

// Auto-run if executed directly as entrypoint
function isDirectActionEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && /[\\/]dist[\\/]action[\\/]index\.js$/.test(entrypoint);
}

if (process.env.GITHUB_ACTIONS === "true" && isDirectActionEntrypoint()) {
  runAction().then((exitCode) => {
    if (exitCode !== 0) process.exit(exitCode);
  }).catch((err) => {
    console.error("PatchGate Action: Unhandled error in action runner:", err);
    process.exit(2);
  });
}
