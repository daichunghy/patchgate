# PatchGate marketing message kit

**Status:** public copy foundation, not adoption evidence

**Claims snapshot:** 2026-08-31

This document gives maintainers one factual way to explain PatchGate across the
README, GitHub Discussions and external social channels. It is a copy aid, not
a promise that a release, pilot or public post has happened.

## The one-line description

PatchGate checks whether a GitHub pull request has the policy, commit-bound
evidence, ownership and human gate a maintainer expects before spending review
time.

## The problem

Maintainers often open a pull request before they know whether the basic review
signals are present. The issue may be missing, a green check may belong to an
older commit, the required owner may not have approved, or the change may be
too broad for the repository's declared review budget.

PatchGate moves those deterministic questions into a preflight and a
machine-readable receipt. It does not replace the maintainer's code review.

## Who should care

| Audience | Their question | Useful entry point |
| --- | --- | --- |
| Solo OSS maintainer | “Which PR is ready for my limited review time?” | [first-use check](../first-use.md) |
| Repository administrator | “Can the check use our trusted policy and native GitHub controls?” | [Action usage guide](../github-action-usage.md) |
| Contributor or coding agent | “What must be present before I ask for review?” | [getting started](../getting-started.md) |
| Security owner | “Does a sensitive path still require a qualified human?” | [receipt contract](../receipt-contract.md) |
| Technical reviewer | “Can I challenge the evidence model without installing it?” | [evidence review packet](evidence-review-packet.md) |

## Message pillars

### 1. Review readiness, not code judgement

PatchGate answers whether the contribution has supplied the declared review
signals. It does not score correctness, security, license validity or AI
authorship.

### 2. Evidence is tied to the right revision

The receipt keeps `baseSha`, `headSha`, `testedSha` and the target kind distinct.
A successful check on an older commit is not silently reused for a newer PR
head.

### 3. Policy comes from a trusted base

An open pull request cannot relax the policy used to evaluate itself. Prose
guidance can be discovered and shown, but it cannot become a blocking rule
without explicit structured policy or a native GitHub control.

### 4. Human review remains explicit

`human_review_required` means a declared human gate is still unsatisfied. It
does not mean that a person has reviewed the code.

## Message ladder

Use the smallest message that fits the reader's stage.

| Stage | Message | Link |
| --- | --- | --- |
| Discover | “A green check can still be attached to the wrong commit.” | [Discussion](https://github.com/daichunghy/patchgate/discussions) |
| Understand | “PatchGate checks whether a PR is ready to consume maintainer review time.” | [README](../../README.md) |
| Try locally | “Run the recorded ready case and inspect the receipt.” | [evidence review packet](evidence-review-packet.md) |
| Try on a repository | “Start with a non-blocking shadow check and keep the full release SHA.” | [first-use guide](../first-use.md) |
| Give feedback | “Report the first confusing result without sharing private data.” | [first-use form](https://github.com/daichunghy/patchgate/issues/new?template=first-use.yml) |
| Contribute | “Add a fixture or documentation fix for one governance edge case.” | [contributing guide](../../.github/CONTRIBUTING.md) |

## What the current evidence supports

As of 2026-08-31, the public repository has a `v0.1.0-beta.5` Action release
for shadow evaluation, a deterministic local evaluator, recorded fixtures and
a documented first-use path. The npm package is unpublished and there is no
verified external repository, completed external pilot or production release.

The public beta is therefore a useful subject for review and a consented
non-blocking observation, not a production recommendation.

## Claims guardrail

| Say this | Do not say this |
| --- | --- |
| “checks whether a PR is ready for maintainer review” | “reviews the code for you” |
| “verifies workflow evidence for a commit SHA” | “proves the code is correct” |
| “can block merge when configured as a required GitHub status check” | “blocks pull requests by itself” |
| “requires a configured qualified human approval” | “forces an agent to hand off” |
| “public beta, shadow-only” | “production-ready”, “stable v0.1” or “adopted” |
| “one consented pilot is being sought” | “the community is using it” |
| “one star / one reply / one download is a lead to investigate” | “stars or downloads prove adoption” |

## Channel rules

- Start with one concrete observation: a SHA, a missing owner, a first-use
  command or a recorded fixture.
- Use one idea per post. A short question is better than a product catalogue.
- Link to the narrowest useful page, not only the repository root.
- Keep external social copy as `draft` until an authorized account or posting
  session is connected.
- Record the URL, date, channel, target audience and response state after a
  public post. A self-authored post is maintenance evidence, not adoption.
- Do not ask for stars, forks, endorsements or positive wording.

## Short copy blocks

### Technical discovery

> A green check from the wrong commit is still the wrong evidence. PatchGate
> keeps the trusted base, PR head and tested SHA separate, then reports what a
> maintainer can verify before opening a deep review. The current beta is
> shadow-only.

### Maintainer invitation

> I am looking for one public repository with a review-readiness question, not
> a testimonial. A first PatchGate observation stays non-blocking, uses a
> full-SHA reference and does not execute pull-request code in the privileged
> metadata lane.

### Contributor invitation

> Before asking for review, run the local ready case. The receipt shows which
> policy, issue, check and ownership evidence made the result ready, and which
> missing signal would make it non-ready.

## Lightweight measurement

Record these fields for every channel activity:

| Field | Example | Why it matters |
| --- | --- | --- |
| Channel and URL | `GitHub Discussion #64` | proves where the activity happened |
| Copy variant | `wrong-commit-observation` | makes later comparison possible |
| Audience | `OSS maintainer` | avoids treating every impression as a user |
| Response state | `question`, `consent`, `decline`, `no response` | preserves the actual outcome |
| First-use or pilot evidence | issue/PR link, with consent state | separates interest from use |
| Claim boundary | `maintenance`, `lead`, `pilot`, `adoption` | prevents status inflation |

The useful marketing result is not the largest number. It is a maintainer who
can say which result changed what they reviewed, or which result added noise.
