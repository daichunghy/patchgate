# Security Policy

## 1. Supported Versions

| Version | Supported |
|---|---|
| `0.1.x` | :white_check_mark: |
| `< 0.1.0` | :x: |

## 2. Reporting a Vulnerability

We take the security of PatchGate and the repositories that rely on it seriously.

If you believe you have found a security vulnerability in PatchGate:

1. **Please do NOT disclose it publicly** via GitHub issues, PRs, or discussions.
2. Submit a report through **[GitHub Private Vulnerability Reporting](https://github.com/patchgate/patchgate/security/advisories/new)**.
3. If PVR is not available, contact the core maintainers via email with encrypted details where appropriate.

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
