# PatchGate evidence review packet

This is a small, reproducible starting point for reviewing PatchGate without
installing a GitHub Action or connecting a real repository.

## Run the ready case

From a clean checkout:

```bash
npm install
npm run build
node dist/src/cli.js evaluate \
  --event fixtures/pr-ready.json \
  --report /tmp/patchgate-ready-receipt.json
```

The expected final status is `ready_for_review`.

The fixture deliberately exposes the evidence that produced that result:

- policy is bound to `base-sha`;
- the required `unit` check is successful;
- the check is bound to `head-sha`;
- the linked issue is represented as GitHub metadata;
- the reviewability signal is within the configured advisory budget.

## Inspect the non-ready cases

The security suite covers wrong workflow identity, stale or duplicate check
evidence, incomplete observations, forged receipts, stale approvals and
privileged workflow hazards:

```bash
npm run test:security
```

The relevant fixtures are listed in `fixtures/manifest.json` and the assertions
are in `test/security.test.ts`. A non-ready result is intentional when the
required evidence cannot be bound to the correct revision or source.

## Question for maintainers

After running the ready case, please answer one question in the related
Discussion:

> Is it clear which evidence made this result ready, and which missing or
> mismatched evidence would change it to `evidence_missing`?

If the answer is no, please point to the first field or remediation sentence
that is hard to interpret. That feedback is more useful than a general vote.
