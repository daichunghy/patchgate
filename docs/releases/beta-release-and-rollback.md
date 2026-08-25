# Beta release and rollback runbook

**Status:** runbook for the current public beta; it does not authorize a stable
`v0.1` release or production enforcement.

This runbook closes the documentation path requested in [issue #5](https://github.com/daichunghy/patchgate/issues/5).
It does not override the constitution, branch protection, pilot consent or the
maintainer's final release decision.

## Release prerequisites

Before publishing a beta, the maintainer must have independently recorded:

- the root `action.yml` and committed bundle from a clean commit;
- a passing `npm run verify` and `npm run check:release-candidate`;
- public CI, CodeQL and Security Audit evidence for the release commit;
- an immutable Action commit reference and clean consumer install;
- a tested rollback to a known-good commit;
- two consented non-blocking shadow installations, or an explicit documented
  no-go decision;
- support, security-reporting, compatibility and unsupported-behavior wording.

The current repository has public pre-release
[`v0.1.0-beta.5`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5)
and a private development package. The two external shadow installations and production
gates remain open.

## Release procedure

1. Freeze the candidate commit and record its full SHA, Node matrix, package
   lockfile digest and Action bundle verification output.
2. Run the complete verification chain from a fresh checkout. Keep the raw
   command output with the release review record.
3. Confirm that the release notes describe the supported GitHub.com surface,
   required permissions, merge-group limitation, human-review boundary and
   known Rulesets limitations.
4. Create the beta tag and release only after maintainer approval. Do not use a
   moving branch as the installation reference.
5. Verify that the release page, source commit, `action.yml`, bundle and CLI
   artifacts all point to the same immutable candidate.
6. Run the clean consumer workflow with the full commit SHA. Keep the Action
   non-blocking until the shadow evidence has been reviewed.

The package is not automatically made public by this runbook. Registry
ownership, package name and provenance must be confirmed separately before any
publish command is run.

## Consumer reference

```yaml
- name: PatchGate beta shadow gate
  uses: daichunghy/patchgate@<RELEASE_COMMIT_SHA>
  with:
    fail-on: never
    create-check-run: true
    github-token: ${{ github.token }}
```

Pin `actions/checkout`, `actions/setup-node` and any artifact uploader in the
consumer workflow according to that repository's own supply-chain policy. Do
not imply that a convenient `v0` or `main` reference is immutable.

## Rollback procedure

1. Stop new installations and record the failing release SHA, workflow run,
   check-run identity, receipt digest and user-visible symptom.
2. Change the consumer workflow back to the last known-good full Action SHA.
3. Rerun one representative PR in shadow mode and confirm the check target SHA,
   receipt path, status and permissions are restored.
4. Leave the failed tag and release history intact for auditability; do not
   rewrite or force-push release history.
5. Open a scoped issue with a redacted reproduction and decide whether the next
   release is a patch, a new beta or a no-go.

Rollback is a consumer workflow change, not an automatic branch-protection or
ruleset mutation. If a required check has already been enabled, only the
authorized repository maintainer may change that governance setting.

## Release evidence record

| Field | Value |
| --- | --- |
| Release/tag | |
| Source commit SHA | |
| CLI/package artifact digest | |
| Action bundle verification | |
| Node/GitHub compatibility | |
| Clean consumer repository | |
| Previous known-good SHA | |
| Rollback run URL | |
| Maintainer approval and date | |
| Known limitations accepted | |

Do not call the beta adopted, production-ready, merge-blocking or a compliance
attestation merely because the release command succeeded.
