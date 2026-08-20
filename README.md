# PatchGate

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict_100%25-blue.svg)](https://www.typescriptlang.org/)

PatchGate is an open-source review-readiness gate for GitHub pull requests.
It answers a narrower question than code review or AI-authorship detection:

> Has this contribution supplied the policy, evidence, ownership, and human
> boundaries that the repository requires before a maintainer spends review
> time?

The evaluator is deterministic and explainable. It does not decide whether code
is correct, safe, or merge-worthy, and it cannot force an external coding agent
to stop working.

## GitHub Action candidate

The Action is bundled for the repository's local shadow workflow, but no public
Action release or immutable version tag exists yet. Do not use the placeholder
`patchgate/patchgate@v0.1.0-dev` as an installable public reference.

For this checkout, the source-of-truth workflow is
[`.github/workflows/patchgate-shadow.yml`](.github/workflows/patchgate-shadow.yml).
It uses `pull_request_target`, checks out the trusted base revision, builds the
Action bundle from that base, runs with `fail-on: never`, and updates one check
run. External consumers must wait for a public immutable Action release.

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

The repository maintains a clean root directory structure (8 files max) with modular subdirectories:

```text
.
├── .github/                 # GitHub workflows, actions, CODEOWNERS, templates, community health files
│   ├── action.yml           # GitHub Action definition
│   ├── CODEOWNERS           # Path ownership configuration
│   ├── CODE_OF_CONDUCT.md   # Community Code of Conduct
│   ├── CONTRIBUTING.md      # Contribution guidelines and development workflow
│   ├── SECURITY.md          # Vulnerability reporting and security boundary policy
│   ├── SUPPORT.md           # Getting support and communication channels
│   ├── patchgate.yml        # Repository review-readiness policy
│   ├── ISSUE_TEMPLATE/      # GitHub Issue forms
│   ├── PULL_REQUEST_TEMPLATE.md # PR description template
│   └── workflows/           # CI/CD and verification GitHub Actions
├── docs/                    # Architecture, design decisions, research, and specifications
│   ├── PROJECT_CONSTITUTION.md # Authoritative charter and product constitution
│   ├── CHANGELOG.md         # Release and development history
│   ├── NOTICE               # Attribution and open source notices
│   ├── patchgate.example.yml # Example PatchGate policy specification
│   ├── architecture.md      # System architecture and lanes
│   ├── implementation-roadmap.md # Delivery roadmap (G0-G8)
│   ├── receipt-contract.md  # ContributionReceipt specification
│   ├── threat-model.md      # Security threat scenarios and mitigations
│   ├── research/            # Landscape and deep-dive research reports
│   ├── decisions/           # Architecture Decision Records (ADRs)
│   ├── product/             # User requirements and UX specs
│   └── reviews/             # Milestone implementation reviews
├── src/                     # Pure TypeScript implementation (Strict mode, zero `any`)
│   ├── evaluator-core.ts    # Deterministic requirement evaluation engine
│   ├── policy.ts            # Policy parser and SHA-256 digest computation
│   ├── discovery.ts         # Advisory guidance discovery
│   ├── contract/            # Schemas, status precedence, and validation
│   ├── evidence/            # Digest computation and check evidence verification
│   ├── github/              # Authenticated GitHub adapter, snapshot builder, and rate limiters
│   ├── cli.ts & cli/        # Command-line interface
│   ├── action/              # GitHub Action runner
│   └── support-bundle.ts    # Diagnostics bundle generator
├── schemas/                 # Versioned JSON Schemas (receipt, policy, evaluation-input)
├── fixtures/                # Deterministic test fixtures and API exchange recordings
├── test/                    # Comprehensive unit, integration, security, and determinism tests
├── scripts/                 # Linters, budget checkers, and verification harnesses
├── AGENTS.md                # AI agent operating rules and context
├── LICENSE                  # Apache-2.0 License
├── README.md                # Project overview and quickstart
├── package.json             # Node package manifest
├── package-lock.json        # Deterministic dependency lockfile
├── tsconfig.json            # Strict TypeScript configuration
├── vitest.config.ts         # Test runner configuration
└── .gitignore               # Git ignore rules
```

## Documentation

- [Project constitution](docs/PROJECT_CONSTITUTION.md)
- [Example policy](docs/patchgate.example.yml)
- [Contributing](.github/CONTRIBUTING.md)
- [Security policy](.github/SECURITY.md)
- [Code of conduct](.github/CODE_OF_CONDUCT.md)
- [Support guide](.github/SUPPORT.md)
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
- [Prompt 2: observation contract and compatibility](docs/prompts/prompt-02-observation-contract-and-compatibility.md)
- [Prompt launcher for Prompt 2](docs/prompts/prompt-02-launcher.md)
- [Prompt 3: public foundation and maintainer decisions](docs/prompts/prompt-03-public-foundation-and-maintainer-decisions.md)
- [Prompt launcher for Prompt 3](docs/prompts/prompt-03-launcher.md)
- [Prompt 4: authenticated GitHub adapter](docs/prompts/prompt-04-authenticated-github-adapter.md)
- [Prompt launcher for Prompt 4](docs/prompts/prompt-04-launcher.md)
- [G0 maintainer decision brief](docs/decisions/2026-08-13-g0-maintainer-decision-brief.md)
- [Codex for Open Source evidence dossier](docs/application/codex-for-open-source-evidence-dossier.md)

## Product boundary

PatchGate can report `ready_for_review`, `blocked`,
`human_review_required`, `evidence_missing`, or `policy_ambiguous`. A status
check blocks a merge only when a maintainer configures the corresponding
GitHub rule or ruleset. `human_review_required` means that a declared human
gate remains unsatisfied; it is not proof that a human has reviewed the code.

PatchGate must not claim a cryptographic signature, tamper-proof receipt,
compliance certification, or proof that the code is correct until the exact
mechanism and verification path exist and are tested.
