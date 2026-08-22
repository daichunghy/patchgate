# AGENTS.md

This repository builds PatchGate, an open-source review-readiness gate for pull requests.

Read `docs/PROJECT_CONSTITUTION.md` completely before substantive work.

## Repository Layout & Agent Deep-Dive Guide

The repository enforces a clean root structure (maximum 9 files) with well-defined subdirectories:

```text
.
├── .github/                 # GitHub Action, workflows, CODEOWNERS, templates & community health files
│   ├── CODEOWNERS           # Path ownership configuration
│   ├── CODE_OF_CONDUCT.md   # Community Code of Conduct
│   ├── CONTRIBUTING.md      # Contribution guidelines & architecture invariants
│   ├── SECURITY.md          # Vulnerability reporting & security boundaries
│   ├── SUPPORT.md           # Support channels & maintainer contact
│   ├── dependabot.yml       # Dependency update configuration
│   ├── community-posts.json # Scheduled community discussion content
│   ├── patchgate.yml        # Repository review-readiness policy
│   ├── ISSUE_TEMPLATE/      # GitHub issue forms
│   ├── PULL_REQUEST_TEMPLATE.md # PR template
│   └── workflows/           # CI/CD and verification GitHub Actions
├── docs/                    # Architecture, specifications, research, roadmap & ADRs
│   ├── PROJECT_CONSTITUTION.md # Authoritative charter & constitution
│   ├── CHANGELOG.md         # Release history
│   ├── NOTICE               # Open source attribution notices
│   ├── patchgate.example.yml # Example PatchGate policy
│   ├── architecture.md      # System architecture & evidence lanes
│   ├── implementation-roadmap.md # Delivery roadmap (G0–G8)
│   ├── receipt-contract.md  # ContributionReceipt specification
│   ├── threat-model.md      # Security threat model & mitigations
│   ├── github-adapter-contract.md # Adapter specification & bounds
│   ├── github-api-support-matrix.md # API endpoints & versioning
│   ├── github-permissions.md # Permission model & least privilege
│   ├── support-bundle.md    # Redacted diagnostic bundle spec
│   ├── github-action-usage.md # Consumer Action usage & shadow-mode guide
│   ├── github-live-smoke-protocol.md # Authorized live GET-only smoke procedure
│   ├── release-candidate-checklist.md # Pre-tag verification checklist
│   ├── agent-execution-plan.md # Agent task planning baseline
│   ├── agent-work-packages.yml # Agent work-package definitions
│   ├── research/            # Landscape & deep-dive research reports
│   ├── decisions/           # Architecture Decision Records (ADRs)
│   ├── product/             # User requirements & UX specifications
│   ├── pilots/              # Usability session protocols & pilot results
│   ├── prompts/             # Task prompts and launcher specifications
│   ├── reviews/             # Milestone review checkpoints
│   ├── releases/            # Release records and the beta rollback runbook
│   ├── application/         # Codex for Open Source application evidence
│   ├── community/           # Community interaction & outreach records
│   └── security/            # GitHub adapter security boundary notes
├── src/                     # Pure TypeScript implementation (Strict mode, zero `any`)
│   ├── types.ts             # Canonical types and data models
│   ├── evaluator-core.ts    # Deterministic requirement evaluation engine
│   ├── evaluator.ts         # High-level evaluation runner with timestamping
│   ├── policy.ts            # Policy parser & SHA-256 digest computation
│   ├── discovery.ts         # Advisory guidance discovery (AGENTS.md, README.md...)
│   ├── canonical-json.ts    # Deterministic JSON serialization & SHA-256
│   ├── support-bundle.ts    # Redacted support bundle builder
│   ├── version.ts           # Evaluator version constant
│   ├── contract/            # Schemas, status precedence & validation
│   ├── evidence/            # Digest computation & check evidence verification
│   ├── github/              # Authenticated GitHub adapter, snapshot builder & rate limiters
│   ├── cli.ts & cli/        # Command-line interface and human/JSON renderers
│   └── action/              # GitHub Action runner & summary formatter
├── schemas/                 # Versioned JSON Schemas (receipt, policy, evaluation-input)
├── fixtures/                # Deterministic test fixtures and API exchange recordings
├── test/                    # Comprehensive unit, integration, security, and determinism tests
├── scripts/                 # Linters, budget checkers, and verification harnesses
├── action.yml               # GitHub Marketplace Action metadata and entrypoint
├── AGENTS.md                # AI agent operating rules and context (this file)
├── LICENSE                  # Apache-2.0 License
├── README.md                # Project overview and quickstart
├── package.json             # Node package manifest
├── package-lock.json        # Deterministic dependency lockfile
├── tsconfig.json            # Strict TypeScript configuration
├── vitest.config.ts         # Test runner configuration
└── .gitignore               # Git ignore rules
```

