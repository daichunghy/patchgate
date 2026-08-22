# Multi-angle review — new user + Codex-for-OSS evaluator

**Date:** 2026-08-22  
**Branch:** `feat/oss-readiness` @ `23715e8`  
**Personas:** (A) brand-new user who is not a professional programmer; (B) OpenAI Codex-for-OSS program evaluator.  
**Method:** read README, getting-started, Action usage, form draft, `AGENTS.md` status, constitution §8; run the documented first-run commands against this checkout; check GitHub/npm live. No code was changed.

Verified facts (do not treat as already fixed):

| Claim | Verified state |
| --- | --- |
| Package unpublished | `package.json` is `"private": true`, `"version": "0.1.0-dev"`; `scripts/check-release-candidate.mjs` fails the build if that is not true |
| `npx github:daichunghy/patchgate` | Committed `dist/` is Action-only (`dist/action/**`). CLI is `dist/src/cli.js` after `npm run build`. Git tree at `v0.1.0-beta.2` has no `dist/src/cli.js` |
| `v0.1.0-beta.2` | Public pre-release tag at `edab0ec`; GitHub API `prerelease: true`; docs correctly call it shadow-only |
| External pilots | None. Release record: shadow-installation **no-go**. `daichunghy/patchgate-beta-smoke` is maintainer self-test |
| Live GitHub metrics (2026-08-22) | `daichunghy/patchgate` is public, **0 stars, 0 forks**, 5 open issues |
| npm name `patchgate` | Already published by someone else: `patchgate@0.3.3` (`shivae372-hub/patchgate`, “Policy enforcement and rollback for AI agent code edits”) |

What already holds: README status, getting-started preamble, Action usage header, `AGENTS.md` operating snapshot, evidence index, and the form’s “anything else” block do **not** claim production, `v0.1`, npm publish, or external pilots.

---

## Summary

A non-programmer who follows [docs/getting-started.md](../getting-started.md) can clone, `npm ci`, `npm run build`, and get `--help`, `validate`, `preflight`, `doctor`, and a `ready_for_review` fixture evaluation to work **if** they stay in the clone and skip the broken `init` line. They will still get lost: the advertised `init --path /tmp/patchgate-try` fails, CLI help and next-steps say `patchgate` which is not on `PATH`, `--report` hides the receipt the walkthrough says will print, and the “blocked case” command is the ready fixture.

The Action copy-paste in [docs/github-action-usage.md](../github-action-usage.md) §1 **is a resolvable GitHub Action reference** (`daichunghy/patchgate@v0.1.0-beta.2` has root `action.yml` + committed `dist/action/index.js`; a maintainer smoke already started it). It is not Marketplace, not `npx`, and not a one-paste success: the snippet omits `actions: read`, uses `github.token` (native controls fail closed on protected repos), and the tagged beta.2 still does not post a Check Run on snapshot rejection. The getting-started “next step” G4 runbook is **not** copy-pasteable (`<PATCHGATE_ACTION_SHA>`).

A Codex-for-OSS reviewer who stays inside README / getting-started / form draft / `AGENTS.md` will see honest pre-release language. The remaining false command is constitution §8.1 `npx patchgate`, which today installs a **third-party** npm package of the same name. The form’s “Usage is not yet broad” / “active issue triage” is softer than the live 0-star, 0-download, self-authored-issue evidence. Do not invent users; there are none to invent.

---

## Persona A — new user

### Issue 1 -- Severity: bug

- File: docs/getting-started.md:35
- Description: Step 2 is `node dist/src/cli.js init --path /tmp/patchgate-try` with no `mkdir`. Ran as written: `PatchGate CLI error [INIT_PARENT_MISSING]: init parent directory does not exist: /tmp/patchgate-try` (exit 2). The same command is in README.md:39. `init` only writes `…/patchgate.yml` inside an **existing** directory (`src/cli/ux.ts:155`). A non-programmer copying the block is stopped at the first product command after `--help`.
- Suggestion: Document `mkdir -p /tmp/patchgate-try` first, or change `init` to create the parent directory, or init into `.` / the clone. Keep the “refuses to overwrite” rule.
- Status: open

