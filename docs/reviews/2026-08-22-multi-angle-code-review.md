# PatchGate `feat/oss-readiness` vs `origin/main` — multi-angle code review

**Date:** 2026-08-22  
**Merge-base:** `6db56a45df7f84732cb7f340be539f8112a11f8b`  
**Head:** `feat/oss-readiness`  
**Scope:** correctness/contract/determinism; security (trust boundary, no PR-code execution, fail-closed); CLI edge cases for preflight Git-ref default, `--fail-on`, and doctor without `package.json`. Minified `dist/action/*.js` was not line-reviewed except for regeneration.

## Summary

The branch is an OSS-readiness pass: clone-first docs, CLI `--fail-on` aligned with the Action for *successful* evaluations, Git-ref preflight without a dummy `--repo`, doctor no longer blocking non-JS repos, and receipt `evaluatorVersion` loosened from a schema `const` to a semver-shaped pattern. Policy is still read from a caller-supplied base ref via `git cat-file` (no checkout of PR code); `AGENTS.md` remains discovery-only; `package.json` stays `private: true`. The Action ncc chunks were regenerated (945→113, 995→815); `isGitWorkTree` is tree-shaken from the Action policy chunk, which is expected.

Two contract bugs remain. `github snapshot --fail-on` is not applied on rejected snapshots despite help/CHANGELOG claiming Action parity, and Git-ref policy fallback treats *any* root-policy error as absence, which can select a different file than local-file mode or the GitHub adapter. Doctor-without-`package.json` and fail-closed invalid `--fail-on` (on the evaluate path) look correct.

## Issues

### Issue 1 -- Severity: bug
- Angle: correctness
- File: src/cli.ts:214
- Description: `github snapshot` still uses `result.diagnostic.exitCode` for rejected snapshots and never calls `shouldFailAction` / `snapshotRejectionExitCode`. The Action maps rejection to `shouldFailAction("evidence_missing", failOn)` (exit 0 when `fail-on: never`, exit 1 when `fail-on: blocked`). CHANGELOG and the comment above `parseFailOnArgument` claim CLI and Action failures agree; for `fixtures/api/merge-group-unsupported.json` the CLI stays at exit 2 even with `--fail-on never`. Invalid `--fail-on` is also skipped on this branch, so a rejected snapshot with `--fail-on bogus` never emits `FAIL_ON_INVALID`.
- Suggestion: Parse `--fail-on` before snapshot work. On `kind === "rejected"`, either use `snapshotRejectionExitCode` for Action parity or document that CLI rejections stay fail-closed at `diagnostic.exitCode` and still validate `--fail-on`. Add a smoke case for rejected + `--fail-on never` and rejected + `--fail-on bogus`.
- Status: open

### Issue 2 -- Severity: bug
- Angle: correctness
- File: src/policy.ts:260
- Description: The new preflight default (`--base <ref>` with no `--repo`) now hits `loadPatchgatePolicyFromGitRefWithFallback` without an explicit repo. That helper catches **every** error from root `patchgate.yml` — missing blob *and* invalid YAML/schema — then loads `.github/patchgate.yml` if that parse succeeds. Local `loadPatchgatePolicy` (src/policy.ts:234) and the GitHub adapter (`src/github/contents.ts:30`, 200 on root is terminal; invalid content → `GITHUB_POLICY_INVALID`) do not fall through on a present-but-invalid root file. Same commit can therefore preflight green from `.github/patchgate.yml` while Action snapshot collection fails on root, or ignore a broken root policy that local-file mode would surface. Throwing `rootError` when `.github` also fails additionally hides a nested invalid-policy diagnostic behind “root object not found.”
- Suggestion: Fall through only on blob absence (git `cat-file` not found / exists-zero). Propagate `createTrustedPolicyArtifact` failures. Prefer the `.github` error when root is absent and the nested file exists but is invalid. Add a fixture with invalid root + valid `.github/patchgate.yml` and assert git-ref, local-dir, and adapter agree.
- Status: open

### Issue 3 -- Severity: bug
- Angle: cli
- File: src/action/index.ts:97
- Description: New CLI help calls `--fail-on` an “Exit-code threshold” (`src/cli.ts:51`) and lists `never | blocked | human_review_required | evidence_missing | policy_ambiguous` as if they were ordered. `shouldFailAction` is not a total order: `blocked` and `human_review_required` expand to several statuses, but `evidence_missing` and `policy_ambiguous` match only themselves (`if (failOn === status) return true` then `return false`). `--fail-on evidence_missing` therefore exits 0 on `blocked`. Smoke tests cover `never`, bogus values, default `blocked`, and default `human_review_required` → exit 0; they do not cover `--fail-on evidence_missing` with a blocked receipt. Evaluate/`github snapshot` also parse `--fail-on` *after* writing the receipt or snapshot (`src/cli.ts:211` and `src/cli.ts:363`), so an invalid value still produces output then exit 2. A bare `--fail-on` as the last argv token is treated as omitted and silently defaults to `blocked`.
- Suggestion: Document exact Action semantics (or implement a real severity order and share it). Validate `--fail-on` before I/O. Treat a present flag with a missing/flag-shaped value as `FAIL_ON_INVALID`. Extend `test/cli-smoke.test.ts` for `--fail-on evidence_missing` + `blocked` and for `--fail-on` without a value.
- Status: open

### Issue 4 -- Severity: nit
- Angle: correctness
- File: src/types.ts:12
- Description: The new `EvaluatorVersion` comment says “the receipt schema and `RECEIPT_VERSION_UNSUPPORTED` enforce the shape.” No `RECEIPT_VERSION_UNSUPPORTED` diagnostic exists (`src/contract/validation.ts` maps bad versions to Ajv `SCHEMA_INVALID`; `test/schema.test.ts:101` expects that). The schema change itself (pattern instead of `const: "0.1.0-dev"`) is consistent with the tests and does not by itself break current `0.1.0-dev` receipts.
- Suggestion: Drop the phantom diagnostic name, or add `RECEIPT_VERSION_UNSUPPORTED` as the audit’s P1-9 “dedicated diagnostic on bump” actually specified.
- Status: open
