# Getting Support for PatchGate

Thank you for using PatchGate.

PatchGate is a public pre-release (`0.1.0-dev`, Action tag `v0.1.0-beta.2`).
Support is **best effort**. There is no SLA for consumer questions, no
on-call, and no promise that a maintainer will debug a specific repository's
GitHub Ruleset, branch protection, or workflow graph. PatchGate reports
review-readiness from trusted base policy and GitHub metadata; it is not a
Ruleset debugger.

## 1. Documentation & Guides
- [Product Overview & Architecture](../docs/architecture.md)
- [Receipt Contract Specification](../docs/receipt-contract.md)
- [Threat Model & Security Boundary](../docs/threat-model.md)
- [CLI Quickstart & Subcommands](../README.md#local-development)
- [Getting started](../docs/getting-started.md)
- [GitHub Action usage](../docs/github-action-usage.md)

## 2. Asking Questions & Community Discussion
- Use **GitHub Discussions** for questions, ideas, and architecture inquiries.
- Check existing issues and discussions before opening a new thread.

## 3. Reporting Issues & Feature Requests
- **Bug Reports:** Use the [Bug Report Template](ISSUE_TEMPLATE/bug_report.yml).
- **Feature Requests:** Use the [Feature Request Template](ISSUE_TEMPLATE/feature_request.yml).
- **Security Vulnerabilities:** Follow [SECURITY.md](SECURITY.md) to report privately.

## 4. `GITHUB_PROVENANCE_AMBIGUOUS` is fail-closed

If a native-control snapshot is rejected with `GITHUB_PROVENANCE_AMBIGUOUS`,
that is expected when the token cannot see Administration-scoped Rulesets or
branch protection. The workflow `GITHUB_TOKEN` cannot be granted
Administration. Complete native-control snapshots need a PAT or GitHub App
token with `administration: read`. PatchGate will not treat incomplete
visibility as “no Ruleset” and will not turn that rejection into
`ready_for_review`. See the [Action usage guide](../docs/github-action-usage.md).
