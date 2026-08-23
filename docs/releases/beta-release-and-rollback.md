# Beta release, upgrade and rollback guide

**Status:** operational guidance for the current public beta. This document
does not authorize a stable `v0.1` release, Marketplace publication,
production enforcement or an external pilot claim.

This guide implements the documentation path requested in [issue #5](https://github.com/daichunghy/patchgate/issues/5).
It complements, and does not override, the [project constitution](../PROJECT_CONSTITUTION.md),
the [G6 roadmap gate](../implementation-roadmap.md#delivery-gates), branch
protection, pilot consent or the maintainer's final release decision.

## Current release identity

The current public Action pre-release was checked against the GitHub release
and tag metadata on 24 August 2026:

| Field | Verified value |
| --- | --- |
| Release/tag | [`v0.1.0-beta.5`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5) |
| Release date | 23 August 2026 |
| Annotated tag object | `c6e5fdcb95862d6db3909e9621fcbd25cbfb0e11` |
| Action source commit | `34d998bbd59fa09dd9081e24f22abe812f97fbab` |
| Previous beta release commit | `d8c67a848a95d456707e6c580a43e4e56e6071a0` (`v0.1.0-beta.4`) |
| Package state | `private: true`, version `0.1.0-dev`; npm is not an install channel |
| Evidence boundary | public pre-release and shadow-only; no Marketplace listing, stable `v0.1`, external pilot or adoption evidence |

The **Action source commit** is the value to pin. The annotated tag object is
recorded so that a maintainer can distinguish the release tag from the commit
that contains `action.yml` and `dist/action/index.js`.

The local consumer fixture and document validator test the reference shape and
the committed bundle. They do not constitute a native GitHub consumer run,
external pilot, Marketplace publication or proof of release readiness. The
current G6 exit evidence remains pending where the roadmap requires clean-room
consumer, compatibility, support/provenance and shadow-installation evidence.

## Release prerequisites

Before publishing a new beta, the maintainer must record all of the following:

1. A clean candidate commit containing the root `action.yml` and committed
   `dist/action/index.js` bundle.
2. The full verification chain from a fresh checkout:

   ```bash
   npm ci
   npm run verify
   npm run verify:dist
   npm run check:release-candidate
   ```

3. Public CI, CodeQL and Security Audit results for the candidate commit.
4. The candidate's full 40-character commit SHA, release tag, bundle check and
   lockfile digest in the release evidence record.
5. A clean consumer installation using that full SHA, with `fail-on: never`.
6. A rollback to a known-good full SHA, tested in the same consumer shape.
7. Support, security-reporting, compatibility and unsupported-behavior wording.
8. Two consented non-blocking shadow installations, or an explicit documented
   no-go decision. A local fixture cannot substitute for this evidence.

The current repository has public pre-release `v0.1.0-beta.5` and a private
development package. The two external shadow installations and production
gates remain open. Passing local commands is a packaging and regression
precondition, not permission to publish or evidence of live GitHub behavior.

## Validate a release commit

Run these checks from a clean checkout of the candidate. Do not validate a
working tree with uncommitted changes or a bundle rebuilt from a different
revision.

```bash
git fetch --tags origin
test -z "$(git status --porcelain)"
candidate_sha="$(git rev-parse HEAD)"
test "$(git cat-file -t "$candidate_sha")" = commit
test "$(git rev-parse "$candidate_sha^{commit}")" = "$candidate_sha"
test -n "$(git show "$candidate_sha:action.yml")"
test -n "$(git show "$candidate_sha:dist/action/index.js")"

npm ci
npm run verify
npm run verify:dist
npm run check:release-candidate
npm run test:consumer-fixture
```

For an existing tagged release, resolve the tag to its commit before using it:

```bash
release_tag="v0.1.0-beta.5"
release_sha="$(git rev-parse "$release_tag^{commit}")"
test "$release_sha" = "34d998bbd59fa09dd9081e24f22abe812f97fbab"
git show --no-patch --format=fuller "$release_sha"
```

This prevents an annotated tag object from being mistaken for the source
commit. Do not treat an abbreviated SHA, a branch name or an unresolved tag as
an immutable install reference.

The package is not automatically made public by this guide. Registry
ownership, package name and provenance must be confirmed separately before any
publish command is run.

## Install in shadow mode

Shadow mode observes the PR and may publish a Check Run, but it does not make
the Action step fail for a non-ready result. Install the current beta by full
SHA:

```yaml
permissions:
  contents: read
  pull-requests: read
  actions: read
  checks: write

steps:
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@34d998bbd59fa09dd9081e24f22abe812f97fbab # v0.1.0-beta.5
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

These are the intended shadow permissions: read-only `contents`,
`pull-requests` and `actions` metadata, plus `checks: write` only because this
example asks the Action to create or update a Check Run. Do not grant
`contents: write`, `pull-requests: write`, `actions: write`, deployment, secret
or administrative permissions.

The workflow must not check out or execute pull-request code in this decision
lane. `GITHUB_TOKEN` cannot receive the Administration permission through the
workflow `permissions` block. Without a PAT or GitHub App token with
`administration: read`, the native branch-protection/Rulesets snapshot is
incomplete and PatchGate must fail closed. Do not work around that boundary by
granting broader write permissions. Pin `actions/checkout`, `actions/setup-node`
and any artifact uploader according to the consumer repository's own
supply-chain policy.

## Immutable commit, release tag and moving major tag

Use the references for different purposes:

| Reference | Meaning | Consumer policy |
| --- | --- | --- |
| Full commit SHA, for example `34d998bbd59fa09dd9081e24f22abe812f97fbab` | One exact Action source and bundle | Recommended installation reference; retain it for rollback |
| Immutable release tag, if the repository's release/tag controls make it immutable | Human-readable release identity | Resolve it to a full commit and verify before use |
| Moving major/minor tag such as `v0`, `v0.1` or a future `v0.1.1` pointer | Convenience alias that may move to a later release | Do not use as the supply-chain pin for this beta |
| `main` or another branch | Development state | Never use as a release reference |

The current beta.5 guide therefore shows the tag as a comment for readability
but installs the full commit SHA. A future moving major tag must be advanced
only as part of an approved release; advancing it is not a replacement for
retaining the old commit or documenting rollback. The beta.4 commit recorded
above is a release identity for the local transition check, not a claim that a
consumer's own previous runtime was externally validated.

## Upgrade and downgrade

Treat an Action reference change as a consumer workflow change:

1. Record the current full SHA, release tag, workflow run and receipt/check
   behavior.
2. Change only the `uses:` reference to the new full candidate SHA. Keep
   `fail-on: never` during shadow evaluation.
3. Open or update the consumer workflow through its normal review path and run
   one representative PR, including a fork or merge-group case when that
   repository supports it.
4. Compare the target SHA, final status, receipt path, receipt digest,
   Check-Run identity and permission-related diagnostics with the previous
   version.
5. Retain the previous full SHA in the release record until the new version is
   accepted or explicitly rejected.

To downgrade, replace the current reference with the last known-good full SHA,
review the workflow change, and repeat the same shadow verification. Do not
delete the failed release or rewrite its tag to make the downgrade appear to
be an upgrade.

## Rollback procedure

1. Stop new installations and record the failing SHA, release tag, workflow run
   URL, Check-Run identity, receipt path/digest, target SHA and user-visible
   symptom. Redact tokens, secrets and personal data.
2. Change the consumer workflow to the previous known-good full SHA. Keep the
   workflow in shadow mode until the incident is understood.
3. Rerun one representative PR and confirm that the expected Action commit,
   target SHA, receipt path, final status and permission diagnostics are
   restored.
4. If a required check was already enabled, the authorized repository
   maintainer must decide whether to suspend or change that native rule. The
   Action does not perform that governance mutation.
5. Leave the failed release and tag history intact. Do not force-push, retag or
   erase the evidence.
6. Open a scoped issue with a redacted reproduction and decide whether the next
   release is a patch, a new beta or a no-go.

Rollback is a consumer workflow change, not an automatic branch-protection or
ruleset mutation. If a required check has already been enabled, only the
authorized repository maintainer may change that governance setting.

The local `check:release-guide` validator checks the documented full-SHA
transition and rollback controls. A rollback of a live external workflow is
still **pending evidence** until a consented consumer run records the result.

## Marketplace publication prerequisites

Marketplace publication is a separate maintainer decision and is not performed
by this guide. Before considering it, verify the current GitHub requirements:

- the repository is public;
- one root `action.yml` or `action.yaml` is present, and its `name` is unique;
- the action code, committed runtime bundle and necessary documentation are in
  the repository;
- the release has passed the repository's tests, security checks, release
  candidate checks, compatibility review and rollback review;
- the owner has accepted the GitHub Marketplace Developer Agreement;
- the maintainer creates and publishes a versioned GitHub release, selects the
  Marketplace publication option, chooses the required category metadata and
  completes any required two-factor authentication.

GitHub describes the current publication prerequisites in its [Marketplace
publication documentation](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace).
The current PatchGate repository is not making that claim: its npm package is
still private/unpublished and beta.5 is not a Marketplace listing.

## Non-claims and unsupported evidence

PatchGate's Action-only beta does not claim any of the following:

- a distinct PatchGate GitHub App identity; its observable check source is
  GitHub Actions, and a policy requiring a stronger App identity remains
  unsupported or evidence-missing;
- functional correctness, security, license validity or merge-worthiness of
  the pull-request code;
- a tamper-proof receipt, cryptographic signature, compliance certification or
  universal provenance guarantee;
- that `human_review_required` proves a human has reviewed the code;
- that `fail-on: never` blocks a merge, or that a Check Run changes governance
  without a maintainer-configured native GitHub rule;
- Marketplace publication, npm publication, production readiness, external
  pilot, downstream adoption or program eligibility;
- live GitHub integration merely because local tests, a fixture, a release tag
  or a successful command exists.

## Release evidence record

| Field | Value |
| --- | --- |
| Release/tag | |
| Annotated tag object | |
| Source commit SHA | |
| CLI/package artifact digest | |
| Action bundle verification | |
| Node/GitHub compatibility | |
| Clean consumer repository and consent | |
| Previous known-good SHA | |
| Rollback run URL and result | |
| Public CI, CodeQL and Security Audit | |
| Maintainer approval and date | |
| Known limitations accepted | |

Do not call the beta adopted, production-ready, merge-blocking or a compliance
attestation merely because the release command succeeded.
