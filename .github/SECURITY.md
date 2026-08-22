# Security Policy

## 1. Supported Versions

| Version | Supported |
|---|---|
| `0.1.0-dev` | Best effort during pre-release |
| Released versions | No released version yet |

## 2. Reporting a Vulnerability

We take the security of PatchGate and the repositories that rely on it seriously.

If you believe you have found a security vulnerability in PatchGate:

1. **Please do NOT disclose it publicly** via GitHub issues, PRs, or discussions.
2. Use [GitHub Private Vulnerability Reporting](https://github.com/daichunghy/patchgate/security/advisories/new).
3. If the private reporting form is unavailable, do not disclose a suspected
   vulnerability publicly; preserve a local reproduction and contact the
   maintainer through the repository owner profile.

### Response Timelines (SLAs)
- **Initial Acknowledgment:** Within 48 hours.
- **Triage & Severity Assessment:** Within 5 business days.
- **Remediation & Patch Release:** Critical/High severity issues patched within 14 calendar days.

## 3. Scope & Threat Model

### In-Scope Vulnerabilities
- Bypassing base-policy enforcement (e.g. self-relaxing policies in PRs).
- Status-check source spoofing or untrusted check forgery.
- Stale review or stale check evidence acceptance.
- Credential, secret, or PII leakage in receipts, diagnostics, or support bundles.
- Code execution vulnerabilities in privileged GitHub Action contexts.
- Time-of-Check to Time-of-Use (TOCTOU) race condition exploitation.

### Out of Scope
- Code correctness, functionality, or vulnerability assessment of PR code itself (PatchGate evaluates review-readiness gates, not arbitrary code correctness).
- AI authorship detection (explicitly not a product capability).
- Denial-of-service via GitHub API rate limiting beyond configured request budgets.
