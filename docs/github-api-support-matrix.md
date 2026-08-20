# GitHub adapter API and capability matrix

**Date:** 2026-08-13  
**Adapter API version:** `2026-03-10`  
**Supported platform:** GitHub.com only in this vertical slice  
**Evidence state:** local fixtures plus an authorized GET-only live smoke against public `daichunghy/patchgate#9`; no write operation was performed

The adapter fixes `Accept: application/vnd.github+json`, sends
`X-GitHub-Api-Version: 2026-03-10`, uses one trusted HTTPS origin, follows no
redirects, and retains only allowlisted response headers. It follows GitHub
pagination links only when the link remains on the configured origin.

| Snapshot data | Endpoint or operation | Minimum intended capability | Bound result | Local evidence |
| --- | --- | --- | --- | --- |
| Repository and PR identity | `GET /repos/{owner}/{repo}`; `GET /repos/{owner}/{repo}/pulls/{pull_number}` | Metadata and pull-request read visibility | Repository ID, PR ID/number, base ref/SHA, head repository ID/ref/SHA, optional merge SHA, author ID | `test/integration/github-adapter.test.ts` |
| Trusted policy | `GET /repos/{owner}/{repo}/contents/{patchgate.yml,.github/patchgate.yml}?ref={base_sha}` | Contents: read | Exact base-revision bytes, raw digest, normalized contract digest; the supported root path is tried before `.github/patchgate.yml`; hidden 404 is not absence | `src/github/contents.ts` |
| Changed paths | `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` | Pull requests: read | Complete paginated paths, rename old/new paths, 3,000-file ceiling | `src/github/changed-paths.ts`, pagination probe |
| Linked issues | GraphQL `closingIssuesReferences` | Pull requests: read and GraphQL visibility | Current GitHub `Issue` nodes are normalized directly; legacy recorded fixture shape remains replay-compatible; native same-repository relationship only | `src/github/linked-issues.ts` |
| Check evidence | `GET /repos/{owner}/{repo}/commits/{ref}/check-runs?filter=all`; workflow-run search by `head_sha` | Checks: read and Actions: read | Check-run ID, suite ID, SHA, App identity, workflow ID/path, run ID/attempt, event | `src/github/checks.ts`, `src/github/workflows.ts` |
| Review state | `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` | Pull requests: read | Chronological active state, review ID, actor ID, commit SHA, author/bot flags | `src/github/reviews.ts` |
| Reviewer qualification | Collaborator permission; qualified team identity and membership | Repository collaborator visibility; Members: read for organization/team lookup where required | Qualified only with sufficient permission and immutable user/team binding | `src/github/permissions.ts`, `test/security.test.ts` |
| CODEOWNERS | Contents endpoint at base ref, `.github/CODEOWNERS`, `CODEOWNERS`, then `docs/CODEOWNERS` | Contents: read | Published parser subset; unsupported syntax is incomplete, never silently accepted | `src/github/codeowners.ts` |
| Native controls | Repository rulesets and branch protection endpoints | Administration/metadata read according to repository visibility and token type | Branch-protection and the Rulesets `required_status_checks`/`pull_request` subset are represented and digest-bound; unsupported rule semantics remain fail-closed | `src/github/rulesets.ts`, `src/github/branch-protection.ts`, `src/evaluator-core.ts` |

## Explicit limits

- REST pages are bounded at 100 items where the endpoint supports it; the
  adapter follows only bounded `rel="next"` links.
- A changed-file collection at GitHub's documented 3,000-file ceiling is
  incomplete for decision purposes.
- Check-run and workflow-run searches are not treated as complete when their
  documented result ceilings prevent proving completeness.
- Merge-group events are rejected because the current scalar
  `EvaluationInput` has no authenticated multi-PR membership contract.
- Branch-protection check contexts may be qualified names such as `CI / job` while
  Check Runs exposes `job`; the adapter matches exact names first and then a
  unique suffix, rejecting ambiguous suffix matches.
- The supported Rulesets subset is limited to `required_status_checks` and
  `pull_request` review parameters. Required reviewers, review-thread
  resolution, merge queue, commit/tag patterns, restricted merge methods and
  other active rule types remain non-ready until their evidence is modeled.
- Multiple check names may share one workflow run. Evidence references therefore
  include the encoded check name; only duplicate `(workflowRunId, attempt, check
  name, testedSha)` identities are rejected.
- GitHub Enterprise Server is reported as unsupported until a versioned API
  and capability matrix is added.
- Persistent caching, conditional requests, and cache-body reuse are deferred;
  an unexpected `304` cannot create evidence.

## Primary official references

- [REST API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)
- [Pull requests and changed files](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28)
- [Repository contents](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)
- [Check runs](https://docs.github.com/en/rest/checks/runs?apiVersion=latest)
- [Workflow runs](https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2026-03-10)
- [Pull-request reviews](https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28)
- [Collaborator permissions](https://docs.github.com/en/rest/collaborators/collaborators?apiVersion=2022-11-28)
- [Team membership](https://docs.github.com/en/rest/teams/members?apiVersion=2022-11-28)
- [Repository rules](https://docs.github.com/en/rest/repos/rules?apiVersion=2026-03-10)
- [Branch protection](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28)
- [REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
- [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

The endpoint URLs above are documentation references, not evidence of a live
credential's current access. A maintainer-authorized live smoke remains an
explicit G3 exit requirement.
