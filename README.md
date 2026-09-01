# PatchGate

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/daichunghy/patchgate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/daichunghy/patchgate/actions/workflows/ci.yml)
[![CodeQL](https://github.com/daichunghy/patchgate/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/daichunghy/patchgate/actions/workflows/codeql.yml)

PatchGate is a deterministic GitHub pull-request readiness check. It answers one
narrow question:

> Does this pull request contain the policy, evidence, ownership, and human
> approval signals that this repository requires before a maintainer reviews it?

PatchGate is not a code-quality oracle, an AI-authorship detector, or a merge
decision-maker. It produces a receipt that explains what passed, what is
missing, and which human decision remains.

## Why it exists

Coding agents make it easy to open a pull request before the repository's
contribution contract has been understood. Maintainers then spend review time
chasing missing issue links, unrecorded tests, unclear ownership, or an absent
human gate.

PatchGate turns those expectations into an explicit, versioned policy and a
repeatable preflight. The evaluator is local and deterministic; the GitHub
adapter is an explicit boundary with a documented permission model.

## Try it locally

The fastest path runs against the repository's recorded fixture and needs no
token, network access, or pull-request checkout:

```bash
git clone https://github.com/daichunghy/patchgate.git
cd patchgate
npm ci
npm run verify
node dist/src/cli.js evaluate --event fixtures/pr-ready.json --report /tmp/patchgate-receipt.json
```

To inspect the result:

```bash
node dist/src/cli.js explain /tmp/patchgate-receipt.json
```

For a first-use walkthrough, see [docs/first-use.md](docs/first-use.md). To use
the CLI against a local repository:

```bash
node dist/src/cli.js preflight --base main --repo /path/to/repository
node dist/src/cli.js doctor --base /path/to/repository
```

Run `npm run verify` after making a change. It covers type checking, builds,
deterministic fixtures, security cases, clean-room installation, and CLI
smoke tests.

## What it checks

A policy can require signals such as:

- an issue or discussion link;
- recorded, allowlisted test evidence;
- CODEOWNERS or sensitive-path ownership;
- commit-bound status checks;
- a declared human review gate;
- repository and workflow permissions that stay within the policy.

Every result is classified explicitly: ready, blocked, needs human review,
evidence missing, or policy ambiguous. Discovery findings are advisory and
cannot become enforcement by themselves.

## GitHub Action

The repository contains a GitHub Action candidate for non-blocking shadow
evaluation. Follow the [Action usage guide](docs/github-action-usage.md) before
installing it in another repository.

The trusted metadata lane uses `pull_request_target` only to read base-revision
policy and authenticated metadata. It never checks out or executes pull-request
code. Code that must run belongs in an unprivileged `pull_request` workflow.
Pin an immutable commit when testing the Action, and keep the check non-blocking
until a maintainer has reviewed the receipt and configured the repository rule
that should honor it.

## Security model

PatchGate separates three concerns:

1. The trusted metadata lane reads policy, GitHub metadata, rulesets, CODEOWNERS,
   reviews, and commit-bound checks from a trusted base revision.
2. The untrusted verification lane may run contributor code in a separate,
   read-only workflow with no repository secrets.
3. The decision lane evaluates normalized evidence and emits a receipt.

See the [architecture](docs/architecture.md), [threat model](docs/threat-model.md),
and [GitHub permission contract](docs/github-permissions.md) before enabling a
live adapter.

## Contributing

Start with [CONTRIBUTING.md](.github/CONTRIBUTING.md), then choose a bounded
issue:

- [clean consumer-repository fixture](https://github.com/daichunghy/patchgate/issues/7);
- [CODEOWNERS conformance fixtures](https://github.com/daichunghy/patchgate/issues/6);
- [pilot request](https://github.com/daichunghy/patchgate/issues/4).

A useful contribution includes a reproducible fixture, the expected receipt,
tests, and a short explanation of the boundary it exercises. Please open an
issue first for changes that alter policy semantics or the security model.

For a consented maintainer walkthrough, use the [shadow-pilot brief](docs/pilots/patchgate-shadow-pilot-brief.md).
External pilots are non-blocking, require maintainer consent, and should report
both useful findings and false positives.

## Documentation map

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Receipt contract](docs/receipt-contract.md)
- [Threat model](docs/threat-model.md)
- [GitHub adapter contract](docs/github-adapter-contract.md)
- [Action usage](docs/github-action-usage.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Security policy](.github/SECURITY.md)
- [Support](.github/SUPPORT.md)
- [Changelog](CHANGELOG.md)

## Boundaries

PatchGate does not claim that code is correct, that a person reviewed code,
that a receipt is tamper-proof, or that a repository is compliant with a
standard. A status check can block a merge only after a repository maintainer
explicitly configures the corresponding branch rule or ruleset.

The project is public pre-release software. Adoption means a separate
maintainer-consented result in a real repository; local fixtures, source
releases, and internal checks are not counted as external use.

## License

Apache-2.0. See [LICENSE](LICENSE).
