# PatchGate user-needs and roadmap review

**Date:** 2026-08-13  
**Conclusion:** retain the narrow trust-boundary identity, but move usability
validation, shadow rollout and user-facing diagnostics much earlier. The former
roadmap was rigorous but allowed most engineering to finish before proving that
maintainers and contributors could install, understand and act on the result.

## Evidence reconciliation

| Claim | Evidence | Class | Conclusion |
| --- | --- | --- | --- |
| Deterministic local contract exists | source, schemas, 49 non-CLI tests, 4 CLI tests and 50 fixtures | artifact/static QA | verified locally |
| Real GitHub user flow works | no adapter, Action, public remote or live PR run | runtime | unproven |
| Maintainers need lower review noise | GitHub introduced PR limits in 2026 and identifies incoming volume/low-quality noise | current first-party market evidence | verified problem, but GitHub addresses volume directly |
| Review responsiveness matters | CHAOSS links slow review to overload and contributor frustration | standards/community evidence | strongly supported |
| Native controls already enforce many merge conditions | GitHub Rulesets, expected App source, CODEOWNERS and merge queue docs | official platform evidence | PatchGate must complement, not duplicate |
| Complex approval automation exists | policy-bot and Mergify docs | OSS/product evidence | broad rule engines and merge automation are not a defensible expansion |
| General policy-as-code exists | OPA/Conftest docs | OSS/product evidence | do not introduce a general language in `v0.1` |

## Roadmap corrections

### User evidence moves before feature freeze

The earlier plan recruited pilots after beta. The revision adds partner
recruitment during public foundation, three task-based preflight sessions in
G2, two non-blocking shadow installs in G4/G5, and enforcement only after
maintainers review shadow results.

### Technical maturity is separate from publication authority

G1 local technical evidence exists. Making its technical status depend on G0
publication conflated two states. G1 is now locally verified while G0 remains
maintainer-decision pending. Publishing, pilots and release still require G0.

### Onboarding becomes a product contract

The revised requirements add explicit input modes, safe draft initialization,
schema-assisted configuration, capability/permission doctor, aligned human and
JSON explanations, accessibility, noise control, redacted support bundles and
offline replay.

### Shadow mode bridges evaluation and enforcement

Maintainers can observe unknown rate and false blocks without changing merge
policy. Ruleset changes remain explicit maintainer actions. Runs update one
check rather than producing comment noise.

### Adapter work gains operational budgets

GitHub documents pagination, primary/secondary rate limits, conditional
requests and merge-queue-specific events. The backlog now requires request/page
budgets, bounded retry, explicit rate-limit state, idempotent delivery and
separate `pull_request`/`merge_group` SHA tests.

## Counterevidence and defensible wedge

GitHub now covers more than a generic “PR gate” pitch implies: Rulesets require
checks and reviews, CODEOWNERS routes reviewers, merge queues validate combined
changes and PR limits reduce volume. Policy-bot provides complex approvals;
Mergify automates workflows/queues; OPA/Conftest is general policy-as-code.

The defensible wedge is:

> A deterministic pre-review readiness explanation that unifies trusted-base
> policy, native controls, commit-bound evidence and human boundaries into a
> replayable receipt, with local preflight for contributors and coding agents.

If early users do not value this explanation beyond native controls, narrow or
stop rather than expand into generic automation.

## Revised measures

Safety: zero known false green; no privileged execution of PR code; relevant
completeness/permission gaps fail closed.

Usefulness: first-value time, task completion, remediation comprehension,
unknown-cause distribution, delivery noise, API cost, shadow enforcement
decision and whether the result changes review allocation. Report small pilots
with raw counts and context, not percentages alone.

## Decisive sources

- [GitHub pull-request limits](https://github.blog/open-source/maintainers/how-pull-request-limits-are-cutting-down-the-noise/)
- [CHAOSS review duration](https://chaoss.community/kb/metric-change-request-review-duration/)
- [CHAOSS responsiveness guide](https://www.chaoss.community/practitioner-guide-responsiveness/)
- [GitHub rulesets and expected source](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [GitHub REST API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- [GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [policy-bot](https://github.com/palantir/policy-bot)
- [Mergify rule syntax](https://docs.mergify.com/workflow/rule-syntax/)
- [OPA CI/CD](https://www.openpolicyagent.org/docs/cicd)
- [Codex for Open Source](https://developers.openai.com/community/codex-for-oss)

## Confidence and gaps

**High** for platform constraints and competitive boundaries because the
sources are current and first-party. **Medium** for onboarding targets because
PatchGate has no users; task time and comprehension must be calibrated in early
sessions and shadow pilots.
