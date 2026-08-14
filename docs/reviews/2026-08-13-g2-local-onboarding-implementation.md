# G2 local onboarding implementation report

**Date:** 2026-08-13  
**Scope:** PG-208, PG-209, PG-210; local-only onboarding vertical slice  
**Validation level:** `native_user_flow_verified` for the CLI process surface

## Delivered

| Capability | Command | Safety contract |
| --- | --- | --- |
| Human/JSON preflight | `patchgate preflight --base <path> [--json]` | Local authority is explicit; enforcement remains disabled |
| Policy validation | `patchgate validate --policy <path> [--json]` | Stable `POLICY_INVALID` diagnostic; no GitHub write |
| Draft initialization | `patchgate init --path <directory> [--json]` | Creates only a version-1 draft; refuses overwrite; never enables enforcement |
| Local doctor | `patchgate doctor --base <path> [--json]` | Reports policy/Git/package/network capability without requiring a token |

## Verification

- `npm run verify`: pass; 49 non-CLI tests and 4 CLI process tests.
- `npm run build`: pass.
- CLI smoke covers created draft, validate, human preflight, JSON doctor and
  overwrite refusal.
- Existing schema, determinism, fixture and security suites remain green.
- No GitHub remote, ruleset, Action, license or external contact was changed.

## Acceptance mapping

| Package | Evidence | Status |
| --- | --- | --- |
| PG-208 | `src/cli/ux.ts`, `src/cli.ts`, `test/cli-smoke.test.ts` | local slice implemented |
| PG-209 | `src/cli/ux.ts`, `test/cli-smoke.test.ts` | local slice implemented |
| PG-210 | `src/cli/ux.ts`, `test/cli-smoke.test.ts` | local slice implemented |

## Remaining G2 work after this slice

- See the follow-up [Git-ref and discovery checkpoint](2026-08-13-g2-preflight-git-ref-discovery.md) for the subsequent PG-201–205 implementation.
- The follow-up checkpoint also covers the committed preflight fixture repositories.
- Three task-based usability sessions remain.
- Residual UR acceptance and remediation wording review remains.

These gaps prevent calling G2 complete.
