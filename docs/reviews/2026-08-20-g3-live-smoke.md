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
branch-protection required checks, required approving reviews and applicable
CODEOWNERS gates. It also added the base-policy path fallback for
`.github/patchgate.yml`, normalized GitHub's direct `Issue` GraphQL nodes, and
made workflow-run evidence references unique per check name.

The same authorized GET-only harness then reached public `daichunghy/patchgate#9`
again:

```text
API Metrics: 24 attempted requests (422468 bytes transferred)
Identity bound: Base=a3745f6, Tested=b258924
EvaluationInput conforms to schema v0.1
ContributionReceipt conforms to schema v0.1
Evaluator final status: evidence_missing
Smoke Test Summary: 1 Built/Passed, 0 Rejected, 0 Failed
```

The non-ready status is expected for this target and is not a product failure:
the PR still lacks the required independent approval and applicable ownership
approval, and its issue-linkage/reviewability state is retained as evidence
instead of being guessed away. The run performed no GitHub writes. The result
was produced from the local candidate before its implementation commit was
published; a post-merge smoke is still required for public-code proof.

The current G3 boundary is therefore narrower and verified: branch-protection
checks and approval gates are represented; active decision-bearing rulesets,
merge-group membership and immutable last-pusher semantics remain fail-closed.
