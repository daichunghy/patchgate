# Tested-SHA feedback follow-up — 2026-08-27

**Scope:** Investigate the public feedback from `rghetu283` on PatchGate
Discussion #29 and implement the smallest contract-preserving improvement that
can be verified locally.

**Validation level:** current source, public-source research, fixture tests and
repository verification. This record is not evidence of an external pilot or
an installation in QAOnFire.

## Research conclusion

`rghetu283`'s reply to [Discussion
#29](https://github.com/daichunghy/patchgate/discussions/29) identified two
useful practices: show the tested SHA in visible Check Run output and ensure a
successful result is produced only for the actual pull-request head.

The public [QAOnFire site](https://qaonfire.dev/) and [documentation](https://qaonfire.dev/docs.html)
describe QAOnFire as a GitHub App that reads a pull request and posts a
detailed QA report as a pull-request comment. The live GitHub App metadata for
[`qaonfire`](https://github.com/apps/qaonfire) currently resolves to App ID
`3791637`, with `pull_request` and `issue_comment` events and
`contents:write`, `issues:write`, `metadata:read` and `pull_requests:write`
permissions; it does not request `checks:write`. The
[QAOnFire architecture note](https://dev.to/radu_ghetu_84dd251b3979e4/building-qaonfire-how-i-used-prompt-caching-to-make-ai-qa-reports-affordable-3i1p)
describes the worker posting a comment after reading the PR diff; it does not
establish a PatchGate-verifiable Check Run. This means PatchGate must not treat
the current QAOnFire comment as required-check evidence.

GitHub's current documentation states that required checks must succeed on the
latest commit and that earlier-commit checks do not satisfy the requirement.
The Checks API also models the immutable `head_sha` on each Check Run. The
feedback therefore maps to two separate product responsibilities: GitHub's
required-check semantics provide the merge boundary, while PatchGate makes the
selected SHA observable and rejects an event/API target mismatch before it can
produce a result.

## Gap found in the implementation

The evaluator already enforced `testedSha === headSha` for a `head` target and
the adapter already queried checks for the selected SHA. The remaining gaps
were at the Action boundary:

1. The visible summary showed only a seven-character target prefix, not the
   full tested SHA or an explicit binding statement.
2. The Action resolved the current pull-request identity through the API but did
   not assert that it still matched the event's `pull_request.head.sha`.
3. Downstream steps could read status and digests, but not the exact target
   values without parsing the receipt file.

## Implemented changes

- Added optional `expectedHeadSha` to `GitHubSnapshotRequest`.
- The identity resolver now rejects a live head that differs from that
  event-bound SHA with `GITHUB_TARGET_CHANGED` and a fail-closed remediation.
- The Action passes the event head into the snapshot request and requires a
  non-empty PR event head before making the authenticated snapshot call.
- Check Run and step-summary output now shows full `testedSha`, `headSha`,
  `baseSha`, target kind and whether a head-target binding is exact.
- Added `target-kind`, `tested-sha` and `head-sha` Action outputs.
- Check Run delivery now refuses a payload whose `head_sha` differs from the
  receipt's `testedSha`, and also refuses an invalid head-target receipt.
- Snapshot-rejection Check Runs identify the event PR head SHA without
  presenting the rejected snapshot as a successful evaluation.
- Added regression coverage for event/live head mismatch, full summary output
  and Check Run `head_sha`/text binding.
- Documented that a QAOnFire PR comment is context only. PatchGate will not
  treat it as verified evidence without a Check Run carrying an identifiable
  source and the exact target SHA.

The Check Run name remains stable. A SHA suffix would change the required-check
identity on every commit; the exact binding belongs in `head_sha` and output.

## Acceptance checks

The implementation is accepted only if all of the following remain true:

- a head-target receipt cannot be built with a different `testedSha`;
- an Action event whose head differs from the live API head is rejected before
  evaluation;
- a successful Check Run uses the receipt's exact `testedSha` as `head_sha`;
- the visible summary and machine outputs expose the same exact SHA values;
- a rejected snapshot can produce only the documented neutral/non-ready result;
- `npm run verify` passes, including the bundled Action and consumer fixture.

## Open dependency

There is no public QAOnFire source repository or Check Run contract available
in the current research pass, and no permission has been granted to install an
external App or change that project. A true end-to-end success claim therefore
requires Radu or an authorized maintainer to run the updated Action in a
consenting repository, share the resulting Check Run/receipt, and confirm that
the observed SHA and workflow behavior meet their use case. The current App
permission boundary means that run can validate interoperability and visible
SHA binding, but cannot make a QAOnFire comment itself satisfy a required-check
rule.

## Sources

- [PatchGate Discussion #29](https://github.com/daichunghy/patchgate/discussions/29)
- [QAOnFire](https://qaonfire.dev/)
- [QAOnFire documentation](https://qaonfire.dev/docs.html)
- [QAOnFire GitHub App](https://github.com/apps/qaonfire)
- [QAOnFire architecture note](https://dev.to/radu_ghetu_84dd251b3979e4/building-qaonfire-how-i-used-prompt-caching-to-make-ai-qa-reports-affordable-3i1p)
- [GitHub required-status-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [GitHub Checks API](https://docs.github.com/en/rest/checks/runs)
