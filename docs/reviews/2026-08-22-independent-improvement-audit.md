# Independent improvement audit — 2026-08-22

**Scope:** working tree at `/Users/macos/Desktop/Github` for two outcomes:
(1) a usable, trustworthy, installable open-source product; (2) an *honest*
Codex for Open Source application (core maintainer of an active public OSS
project; reviewers look at usage, ecosystem importance, and active
maintenance). There is no official 1000-star cutoff.

**Authority:** `docs/PROJECT_CONSTITUTION.md` remains higher than this audit.
Policy is always from base SHA. `AGENTS.md` is discovery-only. This report
does not authorize a `v0.1` claim, a public npm publish, or any adoption
statement.

**Tree vs remotes (do not assume dirty work is intended):**

| Ref | SHA observed |
| --- | --- |
| Local `refs/heads/main` | `e4052f20ba8d8178345943ae3cd85f539a6a4ea3` |
| Last fetched `origin/main` (`FETCH_HEAD`) | `6db56a45df7f84732cb7f340be539f8112a11f8b` |
| `AGENTS.md` “public default branch” | `main@c9f643e` |

This audit could not run `git status` / `git log`. Treat `coverage/`,
`dist/src/**`, `node_modules/`, and any uncommitted edits (including
Unreleased CHANGELOG + this review directory) as **not** origin/main until
the parent agent diffs them. Do not ship them by accident.

**Evidence files read:** constitution, `AGENTS.md` status, roadmap, README,
`docs/reviews/2026-08-22-multi-persona-review.md`, Unreleased CHANGELOG,
`package.json`, `action.yml`, `src/cli.ts`, `src/cli/ux.ts`, Action runner,
community-health files, Action usage + G4 runbook, live-smoke findings,
application dossier / form draft / evidence index / readiness matrix.

---

## A. Current honest OSS / application posture

What is already strong, and can be said without inventing users:

### Product identity (rare and worth keeping)

The constitution’s promise is narrow and testable: a contribution must show
required evidence, ownership, and human boundaries *before* it is represented
as ready for review. The tree actually implements that split:

- Enforceable sources vs discovery-only prose (`src/discovery.ts`,
  `src/policy.ts`, constitution §5).
- Base-SHA policy, never PR-head self-relaxation (`loadPatchgatePolicyFromGitRef`,
  GitHub contents from base).
- Five statuses with fail-closed unknowns (`src/contract/status-precedence.ts`).
- Receipt digests bound to policy/evidence SHAs (`src/evaluator.ts`, schemas).

This is the ecosystem-importance *hypothesis*. It is not usage evidence.

### Engineering that a reviewer can verify locally

- Strict TypeScript, zero-`any` rule, pure evaluator core, injected timestamps.
- `npm run verify` is a real chain: lint, types, fixture budgets, workflow
  pins, events, doc links, community-schedule, dossier, audit, unit,
  security, GitHub mocks, build, ncc bundle, consumer fixture, release
  candidate, CLI process tests.
- Adversarial fixtures exist (policy self-relaxation, stale/foreign checks,
  fork, redaction).
- 2026-08-22 live consumer smoke found a *real* runner bug (dashed
  `INPUT_GITHUB-TOKEN`) and shipped `v0.1.0-beta.2`. That is maintenance
  evidence: a tagged pre-release was corrected after a live failure, not
  papered over.

### Public foundation (G0 partial, honestly recorded)

Present and checkable: public `daichunghy/patchgate`, Apache-2.0, Community
Profile files (README, LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY,
SUPPORT, issue/PR templates), Discussions, private vulnerability reporting,
Dependabot npm, protected `main`, SHA-pinned workflows, root `action.yml` +
committed `dist/action/index.js`.

Honest limits already written into `AGENTS.md` / constitution:

- Package is `"private": true`, version `0.1.0-dev`.
- No downstream usage; 0-star/0-fork metrics are the last *honest* public
  snapshot in the form draft / evidence index (re-check live before any
  application).
- PR #9 and follow-ups were admin-merged after lifting `enforce_admins`;
  recorded as maintainer decision, not independent review.
