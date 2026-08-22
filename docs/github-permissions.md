# GitHub adapter permission contract

The adapter is read-only. It does not create checks, comments, reviews,
issues, workflow runs, deployments, rulesets, branch protection changes, or
artifacts. A live invocation requires the caller to provide a credential
through `PATCHGATE_GITHUB_TOKEN`; the token is never accepted as a command-line
argument and is never included in a report.

| Capability | Used for | If unavailable |
| --- | --- | --- |
| Repository metadata | Repository ID and identity binding | Reject identity; do not infer from `owner/name` |
| Pull requests: read | PR identity, changed files, reviews | Mark dependent observations incomplete or reject identity |
| Contents: read | Base `patchgate.yml` or `.github/patchgate.yml`, and base CODEOWNERS | Policy remains ambiguous; never fall back to the PR head |
| Checks: read | Check-run IDs, conclusions, suite relation | Required checks become evidence-missing |
| Actions: read | Workflow run ID/attempt, path, event, suite relation | Workflow-source evidence cannot pass |
| Repository collaborator visibility | Permission qualification for reviewers | Reviewer qualification remains unknown |
| Organization Members: read | Team identity and active membership | Team-backed approval cannot become qualified |
| Administration/metadata read | Rulesets and branch-protection visibility | Incomplete native visibility rejects; supported branch-protection and Rulesets subset checks/approval gates are evaluated, while unsupported active rule semantics remain non-ready |

GitHub may vary effective access by repository visibility, organization policy,
fine-grained token resource selection, and endpoint-specific authorization. The
matrix is therefore an implementation contract, not a promise that one token
shape grants every endpoint. The live smoke must record the actual HTTP result,
credential class, repository visibility, API version, and capability impact.

## Fail-closed rules

1. A hidden `404` is not treated as absence unless the invocation explicitly
   supplies a local/mock confirmed-absence policy. Live retrieval defaults to
   unknown.
2. A `403` is an insufficient-capability diagnostic, not an empty collection.
3. A review is qualified only after sufficient repository permission and an
   active immutable user/team binding are available.
4. Native ruleset or branch-protection visibility must be complete. Supported
   branch-protection checks and approval gates are evaluated from the normalized
   base-bound contract; active rulesets and unsupported last-pusher semantics
   remain non-ready rather than being guessed.
5. The adapter never requests write scopes and never logs the token.

See [GitHub's collaborator permission documentation](https://docs.github.com/en/rest/collaborators/collaborators?apiVersion=2022-11-28),
[team membership documentation](https://docs.github.com/en/rest/teams/members?apiVersion=2022-11-28),
and [repository rules documentation](https://docs.github.com/en/rest/repos/rules?apiVersion=2026-03-10)
for the endpoint-level access model.
