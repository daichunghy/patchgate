# Getting started

PatchGate is a public pre-release. The npm package is unpublished
(`private: true`, `0.1.0-dev`). The Action tag `v0.1.0-beta.2` is for
shadow evaluation only — not production, not a `v0.1` claim, and not
evidence of external pilots.

This walkthrough uses a clone and a local build. `npx patchgate` is not
available yet. `npx github:daichunghy/patchgate` was tried against current
`main` and failed: the committed `dist/` contains the Action bundle, not the
CLI binary at `dist/src/cli.js`.

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

`evaluate` writes a receipt with `--report`. `github snapshot` and
`support-bundle` write files with `--output`.

## 2. Init a draft policy

```bash
node dist/src/cli.js init --path /tmp/patchgate-try
```

`init` writes a version-1 draft and refuses to overwrite an existing file.
The draft does not enable a GitHub check or change a ruleset.

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
`.github/patchgate.yml`, or a Git ref (with `--repo`). Policy is read from
the named revision; PatchGate does not check out or execute pull-request
code. Discovery findings (`README.md`, `AGENTS.md`, …) are advisory,
needs-confirmation, or unsupported — never enforcement by themselves.

## 5. Doctor

```bash
node dist/src/cli.js doctor --base docs/patchgate.example.yml
node dist/src/cli.js doctor --base docs/patchgate.example.yml --json
```

`doctor` reports local capability without a GitHub token. Exit 0 means
ready for local preflight; exit 1 means attention is needed.

## 6. Evaluate a fixture

```bash
node dist/src/cli.js evaluate --event fixtures/pr-ready.json --report /tmp/patchgate-receipt.json
```

This consumes a normalized evaluation-input snapshot, not a raw GitHub
event. The ready fixture should print a receipt with
`final.status: ready_for_review` and exit 0.

To inspect a blocked case without failing the process:

```bash
node dist/src/cli.js evaluate --event fixtures/pr-ready.json --fail-on never
```

## Next steps

- [Example policy](patchgate.example.yml)
- [Action usage (shadow only)](github-action-usage.md)
- [G4 shadow-installation runbook](pilots/g4-shadow-installation-runbook.md)

Do not treat a local fixture run, a recorded adapter replay, or this
repository's own shadow workflow as downstream adoption.
