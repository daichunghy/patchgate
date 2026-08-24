# PatchGate

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict_100%25-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/daichunghy/patchgate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/daichunghy/patchgate/actions/workflows/ci.yml)
[![CodeQL](https://github.com/daichunghy/patchgate/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/daichunghy/patchgate/actions/workflows/codeql.yml)

PatchGate checks whether a GitHub pull request has the issue link, CI evidence,
code owners, and human approval a repository requires before a maintainer
reviews it.

That is the job. PatchGate does not review code, detect AI authorship, or decide
whether a change should merge.

The evaluator is deterministic and produces a receipt that explains which
requirements passed, which evidence is missing, and which human gate remains.
It cannot force external automation to stop working.

**Status (2026-08-24):** public pre-release, 1 GitHub star, 0 forks, and no
verified external users, downstream repositories, or pilots. The npm package
remains unpublished (`private: true`, `0.1.0-dev`). The current Action release is
[`v0.1.0-beta.5`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5),
and consumers should pin the immutable commit shown on that release page for
**shadow** evaluation only. This is not production, not a `v0.1` claim, and
not evidence of external adoption.

The four related repositories and the shared evidence rules are recorded in
[the repository portfolio audit](docs/reviews/2026-08-24-repository-portfolio-audit.md).

## Try it locally

The fastest first-run path is a direct GitHub install on Node 20+ — `npx`
clones the repository, builds it via the `prepare` script and runs the
`patchgate` binary. Do not run `npx patchgate`: that npm name belongs to a
different project and this package is unpublished.

```bash
npx github:daichunghy/patchgate --version
npx github:daichunghy/patchgate doctor --base /path/to/your/repo
npx github:daichunghy/patchgate preflight --base main --repo /path/to/your/repo
```

A walkthrough with real captured output is in [docs/demo.md](docs/demo.md). To
work from a clone instead:

```bash
git clone https://github.com/daichunghy/patchgate.git
cd patchgate
npm ci
npm run build
node dist/src/cli.js --help
node dist/src/cli.js init --path /tmp/patchgate-try
node dist/src/cli.js validate --policy /tmp/patchgate-try
node dist/src/cli.js validate --base /tmp/patchgate-try
node dist/src/cli.js preflight --base docs/patchgate.example.yml
node dist/src/cli.js doctor --base docs/patchgate.example.yml
node dist/src/cli.js evaluate --event fixtures/pr-ready.json --report /tmp/patchgate-receipt.json
```

`validate` accepts `--base` as an alias of `--policy`. `evaluate` writes
receipts with `--report` (or `--output`, the shared write-path alias); `github
snapshot` and `support-bundle` write files with `--output` only. Giving
`evaluate` both flags with different paths exits 2 (`REPORT_OUTPUT_CONFLICT`).
`--fail-on` defaults to `blocked`, matching the Action.

Longer walkthrough: [Getting started](docs/getting-started.md).

## GitHub Action candidate

The Action is bundled for the repository's local shadow workflow. The tagged
pre-release [`v0.1.0-beta.5`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5)
is the current release; pin its immutable commit SHA
for shadow evaluation.
Production consumers must still wait for a stable public release. Do not use
the placeholder `patchgate/patchgate@v0.1.0-dev` as an installable public
reference. Consumer setup, permissions and the shadow workflow are documented
in the [Action usage guide](docs/github-action-usage.md).

For this checkout, the source-of-truth workflow is
[`.github/workflows/patchgate-shadow.yml`](.github/workflows/patchgate-shadow.yml).
It uses `pull_request_target`, checks out the trusted base revision, builds the
Action bundle from that base, runs with `fail-on: never`, and updates one check
run. Production consumers must wait for a public immutable Action release. A
consented non-blocking shadow pilot may use an explicitly approved full-SHA
pre-release commit by following the [G4 shadow-installation runbook](docs/pilots/g4-shadow-installation-runbook.md).

## Local development

```bash
npm install
npm run verify
npm run build
npm run bundle:action
node dist/src/cli.js init --path /tmp/my-repository
node dist/src/cli.js validate --policy docs/patchgate.example.yml
node dist/src/cli.js preflight --base docs/patchgate.example.yml
node dist/src/cli.js preflight --base main --repo /path/to/repository --json
node dist/src/cli.js doctor --base docs/patchgate.example.yml --json
node dist/src/cli.js evaluate --event fixtures/pr-ready.json --report /tmp/patchgate-receipt.json
npm run test:github
node dist/src/cli.js github snapshot --mock-fixture fixtures/api/happy-path.json --output /tmp/patchgate-github-snapshot.json
node dist/src/cli.js support-bundle --input /tmp/patchgate-github-snapshot.json --output /tmp/patchgate-support.json
```

`init` creates a version-1 draft only and refuses to overwrite an existing
policy. `validate` and local-file `preflight` read an explicit path. Git-ref
`preflight` reads `patchgate.yml` and the discovery-only guidance files from
the named commit using Git objects; it does not checkout or execute
pull-request code. `doctor` reports local capability without requiring a
token. All discovery findings are advisory, needs-confirmation, or
unsupported and can never become enforcement by themselves.

The `evaluate` command consumes a normalized JSON snapshot so that policy
evaluation can be tested without network access. The GitHub adapter
produces this snapshot from recorded authenticated metadata and
base-revision content. Live mode is explicit, requires
`PATCHGATE_GITHUB_TOKEN`, and is documented in
[the adapter contract](docs/github-adapter-contract.md).

## Trust model

PatchGate uses three separate lanes:

1. The trusted metadata lane reads base-revision policy, GitHub metadata,
   rulesets, CODEOWNERS, reviews, and commit-bound check evidence. It never
   checks out or executes pull-request code.
2. The untrusted verification lane may run contributor code in a separate
   read-only workflow with no repository secrets.
3. The decision lane evaluates authenticated metadata and explicitly bound
   evidence, then emits a receipt.

For GitHub Actions, a `pull_request_target` workflow may read metadata and post
results, but must never execute a checkout of pull-request code. A workflow
that needs to run contributor code belongs in the unprivileged
`pull_request` lane. See [the architecture note](docs/architecture.md) and
[the threat model](docs/threat-model.md).

## Repository Organization

The repository maintains a clean root directory structure (9 files max) with modular subdirectories:

```text
.
├── .github/                 # GitHub workflows, actions, CODEOWNERS, templates, community health files
│   ├── CODEOWNERS           # Path ownership configuration
│   ├── CODE_OF_CONDUCT.md   # Community Code of Conduct
│   ├── CONTRIBUTING.md      # Contribution guidelines and development workflow
│   ├── SECURITY.md          # Vulnerability reporting and security boundary policy
│   ├── SUPPORT.md           # Getting support and communication channels
│   ├── dependabot.yml       # Dependency update configuration
│   ├── community-posts.json # Scheduled community discussion content
│   ├── patchgate.yml        # Repository review-readiness policy
│   ├── ISSUE_TEMPLATE/      # GitHub Issue forms
│   ├── PULL_REQUEST_TEMPLATE.md # PR description template
│   └── workflows/           # CI/CD and verification GitHub Actions
├── docs/                    # Architecture, design decisions, research, and specifications
│   ├── PROJECT_CONSTITUTION.md # Authoritative charter and product constitution
│   ├── getting-started.md   # Clone, build, init, validate, preflight, doctor, evaluate
│   ├── CHANGELOG.md         # Release and development history
│   ├── NOTICE               # Attribution and open source notices
│   ├── patchgate.example.yml # Example PatchGate policy specification
│   ├── architecture.md      # System architecture and lanes
│   ├── implementation-roadmap.md # Delivery roadmap (G0-G8)
│   ├── receipt-contract.md  # ContributionReceipt specification
│   ├── threat-model.md      # Security threat scenarios and mitigations
│   ├── github-adapter-contract.md # Adapter specification and bounds
│   ├── github-api-support-matrix.md # API endpoints and versioning
│   ├── github-permissions.md # Permission model and least privilege
│   ├── github-action-usage.md # Consumer Action usage & shadow-mode guide
│   ├── support-bundle.md    # Redacted diagnostic bundle spec
│   ├── research/            # Landscape and deep-dive research reports
│   ├── decisions/           # Architecture Decision Records (ADRs)
│   ├── product/             # User requirements and UX specs
│   ├── pilots/              # Usability session protocols & pilot results
│   ├── prompts/             # Task prompts and launcher specifications
│   ├── reviews/             # Milestone implementation reviews
│   ├── releases/            # Release records and the beta rollback runbook
│   ├── application/         # Codex for Open Source application evidence
│   ├── community/           # Community interaction and outreach records
│   └── security/            # GitHub adapter security boundary notes
├── src/                     # Pure TypeScript implementation (Strict mode, zero `any`)
│   ├── types.ts             # Canonical types and data models
│   ├── evaluator-core.ts    # Deterministic requirement evaluation engine
│   ├── evaluator.ts         # High-level evaluation runner with timestamping
│   ├── policy.ts            # Policy parser and SHA-256 digest computation
│   ├── discovery.ts         # Advisory guidance discovery
│   ├── canonical-json.ts    # Deterministic JSON serialization and SHA-256
│   ├── support-bundle.ts    # Diagnostics bundle generator
│   ├── version.ts           # Evaluator version constant
│   ├── contract/            # Schemas, status precedence, and validation
│   ├── evidence/            # Digest computation and check evidence verification
│   ├── github/              # Authenticated GitHub adapter, snapshot builder, and rate limiters
│   ├── cli.ts & cli/        # Command-line interface
│   └── action/              # GitHub Action runner
├── schemas/                 # Versioned JSON Schemas (receipt, policy, evaluation-input)
├── fixtures/                # Deterministic test fixtures and API exchange recordings
├── test/                    # Comprehensive unit, integration, security, and determinism tests
├── scripts/                 # Linters, budget checkers, and verification harnesses
├── action.yml               # GitHub Action metadata (not Marketplace-listed)
├── AGENTS.md                # Repository guidance for automated contributors
├── LICENSE                  # Apache-2.0 License
├── README.md                # Project overview and quickstart
├── package.json             # Node package manifest
├── package-lock.json        # Deterministic dependency lockfile
├── tsconfig.json            # Strict TypeScript configuration
├── vitest.config.ts         # Test runner configuration
└── .gitignore               # Git ignore rules
```

## Documentation

- [Getting started](docs/getting-started.md)
- [Project constitution](docs/PROJECT_CONSTITUTION.md)
- [Example policy](docs/patchgate.example.yml)
- [Action usage guide](docs/github-action-usage.md)
- [v0.1.0-beta.5 release record](docs/releases/2026-08-23-beta.5.md)
- [Contributing](.github/CONTRIBUTING.md)
- [Security policy](.github/SECURITY.md)
- [Code of conduct](.github/CODE_OF_CONDUCT.md)
- [Support guide](.github/SUPPORT.md)
- [Community discussions](https://github.com/daichunghy/patchgate/discussions)
- [Non-blocking pilot request](https://github.com/daichunghy/patchgate/issues/4)
- [Independent review and pilot outreach drafts](docs/community/independent-review-and-pilot-outreach.md)

### Contribution opportunities

- [Clean consumer-repository Action fixture](https://github.com/daichunghy/patchgate/issues/7)
- [CODEOWNERS conformance fixtures](https://github.com/daichunghy/patchgate/issues/6)
- [Beta release and rollback guide](https://github.com/daichunghy/patchgate/issues/5)
- [Research and landscape review](docs/research/2026-08-12-patchgate-landscape.md)
- [Deep-dive research: API, state, threat tests and pilot](docs/research/2026-08-13-patchgate-deep-dive.md)
- [Architecture and evidence contract](docs/architecture.md)
- [Receipt contract](docs/receipt-contract.md)
- [Threat model](docs/threat-model.md)
- [GitHub adapter contract](docs/github-adapter-contract.md)
- [GitHub API and capability matrix](docs/github-api-support-matrix.md)
- [GitHub permission contract](docs/github-permissions.md)
- [GitHub adapter security boundary](docs/security/github-adapter-boundary.md)
- [Authorized live-smoke protocol](docs/github-live-smoke-protocol.md)
- [Redacted support bundle](docs/support-bundle.md)
- [Project-wide review and next-build checkpoint](docs/reviews/2026-08-13-project-wide-review.md)
- [Current G4/G0 continuation audit](docs/reviews/2026-08-20-g4-g0-audit.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [User requirements](docs/product/user-requirements.md)
- [User-needs and roadmap research](docs/research/2026-08-13-patchgate-user-needs-roadmap-review.md)
- [Detailed execution plan for agents](docs/agent-execution-plan.md)
- [Machine-readable agent work packages](docs/agent-work-packages.yml)
- [Prompt 1 implementation review](docs/reviews/2026-08-13-prompt-01-review.md)
- [Prompt 2 implementation report](docs/reviews/2026-08-13-prompt-02-implementation.md)
- [Roadmap 2.0 user-needs improvement report](docs/reviews/2026-08-13-roadmap-v2-user-needs.md)
- [G2 local onboarding implementation report](docs/reviews/2026-08-13-g2-local-onboarding-implementation.md)
- [G2 preflight, Git-ref and discovery checkpoint](docs/reviews/2026-08-13-g2-preflight-git-ref-discovery.md)
- [G2 usability session protocol](docs/pilots/g2-usability-session-protocol.md)
- [G4 shadow installation runbook](docs/pilots/g4-shadow-installation-runbook.md)
- [Beta release and rollback runbook](docs/releases/beta-release-and-rollback.md)
- [Prompt 2: observation contract and compatibility](docs/prompts/prompt-02-observation-contract-and-compatibility.md)
- [Prompt launcher for Prompt 2](docs/prompts/prompt-02-launcher.md)
- [Prompt 3: public foundation and maintainer decisions](docs/prompts/prompt-03-public-foundation-and-maintainer-decisions.md)
- [Prompt launcher for Prompt 3](docs/prompts/prompt-03-launcher.md)
- [Prompt 4: authenticated GitHub adapter](docs/prompts/prompt-04-authenticated-github-adapter.md)
- [Prompt launcher for Prompt 4](docs/prompts/prompt-04-launcher.md)
- [G0 maintainer decision brief](docs/decisions/2026-08-13-g0-maintainer-decision-brief.md)
- [Codex for Open Source evidence dossier](docs/application/codex-for-open-source-evidence-dossier.md)
- [Constitution readiness matrix](docs/application/constitution-readiness-matrix.md)
- [Codex for Open Source form draft](docs/application/codex-for-open-source-form-draft.md)

## Evaluate or contribute

PatchGate is still a public pre-release project. The clearest ways to help are
to run the [evidence review packet](docs/community/evidence-review-packet.md),
take one of the scoped [contribution issues](https://github.com/daichunghy/patchgate/issues),
or review the [non-blocking shadow pilot brief](docs/pilots/patchgate-shadow-pilot-brief.md).
For usability research, use the [consent-safe G2 session record](docs/pilots/g2-session-record-template.md).

Maintainers can follow the public [community Project](https://github.com/users/daichunghy/projects/1)
and the [evidence index](docs/application/evidence-index.md). PatchGate does not
claim downstream adoption, a production release or successful external pilots until
those artifacts exist and can be checked independently.

## Product boundary

PatchGate can report `ready_for_review`, `blocked`,
`human_review_required`, `evidence_missing`, or `policy_ambiguous`. A status
check blocks a merge only when a maintainer configures the corresponding
GitHub rule or ruleset. `human_review_required` means that a declared human
gate remains unsatisfied; it is not proof that a human has reviewed the code.

PatchGate must not claim a cryptographic signature, tamper-proof receipt,
compliance certification, or proof that the code is correct until the exact
mechanism and verification path exist and are tested.

## Who this is for

- Maintainers of public repositories who spend review time on pull requests
  that arrive without the policy, evidence, or ownership signals the repo
  requires.
- Teams whose coding agents open pull requests faster than humans can triage.
- Not a fit if you want authorship detection, correctness scoring, or blocking
  without configuring a GitHub rule to honor the status check.

If PatchGate saved you review time on one pull request, star the repository. It
helps other maintainers find the gate.
