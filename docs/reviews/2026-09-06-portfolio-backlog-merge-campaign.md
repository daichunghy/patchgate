# Portfolio backlog merge campaign — 2026-09-06

A single maintenance pass reviewed the full open pull-request backlog across
the five portfolio repositories and merged every pull request whose required
checks were green, resolved ten stale-conflicting pull requests, and closed
five superseded dependency bumps. It is maintenance evidence only: every merge
below is a recorded maintainer decision made through the documented
admin-bypass pattern, not independent-review evidence, and none of it is
external adoption, pilot evidence, or a release claim.

## Method

- Every pull request was merged only after all of its required checks
  completed successfully on its latest head.
- Ten pull requests had become conflicting with `main` after earlier merges in
  the same pass. Each was re-based onto `main` by a recorded merge commit with
  conflicts resolved by union of both sides (or by the newer documented
  status), re-verified locally with the repository's own verify chain where
  code was touched, and re-run through full CI before merging.
- Five stale CodeQL-action bump pull requests were closed as superseded after
  the merged synchronization and grouping changes made them obsolete.
- All merged head branches were deleted; only intentionally retained branches
  remain (the pre-publication `test/patchgate-shadow-smoke` draft branch and
  the open `typescript` 7 Dependabot branches).

## Merged (47 pull requests)

| Repository | Merged today | Notes |
| --- | --- | --- |
| [patchgate](https://github.com/daichunghy/patchgate) | #52, #59, #61, #62, #63, #65, #66, #67, #68, #69, #70, #73, #74, #75 | 14 pull requests, including the exact head-SHA binding (#59), the user-first README restructure (#69), the Case Lab and Prow `OWNERS` discovery work (#75), and CodeQL action grouping with its first grouped bump (#61, #74) |
| [contribkit](https://github.com/daichunghy/contribkit) | #1, #2, #8, #30, #33, #39, #40, #41, #42, #43, #44 | 11 pull requests, including the Ruby RSpec and PHP PHPUnit adapters unioned with the rust/dotnet/swift/cmake adapter set (#30) |
| [agentsmd](https://github.com/daichunghy/agentsmd) | #1, #2, #3, #5, #13, #14 | 6 pull requests |
| [opensheet-ai](https://github.com/daichunghy/opensheet-ai) | #1, #2, #4, #14, #17, #18, #19, #20 | 8 pull requests, including the xlsx adapter error reference and its drift gate (#14) |
| [quant-research](https://github.com/daichunghy/quant-research) | #1, #2, #3, #16, #19, #21, #23, #24 | 8 pull requests, including the service-quality workflow bundling the workflow-readiness example family (#19) |

Closed as superseded: patchgate #71 and #72, contribkit #36, #37 and #38.

## Deliberately left open

The `typescript` 7 Dependabot pull requests stay open by decision:
[patchgate #12](https://github.com/daichunghy/patchgate/pull/12) is blocked
because `@vercel/ncc` cannot bundle under TS 7; the contribkit, agentsmd and
opensheet-ai equivalents are green but held as a deliberate major-version
decision for the maintainer.

## Verification

- patchgate: `npm run verify` ran clean locally on each conflict-resolved
  merge and on #75 before push; default-branch
  [CI run 34024768856](https://github.com/daichunghy/patchgate/actions/runs/34024768856)
  and CodeQL run 34024768771 completed successfully on `main@a52c21f`.
- contribkit, agentsmd, opensheet-ai and quant-research: conflict-resolved
  merges were re-tested locally with their verify or test chains before push;
  all merged heads were green on CI.

## Evidence limits

- No external user, downstream repository, outside issue, outside pull
  request, or consented pilot appeared in this pass.
- The portfolio still has no published stable release. Later on the same day
  the maintainer authorized npm publication of the prepared prereleases:
  `contribkit@0.1.0-alpha.7`, `opensheet-ai@0.1.0-alpha.5`,
  `@agentbiz/quant-research@0.1.0-alpha.6`, and the scoped
  `@daichunghy/patchgate@0.1.0-beta.5` — all published to their documented
  prerelease dist-tags. Prerelease publication is not a `v0.1` claim and does
  not by itself constitute adoption evidence.
- Repository status snapshots outside this record (per-repository `AGENTS.md`
  and status documents) were refreshed for patchgate in the same pass; the
  other repositories' status documents continue to state their own limits.
