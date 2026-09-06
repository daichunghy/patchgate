# User adoption loop — 2026-08-28

The goal for this workspace is not to produce four busy repositories. It is to
get real people to a first useful result, learn where the workflow fails, and
fix that failure without weakening the product boundaries.

## What counts as progress

For each repository, the strongest next signal is one consented outside user
who completes the first-use path and reports whether the result was useful.
Stars, releases, self-authored issues, CI runs, and npm downloads are useful
maintenance or discoverability signals, but they do not establish adoption.

| Project | First useful result | Current blocker | Next evidence |
| --- | --- | --- | --- |
| [PatchGate](https://github.com/daichunghy/patchgate) | A maintainer adds the pinned shadow workflow, opens one PR, and receives a useful non-blocking check | PR #59 is public and CI-green, but it is not merged and no outside shadow consent exists | One consented shadow run in a repository outside `daichunghy/*` |
| [contribkit](https://github.com/daichunghy/contribkit) | An agent or human runs package-first `preflight` on a real local change before opening a PR | PR #33 is public and CI-green; npm alpha.7 still needs owner authentication/publication | One outside repository completes `preflight` and reports the decision |
| [OpenSheet-AI](https://github.com/daichunghy/opensheet-ai) | A typed intent previews to a receipt, then writes a new `.xlsx` file | PR #17 is public and CI-green; npm alpha.5 still needs owner authentication/publication | One researcher or operator completes a real spreadsheet task |
| [quant-research](https://github.com/daichunghy/quant-research) | A packaged workflow emits codebook, recode, coverage, measurement and syntax artifacts | PR #19 is public and CI-green; alpha.6 is prepared but npm publication is blocked by auth | One researcher uses an output in a real study and reports what was missing |

## Evidence to record

Every first-use report should record:

- repository and version/commit;
- user context, without collecting private data;
- time to first useful result;
- exact command or workflow used;
- first error or confusing step;
- whether the output was used for the intended task;
- what the user expected next;
- whether the user consents to a redacted public summary.

The evidence record must distinguish `worked`, `worked_with_workaround`, and
`did_not_reach_first_result`. Do not collapse a workaround into a success.

## Fast-conversion sequence

Use one measurable action per stage. Do not count a page view, star, download,
self-authored issue, or CI run as adoption.

1. **Activation, under five minutes:** the documented package or Action command
   runs and produces the stated receipt, check, preview, workbook, or workflow
   bundle. Record command, version, elapsed time, and first confusion.
2. **Useful result:** the person can answer the product question without opening
   internal source files. The README CTA must point directly to this result.
3. **Feedback conversion:** offer one short issue form immediately after the
   result. Ask what they expected, what blocked them, and whether they would
   repeat the workflow. Never request private data or a positive quote.
4. **Pilot conversion:** request explicit consent, an exact target repository
   and PR, least-privilege permissions, and a rollback path. For PatchGate,
   keep the first run shadow-only and non-blocking.

The operating target is not a viral number. It is a shorter path from a public
entry point to a verifiable first result, followed by a consented outside
workflow. If activation is successful but feedback conversion is weak, improve
the result and the form before adding features.

## Working cadence

1. Check live GitHub and package signals before writing the weekly status.
2. Choose one user-facing friction with a reproducible path.
3. Make the smallest safe change that removes or clarifies that friction.
4. Run the repository verification command and a clean first-use path.
5. Ask one relevant person or community for a consented walkthrough; do not
   manufacture activity or send mass pull requests.
6. Record the outcome, including a no-go or a failed first run.
7. If two consecutive cycles produce no outside signal, pause feature growth
   and spend the next cycle on direct user interviews or a narrower product.

## Decision rule

The next feature is justified by a real first-use failure, a repeated outside
request, or a documented product boundary. Internal activity alone is not a
user requirement. A release is a delivery mechanism, not evidence that the
problem has been solved.
