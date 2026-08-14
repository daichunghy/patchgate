# G2 preflight, Git-ref and discovery checkpoint

**Date:** 2026-08-13  
**Scope:** PG-201 through PG-207, plus the discovery portion of PG-206  
**Validation level:** `native_user_flow_verified` for local CLI process flows; not a GitHub integration or user-pilot claim

## Delivered

| Capability | Evidence | Safety boundary |
| --- | --- | --- |
| Explicit input modes | `src/cli.ts`, `src/cli/ux.ts` | JSON distinguishes `local_file` from `git_ref`; no implicit working-tree authority |
| Trusted Git-ref policy read | `src/policy.ts` | Uses `git rev-parse` and `git cat-file` with argument arrays; no checkout, shell interpolation, or PR-code execution |
| Base-ref guidance read | `src/discovery.ts` | Reads fixed guidance paths from Git objects without checkout; local mode reads the explicit local root |
| Discovery classification | `src/discovery.ts` | `advisory`, `needs_confirmation`, and `unsupported` findings carry stable diagnostics and remediation |
| Structured-policy conflict signal | `src/discovery.ts` | Candidate prose points back to `patchgate.yml` or a native GitHub control; it cannot add a requirement |
| Text/JSON explanation | `src/cli/ux.ts` | Human output and JSON share the same finding object; meaning does not depend on styling |
| Fixture repository matrix | `fixtures/repositories`, `test/cli-smoke.test.ts` | Missing policy, base-versus-working-tree policy, conflicting prose and unsupported guidance are enumerated |

## User-facing commands

```bash
patchgate preflight --base patchgate.yml
patchgate preflight --base main --repo /path/to/repository --json
patchgate validate --policy patchgate.yml
patchgate init --path /path/to/repository
patchgate doctor --base patchgate.yml --json
```

The Git-ref path records the resolved commit in `policySource.revision` and
exposes `mode: "git_ref"`. The local path records `mode: "local_file"` and
explicitly tells the user that a future authenticated adapter must bind the
policy to the pull request base SHA.

## Discovery contract

The scanner checks only `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`README.md`, and `.github/pull_request_template.md`. It reports absence as a
stable diagnostic, bounds each file at 256 KiB, and never executes or interprets
the file as policy. Directive-like governance language becomes
`needs_confirmation`; known out-of-scope platform/product claims become
`unsupported`; ordinary context stays `advisory`. A structured policy conflict
is an authority finding for remediation, not an automatic block.

## Verification

- `npm run verify`: pass; 49 non-CLI tests and 4 CLI process tests.
- `npm run build`: pass.
- CLI smoke covers local-file mode, Git-ref mode, base-revision identity,
  discovery-only guidance, needs-confirmation and unsupported findings,
  fixture repositories, safe initialization, validation and doctor output.
- Existing schema, determinism, fixture and security suites remain in scope;
  no GitHub API, Action, remote, ruleset, license or external contact was changed.

## Remaining G2 work

- PG-211: three consent-safe task sessions with raw time, comprehension and
  remediation findings; a no-fabrication protocol is prepared at
  `docs/pilots/g2-usability-session-protocol.md` but sessions have not run;
- PG-212: close the resulting onboarding P0/P1 findings and map UR evidence.

Therefore this is a completed local implementation slice, not a complete G2
gate and not evidence of authenticated GitHub provenance or pilot usefulness.