- Discussions, Project #1, contribution issues, scheduled posts, and
  outbound comments are **self-authored maintenance**, not community
  participation.
- `v0.1.0-beta.2` is shadow-evidence scope only. Shadow-install no-go is
  recorded. Maintainer smoke repo `daichunghy/patchgate-beta-smoke` is
  **not** an external pilot.

### Codex application: what is already defensible

Official criteria (core maintainer of an *active public* OSS project; usage,
ecosystem importance, PR/issue/release hygiene) can be addressed **without**
stars:

| Signal | Honest claim today |
| --- | --- |
| Public OSS + maintainer role | Yes: `daichunghy/patchgate`, Apache-2.0 |
| Active maintenance | Yes, if described as pre-release dogfooding: CI, CodeQL, Dependabot merges, beta.1→beta.2 hotfix, threat model |
| Release management | Weak but real: two pre-release tags, rollback runbook, `check:release-candidate` |
| PR review / issue triage | Weak: templates exist; independent reviewers and external issues do not |
| Usage | **None.** Do not submit as “widely used.” |
| Ecosystem importance | **Hypothesis only** (RepoComplianceBench + scattered governance files). Form draft already frames it this way. |

**Application-doc rot is now a trust risk.** Several application files still
describe a world that `AGENTS.md` has already left:

- `docs/application/codex-for-open-source-evidence-dossier.md` still lists
  “open PR #9”, “0 tags/releases”, and an unchecked “Merge the public
  hardening PR”.
- `docs/application/evidence-index.md` still says “open PR #9” and “0
  tags/releases”.
- `docs/application/constitution-readiness-matrix.md` still wants “merge
  PR #9” on the five-day path.
- Form draft “anything else” still cites `v0.1.0-beta.1` only.

A Codex reviewer who opens those files against GitHub will see contradiction.
Fixing that *wording* is allowed; inventing users is not.

---

## B. Highest-leverage product / UX gaps that block first users

These are the blockers that stop a stranger (or a Codex reviewer) from getting
value in one sitting. Ranked by “cannot complete UJ-01 / UJ-03”.

### B1. There is no `npx patchgate` path (P0 product, maintainer-gated publish)

Constitution §8.1 advertises:

```bash
npx patchgate preflight --base origin/main
```

Reality:

- `package.json` is `"private": true`, `"version": "0.1.0-dev"`.
- `scripts/check-release-candidate.mjs` **fails the build** if `private`
  is not `true` or the version does not end in `-dev`.
- `bin` is `"patchgate": "dist/src/cli.js"`.
- `.gitignore` ships only `dist/action/**`. `dist/src/cli.js` is local-build
  only.
- No `"files"` allowlist, no `"exports"`/`"main"`, no `prepare`/`prepack`
  script. `npx github:daichunghy/patchgate` cannot work: the CLI binary is
  not in git.

README is honest (`node dist/src/cli.js …` after `npm run build`) but that
is a **contributor** loop, not a user loop. The multi-persona review already
called this the largest adoption blocker.

**Do not** flip `private: false` in this session. The checklist and
constitution treat publish as a maintainer release decision. What *is*
in-session: packaging prep + a first-run that matches documented commands
from a clone.

### B2. The advertised preflight command does not do what it says

`src/cli.ts` `preflight`:

- `--base` is **required**; omitting it exits 2 with a usage line.
- Without `--repo`, `--base` is always a **filesystem** path
  (`loadPatchgatePolicy`).
- Git-ref mode is only `preflight --base <ref> --repo <dir>`.

So `patchgate preflight --base origin/main` (constitution + UJ-01) tries to
`stat("origin/main")` and dies with `POLICY_INVALID`, not a Git-ref load.

`--repo` on preflight means “local git directory”, while `github snapshot
--repo` means `owner/name`. Same flag, two meanings.

`validate` silently accepts `--base` as an alias for `--policy`
(`argument("--policy") ?? argument("--base")`). Help text does not.

`--report` (evaluate) vs `--output` (github snapshot / support-bundle) is
still split. Root help now documents `--json` and `--fail-on` (persona-3
“undocumented --json” is **already fixed** in this tree); do not re-fix it.

