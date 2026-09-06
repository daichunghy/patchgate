# PatchGate Agent Verification Map

**Status:** local operating contract
**Scope:** agent-assisted changes to PatchGate
**Authority:** `docs/PROJECT_CONSTITUTION.md` remains authoritative

This map adapts the verification-first workflow described in the attached
agent-productivity transcript to PatchGate's actual surface area. PatchGate is
a CLI and GitHub Action, not a browser application, so its verification map is
organized around commands, contracts, receipts, GitHub snapshots and workflow
lanes rather than UI selectors.

## Operating principle

PatchGate follows a trust curve:

```text
inspect and reproduce locally
  -> targeted verification
  -> aggregate repository verification
  -> isolated, atomic PRs
  -> bounded parallel work
  -> shadow and pilot evidence
  -> deliberate enforcement
```

An agent report is not evidence by itself. Evidence is the inspected diff,
the relevant test output, the generated artifact where applicable, and the
parent-maintainer verification of the final tree.

## Authority order

Before changing code, read and apply these sources in order:

1. `docs/PROJECT_CONSTITUTION.md` — product boundary and definition of done.
2. `AGENTS.md` — repository operating rules and current evidence limits.
3. `docs/implementation-roadmap.md` — current gate sequence and open evidence.
4. `docs/agent-work-packages.yml` — machine-readable work-package scope.
5. The relevant schema, source module, fixture and test — implementation truth.

Prose discovery files may explain a candidate rule, but they must not become
an enforceable PatchGate requirement without an explicit trusted source.

## Surface map

| Work area | Start here | Minimum verification | Risk boundary |
| --- | --- | --- | --- |
| Policy and contract | `src/types.ts`, `src/policy.ts`, `src/contract/`, `schemas/` | schema, fixture, determinism and typecheck tests | Never infer enforcement from prose |
| Evaluator | `src/evaluator-core.ts`, `src/evaluator.ts` | targeted evaluator/fixture tests, then `npm run verify` | Preserve status precedence and remediation |
| Evidence and receipts | `src/evidence/`, `src/canonical-json.ts` | digest, replay, mutation and schema tests | Keep timestamps outside the pure receipt digest |
| GitHub adapter | `src/github/`, `docs/github-adapter-contract.md` | mock integration, security, redaction, request-budget and TOCTOU tests | Do not execute pull-request code in the trusted lane |
| CLI and onboarding | `src/cli.ts`, `src/cli/`, `docs/getting-started.md` | CLI process smoke, first-use and text/JSON parity | Git-ref policy must come from the trusted base |
| Action | `action.yml`, `src/action/`, `.github/workflows/` | Action tests, bundle, clean-room dist and consumer fixture | Preserve exact `testedSha`, source and event binding |
| Workflows | `.github/workflows/`, `scripts/check-workflow-*` | workflow pin and event checks, then full verify | `pull_request_target` may inspect trusted base only |
| Documentation and release | `README.md`, `docs/`, `scripts/check-*` | link, consumer-doc, release-candidate and application checks | Do not claim release, adoption or pilot without evidence |

## Verification ladder

Use the shortest applicable ladder first, then climb to the aggregate gate:

```bash
# Build the local command surface
npm run build

# First-use / onboarding
npm run first-use

# Targeted contract and behavior checks
npm run test:schema
npm run test:fixtures
npm run test:determinism
npm run test:security
npm run test:github
npm run test:cli

# Action and generated-surface checks
npm run bundle:action
npm run test:consumer-fixture
npm run verify:dist

# Required before handoff
npm run verify

# Run one manifest-backed evaluation task
npm run agent-eval -- AG-01
```

The GitHub event identifier `merge_group` is covered by the merge-group
verification path. `npm run smoke:live` is an authorized read-only evidence step, not a default
local test. It must not be used to imply an external pilot or production
integration.

## PR invariants

Every agent-created change must satisfy all of these invariants:

- one PR has one primary purpose and a reversible diff;
- the agent works in an isolated worktree or an explicitly clean branch;
- existing uncommitted user changes are preserved and never overwritten;
- source files, schemas, fixtures and generated bundles remain synchronized;
- every policy-derived result records authority and the relevant base SHA;
- `testedSha`, `headSha`, `targetKind` and check source remain distinct;
- incomplete, foreign, stale or spoofed evidence fails closed;
- no trusted workflow checks out, installs, builds or executes pull-request code;
- new permissions, network calls, rule classes or public claims require explicit
  justification and appropriate review;
- a passing local test is reported as local evidence, not live integration,
  adoption, release readiness or proof that code is correct.

There is no universal line-count cap. Split work when the change has multiple
independent purposes, ownership domains, rollback paths or evidence stories.

## Bounded parallel work

Parallel work is allowed only when write sets are disjoint. A normal local wave
should start with two or three agents at most and should expand only after the
parent has verified the previous wave. Contract, adapter, Action, security and
release changes are serialized when they share a boundary.

The parent maintainer must:

1. inspect each returned diff;
2. rerun the relevant targeted checks;
3. rerun `npm run verify` after integration;
4. record only verified findings and outputs;
5. close completed agent work before starting another wave.

Timeouts, unsupported tools and unreviewed agent summaries are not completion
evidence.

## Failure-to-guardrail loop

When an agent or reviewer finds a recurring mistake:

1. reproduce it in a fixture or focused test;
2. decide whether it is a source invariant, security rule, documentation rule
   or workflow rule;
3. enforce it with the narrowest reliable lint, test or CI check;
4. add remediation text if the failure can reach a user;
5. rerun the aggregate gate and update the relevant review record.

Do not add arbitrary prohibitions merely because another codebase uses them.
PatchGate's hard rules must be justified by its authority model, security
boundary or observed failure mode.

## Handoff format

Every completed work package should report:

```text
Scope:
Files changed:
Invariant protected:
Targeted checks:
Aggregate check:
Evidence level:
Known unknowns:
Follow-up:
```

The `Evidence level` must use a precise label such as `local`,
`fixture-verified`, `native-runtime`, `public-source`, `shadow`, `pilot` or
`release`. Do not collapse these levels into a single “done” claim.
