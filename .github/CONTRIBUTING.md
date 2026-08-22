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
- Prose files (`CONTRIBUTING.md`, `AGENTS.md`, `SECURITY.md`, README files, PR templates) are discovery-only. PatchGate may surface candidate rules from them, but they cannot create blocking enforcement without an explicit `patchgate.yml` rule or a native GitHub control.
- Do not infer blocking rules from `AGENTS.md` or this file. `AGENTS.md` is an agent operating snapshot, not policy.

## 3. How reviews actually happen

This repository has one maintainer. There is no review board and no independent approver on staff.

- Fork the repository, push a branch on your fork, and open a pull request against `main`.
- `npm run verify` is the merge gate. A PR is not ready if that command is red.
- Pull requests that were merged by lifting `enforce_admins` are recorded as maintainer decisions, not independent review. Do not describe them as third-party approval.
- Keep changes focused. Do not invent GitHub teams in [CODEOWNERS](CODEOWNERS); the file lists `@daichunghy` because that is the only verified maintainer account.

## 4. Development Setup

### Node runtimes (this scatter is real)

| Surface | Node story |
| --- | --- |
| `package.json` `engines` | `>=20` |
| CI matrix | 20.x and 22.x on ubuntu/macos |
| GitHub Action (`action.yml`) | `using: node24` (runner runtime for the bundled Action) |

Install a Node.js 20+ toolchain for local CLI work. CI currently runs 20.x and 22.x. The published Action candidate runs on GitHub's `node24` runtime; that is not the same as the CI matrix. npm 10.x+ and Git are also required.

### Commands
```bash
# Install dependencies
npm ci

# Merge gate: lint, types, budgets, unit tests, security tests, fixtures, CLI smoke
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

## 5. TypeScript & Implementation Standards

- **Strict Mode:** TypeScript `strict: true` is mandatory; production code must never use `any`.
- **Pure Evaluator Engine:** The core evaluator (`src/evaluator-core.ts`) must remain pure: zero file system I/O, zero network calls, zero clock/date lookups, zero random generation.
- **Deterministic Receipts:** All receipt digests (`receiptDigest`, `decisionInputDigest`) must be byte-for-byte reproducible across identical inputs.
- **Fail-Closed Security:** Unverified claims, ambiguous permissions, or missing evidence must yield explicit non-ready statuses (`policy_ambiguous`, `evidence_missing`, `human_review_required`, `blocked`), never an unearned `ready_for_review`.

## 6. Good-first work stays outside the trust boundary

Do not start with the evaluator core (`src/evaluator-core.ts`, `src/contract/`, `schemas/`) or the GitHub adapter privileged lane (`src/github/`, Action privileged workflows). Those paths are the trust boundary.

Current contribution issues, if they are still open:

- [Issue #5 — beta release and rollback documentation](https://github.com/daichunghy/patchgate/issues/5)
- [Issue #6 — CODEOWNERS subset conformance fixtures](https://github.com/daichunghy/patchgate/issues/6)
- [Issue #7 — clean consumer-repository Action fixture](https://github.com/daichunghy/patchgate/issues/7)

Issue #6 is fixture coverage for the **documented** CODEOWNERS subset. Do not start matching `?` or other undocumented syntax without fixtures and an explicit contract change.

## 7. License

Contributions are licensed under [Apache-2.0](../LICENSE). There is no extra CLA or DCO.

## 8. Submitting Changes

1. Open an issue first for non-trivial features or architectural changes.
2. Ensure `npm run verify` passes.
3. Keep pull requests focused, concise, and within reviewability budgets.
4. Do not claim `v0.1`, pilots, Marketplace listing, or external adoption in docs unless the corresponding evidence exists.
