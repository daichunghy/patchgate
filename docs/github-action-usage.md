# PatchGate GitHub Action Usage Guide

PatchGate contains a local/shadow GitHub Action candidate. It is not yet a
released Marketplace action or a proven public `v0.1` distribution.

For a real external shadow installation, use the [G4 shadow-installation
runbook](pilots/g4-shadow-installation-runbook.md). For beta publication and
rollback, use the [beta release runbook](releases/beta-release-and-rollback.md)
after the documented gates have been reviewed.

---

## 1. Quick Start: Shadow Mode (Recommended for Initial Setup)

In **Shadow Mode**, PatchGate observes only (`fail-on: never`). It evaluates
the PR, writes the `ContributionReceipt`, and can post a Check Run without
blocking merge. Pin
[`v0.1.0-beta.4`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.4)
for this pre-release and pin commit
`d8c67a848a95d456707e6c580a43e4e56e6071a0`. This is not production and not a
`v0.1` claim.

The Action reads GitHub metadata through the API. Do **not** check out
pull-request code in this workflow. `github.token` cannot be granted the
Administration permission, so branch-protection/Rulesets snapshots are
incomplete with `GITHUB_TOKEN` and fail closed. A complete native-control
snapshot needs a PAT or GitHub App token with `administration: read`.

Create `.github/workflows/patchgate-shadow.yml`:

```yaml
name: PatchGate Shadow Evaluation

on:
  pull_request_target:
    types: [opened, synchronize, reopened]
  merge_group:
    types: [checks_requested]

concurrency:
  group: patchgate-shadow-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  checks: write
  pull-requests: read
  contents: read
  actions: read

jobs:
  evaluate:
    name: Review-Readiness Shadow Gate
    runs-on: ubuntu-latest
    steps:
      # Commit this file on the default branch first; pull_request_target
      # only runs workflows already on that branch.
      # github.token cannot read Administration, so native Rulesets /
      # branch-protection snapshots fail closed (correct). A PAT/App token
      # with administration:read is required for a complete native-control
      # snapshot. beta.2 posts a Check Run for successful evaluations;
      # snapshot-rejection Check Runs are included in beta.4.
      - name: Run PatchGate Shadow Gate
        uses: daichunghy/patchgate@d8c67a848a95d456707e6c580a43e4e56e6071a0
        with:
          fail-on: never
          create-check-run: true
          github-token: ${{ github.token }}
```

---

## 2. Hardened Enforcement Mode (do not copy yet)

This is a later step after a consented shadow install, not a first-paste
workflow. It is still not production or a `v0.1` claim.

```yaml
      - name: Run PatchGate Enforcing Gate
        uses: daichunghy/patchgate@d8c67a848a95d456707e6c580a43e4e56e6071a0
        with:
          fail-on: blocked
          create-check-run: true
          github-token: ${{ github.token }}
```

---

## 2a. Developing PatchGate itself

This section is only for this repository's own shadow workflow. External
consumers should use the tagged Action above, not `uses: ./` after `npm ci`.

```yaml
      - name: Checkout trusted base repository
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          ref: ${{ github.base_ref }}
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 20.x
          cache: 'npm'

      - name: Install dependencies & Build
        run: |
          npm ci
          npm run build

      - name: Run PatchGate Shadow Gate
        uses: ./
        with:
          fail-on: never
          create-check-run: true
          github-token: ${{ github.token }}
```

---

## 3. Action Inputs & Outputs

### Inputs

| Input | Description | Default | Allowed Values |
|---|---|---|---|
| `fail-on` | Status level causing step failure | `blocked` | `never`, `blocked`, `human_review_required`, `evidence_missing`, `policy_ambiguous` |
| `github-token` | GitHub token for reading metadata; `checks: write` is also required when `create-check-run: true` | `${{ github.token }}` | String |
| `create-check-run` | Post idempotent GitHub Check Run | `true` | `true`, `false` |
| `check-name` | Title of the GitHub Check Run | `PatchGate Review Gate` | String |
| `report-path` | Output path for `ContributionReceipt` | `patchgate-receipt.json` | Path string |

### Outputs

| Output | Description |
|---|---|
| `status` | Final status (`ready_for_review`, `blocked`, `human_review_required`, `evidence_missing`, `policy_ambiguous`) |
| `receipt-path` | Local filesystem path to the saved ContributionReceipt JSON file |
| `receipt-digest` | SHA-256 canonical digest of the evaluation receipt |
| `decision-input-digest` | SHA-256 canonical digest of the normalized input snapshot |
| `summary-markdown` | Formatted Markdown summary suitable for step summaries or issue comments |

---

## 4. Security Architecture & Boundary Rules

1. **Hostile Boundary Isolation**: PatchGate never executes contributor code inside the decision lane.
2. **Base Revision Authority**: Policy rules and `CODEOWNERS` are exclusively loaded from the trusted base commit (`baseSha`), preventing pull requests from relaxing their own rules.
3. **Minimal Permissions**: The action requires `contents: read` and `pull-requests: read`; add `checks: write` only when check runs are enabled. **Native-control boundary:** the `GITHUB_TOKEN` cannot be granted the Administration permission (the workflow `permissions` syntax has no `administration` key), so branch-protection/Rulesets visibility is incomplete with `github.token` and the evaluation fails closed with `GITHUB_PROVENANCE_AMBIGUOUS`. A complete snapshot requires a PAT or GitHub App token with `administration: read`; see the [live smoke findings](reviews/2026-08-22-live-smoke-findings.md).
4. **Merge-group boundary**: `merge_group` is recognized and returns an explicit
   `evidence_missing` result until authenticated multi-PR membership is supported.
