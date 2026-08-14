import { canonicalJson } from "../canonical-json.js";
import type { GitHubReadTransport, GitHubRequest, GitHubResponse } from "./api-types.js";

export interface RecordedExchange {
  request: GitHubRequest;
  response: GitHubResponse<unknown>;
}

function actualBytes(body: unknown): number {
  return Buffer.byteLength(typeof body === "string" ? body : canonicalJson(body), "utf8");
}

function requestKey(request: GitHubRequest): string {
  return canonicalJson(request);
}

export class RecordedGitHubTransport implements GitHubReadTransport {
  private readonly queues = new Map<string, GitHubResponse<unknown>[]>();
  private readonly requests: GitHubRequest[] = [];

  constructor(exchanges: readonly RecordedExchange[]) {
    for (const exchange of exchanges) {
      if (!Number.isInteger(exchange.response.bytes) || exchange.response.bytes < actualBytes(exchange.response.body)) {
        throw new Error("recorded GitHub response under-reports its payload byte count");
      }
      const queue = this.queues.get(requestKey(exchange.request)) ?? [];
      queue.push(exchange.response);
      this.queues.set(requestKey(exchange.request), queue);
    }
  }

  async request(request: GitHubRequest): Promise<GitHubResponse<unknown>> {
    this.requests.push(structuredClone(request));
    const queue = this.queues.get(requestKey(request));
    if (queue === undefined || queue.length === 0) throw new Error(`unexpected recorded GitHub request: ${requestKey(request)}`);
    return structuredClone(queue.shift()!);
  }

  requested(): GitHubRequest[] { return structuredClone(this.requests); }
  remainingResponses(): number { return [...this.queues.values()].reduce((sum, queue) => sum + queue.length, 0); }
}

export function recordedResponse(status: number, body: unknown, headers: Record<string, string> = {}): GitHubResponse<unknown> {
  return { status, body, headers, bytes: actualBytes(body) };
}
