# PatchGate Case Lab

The Case Lab is a small, replayable set of governance situations. It shows
what PatchGate can decide today without requiring GitHub credentials, a live
pull request, or execution of contributor-controlled code.

## Run the lab

From a fresh clone on Node.js 20 or later:

```bash
npm ci
npm run case-lab
```

`case-lab` runs the same 53-entry fixture manifest used by the repository's
compatibility tests. Every entry has a named scenario, an expected status or
contract diagnostic, and an oracle assertion. A green run proves deterministic
fixture compatibility; it does not prove live GitHub integration or external
adoption.

To see a complete receipt directly:

```bash
npm run build
node dist/src/cli.js evaluate --event fixtures/pr-ready.json
```

The command above is the smallest successful path. It produces
`ready_for_review` from a normalized snapshot and does not contact GitHub.

## Core scenarios

| Scenario | Fixture manifest entry | Expected result | What a maintainer learns |
| --- | --- | --- | --- |
| Ready contribution | `valid-ready` | `ready_for_review` | The required check, issue linkage, policy revision, and reviewability evidence are present. |
| Missing issue linkage | `complete-zero-linked-issues` | `blocked` | A valid check cannot compensate for a required linked issue that is absent. |
| Incomplete check observation | `incomplete-checks-with-success` | `evidence_missing` | A green-looking check is not enough when the check collection is incomplete. |
| Human gate not satisfied | `same-actor-duplicate-approval` | `human_review_required` | Duplicate approval by one actor does not satisfy a two-person sensitive-path gate. |
| Policy digest mismatch | `policy-object-digest-mismatch` | `policy_ambiguous` | PatchGate refuses to treat a policy object as trusted when its digest does not match. |
| Unsupported input | `unsupported-input-version` | contract rejection | An unsupported schema version fails closed instead of being guessed. |

The JSON files under `fixtures/**` are scenario descriptors. They are not raw
evaluation snapshots to be passed directly to `evaluate`; the fixture test
harness derives each normalized input from a trusted base fixture and checks
the expected oracle in [fixtures/manifest.json](../fixtures/manifest.json).

## Add a scenario

Add a scenario only when it represents a real governance edge case or a
documented product boundary:

1. Add a descriptor with a unique `scenario` value under the appropriate
   `fixtures/` directory.
2. Add the derived input and expected outcome to
   [test/fixture.test.ts](../test/fixture.test.ts).
3. Add a manifest entry with the status, reason IDs, requirement results, or
   contract diagnostic that must remain stable.
4. Run `npm run case-lab` and `npm run verify`.
5. Explain the user-facing remediation in the pull request.

Scenario contributions are intentionally safer than changes to the evaluator
or privileged GitHub adapter. Do not turn a fixture or prose suggestion into a
new blocking rule without an explicit contract change and maintainer review.

## What to record from a real first use

When a person runs the Case Lab or the Action in a repository outside this
project, record only the minimum redacted evidence:

- version or immutable commit;
- time to the first useful result;
- the first confusing or failed step;
- whether the receipt changed what the person reviewed;
- consent to publish a redacted summary.

Those observations belong in the first-use feedback path. A local Case Lab run
is a product demonstration, not a pilot or an adoption claim.
