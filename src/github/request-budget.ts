import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";

export interface RequestBudgetLimits {
  maxRequests: number;
  finalizationReserveRequests: number;
  maxPagesPerGroup: number;
  maxRetriesPerRequest: number;
  maxRetries: number;
  maxResponseBytes: number;
  maxItemsPerGroup: number;
  maxRetryDelayMs: number;
  maxCumulativeSleepMs: number;
}

export const DEFAULT_REQUEST_BUDGETS: RequestBudgetLimits = {
  maxRequests: 160,
  finalizationReserveRequests: 64,
  maxPagesPerGroup: 32,
  maxRetriesPerRequest: 2,
  maxRetries: 8,
  maxResponseBytes: 2 * 1024 * 1024,
  maxItemsPerGroup: 3000,
  maxRetryDelayMs: 5_000,
  maxCumulativeSleepMs: 10_000,
};

export interface RequestBudgetEvidence {
  requests: { attempted: number; succeeded: number; failed: number; finalizationAttempted: number };
  pagesByGroup: Record<string, number>;
  retriesByReason: Record<string, number>;
  responseBytes: number;
  primaryRate?: { remaining?: number; resetAt?: number; resource?: string };
  retryAfterObservedMs: number[];
  conditionalRequests: number;
  conditional304: number;
  caps: string[];
  cumulativeSleepMs: number;
}

export type RequestPhase = "collection" | "finalization";

export class BudgetLedger {
  readonly limits: RequestBudgetLimits;
  private readonly evidence: RequestBudgetEvidence = {
    requests: { attempted: 0, succeeded: 0, failed: 0, finalizationAttempted: 0 },
    pagesByGroup: {},
    retriesByReason: {},
    responseBytes: 0,
    retryAfterObservedMs: [],
    conditionalRequests: 0,
    conditional304: 0,
    caps: [],
    cumulativeSleepMs: 0,
  };

  constructor(limits: Partial<RequestBudgetLimits> = {}) {
    this.limits = { ...DEFAULT_REQUEST_BUDGETS, ...limits };
    if (this.limits.finalizationReserveRequests < 1 || this.limits.finalizationReserveRequests >= this.limits.maxRequests) {
      throw new Error("finalizationReserveRequests must be smaller than maxRequests and positive");
    }
  }

  beginRequest(phase: RequestPhase): void {
    const next = this.evidence.requests.attempted + 1;
    const collectionLimit = this.limits.maxRequests - this.limits.finalizationReserveRequests;
    if (phase === "collection" && next > collectionLimit) {
      this.recordCap("request_budget_collection");
      throw new GitHubAdapterError(makeDiagnostic("GITHUB_REQUEST_BUDGET", "The collection request budget was exhausted before finalization.", {
        remediation: "Reduce the snapshot scope or raise the bounded collection budget; the adapter did not consume the finalization reserve.",
        complete: false,
        snapshotEvaluable: true,
      }));
    }
    if (phase === "finalization" && this.evidence.requests.finalizationAttempted >= this.limits.finalizationReserveRequests) {
      this.recordCap("request_budget_finalization");
      throw new GitHubAdapterError(makeDiagnostic("GITHUB_REQUEST_BUDGET", "The reserved finalization request budget was exhausted.", {
        remediation: "Retry the entire snapshot with a larger bounded finalization reserve; no snapshot was accepted.",
        complete: false,
        snapshotEvaluable: false,
        exitCode: 2,
      }));
    }
    this.evidence.requests.attempted = next;
    if (phase === "finalization") this.evidence.requests.finalizationAttempted += 1;
  }

  recordSuccess(): void { this.evidence.requests.succeeded += 1; }
  recordFailure(): void { this.evidence.requests.failed += 1; }
  recordResponseBytes(bytes: number): void { this.evidence.responseBytes += bytes; }
  recordPage(group: string): boolean {
    const pages = (this.evidence.pagesByGroup[group] ?? 0) + 1;
    this.evidence.pagesByGroup[group] = pages;
    if (pages > this.limits.maxPagesPerGroup) {
      this.recordCap(`page_budget:${group}`);
      return false;
    }
    return true;
  }
  recordItemCap(group: string): void { this.recordCap(`item_budget:${group}`); }
  recordCap(cap: string): void { if (!this.evidence.caps.includes(cap)) this.evidence.caps.push(cap); }
  recordRetry(reason: string): boolean {
    const total = Object.values(this.evidence.retriesByReason).reduce((sum, value) => sum + value, 0);
    if (total >= this.limits.maxRetries) { this.recordCap("retry_budget"); return false; }
    this.evidence.retriesByReason[reason] = (this.evidence.retriesByReason[reason] ?? 0) + 1;
    return true;
  }
  recordRetryAfter(ms: number): void { this.evidence.retryAfterObservedMs.push(ms); }
  recordRateLimit(remaining?: number, resetAt?: number, resource?: string): void {
    this.evidence.primaryRate = { ...(remaining === undefined ? {} : { remaining }), ...(resetAt === undefined ? {} : { resetAt }), ...(resource === undefined ? {} : { resource }) };
  }
  recordConditional(status304 = false): void { this.evidence.conditionalRequests += 1; if (status304) this.evidence.conditional304 += 1; }
  recordSleep(ms: number): boolean {
    if (ms < 0 || this.evidence.cumulativeSleepMs + ms > this.limits.maxCumulativeSleepMs) {
      this.recordCap("retry_sleep_budget");
      return false;
    }
    this.evidence.cumulativeSleepMs += ms;
    return true;
  }
  snapshot(): RequestBudgetEvidence {
    return structuredClone(this.evidence);
  }
}

