# GitHub adapter security boundary

The adapter is a metadata collector. It does not checkout, install, build,
test, source, or execute pull-request code. It does not trust PR prose,
comments, artifacts, status names, or workflow claims as authority.

```text
trusted metadata lane
  authenticated GitHub API + base-SHA policy + native metadata
  -> normalized immutable observations

untrusted verification lane
  contributor code, if a future workflow needs it
  -> isolated read-only job with no repository secrets

trusted decision lane
  normalized observations + evaluator
  -> receipt/check result
```

## Implemented controls

- The REST origin must be HTTPS, credential-free, and path-free; redirects are
  not followed.
- REST and GraphQL requests are allowlisted. The GraphQL document is fixed and
  accepts only typed variables.
- Tokens are held in a closure, not serialized into requests, fixtures,
  diagnostics, or CLI arguments.
- Response headers are allowlisted. Bodies are parsed as `unknown`, bounded by
  a response byte limit, and normalized through field-level parsers.
- Pagination is same-origin, bounded, and rejects repeated page or item
  identities.
- Retry, request, page, item, response-byte, and cumulative-sleep budgets are
  recorded in the snapshot metrics.
- Redaction removes credential-shaped keys, bodies, comments, artifacts, logs,
  and secret-like query values before report output.
- Base policy bytes, check/workflow SHA relations, reviewer/team IDs, and
  observation digests are bound before evaluation.
- Identity and decision-bearing observations are re-read before a snapshot is
  accepted.

## Residual boundaries

The current local/mock evidence does not prove a live credential's effective
permissions, GitHub response behavior, or mutation race. It also does not
implement an Action publisher, a verification runner, artifact attestation,
merge-group membership, persistent cache, or GitHub Enterprise Server support.
These are explicit residuals, not implied capabilities.