### B3. `init` / `doctor` are Node-repo tools pretending to be generic

`initPolicy` (`src/cli/ux.ts`):

- Writes a **root** `patchgate.yml` with only `version: 1` plus two comments.
- Does not offer `.github/patchgate.yml` even though the adapter and (as of
  the 2026-08-22 persona fix) local loader prefer root then `.github/`.
- Does not paste the commented example from `docs/patchgate.example.yml`.
- Refusing overwrite is correct and must stay.

`doctor`:

- Four checks: policy, git, **package.json**, network-not-required.
- Missing `package.json` is `attention`, so a Python/Go/Rust repo with a
  valid policy **cannot** reach `ready_for_local_preflight`. First adoption
  segment in user-requirements is “small and solo-maintainer OSS”, not
  “npm packages”.
- Does **not** report GitHub token/permission/source-identity/merge-queue
  (UR-004). That is fine locally if labeled; it is not a substitute for
  Action first-run diagnosis.
- Success next-step is `patchgate preflight --base <policy-path>`, which
  fights Git-ref mode.

### B4. Action install docs teach the dogfood workflow, not the consumer workflow

Two contradictory install stories:

| Surface | What a first consumer is told | What actually works |
| --- | --- | --- |
| `docs/github-action-usage.md` §1 | `pull_request_target` + checkout **consumer** base + `npm ci` + `npm run build` + `uses: ./` | That builds **their** repo, not PatchGate. On a non-JS consumer this is a hard fail. |
| `docs/pilots/g4-shadow-installation-runbook.md` | `uses: daichunghy/patchgate@<SHA>` with no checkout of PR code | Correct consumer shape; still a placeholder SHA, not `v0.1.0-beta.2`. |
| README “GitHub Action candidate” | Points at this repo’s `.github/workflows/patchgate-shadow.yml` | That workflow still **rebuilds from source** (`npm ci && npm run build && npm run bundle:action` + `uses: ./`) and pins Node **20.x** while `action.yml` is `node24`. |
| `action.yml` defaults | `fail-on: blocked`, `create-check-run: false` | A copy-paste of `action.yml` without the shadow runbook **fails the job** on non-ready and posts **no** Check Run. |

Live finding 5: `GITHUB_TOKEN` cannot hold Administration, so native
Rulesets/branch-protection snapshots reject with
`GITHUB_PROVENANCE_AMBIGUOUS`. Usage guide now states this; the **quick
start YAML still does not** pass a PAT/App token, so first shadow installs
on protected repos will look “broken” (fail-closed is correct; the UI is
not).

Live finding 6 (still open): rejected snapshots (`src/action/index.ts`
~239–249) set outputs + step summary and **return without**
`upsertCheckRun`. PR Checks tab shows only the workflow job. Consumers
cannot tell “PatchGate ran and refused the snapshot” from “PatchGate never
ran”.

`create-check-run` default `false` plus finding 6 means the default Action
is silent on the Checks API even when evaluation succeeds.

### B5. First-run README is a developer dump, not a 15-minute UJ-01

README “Local development” is eleven commands including `verify`,
`bundle:action`, fixture snapshot, and support-bundle. There is no:

1. Install (clone + build **or** Action pin).
2. `init` → `validate` → `preflight --base HEAD --repo .`.
3. Shadow workflow copy-paste with `v0.1.0-beta.2` and `fail-on: never`.

The repository tree dump (~70 lines) and the 40-link documentation list
bury the job-to-be-done. That hurts both first users and a Codex reviewer
who has five minutes.

### B6. Version / runtime scatter

| Surface | Node story |
| --- | --- |
| `package.json` `engines` | `>=20` |
| `.github/CONTRIBUTING.md` | “Node.js 20.x or 22.x” |
| CI matrix | 20.x and 22.x on ubuntu/macos |
| `action.yml` | `using: node24` (after runner deprecation) |
| Shadow workflow + usage-guide dogfood | `node-version: 20.x` then **builds** the Action instead of using the node24 bundle |
| Bug template placeholder | `0.1.0-dev` |

