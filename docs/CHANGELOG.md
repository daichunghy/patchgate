# Changelog

All notable changes to PatchGate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### evaluate --output alias with fail-closed conflicts — 2026-08-23
- `evaluate` accepts `--output` as an alias of `--report`, so the
  file-writing flag is uniform across commands. Passing both with different
  receipt paths exits 2 with `REPORT_OUTPUT_CONFLICT` instead of picking a
  winner. `--report` remains the documented flag. (Audit item P1-8; the
  `validate --base` alias was already documented.)

### Working git install and glob hardening — 2026-08-22
- `npx github:daichunghy/patchgate` now actually works: a `prepare` script
  builds `dist/` when the package is installed from GitHub, closing the gap
  the README honestly documented ("npx also fails today"). Verified by a real
  clean-directory install smoke — the binary runs `--version`, `--help` and
  `doctor` end to end and correctly finds `.github/patchgate.yml`. The smoke
  also caught the runtime JSON Schema directory being dropped during
  git-dependency packing; the explicit `files` field from PR #27 fixes that
  half and `prepare` completes it. Registry publication stays a
  maintainer-gated decision; `prepublishOnly` now runs the full verification
  chain so a future publish cannot skip it.
- Path patterns treat `?` as a literal character rather than a regex
  quantifier in `matchedPath`, with a regression test.
- Added [docs/demo.md](demo.md) — a walkthrough with real captured CLI output.

### Init draft comments, contributor health, receipt schema — 2026-08-22
- `init` writes a commented map of the six supported rule classes from
  `docs/patchgate.example.yml`. Only `version: 1` is live YAML; comments are
  not parsed as rules. Overwrite refusal, `enforcement: not_enabled`, and
  `--github-dir` are unchanged.
- CONTRIBUTING now states the fork/PR model, `npm run verify` as the merge
  gate, the Node 20 / CI 20.x–22.x / Action `node24` scatter, base-SHA
  policy, good-first work outside the trust boundary, one-maintainer review,
  and Apache-2.0 with no extra CLA/DCO. SUPPORT labels pre-release support
  as best effort and documents `GITHUB_PROVENANCE_AMBIGUOUS`. Dependabot
  now watches `github-actions` weekly in addition to npm.
- Receipt schema rejects `result: failed` + `severity: evidence`, which the
  evaluator never emits and which would otherwise compute `ready_for_review`.
  Observation digest helpers now share `normalizedObservationDigest` /
  `compareTextUnit` so validation and evidence hashing stay byte-identical.
  CODEOWNERS still rejects `?` as unsupported subset syntax.

### init --github-dir and local-file doctor without Git — 2026-08-22
- `init --github-dir` writes `.github/patchgate.yml` and still refuses overwrite.
- Missing Git is informational for local-file `doctor`, so a draft directory
  without `.git` can be `ready_for_local_preflight`.

### Independent review follow-up — 2026-08-22
- `init` creates a missing parent directory so `init --path /tmp/patchgate-try` works.
- Git-ref policy fallback to `.github/patchgate.yml` only when the root blob is absent, not when root YAML is invalid.
- `github snapshot --fail-on` applies to rejected snapshots (Action `snapshotRejectionExitCode` parity) and is validated before I/O.
- Constitution / README / getting-started no longer advertise `npx patchgate` (that npm name is a different project).
- Consumer Action YAML includes `actions: read` and labels enforcement as “do not copy yet.”

### Local preflight Git-ref default, non-JS doctor, Action usage — 2026-08-22
- `preflight --base <ref>` uses Git-object loading when `--base` is not an
  existing file or directory and the current work tree (or `--repo`) is a Git
  repository, so `patchgate preflight --base origin/main` works without a
  dummy `--repo`. Existing filesystem paths stay local-file mode. Policy is
  still read with `git cat-file`; untrusted PR code is not checked out.
- `doctor` treats missing `package.json` as informational, so a Git repository
  with a valid policy and no Node package can be `ready_for_local_preflight`.
