# Beta release candidate record — 2026-08-22

**Status:** candidate prepared; **no tag or release has been created.** Tagging
requires the maintainer approval and shadow-installation go/no-go decision
recorded in [the runbook](beta-release-and-rollback.md).

## Candidate

| Field | Value |
| --- | --- |
| Proposed tag | `v0.1.0-beta.1` (pending approval) |
| Source commit | `41f8abf19d3e5797a3fbff318b72806ec5e8a3a4` (`main`, merge of PR #16) |
| Package lockfile digest | `sha256:128084db3cc7da298bab38b5127ebb06dec45f8a8e18f9b6e41e7fc1ab98a526` |
| Action bundle digest | `sha256:3b55ececade3cca957ce43fe47bbd98bd687a3c3d499b28109f012277783d350` (`dist/action/index.js`) |
| Action bundle verification | `verify:dist` clean-room pass: no external ajv/yaml runtime import, starts without source schemas or `node_modules`, no raw `.ts` leak |
| Compatibility evidence | Fresh-checkout `npm run verify` on Node v25.6.1: lint, typecheck, budget/pins/events/doc-links/community/dossier checks, audit, 138 tests (94 unit, 14 security, 25 GitHub integration, 5 CLI process), bundle, consumer fixture, release-candidate check all pass; public CI (Node 20.x/22.x on ubuntu/macos), CodeQL and Dependabot runs pass on `41f8abf` |
| Clean consumer repository | none yet; only the recorded consumer-fixture smoke |
| Previous known-good SHA | none (first beta candidate); rollback follows the runbook consumer-reference procedure |
| Rollback run URL | none (no installations exist to roll back) |
| Shadow installations | none; the runbook's "two consented non-blocking shadow installations or an explicit documented no-go decision" remains pending maintainer decision |
| Maintainer approval and date | **pending** |

## Dependency updates included

- `@types/node` 24 → 26 (PR #11, merged)
- `vitest` 3.2.7 → 4.1.11 and `@vitest/coverage-v8` 3.2.7 → 4.1.11 (PRs #13/#14, merged; full verify re-passed)
- `typescript` 5.9 → 7 deferred: typecheck and tests pass but `@vercel/ncc` cannot bundle under TS 7 (PR #12 stays open with the reproducing comment)

## Not yet satisfied (honest limits)

- No live external consumer, fork E2E or merge-group E2E.
- No consented usability sessions and no shadow pilots.
- The beta is a maintainer decision away from tagging; it must not be
  described as adopted, production-ready or merge-blocking merely because the
  candidate exists.
