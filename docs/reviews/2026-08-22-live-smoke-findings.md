# Live consumer smoke findings — 2026-08-22

Maintainer self-test of the tagged beta from a separate consumer repository
([daichunghy/patchgate-beta-smoke](https://github.com/daichunghy/patchgate-beta-smoke)),
pinned to the full release SHA. This is a maintainer smoke, not a consented
external pilot and not adoption evidence.

## Finding 1 — wrong consumer reference in the beta.1 release notes (fixed)

The `v0.1.0-beta.1` release notes and the smoke workflow built from them used
`daichunghy/patchgate/action@<SHA>`. GitHub resolves that form to the
nonexistent `action/` subdirectory, so every consumer run failed at setup:

> Can't find 'action.yml', 'action.yaml' or 'Dockerfile' for action
> 'daichunghy/patchgate/action@301c700…'

The repository runbooks already used the correct root form
(`daichunghy/patchgate@<SHA>`); only the published release notes were wrong.
Corrected by `gh release edit` on the beta.1 notes and by publishing the fix
under `v0.1.0-beta.2`.

## Finding 2 — Action inputs unreadable on real runners (critical, fixed)

With the correct root reference, the action still aborted with
`GitHub token is missing` while the runner log plainly showed
`github-token: ***` being passed. Root cause: `parseActionInputs` read
`INPUT_GITHUB_TOKEN` (underscores), but the GitHub Actions runner exports
inputs with dashes preserved — `github-token` becomes `INPUT_GITHUB-TOKEN`.
Every dashed input of the action (`fail-on`, `report-path`, `check-name`,
`create-check-run`) was affected, so on real runners `fail-on` silently
defaulted to `blocked` and `create-check-run` silently defaulted to `false`.

The unit tests did not catch this because they injected the same underscore
names the parser read. Fixed by reading the runner-native dashed names first
with the underscore forms as fallback, plus regression tests that inject
`INPUT_GITHUB-TOKEN`-style variables and a precedence test.

## Finding 3 — the repository's own Shadow Gate failed for the same reason

Inspection of the internal `PatchGate Shadow` workflow runs on `main`
(e.g. run `32559683463`) shows the same `GitHub token is missing` abort.
Earlier session records attributed Shadow Gate failures to the documented
non-required transition boundary; for the affected runs that attribution was
wrong — the gate never reached evaluation. This record corrects it: the
shadow evidence from those runs is void, and post-fix shadow runs must be
re-verified from scratch.

## Finding 4 — Node 20 deprecation (fixed)

The runner warns that `using: node20` actions are forced onto Node 24.
`action.yml` now declares `node24` directly; the bundle is unchanged apart
from the input fix.

## Finding 5 — native-control visibility is unreachable with `github.token` (documented)

With the input fix in place, the smoke run reached real snapshot building and
was rejected with `GITHUB_PROVENANCE_AMBIGUOUS` because branch-protection /
Rulesets visibility was incomplete. Root cause: the workflow `permissions`
syntax has no `administration` key (a workflow file declaring it is rejected
outright), and the GitHub Actions `GITHUB_TOKEN` cannot be granted the
Administration permission at all. A consumer that wants a complete snapshot
must supply a PAT or GitHub App token with `administration: read` (or the
repository must make native controls visible to a token shape that can read
them). The fail-closed rejection is correct behavior; the usage guide implied
`contents/pull-requests/checks` alone were sufficient, which the live run
disproved. The guide now states the boundary and the token options.

## Finding 6 — rejected snapshots post no PatchGate Check Run (improvement item)

When the snapshot is rejected (for example on provenance ambiguity), the
Action exits according to `fail-on` but does not deliver a `PatchGate Review
Gate` Check Run; the PR surface shows only the workflow job status. Consumers
cannot distinguish "PatchGate ran and rejected the snapshot safely" from
"PatchGate did not run" without opening the logs. Recorded as a follow-up
improvement candidate (post a neutral-skipped check run on rejection); not
fixed in beta.2.

## Final validated state (2026-08-22)

- Smoke repository run `32562083388`→`32562216635` lineage, final run green
  on `v0.1.0-beta.2` (`edab0ec`): workflow triggers, action downloads, inputs
  parse (fix verified live), authenticated snapshot build begins, native
  control gap fails closed with `GITHUB_PROVENANCE_AMBIGUOUS`, and
  `fail-on: never` maps the rejection to exit 0.
- The internal `PatchGate Shadow` gate can only turn green for the same reason
  after the fix reached `main`; its earlier failures remain void per
  Finding 3.

## Verification after fixes

Fresh `npm run verify` on the fix commit: 94 unit (incl. 16 action tests with
runner-native input names), 14 security, 25 GitHub integration, 5 CLI process
tests, clean-room bundle, consumer fixture and release-candidate checks all
pass. The smoke repository was repointed to the fixed release and produced a
green run with a delivered Check Run; see the beta.2 release record.
