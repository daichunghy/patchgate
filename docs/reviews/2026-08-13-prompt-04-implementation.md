# Prompt 4 implementation report

**Date:** 2026-08-13  
**Scope:** G3 authenticated GitHub adapter, local/mock portion  
**Validation level:** `static_or_fixture_verified` until an authorized live smoke

## Durable checkpoint ledger

### Slice 0 — baseline and contract

- Workspace is not a Git repository; no Git initialization, remote, push, GitHub
  write, Action installation, or live API request was performed.
- Existing baseline was audited before edits. Current command counts and results
  are recorded in the closure section after verification.
- Three read-only subagents were dispatched for API/provenance, security/TOCTOU/
  privacy, and contract/fixture/delivery review. The review loop identified and
  the implementation fixed endpoint-capability conflation, workflow-App source
  spoofing, malformed native-control normalization, immutable linked-issue
  identity gaps, credential-shaped redaction gaps, underpowered fixture-byte
  checks, and an underpowered fixture manifest oracle. The executed local verification is the
  authoritative evidence for the narrowed local/mock scope.
- Official API source ledger is maintained in `docs/github-api-support-matrix.md`.
- Contract decisions are recorded in
  `docs/decisions/2026-08-13-g3-contract.md`.

### Implementation slices

| Slice | Status | Evidence | Residual |
| --- | --- | --- | --- |
| Boundary infrastructure | completed locally | `src/github/client.ts`, retry, pagination, budgets, redaction; `npm run lint`, typecheck | live headers/permissions |
| Identity and trusted base | completed locally | head/merge/TOCTOU fixtures, raw byte digest assertion | merge-group limitation; live base contents |
| Collections and normalization | completed locally | `npm run test:github`, 19 integration tests | live permissions and platform behavior |
| Snapshot, TOCTOU and CLI | completed locally | CLI replay, malformed fixture, live-flag guard | live smoke authority |
| Closure | completed locally | `npm run verify`, build, audit, fixture and redaction gates pass | G3 live gate |

## Findings ledger

This table is updated after subagent reviews. P0/P1 findings in local/mock scope
must be fixed before the local portion is called complete.

| ID | Severity | Source | Finding | Status |
| --- | --- | --- | --- | --- |
| P4-CONTRACT-001 | P1 | Slice 0 | Existing scalar PR contract cannot encode authenticated merge-group membership | explicit fail-closed ADR; executable unsupported case passes |
| P4-CONTRACT-002 | P1 | Slice 0 | Existing evaluator does not compile native ruleset/branch-protection sources into requirements | explicit normalized-but-rejected native decision-bearing behavior |
| P4-SECURITY-001 | P1 | Slice 0 | Live source authenticity and permissions cannot be proved by local fixtures | live read-only smoke remains pending maintainer authorization |
| P4-REVIEW-001 | P1 | API/provenance review | Capability report conflated check-runs with workflow-runs and reviewer endpoints | fixed with endpoint-specific metadata and regression coverage |
| P4-REVIEW-002 | P1 | API/provenance review | Fixture manifest asserted only final status and could miss request/provenance drift | fixed with request sequence, queue exhaustion, completeness, digest, budget, and redaction assertions |
| P4-SECURITY-002 | P1 | Security re-review | Workflow-bound checks accepted an arbitrary App identity; malformed native controls could be normalized as absent | fixed with GitHub Actions identity-pair validation and fail-closed native parsing |
| P4-CONTRACT-003 | P1 | Contract re-review | Linked-issue evidence did not require immutable repository/issue identity | fixed in schema, evaluator contract, receipt references, and duplicate-identity tests |
| P4-SECURITY-003 | P1 | Security re-review | Credential-shaped keys and fixture byte declarations were under-protected | fixed with broader redaction and payload/byte validation |

## Closure manifest

