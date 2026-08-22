# Changelog

All notable changes to PatchGate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Live continuation — 2026-08-22
- PR #9 remains open and unmerged, but its required CI matrix, CodeQL and the
  dedicated `CI / Full Verify` job pass on the current public head.
- `main` protection now requires six strict CI contexts, including `CI / Full Verify`,
  plus one approving review; no force-push or branch-deletion bypass was added.
- Discussion #10 was backfilled as the first real scheduled community prompt;
  the remaining six prompts are staged for an exact two-day cadence.
- The Codex for Open Source form pack records live 0-star/0-fork/no-release
  metrics and validates all three 500-character form fields. It remains a
  preparation artifact, not an eligibility or selection claim.
- The Full Verify pass fixed two clean-checkout defects: Action auto-run during
  imported tests and release validation before the CLI build. A CodeQL URL
  substring alert in the dossier validator was also corrected by exact-line
  matching.
- Reran the authorized GET-only GitHub smoke against current PR head `e6af172`:
  24 bounded requests produced schema-valid input and receipt with the real
  non-ready result `human_review_required`; no GitHub write was performed.

### Status checkpoint — 2026-08-20
- Public foundation is now observable: `origin` points to
  `https://github.com/daichunghy/patchgate`, the repository is public, and the
  default-branch CI run [32333914059](https://github.com/daichunghy/patchgate/actions/runs/32333914059)
  succeeded on `main@a3745f6`.
- The local Action candidate is bundled and clean-room verified, with pinned
  workflow dependencies, idempotent check delivery, and explicit non-ready
  handling for unsupported `merge_group` input.
- G1, the local G2 onboarding slice, the narrowed G3 local/mock adapter, and
  the local G4 Action candidate are verified only within their stated evidence
  boundaries.
- G2 usability sessions, G3 live read-only smoke, external G4 shadow
  installations, enforcement pilots, a public release, and `v0.1` remain open.
- `package.json` remains `private` at version `0.1.0-dev`; no public release or
  downstream consumer evidence is claimed.
- Repository hardening applied on GitHub: seven descriptive topics, Discussions,
  private vulnerability reporting, Dependabot security updates, and `main`
  branch protection with five required CI checks, one approving review, stale
  review dismissal, linear history and conversation resolution. Force-pushes
  and branch deletion are disabled.
- At this checkpoint, public history contained draft PR #9 but no merged pull
  request or release. Four Discussions, one pilot request and three contribution issues
  are open outreach surfaces; they do not establish external adoption or pilot
  evidence. The scheduled/manual Security Audit and Pull Request-only PatchGate
  Shadow workflows still need a successful public main-branch run.
- Local release preparation now includes root `action.yml`, pinned CodeQL
  analysis, Dependabot configuration, valid owner/contact links, and workflow
  pin enforcement for both `actions/*` and `github/*` actions.
- Opened the first public GitHub Discussion to invite maintainer and
  platform/security feedback without claiming adoption or pilot results.
- Added two follow-up design/requirements Discussions and a labeled public
  pilot request to make the next contribution path explicit.
- Added three scoped contribution issues for the Action consumer fixture,
  CODEOWNERS conformance and release/rollback documentation.
- Added a clean-room consumer fixture smoke for full-SHA references, bundle
  isolation and non-blocking merge-group handling; live consumer E2E remains
  open.

### Current audit boundary
- Action candidate now has a self-contained ncc bundle and clean-room
  verification; it remains unreleased and unproven in external consumer repos.
- Check-run delivery uses lookup plus update/create semantics to reduce
  duplicate checks; `merge_group` remains explicit `evidence_missing`.
- Full verification includes dependency audit, Action bundling and bundle
  startup checks.
- Third-party workflow Actions are pinned to immutable commit SHAs.

### Added
- Deterministic evaluator with pure functional core
- Six constitutional rule classes: issue linkage, required checks, ownership, sensitive paths, policy integrity, reviewability
- ContributionReceipt JSON schema with evidence binding and SHA-256 digests
- CLI commands: evaluate, preflight, validate, init, doctor, discovery
- GitHub Action skeleton with shadow mode support (fail-on: never)
- Authenticated GitHub adapter with TOCTOU mitigation
- CODEOWNERS parsing and qualification verification
- Branch protection and ruleset normalization
- Security test suite with 14 adversarial probes
- Fixture manifest with 50 oracle test entries
- CLI smoke tests with process-level verification
- Contract validation with Ajv + semantic checks
- Token redaction and credential safety
- Request budgets and rate-limit protection
- Support bundle generation with data redaction
- Apache 2.0 license and community profile

### Security
- Policy self-relaxation detection via base-revision enforcement
- Evidence binding to exact tested SHA
- Check source identity verification (appId, workflowId)
- Stale review detection after head changes
- Receipt tampering detection via digest validation
- Credential redaction in logs and support bundles
- Pagination origin enforcement (same-origin HTTPS only)
