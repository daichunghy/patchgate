# Getting started

PatchGate is a public pre-release. The npm package is unpublished
(`private: true`, `0.1.0-dev`). The current Action release is `v0.1.0-beta.5`,
which is for shadow evaluation only — not production, not a `v0.1` claim, and
not evidence of external pilots. Pin commit
the immutable commit SHA shown on its release page.

This walkthrough uses a clone and a local build. Do not run `npx patchgate`:
that npm name is a different project. The direct GitHub install is available
for the beta release, while the CLI remains an unpublished npm package.

## 1. Clone and build

Requires Node.js 20 or later.

```bash
git clone https://github.com/daichunghy/patchgate.git
cd patchgate
npm ci
npm run build
node dist/src/cli.js --help
```

`--fail-on` defaults to `blocked` (same as the Action): `blocked`,
`evidence_missing`, and `policy_ambiguous` exit 1. `human_review_required`
does not fail until the threshold is raised.

`evaluate` writes a receipt with `--report` (or `--output`, the shared
write-path alias). `github snapshot` and `support-bundle` write files with
`--output` only. Giving `evaluate` both flags with different paths exits 2
(`REPORT_OUTPUT_CONFLICT`).

## 2. Init a draft policy

```bash
node dist/src/cli.js init --path /tmp/patchgate-try
```

`init` writes a version-1 draft with commented copies of the six supported
rule classes and refuses to overwrite an existing file. Comments are
documentation only; the parsed policy is `version: 1` until you uncomment a
block. The draft does not enable a GitHub check or change a ruleset.

To write `.github/patchgate.yml` instead of a root file:

```bash
node dist/src/cli.js init --path /tmp/patchgate-try --github-dir
```

## 3. Validate

```bash
node dist/src/cli.js validate --policy /tmp/patchgate-try
node dist/src/cli.js validate --base /tmp/patchgate-try --json
```

`--base` is an alias of `--policy` on `validate` so the same flag used by
`preflight` and `doctor` works here.

## 4. Preflight

```bash
node dist/src/cli.js preflight --base docs/patchgate.example.yml
node dist/src/cli.js preflight --base docs/patchgate.example.yml --json
```

`--base` may be a policy file, a directory that contains `patchgate.yml` or
`.github/patchgate.yml`, or a Git ref. A filesystem path is local-file mode.
Otherwise, if the current directory (or `--repo`) is a Git work tree, PatchGate
reads `patchgate.yml` / `.github/patchgate.yml` from that revision with Git
objects — it does not check out or execute pull-request code.

```bash
node dist/src/cli.js preflight --base main
node dist/src/cli.js preflight --base origin/main --repo .
```

Discovery findings (`README.md`, `AGENTS.md`, …) are advisory,
needs-confirmation, or unsupported — never enforcement by themselves.

## 5. Doctor

```bash
node dist/src/cli.js doctor --base docs/patchgate.example.yml
node dist/src/cli.js doctor --base docs/patchgate.example.yml --json
```

`doctor` reports local capability without a GitHub token. Exit 0 means
ready for local preflight; exit 1 means attention is needed. Missing
`package.json` is informational and does not fail a non-JS repository.

## 6. Evaluate a fixture

```bash
node dist/src/cli.js evaluate --event fixtures/pr-ready.json
```

This consumes a normalized evaluation-input snapshot, not a raw GitHub
event. Stdout is a receipt with `final.status: ready_for_review` (exit 0).
Add `--report /tmp/patchgate-receipt.json` (or `--output`, the alias) only if
you want the same JSON written to a file (stdout is then empty).

To inspect a blocked case without failing the process:

```bash
node dist/src/cli.js evaluate --event fixtures/evaluator/evidence/complete-zero-linked-issues.json --fail-on never
```

## Next steps

- [Example policy](patchgate.example.yml)
- Next: copy the shadow YAML in [Action usage](github-action-usage.md) (section 1 only). Do not copy section 2 yet.
- The G4 runbook is for a consented install after that YAML works.

Do not treat a local fixture run, a recorded adapter replay, or this
repository's own shadow workflow as downstream adoption.