- `init` draft comments point at `docs/patchgate.example.yml`.
- Consumer Action quick start now pins `daichunghy/patchgate@v0.1.0-beta.2`
  with `fail-on: never` and `create-check-run: true`; `npm ci` + `uses: ./`
  is labeled as developing PatchGate itself. Native-control snapshots still
  need a PAT or App token because `GITHUB_TOKEN` cannot have Administration.
- Application dossier, evidence index and constitution matrix no longer
  describe open PR #9 or zero tags; they record the merged hardening history
  and `v0.1.0-beta.2` without claiming adoption or program selection.

### First-run path, CLI `--fail-on`, and receipt version decoupling — 2026-08-22
- Documented the working stranger first-run as clone + `npm ci` +
  `npm run build` + `doctor`/`preflight`/`evaluate` fixture, with a short
  [getting-started](getting-started.md) walkthrough. `npx patchgate` remains
  unavailable (`private: true`). `npx github:daichunghy/patchgate` was tried
  against current `main` and failed because committed `dist/` has the Action
  bundle, not the CLI.
- Added a `files` allowlist (`dist`, `schemas`, `action.yml`, `README.md`,
  `LICENSE`, `docs/patchgate.example.yml`) so a future maintainer publish is
  packable; the package stays unpublished.
- CLI `evaluate` and `github snapshot` honor `--fail-on` with the same
  `shouldFailAction` threshold as the Action. Default is `blocked`:
  `blocked` / `evidence_missing` / `policy_ambiguous` exit 1;
  `human_review_required` does not until the threshold is raised. Invalid
  values exit 2 as `FAIL_ON_INVALID`.
- Receipt schema `evaluatorVersion` is a semver-shaped pattern instead of
  `const: "0.1.0-dev"`, so a version bump no longer invalidates the schema.
- `validate --base` is documented as an alias of `--policy`. Root help lists
  `--json`, `--fail-on`, `--report` (evaluate), and `--output`
  (snapshot / support-bundle).

### Rejected-snapshot check runs — 2026-08-22
- When `create-check-run: true` and the GitHub snapshot is rejected, the
  Action now posts an idempotent check run with conclusion `neutral` titled
  `PatchGate: SNAPSHOT REJECTED`, carrying the adapter diagnostic id and
  remediation, instead of leaving only the workflow status. This closes the
  improvement candidate from the live-smoke findings record. If the event
  payload has no pull-request head SHA, the check run is skipped with a
  warning. Evaluation check runs and rejection check runs share one
  lookup/update delivery helper to preserve deduplication.

### Multi-persona review round — 2026-08-22
- Fixed the local/live policy-discovery divergence found by the new-user
  persona: `doctor`, local `preflight` and git-ref loading now accept
  `.github/patchgate.yml` with the same root-first order as the GitHub
  adapter, locked by CLI smoke regressions
  ([review record](reviews/2026-08-22-multi-persona-review.md)).
- Removed locale-dependent sorting from the adapter (contract-reviewer
  finding): five `localeCompare` collection sorts whose order feeds
  positional requirement IDs and native-control digests now use the exported
  code-unit comparator `compareTextUnit`, keeping receipts reproducible
  across runtimes with different ICU collation.
- Receipts now include `nativeControls` when present in the input, so
  `decisionInputDigest` is recomputable from the receipt alone and the
  native-controls receipt validation branch is reachable.
- Hardened `formatMarkdownSummary` cell escaping against markup breakout
  (HTML-encoding; the first backtick-to-quote attempt was correctly
  rejected by CodeQL as incomplete sanitization).
- Recorded the remaining persona findings: no `npx` install path until the
  npm package is published (top adoption blocker), `evaluatorVersion` schema
  `const` coupling, CLI exit-code/flag ergonomics, and the program-evaluator
  action list (npm publish, external shadow pilot, independent review
  exchange, first external contributor, demo media).

### Policy-change detection — 2026-08-22
- Policy-change detection now also matches the loaded policy source identity,
  so a repository whose policy lives at `.github/patchgate.yml` is flagged
  without manually duplicating that path under `policy_changes.paths`. The
  repository's own policy listed both paths as a workaround; both locations
  are now derived automatically, and a regression test covers the nested
  identity.

