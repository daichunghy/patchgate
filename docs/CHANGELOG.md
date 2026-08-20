# Changelog

All notable changes to PatchGate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
