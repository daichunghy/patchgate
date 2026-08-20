# Implementation roadmap

**Roadmap version:** 2.0  
**Status:** G1 local contract, G2 local onboarding, G3 local/mock adapter and
the G4 Action candidate are verified within their documented boundaries; G0
public foundation is present, but live integration, user sessions, shadow
installations, pilots and release readiness remain open
**Evidence baseline:** 2026-08-20
**Product requirements:** [User requirements](product/user-requirements.md)  
**Detailed execution:** [Agent execution plan](agent-execution-plan.md)  
**Machine backlog:** [Agent work packages](agent-work-packages.yml)

`PROJECT_CONSTITUTION.md` remains release authority. This roadmap adds user
value and operational evidence without weakening trust boundaries.

## Bottom line

PatchGate should not broaden into a generic policy engine or merge bot. It
should become the clearest and safest way to answer whether a contribution has
supplied the trusted policy, commit-bound evidence, ownership and human
boundaries required before scarce human review begins.

Version 2 moves task testing and shadow pilots earlier, adds
configuration/diagnostic UX, and separates technical maturity from publication
authority.

## Verified state

| Surface | Highest proven level | Evidence | Open dependency |
| --- | --- | --- | --- |
| Contract/evaluator | static and fixture verified | 94 non-CLI tests across 10 files, deterministic fixtures, security coverage and receipt validation | external review and adoption |
| Local preflight/onboarding | native user-flow verified | local-file/Git-ref preflight, validate, safe init, doctor, discovery and five CLI process tests | three task sessions and UR acceptance evidence |
| GitHub adapter | complete live snapshot on the local candidate; result remains non-ready on real missing evidence | bounded adapter, base-policy path fallback, direct GraphQL Issue-node normalization, branch-protection and Rulesets subset contract, recorded fixtures, source/SHA binding, TOCTOU re-read and [G3 live smoke record](reviews/2026-08-20-g3-live-smoke.md) | public merged implementation, unsupported Ruleset semantics, merge-group contract and external consumer |
| GitHub Action | static and clean-room verified local candidate | `action.yml`, committed ncc bundle, pinned workflows, idempotent check delivery, `verify:dist` and `test:consumer-fixture` | live consumer E2E, fork/merge-group E2E and two shadow installations |
| User value | hypothesis | research and constitution | task sessions and pilots |
| Public OSS/release | public foundation present; release not authorized | public `daichunghy/patchgate` repository, Apache-2.0, community files and successful public `main` CI run; package remains private and no release exists | release decision, public support/security operation, compatibility and external usage |

## User-value principles

1. **First value before enforcement:** local preflight and shadow mode precede
   required-check rollout.
2. **One decision, several views:** text, JSON, receipt and Action check derive
   from one decision object.
3. **Unknown is not failure and never success:** explain permission/completeness
   gaps per dependent rule.
4. **Complement native controls:** preserve Rulesets, branch protection,
   CODEOWNERS and merge queues as authority.
5. **Low noise:** one idempotently updated check; comments opt-in.
6. **No surprise governance:** draft initialization cannot enable enforcement;
   ruleset changes remain maintainer actions.
7. **Measure before claiming:** report setup, clarity and pilots with context.

## G2 implementation checkpoint

The first local onboarding vertical slice is implemented and verified:

- `patchgate preflight --base <path>` now has human-readable and `--json` views;
- `patchgate validate --policy <path>` validates without changing enforcement;
- `patchgate init --path <directory>` creates a versioned draft and refuses
  overwrite;
- `patchgate doctor --base <path>` reports policy, Git, package and local-only
  network capability states;
- Git-ref mode reads the policy and fixed discovery paths from Git objects and
  distinguishes `git_ref` from `local_file` in JSON;
- discovery findings carry stable diagnostics and remediation while remaining
  advisory-only;
- committed fixture repositories cover missing policy, base-versus-working-tree
  policy, conflicting prose and unsupported guidance;
- CLI smoke coverage now includes five process tests.

This is `native_user_flow_verified` for local CLI behavior only. G2 is not
complete until three task sessions and the remaining UR acceptance evidence
exist.

## Delivery gates

G0 and G1 progress independently. Public beta/pilots require both.

