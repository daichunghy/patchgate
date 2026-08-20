# PatchGate user requirements

**Version:** 0.2-draft  
**Evidence baseline:** 2026-08-13  
**Authority:** `PROJECT_CONSTITUTION.md` remains higher authority. These
requirements define user value and acceptance, not new enforcement authority.

## Primary users and jobs

| Persona | Job to be done | Failure PatchGate must prevent |
| --- | --- | --- |
| OSS maintainer | Decide quickly whether a contribution has earned scarce human review time | A green result built from missing, stale, foreign or contributor-controlled evidence |
| Contributor or automated tool | Learn requirements before opening a PR and remediate without privileged access | Discovering an avoidable rule only after waiting for a maintainer |
| Repository security/platform owner | Deploy a deterministic gate with minimal permissions and auditable source identity | Privileged execution of PR code, status spoofing or silent permission gaps |
| Monorepo/domain owner | Route sensitive changes to qualified owners without reviewing unrelated changes | Incorrect CODEOWNERS/path semantics, incomplete pagination or excessive noise |

Small and solo-maintainer OSS repositories are the first adoption segment.
Organization-wide fleet management is a later validation target, not a `v0.1`
prerequisite.

## Required user journeys

### UJ-01 — first local value

From a clean checkout, a maintainer can run
`patchgate preflight --base <ref>`, see trusted structured policy separately
from advisory prose, see exact remediation, and obtain equivalent versioned
JSON without a GitHub token when all required data is local.

### UJ-02 — contributor self-remediation

A contributor or agent can run preflight before opening a PR; distinguish
enforced, advisory and unsupported findings; see authority/base revision; and
know which gaps they can fix versus evidence only CI or a qualified human can
supply. A PR-body claim is never verified evidence.

### UJ-03 — safe shadow rollout

A maintainer can install PatchGate in non-blocking shadow mode, inspect receipts
and false-positive/unknown causes, then deliberately choose whether to make its
check required. Installation must not silently change a ruleset.

### UJ-04 — actionable PR result

One stable PatchGate check communicates exact final status, decision-relevant
blockers, evidence source/revision/freshness and precise remediation. The full
machine-readable receipt preserves every requirement. Updating one check run is
the default; comments are opt-in and idempotent.

### UJ-05 — administrator diagnosis

Before enforcement, a doctor/capability command reports repository/target
identity, available and missing permissions, observation completeness,
expected-source limits, merge-queue compatibility, unsupported configuration
and the smallest safe remediation.

### UJ-06 — replay and support

A maintainer can validate a compatible receipt and create a redacted support
bundle without PR bodies, comments, tokens or unnecessary personal data.

## Normative product requirements

### Onboarding and configuration

| ID | Requirement | `v0.1` acceptance |
| --- | --- | --- |
| UR-001 | First-value path | A clean-room user reaches useful preflight using documented commands; measure assisted task time with a target at or below 15 minutes, not an unsupported launch claim |
| UR-002 | Explicit modes | CLI distinguishes local-file, Git-ref and GitHub-snapshot inputs; no implicit working-tree policy authority |
| UR-003 | Guided initialization | `patchgate init` may generate a draft policy but cannot enable enforcement or convert prose into rules |
| UR-004 | Configuration diagnosis | `patchgate doctor` or equivalent reports schema, base-ref, capability, permission and source-identity problems with stable diagnostics |
| UR-005 | Schema-assisted authoring | Published policy schema, examples and validation cover every supported rule class |
| UR-006 | Safe defaults | Reviewability is advisory; rollout begins shadow/non-required; missing governance never becomes green |

### Decision and explanation

| ID | Requirement | `v0.1` acceptance |
| --- | --- | --- |
| UR-101 | Exact status semantics | Human and JSON outputs use the five constitutional statuses |
| UR-102 | Actionable remediation | Every non-passed enforceable requirement names the condition and feasible next action |
| UR-103 | Authority visibility | Every policy-derived result exposes source kind, identity, base SHA and digest |
| UR-104 | Evidence visibility | Selected checks/workflows/reviews expose immutable identity and target SHA without sensitive content |
| UR-105 | Failed versus unknown | Incomplete, inaccessible or ambiguous observations remain distinct from confirmed failure |
| UR-106 | Output consistency | Text, JSON, receipt, Action check and summary derive from the same decision object |
| UR-107 | Noise control | One current check per target; repeated delivery idempotent; comments opt-in and deduplicated |

