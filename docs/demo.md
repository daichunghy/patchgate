# PatchGate CLI — real captured walkthrough

For a short recording or live maintainer walkthrough, use the
[90-second demo script](community/maintainer-demo-script.md). The output below
remains the source for the captured commands and results.

Everything below is real output captured on 2026-08-22 from the CLI built at
that day's `main`, run against this repository and its recorded fixtures. No
output is staged or edited.

## Install without cloning

The package is not on npm yet (and `npx patchgate` belongs to a different
project), but on Node 20+ it installs directly from GitHub:

```bash
npm install github:daichunghy/patchgate
```

`npm install` clones the repository, runs its `prepare` script (a full
TypeScript build) and links the `patchgate` binary. With `npx` you can skip
the install step entirely:

```bash
npx github:daichunghy/patchgate --version
```

```text
patchgate v0.1.0-dev
```

## doctor — is this repository usable for local preflight?

```bash
patchgate doctor --base /path/to/your/repo
```

```text
PatchGate doctor
Status: ready_for_local_preflight
Target: /Users/macos/Desktop/Github
Checks:
- PASS policy: PatchGate policy is valid (/Users/macos/Desktop/Github/.github/patchgate.yml)
- PASS git_repository: Git repository metadata is present (/Users/macos/Desktop/Github/.git)
- PASS package: package.json is readable (patchgate)
- PASS network: Network is not required for local doctor checks (Authenticated GitHub retrieval is not being claimed.)
Next:
- Run `patchgate preflight --base <policy-path>` to inspect the validated policy.
```

Note the honesty of the last check: local doctor proves nothing about
authenticated GitHub access.

## preflight — what policy governs a PR against this base?

```bash
patchgate preflight --base main --repo .
```

```text
PatchGate preflight
Status: valid local policy
Mode: trusted Git ref (local object)
Policy: .@main:.github/patchgate.yml
Rules: issue-linkage=on, checks=1, ownership=on, sensitive-paths=1, policy-changes=on, reviewability=on
Policy digest: sha256:366cfc0738e380db9e4309a3d7751a7ccb97ea83d0f87e3d56e58c5b2b8b92e1
Contract digest: sha256:1269792d509ca225706a6538d6fa0c0c305c64fb619a6a9a065abac16776f11d
Authority: read from the supplied local Git base revision; this is not authenticated GitHub evidence
Enforcement: not enabled
Discovery-only guidance: AGENTS.md [needs_confirmation], README.md [advisory] (never enforcement)
Guidance AGENTS.md: Directive-like governance language was discovered but is not enforceable from prose. Diagnostic=DISCOVERY_NEEDS_CONFIRMATION. Remediation: Confirm an intended rule in patchgate.yml or the native GitHub control before relying on it.
Guidance README.md: Guidance was discovered for human context only. Diagnostic=DISCOVERY_ADVISORY. Remediation: Review the guidance and keep each enforceable rule in trusted structured policy.
Next:
- Confirm the Git ref and commit are the intended trusted base before evaluating a pull request.
- Use `patchgate validate --policy <path>` after editing the file.
- Local preflight does not configure or change GitHub enforcement.
```

The policy is read from the trusted base revision, and prose guidance stays
advisory — it can never become enforcement by itself.

## evaluate — deterministic receipt from a normalized snapshot

```bash
patchgate evaluate --event fixtures/pr-ready.json
```

```json
{
  "final": {
    "status": "ready_for_review",
    "reasonIds": []
  },
  "receiptDigest": "sha256:3c7cedea87fe26a47...",
  "requirements": [
    { "id": "check.unit", "result": "passed" },
    { "id": "issue.linkage", "result": "passed" },
    { "id": "policy.base_revision", "result": "passed" },
    { "id": "reviewability.files", "result": "passed" }
  ]
}
```

Exit codes follow the same thresholds as the Action: with the default
`--fail-on blocked`, the step fails for `blocked`, `evidence_missing` or
`policy_ambiguous` receipts; use `--fail-on never`,
`--fail-on human_review_required` or an exact status to tune it in CI:

```bash
patchgate evaluate --event snapshot.json --fail-on never
```

The same evaluator powers the GitHub Action; see the
[Action usage guide](github-action-usage.md) for the shadow-mode workflow.
