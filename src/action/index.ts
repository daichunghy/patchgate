import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evaluateContribution } from "../evaluator.js";
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

export function parseActionInputs(env: NodeJS.ProcessEnv = process.env): ActionInputs {
  const failOnRaw = env.INPUT_FAIL_ON?.trim() || "blocked";
  const validFailOns = ["never", "blocked", "human_review_required", "evidence_missing", "policy_ambiguous"] as const;
  const failOn = validFailOns.includes(failOnRaw as ActionInputs["failOn"]) ? (failOnRaw as ActionInputs["failOn"]) : "blocked";

  return {
    failOn,
    githubToken: env.INPUT_GITHUB_TOKEN?.trim() || env.GITHUB_TOKEN?.trim() || "",
    reportPath: env.INPUT_REPORT_PATH?.trim() || "patchgate-receipt.json",
    createCheckRun: env.INPUT_CREATE_CHECK_RUN?.trim().toLowerCase() === "true",
    checkName: env.INPUT_CHECK_NAME?.trim() || "PatchGate Review Gate",
  };
}

export function setActionOutput(name: string, value: string, env: NodeJS.ProcessEnv = process.env): void {
  const outputFile = env.GITHUB_OUTPUT;
  if (outputFile && existsSync(outputFile)) {
    appendFileSync(outputFile, `${name}=${value}\n`, "utf8");
  }
}

export function appendStepSummary(markdown: string, env: NodeJS.ProcessEnv = process.env): void {
  const summaryFile = env.GITHUB_STEP_SUMMARY;
  if (summaryFile && existsSync(summaryFile)) {
    appendFileSync(summaryFile, `${markdown}\n`, "utf8");
  }
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

  const repoInfo = `**Repository:** \`${receipt.repository.owner}/${receipt.repository.name}\` PR #${receipt.repository.pullRequest}  
**Target Commit:** \`${receipt.revisions.testedSha.slice(0, 7)}\` | **Base SHA:** \`${receipt.revisions.baseSha.slice(0, 7)}\`  
**Policy Digest:** \`${receipt.policyDigest.slice(0, 18)}...\`  
**Receipt Digest:** \`${receipt.receiptDigest.slice(0, 18)}...\``;

  const rows = receipt.requirements.map((req) => {
    const statusIcon = req.result === "passed" ? "✅ Passed" : req.result === "failed" ? "❌ Failed" : req.result === "advisory" ? "ℹ️ Advisory" : "❓ Unknown";
    return `| \`${req.id}\` | ${statusIcon} | \`${req.severity}\` | ${req.remediation} |`;
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
      return `| \`${gate.id}\` | ${state} | ${reviewers} (need ${gate.requiredCount}) | ${approved} | ${gate.reason} |`;
    });
    gatesSection = `\n\n#### 👤 Human Review Boundaries\n| Gate ID | Status | Required Reviewers | Approved By | Reason |\n|---|---|---|---|---|\n${gateRows.join("\n")}`;
  }

  let reviewabilitySection = "";
  if (receipt.reviewability) {
    const r = receipt.reviewability;
    reviewabilitySection = `\n\n#### 📊 Reviewability Signals\n- **Changed Files:** \`${r.fileCount}\`\n- **Generated Files:** \`${r.generatedFileCount}\`\n- **Ownership Domains:** \`${r.ownershipDomains.join(", ") || "none"}\` (\`${r.boundaryCount}\` boundaries)`;
  }

  const provenanceDetails = `\n\n<details>\n<summary>🔐 <b>Audit & Provenance Metadata</b></summary>\n\n- **Evaluator Version:** \`${receipt.evaluatorVersion}\`\n- **Schema Version:** \`${receipt.schemaVersion}\`\n- **Evaluated At:** \`${receipt.evaluatedAt}\`\n- **Decision Input Digest:** \`${receipt.decisionInputDigest}\`\n- **Receipt Digest:** \`${receipt.receiptDigest}\`\n- **Policy Sources:** ${receipt.policySources.map((s) => `\`${s.kind}:${s.identity}@${s.revision.slice(0, 7)}\``).join(", ") || "none"}\n\n</details>`;

  return `${title}\n\n${repoInfo}\n\n${table}${gatesSection}${reviewabilitySection}${provenanceDetails}\n`;
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
  if (eventName !== "pull_request" && eventName !== "pull_request_target") {
    console.log(`PatchGate Action: Skipping execution for unsupported event '${eventName}'. Only pull_request events are evaluated.`);
    return 0;
  }

  const pullNumber = eventPayload.pull_request?.number;
  const owner = eventPayload.repository?.owner?.login || eventPayload.repository?.owner?.name;
  const name = eventPayload.repository?.name;

  if (pullNumber === undefined || owner === undefined || name === undefined) {
    console.error("PatchGate Action: Pull request number or repository identity is missing from event payload.");
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
    const errorMarkdown = `### ❌ PatchGate Snapshot Rejected\n\n**Diagnostic:** \`${diagnostic.id}\`  \n**Message:** ${diagnostic.message}  \n**Remediation:** ${diagnostic.remediation ?? "None"}\n`;
    appendStepSummary(errorMarkdown, env);
    return diagnostic.exitCode ?? 2;
  }

  const evaluatedAt = new Date().toISOString();
  const receipt = evaluateContribution(snapshotResult.input, evaluatedAt);

  const resolvedReportPath = resolve(process.cwd(), inputs.reportPath);
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

interface CheckRunParams {
  owner: string;
  name: string;
  headSha: string;
  checkName: string;
  status: FinalStatus;
  receipt: ContributionReceipt;
  summaryMarkdown: string;
  token: string;
}

async function postCheckRun(params: CheckRunParams): Promise<void> {
  const conclusionMap: Record<FinalStatus, "success" | "failure" | "action_required" | "neutral"> = {
    ready_for_review: "success",
    blocked: "failure",
    human_review_required: "action_required",
    evidence_missing: "neutral",
    policy_ambiguous: "neutral",
  };

  const payload = {
    name: params.checkName,
    head_sha: params.headSha,
    status: "completed",
    conclusion: conclusionMap[params.status],
    completed_at: new Date().toISOString(),
    output: {
      title: `PatchGate: ${params.status.toUpperCase().replace(/_/g, " ")}`,
      summary: params.summaryMarkdown,
      text: `Receipt Digest: \`${params.receipt.receiptDigest}\`\nDecision Input Digest: \`${params.receipt.decisionInputDigest}\`\nEvaluated At: ${params.receipt.evaluatedAt}`,
    },
  };

  try {
    const res = await fetch(`https://api.github.com/repos/${params.owner}/${params.name}/check-runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "patchgate-action/0.1.0",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`PatchGate Action: Notice — Could not post check-run (HTTP ${res.status}). Verify that 'checks: write' permission is granted.`);
    } else {
      console.log(`PatchGate Action: Check run '${params.checkName}' successfully posted with conclusion '${payload.conclusion}'.`);
    }
  } catch (err) {
    console.warn(`PatchGate Action: Check run posting skipped (${err instanceof Error ? err.message : String(err)}).`);
  }
}

// Auto-run if executed directly as entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runAction().then((exitCode) => {
    if (exitCode !== 0) process.exit(exitCode);
  }).catch((err) => {
    console.error("PatchGate Action: Unhandled error in action runner:", err);
    process.exit(2);
  });
}
