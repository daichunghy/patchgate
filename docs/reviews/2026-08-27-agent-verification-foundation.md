# Agent verification foundation — 2026-08-27

**Scope:** translate the verification-first and bounded-scaling practices from
the attached Cursor agent transcript into PatchGate's repository workflow

**Evidence level:** local and fixture-verified

This record documents a repository operating improvement. It is not evidence
of external adoption, a public release, an external pilot, production
integration or automatic merge authorization.

## Implemented

- Added the [agent verification map](../agent-verification-map.md) covering
  PatchGate's CLI, evaluator, receipts, GitHub adapter, Action, workflows and
  documentation surfaces.
- Added the [agent evaluation protocol](../agent-evaluation-protocol.md) with
  ten initial task families, a six-dimension rubric, promotion conditions and
  bounded evaluation waves.
- Added the machine-readable seed corpus at
  `fixtures/agent-evals/manifest.json`, with task scope, risk owner, acceptance
  commands and human-review requirements for `AG-01` through `AG-10`.
- Added `npm run agent-eval -- <task-id>` as an allowlisted local runner for
  one manifest-backed task at a time; it runs acceptance commands but never
  substitutes for parent diff review.
- Added `scripts/check-agent-contract.mjs` and included it in `npm run verify`
  so the map, protocol and required authority anchors cannot silently drift
  out of the repository's operating contract.
- Linked both documents from `AGENTS.md` and `README.md`.

## Verification evidence

The complete local gate passed on the current working tree:

```text
lint: 38 TypeScript source files
typecheck: pass
fixture budgets: pass (10 API fixtures)
workflow pins: pass (5 workflow files)
workflow events and shadow permissions: pass
documentation links: pass (79 Markdown files)
consumer documentation freshness: pass
community schedule: pass
application dossier: pass
agent contract: pass
dependency audit: 0 vulnerabilities
core tests: 11 files, 112 tests passed
security tests: 14 passed
GitHub integration tests: 33 passed
build: pass
Action bundle: pass
consumer fixture: pass
release-candidate check: pass
CLI process smoke: 6 passed
clean-room dist verification: pass
```

## Deliberate limits

- The map does not authorize auto-merge or change GitHub branch protection.
- `npm run smoke:live` remains an explicitly authorized read-only step.
- No external maintainer walkthrough, shadow installation or pilot is claimed.
- No rule was added merely because another agent-oriented codebase bans a
  particular language or framework pattern.
- Agent output, judge scores and timeouts remain non-authoritative until the
  parent maintainer verifies the final diff and aggregate gate.

## External execution boundary

The local environment did not expose `PATCHGATE_GITHUB_TOKEN` or
`GITHUB_TOKEN`, so the authorized `npm run smoke:live` step was not run. The
following work remains intentionally open and cannot be completed honestly by
local file changes alone:

- three consented G2 usability sessions;
- a post-merge G3 read-only smoke on the intended public revision;
- two consenting G4 shadow installations, including supported fork or
  merge-queue cases;
- explicit G5 enforcement authorization;
- G6 publication and rollback authorization;
- two external G7 enforcement pilots;
- any later auto-merge decision under native GitHub protection.

## Next controlled wave

Use five low-risk documentation, fixture, test or CLI tasks as Wave A. Record
each task using the evaluation protocol. Promote to contract/evaluator tasks
only when the parent has verified every result and no security or contract
regression is observed.

The initial local baseline covered four Wave A tasks and passed:

```text
AG-01 schema/contract: 10 schema tests and typecheck passed
AG-04 CLI/onboarding: 6 CLI smoke tests and first-use preflight passed
AG-08 fixture regression: 3 fixture tests and fixture budgets passed
AG-09 documentation: 79 Markdown links, consumer docs and agent contract passed
```

These are current-tree acceptance results, not evidence that an agent has
created or merged external pull requests.

The remaining six manifest-backed task baselines also passed:

```text
AG-02 evaluator determinism: 6 determinism tests and 3 fixture tests passed
AG-03 evidence binding: 14 security tests and 6 determinism tests passed
AG-05 GitHub adapter: 33 integration tests, 14 security tests and 18 adapter tests passed
AG-06 Action binding: 19 Action tests, bundle, consumer fixture and dist verification passed
AG-07 workflow safety: lint, workflow-event checks and 14 security tests passed
AG-10 release surface: build, bundle, release-candidate and dist verification passed
```

All ten manifest task acceptance baselines therefore pass on this current
tree. This establishes a runnable verification surface; it does not establish
that an agent can complete each task without rescue, because no independent
agent task attempt is being counted as successful here.

## Parent-verified implementation waves

On 2026-08-27, two bounded subagent waves were reviewed by the parent and
rerun serially on the current working tree:

- first-use preflight harness and live-smoke entry-point regression coverage;
- Rust/Cargo adapter fixtures and exact-argv tests in contribkit;
- inventory/revenue and service-quality spreadsheet examples with executable
  previews;
- complete quant-research workflow and first-use summary with row-preservation
  invariants;
- release/update/rollback runbooks for the three repositories that lacked one.

These are local/fixture verification results. They do not establish external
users, consented pilots, native platform integrations, package publication, or
automatic enforcement.
