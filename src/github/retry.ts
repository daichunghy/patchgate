import type { SafeResponseHeaders } from "./api-types.js";
import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";
import type { BudgetLedger } from "./request-budget.js";

export type RetryReason = "network_timeout" | "server_5xx" | "primary_rate_limit" | "secondary_rate_limit";

export interface RetryClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export function parseRetryDelay(headers: SafeResponseHeaders, nowMs: number, maxDelayMs: number): { delayMs: number; observedMs?: number } {
  const retryAfter = headers["retry-after"];
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      const observedMs = Math.min(Math.floor(seconds * 1000), maxDelayMs);
      return { delayMs: observedMs, observedMs };
    }
  }
  const reset = headers["x-ratelimit-reset"];
  if (reset !== undefined) {
    const resetAt = Number(reset) * 1000;
    if (Number.isFinite(resetAt) && resetAt > nowMs) {
      const observedMs = Math.min(Math.floor(resetAt - nowMs), maxDelayMs);
      return { delayMs: observedMs, observedMs };
    }
  }
  return { delayMs: 0 };
}

export async function boundedRetryDelay(
  reason: RetryReason,
  headers: SafeResponseHeaders,
  ledger: BudgetLedger,
  clock: RetryClock,
): Promise<void> {
  const parsed = parseRetryDelay(headers, clock.now(), ledger.limits.maxRetryDelayMs);
  if (parsed.observedMs !== undefined) ledger.recordRetryAfter(parsed.observedMs);
  if (!ledger.recordRetry(reason)) {
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_RETRY_EXHAUSTED", `GitHub retry budget exhausted for ${reason}.`, {
      remediation: "Retry the complete snapshot later; no partial response was promoted to decision evidence.",
      complete: false,
      permissionState: reason.includes("rate_limit") ? "unknown" : "sufficient",
    }));
  }
  if (!ledger.recordSleep(parsed.delayMs)) {
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_RATE_LIMITED", "The bounded GitHub retry sleep budget was exhausted.", {
      remediation: "Wait for the reported GitHub limit to reset, then rerun the read-only snapshot.",
      complete: false,
      permissionState: "unknown",
    }));
  }
  if (parsed.delayMs > 0) await clock.sleep(parsed.delayMs);
}

