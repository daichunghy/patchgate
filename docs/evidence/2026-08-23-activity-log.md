# PatchGate activity evidence log — 2026-08-23

**Captured at:** `2026-08-23T15:35:38Z`  
**Evidence type:** dated public-state snapshot.  
**Recheck rule:** this log preserves what was observed at capture time; query `origin/main`, GitHub,
and the registry again before making a new release, adoption, pilot, or program claim.

## Public state observed

| Item | Observed value |
|---|---|
| Repository | [daichunghy/patchgate](https://github.com/daichunghy/patchgate) |
| `main` | `3303c156185defa652d42572c8a1653e4ebdf010` |
| Latest maintainer PR | [#45 — refresh Codex OSS evidence](https://github.com/daichunghy/patchgate/pull/45), merged |
| Current Action release | `v0.1.0-beta.5`, public shadow pre-release |
| npm package | unpublished; `package.json` remains private development package |
| Stars / forks | 1 / 0 at capture time |
| Open issues | 5 at capture time |

## Activity completed

- Preserved the existing consent-safe pilot issue [#4](https://github.com/daichunghy/patchgate/issues/4)
  and consumer-fixture issue [#7](https://github.com/daichunghy/patchgate/issues/7).
- Submitted [DeskLore PR #7](https://github.com/FoundDream/desklore/pull/7) with an isolated,
  synthetic-history workflow. This is an external contribution, not PatchGate adoption evidence.
- Submitted [Flecto PR #145](https://github.com/myselfsiddharth/Flecto/pull/145) with a declarative
  GitHub Actions policy pack. It passed local fixture and test validation and is awaiting maintainer review.

## Evidence boundary

This entry proves public repository maintenance, a public beta Action, and outbound contribution work.
It does not prove external users, a shadow installation, production usage, Marketplace listing, npm
downloads, or acceptance into an OpenAI/Anthropic program. The pilot issue is recruitment, not a pilot.

## Next evidence gates

1. Obtain consent for one external shadow installation.
2. Run the consumer repository fixture against the committed Action bundle and record the SHA.
3. Keep `merge_group` as `evidence_missing` until authenticated membership evidence exists.
4. Re-run the release candidate gate immediately before any new beta tag.
