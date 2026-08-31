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

If the first-use question is worth observing on a real public repository, use
the [shadow pilot interest form](https://github.com/daichunghy/patchgate/issues/new?template=pilot-interest.yml)
and read the [pilot intake guide](community/pilot-intake.md) before changing
the workflow.

This walkthrough proves a setup path. It does not prove that PatchGate is
popular, production-ready, or useful for every repository shape.