This is not a security bug. It is a first-install support ticket.

---

## C. OSS community-health gaps vs GitHub profile / Dependabot / SECURITY / SUPPORT / contributing

Community Profile **checkboxes** are largely filled (roadmap/AGENTS claim
100%). The operational gaps that a human reviewer still sees:

### C1. Dependabot is npm-only

`.github/dependabot.yml` has a single `package-ecosystem: npm` weekly job.
Workflows pin `actions/checkout` and `actions/setup-node` by SHA (good),
but there is **no** `github-actions` ecosystem update. Action pins will
rot silently. This is real maintenance evidence for Codex (Dependabot PRs
#11/#13/#14 were merged; #12 TypeScript 7 is openly deferred because ncc
cannot bundle). Adding Actions Dependabot is allowed and honest.

### C2. CONTRIBUTING stops before a contributor can land a PR

`.github/CONTRIBUTING.md` ends at:

> 3. Keep pull requests focused, concise, and within reviewability budgets.

Missing, and expected by GitHub reviewers / first contributors:

- Branch / fork model and `npm run verify` as the only merge gate.
- Current Node matrix vs Action `node24`.
- “Policy is always base SHA; AGENTS.md is discovery-only.”
- Pointers to issues #5/#6/#7 and the rule that good-first work must stay
  **outside** the trust boundary (already in `docs/agent-work-packages.yml`
  PG-608, not in CONTRIBUTING).
- How reviews actually happen: one maintainer, admin bypass recorded, no
  independent approver. Say that. Do not pretend there is a review board.
- No DCO/CLA — fine, but state “Apache-2.0, no extra CLA”.

### C3. SUPPORT and SECURITY are structurally present, operationally thin

- SUPPORT: four links + “use Discussions / issue forms”. No response window,
  no “pre-release: best effort”, no “we will not debug your Ruleset”.
  Relative `../docs/...` links are OK from `.github/SUPPORT.md` on GitHub.
- SECURITY: private advisory URL + 48h / 5d / 14d SLAs. Fallback is
  “repository owner profile” (no security@ email). SLAs are a promise with
  no observed inbound advisory. Keep SLAs conservative or label them
  “target during pre-release”.
- Supported versions table correctly lists beta.2 / 0.1.0-dev and “no
  stable release”.

### C4. Issue routing exists; contributor on-ramps are incomplete

- `blank_issues_enabled: false` + security/discussions contact links: good.
- Bug + feature forms exist; placeholders still say `0.1.0-dev` and
  `patchgate evaluate --event`.
- No issue form for “I tried the Action and got `GITHUB_PROVENANCE_AMBIGUOUS`”
  (the actual first-run failure).
- Contribution issues #5/#6/#7 are linked from README; labels `bug`/`triage`
  are hardcoded; `good first issue` / `help wanted` are **not** defined in
  tree. Persona-4’s “good-first-issue routing already exists” overstates
  GitHub label/UI routing.

### C5. Scheduled Discussions are a maintenance workflow, not a community

`.github/community-posts.json` + `community-discussion-schedule.yml` publish
hand-written Q&A on a two-day cadence through 2026-09-03, guarded by
duplicate-title checks. Constitution §13 and UR-406 forbid counting this as
adoption. **Do not add more scheduled posts this session.** They increase
self-authored surface area that a Codex reviewer will discount.

### C6. CODEOWNERS is a solo-maintainer file

`.github/CODEOWNERS` is `@daichunghy` on every path. Accurate. Do not invent
teams. The gap for Codex “PR review” is **independent** review, which cannot
be produced inside this repo without an external human.

### C7. Application / status docs disagree with GitHub

See section A. For community health this reads as “the project cannot keep
its own evidence index consistent,” which is worse for a review-readiness
gate than a missing FUNDING.yml (FUNDING is optional; skip it).

---

## D. Feature proposals

Legend: **users** = first-run / install / clarity. **Codex** = honest
application signal (usage, maintenance, reviewability). Constitution risk
is required.

### P0 — this session, no new evidence claims