### GitHub integration and compatibility

| ID | Requirement | `v0.1` acceptance |
| --- | --- | --- |
| UR-201 | Minimal permissions | Permission matrix is tested; gaps fail closed only for dependent requirements |
| UR-202 | Base authority | Structured policy and CODEOWNERS/native policy inputs come from trusted base revision |
| UR-203 | Complete retrieval | Pagination, caps, truncation, rate limits and retry exhaustion become explicit states |
| UR-204 | Expected source | Checks bind immutable App/workflow identity and expected-source setup is documented |
| UR-205 | Merge queue | `pull_request` and `merge_group` have separate tested SHA semantics |
| UR-206 | Fork safety | Fork flow needs no secrets and never executes PR code in privileged metadata/decision lane |
| UR-207 | GitHub.com scope | `v0.1` supports GitHub.com; GHES remains unsupported until matrix and pilot exist |
| UR-208 | Native-control complement | Output attributes Rulesets/branch protection/CODEOWNERS and does not claim to replace them |

### Performance, reliability and privacy

| ID | Requirement | `v0.1` acceptance |
| --- | --- | --- |
| UR-301 | Deterministic core budget | Representative maximum snapshots are benchmarked; accidental quadratic selection is tested without flaky wall-clock assertions |
| UR-302 | API budget | Adapter records requests, pages and rate-limit state in debug evidence; conditional requests considered where safe |
| UR-303 | Bounded failure | Retries, payload sizes, item counts and execution are bounded with stable diagnostics |
| UR-304 | Data minimization | Public receipts exclude bodies, comments, tokens and unnecessary personal data |
| UR-305 | Idempotent delivery | Same semantic snapshot reuses/updates delivery surface and preserves semantic digest |
| UR-306 | Offline replay | Fixture and receipt validation work without network |

### Adoption, support and evidence

| ID | Requirement | `v0.1` acceptance |
| --- | --- | --- |
| UR-401 | Early usability evidence | At least three task sessions before Action feature freeze; findings map to issues/docs/non-goals |
| UR-402 | Shadow pilots | At least two consenting public repositories run non-blocking evaluation before enforcement |
| UR-403 | Enforcement consent | Required-check enforcement follows maintainer review of shadow unknown/false-block findings |
| UR-404 | Pilot diversity | Constitution-required pilots differ materially, such as solo OSS and multi-owner/monorepo |
| UR-405 | Measured usefulness | Record setup time, result distribution, clarity, false-green, false-block, unknown causes and decision |
| UR-406 | No manufactured evidence | Stars, installs, users, feedback and eligibility use verifiable public/consented evidence only |
| UR-407 | Supportability | Limitations, diagnostic bundle, security reporting, upgrade and rollback are clean-room tested |

## UX quality bars

- Lead with decision, then authority/evidence, then remediation.
- Do not require raw JSON for common failures.
- Explain permission gaps per affected requirement, not as a generic 403.
- Pair `policy_ambiguous` with a safe initialization/remediation path.
- Meaning must not depend on color, emoji or icons.
- Never style non-ready statuses as green.

## Product boundaries confirmed by market comparison

PatchGate complements GitHub Rulesets, branch protection, CODEOWNERS,
policy-bot, Mergify, OPA/Conftest and GitHub pull-request limits. Its
differentiated promise is a deterministic trusted-base, evidence-bound
explanation of whether a contribution has earned human review time, plus local
preflight for people and automated tools.

## Validation ladder

Use only: `documented`, `static_or_fixture_verified`,
`native_user_flow_verified`, `live_shadow_verified`,
`live_enforcement_verified` or `externally_piloted`. Public release
authorization is separate from technical maturity.