| Gate | User outcome | Dependencies | Exit evidence |
| --- | --- | --- | --- |
| G0 — public OSS foundation | User can inspect, build and contribute to a legally reusable project | maintainer decisions | Git/public remote, OSI license, community profile, PR CI, secret scan, feedback route |
| G1 — deterministic contract | Inputs cannot silently become facts and receipts replay | none | schemas, validation, stable digests/status, adversarial fixtures |
| G2 — preflight and onboarding | User gets actionable result before opening PR | G1 | Git-ref/local modes, init/validate/doctor, text+JSON parity, three task sessions |
| G3 — authenticated GitHub snapshot | Trusted metadata becomes complete bounded snapshot | G1 | mocked integration, API/permission diagnostics, live read-only smoke, TOCTOU re-read |
| G4 — shadow Action | Repository observes decisions without changing merge eligibility | G0, G2, G3 | minimal Action, idempotent check, fork/PR/merge-group E2E, two shadow installs |
| G5 — hardened enforcement | Maintainer deliberately enables required check after shadow | G4 | TG matrix, performance/abuse budgets, source protection, zero P0/P1, consent |
| G6 — public beta | New repo installs, upgrades and rolls back a supported beta | G5 | immutable beta, clean-room install, compatibility matrix, support/provenance |
| G7 — diverse pilots | Two public repos prove/disprove usefulness | G6 | two enforcement pilots, task/decision metrics, feedback fixes, no known false green |
| G8 — `v0.1` and dossier | Constitution satisfied and evidence auditable | G7 | `v0.1.0`, pilots, evidence index, maintainer submission |

## Critical path and parallel discovery

```text
G1 deterministic core (local evidence exists)
  -> G2 preflight/onboarding ------\
                                    -> G4 shadow -> G5 enforcement -> G6 beta
  -> G3 authenticated snapshot ----/

G0 public foundation -----------------------------------------------/
Partner path: G0 recruit -> G2 tasks -> G4 shadow -> G7 enforcement -> G8
```

No downstream gate is complete from documents or static YAML alone.

## G3 implementation checkpoint — 2026-08-13

The local/mock authenticated snapshot slice is implemented and verified. It
uses the fixed GitHub API version `2026-03-10`, exact base-revision policy
retrieval, immutable repository/PR/fork identity, native linked-issue
metadata, complete changed paths with bounds, check/workflow source binding,
chronological reviews, permission/team qualification, a documented CODEOWNERS
subset, native-control normalization, stable diagnostics, redaction, request
budgets, and a finalization re-read.

The CLI supports deterministic fixture replay through `github snapshot
--mock-fixture`. The adapter deliberately rejects merge-group requests and
active decision-bearing rulesets that the current scalar evaluator cannot
represent. Branch-protection and the supported Rulesets required-check/review
subset are now represented in the versioned native-control contract;
unsupported last-pusher, review-thread and other rule semantics remain
evidence-missing. An authorized
GET-only smoke built a complete schema-valid snapshot and receipt for public
PR #9; the result remained non-ready because the real PR lacks its required
approval/ownership/linkage evidence. See the [live smoke record](reviews/2026-08-20-g3-live-smoke.md).

## Current checkpoint — 2026-08-20

The repository now has a public GitHub remote at
`https://github.com/daichunghy/patchgate`, Apache-2.0 licensing, Community
Profile 100%, descriptive topics, Discussions, protected `main`, CI workflows
and a successful public `main` CI run. Dependabot security updates and private
vulnerability reporting are enabled on GitHub. CodeQL and root Action metadata
are prepared in the local working tree but are absent from `origin/main@a3745f6`.
No public CodeQL or Security Audit run has been recorded yet. This closes the
earlier local-only description of the G0 foundation, but it does not authorize
a release or claim external adoption. A public community Project #1, fourth
Discussion, three contribution-issue start paths and draft PR #9 now provide
additional maintenance evidence, but they remain self-authored or pre-release
signals until an external maintainer replies, contributes or runs a consented
pilot.

The Action work has also reached a local Marketplace-shaped candidate state.
The root metadata, source runner, committed ncc bundle, immutable workflow
pins, clean-room startup check, single-check update/create behavior, safe
multiline outputs, consumer bundle smoke and explicit `merge_group` non-ready
handling are present and covered by local verification. Required CI and CodeQL
also declare `merge_group/checks_requested` triggers, preventing a future
merge queue from waiting on workflows that never start. The consumer smoke
does not use a live repository or publish a check-run.
G4 remains open because no external consumer repository, fork E2E,
merge-group E2E or consenting shadow installation has been verified.

The current gate position is:

- G1: locally verified.
- G2: local onboarding slice verified; three consented task sessions remain.
- G3: branch-protection subset and authorized live snapshot verified on the local candidate; public merge and external consumer proof remain open.
- G4: local Action candidate verified; consumer and shadow evidence remain.
- G5 through G8: not started as release gates because their upstream evidence is incomplete.

The authoritative local command is `npm run verify`. The latest project review
and the live/public-state caveats are recorded in
[the G4/G0 continuation audit](reviews/2026-08-20-g4-g0-audit.md).

