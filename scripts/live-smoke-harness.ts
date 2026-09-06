import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { evaluateContribution } from "../src/evaluator.js";
import { createFetchTransport, GitHubClient } from "../src/github/client.js";
import { buildGitHubSnapshot } from "../src/github/snapshot-builder.js";
import type { GitHubSnapshotRequest } from "../src/github/identity.js";
import type { EvaluationInput } from "../src/types.js";

interface TargetPR {
  name: string;
  owner: string;
  repo: string;
  pullNumber: number;
  allowConfirmedAbsence?: boolean;
}

function parseCliTargets(): TargetPR[] {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const pullIdx = args.indexOf("--pull");
  if (repoIdx !== -1 && pullIdx !== -1 && args[repoIdx + 1] && args[pullIdx + 1]) {
    const repoArg = args[repoIdx + 1]!;
    const pullArg = Number(args[pullIdx + 1]!);
    const parts = repoArg.split("/");
    if (parts.length === 2 && Number.isInteger(pullArg) && pullArg > 0) {
      return [
        {
          name: `Custom Target (${repoArg}#${pullArg})`,
          owner: parts[0]!,
          repo: parts[1]!,
          pullNumber: pullArg,
          allowConfirmedAbsence: false,
        },
      ];
    }
  }
  throw new Error("Live smoke requires an explicit --repo OWNER/REPOSITORY and --pull NUMBER target; no default repository is allowed.");
}

async function runLiveSmoke(): Promise<void> {
  console.log("==========================================================");
  console.log("   PatchGate G3 Live Read-Only Smoke Test Harness");
  console.log("==========================================================\n");

  const token = (process.env.PATCHGATE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN)?.trim();
  if (!token) {
    console.error("❌ ERROR: GitHub token is missing.");
    console.error("   Provide a valid read-only token via GITHUB_TOKEN, PATCHGATE_GITHUB_TOKEN, or GH_TOKEN.");
    process.exit(1);
  }
  if (process.env.PATCHGATE_LIVE_SMOKE_AUTHORIZED !== "yes") {
    console.error("❌ ERROR: Live smoke requires PATCHGATE_LIVE_SMOKE_AUTHORIZED=yes after maintainer confirmation of the exact read-only target and permissions.");
    process.exit(1);
  }

  // 1. Initialize Schemas
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const policySchema = JSON.parse(readFileSync(resolve("schemas/patchgate-policy.schema.json"), "utf8")) as object;
  const inputSchema = JSON.parse(readFileSync(resolve("schemas/evaluation-input.schema.json"), "utf8")) as object;
  const receiptSchema = JSON.parse(readFileSync(resolve("schemas/contribution-receipt.schema.json"), "utf8")) as object;
  ajv.addSchema(policySchema);
  ajv.addSchema(inputSchema);
  ajv.addSchema(receiptSchema);
  const validateInput = ajv.compile(inputSchema);
  const validateReceipt = ajv.compile(receiptSchema);

  const transport = createFetchTransport({ token, userAgent: "patchgate-live-smoke/0.1.0" });
  const client = new GitHubClient(transport, undefined, { token });

  let totalPassed = 0;
  let totalRejected = 0;
  let totalFailed = 0;
  const targets = parseCliTargets();

  for (const target of targets) {
    console.log(`▶ Testing Target: ${target.name} (${target.owner}/${target.repo}#${target.pullNumber})`);

    const request: GitHubSnapshotRequest = {
      owner: target.owner,
      name: target.repo,
      pullNumber: target.pullNumber,
      eventKind: "pull_request",
      targetKind: "head",
    };

    const startTime = Date.now();
    try {
      const snapshotResult = await buildGitHubSnapshot(request, client, {
        allowConfirmedAbsence: target.allowConfirmedAbsence ?? false,
      });

      const elapsedMs = Date.now() - startTime;

      if (snapshotResult.kind === "rejected") {
        console.warn(`  ⚠️ Snapshot rejected; this is diagnostic evidence, not a passing complete snapshot:`);
        console.warn(`     Diagnostic: [${snapshotResult.diagnostic.id}] ${snapshotResult.diagnostic.message}`);
        console.log(`  ! Snapshot rejection was safe and bounded, but the target was not evaluated as a complete snapshot (${elapsedMs}ms)\n`);
        totalRejected++;
        continue;
      }

      console.log(`  ✓ Snapshot retrieved successfully in ${elapsedMs}ms`);
      console.log(`  ✓ API Metrics: ${snapshotResult.metrics.requests.attempted} attempted requests (${snapshotResult.metrics.responseBytes} bytes transferred)`);
      console.log(`  ✓ Identity bound: Base=${snapshotResult.identity.baseSha.slice(0, 7)}, Tested=${snapshotResult.identity.testedSha.slice(0, 7)}`);

      // 2. Validate Snapshot Schema
      const isInputSchemaValid = validateInput(snapshotResult.input);
      if (!isInputSchemaValid) {
        console.error(`  ❌ Schema Validation Failed for EvaluationInput:`, validateInput.errors);
        totalFailed++;
        continue;
      }
      console.log(`  ✓ EvaluationInput conforms to schema v0.1`);

      // 3. Execute Pure Evaluator
      const evaluatedAt = new Date().toISOString();
      const receipt = evaluateContribution(snapshotResult.input as EvaluationInput, evaluatedAt);
      console.log(`  ✓ Evaluator completed with final status: '${receipt.final.status}'`);

      // 4. Validate Receipt Schema
      const isReceiptSchemaValid = validateReceipt(receipt);
      if (!isReceiptSchemaValid) {
        console.error(`  ❌ Schema Validation Failed for ContributionReceipt:`, validateReceipt.errors);
        totalFailed++;
        continue;
      }
      console.log(`  ✓ ContributionReceipt conforms to schema v0.1`);
      console.log(`  ✓ Receipt Digest: ${receipt.receiptDigest}\n`);
      totalPassed++;
    } catch (error) {
      console.error(`  ❌ Unexpected error testing ${target.name}:`, error instanceof Error ? error.message : String(error));
      totalFailed++;
    }
  }

  console.log("----------------------------------------------------------");
  console.log(`Smoke Test Summary: ${totalPassed} Built/Passed, ${totalRejected} Rejected, ${totalFailed} Failed`);
  console.log("----------------------------------------------------------");

  if (totalFailed > 0 || totalRejected > 0) {
    process.exit(1);
  }
}

function wasExecutedDirectly(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

// Auto-run if executed directly
if (wasExecutedDirectly()) {
  runLiveSmoke().catch((err) => {
    console.error("Fatal error in live smoke harness:", err);
    process.exit(1);
  });
}
