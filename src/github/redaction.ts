import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";

const FORBIDDEN_KEY = /authorization|cookie|token|secret|password|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|apikey|credential|body|comment|email|raw[_-]?error|workflow[_-]?log|artifact/i;
const CONTROL = /[\u0000-\u0009\u000B-\u000D\u000E-\u001F\u007F\u001B\u202A-\u202E\u2066-\u2069]/g;
const SECRET_QUERY = /([?&](?:access_token|token|secret|key|signature|authorization)=)[^&]*/gi;
const UNREDACTED_QUERY = /[?&](?:access_token|token|secret|key|signature|authorization)=(?!\[REDACTED\])[^&]*/i;
const SECRET_VALUE = /(?:bearer\s+|(?:api[_-]?key|apikey|access[_-]?token|client[_-]?secret|password|credential)\s*[:=]\s*)[^\s,;]+/gi;
const UNREDACTED_SECRET_VALUE = /(?:bearer\s+|(?:api[_-]?key|apikey|access[_-]?token|client[_-]?secret|password|credential)\s*[:=]\s*)(?!\[REDACTED\])[^\s,;]+/i;

export function safeAllowlistedString(value: string, label: string, maxLength = 10_000): string {
  if (value.length === 0 || value.length > maxLength || CONTROL.test(value)) {
    CONTROL.lastIndex = 0;
    throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `${label} contains unsafe or oversized text.`, {
      remediation: `Remove control characters and keep ${label} within the bounded adapter limit.`,
      snapshotEvaluable: false,
      exitCode: 2,
    }));
  }
  CONTROL.lastIndex = 0;
  return value;
}

export function safeDisplayText(value: string, label: string, maxLength = 4_000): string {
  const bounded = value.length > maxLength ? value.slice(0, maxLength) : value;
  return safeAllowlistedString(bounded.replace(/[\r\n]+/g, " "), label, maxLength);
}

export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = url.search.replace(SECRET_QUERY, "$1[REDACTED]");
    url.hash = "";
    return url.toString();
  } catch {
    return value.replace(SECRET_QUERY, "$1[REDACTED]");
  }
}

export function redactHeaders(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = /authorization|cookie|token|secret|password/i.test(key) ? "[REDACTED]" : typeof item === "string" && /^https?:\/\//.test(item) ? redactUrl(item) : sanitize(value[key]);
  }
  return result;
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) continue;
      result[key] = sanitize(item);
    }
    return result;
  }
  if (typeof value === "string") return value.replace(SECRET_QUERY, "$1[REDACTED]").replace(SECRET_VALUE, "[REDACTED]").replace(CONTROL, "�");
  return value;
}

export function redactForReport(value: unknown): unknown {
  return sanitize(value);
}

export function assertRedacted(value: unknown): void {
  function visit(item: unknown, path: string): void {
    if (Array.isArray(item)) { item.forEach((child, index) => visit(child, `${path}[${index}]`)); return; }
    if (item !== null && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (FORBIDDEN_KEY.test(key)) throw new Error(`forbidden redaction key at ${path}.${key}`);
        visit(child, `${path}.${key}`);
      }
    }
    if (typeof item === "string" && (CONTROL.test(item) || UNREDACTED_QUERY.test(item) || UNREDACTED_SECRET_VALUE.test(item))) {
      CONTROL.lastIndex = 0;
      throw new Error(`secret-like query at ${path}`);
    }
    CONTROL.lastIndex = 0;
    SECRET_QUERY.lastIndex = 0;
  }
  visit(value, "$" );
}

export function sanitizeFixture(value: unknown): unknown {
  const result = redactForReport(value);
  assertRedacted(result);
  return result;
}
