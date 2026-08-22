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
PatchGate is designed for the review burden created when contributions and coding agents move faster than maintainer attention. It does not detect AI authorship or replace human approval. Current evidence is honest: public pre-release repository, PR #9 with passing required checks, five self-authored Discussions and a scheduled community workflow; there are no stars, releases, downstream users or pilots yet.
```

## Evidence snapshot for the application

| Signal | Verified state on 2026-08-22 | Evidence boundary |
| --- | --- | --- |
| Repository visibility | `daichunghy/patchgate` is public, Apache-2.0, default branch `main` | Public foundation, not release or adoption |
| Default branch | `main@a3745f6` | The hardening PR is not yet part of default-branch code |
| Maintainer hardening | PR [#9](https://github.com/daichunghy/patchgate/pull/9) is open and mergeable; the latest required CI and CodeQL checks pass | Public reviewable work, not a merged workflow |
| Community activity | Discussions #1, #2, #3, #8 and [#10](https://github.com/daichunghy/patchgate/discussions/10) | Self-authored maintenance activity; no external replies yet |
| Usage signals | 0 stars, 0 forks, 0 tags/releases, no verified downloads or downstream users | Do not claim broad adoption |
| Pilot/release | No completed external pilot and no public release | Required evidence remains open |

## Five-day completion checklist

- [ ] Fill applicant name, ChatGPT email and OpenAI Organization ID.
- [ ] Confirm primary/core maintainer role and public GitHub profile visibility.
- [ ] Ask an independent maintainer to review PR #9; do not self-approve.
- [ ] Merge PR #9 if the required review is granted and checks remain green.
- [ ] Verify the first post-run of the community scheduler on `main`.
- [ ] Record any real external reply, pilot consent or contribution; do not
      substitute self-authored activity.
- [ ] Re-run the live metrics check immediately before submitting.
- [ ] Submit manually through the official form and retain the confirmation.

Selection is not guaranteed. The project should be described as a public,
security-conscious pre-release project with a concrete ecosystem problem, not as
widely used software.