| Package | Acceptance IDs | UR/TG IDs | Implementation | Test/fixture IDs + commands | Evidence level | Residual gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PG-301 | identity invariants | UR-002, UR-103, UR-202, UR-205 / TG-13, TG-15 | `src/github/identity.ts` | `github-identity`; `npm run test:github` | static_or_fixture_verified | merge-group contract unsupported | implemented |
| PG-302 | exact base bytes/digest | UR-103, UR-202, UR-304, UR-306 / TG-01, TG-02 | `src/github/contents.ts` | `github-policy`; `npm run test:github` | static_or_fixture_verified | live contents permission | implemented |
| PG-303 | complete paths/caps | UR-105, UR-203, UR-301, UR-303 / TG-12 | `src/github/changed-paths.ts`, `pagination.ts` | `github-pagination`; `npm run test:github` | static_or_fixture_verified | live 3,000-file behavior | implemented |
| PG-304 | native linked issues | UR-102, UR-105, UR-203, UR-306 / body-only negative | `src/github/linked-issues.ts` | `github-linked-issues`; `npm run test:github` | static_or_fixture_verified | current schema same-repository only | implemented |
| PG-305 | check/workflow identity | UR-104, UR-105, UR-203, UR-204, UR-205 / TG-03, TG-04, TG-05, TG-13 | `src/github/checks.ts`, `workflows.ts` | `github-checks-workflows`; `npm run test:github` | static_or_fixture_verified | live check-suite availability |
| PG-306 | current review state | UR-104, UR-105, UR-202 / TG-09, TG-10 | `src/github/reviews.ts` | `github-reviews`; `npm run test:github` | static_or_fixture_verified | live review permission |
| PG-307 | qualification | UR-105, UR-201, UR-202 / TG-10, TG-11 | `src/github/permissions.ts` | `github-permissions`; `npm run test:github` | static_or_fixture_verified | live team visibility |
| PG-308 | base CODEOWNERS subset | UR-103, UR-202, UR-203, UR-208 / TG-11, TG-12 | `src/github/codeowners.ts` | `github-codeowners`; `npm run test:github` | static_or_fixture_verified | declared subset, no full conformance |
| PG-309 | native control normalization | UR-103, UR-201, UR-204, UR-208 / TG-14, TG-16 | `rulesets.ts`, `branch-protection.ts` | `github-native-controls`; `npm run test:github` | static_or_fixture_verified | active decision-bearing controls reject under current evaluator |
| PG-310 | errors/retry | UR-105, UR-201, UR-203, UR-303 | `client.ts`, `retry.ts`, `diagnostics.ts` | `github-errors`; `npm run test:github` | static_or_fixture_verified | live rate-limit headers |
| PG-311 | coherent snapshot | UR-202, UR-203, UR-305, UR-306 / TG-02, TG-15 | `toctou.ts`, `snapshot-builder.ts` | `github-toctou`; `npm run test:github` | static_or_fixture_verified | live mutation behavior |
| PG-312 | redaction | UR-304, UR-407 / TG-08 | `redaction.ts` | `github-redaction`; `npm run test:redaction` | static_or_fixture_verified | no private live payload captured |
| PG-313 | capabilities | UR-004, UR-105, UR-201, UR-207 / TG-11, TG-14 | `capabilities.ts` | `github-capabilities`; `npm run test:github` | static_or_fixture_verified | GHES unsupported |
| PG-314 | hard budgets | UR-301, UR-302, UR-303 / TG-12 | `request-budget.ts` | `github-budgets`; `npm run test:github` | static_or_fixture_verified | live cost profile |
| PG-315 | cache decision | UR-302, UR-305, UR-306 | ADR and no-cache client behavior | `github-cache-deferred`; `npm run test:github` | documented | no cache implementation by design | evaluated_deferred |

## Final verification record

- `npm run verify`: pass — 73 non-CLI tests, 19 GitHub integration tests, 14
  security tests, and 5 CLI process tests.
- `npm run test:redaction`: pass — 11 redaction/security integration tests.
- `npm run test:github`: pass — 19 integration tests.
- `npm run verify:fixtures`: pass — 7 recorded-fixture tests.
- `npm run check:fixture-budgets`: pass — 3 API fixtures within the 2 MiB
  response budget and with non-underreported declared byte counts.
- `npm run test:cli`: pass — 5 CLI process tests, including support-bundle
  generation and under-reported fixture rejection.
- `npx vitest run test/support-bundle.test.ts`: pass — 2 support-bundle tests.
- `npm run lint`: pass — 37 TypeScript source files.
- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm audit --audit-level=high`: pass — 0 vulnerabilities.
- Security hardening regression coverage includes workflow App spoofing,
  malformed branch-protection entries, immutable linked-issue omissions and
  duplicates, API-key-shaped redaction, full request-oracle matching, and
  recorded-payload byte validation.
- Workspace remains outside Git; no Git initialization, remote, push, or GitHub
  write was performed.

## Current gate statement

`G3 local/mock implementation: complete` for the narrowed, documented contract:
head/merge pull-request snapshots, explicit merge-group rejection, normalized
native-control rejection when not representable, bounded read-only transport,
and recorded/mock evidence. `G3 live gate: pending maintainer authorization`.
`G3 overall: not complete` because no authorized live read-only smoke has been
run.