## Project-wide review checkpoint — 2026-08-13

The next local build added a redacted `support-bundle` CLI, API fixture byte
budget validation, and local/mock security hardening for source identity,
malformed native responses, immutable issue identity and credential redaction.
A full review confirms that G0 publication authority, G2 usability sessions,
G3 live smoke, and G4 Action/shadow delivery remain open.
See [the project-wide review](reviews/2026-08-13-project-wide-review.md). No
public-release, live-integration, pilot, or Action claim is made from local
tests.

## Required for `v0.1`

- GitHub.com public repositories;
- CLI preflight from trusted Git ref and explicit local file;
- policy validation and safe draft initialization;
- human/JSON output with stable diagnostics;
- authenticated PR/merge-group snapshot;
- six constitutional rule classes;
- metadata-only Action with shadow/required modes;
- authority/evidence/remediation receipt;
- CODEOWNERS with documented conformance limits;
- fork, stale review, expected source, pagination, rate limit and TOCTOU tests;
- redacted support bundle, upgrade and rollback;
- two diverse public pilots.

## Explicitly deferred

- hosted dashboard/database/SaaS;
- generic rule/action language;
- merge automation/queue replacement;
- LLM rule inference or code-quality judgment;
- GitLab/Bitbucket and GitHub Enterprise Server;
- organization-wide policy fleet;
- cryptographic signing/compliance attestation;
- broad governance corpus;
- GitHub App service mode unless pilot evidence requires it.

## User evidence schedule

| Stage | Evidence activity | Minimum output |
| --- | --- | --- |
| G0 | Recruit candidate maintainers and open feedback/security routes | protocol and consent-safe contact log |
| G2 | At least three users complete preflight/config tasks ([protocol](pilots/g2-usability-session-protocol.md)) | task success/time/comprehension and issue mapping |
| G3 | Read-only smoke on maintainer-controlled repository shapes | permission/capability and API budget |
| G4 | Two non-blocking shadow installs | status distribution, unknown causes, noise and clarity |
| G5 | Explicit enforcement decision | maintainer sign-off or documented no-go |
| G7 | Two diverse enforcement pilots | protocol and public/consented evidence |

Small samples use raw counts and context, not universal percentages.

## Product measures

| Measure | Definition |
| --- | --- |
| Known false green | Ready contradicted by trusted authority/SHA/source; target zero |
| False block | Maintainer confirms enforceable failure should not apply |
| Unknown cause | Missing/ambiguous results grouped by permission, completeness, authority, identity or unsupported behavior |
| First-value time | Clean checkout to actionable preflight |
| Task completion | User completes preflight/config/doctor without rescue |
| Remediation clarity | User correctly states next action and evidence supplier |
| Delivery noise | Duplicate comments/checks per semantic evaluation |
| API cost | Requests, pages, retries and rate-limit state |
| Review decision | Review, remediation, handoff, deliberate bypass or no-go |
| Replay integrity | Compatible receipt reproduces status/digest |

## Go/no-go

Go from shadow to required only when no known false green exists; unknowns are
actionable; delivery is idempotent; maintainer reviewed shadow distribution;
source/SHA/fork/merge-group paths are verified; no P0/P1 remains; and the
maintainer explicitly authorizes the ruleset.

Stop, narrow or redesign when users need raw JSON; they value only clearer
native controls; receipt does not change review/remediation; setup burden
exceeds benefit; native semantics require unsafe approximation; a feature
requires privileged PR-code execution; or adoption claims require fabrication.

## Immediate sequence

1. Run three consented G2 task sessions and record raw task time,
   comprehension, remediation clarity and UR mapping.
2. Re-run the authorized G3 live read-only smoke after the native-control PR is
   merged; retain only the agreed redacted evidence and actual non-ready causes.
3. Reconcile the G0 publication surface: package privacy, security reporting,
   support links, maintainer ownership and release/rollback policy.
4. Run two non-blocking G4 shadow installations in consenting consumer
   repositories, including fork and merge-queue cases where supported.
5. Review shadow distribution, unknown causes, false blocks and noise before
   any required-check configuration.
6. Only after explicit maintainer consent, begin G5 enforcement hardening and
   the public beta evidence work.

## Program boundary

OpenAI currently allows eligible OSS maintainers to apply for six months of
ChatGPT Pro with Codex, conditional Codex Security access and API credits. It
does not promise acceptance. PatchGate optimizes for verified OSS usefulness,
not manufactured activity.

Source: [Codex for Open Source](https://developers.openai.com/community/codex-for-oss).

## Research basis

See [User-needs and roadmap review](research/2026-08-13-patchgate-user-needs-roadmap-review.md).
