# Codex for Open Source evidence index

**Status:** preparation only; this index does not claim eligibility or selection.
**Last reviewed:** 2026-08-22

This index separates public maintenance evidence from usage, adoption and pilot
evidence. The distinction matters because self-authored activity is not the
same as independent community use.

## Evidence map

| Signal | Current evidence | What it supports | What it does not prove |
| --- | --- | --- | --- |
| Public open-source foundation | [Repository](https://github.com/daichunghy/patchgate), Apache-2.0 license, public Discussions, protected `main` and [default-branch CI](https://github.com/daichunghy/patchgate/actions/runs/32333914059) | Public pre-release project | Release, adoption or selection |
| Active maintenance | [Discussions](https://github.com/daichunghy/patchgate/discussions), [issues #4–#7](https://github.com/daichunghy/patchgate/issues), [public Project](https://github.com/users/daichunghy/projects/1), open [PR #9](https://github.com/daichunghy/patchgate/pull/9), and passing required PR checks | Ongoing maintainer work and contribution routing | Merged external contributions |
| Technical quality | [G4/G0 audit](../reviews/2026-08-20-g4-g0-audit.md), deterministic fixtures, security tests, passing PR checks and `npm run verify` | Reproducible technical quality evidence | Default-branch production reliability |
| Live integration boundary | [G3 live smoke record](../reviews/2026-08-20-g3-live-smoke.md) reached PR head `5f9ccb5` with 24 bounded GET requests, built a schema-valid snapshot and receipt, and reported the actual missing approval/ownership/linkage evidence | Authenticated live read-only snapshot path and native branch-protection coverage | A released Action, external adoption, or a ready result on a PR that still lacks its required human gates |
| Ecosystem research | Context-specific questions to Policy Bot, Danger, Reviewdog and Zizmor | Relevant ecosystem questions | Replies, endorsement or downstream use |
| Usage and adoption | Live repository metrics: 0 stars, 0 forks, 0 tags/releases; no verified downloads, downstream users or pilots | Open gap | Meaningful usage |

## Evidence rules

- A self-authored Discussion is a maintenance artifact, not an independent user.
- An outreach comment is a contact attempt, not a response or endorsement.
- An open issue is a contribution opportunity, not a completed contribution.
- A local test is local evidence, not live integration evidence.
- An open PR is public work in progress, not a merged maintainer workflow.

## The next evidence that matters most

1. An independent maintainer review and a merged hardening workflow.
2. One immutable public beta with a clean install and rollback path.
3. Three consented G2 usability sessions with raw task observations.
4. Two consented non-blocking shadow pilots in different public repositories.
5. At least one independent maintainer response, contribution or pilot change
   that can be linked to a public issue, PR or consented report.

The application should remain preparation-only until these gaps are either
closed or explained honestly in the application.
