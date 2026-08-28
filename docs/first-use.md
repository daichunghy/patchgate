# First use: get one PatchGate result

The first useful result is a non-blocking check on a real pull request. It
should tell a maintainer what evidence is present and what still needs a human
decision without changing merge eligibility.

## Shadow setup

For a local policy-only first result from this repository, run:

```bash
npm ci
npm run first-use
```

This checks the trusted local `main` Git ref. It does not claim authenticated
GitHub access or replace the Action shadow setup below.

For a repeatable probe against another local clone, use the first-use harness:

```bash
npm run build
node scripts/first-use-preflight.mjs \
  --repo /path/to/clone \
  --base main \
  --json
```

The harness is intentionally read-only. A valid result is reported as
`valid_local_policy` only when the ref resolves to a full commit SHA, the
policy comes from `patchgate.yml` or `.github/patchgate.yml`, and enforcement
is still `not_enabled`. A clone without either policy file is reported as
`missing_trusted_policy` and exits 2; `AGENTS.md`, `CONTRIBUTING.md`, and
README guidance cannot substitute for the trusted policy. For a regression
probe whose missing policy is expected, add `--expect missing-policy`; the
JSON still records the underlying CLI exit 2.

1. Open the [Action usage guide](github-action-usage.md) and create the
   workflow on the repository's default branch.
2. Use `v0.1.0-beta.5`, keep `fail-on: never`, and set
   `create-check-run: true`.
3. Open or update one pull request and read the PatchGate check summary.

The workflow reads trusted metadata. It must not check out or execute
pull-request code in the privileged lane. A standard `GITHUB_TOKEN` cannot
read Administration, so a complete branch-protection or Rulesets snapshot may
remain fail-closed. That is an expected boundary, not a successful evaluation.

## What to record

Record the repository type, beta tag or commit, time to the first check, the
first confusing result, and whether the summary changed what you reviewed.
Use the [first-use feedback form](https://github.com/daichunghy/patchgate/issues/new?template=first-use.yml)
for a redacted report. Do not include tokens, private repository data, or
unredacted pull-request contents.

This walkthrough proves a setup path. It does not prove that PatchGate is
popular, production-ready, or useful for every repository shape.

## Local smoke evidence: contribkit

On 2026-08-27, PatchGate was built locally and run against the existing
`contribkit` Git clone at `/Users/macos/Desktop/Github 2/contribkit`:

```bash
node scripts/first-use-preflight.mjs \
  --repo "/Users/macos/Desktop/Github 2/contribkit" \
  --base main \
  --json
```

Observed result: `missing_trusted_policy`, underlying CLI exit `2`, because
`contribkit@main` resolves to `3c99b426a303d6cbdc168c6dbdb9cfed51a2d00d` but
contains neither `patchgate.yml` nor `.github/patchgate.yml`. This is a local
contract-boundary finding, not a successful first result, external pilot, or
adoption evidence. The next safe action for a maintainer is to add and review
a PatchGate policy in the target repository's base branch, then rerun the
same command; this slice does not edit `contribkit`.
