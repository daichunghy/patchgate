# Codex for Open Source form draft

**Status:** ready for applicant completion; not submitted and not an approval claim
**Last reviewed:** 2026-08-23
**Official form:** https://openai.com/form/codex-for-oss/

This is a copy-ready draft for the current OpenAI form. The form asks for the
applicant's ChatGPT email, public GitHub identity, maintainer role, public
repository URL, OpenAI Organization ID, a qualification statement and a
description of API-credit use. The qualification and credit-use fields have a
500-character limit; `npm run check:application-dossier` verifies them.

## Applicant fields to complete manually

```text
Applicant name: [FILL BEFORE SUBMISSION]
ChatGPT account email: [FILL BEFORE SUBMISSION]
Public GitHub username: daichunghy
Public repository URL: https://github.com/daichunghy/patchgate
Role: [CONFIRM PRIMARY OR CORE MAINTAINER]
Interest: [CONFIRM CODEX SECURITY, API CREDITS, OR BOTH]
OpenAI Organization ID: [FILL BEFORE SUBMISSION]
```

## Copy-ready form answers

### Why does this repository qualify? (maximum 500 characters)

```text
PatchGate is an Apache-2.0 review-readiness gate: trusted policy, commit-bound checks, ownership and human boundaries before a PR consumes review time. Public beta Action, security model, documented shadow path. 1 GitHub star, 0 forks, no npm package (name taken), no external pilots (2026-08-23). Applying on ecosystem importance, not adoption.
```

### How will you use API credits for your project? (maximum 500 characters)

```text
API credits would support bounded issue triage, deterministic regression-fixture drafting, pull-request review preparation, authorized security-finding triage, and release/rollback checklists. Outputs would be tied to public issues, tests, PRs or release artifacts. The evaluator would remain deterministic; maintainers would approve code, security disclosure, pilots and releases; prompts would exclude secrets and private repository data.
```

### Anything else we should know? (maximum 500 characters)

```text
PatchGate addresses review burden when contributions move faster than maintainer attention. It does not detect AI authorship or replace human approval. Checkable evidence: public Apache-2.0 repo, v0.1.0-beta.5 shadow tag, CI on main, SECURITY.md. Discussions and issues are self-authored maintenance, not community adoption. No external pilots.
```

## Evidence snapshot for the application

| Signal | Verified state on 2026-08-22 | Evidence boundary |
| --- | --- | --- |
| Repository visibility | `daichunghy/patchgate` is public, Apache-2.0, default branch `main` | Public foundation, not adoption |
| Default branch | Current `main@34d998b`; hardening PR #9, follow-ups and current beta5 release merged by the maintainer (administrator decisions, recorded as such) | Merged workflow; those merges lack independent approving review |
| Release | Current tag [`v0.1.0-beta.5`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5) at `34d998b`; earlier beta tags are superseded | Beta for shadow evaluation; not production-declared, not externally piloted |
| Dependency hygiene | Dependabot PRs #11/#13/#14 merged after local re-verification; #12 (TypeScript 7) deferred with documented `@vercel/ncc` blocker | Active maintenance, not a quality guarantee |
| Community activity | Discussions #1, #2, #3, #8 and [#10](https://github.com/daichunghy/patchgate/discussions/10); community scheduler active on `main` | Self-authored maintenance activity; no external replies yet |
| Usage signals | No verified downloads, downstream users or pilots; check live star/fork counts at submission time | Do not claim broad adoption |
| Pilot/release | Shadow-installation no-go decision recorded in the release record; no completed external pilot | Required evidence for any `v0.1` claim remains open |

## Five-day completion checklist

- [ ] Fill applicant name, ChatGPT email and OpenAI Organization ID.
- [ ] Confirm primary/core maintainer role and public GitHub profile visibility.
- [ ] Record any real external reply, pilot consent or contribution; do not
      substitute self-authored activity.
- [ ] Re-run the live metrics check immediately before submitting.
- [ ] Submit manually through the official form and retain the confirmation.

Selection is not guaranteed. The project should be described as a public,
security-conscious pre-release project with a concrete ecosystem problem, not as
widely used software.