| ID | Change | Why | Files likely touched | Constitution risk |
| --- | --- | --- | --- | --- |
| P0-1 | First-run CLI: default `--base` to `.`; if `--base` is not an existing path, treat it as a Git ref with `--repo` defaulting to cwd; document the two `--repo` meanings | Makes constitution `preflight --base origin/main` true; UJ-01 | `src/cli.ts`, `src/policy.ts` (maybe), `test/cli-smoke.test.ts`, README | Low if Git-ref still reads objects only and never checks out PR code |
| P0-2 | `init` writes a **commented** copy of supported rule classes (from `docs/patchgate.example.yml`) and accepts a `.github/patchgate.yml` target; keep overwrite refusal and `enforcement: not_enabled` | Empty `version: 1` drafts produce `policy_ambiguous` later; first users need a map | `src/cli/ux.ts`, `test/cli-smoke.test.ts`, example YAML | Medium if comments are parsed as rules — keep them comments; do not enable enforcement |
| P0-3 | `doctor`: `package.json` is informational, not `attention`; mention `.github/patchgate.yml`; do not claim GitHub API access | Unblocks non-JS repos; UR-001 | `src/cli/ux.ts`, CLI smoke | None |
| P0-4 | Consumer Action quick start: lead with `uses: daichunghy/patchgate@v0.1.0-beta.2`, `fail-on: never`, `create-check-run: true`, permissions block, and the Administration-token boundary. Move `uses: ./` + `npm ci` to “this repository’s dogfood workflow only” | Stops first consumers from building the wrong repo; UJ-03 | `docs/github-action-usage.md`, README, maybe G4 runbook (replace `<SHA>` with tagged beta.2 **and** still recommend full SHA) | Low if still labeled beta/shadow, not Marketplace/`v0.1` |
| P0-5 | On snapshot **rejection**, still upsert a Check Run when `create-check-run: true` (neutral / `evidence_missing`, diagnostic id + remediation). Do not turn rejection into `ready_for_review` | Live finding 6; otherwise shadow mode is invisible | `src/action/index.ts`, `test/action.test.ts` | Low: fail-closed status stays; only delivery |
| P0-6 | Packaging **prep** without publish: `"files"` allowlist (`dist/src/cli.js`, `dist/action/**`, `action.yml`, `schemas/`, LICENSE, README); `prepack` builds CLI; keep `private: true` and `-dev`; teach clone/`npm pack` as the install; **do not** add `npx patchgate` to README as if the package were public | Unblocks a local tarball / future publish; satisfies pack-surface already asserted by `check-release-candidate.mjs` | `package.json`, `.gitignore` or `.npmignore`, `scripts/check-release-candidate.mjs`, README | **High if `private` is flipped.** Keep the checker’s private+dev invariant |
| P0-7 | Honesty pass on application + status docs: PR #9 merged, beta.2 exists, smoke repo is maintainer-only, 0 external users | Codex reviewers will diff dossier vs GitHub | `docs/application/*.md` (dossier, evidence-index, form draft “anything else”, readiness matrix), only if the parent is already editing docs | None — this *reduces* overclaim. Do not add stars/users |
| P0-8 | CONTRIBUTING + SUPPORT + Dependabot Actions: Node 20/22/24 truth, verify command, good-first issues outside trust boundary, pre-release support expectation, `github-actions` Dependabot | Real maintenance + contributor on-ramp | `.github/CONTRIBUTING.md`, `.github/SUPPORT.md`, `.github/dependabot.yml` | None |

P0-1, P0-4, P0-5 are the user-visible trio. P0-6 is packaging without a
release claim. P0-7 is application hygiene. If the session only has room
for the slices in §F, drop P0-2/P0-3 into the same CLI PR as P0-1.

### P1 — next week (needs a human, a publish decision, or live re-smoke)

