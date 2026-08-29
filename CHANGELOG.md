# Changelog

All notable changes are documented here, newest first. Entries mirror the tagged releases (dates UTC); the release page for each tag carries the same text plus its assets.

## [v0.1.0-beta.5](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5) — 2026-08-23

Current public documentation-synchronized beta. The Action behavior is unchanged from beta4; the README, usage guide, support/security pages, AGENTS.md, changelog, and release record now point to beta5. Pin the immutable commit attached to this release and keep fail-on: never. This is shadow-only, not production, Marketplace, v0.1, or adoption evidence.

## [v0.1.0-beta.4](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.4) — 2026-08-23

`v0.1.0-beta.4` ships the CLI ergonomics and Action-defaults work on top of beta.3. It supersedes `v0.1.0-beta.3` as the pinned reference for shadow evaluation.

## What changed since beta.3

- **Install from GitHub without cloning** (PR #36): `npx github:daichunghy/patchgate` now works — a `prepare` script builds `dist/` during a Git dependency install, verified by a real clean-directory install smoke (`--version`, `--help`, `doctor`, and `.github/patchgate.yml` discovery end to end). Registry publication remains a maintainer-gated decision; `prepublishOnly` now runs the full verification chain. CLI `--fail-on` parity and glob hardening (`?` is a literal character in path patterns, not a regex quantifier) are included, plus a `docs/demo.md` walkthrough with captured CLI output.
- **`evaluate --output` alias, fail-closed conflicts** (PR #40): `--output` is now an alias of `--report` on `evaluate`; passing both with different receipt paths exits `2` with `REPORT_OUTPUT_CONFLICT` instead of picking a winner. `--report` remains the documented flag; the committed Action bundle catches up with this parser change.
- **`create-check-run` defaults to `true`** (PR #42): the Action posts its idempotent Check Run by default, matching how every recorded shadow evaluation was configured; the input parser default mirrors `action.yml`. Also carries the combined CodeQL 4.37.7 action pin bump.
- **Dependency pins** (PRs #38, #39, #42): `actions/setup-node` 7.0.0 and `actions/checkout` 7.0.1 full-SHA pins across all five repository workflows, plus the CodeQL action runner bump above.
- Docs: PR #41 records the PR #40 maintainer merge and status snapshot.

Full record: `docs/CHANGELOG.md`, `docs/releases/2026-08-23-beta.4.md`.

## Consumer reference (shadow, non-blocking)

```yaml
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@d8c67a848a95d456707e6c580a43e4e56e6071a0
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

Consumer guidance is unchanged: pin this full commit SHA, keep `fail-on: never`, and run in shadow only. With `github.token` the evaluation fails closed with `GITHUB_PROVENANCE_AMBIGUOUS` (native-control visibility needs a PAT or GitHub App token with `administration: read`); a rejected snapshot posts a neutral rejection Check Run and exits 0 under `fail-on: never`.

## Verification

Fresh-checkout `npm run verify` at the tagged commit: lint, typecheck, budget/pin/event/doc-link/community/dossier checks, audit (0 vulnerabilities), full test suites (146 tests: unit, security, GitHub integration, CLI process incl. `--output` conflict and `--fail-on` cases), clean-room action bundle, consumer fixture and release-candidate checks all pass; public CI and CodeQL runs pass on the same commit (`d8c67a8`). Maintainer smoke repository: [daichunghy/patchgate-beta-smoke](https://github.com/daichunghy/patchgate-beta-smoke).

Beta shadow-evidence scope only — this is not a production release, not external adoption evidence, and not a `v0.1` claim. It blocks merges nowhere unless a maintainer configures it as a required status check with an expected-source setting. Two consenting external shadow installations, a live external consumer E2E, and fork/merge-group E2E remain open gates before any `v0.1` claim.


## [v0.1.0-beta.3](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.3) — 2026-08-22

`v0.1.0-beta.3` consolidates the multi-persona review fixes and first-run improvements on top of beta.2. It supersedes `v0.1.0-beta.2` as the pinned reference for shadow evaluation.

## What changed since beta.2

- **Determinism**: five adapter collection sorts that used `localeCompare` now use a locale-independent code-unit comparator; positional requirement IDs (`codeowners.N`, `native.*.check.N`) and native-control digests are reproducible across runtimes with different ICU collation.
- **Receipt contract**: receipts now include `nativeControls` when present, so `decisionInputDigest` is recomputable from the receipt alone; the receipt schema accepts any semantic-version-shaped `evaluatorVersion` instead of pinning one build, so future version bumps no longer self-invalidate.
- **CLI parity**: `evaluate` and `github snapshot` accept `--fail-on` with the same five levels and precedence semantics as the Action (default `blocked`); root help documents `--json` and `--fail-on`.
- **First-run experience**: `init` writes a fully commented draft policy and supports `.github/patchgate.yml`; local `doctor`/`preflight` accept the `.github/` policy location with the same root-first order as the live adapter; preflight resolves Git refs without `--repo`; an honest clone-first install path is documented (the npm `patchgate` name is taken by an unrelated package — a scoped package name decision is pending).
- **Action hardening**: summary/check-run cell content is HTML-encoded against markup breakout; rejected snapshots now post a neutral rejection Check Run when `create-check-run: true`.
- Policy-change detection matches the loaded policy source identity, so a nested policy path is flagged without manual duplication.

Full record: `docs/reviews/2026-08-22-multi-persona-review.md`, `docs/reviews/2026-08-22-live-smoke-findings.md`, `docs/CHANGELOG.md`.

## Consumer reference (shadow, non-blocking)

```yaml
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@a22812b6b802a31786a9607648b978031bd82e7b
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

Pin to this full commit SHA. With `github.token` the evaluation fails closed with `GITHUB_PROVENANCE_AMBIGUOUS` (native-control visibility needs a PAT or GitHub App token with `administration: read`); a rejected snapshot posts a neutral rejection Check Run and exits 0 under `fail-on: never`.

## Verification

Fresh-checkout `npm run verify` at the tagged commit: lint, typecheck, budget/pin/event/doc-link/community/dossier checks, audit (0 vulnerabilities), full test suites (unit, security, GitHub integration, CLI process incl. `--fail-on` precedence cases), clean-room action bundle, consumer fixture and release-candidate checks all pass; public CI, CodeQL and Dependabot runs pass on the same commit. Maintainer smoke repository: [daichunghy/patchgate-beta-smoke](https://github.com/daichunghy/patchgate-beta-smoke).

Beta status unchanged: pre-release for shadow evaluation; not production-declared, not externally piloted, and blocks merges only where a maintainer configures it as a required status check with an expected-source setting.


## [v0.1.0-beta.2](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.2) — 2026-08-22

`v0.1.0-beta.2` fixes a critical input-parsing bug found by the first live consumer smoke test of beta.1, and supersedes `v0.1.0-beta.1` for any shadow evaluation.

## Critical fix: Action inputs were unreadable on real runners

The GitHub Actions runner exports inputs with dashes preserved (`github-token` becomes `INPUT_GITHUB-TOKEN`), but the Action read underscore names (`INPUT_GITHUB_TOKEN`). On real runners every input was therefore unreadable: `github-token` fell back to empty (the Action aborted with "GitHub token is missing"), while `fail-on`, `create-check-run` and `check-name` silently fell back to defaults. Local unit tests missed this because they injected the same underscore names the parser read.

The parser now prefers runner-native dashed names with underscore fallbacks, locked by regression and precedence tests. The repository's own Shadow Gate failures previously attributed to the documented non-ready boundary were caused by this same bug; those runs never reached evaluation and their evidence is void.

## Other changes

- Corrected the beta.1 release-notes consumer reference from the invalid `daichunghy/patchgate/action@<SHA>` subpath form to the root `daichunghy/patchgate@<SHA>` form (the runbooks were already correct).
- Migrated `action.yml` from `node20` to `node24` per the runner deprecation.
- Findings record: `docs/reviews/2026-08-22-live-smoke-findings.md` in the repository.

## Consumer reference (shadow, non-blocking)

```yaml
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@edab0ece5dd404bbe05cd349d60d9ccb190b57c8
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

Pin to this full commit SHA; do not treat a branch reference as immutable.

## Verification

Fresh-checkout `npm run verify` at the tagged commit: lint, typecheck, budget/pin/event/doc-link/community/dossier checks, audit (0 vulnerabilities), 138 tests (94 unit including 16 action tests with runner-native input names, 14 security, 25 GitHub integration, 5 CLI process), clean-room action bundle, consumer fixture and release-candidate checks all pass; public CI (Node 20/22, ubuntu/macos), CodeQL and Dependabot runs pass on the same commit. Maintainer smoke repository: [daichunghy/patchgate-beta-smoke](https://github.com/daichunghy/patchgate-beta-smoke).

Beta status unchanged: pre-release for shadow evaluation; not production-declared, not externally piloted, and blocks merges only where a maintainer configures it as a required status check with an expected-source setting.


## [v0.1.0-beta.1](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.1) — 2026-08-22

PatchGate `v0.1.0-beta.1` is the first public beta of a review-readiness gate for pull requests. It ships one deterministic evaluator behind both a CLI and a GitHub Action.

## What it does

PatchGate reads trusted base-commit policy (`patchgate.yml`, CODEOWNERS, branch protection/Rulesets subset), pull-request metadata, changed paths, ownership requirements and SHA-bound check evidence, then emits a versioned `ContributionReceipt` with one final status: `ready_for_review`, `blocked`, `human_review_required`, `evidence_missing` or `policy_ambiguous`.

It is not an AI-authorship detector, a code-correctness oracle, or a replacement for GitHub Rulesets or maintainer judgment.

## Supported surface (GitHub.com)

- `pull_request` events, head or merge target (merge-group membership is explicitly unsupported and reported non-ready);
- read-only metadata: repository identity, PR identity, changed paths, reviews, linked issues (GraphQL), check runs and workflow runs bound to the tested SHA;
- base-commit policy reading only — a PR can never relax the rules that govern it;
- optional idempotent Check Run (`create-check-run: true`).

## Required permissions

The adapter is read-only: repository metadata, pull requests, contents, checks, actions read, collaborator visibility, and (for teams) members read. Creating a Check Run additionally needs `checks: write`. Fail-closed behavior: a 404 is treated as unknown unless confirmed absence is explicitly supplied, a 403 is an insufficient-capability diagnostic, and unsupported Ruleset semantics remain non-ready rather than guessed.

## Known limitations

- merge-group membership is not representable and reports non-ready;
- unsupported Ruleset semantics fail closed;
- `human_review_required` means a declared human gate is unsatisfied — it is not proof of human review;
- the receipt is digest-bound and reproducible, not cryptographically signed;
- shadow evidence is pending: this beta ships with a documented no-go decision on shadow installations rather than pilot results (see `docs/releases/beta-release-and-rollback.md`).

## Consumer reference (shadow, non-blocking)

```yaml
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@301c7001e34fa4eee705b2a8a83e8e2a65797049
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

Pin to this full commit SHA; do not treat a branch reference as immutable.

## Verification

Fresh-checkout `npm run verify` at the tagged commit: lint, typecheck, budget/pin/event/doc-link/community/dossier checks, audit (0 vulnerabilities), 138 tests (94 unit, 14 security, 25 GitHub integration, 5 CLI process), clean-room action bundle, consumer fixture and release-candidate checks all pass; public CI (Node 20/22, ubuntu/macos), CodeQL and Dependabot runs pass on the same commit. Beta status: this is a pre-release for shadow evaluation; it is not production-declared, not externally piloted, and blocks merges only where a maintainer configures it as a required status check with an expected-source setting.

> **Correction (2026-08-22):** the consumer reference below was originally published as `daichunghy/patchgate/action@<SHA>`, which resolves to a nonexistent subdirectory and fails at workflow setup. Use the root form shown now. A critical input-parsing fix (runner exports `INPUT_GITHUB-TOKEN`-style dashed names) ships in [`v0.1.0-beta.2`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.2) — prefer beta.2 for any shadow evaluation.


