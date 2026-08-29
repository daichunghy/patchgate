# Repository portfolio audit — 2026-08-28

This is the operating register for the five GitHub repositories kept in the
Desktop workspace. They remain separate projects with separate contracts,
release decisions, and user evidence. The register does not turn them into a
suite and does not imply shared adoption. It supersedes the
[2026-08-24 register](2026-08-24-repository-portfolio-audit.md), which stays
on file as the record of that date's signals.

## Live snapshot

The GitHub and npm checks were run on 2026-08-28. A download is a registry
event, not a user count. A self-authored issue, release, discussion, star,
fork, or maintenance log is not external adoption.

| Local folder | Repository | Current public signal | Package signal | Verified usage |
| --- | --- | --- | --- | --- |
| `Github/` | [`daichunghy/patchgate`](https://github.com/daichunghy/patchgate) | 1 star, 0 forks, 8 open issues (count includes PRs), current Action pre-release `v0.1.0-beta.5`, public `main` at `c9d11cb` | PatchGate remains unpublished (`private: true`); the npm name `patchgate` belongs to another package | No external user, downstream repository, or pilot verified |
| `Github 2/contribkit/` | [`daichunghy/contribkit`](https://github.com/daichunghy/contribkit) | 0 stars, 0 forks, 20 open issues (count includes PRs), pre-release `v0.1.0-alpha.7` | npm `latest` resolves `0.1.0-alpha.3`, `alpha` resolves `0.1.0-alpha.6`; 578 downloads from 2026-08-20 to 2026-08-26 | No external user, downstream repository, or pilot verified |
| `Github 3/` | [`daichunghy/opensheet-ai`](https://github.com/daichunghy/opensheet-ai) | 0 stars, 0 forks, 8 open issues (count includes PRs), pre-release `v0.1.0-alpha.5` | npm `latest` and `alpha` resolve `0.1.0-alpha.4`; 128 downloads from 2026-08-20 to 2026-08-26 | No external user, downstream repository, or pilot verified |
| `Github 4/` | [`daichunghy/quant-research`](https://github.com/daichunghy/quant-research) | 0 stars, 0 forks, 9 open issues (count includes PRs), pre-release `v0.1.0-alpha.5` | npm `@agentbiz/quant-research`: `alpha` resolves `0.1.0-alpha.5`, `latest` resolves `0.1.0-alpha.4`; 254 downloads from 2026-08-20 to 2026-08-26 | No external user, downstream repository, or pilot verified |
| `Desktop/agentsmd/` | [`daichunghy/agentsmd`](https://github.com/daichunghy/agentsmd) | 1 star, 1 fork, 7 open issues (count includes PRs), pre-release `v0.1.0-alpha.2` (2026-08-22) | npm `@daichunghy/agentsmd` not published | One outside GitHub account (`VedantMadane`) forked the repository on 2026-08-23; no issue, pull request, or feedback followed. A fork is not verified usage |

The contributor lists are maintainer-led everywhere; Dependabot supplies most
open pull requests. No outside human contribution was observed in this
snapshot.

## What changed since 2026-08-24

- On 2026-08-25 the maintainer merged a documentation, test and hardening
  batch through the recorded admin-bypass pattern on every repository:
  PatchGate #46/#47/#51/#53/#54/#55 (bringing `main` to `c9d11cb`, with
  [CI 32806576723](https://github.com/daichunghy/patchgate/actions/runs/32806576723)
  and CodeQL
  [32806576725](https://github.com/daichunghy/patchgate/actions/runs/32806576725)
  completed successfully on that commit), contribkit #29/#31/#32,
  OpenSheet-AI #10/#12/#13/#15/#16, quant-research #13/#14/#15/#17/#18, and
  agentsmd #10. Every merge remains a maintainer decision rather than
  independent-review evidence.
- Open feature work as of this snapshot: PatchGate
  [PR #59](https://github.com/daichunghy/patchgate/pull/59) binds the Action
  snapshot and check-run delivery to the exact `pull_request.head.sha` with
  fail-closed live-target mismatch handling — every required context was
  green on 2026-08-28 and the pull request waited only on the one approving
  review branch protection requires. contribkit
  [PR #33](https://github.com/daichunghy/contribkit/pull/33) adds runtime
  adapters and package-first onboarding; its `verify` context was failing at
  audit time while clean-room reproducibility fixes were being pushed to the
  branch, and [PR #30](https://github.com/daichunghy/contribkit/pull/30)
  (Ruby RSpec and PHP PHPUnit adapters) is open. OpenSheet-AI
  [PR #17](https://github.com/daichunghy/opensheet-ai/pull/17) ships packaged
  examples and a five-minute preview (mergeable, checks green) and
  [#14](https://github.com/daichunghy/opensheet-ai/pull/14) documents the
  xlsx adapter error boundary. quant-research
  [PR #19](https://github.com/daichunghy/quant-research/pull/19) ships a
  reproducible service-quality workflow (mergeable, checks green) and
  [#16](https://github.com/daichunghy/quant-research/pull/16) adds a workflow
  readiness instrument family.
- Dependabot backlog awaiting triage: PatchGate #57/#58 (CodeQL 4.37.8) and
  the long-open #12 (`typescript` 7, still blocked by `@vercel/ncc`);
  contribkit #1/#2/#3/#8/#9/#11/#12; OpenSheet-AI #1–#5; quant-research
  #1–#5; agentsmd #1–#5.
- agentsmd has been quiet since the 2026-08-25 merge apart from Dependabot.
  It joins the register because it is an actively released public repository
  in the same workspace, and it recorded the portfolio's first outside-human
  event: the fork listed above.

## What this means

Download counts for the recorded week (contribkit 578, quant-research 254,
OpenSheet-AI 128, windows 2026-08-20 to 2026-08-26) are higher than the
cumulative figures in the 2026-08-24 register, but a download still cannot
tell us whether a person used a package, whether it solved their problem, or
whether the event came from CI, a mirror, or an automated scan. The only
outside-human event in the portfolio remains the agentsmd fork, with no
follow-up contact.

The per-repository adoption blockers are unchanged: PatchGate is a private,
unpublished package that must be cloned and built before the first CLI
command; the other four publish pre-release packages but have not yet met one
consented external walkthrough, downstream install, outside issue, or outside
merged pull request. More release scaffolding will not answer the usefulness
question; a consented external walkthrough will.

## Shared working method

1. Work in the repository that owns the change. Do not vendor or nest one
   repository inside another.
2. Before making an adoption or popularity claim, check GitHub and the
   relevant package registry, record the date, and separate maintenance from
   independent usage.
3. Treat a real external walkthrough, downstream install, outside issue,
   merged outside pull request, or consented pilot with feedback as usage
   evidence. Treat self-authored activity and bot activity as maintenance
   evidence only. Treat a fork, star, or download as a lead to investigate,
   never as usage.
4. Start each public description with the user's job, state the hard
   boundary, and label the release stage. Do not lead with an AI-shaped
   promise or a claim the evidence cannot support.
5. Prefer one completed user interaction over another internal release,
   issue, or scheduled post. Record negative results too.

## Next evidence to pursue

- PatchGate: one consented non-blocking shadow install by a maintainer
  outside `daichunghy/*`, followed by feedback on setup, noise, and
  usefulness.
- contribkit: one consumer repository or outside maintainer walkthrough that
  exercises the preflight boundary; merge PR #33 only after its `verify`
  context is green.
- OpenSheet-AI: one researcher or operator completing the documented local
  quickstart and reporting whether the typed plan and receipt match a real
  spreadsheet task.
- quant-research: one researcher using an instrument, recode, or emitter in a
  real study workflow and reporting what was missing or unnecessary.
- agentsmd: triage the five open Dependabot pull requests, then seek one
  outside walkthrough of the lint/score loop; investigate whether the
  forking account can be invited to describe what they tried.

Until those checks exist, the accurate description is: five actively
maintained public pre-release projects with no verified external adoption.
