# PatchGate GitHub Action Usage Guide

PatchGate contains a local/shadow GitHub Action candidate. It is not yet a
released Marketplace action or a proven public `v0.1` distribution.

---

## 1. Quick Start: Shadow Mode (Recommended for Initial Setup)

In **Shadow Mode**, PatchGate runs purely in observe-only mode (`fail-on: never`). It evaluates the PR, writes the `ContributionReceipt` artifact, and optionally publishes a GitHub Check Run summarizing the findings without blocking the PR merge.

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

jobs:
  evaluate:
    name: Review-Readiness Shadow Gate
    runs-on: ubuntu-latest
    steps:
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
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 2. Hardened Enforcement Mode (After Shadow Validation)

Once you have verified the policy and reviewed the shadow distribution, you can configure PatchGate to fail when a PR is blocked:

```yaml
      - name: Run PatchGate Enforcing Gate
        uses: ./
        with:
          fail-on: blocked
          create-check-run: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 3. Action Inputs & Outputs

### Inputs

| Input | Description | Default | Allowed Values |
|---|---|---|---|
| `fail-on` | Status level causing step failure | `blocked` | `never`, `blocked`, `human_review_required`, `evidence_missing`, `policy_ambiguous` |
| `github-token` | GitHub token for reading metadata; `checks: write` is also required when `create-check-run: true` | `${{ github.token }}` | String |
| `create-check-run` | Post idempotent GitHub Check Run | `false` | `true`, `false` |
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
3. **Minimal Permissions**: The action requires `contents: read` and `pull-requests: read`; add `checks: write` only when check runs are enabled.
4. **Merge-group boundary**: `merge_group` is recognized and returns an explicit
   `evidence_missing` result until authenticated multi-PR membership is supported.
