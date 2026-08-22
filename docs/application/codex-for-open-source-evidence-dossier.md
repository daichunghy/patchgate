# Codex for Open Source evidence dossier

**Status:** preparation only; not submitted and not an approval claim  
**Date:** 2026-08-22
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
| Public active open-source project | Public repository `https://github.com/daichunghy/patchgate`, Apache-2.0 `LICENSE`, community files, CI definitions, public Project #1, open PR #9 and a [successful public `main` CI run](https://github.com/daichunghy/patchgate/actions/runs/32333914059); `package.json` remains private | public foundation, pre-release | merged maintainer workflow, support/security operation and public release |
| Meaningful usage or ecosystem importance | Product rationale, threat model, five self-authored Discussions including [#10](https://github.com/daichunghy/patchgate/discussions/10), a requirements question and context-specific questions on four related OSS repositories; live metrics are 0 stars, 0 forks, 0 tags/releases and no verified downstream users | ecosystem relevance hypothesis, not usage evidence | public release, real users/pilots, independent maintainer responses and concrete ecosystem references |
| Active maintenance | Public Git history, current implementation, security review, deterministic verification, protected `main`, four scoped contribution issues with start paths, public Project #1, open PR #9 and passing required PR checks are recorded | public pre-release maintainer activity | merged external contributions, release history, live maintainer workflow and external pilots |
| Maintainer role | Repository is public under `daichunghy/patchgate`; the application still requires the maintainer to state the role explicitly | partially verified | final applicant identity/role confirmation |
| Security and quality | Local verification passes; no high-severity npm audit findings; security boundary and fail-closed tests exist; protected `main` and public CI run `32333914059` are observable | local/fixture plus public CI | publish pending hardening, then obtain public Security Audit/CodeQL runs, authorized live integration and external review |
| Codex use case | Clear fit for PR review-readiness, triage, security review and release maintenance | documented | explain concrete day-to-day workflow after publication |

## Effect of the 2026-08-20–2026-08-22 community update

The update is useful as supporting evidence of active maintenance. It shows that
the maintainer is organizing contribution paths, asking technically specific
questions, and building a public workflow around issues, Discussions and a
Project board. Discussion #10 is now public, and the hardening PR/evidence
packet make the work inspectable.

It does not prove meaningful usage, broad adoption, external maintainer support
or a completed pilot. The four outbound comments are outreach attempts, not
responses or endorsements. Self-authored Discussions, a Project board and a
scheduled-post workflow must not be counted as independent community activity.
The current public repository has 0 stars, 0 forks, no tags/releases and no
verified downloads or downstream users.

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
- Consumer boundary smoke: `scripts/test-consumer-fixture.mjs` verifies a
  full-SHA consumer reference, bundle startup without source schemas or
  `node_modules`, and explicit non-blocking `merge_group` handling. It is not a
  live external consumer or pilot.
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

## Application form pack

The copy-ready fields, character counts, live metrics and five-day submission
checklist now live in [the form draft](codex-for-open-source-form-draft.md).
Run `npm run check:application-dossier` before copying the answers into the
official form. Applicant identity, maintainer role, ChatGPT email and OpenAI
Organization ID remain intentionally blank until the applicant supplies them.

## Submission checklist

- [x] Local foundation: Git history, `LICENSE` (Apache-2.0), community files and CI definitions.
- [x] Action candidate (local): root `action.yml`, `src/action/index.ts`, bundled `dist/action/index.js`, and `test/action.test.ts`.
- [x] G3 Live Smoke Harness: `scripts/live-smoke-harness.ts`, guarded against implicit targets.
- [x] Verified determinism and security: local test and bundle verification pass.
- [x] Authorized G3 live read-only smoke; complete snapshot/receipt built, with non-ready requirements retained as evidence.
- [ ] Three G2 usability sessions with consenting participants.
- [ ] Two G4 shadow installations.
- [x] Confirm the repository is public and the maintainer-controlled remote is reachable.
- [ ] Merge the public hardening PR and verify the resulting default-branch workflows.
- [ ] Fill and validate the [copy-ready form draft](codex-for-open-source-form-draft.md).
- [ ] Confirm public support/security routes and maintainer role for the application.
- [ ] Submit application form at `https://openai.com/form/codex-for-oss/`.
