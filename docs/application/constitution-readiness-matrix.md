# Constitution and release-readiness matrix

**Status:** current operational snapshot; preparation evidence only  
**Reviewed:** 2026-08-22

This matrix maps the constitution and roadmap gates to the strongest evidence
currently available. It is intentionally conservative: a local test or public
PR does not become a release, pilot or adoption claim.

## Gate matrix

| Gate | Status | Evidence currently available | Evidence still required |
| --- | --- | --- | --- |
| G0 public foundation | Partial | Public repository, Apache-2.0 license, community health files, Discussions, protected `main`, PR #9 and public PR checks | Independent approval, merge to `main`, default-branch verification and public support operation |
| G1 deterministic contract | Verified within local/fixture boundary | Strict TypeScript, schemas, deterministic evaluator, receipt digests, fixture and security tests; `npm run verify` | Independent review and real downstream use |
| G2 onboarding | Partial | `preflight`, `validate`, `init`, `doctor`, Git-ref mode, text/JSON parity and CLI process smoke | Three consented sessions with raw task timing, comprehension and assistance records |
| G3 authenticated snapshot | Partial | Bounded GET-only live smoke on PR #9, schema-valid input/receipt, base/head binding, branch-protection and supported Rulesets subset | Post-merge default-branch smoke, complete merge-group contract and external consumer evidence |
| G4 shadow Action | Partial | Root `action.yml`, committed bundle, pinned workflows, explicit permissions, clean-room consumer fixture, shadow and rollback runbooks | Two consenting external shadow installations, fork E2E and live merge-group E2E |
| G5 enforcement | Open | Adversarial tests and fail-closed native-control behavior exist | Shadow evidence review, explicit maintainer consent, performance/abuse evidence and enforcement decision |
| G6 public beta | Open | Release-candidate checker, compatibility wording and beta rollback runbook | Immutable beta tag/release, clean consumer install, upgrade/downgrade/rollback proof |
| G7 diverse pilots | Open | Pilot brief, consent-safe feedback template and installation runbook | Two different public repositories with consented shadow/enforcement evidence and feedback-driven fixes |
| G8 `v0.1` and application | Open | Evidence dossier, form draft, maintainer workflow and this matrix | All constitutional gates, `v0.1.0`, pilot links, applicant fields and manual submission |

The consent-safe outreach drafts are in
[`docs/community/independent-review-and-pilot-outreach.md`](../community/independent-review-and-pilot-outreach.md).

## First public-release Definition of Done

| Constitutional requirement | Current result |
| --- | --- |
| CLI preflight exposes guidance, trusted policy and ambiguity | Local/fixture verified |
| Action enforces all six rule classes deterministically | Local/fixture candidate verified; default-branch release not merged |
| Receipts are machine-readable, reproducible and SHA-bound | Local/fixture and current PR live smoke verified |
| A PR policy change cannot relax its own rules | Negative fixture/test coverage present |
| Sensitive paths require the configured human owner | Contract and tests present; no external enforcement pilot |
| Privileged lane never executes untrusted PR code | Workflow structure, static checks and clean-room evidence present |
| Spoofed/stale/incorrect evidence is rejected | Security and integration tests pass |
| Safe workflow and minimal permissions are documented | README, permissions contract and shadow runbook present |
| Two external public repositories supplied feedback | Not complete; no external pilot recorded |
| Supported/unsupported behavior is explicit | Documented for GitHub.com, merge groups and native-control limits |

## Five-day submission path

1. Obtain one independent review and merge PR #9.
2. Verify the resulting `main` CI, CodeQL, Security Audit and Discussion
   scheduler state.
3. Run only consented G2/shadow sessions and record raw evidence; do not count
   self-authored Discussions as adoption.
4. Decide whether beta publication is authorized and execute the rollback test
   before creating a release.
5. Fill the applicant identity fields, refresh live links, and submit the
   official form manually. Selection is not guaranteed by this preparation.

The authoritative product definition remains
[`docs/PROJECT_CONSTITUTION.md`](../PROJECT_CONSTITUTION.md).
