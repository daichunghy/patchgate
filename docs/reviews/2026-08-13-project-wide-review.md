# Project-wide review and next-build checkpoint

**Date:** 2026-08-13  
**Scope:** Constitution, requirements, roadmap, execution plan, work-package
ledger, source, schemas, fixtures, CLI flows, GitHub adapter, security
boundary, release surface and supportability.  
**Validation level:** `static_or_fixture_verified` for this review and the new
support-bundle/fixture-budget slice.

## Outcome

The deterministic core, local onboarding slice and G3 local/mock adapter are
substantive and well bounded. The project is not yet a public release, G3
overall gate, G4 Action, shadow pilot, or `v0.1` product. The most important
next work is evidence and delivery infrastructure, not adding more evaluator
rules.

## Current maturity map

| Area | Current evidence | Assessment | Next action |
| --- | --- | --- | --- |
| G1 evaluator/receipt | schemas, 73 non-CLI tests, adversarial fixtures | technically strong local slice | keep compatibility and security tests authoritative |
| G2 CLI | process smoke, Git-ref fixtures, init/validate/doctor | local flow verified; usability sessions absent | run three consent-safe sessions; do not infer user value |
| G3 adapter | recorded API fixtures, 18 integration tests, TOCTOU and budgets | local/mock complete under narrowed contract; live gate open | maintainer-authorized read-only smoke |
| G0 foundation | no Git repository, license, community files, CI or public remote | blocked by maintainer authority | decide owner/repository/license and publish only after review |
| G4 Action | no `action.yml`, `src/action`, bundle or workflow examples | not started; correctly gated on G0/G2/G3 | begin only after upstream gate decisions/evidence |
| Supportability | redaction existed; support-bundle now available and tested | local support artifact improved | add clean-room upgrade/rollback and compatibility matrix |
| External value | protocols exist; no sessions/pilots | unproven | collect raw task and shadow evidence with consent |

## Findings and improvements

### P1 — release and authority blockers

1. **No public-project authority.** The workspace is not a Git repository and
   has no selected owner, OSI license, community-health files, CI or remote.
   This is not safe to infer or create autonomously.
2. **G3 live provenance is unverified.** Local fixtures cannot prove endpoint
   permissions, repository visibility, real API behavior, or live finalization.
3. **G2 usability evidence is absent.** The task-session protocol exists, but
   three actual sessions and findings are still required.
4. **G4 must remain gated.** A metadata-only Action, bundle, check delivery,
   merge-group behavior and fork-safe workflow have not been built. Building it
   before G0/G2/G3 closure would create misleading release claims.

### P2 — technical and product risks

1. **Native control semantics are intentionally incomplete.** Applicable
   decision-bearing rulesets/branch protection are rejected because the scalar
   evaluator cannot represent them. This is safer than approximation, but the
   supported subset must remain explicit.
2. **Merge-group support is intentionally unsupported.** The current input
   contract cannot encode authenticated multi-PR membership. A future contract
   must be designed before enabling merge-queue claims.
3. **CODEOWNERS is a documented subset, not full GitHub conformance.** The
   project should add conformance fixtures before claiming broad ownership
   compatibility.
4. **The adapter uses no cache by design.** This avoids identity leakage and
   stale-body reuse; performance should be measured before adding conditional
   caching.
5. **Action/release integrity is absent.** There is no committed Action bundle,
   bundle reproducibility check, package provenance policy, or upgrade/rollback
   clean-room test.

## Implemented in this review

- Added `support-bundle` CLI for offline, redacted diagnostic bundles.
- Excluded PR bodies, comments, tokens, workflow logs, artifacts and email
  addresses from the support-bundle contract.
- Added direct support-bundle tests for snapshot reports and receipts.
- Added fixture response-byte budget validation and under-reported fixture
  rejection at both the CLI and recorded-transport boundaries.
- Closed the latest local/mock security findings: workflow App identity
  spoofing, malformed branch-protection normalization, immutable linked-issue
  identity and duplicate detection, credential-shaped redaction, and full
  request-oracle drift.
- Added `check:fixture-budgets` to the authoritative `verify` command.
- Updated the G3 report with the new budget gate and project-wide residuals.

## Local verification after this build

- `npm run typecheck`: pass.
- `npm run test:cli`: pass — 5 CLI process tests.
- `npx vitest run test/support-bundle.test.ts`: pass — 2 tests.
- `npm run check:fixture-budgets`: pass — 3 API fixtures.
- Full verification after this build: 73 non-CLI tests across 9 files, 19
  GitHub integration tests, 14 security tests, 5 CLI process tests; build,
  lint and audit pass with 0 high-severity vulnerabilities.

## Recommended next sequence

1. Maintainer decides owner/repository slug, OSI license and publication
   authority; record the decision without auto-publishing.
2. Run the three G2 task sessions and record raw time, comprehension,
   remediation clarity and findings.
3. Execute the authorized G3 live read-only smoke, with no writes and no
   retained private payloads.
4. Re-audit G0/G2/G3, then build G4 as a metadata-only shadow Action with a
   committed pinned bundle, no privileged PR checkout, idempotent check output,
   and explicit merge-group behavior or an explicit unsupported result.
5. Only after shadow evidence and maintainer consent, consider required-check
   enforcement and release gates.

---

## Status update — 2026-08-14

Several items flagged as absent in the original review have since been added to
the workspace:

| Item | Original status | Current status |
| --- | --- | --- |
| OSI license | absent | Apache-2.0 (`LICENSE`, `NOTICE`) |
| Community health files | absent | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md` |
| `action.yml` | absent | present with shadow mode support (`fail-on: never`) |
| `src/action/` | absent | `src/action/index.ts` (269 lines) with check-run posting |
| CI workflow | absent | `.github/workflows/ci.yml` with matrix tests |
| Security audit workflow | absent | `.github/workflows/security-audit.yml` |

These additions move G0 and G4 from "not started" to "partially addressed."
The following remain open: public Git remote, G3 live smoke, G2 task sessions,
G4 shadow deployment, and external pilot evidence. No release or live
integration claim is made.
