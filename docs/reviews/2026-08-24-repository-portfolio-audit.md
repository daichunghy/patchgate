# Repository portfolio audit — 2026-08-24

This is the operating register for the four GitHub repositories kept in the
Desktop workspace. They remain separate projects with separate contracts,
release decisions, and user evidence. The register does not turn them into a
suite and does not imply shared adoption.

## Live snapshot

The GitHub and npm checks were run on 2026-08-24. A download is a registry
event, not a user count. A self-authored issue, release, discussion, star, or
maintenance log is not external adoption.

| Local folder | Repository | Current public signal | Package signal | Verified usage |
| --- | --- | --- | --- | --- |
| `Github/` | [`daichunghy/patchgate`](https://github.com/daichunghy/patchgate) | 1 star, 0 forks, 12 open issues, current Action pre-release `v0.1.0-beta.5` | PatchGate remains unpublished (`private: true`); the npm name `patchgate` belongs to another package | No external user, downstream repository, or pilot verified |
| `Github 2/contribkit/` | [`daichunghy/contribkit`](https://github.com/daichunghy/contribkit) | 0 stars, 0 forks, 24 open issues, GitHub pre-release `v0.1.0-alpha.7` | npm `alpha` dist-tag resolves `0.1.0-alpha.6`; 528 downloads from 2026-07-25 to 2026-08-23 | No external user, downstream repository, or pilot verified |
| `Github 3/` | [`daichunghy/opensheet-ai`](https://github.com/daichunghy/opensheet-ai) | 0 stars, 0 forks, 12 open issues, GitHub pre-release `v0.1.0-alpha.5` | npm `alpha` and `latest` resolve `0.1.0-alpha.4`; 109 downloads from 2026-07-25 to 2026-08-23 | No external user, downstream repository, or pilot verified |
| `Github 4/` | [`daichunghy/quant-research`](https://github.com/daichunghy/quant-research) | 0 stars, 0 forks, 14 open issues, GitHub pre-release `v0.1.0-alpha.5` | npm `alpha` resolves `0.1.0-alpha.5`; 221 downloads from 2026-07-25 to 2026-08-23 | No external user, downstream repository, or pilot verified |

The contributor lists are maintainer-led. PatchGate also has Dependabot
activity; no outside human contributor was observed in this snapshot.

## What this means

PatchGate is not popular by the observable signals above. More importantly,
its usefulness is still a product hypothesis, not a demonstrated user result.
The project has a narrow and testable job, but no independent maintainer has
yet installed it, completed a pilot, opened an issue from outside this
workspace, or contributed a change.

The same caution applies to the other three repositories. Their npm download
counts are worth recording, but they cannot tell us whether a person used the
package, whether the package solved the intended problem, or whether the
download came from CI, a mirror, or an automated scan.

The current PatchGate adoption blocker is also concrete: the project is a
private, unpublished npm package, so a stranger must clone the repository and
build it before the first CLI command. The existing
[multi-persona review](2026-08-22-multi-persona-review.md) identifies this as
the largest first-run friction. More release scaffolding will not answer that
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
   evidence only.
4. Start each public description with the user's job, state the hard boundary,
   and label the release stage. Do not lead with an AI-shaped promise or a
   claim the evidence cannot support.
5. Prefer one completed user interaction over another internal release, issue,
   or scheduled post. Record negative results too.

## Next evidence to pursue

- PatchGate: one consented non-blocking shadow install by a maintainer outside
  `daichunghy/*`, followed by feedback on setup, noise, and usefulness.
- contribkit: one consumer repository or outside maintainer walkthrough that
  exercises the preflight boundary.
- OpenSheet-AI: one researcher or operator completing the documented local
  quickstart and reporting whether the typed plan and receipt match a real
  spreadsheet task.
- quant-research: one researcher using an instrument, recode, or emitter in a
  real study workflow and reporting what was missing or unnecessary.

Until those checks exist, the accurate description is: four actively maintained
public pre-release projects with no verified external adoption.
