# Authenticated GitHub snapshot contract

The adapter converts authenticated, read-only GitHub metadata into the same
validated `EvaluationInput` consumed by the deterministic evaluator. It keeps
the richer immutable identity outside the legacy scalar input in a
`SnapshotIdentity` and returns it beside the snapshot envelope.

## Local replay

```bash
npm run build
node dist/src/cli.js github snapshot \
  --mock-fixture fixtures/api/happy-path.json \
  --output /tmp/patchgate-github-snapshot.json
```

The mock transport is keyed by method, path, query, operation, and variables.
It rejects unexpected requests and proves that the finalization pass consumed
the recorded responses. The fixture contains no token, PR body, review body,
comment, workflow log, artifact, or source-code payload.

## Live read-only invocation

Live retrieval requires an explicit opt-in and an environment token:

```bash
PATCHGATE_GITHUB_TOKEN='read-only-token' \
  node dist/src/cli.js github snapshot \
  --live --repo OWNER/REPOSITORY --pull 123 --target head \
  --output /tmp/patchgate-github-snapshot.json
```

The command refuses live mode without `--live` and refuses to run without the
environment token. This workspace did not execute that command.

## Envelope and status

The output contains `identity`, `capability`, request `metrics`, diagnostics,
the normalized `snapshot`, and the evaluator's final status. A rejected build
contains a stable diagnostic and exit code 2. A complete but non-ready
evaluation returns exit code 1; `ready_for_review` returns exit code 0.

`ready_for_review` means that the declared, represented requirements passed. It
does not mean that the code is correct, that a human read it, or that a native
GitHub control was bypassed.

## Target and authority decisions

- Policy and CODEOWNERS are read at the PR base SHA, never from the proposed
  head.
- Head target evidence is bound to the PR head SHA. Merge target evidence is
  bound to the immutable merge SHA returned by GitHub.
- Initial identity and decision-bearing observations are re-read during
  finalization. A changed identity or normalized observation discards the
  snapshot.
- The current scalar evaluator cannot represent authenticated merge-group
  membership; merge-group requests are explicitly unsupported.
- Rulesets and branch protection are normalized for capability reporting. An
  applicable active decision-bearing native control is rejected until the
  evaluator has a versioned native requirement contract.

The contract decisions are recorded in
[`docs/decisions/2026-08-13-g3-contract.md`](decisions/2026-08-13-g3-contract.md).
