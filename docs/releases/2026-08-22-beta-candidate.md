# Beta release records — 2026-08-22

**Current tag:** [`v0.1.0-beta.2`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.2)
(supersedes beta.1, which is unusable on real runners — see the
[live smoke findings](../reviews/2026-08-22-live-smoke-findings.md)).
This is a beta, not a production declaration, not external adoption evidence,
and not merge-blocking anywhere unless a maintainer configures it as a
required status check.

## Released candidate — v0.1.0-beta.2

| Field | Value |
| --- | --- |
| Tag | `v0.1.0-beta.2` (pre-release, latest) |
| Source commit | `edab0ece5dd404bbe05cd349d60d9ccb190b57c8` (`main`, merge of PR #20) |
| Package lockfile digest | `sha256:128084db3cc7da298bab38b5127ebb06dec45f8a8e18f9b6e41e7fc1ab98a526` |
| Action bundle digest | `sha256:1e7b4a570e92e8b74489f49e0d851c006858654a7a996684a986f618e353d698` (`dist/action/index.js`) |
| Live consumer smoke | [daichunghy/patchgate-beta-smoke](https://github.com/daichunghy/patchgate-beta-smoke) run `32562216635`: green end-to-end with the fail-closed native-control boundary (`GITHUB_PROVENANCE_AMBIGUOUS` under `github.token`) recorded |
| Maintainer approval and date | Approved 2026-08-22 by the repository maintainer (`daichunghy`) to supersede beta.1 after the smoke findings |

## Superseded candidate — v0.1.0-beta.1

| Field | Value |
| --- | --- |
| Tag | `v0.1.0-beta.1` (pre-release, superseded) |
| Source commit | `301c7001e34fa4eee705b2a8a83e8e2a65797049` (`main`, merge of PR #18) |
| Package lockfile digest | `sha256:128084db3cc7da298bab38b5127ebb06dec45f8a8e18f9b6e41e7fc1ab98a526` |
| Action bundle digest | `sha256:c43ae463b2321df30c1b7df520fb20b8d0468a4b8a29fd549f0bb17897d1f409` (`dist/action/index.js`) |
| Action bundle verification | `verify:dist` clean-room pass: no external ajv/yaml runtime import, starts without source schemas or `node_modules`, no raw `.ts` leak |
| Compatibility evidence | Fresh-checkout `npm run verify` on Node v25.6.1: lint, typecheck, budget/pins/events/doc-links/community/dossier checks, audit, 138 tests (94 unit, 14 security, 25 GitHub integration, 5 CLI process), bundle, consumer fixture, release-candidate check all pass; public CI (Node 20.x/22.x on ubuntu/macos), CodeQL and Dependabot runs pass on the same commit |
| Clean consumer repository | none yet; only the recorded consumer-fixture smoke |
| Previous known-good SHA | none (first beta); rollback follows the runbook consumer-reference procedure |
| Rollback run URL | none (no installations exist to roll back) |
| Shadow installations | **no-go decision recorded 2026-08-22**: no consenting shadow repository was available before release; the beta therefore ships for self-service shadow evaluation with the consumer reference above. This satisfies the runbook's "or an explicit documented no-go decision" branch. Revisit before any `v0.1` claim. |
| Maintainer approval and date | Approved 2026-08-22 by the repository maintainer (`daichunghy`), recorded in the application session and executed by the maintenance agent |
| Known limitations accepted | merge-group unsupported (non-ready); unsupported Ruleset semantics fail closed; receipt is digest-bound, not signed; `human_review_required` is an unsatisfied-gate state, not review proof |

## Changes included since the first candidate record

- Boundary hardening from static-advisory adjudication
  ([review record](../reviews/2026-08-22-mimosa-static-advisory-adjudication.md)):
  strict GitHub-compatible charset for repository identity segments;
  `assertUtcTimestamp` via `String.prototype.match` (PR #18).
- Dependency updates: `@types/node` 26, `vitest` 4.1.11,
  `@vitest/coverage-v8` 4.1.11 (PRs #11/#13/#14). `typescript` 7 deferred
  (PR #12: `@vercel/ncc` cannot bundle under TS 7).
- Vitest `dist/` duplicate-run fix (PR #16).

The earlier first-candidate record (source `41f8abf`, bundle digest
`sha256:3b55ecec…d350`) was superseded by the PR #18 merge before tagging;
its verification chain is identical except for the bundle digest above.
