# G3 live smoke record

**Date:** 2026-08-20
**Target:** public `daichunghy/patchgate#9` head target
**Operation:** authenticated GitHub snapshot harness; GET-only execution path
**Credential:** local GitHub CLI credential; token value not recorded
**Writes:** none

## Result

The live smoke reached GitHub and safely rejected the target after
approximately 7.2 seconds:

```text
Diagnostic: [GITHUB_API_UNSUPPORTED]
An applicable decision-bearing native control cannot be represented by the
current EvaluationInput/evaluator contract.

Smoke Test Summary: 0 Built/Passed, 1 Rejected, 0 Failed
```

This is diagnostic evidence, not a passing complete snapshot. No
`EvaluationInput`, `ContributionReceipt` or live status was produced for the
target, and the harness did not write a check, comment, status, artifact,
workflow, ruleset or branch-protection setting.

## Why it rejected

Live branch protection currently requires five CI contexts and one approving
pull-request review. The current scalar contract normalizes native controls but
does not compile active decision-bearing branch-protection or ruleset semantics
into evaluator requirements. It therefore rejects instead of treating those
controls as absent or guessing their meaning.

## What this proves

- the authenticated adapter reached a real public repository and PR;
- the native-control boundary is enforced at runtime, not only in fixtures;
- unsupported decision-bearing controls fail closed;
- the current G3 contract is not yet a complete live integration.

## Follow-up run: native branch-protection contract

After the initial rejection, the local candidate added a versioned contract for
branch-protection required checks, required approving reviews, applicable
CODEOWNERS gates and the supported Rulesets `required_status_checks`/
`pull_request` subset. It also added the base-policy path fallback for
`.github/patchgate.yml`, normalized GitHub's direct `Issue` GraphQL nodes, and
made workflow-run evidence references unique per check name.

The same authorized GET-only harness then reached public
`daichunghy/patchgate#9` on PR head `2a28e82`:

```text
API Metrics: 24 attempted requests (695088 bytes transferred)
Identity bound: Base=a3745f6, Tested=2a28e82
EvaluationInput conforms to schema v0.1
ContributionReceipt conforms to schema v0.1
Evaluator final status: human_review_required
Receipt Digest: sha256:4a3eebd6053a8a56eef4d17e16a939193a35b218a0aa56a0b2d49b3102e4c0f9
Smoke Test Summary: 1 Built/Passed, 0 Rejected, 0 Failed
```

The non-ready status is expected for this target and is not a product failure:
the PR has no independent approving review, no applicable CODEOWNERS approvals
and no linked issue; reviewability overruns remain advisory. The receipt keeps
those facts visible, and the final `human_review_required` status follows the
declared status precedence. The GraphQL observation is complete and produced
no API diagnostic. The run performed no GitHub writes. The implementation is
now on the public PR head; a post-merge smoke is still required for default-
branch/public-release proof.

The current G3 boundary is therefore narrower and verified: branch-protection
checks, approval gates and the supported Rulesets required-check/review subset
are represented; unsupported Ruleset semantics, merge-group membership and
immutable last-pusher/review-thread evidence remain fail-closed.

## Follow-up run — current PR head `e6af172` (2026-08-22)

The same authorized GET-only harness was rerun against the current public PR
head after the Full Verify, Action-entrypoint, release-ordering and dossier
validator fixes:

```text
API Metrics: 24 attempted requests (755762 bytes transferred)
Identity bound: Base=a3745f6, Tested=e6af172
EvaluationInput conforms to schema v0.1
ContributionReceipt conforms to schema v0.1
Evaluator final status: human_review_required
Receipt Digest: sha256:5351949e542c511b3ea2a0967a157d301cd837211ab1b940e1dd013fb6a4f8b6
Smoke Test Summary: 1 Built/Passed, 0 Rejected, 0 Failed
```

The result is current PR evidence, not a default-branch release or external
consumer pilot. It confirms that the current head remains evaluable through the
authenticated read-only adapter and retains the real missing human approval,
linkage and ownership evidence. No GitHub write was performed. A post-merge
smoke is still required before claiming default-branch integration.