### Live consumer smoke fixes — 2026-08-22
- Released [`v0.1.0-beta.2`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.2)
  at `main@edab0ec` carrying the critical input fix; the maintainer smoke
  repository then produced a green live consumer run with the fail-closed
  native-control boundary observed and recorded.
- Documented that the workflow `GITHUB_TOKEN` cannot be granted the
  Administration permission, so complete native-control snapshots need a PAT
  or GitHub App token with `administration: read`; the usage guide now states
  this boundary instead of implying `contents/pull-requests/checks` suffice.
- Recorded the improvement candidate that rejected snapshots post no
  PatchGate Check Run (workflow status only).
- Fixed a critical input-parsing bug found by the first live consumer smoke:
  the Action read `INPUT_GITHUB_TOKEN`-style underscore names, but the GitHub
  runner exports dashed names (`INPUT_GITHUB-TOKEN`), so every input —
  including `github-token`, `fail-on` and `create-check-run` — was unreadable
  on real runners. The parser now prefers runner-native dashed names with the
  underscore forms as fallback, locked by new regression tests
  ([findings record](reviews/2026-08-22-live-smoke-findings.md)).
- Corrected the beta.1 release notes consumer reference from the invalid
  `daichunghy/patchgate/action@<SHA>` subpath form to the root
  `daichunghy/patchgate@<SHA>` form the runbooks already used.
- Migrated `action.yml` from `node20` to `node24` after the runner
  deprecation warning.
- Recorded that recent internal Shadow Gate failures were caused by the same
  input bug, not the documented non-ready transition boundary; earlier
  shadow-run evidence for those runs is void.

### Beta release — 2026-08-22
- Tagged [`v0.1.0-beta.1`](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.1)
  at `main@301c700` with maintainer approval, fresh-checkout verification
  (138 tests, clean-room bundle, consumer fixture) and a recorded
  shadow-installation no-go decision; the release is beta shadow-evidence
  scope, not a production or adoption claim.
- Merged PR #9 (hardening) and follow-up PRs #15–#18 via administrator
  decision after temporarily lifting `enforce_admins`; branch protection was
  restored after every merge and each merge is recorded as a maintainer
  decision rather than independent-review evidence.
- Merged Dependabot PRs #11 (`@types/node` 26), #13 (`vitest` 4.1.11) and #14
  (`@vitest/coverage-v8` 4.1.11) after local re-verification; deferred #12
  (TypeScript 7) because `@vercel/ncc` cannot bundle under TS 7.
- Fixed vitest CLI substring filters executing compiled `dist/test` copies
  after a build (PR #16).
- Hardened the GitHub adapter boundary after static-advisory adjudication:
  strict GitHub-compatible charset for repository identity segments and a
  simpler timestamp regex; two scanner advisories were fixed at root and two
  were confirmed false positives with a documented record (PR #18).
- The Codex for Open Source form draft and evidence snapshot now reflect the
  merged history and the beta tag.

### Live continuation — 2026-08-22
- PR #9's required CI matrix, CodeQL and the dedicated `CI / Full Verify` job
  passed on the public head while it remained open; it was merged later the
  same day (see the beta release entry above).
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
- Reran the authorized GET-only GitHub smoke against PR head `5f9ccb5`:
  24 bounded requests produced schema-valid input and receipt with the real
  non-ready result `human_review_required`; no GitHub write was performed.
- Added a copy-ready G4 shadow-installation runbook with consent, full-SHA,
  permission, stop and rollback guidance, plus a beta release/rollback runbook
  that keeps release authorization with the maintainer.
- Added an explicit `actions: read` permission to the shadow workflow and a
  regression check so workflow-run provenance cannot silently become unknown.
- Corrected the README links for the consumer fixture and beta rollback issues.
- Added an internal Markdown-link verifier to the authoritative verification
  chain and fixed broken relative links in the public support guide.

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