### Issue 2 -- Severity: bug

- File: docs/PROJECT_CONSTITUTION.md:154
- Description: Constitution §8.1 still shows `npx patchgate preflight --base origin/main` as the user command. This project’s package is unpublished, so that is not PatchGate. Worse: `npx patchgate` **does** resolve today — to unrelated `patchgate@0.3.3` on npm (`shivae372-hub/patchgate`). Getting-started.md:8 and README.md:28 say “`npx patchgate` is not available”, which is false in the npm sense and dangerous in the product sense. After a successful local `init`, human next-steps still say `Run \`patchgate validate --policy <path>\`` (`src/cli/ux.ts:173`) and `Run \`patchgate preflight …\`` (`src/cli/ux.ts:263`). `patchgate` is not on `PATH` after clone+build (`command -v patchgate` failed). Root help is `Usage: patchgate <command>` (`src/cli.ts:36`). A new user who tries the “simple” command either hits `command not found` or silently runs someone else’s CLI.
- Suggestion: Constitution §8.1 should use the working clone command (`node dist/src/cli.js preflight --base origin/main`) or an explicit “not published; npm name `patchgate` is already taken” note. CLI help and next-steps should print `node dist/src/cli.js …` until there is a real bin on PATH. Do not tell users `npx patchgate` is “unavailable” — say it is a **different package**.
- Status: open

### Issue 3 -- Severity: bug

- File: docs/getting-started.md:86
- Description: Step 6 says the ready fixture “should **print** a receipt with `final.status: ready_for_review`”, but the command uses `--report /tmp/patchgate-receipt.json`. `evaluate` writes the file and prints nothing when `--report` is set (`src/cli.ts:361`). Ran as written: empty stdout, exit 0, status only inside the file. The follow-up “blocked case” (getting-started.md:96) is `evaluate --event fixtures/pr-ready.json --fail-on never`, which is the **ready** fixture (`never.status= ready_for_review`). A new user cannot tell success from failure, and never sees a blocked receipt.
- Suggestion: Either drop `--report` so stdout is the receipt, or `cat` / tell them to open the JSON. Point the blocked example at a real non-ready fixture (or keep `--fail-on never` on a fixture that is actually `blocked`).
- Status: open

### Issue 4 -- Severity: bug

- File: docs/github-action-usage.md:43
- Description: The recommended shadow YAML is copy-pasteable as a GitHub Action **reference**: `uses: daichunghy/patchgate@v0.1.0-beta.2` (line 54) matches a real public tag with root `action.yml` and `dist/action/index.js`; `node24` is valid on current GitHub-hosted runners. It is not Marketplace. Three paste-time traps remain for a non-specialist:
  1. Permissions are `checks: write`, `pull-requests: read`, `contents: read` only. The permission contract (`docs/github-permissions.md:15`) and this repo’s own `.github/workflows/patchgate-shadow.yml` also need `actions: read` for workflow-source evidence. An explicit `permissions:` block sets omitted scopes to none, so required-check evidence fail-closes.
  2. `github-token: ${{ github.token }}` cannot hold Administration. On a protected repo the snapshot is rejected (`GITHUB_PROVENANCE_AMBIGUOUS`). That is documented in prose (github-action-usage.md:24 and §4), but the YAML itself still looks like a complete setup.
  3. Consumers are told to pin `v0.1.0-beta.2`. Live smoke of that tag posted **no** Check Run on snapshot rejection (`docs/reviews/2026-08-22-live-smoke-findings.md` finding 6). Current tree has `upsertRejectionCheckRun` (`src/action/index.ts:249`); the tag the YAML pins does not. Combined with (2), a first paste on a normal protected repo is a green job and a silent Checks tab.