| ID | Change | Why | Files | Constitution risk |
| --- | --- | --- | --- | --- |
| P1-1 | Maintainer-authorized npm **public** pack of an explicit pre-release (`0.1.0-beta.2` or a dedicated `0.1.0-dev.N`), then README may say `npx patchgate@…` | Only thing that makes constitution §8.1 true; Codex “usage” still stays “downloads = N” with real npm numbers | `package.json` (private/version — **checker must change in the same PR**), release runbook | High: publishing is G6-shaped. Must not be called `v0.1` |
| P1-2 | Re-verify **this** repo’s Shadow Gate on `main` after the input fix (finding 3 voided prior runs) | Internal shadow evidence is currently unusable | workflow runs, `docs/reviews/` | None if results stay non-ready / fail-closed |
| P1-3 | One consented **external** shadow install using the G4 runbook + feedback template | Single strongest Codex “usage” artifact that is not fake | consumer workflow, `docs/pilots/` record **only with consent** | High if published without consent or described as adoption |
| P1-4 | Independent review exchange (review their project, get one approving review here) | Unblocks honest merge governance; Codex “PR review” | GitHub review, AGENTS status | None if not traded for stars |
| P1-5 | Three G2 usability sessions (protocol already exists) | UR-401; will change CLI copy | `docs/pilots/g2-*` | None; do not invent success rates |
| P1-6 | Default `create-check-run: true` in `action.yml` **or** a `mode: shadow` input that sets fail-on never + check-run | Defaults currently hide the product | `action.yml`, Action parser/tests, usage guide | Medium: default must remain non-blocking |
| P1-7 | `doctor --live` (opt-in, token from env) for Administration / actions:read / checks:write capability | UR-004/UJ-05 | `src/cli.ts`, github client | Medium: must not write; must not treat 404 as absence |
| P1-8 | Unify `--report`/`--output`; document validate `--base`; CLI `--fail-on` already exists for evaluate/snapshot | Persona-3 leftovers | `src/cli.ts`, tests | None |
| P1-9 | Receipt schema: stop pinning `evaluatorVersion` as JSON Schema `const`; dedicated diagnostic on bump | Persona-3; first version bump will otherwise Ajv-fail all receipts | `schemas/contribution-receipt.schema.json`, `src/contract/validation.ts` | Low |
| P1-10 | Marketplace listing only after P1-1/P1-2 and a written “not production” banner | Discoverability | GitHub Marketplace metadata | High if listed as stable |

### P2 — later (after shadow evidence, not this month’s Cosplay)

| ID | Change | Why | Constitution risk |
| --- | --- | --- | --- |
| P2-1 | Authenticated merge-group membership contract | Required for merge-queue repos; currently explicit `evidence_missing` | High if approximated |
| P2-2 | GitHub App expected-source (distinct from Actions identity) | Constitution already forbids claiming App source until it exists | High |
| P2-3 | Glob `?` escape; schema forbidding `failed`+`evidence` → green; digest helper de-duplication | Persona-3 hardening | Low |
| P2-4 | CODEOWNERS subset expansion only with fixtures | Issue #6 | High if undocumented syntax is guessed |
| P2-5 | Demo GIF/asciinema of preflight + shadow check | Cheap visibility; still not usage | None if it shows a **fixture**, not a fake production deploy |
| P2-6 | G5 required-check / expected-source hardening | After two shadows and zero known false greens | High |
| P2-7 | Open Contribution Governance Corpus | Constitution: later research, not a product prerequisite | High if scraped without license |

---

## E. Explicit NON-goals / do-not-do

Do **not** do any of the following in this session or as “Codex prep”:

1. Turn PatchGate into a generic policy engine, OPA/Conftest clone, Danger
   replacement, merge bot, merge-queue product, or GitHub App SaaS.
2. Add AI-authorship, code-quality, license, or correctness oracles.
3. Infer blocking rules from `AGENTS.md` / CONTRIBUTING / README prose.
4. Read policy from PR head. Policy is always base SHA.
5. Fake stars, watchers, forks, Discussions-as-users, sock-puppet issues,
   or “community engagement” cadences aimed at the application.
6. Claim `v0.1`, production, pilots, Marketplace popularity, or Codex
   eligibility/selection.
7. Count `daichunghy/patchgate-beta-smoke`, self-merged PRs, Project #1, or
   scheduled Discussion #10 as external adoption.
