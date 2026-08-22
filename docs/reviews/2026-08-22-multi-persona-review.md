# Multi-persona third-party review — 2026-08-22

Second live-validation round requested by the maintainer: review the project
from several independent angles rather than only the author's. Personas:
new-user UX (hands-on, fresh clone), security auditor (code + workflows),
contract/determinism reviewer, and an open-source program evaluator. All
findings below were verified against the tree at the time of review; quick
wins were fixed in the same change where noted.

## Persona 1 — New-user UX (hands-on, fresh clone)

- **[High] No installable package path.** `dist/` is not committed, the npm
  package is unpublished (`0.1.0-dev`), so a new user must clone + `npm ci` +
  `npm run build` before the first command. There is no `npx patchgate`.
  This is the single largest adoption blocker and the highest-leverage fix
  (publishing decision is maintainer-gated). README is honest about the
  build step.
- **[Medium — fixed in this change] Local/live policy discovery diverged.**
  The GitHub adapter reads `patchgate.yml` **or** `.github/patchgate.yml`
  (`src/github/contents.ts`), but local `doctor`/`preflight`/git-ref loading
  only accepted the root path — running `doctor` on PatchGate itself reported
  "policy missing" while the live adapter evaluated `.github/patchgate.yml`
  fine. Fixed: local loading now tries both paths in adapter order, with
  regression coverage (`fixtures/repositories/github-dir-policy`).
- **[Info] `doctor` output quality is good**: clear attention state, precise
  next steps, honest "does not prove authenticated API access" boundary.

## Persona 2 — Security auditor

- **[Pass] Workflow pins and privilege separation.** All `uses:` are
  full-SHA pinned; the shadow workflow uses `pull_request_target` but only
  checks out and builds the **trusted base** revision and never executes PR
  code in the privileged lane.
- **[Pass] Report-path traversal guarded** (`resolveReportPath` rejects
  absolute paths, backslashes, and `..` escapes).
- **[Pass] Determinism spot-check**: no `Date.now`, `new Date()`,
  `Math.random`, or locale-dependent formatting in evaluator core,
  canonical JSON, or digest modules; timestamps are injected parameters.
- **[Low] Markdown backtick injection surface.** `formatMarkdownSummary`
  neutralizes newlines and pipes (`markdownCell`) but not backticks:
  an untrusted string containing a backtick can break out of inline code in
  the step summary / check-run output. GitHub sanitizes scripts, so the
  realistic impact is UI confusion. Hardening candidate: escape or HTML-
  encode backticks in `markdownCell`.
- **[Documented, OK] Administration visibility boundary and check-source
  spoofing** are already recorded threats with fail-closed behavior
  (see the live smoke findings and threat model).

## Persona 3 — Contract/determinism reviewer

- **[High — fixed in this change] Locale-dependent sorting in the adapter.**
  Five collection sorts used `localeCompare` without a locale argument
  (`codeowners.ts`, `branch-protection.ts`, `rulesets.ts`, `changed-paths.ts`,
  `linked-issues.ts`). Because `codeowners.N` requirement IDs and
  `native.*.check.N` reason IDs are derived from sort position, replaying the
  same recorded fixture on a runtime with different ICU collation could swap
  IDs and change native-control digests — breaking cross-environment receipt
  reproducibility while every single-machine test stays green. Fixed by
  replacing all five with the exported code-unit comparator
  `compareTextUnit` in `src/canonical-json.ts`.
- **[Medium — fixed in this change] Receipts dropped `nativeControls`.** The
  evaluator built the receipt core without `nativeControls` even though the
  type, schema and `decisionInputDigest` (which hashes the full input) all
  include it, so third-party consumers could not recompute
  `decisionInputDigest` from the receipt and the native-controls receipt
  validation branch was unreachable for real receipts. Fixed by conditionally
  including `input.nativeControls` in the core.
- **[Medium — open] `evaluatorVersion` pinned as a schema `const`.** The
  first version bump will make receipts that the bundled schema rejects with
  a generic Ajv const error rather than a dedicated diagnostic. Defer to the
  release-engineering pass.
- **[Low — open] CLI exit-code contract**: every non-ready status collapses
  to exit 1 and there is no CLI `--fail-on` mirroring the Action; `--json` is
  undocumented in root help; `--report` vs `--output` naming is
  inconsistent; `validate --policy` silently accepts `--base`. Recorded for
  the CLI ergonomics pass.
- **[Low — open] Third-party receipt validators**: the receipt schema permits
  schema-valid `result`/`severity` combinations the evaluator never emits
  (`failed` + `evidence`) that would self-consistently compute
  `ready_for_review`; the digest helper is duplicated between
  `contract/validation.ts` and `evidence/digests.ts`; glob translation does
  not escape `?`. All recorded as hardening candidates.
- **Verified clean**: no wall-clock or randomness in the evaluator core;
  timestamps are injected and excluded from semantic digests; status
  precedence matches the documented table; input forward-compat rejects
  unknown schema versions explicitly (`INPUT_VERSION_UNSUPPORTED`).

## Persona 4 — Open-source program evaluator

- **[High] The evidence base is entirely self-authored**: self-merged PRs
  (administrator bypass, honestly recorded), maintainer self-smoke repos,
  self-written discussions. Honest framing helps, but the absence of any
  third-party signal (star/fork/contributor/issue from outside) is the
  weakest point of the application.
- **Highest-leverage actions, ranked by effort:**
  1. Publish the CLI to npm (removes the no-`npx` blocker; also benefits
     every persona).
  2. One real external shadow installation (a friend's/community repo) with
     recorded feedback — converts the shadow no-go into pilot evidence.
  3. An independent review exchange: review another maintainer's project in
     exchange for an external approving review here (also unblocks honest
     merge governance).
  4. One external contributor (good-first-issue routing already exists).
  5. A short demo GIF/asciinema in the README — cheapest visibility win.

## Fixes shipped in this change

- Local policy loading (`loadPatchgatePolicy` directory mode and git-ref
  preflight via `loadPatchgatePolicyFromGitRefWithFallback`) now accepts
  `.github/patchgate.yml` in the same order as the adapter, with CLI smoke
  regression coverage. Full `npm run verify` re-passed.
