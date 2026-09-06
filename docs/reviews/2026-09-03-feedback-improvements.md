# Feedback-driven improvement record — 2026-09-03

This record connects the current implementation changes to feedback that was
checked in email, GitHub discussions, and open pull-request checks. It does not
claim an external pilot or an independent review of PatchGate.

## Evidence reviewed

| Source | Observed feedback | Product implication |
| --- | --- | --- |
| Email thread “Question on security-tooling ownership evidence” | Falco maintainers resolve ownership from Prow `OWNERS` files per changed path; `/lgtm` and `/approve` are separate gates. Their repositories do not use `CODEOWNERS`, and cross-repository work is handled as separate PRs. | A CODEOWNERS-only parser can miss a real ownership model. Detect the alternate file as discovery-only and do not guess at Prow approval semantics. |
| [PatchGate Discussion #29](https://github.com/daichunghy/patchgate/discussions/29) | The response recommends showing the tested SHA in the check output and only posting success when the workflow SHA matches the intended PR head. | Make `headSha`, `testedSha`, and `targetKind` visible together in the Action summary and log. |
| [PR #69](https://github.com/daichunghy/patchgate/pull/69) and its [Full Verify run](https://github.com/daichunghy/patchgate/actions/runs/33526195564) | The documentation restructure passed the platform and test jobs but failed the consumer-documentation assertion for snapshot-rejection Check Run wording. | Keep the failure as a release-surface issue to resolve on that PR; do not call the PR green from its partial checks. |
| [PRs #70–#73](https://github.com/daichunghy/patchgate/pulls) | #70–#72 failed the high-severity audit because `fast-uri@3.1.5` was installed; #73 updates it to `3.1.7` and its current checks are green. | Apply the lockfile security update locally and retain the Dependabot PR as the public merge path. |

No human review or inline review comment was present on the open PatchGate PRs
checked on this date. Dependabot notifications and CI results are maintenance
signals, not independent approval evidence.

## Decisions implemented

1. Add root `OWNERS` and `OWNERS_ALIASES` to discovery. A present file is
   classified `needs_confirmation` with `authority: discovery_only` and the
   `prow_owners` signal. It cannot create a blocking requirement.
2. Keep the enforceable ownership contract unchanged: `CODEOWNERS`, explicit
   `patchgate.yml`, and authenticated native GitHub controls remain the only
   supported ownership sources for this version.
3. Show `Base SHA`, `Head SHA`, `Tested SHA`, and `Evidence Target` in the Action
   summary and console output. When the tested and head SHAs differ, the
   summary states that the result is bound to the declared target.
4. Apply the exact `fast-uri@3.1.7` lockfile update already proposed by PR #73.

## Verification target

The local change must pass:

```bash
npm run verify
```

The fixture for Prow discovery is synthetic and proves only classification and
non-enforcement. It is not a recording of Falco repository data.
