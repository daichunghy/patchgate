# Maintainer demo script

This script turns the recorded local evidence path into a short screen
recording or live walkthrough. It uses commands and fixtures already in the
repository. The demo shows what PatchGate can verify; it does not simulate a
live external installation or a production merge gate.

## Recording brief

| Item | Choice |
| --- | --- |
| Audience | OSS maintainer or repository administrator |
| Length | 60–90 seconds |
| Promise | See the evidence behind one review-readiness result |
| Setup | Clean checkout, Node 20+, no GitHub token |
| Link | [evidence review packet](evidence-review-packet.md) |
| Status line | “The current public beta is shadow-only.” |

## Shot list

### 0–10 seconds — the question

On screen:

> Before I spend review time on a PR, which evidence is actually present?

Say:

> PatchGate checks that narrow question. It does not review the code or decide
> whether the change should merge.

### 10–30 seconds — run the ready case

Show the terminal and run:

```bash
npm ci
npm run build
node dist/src/cli.js evaluate \
  --event fixtures/pr-ready.json \
  --report /tmp/patchgate-ready-receipt.json
```

Point to the final status:

```text
ready_for_review
```

The fixture binds policy to `base-sha`, the required check to `head-sha` and a
linked issue to GitHub metadata. The output is a local fixture result, not live
GitHub evidence.

### 30–55 seconds — show the receipt

Run:

```bash
node -e "const r=require('/tmp/patchgate-ready-receipt.json'); console.log(JSON.stringify({status:r.final.status,baseSha:r.revisions.baseSha,headSha:r.revisions.headSha,testedSha:r.revisions.testedSha,receiptDigest:r.receiptDigest},null,2))"
```

Highlight `baseSha`, `headSha`, `testedSha` and `receiptDigest`. The point is
not that the receipt is a signature. The point is that the decision explains
which revision and evidence it used.

### 55–75 seconds — show the boundary

Run:

```bash
npm run test:security
```

Say:

> The security fixtures cover stale, foreign, duplicate and incorrectly sourced
> evidence. A green result from the wrong commit is still the wrong evidence.

Do not claim that this command proves the code is secure. It exercises the
repository's documented threat probes.

### 75–90 seconds — close honestly

On screen:

> Public beta. Shadow-only. Start with the evidence packet.

Say:

> The current beta is for a non-blocking observation. The npm package is
> unpublished and external repository usage is not claimed.

End on the evidence packet link, not a request for stars or endorsements.

## Caption drafts

### English

> A 90-second PatchGate walkthrough: run the ready fixture, inspect the receipt,
> then look at the stale and foreign evidence probes. The current public beta
> is shadow-only. The local path needs no GitHub token.

Link: <https://github.com/daichunghy/patchgate/blob/main/docs/community/evidence-review-packet.md>

### Vietnamese

> Demo ngắn PatchGate: chạy fixture ready, xem receipt, rồi kiểm tra các tình
> huống evidence cũ hoặc sai commit. Beta hiện chỉ chạy shadow; walkthrough local
> không cần GitHub token.

Link: <https://github.com/daichunghy/patchgate/blob/main/docs/community/evidence-review-packet.md>

## Presenter checklist

- [ ] Start from a clean checkout or say exactly which checkout was used.
- [ ] Keep the command and captured output visible long enough to read.
- [ ] Say “local fixture” when showing the ready result.
- [ ] Say “shadow-only” when mentioning the public beta.
- [ ] Do not show tokens, private repository content or unredacted pull-request
      bodies.
- [ ] Do not call the receipt signed, tamper-proof or a compliance attestation.
- [ ] Record the final URL and publication state as `draft` or `published`.