- Suggestion: Add `actions: read` to the copy-paste block. State in the YAML comments (not only later prose) that `github.token` is observation-only and native controls need a PAT/App token. Either pin a SHA/tag that includes rejection check-runs, or warn that beta.2 rejection is logs-only. Say the workflow file must land on the **default branch** before `pull_request_target` will run.
- Status: open

### Issue 5 -- Severity: suggestion

- File: docs/getting-started.md:102
- Description: Next step after the local walkthrough is the G4 runbook, whose consumer snippet is `uses: daichunghy/patchgate@<PATCHGATE_ACTION_SHA>` (`docs/pilots/g4-shadow-installation-runbook.md:53`). That string is not installable. The same user already passed a working tag in github-action-usage.md. Section 2 “Hardened Enforcement Mode” (github-action-usage.md:67) is a **step fragment** with `fail-on: blocked`, not a full workflow; a non-programmer can overwrite the shadow file with it and start failing jobs. README.md:64 still points at this repo’s dogfood workflow (`uses: ./` + `npm ci` + Node 20.x), which is the wrong shape for any other repository.
- Suggestion: Getting-started should next-step only the §1 YAML with the real tag (and a SHA footnote). Keep G4 as “replace the tag with a verified SHA after consent.” Label §2 “do not copy yet.” Do not send strangers to `uses: ./`.
- Status: open

### Issue 6 -- Severity: suggestion

- File: README.md:125
- Description: The README is still a developer dump: ~70-line tree, then 40+ documentation links, then “Local development” (README.md:72) with `verify` / `bundle:action` / support-bundle. Getting-started is the actual stranger path but is easy to miss under that list. Getting-started.md:15 says “Requires Node.js 20 or later” with no install hint; `.github/CONTRIBUTING.md:27` says “Node.js 20.x or 22.x”; `action.yml:43` is `node24`; CI matrix is 20.x/22.x. A new user on an old Node, or one who starts at CONTRIBUTING, gets conflicting gates. SUPPORT.md:9 still points at `README.md#local-development`, not getting-started.
- Suggestion: Lead README with the getting-started six steps (after mkdir is fixed) plus the shadow YAML. Move the tree and prompt/review inventory out of the first screen. One Node sentence: “Node 20+ to build the CLI; the tagged Action runs on the GitHub `node24` runtime.” Point SUPPORT at getting-started.
- Status: open

### Issue 7 -- Severity: nit

- File: src/cli/ux.ts:226
- Description: If the user does create `/tmp/patchgate-try` and then `doctor --base /tmp/patchgate-try` (reasonable after step 2), doctor exits 1 with `attention` solely because that directory is not a Git repo. Policy, package, and network all pass. The walkthrough doctors `docs/patchgate.example.yml` inside the clone, so a careful copier avoids this; anyone applying the tool to the directory they just initialized does not.
- Suggestion: Missing git should stay informational (like missing `package.json`) unless Git-ref mode was requested, or the walkthrough should doctor the clone / say exit 1 is expected.
- Status: open

### Issue 8 -- Severity: nit

- File: action.yml:9
- Description: Action defaults are `fail-on: blocked` and `create-check-run: false`. The shadow YAML overrides both, so a full copy of §1 is fine. A user who writes only `uses: daichunghy/patchgate@v0.1.0-beta.2` (or copies `action.yml` comments) gets failing jobs and no Check Run. `action.yml` branding still looks Marketplace-ready while docs say it is not listed.
- Suggestion: Keep defaults if enforcement-later is intentional; put `fail-on`/`create-check-run` in every published snippet (already true for §1). Do not describe `action.yml` as Marketplace metadata (see Persona B).
- Status: open

---

## Persona B — OSS program

### Issue 1 -- Severity: bug

- File: docs/PROJECT_CONSTITUTION.md:154
- Description: §8.1 still advertises `npx patchgate` as the product UX. That is a false install path for this repository (private unpublished `0.1.0-dev`) and currently executes **another** maintainer’s published CLI (`patchgate@0.3.3`). A program reviewer who tries the constitution command, or who compares constitution vs README, will treat the docs as unreliable. README/getting-started correctly refuse a `v0.1` / production / pilot claim; constitution was not updated with them.
- Suggestion: Replace §8.1 with the clone+build command, or mark it as target UX gated on a future distinct package name. Record that the npm name `patchgate` is taken so a later publish cannot silently assume `npx patchgate`.
- Status: open

