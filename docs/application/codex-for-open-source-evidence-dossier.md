# Codex for Open Source evidence dossier

**Status:** preparation only; not submitted and not an approval claim  
**Date:** 2026-08-20
**Project:** PatchGate

## Purpose

This dossier organizes evidence for a future Codex for Open Source application.
It does not assert eligibility or imply that ChatGPT Pro will be granted. The
official OpenAI program states that active open-source maintainers may apply,
that selection is rolling, and that selected maintainers may receive six
months of ChatGPT Pro with Codex, conditional Codex Security access and API
credits. See the [official application](https://openai.com/form/codex-for-oss/)
and the program terms linked from that application.

## Current evidence ledger

| Program signal | Evidence currently available | Strength | Missing before submission |
| --- | --- | --- | --- |
| Public active open-source project | Public repository `https://github.com/daichunghy/patchgate`, Apache-2.0 `LICENSE`, community files, CI definitions, public Project #1, draft PR #9 and a [successful public `main` CI run](https://github.com/daichunghy/patchgate/actions/runs/32333914059); `package.json` remains private | public foundation, pre-release | merged maintainer workflow, support/security operation and public release |
| Meaningful usage or ecosystem importance | Product rationale, threat model, four public Discussions, a poll-style requirements question and context-specific questions on four related OSS repositories; no public usage, stars, downloads, replies or downstream users are claimed | ecosystem relevance hypothesis, not usage evidence | public release, real users/pilots, independent maintainer responses and concrete ecosystem references |
| Active maintenance | Public Git history, current implementation, security review, deterministic verification, protected `main`, four scoped contribution issues with start paths, public Project #1, draft PR #9 and a successful default-branch CI run are recorded | public pre-release maintainer activity | merged external contributions, release history, live maintainer workflow and external pilots |
| Maintainer role | Repository is public under `daichunghy/patchgate`; the application still requires the maintainer to state the role explicitly | partially verified | final applicant identity/role confirmation |
| Security and quality | Local verification passes; no high-severity npm audit findings; security boundary and fail-closed tests exist; protected `main` and public CI run `32333914059` are observable | local/fixture plus public CI | publish pending hardening, then obtain public Security Audit/CodeQL runs, authorized live integration and external review |
| Codex use case | Clear fit for PR review-readiness, triage, security review and release maintenance | documented | explain concrete day-to-day workflow after publication |

## Effect of the 2026-08-20 community update

The update is useful as supporting evidence of active maintenance. It shows that
the maintainer is organizing contribution paths, asking technically specific
questions, and building a public workflow around issues, Discussions and a
Project board. The draft PR and evidence packet also make the work inspectable.

It does not prove meaningful usage, broad adoption, external maintainer support
or a completed pilot. The four outbound comments are outreach attempts, not
responses or endorsements. Self-authored Discussions, a Project board and a
scheduled-post workflow must not be counted as independent community activity.

The correct application claim is therefore: “PatchGate has a public,
security-conscious pre-release maintenance workflow and is seeking its first
consented external pilots.” It is not: “PatchGate is already widely used” or
“PatchGate is eligible for ChatGPT Pro.”

## Technical evidence

- Deterministic evaluator and receipt contract: `src/evaluator-core.ts`,
  `src/contract/validation.ts`, `schemas/`.
- Authenticated GitHub adapter local/mock vertical slice: `src/github/`,
  `fixtures/api/`, `test/integration/`.
- Security hardening: workflow App identity binding, exact target SHA,
  TOCTOU re-read, bounded pagination/retries/responses, immutable linked-issue
  identity, redaction and fail-closed native controls.
- Supportability: `support-bundle` command and privacy exclusions in
  `docs/support-bundle.md`.
- Latest local/public verification is recorded in
  `docs/reviews/2026-08-20-g4-g0-audit.md`.

## Why the project matters

PatchGate addresses a narrow maintenance problem: a pull request can be
syntactically valid while lacking trusted policy, commit-bound checks, required
ownership or an explicit human gate. The project is designed as deterministic
developer infrastructure rather than an authorship or correctness oracle. Its
strongest current evidence is security-conscious engineering and a public
pre-release repository. Ecosystem importance and adoption remain unproven until
release and pilots.

## Intended Codex workflow after release

1. Use Codex for bounded implementation and regression-test work.
2. Use Codex to triage issues and turn confirmed findings into fixtures or
   documentation changes.
3. Use Codex for review-readiness checks, release checklists and rollback
   verification while keeping maintainer approval authoritative.
4. Use security-focused review only with public, non-sensitive artifacts and
   coordinated disclosure practices.

## Application draft fields

These fields are a draft only. They are not ready for submission until the
public repository, maintainer role and usage evidence are independently
verifiable.

```text
Applicant name: [Your Name]
ChatGPT account email: [Your ChatGPT Account Email]
Public GitHub username: daichunghy
Public repository URL: https://github.com/daichunghy/patchgate
Role: primary maintainer / core maintainer
Interest: both (Codex Security & API credits)
OpenAI Organization ID: [Your Org ID]

Why the repository qualifies (<=500 characters, draft only):
PatchGate is an Apache-2.0 open-source developer-infrastructure project for a concrete maintainer problem: verifying policy, commit-bound evidence, ownership and human review boundaries before a pull request consumes review time. It has a public repository, deterministic evaluator, security model, CLI/Action candidate and contribution/pilot workflow. It is pre-release, so we make no adoption claim; the ecosystem need is trustworthy review readiness for agent-assisted contributions.

How credits will be used (<=500 characters, draft only):
API credits would support bounded issue triage, deterministic regression-fixture drafting, pull-request review preparation, security finding triage on authorized repositories, and release/rollback checklists. PatchGate would keep its evaluator deterministic, require maintainer approval for code and releases, exclude secrets and private repository data, and link each useful output to a public issue, test, PR or release artifact.

Additional context (<=500 characters, draft only):
Maintainers need to know whether a pull request is ready before spending time on
a full review. PatchGate moves policy discovery, evidence binding, and human
approval boundaries before that review. It does so without executing untrusted
pull-request code in a privileged workflow. The repository is still seeking its
first consenting external pilots, so this application describes a concrete
maintenance problem and pre-release evidence rather than claiming adoption.
```

## Submission checklist

- [x] Local foundation: Git history, `LICENSE` (Apache-2.0), community files and CI definitions.
- [x] Action candidate (local): root `action.yml`, `src/action/index.ts`, bundled `dist/action/index.js`, and `test/action.test.ts`.
- [x] G3 Live Smoke Harness: `scripts/live-smoke-harness.ts`, guarded against implicit targets.
- [x] Verified determinism and security: local test and bundle verification pass.
- [ ] Authorized G3 live read-only smoke.
- [ ] Three G2 usability sessions with consenting participants.
- [ ] Two G4 shadow installations.
- [x] Push default branch to a maintainer-confirmed public GitHub remote.
- [ ] Confirm public support/security routes and maintainer role for the application.
- [ ] Submit application form at `https://openai.com/form/codex-for-oss/`.
