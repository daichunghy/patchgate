# User adoption loop — 2026-08-24

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
| [PatchGate](https://github.com/daichunghy/patchgate) | A maintainer installs the Action in non-blocking shadow mode and receives a useful check | Unpublished CLI, token/permission boundary, and no outside shadow install | One consented shadow run in a repository outside `daichunghy/*` |
| [contribkit](https://github.com/daichunghy/contribkit) | An agent or human runs preflight on a real local change before opening a PR | Package/plugin discoverability and no outside consumer walkthrough | One outside repository completes `preflight` and reports the decision |
| [OpenSheet-AI](https://github.com/daichunghy/opensheet-ai) | A typed intent becomes a validated plan, dry-run receipt, and new `.xlsx` file | The boundary is deliberately local/greenfield; no real operator workflow is verified | One researcher or operator completes a real spreadsheet task |
| [quant-research](https://github.com/daichunghy/quant-research) | A declared instrument produces a codebook, recode output, coverage result, and analysis syntax | No real study workflow has been observed outside the maintainer workspace | One researcher uses an output in a real study and reports what was missing |

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
