# G4 shadow-installation runbook

**Status:** ready-to-use candidate runbook; no external installation or pilot
is claimed until a repository maintainer gives explicit consent.

This runbook is for a public repository that wants to observe PatchGate without
changing merge eligibility. It is deliberately separate from the beta-release
runbook: a shadow installation may use an explicitly approved immutable commit,
but it must not be presented as a released Action.

## Before installation

The consumer maintainer should confirm, in writing or in a private project note:

- repository and workflow scope;
- observation window or PR sample;
- whether the repository name and a redacted result may be published;
- that the workflow will remain non-blocking;
- that no private PR body, token, secret or security-sensitive detail will be
  copied into a public issue or report.

Use a full commit SHA for the Action. Do not use a mutable branch, `main`,
`v0.1.0-dev`, or a tag that has not been independently verified. The current
PR is a pre-release candidate; it is not a stable release reference.

## Minimal consumer workflow

Add this workflow on the consumer repository's default branch. Replace
`<PATCHGATE_ACTION_SHA>` only after the maintainer has checked the exact public
commit and its `action.yml`/bundle contents.

```yaml
name: PatchGate Shadow

on:
  pull_request_target:
    types: [opened, synchronize, reopened]
  merge_group:
    types: [checks_requested]

permissions:
  checks: write
  actions: read
  pull-requests: read
  contents: read

jobs:
  patchgate:
    name: PatchGate Review-Readiness Shadow Gate
    runs-on: ubuntu-latest
    steps:
      - name: Run PatchGate in shadow mode
        uses: daichunghy/patchgate/action@<PATCHGATE_ACTION_SHA>
        with:
          fail-on: never
          create-check-run: true
          github-token: ${{ github.token }}
          report-path: patchgate-receipt.json
```

Do not add `actions/checkout` of the pull-request head, `npm install` of
contributor code, or execution of a pull-request artifact to this privileged
workflow. If the consumer needs to test contributor code, keep that work in a
separate unprivileged `pull_request` workflow.

## First-run checks

After the first eligible PR, record:

1. the exact Action SHA and workflow commit;
2. the check-run name, target SHA and conclusion;
3. the PatchGate status and receipt digest;
4. unknown/evidence-missing causes and their remediation;
5. whether any duplicate check, comment or unexpected permission request
   occurred;
6. the maintainer's interpretation: useful, noisy, unclear or unsafe.

`merge_group` currently returns an explicit `evidence_missing` result because
authenticated multi-PR membership is not supported. With `fail-on: never`, this
must remain non-blocking and must be recorded as an unsupported boundary, not a
pass.

## Stop and rollback

Stop the observation immediately if the workflow asks for secrets, checks out
the PR head in the privileged lane, executes contributor-controlled code,
changes merge eligibility, creates duplicate delivery, or exposes private
content. Remove the workflow or pin it back to the consumer's previous
known-good Action SHA. Do not change branch protection or rulesets as part of a
shadow test.

Use [the feedback template](patchgate-shadow-feedback-template.md) only after
the maintainer has decided which observations may be shared. A consented
shadow installation is evidence of external use; a local fixture or a
self-authored issue is not.
