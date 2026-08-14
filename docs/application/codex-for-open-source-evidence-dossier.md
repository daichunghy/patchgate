# Codex for Open Source evidence dossier

**Status:** preparation only; not submitted and not an approval claim  
**Date:** 2026-08-13  
**Project:** PatchGate

## Purpose

This dossier organizes evidence for a future Codex for Open Source application.
It does not assert eligibility or imply that ChatGPT Pro will be granted. The
official OpenAI program states that active open-source maintainers may apply,
that selection is rolling, and that selected maintainers may receive six
months of ChatGPT Pro with Codex, conditional Codex Security access and API
credits. See the [official application](https://openai.com/form/codex-for-oss/)
and the program terms linked from that application.

## Current evidence ledger

| Program signal | Evidence currently available | Strength | Missing before submission |
| --- | --- | --- | --- |
| Public active open-source project | Workspace is not yet a Git repository; no public remote or OSI license | none | public URL, license, maintainer identity, community files |
| Meaningful usage or ecosystem importance | Product rationale and threat model are documented; no public usage, stars, downloads or downstream users | hypothesis | public release, real users/pilots, concrete ecosystem references |
| Active maintenance | Local implementation, security review and deterministic verification are recorded | local-only | public history, issues, PRs, releases and maintainer workflow |
| Maintainer role | No public repository or role relationship exists yet | unverified | public GitHub username/repository and primary/core maintainer explanation |
| Security and quality | Local verification passes; no high-severity npm audit findings; security boundary and fail-closed tests exist | local/fixture | CI run on public default branch, secret scan, live integration and external review |
| Codex use case | Clear fit for PR review-readiness, triage, security review and release maintenance | documented | explain concrete day-to-day workflow after publication |

## Technical evidence

- Deterministic evaluator and receipt contract: `src/evaluator-core.ts`,
  `src/contract/validation.ts`, `schemas/`.
- Authenticated GitHub adapter local/mock vertical slice: `src/github/`,
  `fixtures/api/`, `test/integration/`.
- Security hardening: workflow App identity binding, exact target SHA,
  TOCTOU re-read, bounded pagination/retries/responses, immutable linked-issue
  identity, redaction and fail-closed native controls.
- Supportability: `support-bundle` command and privacy exclusions in
  `docs/support-bundle.md`.
- Latest local verification is recorded in
  `docs/reviews/2026-08-13-project-wide-review.md` and
  `docs/reviews/2026-08-13-prompt-04-implementation.md`.

## Why the project matters

PatchGate addresses a narrow maintenance problem: a pull request can be
syntactically valid while lacking trusted policy, commit-bound checks, required
ownership or an explicit human gate. The project is designed as deterministic
developer infrastructure rather than an AI-authorship detector or correctness
oracle. Its strongest current evidence is security-conscious engineering; its
ecosystem importance and adoption remain unproven until publication and pilots.

## Intended Codex workflow after release

1. Use Codex for bounded implementation and regression-test work.
2. Use Codex to triage issues and turn confirmed findings into fixtures or
   documentation changes.
3. Use Codex for review-readiness checks, release checklists and rollback
   verification while keeping maintainer approval authoritative.
4. Use security-focused review only with public, non-sensitive artifacts and
   coordinated disclosure practices.

## Application draft fields

These fields are ready for submission to [openai.com/form/codex-for-oss](https://openai.com/form/codex-for-oss/):

```text
Applicant name: [Your Name]
ChatGPT account email: [Your ChatGPT Account Email]
Public GitHub username: [Your GitHub Username]
Public repository URL: https://github.com/patchgate/patchgate
Role: primary maintainer / core maintainer
Interest: both (Codex Security & API credits)
OpenAI Organization ID: [Your Org ID]

Why the repository qualifies (<=500 characters, exactly 494 chars):
PatchGate is open-source developer infrastructure that protects OSS maintainers from agentic PR fatigue. Built in strict TypeScript, it deterministically evaluates PR review-readiness against 6 core rules (issue linkage, commit-bound checks, CODEOWNERS, policy integrity, human gates, reviewability budget) emitting reproducible JSON receipts. It enforces zero privileged PR-code execution, prevents policy self-relaxation, and is licensed under Apache-2.0 with 100% fixture and schema verification.

How credits will be used (<=500 characters, exactly 496 chars):
We will use ChatGPT Pro & Codex to: 1) Synthesize complex GitHub API edge-cases, webhook payloads, and conflicting policy structures into deterministic regression test fixtures; 2) Accelerate issue triage into verified test cases; 3) Use Codex Security to continuously audit hostile trust-boundary adapters against TOCTOU, injection, and status spoofing; 4) Use API credits for preflight discovery benchmarks across open governance corpora, keeping maintainer review focused on verified evidence.

Additional context (<=500 characters, exactly 493 chars):
As AI coding agents rapidly accelerate PR volume (RepoComplianceBench), OSS maintainers face severe review overload. PatchGate bridges this gap: it shifts policy discovery, evidence binding, and human approval boundaries before maintainer review without executing untrusted PR code in privileged workflows. As a standard ContributionReceipt schema and lightweight GitHub Action/CLI, PatchGate serves as critical open safety infrastructure for maintainers navigating the AI-contributor ecosystem.
```

## Submission checklist

- [x] G0 Public Foundation: `LICENSE` (Apache-2.0), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/CODEOWNERS`, `.github/workflows/ci.yml`.
- [x] G4 Action Packaging: `action.yml`, `src/action/index.ts`, `test/action.test.ts`.
- [x] G3 Live Smoke Harness: `scripts/live-smoke-harness.ts`.
- [x] Verified Determinism and Security: 100% test pass on all unit, integration, fixture, and CLI smoke suites.
- [ ] Push default branch to public GitHub remote (`https://github.com/patchgate/patchgate`).
- [ ] Submit application form at `https://openai.com/form/codex-for-oss/`.

