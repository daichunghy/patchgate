# Codex for Open Source form draft

**Status:** ready for applicant completion; not submitted and not an approval claim
**Last reviewed:** 2026-08-22
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
PatchGate is an Apache-2.0 open-source developer-infrastructure project addressing a concrete maintainer problem: verifying trusted policy, commit-bound checks, ownership and human review boundaries before a pull request consumes review time. The public repository is pre-release with a deterministic CLI/Action candidate, security model, active issue triage and a documented pilot path. Usage is not yet broad, so this application makes an ecosystem-importance case without claiming adoption.
```

### How will you use API credits for your project? (maximum 500 characters)

```text
API credits would support bounded issue triage, deterministic regression-fixture drafting, pull-request review preparation, authorized security-finding triage, and release/rollback checklists. Outputs would be tied to public issues, tests, PRs or release artifacts. The evaluator would remain deterministic; maintainers would approve code, security disclosure, pilots and releases; prompts would exclude secrets and private repository data.
```

### Anything else we should know? (maximum 500 characters)

```text
PatchGate is designed for the review burden created when contributions and coding agents move faster than maintainer attention. It does not detect AI authorship or replace human approval. Current evidence is honest: public repository, merged hardening history, a tagged v0.1.0-beta.1 pre-release with reproducible verification, five self-authored Discussions and a scheduled community workflow; there are no external pilots or adoption yet.
```

## Evidence snapshot for the application

| Signal | Verified state on 2026-08-22 | Evidence boundary |
| --- | --- | --- |
| Repository visibility | `daichunghy/patchgate` is public, Apache-2.0, default branch `main` | Public foundation, not adoption |
| Default branch | `main@301c700`; hardening PR #9 and follow-up PRs #15–#18 merged by the maintainer (administrator decision, recorded as such) | Merged workflow; the PR #9 merge lacked an independent approving review |
| Release | [`v0.1.0-beta.1`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.1) pre-release at `301c700` with fresh-checkout verification record | Beta for shadow evaluation; not production-declared, not externally piloted |
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
