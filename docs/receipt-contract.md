# ContributionReceipt contract

The receipt is an explanation of one evaluation. It is not a signature,
attestation, compliance certificate, or proof that code is correct.

The contract has three independent version namespaces: evaluation-input schema
`0.1`, ContributionReceipt schema `0.1`, and evaluator/package version
`0.1.0-dev`. Unversioned input and unsupported versions are rejected before the
pure evaluator with stable diagnostic IDs and CLI exit `2`.

## Required fields

```json
{
  "schemaVersion": "0.1",
  "evaluatorVersion": "0.1.0-dev",
  "repository": { "owner": "example", "name": "service", "pullRequest": 42 },
  "revisions": {
    "baseSha": "base-commit",
    "headSha": "head-commit",
    "testedSha": "head-commit",
    "targetKind": "head"
  },
  "policyDigest": "sha256:...",
  "decisionInputDigest": "sha256:...",
  "receiptDigest": "sha256:...",
  "changedPaths": ["src/service.ts"],
  "policySources": [
    {
      "kind": "patchgate",
      "identity": "patchgate.yml",
      "revision": "base-commit",
      "digest": "sha256:...",
      "contractDigest": "sha256:...",
      "authority": "enforced"
    }
  ],
  "observations": {
    "policySources": [],
    "changedPaths": { "complete": true, "permissionState": "sufficient", "source": { "kind": "github", "identity": "changed-paths" }, "retrievedAt": "2026-08-13T00:00:00Z", "normalizedDigest": "sha256:..." }
  },
  "evidence": { "checks": [], "linkedIssues": [], "reviews": [], "ownershipRequirements": [] },
  "requirements": [],
  "reviewability": {
    "fileCount": 3,
    "ownershipDomains": ["api"],
    "generatedFileCount": 0,
    "boundaryCount": 1
  },
  "humanGates": [],
  "final": { "status": "ready_for_review", "reasonIds": [] },
  "evaluatedAt": "2026-08-13T00:00:00Z"
}
```

The JSON above is an abbreviated excerpt. The actual schema requires all seven
observation groups and the complete evidence arrays shown by the evaluator.

Every decision-bearing observation group carries source identity, revision when
applicable, completeness, permission state, retrieval time, and a digest of
its canonical normalized items. `retrievedAt`, `responseDigest`, and delivery
`evaluatedAt` are audit metadata and do not affect semantic decision digests.
Completeness, permission, source/revision, and normalized item digests do.

## Status semantics

| Status | Meaning |
| --- | --- |
| `ready_for_review` | All enforced requirements passed; advisories may remain |
| `blocked` | An enforceable contribution rule failed and has a concrete remediation |
| `human_review_required` | A declared qualified-human gate remains unsatisfied |
| `evidence_missing` | A required evidence item is absent, stale, foreign, or unverifiable |
| `policy_ambiguous` | Trusted policy is absent, conflicting, or not bound to the base revision |

## Final-status precedence

When multiple conditions are present, PatchGate preserves every requirement
result and chooses the first matching row below:

| Priority | Condition | Final status |
| ---: | --- | --- |
| 1 | An authority or policy requirement is unknown | `policy_ambiguous` |
| 2 | Required evidence is unknown, stale, foreign, duplicate, or unverifiable | `evidence_missing` |
| 3 | A declared qualified-human gate is unsatisfied | `human_review_required` |
| 4 | An enforceable blocking requirement failed | `blocked` |
| 5 | No row above matches | `ready_for_review` |

The evaluator must preserve every requirement result, authority source, target
SHA, remediation, and evidence identity. A summary comment or check output is a
derived view and must not be treated as the complete receipt.

## Requirement result

Each requirement contains:

- stable `id`;
- rule class;
- authority and source identity;
- `passed`, `failed`, `unknown`, or `advisory` result;
- exact observed values where safe;
- remediation text;
- evidence references and revision binding.

Avoid including full PR bodies, review comments, tokens, secrets, or sensitive
personal data in a public receipt. Store only the minimum identifiers needed to
replay or explain the decision.

## Replay rule

Two evaluations are comparable only when `schemaVersion`, `evaluatorVersion`,
the semantic decision input, and policy-source digests match. `retrievedAt`,
`evaluatedAt`, and delivery URLs are audit metadata, not decision inputs.
`decisionInputDigest` excludes those fields. `receiptDigest` hashes the
canonical receipt core, including observation and evidence binding but
excluding its audit timestamps and `evaluatedAt`. Receipt validation also
checks referential integrity: every selected check/review/issue reference must
exist in the receipt, match the target SHA, and support the recorded
requirement or human gate. Rehashing a contradictory receipt does not make it
valid. If an upstream GitHub API changes the normalized snapshot, the receipt
must show the changed `decisionInputDigest`.

Passed required-check results additionally bind the accepted conclusion set,
the selected conclusion, the configured expected source identity, and the
selected immutable run identity. A GitHub App check uses
`check-run:<checkRunId>`. A GitHub Actions run uses
`workflow-run:<workflowRunId>:attempt:<workflowRunAttempt>:check:<encodedName>` so
a rerun attempt and each job/check name remain distinct
cannot alias an earlier run.

Each human gate records its configured positive `requiredCount`. A satisfied
gate must reference exactly the current qualified reviews used by its
requirement, those reviews must match a configured login or immutable team
principal, and their distinct immutable actor count must meet
`requiredCount`.
