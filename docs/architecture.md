# PatchGate architecture and evidence contract

## System shape

```text
trusted base policy + authenticated GitHub metadata
                         |
                         v
              normalized evaluation snapshot
                         |
                         v
                 pure deterministic evaluator
                         |
                         v
              ContributionReceipt + remediation
                         |
                         v
                 GitHub check / local report
```

The evaluator is deliberately independent of HTTP, GitHub SDKs, Actions
contexts, YAML parsing, and filesystem access. Adapters are responsible for
retrieval and normalization; the evaluator is responsible for the decision.

The local implementation keeps that boundary explicit:

```text
external JSON/YAML/API value
  -> schema + semantic validation (filesystem-owned boundary)
  -> validated EvaluationInput
  -> evaluateValidated (pure, deterministic receipt core)
  -> deliverReceipt(evaluatedAt)
```

`evaluateValidated` does not load schemas, read files, use the network, read
environment variables, or call a clock. The delivered envelope requires
`evaluatedAt`; the core receipt does not.

## Trust lanes

### Trusted metadata lane

The future GitHub adapter may run from the default branch or a pinned Action
release and may read:

- `patchgate.yml` at the pull request base SHA;
- `CODEOWNERS` at the base branch/base SHA;
- effective repository/organization rulesets and branch-protection settings;
- pull-request metadata, linked issues, reviews, labels, and merge state;
- check runs and workflow runs with commit and source identity.

It must not checkout, install, build, test, source, or execute pull-request
code. It must also treat PR text, labels, paths, and artifact names as
untrusted strings.

### Untrusted verification lane

Tests and builds of contributor code belong under `pull_request` or another
isolated, read-only workflow with no repository secrets. Its output is an
untrusted evidence candidate until the decision adapter verifies the producer,
run, target SHA, artifact identity, and expected conclusion.

### Decision lane

The decision lane consumes only the normalized snapshot. It does not execute
repository scripts. It can emit a local receipt. Posting a merge-blocking
GitHub result requires the adapter to use a token or App permission that is
documented and restricted to the necessary operation.

## Revision model

The following values must remain distinct:

| Field | Meaning |
| --- | --- |
| `baseSha` | Trusted policy revision and PR target revision |
| `headSha` | Current contributor branch tip from PR metadata |
| `mergeSha` | Optional PR test-merge revision |
| `mergeGroupSha` | Merge-group revision when `targetKind` is `merge_group` |
| `testedSha` | Exact revision to which the supplied evidence is bound |
| `targetKind` | `head`, `merge`, or `merge_group` |
| `policyRevision` | Revision from which each enforceable policy source was read |

For a `pull_request` event, the adapter must derive the intended evidence
target from repository configuration and the event payload; it must not assume
that `GITHUB_SHA` is `headSha`. For a `merge_group` event, `testedSha` is the
merge-group SHA. The receipt retains all revisions so a maintainer can explain
what was evaluated.

## Policy authority

Only a trusted base `patchgate.yml` or native GitHub control can produce a
blocking requirement. Prose files remain discovery-only and can produce
`advisory` or `needs_confirmation` findings.

The adapter records a `PolicySource` for every source:

```ts
type PolicySource = {
  kind: "patchgate" | "codeowners" | "ruleset" | "branch_protection";
  identity: string;
  revision: string;
  digest: string;
  contractDigest?: string;
  authority: "enforced";
};
```

The trusted policy artifact constructor parses raw base-policy bytes once and
derives both `digest` (raw bytes) and `contractDigest` (the canonical
normalized enforceable policy). The evaluator recomputes the normalized
contract digest and reports `policy_ambiguous` when the source record does not
match it. This is an internal-consistency check, not a signature or
authentication proof: a caller that fabricates a complete local snapshot can
fabricate both claims. Authenticated GitHub retrieval remains a G3 adapter
responsibility.

## Evidence strength

An evidence item must carry:

```ts
type CheckEvidence = {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: string;
  testedSha: string;
  appSlug?: string;
  appId?: number;
  checkRunId?: number;
  workflowId?: number;
  workflowPath?: string;
  workflowRunId?: number;
  workflowRunAttempt?: number;
  event?: string;
  sourceStrength: "github_app_expected" | "github_actions_workflow" | "unattributed";
  retrievedAt: string;
};
```

The evaluator checks completion, acceptable conclusion, exact `testedSha`,
and configured source identity. An Action-only release can report
`github_actions_workflow`; it cannot claim a distinct PatchGate App source.
Stable workflow identity and immutable App check-run identity remain required
before live GitHub evidence can be treated as fully attributable.
Repositories that require the stronger `github_app_expected` mode must receive
an explicit unsupported/evidence-missing result until the App adapter exists.

## Receipt determinism

The pure core produces a normalized receipt from a canonical input snapshot.
The snapshot digest is calculated after sorting object keys and preserving
semantically meaningful array order. `retrievedAt` on check evidence and
`evaluatedAt` on the delivery envelope are audit metadata. They are retained
for traceability but removed from `decisionInputDigest` and `receiptDigest`.
`receiptDigest` is calculated after the receipt is assembled and is validated
against the canonical receipt core before it is returned.

The outer delivery adapter may add `evaluatedAt`, URLs, and API retrieval
metadata. This distinction lets fixtures replay the decision without falsely
claiming that two wall-clock envelopes are byte-identical.

## Native control boundaries

PatchGate should consume native semantics rather than create shadow semantics:

- use GitHub’s effective rulesets and branch-protection data for merge controls;
- use base-branch CODEOWNERS and authenticated qualification data for owner
  requirements;
- use linked-issue metadata where available; treat body regex matches as clues;
- use active review state and target-SHA freshness rather than counting every
  `APPROVED` review;
- include `merge_group` handling whenever a required workflow participates in a
  merge queue.

## Action-only versus App-backed deployment

| Mode | What can be proven | What cannot be claimed |
| --- | --- | --- |
| Local CLI | Pure evaluator behavior from a supplied snapshot | Live GitHub state |
| Action, metadata-only | Base-policy read, API evidence normalization, workflow identity | Independent PatchGate App source |
| GitHub App + evaluator | App-owned check source and authenticated API boundary | Code correctness or universal governance compliance |

The first implementation in this repository supports the first mode and
defines the observation/provenance contract for the second. Prompt 2 local
fixtures prove only normalized snapshot consistency and replay; they do not
prove authenticated GitHub retrieval, merge protection, or Action safety.
