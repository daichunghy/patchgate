# Implementation roadmap

**Roadmap version:** 2.0  
**Status:** deterministic local core verified; public foundation and real user
flows not yet proven  
**Evidence baseline:** 2026-08-13  
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
| Contract/evaluator | static and fixture verified | 49 non-CLI tests, 4 CLI process tests, 50 manifest entries | authenticated provenance |
| Local preflight/onboarding | local user-flow verified | local-file/Git-ref preflight, validate, safe init, doctor, discovery and fixture CLI smoke | task sessions and UR acceptance evidence |
| GitHub adapter | local/mock technically verified | bounded adapter, recorded API fixtures, capability/permission docs | authorized live read-only smoke |
| GitHub Action | documented | workflow design | bundle, permissions and E2E |
| User value | hypothesis | research and constitution | task sessions and pilots |
| Public OSS/release | not authorized | no Git, license or remote | maintainer decisions/live evidence |

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
- CLI smoke coverage now includes four process tests.

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
active decision-bearing native controls that the current scalar evaluator
cannot represent. No live API call was made; G3 remains open for an explicitly
authorized read-only smoke and current permission evidence.

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

1. Complete Prompt 3 G0 decision gate without inferring consent.
2. Record G1 as locally technically verified, not G0-dependent.
3. Build G2 thin slice: `preflight --base`, `validate`, safe draft `init`,
   `doctor`, Git-ref loading, discovery classification and text/JSON parity.
4. Commit fixture repositories and run three task sessions before freezing
   CLI/config wording.
5. Execute [Prompt 4](prompts/prompt-04-authenticated-github-adapter.md) to
   build G3 by endpoint with request/completeness budgets; keep overall G3 open
   until an authorized read-only live smoke exists.
6. Ship G4 shadow before any required-check setup.
7. Let shadow findings determine G5 enforcement scope.

## Program boundary

OpenAI currently allows eligible OSS maintainers to apply for six months of
ChatGPT Pro with Codex, conditional Codex Security access and API credits. It
does not promise acceptance. PatchGate optimizes for verified OSS usefulness,
not manufactured activity.

Source: [Codex for Open Source](https://developers.openai.com/community/codex-for-oss).

## Research basis

See [User-needs and roadmap review](research/2026-08-13-patchgate-user-needs-roadmap-review.md).
