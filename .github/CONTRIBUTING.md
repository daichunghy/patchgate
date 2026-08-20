# Contributing to PatchGate

Thank you for your interest in contributing to PatchGate.

PatchGate is an open-source review-readiness gate for GitHub pull requests. Its core promise is:

> A contribution must show the required evidence, ownership, and review boundaries before it is represented as ready for maintainer review.

## 1. Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 2. Authority & Trust Model

PatchGate operates across three strictly isolated lanes:
1. **Trusted Metadata Lane:** Evaluates `patchgate.yml` at base commit, native GitHub controls, CODEOWNERS, and authenticated metadata. It **never checks out or executes pull request code**.
2. **Untrusted Verification Lane:** Runs contributor tests in isolated, read-only CI workflows with zero repository secrets.
3. **Decision Lane:** Consumes normalized JSON snapshots and executes pure, deterministic evaluation to emit a `ContributionReceipt`.

**Core Governance Invariants:**
- Policy is always read from the base commit (`baseSha`). A PR changing policy does not govern itself.
- Prose files (`CONTRIBUTING.md`, `AGENTS.md`, `SECURITY.md`) are discovery-only and cannot create blocking enforcement without explicit `patchgate.yml` configuration.

## 3. Development Setup

### Prerequisites
- Node.js 20.x or 22.x
- npm 10.x+
- Git

### Commands
```bash
# Install dependencies
npm install

# Run complete verification (lint, types, budgets, unit tests, security tests, fixtures, CLI smoke)
npm run verify

# Build project
npm run build

# Build the self-contained GitHub Action bundle
npm run bundle:action

# Run specific test suites
npm test
npm run test:security
npm run test:determinism
npm run test:cli
npm run test:github
```

## 4. TypeScript & Implementation Standards

- **Strict Mode:** TypeScript `strict: true` is mandatory; production code must never use `any`.
- **Pure Evaluator Engine:** The core evaluator (`src/evaluator-core.ts`) must remain pure: zero file system I/O, zero network calls, zero clock/date lookups, zero random generation.
- **Deterministic Receipts:** All receipt digests (`receiptDigest`, `decisionInputDigest`) must be byte-for-byte reproducible across identical inputs.
- **Fail-Closed Security:** Unverified claims, ambiguous permissions, or missing evidence must yield explicit non-ready statuses (`policy_ambiguous`, `evidence_missing`, `human_review_required`, `blocked`), never an unearned `ready_for_review`.

## 5. Submitting Changes

1. Open an issue first for non-trivial features or architectural changes.
2. Ensure `npm run verify` passes with 100% green tests.
3. Keep pull requests focused, concise, and within reviewability budgets.