### Issue 2 -- Severity: suggestion

- File: docs/application/codex-for-open-source-form-draft.md:30
- Description: Qualification text (493/500 chars) says “active issue triage” and “Usage is not yet broad.” Live check: **0 stars, 0 forks**, unpublished package, no downloads, five open issues that the evidence index itself calls contribution routing / self-authored work. “Not yet broad” is a euphemism for **no usage**. The same file’s “anything else” block (line 42, 440/500) and the evidence table (line 54) are honest: no external pilots, no adoption, self-authored Discussions. Do not pad with fake stars; the gap is wording in the 500-char qualification, not missing users.
- Suggestion: Spend the remaining 7 characters plus a rewrite to match the research note: “0 GitHub stars, no package downloads, no external pilots (YYYY-MM-DD). Applying on ecosystem-importance, not adoption.” Drop “active issue triage” unless an external issue exists.
- Status: open

### Issue 3 -- Severity: suggestion

- File: README.md:184
- Description: The repository tree calls `action.yml` “GitHub Marketplace Action metadata” (also AGENTS.md:72). The Action is not Marketplace-listed. `github-action-usage.md:3` correctly says it is not a released Marketplace action. A five-minute reviewer who greps “Marketplace” will see a contradiction. AGENTS.md:191 still shows `patchgate preflight` / `fail-on: blocked` as “first product scope”; the paragraph after (AGENTS.md:206) correctly limits beta.2 to shadow. The command examples remain the part a skimmer copies.
- Suggestion: Say “GitHub Action metadata (not Marketplace-listed).” In the AGENTS first-scope YAML, show `fail-on: never` as the current allowed form, and keep `fail-on: blocked` labeled as post-`v0.1` enforcement.
- Status: open

### Issue 4 -- Severity: nit

- File: package.json:2
- Description: `"name": "patchgate"` collides with an existing npm package in an adjacent “AI agent policy” niche. That is not a fake-adoption problem today (`private: true` prevents publish, and the checker enforces it). It is a maintenance/identity signal: any future `npx patchgate` / download-count story will either fail to publish or be unreadable next to `0.3.3`. Codex usage scoring looks at npm/Marketplace numbers; this name cannot produce *this* project’s numbers without a rename or a transfer.
- Suggestion: Pick a publish name now (`@daichunghy/patchgate` or similar) in application/release docs without flipping `private`. Do not claim a public npm package.
- Status: open

### Issue 5 -- Severity: nit

- File: AGENTS.md:101
- Description: The operating snapshot is the right shape for an evaluator: G0–G4 limits, admin-merge of PR #9 recorded as maintainer decision, beta.2 shadow-only, no downstream usage, no G2 sessions, no external replies. Evidence dossier, evidence index, constitution matrix, and form “anything else” agree. Residual risk is only **self-authored theater** if a reviewer opens Discussions #1–#10 and issues #4–#7 without reading those caveats. The form still lists “five self-authored Discussions and a scheduled community workflow” as evidence — allowed as maintenance, easy to misread as community if the reader stops at “Discussions.”
- Suggestion: Keep the honest tables. In the 500-char “anything else” field, prefer checkable URLs (release tag, CI run, SECURITY.md) over Discussion count. Do not cite `patchgate-beta-smoke` as a pilot (current docs already do not; keep it that way).
- Status: open

---

## What this review is not asking for

- No AI-authorship detector, generic policy engine, dashboard, or other constitution-barred product.
- No invented stars, downloads, pilots, or `v0.1` declaration.
- No requirement to `npm publish` in this change; only to stop advertising `npx patchgate` as if it were this CLI.
- Action copy-paste should stay shadow (`fail-on: never`). Enforcement mode is a later, labeled step.
