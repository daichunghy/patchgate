# AGENTS.md

This repository builds PatchGate, an open-source review-readiness gate for pull requests.

Read `PROJECT_CONSTITUTION.md` completely before substantive work.

## Product identity

PatchGate helps maintainers decide whether a pull request has earned human review time.

It inspects trusted repository policy, pull-request metadata, changed paths, ownership requirements, and CI evidence. It produces a machine-readable `ContributionReceipt` that explains one of these states:

- `ready_for_review`
- `blocked`
- `human_review_required`
- `evidence_missing`
- `policy_ambiguous`

PatchGate is not an AI-authorship detector, code-correctness oracle, generic code-review bot, SaaS compliance product, replacement for GitHub Rulesets, or replacement for a maintainer's judgment.

Its promise is narrower and testable:

> A contribution must show the required evidence, ownership, and review boundaries before it is represented as ready for maintainer review.

## Authority model

Only explicit, trusted inputs may create an enforcement requirement.

Enforceable inputs, read from the pull request's trusted base revision or GitHub's authenticated API, are:

1. `patchgate.yml` at the base commit;
2. GitHub Rulesets and branch protection state;
3. `CODEOWNERS` at the base commit;
4. trusted check-run and workflow metadata bound to the tested commit;
5. GitHub pull-request metadata, reviews, labels, linked issues, and merge state.

`AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, README files, PR templates, and AI contribution policies are discovery inputs only. PatchGate may extract and display candidate rules from them, but must classify them as `advisory` or `needs_confirmation`; it must never turn prose into a blocking rule without explicit maintainer confirmation in `patchgate.yml` or a native GitHub control.

The policy source is always the base commit. A change proposed in a PR does not govern that same PR. Receipts must record the base SHA and digest of every policy input used.

## First product scope

The first complete release provides a CLI and GitHub Action built on the same deterministic evaluator.

```bash
patchgate preflight --base origin/main
patchgate evaluate --event pull_request.json --report receipt.json
```

```yaml
- uses: patchgate/action@v1
  with:
    fail-on: blocked
```

The first supported rule classes are:

- issue linkage and PR-body completeness;
- required check evidence tied to the correct head SHA;
- changed-path ownership and required human approval;
- policy-change detection and trusted-base policy digest;
- explicit human handoff for sensitive paths;
- configurable reviewability budget: changed files, ownership domains, generated files, and declared subsystem boundaries.

Reviewability is advisory by default. It becomes merge-blocking only when a maintainer explicitly configures it as such.

## Human handoff

PatchGate cannot force an external coding agent to stop creating or editing a pull request. It can require that a qualified human reviewer approves before merge, and report that boundary to agents and humans.

Never describe `human_review_required` as proof that a human has reviewed the code. It means a declared human gate remains unsatisfied.

## Contribution receipt

Each evaluation emits a versioned JSON `ContributionReceipt` containing at least:

- evaluator version and receipt schema version;
- repository, PR number, base SHA, and head SHA;
- trusted policy sources and their digests;
- checks, workflows, and evidence used, including commit binding;
- each requirement, authority source, result, and remediation;
- changed paths, ownership domains, and reviewability signals;
- required human gates and current approval state;
- final status and evaluation timestamp.

Do not say a receipt is cryptographically signed, tamper-proof, or a compliance attestation unless the exact signing, storage, identity, and verification path has been implemented and tested. GitHub artifact attestations may later be referenced as one evidence source; they do not prove all contribution-policy compliance by themselves.

## Security architecture

PatchGate operates at a hostile trust boundary: pull-request code and contributor-controlled data are untrusted.

Separate these lanes:

```text
metadata and policy lane
  -> trusted base policy and GitHub metadata
  -> never checks out or executes pull-request code

untrusted verification lane
  -> executes contributor code only with read-only permissions,
     no repository secrets, and isolated/ephemeral compute

trusted decision lane
  -> consumes authenticated metadata and verified evidence only
  -> posts the PatchGate check result
