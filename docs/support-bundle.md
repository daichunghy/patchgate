# Redacted support bundle

PatchGate can create a small diagnostic bundle from a GitHub snapshot report or
ContributionReceipt without retaining PR bodies, comments, tokens, workflow
logs, artifacts, or email addresses.

```bash
node dist/src/cli.js support-bundle \
  --input /tmp/patchgate-github-snapshot.json \
  --output /tmp/patchgate-support.json
```

The bundle keeps only support-relevant identity, status, diagnostics,
capability observations, bounded request metrics, observation metadata, policy
source identity/digests, and collection counts. It is a diagnostic artifact,
not a receipt signature, compliance attestation, or proof that the code is
correct.

Before sharing a bundle, review repository names, commit SHAs, changed-path
counts, diagnostic messages, and capability details for the sensitivity of the
repository. The command applies PatchGate redaction and rejects secret-like
control text, but data minimization is still a human responsibility.
