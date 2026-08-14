# Roadmap 2.0 user-needs improvement report

**Date:** 2026-08-13  
**Scope:** product requirements, research, gate order, machine backlog and
Prompt 3 handoff  
**Highest proven level:** local static/fixture verification; no live GitHub or
external user-flow proof

## Outcome

The roadmap now preserves PatchGate's deterministic security boundary while
making onboarding, explanation, shadow rollout, performance and real user
evidence first-class acceptance work.

## Major corrections

1. Separated G1 local technical maturity from G0 publication authority.
2. Added four primary personas, six required journeys and normative UR IDs.
3. Moved task testing before Action interface freeze.
4. Added safe draft init, validate, doctor and human/JSON parity.
5. Made shadow mode and one idempotent low-noise check prerequisites to
   enforcement.
6. Added request/page/retry/rate-limit, performance and abuse budgets.
7. Added redacted diagnostics, compatibility, upgrade and rollback requirements.
8. Required two diverse shadow installations before consented enforcement
   pilots.
9. Added no-go criteria if users prefer native controls or the receipt does not
   change review/remediation decisions.
10. Marked external recruitment and publication as maintainer-authorized work.

## Current evidence

| Surface | Result |
| --- | --- |
| Strict YAML parse | pass |
| Work-package references/cycle check | 96 packages; no missing dependency or cycle |
| Markdown internal links | 18 files checked; pass |
| `npm run verify` | pass; 49 non-CLI tests plus 4 CLI process tests |
| `npm run build` | pass |
| Schema tests | 8 pass |
| Determinism tests | 6 pass |
| Fixture tests | 3 pass; 50 manifest entries covered |
| Security tests | 11 pass |
| `npm audit --audit-level=high` | 0 vulnerabilities |

## Files changed

- `docs/product/user-requirements.md`
- `docs/research/2026-08-13-patchgate-user-needs-roadmap-review.md`
- `docs/implementation-roadmap.md`
- `docs/agent-execution-plan.md`
- `docs/agent-work-packages.yml`
- `docs/prompts/prompt-03-public-foundation-and-maintainer-decisions.md`
- `docs/prompts/prompt-03-launcher.md`
- `docs/decisions/2026-08-13-g0-maintainer-decision-brief.md`
- `README.md`
- historical Prompt 2/report dependency wording

## Readiness

G1 is `locally_verified`. G0 remains publication-pending. User value remains a
hypothesis until G2 task sessions and G4 shadow installations supply native and
live evidence. No public repository, license, Action, pilot or program
application was created by this roadmap update.
