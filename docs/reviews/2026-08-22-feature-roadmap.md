# PatchGate independent feature roadmap

**Date:** 2026-08-22  
**Status:** operating plan, not a `v0.1`, pilot, or Codex-for-OSS claim  
**Authority:** `docs/PROJECT_CONSTITUTION.md` wins if this file disagrees.  
**Sibling project:** agentsmd is the instruction-hygiene lane. PatchGate does
not lint `AGENTS.md` into enforcement.

PatchGate’s job is review-readiness: trusted base policy + GitHub metadata +
commit-bound evidence → one `ContributionReceipt`. OpenAI Codex for Open
Source looks at usage, ecosystem importance, and active maintenance. There
is no official star cutoff. Inflating metrics is a terms violation.

## What landed in this session (P0, local `feat/oss-readiness`, not pushed)

- CLI `--fail-on` matches Action threshold semantics
- Receipt `evaluatorVersion` is a semver pattern, not a schema `const`
- Honest clone-first getting started; `files` allowlist; package stays
  `private: true` / `0.1.0-dev` (release-candidate checker requires that)
- `preflight --base main` inside a git repo is Git-ref mode; a real file
  path stays local-file mode
- `doctor` no longer treats missing `package.json` as blocking
- Consumer Action docs pin `daichunghy/patchgate@v0.1.0-beta.2` with
  `fail-on: never` and `create-check-run: true`; `uses: ./` is dogfood only
- Application dossier/index/matrix/form draft no longer say “open PR #9”
  or “0 tags”; they still say no external adoption or pilots

## P1 — next, in order (without violating the constitution)

| # | Item | Why | Bound |
| --- | --- | --- | --- |
| 1 | One consented independent review of `feat/oss-readiness` then merge | Admin-merged history is recorded as maintainer decision, not review evidence | Do not lift `enforce_admins` again without recording it |
| 2 | One consented G2 usability session using the existing protocol | G2 is not complete until three sessions exist; one is the first real user-value pixel | Consent-safe template only |
| 3 | One consented non-blocking shadow install outside `daichunghy/*` | G4/G7; this is the first checkable usage pixel | Follow `docs/pilots/g4-shadow-installation-runbook.md`; `fail-on: never` |
| 4 | npm publish decision (maintainer-gated) | Largest adoption blocker. `check-release-candidate` currently *fails* if `private` is false | Change the checker in the same PR as the publish decision; do not document `npx patchgate` until the registry page exists |
| 5 | `init --github-dir` writing `.github/patchgate.yml` | Local loader already prefers root then `.github/`; init still writes root only | Refuse overwrite; draft must stay non-enforcing |

## P2 — after a real shadow user

| Item | Why it waits |
| --- | --- |
| Enforcement / required-check rollout | Constitution: shadow evidence before G5 |
| Merge-group complete contract and fork E2E | Documented fail-closed; needs a live consumer |
| Receipt cryptographic signing | Forbidden claim until a tested signing path exists |
| New rule classes | Do not broaden into a generic policy engine |
| `doctor` live token/permission diagnosis | UR-004; keep local doctor honest about what it cannot prove |
| Codex-for-OSS form submission | See application research: do not submit a 0-usage, days-old tool and call it widely used |

## Non-goals (binding)

- AI-authorship detection, correctness oracle, SaaS compliance product
- Inferring blocking rules from `AGENTS.md` / CONTRIBUTING prose
- Checking out or executing pull-request code in `pull_request_target`
- Fake Discussions, stars, pilots, or “community” that is only the author
- Applying with agentsmd as a second identity to stack ChatGPT Pro benefits

## Honest application timing

The form takes **one** public GitHub URL. If a submission happens, use
PatchGate only, with the existing “ecosystem importance, no adoption yet”
draft. Do not submit today hoping the docs will look like usage. The
stronger path is one external shadow install or one independent review,
then submit.