```

Do not check out, install, build, test, source, or execute pull-request code in a privileged `pull_request_target` or similarly trusted context. Do not download and trust an artifact merely because a pull request produced it. Model threat scenarios including status-check spoofing, policy self-relaxation, forged evidence, edited comments, workflow confusion, malicious artifacts, and stale approvals.

When a PatchGate result is configured as a required status check, document and test the GitHub expected-source setting so that another app or actor cannot impersonate the check.

## Architecture

Begin with one TypeScript repository and one public package. Keep modules internal until an external consumer requires an independently versioned API.

```text
src/
  discovery/       locate and classify repository guidance
  policy/          parse explicit PatchGate and native policy sources
  contract/        canonical contribution contract and authority metadata
  evaluator/       deterministic rule evaluation and remediation
  evidence/        check/workflow evidence binding and receipts
  risk/            explainable advisory reviewability signals
  github/          GitHub API/event boundary
  cli/             preflight and local evaluation commands
  action/          GitHub Action entrypoint
fixtures/
test/
docs/
```

Do not build a dashboard, database, hosted service, LLM rule engine, policy catalogue, cryptographic ledger, or multi-platform integration before the GitHub CLI/Action proves useful on real repositories.

## Implementation rules

- TypeScript strict mode is mandatory; production code must not use `any`.
- Core policy evaluation must be deterministic, pure where practical, and testable from local fixtures.
- Separate discovery results from enforceable requirements in types and UI.
- Include authority and base SHA in every policy-derived result.
- Never make a green result merely because no policy was discovered; return `policy_ambiguous` when relevant governance inputs conflict or are incomplete.
- Never convert an unverified test claim in a PR body into evidence.
- Bind test/workflow evidence to the actual head SHA or merge-group SHA according to the configured merge flow.
- Make every block actionable with a precise remediation path.
- Do not calculate review risk from diff size alone. Show the contributing signals and allow maintainers to tune/disable thresholds.
- Keep API permissions minimal and document every permission needed by the Action or GitHub App.

## Testing requirements

Maintain fixtures for at least:

- policy source changed in the PR but not trusted until merged;
- policy source digest mismatch;
- protected-path change with missing qualified approval;
- stale approval after a head change;
- linked issue missing or invalid;
- check result from the wrong commit;
- duplicate, spoofed, or unexpected check source;
- fork PR with no secrets/read-only token;
- partial or generated-file-heavy change;
- conflicting prose policy and explicit `patchgate.yml` policy;
- receipt schema compatibility and deterministic output.

Before completing a relevant change, run build, typecheck, lint, unit/fixture tests, security tests, and GitHub-integration tests where possible.

## Documentation and claims

Use exact language:

- “blocks merge when configured as a required GitHub status check,” not “blocks pull requests”; 
- “requires a qualified human approval,” not “forces an agent to hand off”; 
- “verified workflow evidence for commit SHA,” not “proof the code is correct”; 
- “policy discovery” for prose extraction, not “policy compilation” unless the rule is explicitly structured and confirmed.

The Open Contribution Governance Corpus is a later research asset. It must use legally reusable or opt-in repository policy material, preserve provenance, avoid storing private data, and not be treated as a product prerequisite.

## Definition of done for the first public release

`v0.1` is complete only when:

- CLI preflight shows a repository's discovered guidance, trusted policy sources, and unresolved ambiguity;
- Action evaluation enforces all six declared rule classes deterministically;
- every receipt is machine-readable, reproducible from fixtures, and binds policy/evidence to base/head SHAs;
- policy changes in a PR cannot relax rules for that PR;
- sensitive-path rules require the configured human owner before merge;
- untrusted PR code never executes in the privileged policy/decision lane;
- required-check source spoofing and stale/incorrect evidence cases are tested;
- documentation gives a safe GitHub workflow and minimal-permission configuration;
- at least two external public repositories have piloted the CLI or Action and supplied feedback;
- supported and unsupported policy behavior is documented without claiming universal repository-rule interpretation.