## How Agents Should Explore & Execute

1. **Understand Authority**: Always read [docs/PROJECT_CONSTITUTION.md](docs/PROJECT_CONSTITUTION.md) first. Policy is always read from the base commit (`baseSha`), never from the PR branch.
2. **Review Types & Contracts**: Read [src/types.ts](src/types.ts), [src/contract/status-precedence.ts](src/contract/status-precedence.ts), and [schemas/](schemas).
3. **Core Engine**: Pure deterministic logic lives in [src/evaluator-core.ts](src/evaluator-core.ts) and [src/evidence/](src/evidence).
4. **Adapter & Security**: GitHub integration logic lives in [src/github/](src/github) and follows [docs/threat-model.md](docs/threat-model.md).
5. **Validation**: Run `npm run verify` before completing any change.

## Current project status

This section is the operating snapshot for the repository. It was revalidated
on 2026-08-22 and must be kept separate from the constitutional definition of
done below. A local test, a recorded fixture, or a configured remote is not by
itself evidence of live GitHub behavior, external adoption, or release
readiness.

| Area | Current evidence | Status and limit |
| --- | --- | --- |
| G0 public foundation | Public repository `https://github.com/daichunghy/patchgate`, Apache-2.0 license, Community Profile 100%, seven repository topics, Discussions, private vulnerability reporting, protected `main`, CI workflow, and successful public `main` CI runs including the latest `32559824706` on `main@c9f643e` | Foundation is present; `main` requires six CI contexts and one approving review, `0.1.0-dev` remains an unpublished package, the beta tag `v0.1.0-beta.1` exists, and there is no downstream usage; the hardening PR #9 was merged by the repository administrator on 2026-08-22 without an independent approving review, which is recorded here as a maintainer decision rather than independent-review evidence |
| G1 deterministic contract | TypeScript evaluator, schemas, receipt digests, recorded fixtures, security coverage, and deterministic tests | Locally verified; this does not prove a live GitHub integration |
| G2 local preflight | `preflight`, `validate`, `init`, `doctor`, Git-ref loading, discovery classification, text/JSON parity, and five CLI process tests | Local user flow is verified; three consented usability sessions and UR acceptance evidence are still open |
| G3 GitHub adapter | Recorded/mock authenticated snapshot flow, bounded requests, source and SHA binding, TOCTOU re-read, redaction, branch-protection and Rulesets subset contract, 25 integration tests and the latest recorded GET-only smoke for PR #9 head `5f9ccb5` | The tested head built a schema-valid live snapshot and receipt with final status `human_review_required`; missing approval/ownership/linkage evidence remains explicit; unsupported Ruleset semantics and merge-group membership remain fail-closed |
| G4 Action | Root `action.yml`, `src/action/index.ts`, committed ncc bundle, pinned workflows, required CI/CodeQL merge-group triggers, clean-room bundle verification, idempotent check delivery, consumer fixture smoke and explicit non-ready merge-group handling are merged into `main` | Local consumer boundary is verified; no live external consumer E2E, production release or two consenting non-blocking shadow installations |
| User value and release | Protocols, roadmap, five public Discussions including [#10](https://github.com/daichunghy/patchgate/discussions/10), a [pilot request](https://github.com/daichunghy/patchgate/issues/4), three contribution issues, public Project #1, merged PR #9 and the `v0.1.0-beta.1` pre-release with a recorded shadow-installation no-go decision exist; four context-specific questions were posted to related OSS repositories | No completed G2 sessions, external replies or contributions, external shadow installations, enforcement pilots, production release, or `v0.1` claim |

The public default branch is currently `main@c9f643e`. [PR #9](https://github.com/daichunghy/patchgate/pull/9)
and follow-ups #15–#19 were merged on 2026-08-22 by the repository
administrator after temporarily lifting `enforce_admins`; the setting was
restored immediately after each merge. Completed default-branch workflow runs
include the latest [CI 32559824706](https://github.com/daichunghy/patchgate/actions/runs/32559824706)
and CodeQL `32559824693` on `main@c9f643e`, earlier runs through
[32559540757](https://github.com/daichunghy/patchgate/actions/runs/32559540757)
on the tagged `301c700`, and the first public run
[CI 32333914059](https://github.com/daichunghy/patchgate/actions/runs/32333914059).
Live branch
protection also requires one approving pull-request review, dismisses stale
reviews, requires six CI contexts including `CI / Full Verify`, enforces
linear history and conversation resolution, and disables force-pushes and
branch deletion. The merged `codex/community-interaction`,
`docs/clean-ai-isms` and `docs/beta-release-record` branches were deleted
after their content reached `main`; the merged `fix/mimosa-boundary-hardening`
branch, the stale pre-publication `test/patchgate-shadow-smoke` draft branch
and the open `dependabot/npm_and_yarn/typescript-7.0.2` branch (PR #12)
remain. Dependabot PRs #11 (`@types/node` 26), #13 (`vitest` 4) and #14
(`@vitest/coverage-v8` 4) were merged on 2026-08-22 after local
re-verification; PR #12 (`typescript` 7) stays open because `@vercel/ncc`
cannot bundle under TS 7. The pre-release
[`v0.1.0-beta.1`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.1)
was tagged at `main@301c700` on 2026-08-22 with maintainer approval and a
recorded shadow-installation no-go decision
([release record](docs/releases/2026-08-22-beta-candidate.md)); it is beta
shadow-evidence scope only — not production, adoption or a `v0.1` claim.

The current milestone audit is [the 2026-08-20 G4/G0 continuation audit](docs/reviews/2026-08-20-g4-g0-audit.md). The newest records are the [2026-08-22 Mimosa static-advisory adjudication](docs/reviews/2026-08-22-mimosa-static-advisory-adjudication.md) — re-run the sealed scan after any change to `src/github/client.ts` transport handling — and the [v0.1.0-beta.1 release record](docs/releases/2026-08-22-beta-candidate.md). The latest verification command to rerun after a change is:

```bash
npm run verify
```

Agents must not describe the repository as released, externally piloted,
live-integrated, merge-blocking, or eligible/selected for Codex for Open Source
unless the corresponding evidence has been added and independently checked.
When a change affects one of the open gates, update the roadmap and the
relevant review record in the same change.

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
patchgate evaluate --event snapshot.json --report receipt.json
```

`evaluate` consumes a normalized evaluation-input snapshot
([`schemas/evaluation-input.schema.json`](schemas/evaluation-input.schema.json))
produced by the adapter — not a raw GitHub event payload.

```yaml
- uses: daichunghy/patchgate@v0.1.0-beta.1
  with:
    fail-on: blocked
```

The tagged beta reference is approved for shadow evaluation only
(`fail-on: never` in the [shadow runbook](docs/pilots/g4-shadow-installation-runbook.md));
`fail-on: blocked` above is the enforcement form intended for the first
stable release.

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

The tree above is the constitutional target shape. The current implementation keeps discovery, policy parsing, deterministic evaluation, and reviewability signals in flat modules (`src/discovery.ts`, `src/policy.ts`, `src/evaluator-core.ts`, `src/evaluator.ts`); `contract/`, `evidence/`, `github/`, `cli/`, and `action/` are directories today. See the Repository Layout above for the actual file map.

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