8. Flip `"private": false` or tag `v0.1.0` without a maintainer release
   decision that also changes `check-release-candidate`.
9. Publish extra scheduled Discussions or bulk-comment related OSS repos.
10. Check out or `npm install` pull-request code in
    `pull_request_target`.
11. Grant or document a workflow `administration:` permission (GitHub
    rejects it); do not paper over `GITHUB_PROVENANCE_AMBIGUOUS`.
12. Silent-green on missing policy (`policy_ambiguous` is the honest result).
13. GitLab / Bitbucket / GHES / org-wide policy fleet.
14. Cryptographic receipt signing or compliance certification.
15. Hosted dashboard / database.
16. Asking anyone for stars, ChatGPT Pro support, or positive quotes.

---

## F. Suggested PR-sized slices for this session (max 5)

Ship these as **separate** PRs if possible; they fail independently and
stay inside the dirty-tree caution.

### Slice 1 — CLI first-run contract (P0-1 + P0-2 + P0-3)

**User outcome:** from a clone, `npm run build && node dist/src/cli.js
preflight --base origin/main` (or `--base .`) works on PatchGate itself
and on a non-JS fixture repo.

**Include:** Git-ref auto-detect; `doctor` package.json informational;
`init` commented example + `.github/` path; smoke tests for
`fixtures/repositories/github-dir-policy` and a repo **without**
package.json; `--help` examples that match behavior.

**Exclude:** npm publish, `--live` doctor.

### Slice 2 — Consumer Action install truth (P0-4)

**User outcome:** a stranger can copy one YAML from README /
`docs/github-action-usage.md` and pin `daichunghy/patchgate@v0.1.0-beta.2`
(or the documented full SHA) with `fail-on: never`.

**Include:** dogfood `uses: ./` demoted; Administration token note in the
YAML comments; Node 24 vs 20 scatter called out; G4 runbook placeholder
replaced.

**Exclude:** Marketplace submit; changing this repo’s shadow workflow to
the published Action (that is a separate dogfood decision).

### Slice 3 — Rejected-snapshot Check Run (P0-5)

**User outcome:** `create-check-run: true` always leaves a Check Run, even
when the snapshot is rejected (`GITHUB_PROVENANCE_AMBIGUOUS`, merge_group,
etc.), conclusion `neutral`, status `evidence_missing`.

**Include:** tests with dashed `INPUT_*` names (do not regress finding 2);
no change to fail-on mapping.

**Exclude:** defaulting `create-check-run` to true (P1-6).

### Slice 4 — Pack surface without publishing (P0-6)

**User outcome:** `npm pack --dry-run` contains CLI + Action; a documented
`npm pack && npm install -g ./patchgate-0.1.0-dev.tgz` path exists; README
still says the registry package is unpublished.

**Include:** `"files"`, `prepack` build, keep `private: true`, adjust
checker only if the allowlist changes.

**Exclude:** `private: false`, npm login, `npx patchgate` billed as public.

### Slice 5 — Honesty + contributor health (P0-7 + P0-8)

**User/Codex outcome:** application docs match GitHub; a contributor knows
how to run verify and which issues are safe; Dependabot will ping Action
pins.

**Include:** dossier / evidence-index / matrix / form-draft fact repair;
CONTRIBUTING Node/verify/good-first; SUPPORT pre-release expectation;
Dependabot `github-actions`.

**Exclude:** new Discussions, new “community” metrics, Codex form
submission.

---

## Parent-agent notes

- Prefer slices 1–3 if time is short: they change what a first user *sees*.
- Slice 4 is the prerequisite for a later maintainer publish; it is not
  itself a release.
- Slice 5 is the only Codex-application work that is ethical this session.
- Re-run `npm run verify` after each slice. The 2026-08-22 persona PR
  already fixed `.github/patchgate.yml` local loading, `compareTextUnit`
  sorts, receipt `nativeControls`, and markdown backtick encoding — do not
  reopen those unless the dirty tree dropped them.
- After implementation, update `docs/CHANGELOG.md` Unreleased and the
  roadmap **only** with what was actually verified. Do not mark G2/G4/G7
  complete.
