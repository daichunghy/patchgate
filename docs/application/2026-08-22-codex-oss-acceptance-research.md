# Codex for Open Source: what actually gets maintainers accepted (research, 2026-08-22)

**Status:** research only. Not an eligibility claim, not a prediction of selection, and not application copy.

**Scope:** OpenAI’s Codex for Open Source program (six months of ChatGPT Pro with Codex, plus optional API credits and conditional Codex Security). Research date: 2026-08-22.

**Method:** Official OpenAI pages and program terms were treated as primary. Reddit, Hacker News, the OpenAI developer forum, X, and blogs were treated as anecdotal unless they quoted official text. Live GitHub metrics for local repositories were fetched on 2026-08-22.

**Conservative rule used throughout:** OpenAI publishes no winner list, no scoring rubric, and no numeric cutoff. Silence is common. Self-reported acceptances cannot be independently confirmed against an official roster.

---

## 1. Official program, as of 2026-08-22

### 1.1 What OpenAI says it is

Official sources:

- Application form: <https://openai.com/form/codex-for-oss/>
- Program page: <https://developers.openai.com/community/codex-for-oss>
- Program terms: <https://learn.chatgpt.com/docs/codex-for-oss-terms>
- Launch post: [@OpenAIDevs, 2026-03-06](https://x.com/OpenAIDevs/status/2029998202934677938)

Verified official statements:

- The program supports “maintainers behind critical open-source software.”
- Maintainers “carry significant responsibility by reviewing pull requests, triaging issues, maintaining releases, and preserving security and code quality across widely used projects.”
- Selected maintainers *may* receive:
  1. six months of ChatGPT Pro, which includes Codex
  2. conditional access to Codex Security
  3. API credits for coding, maintainer automation, release workflows, and core open-source work
- Benefits are determined “in OpenAI’s sole discretion.” Duration, scope, and timing “may vary by applicant, repository, or use case.”
- Codex Security is reviewed case by case “given GPT-5.4’s capabilities.”
- Applications are reviewed on a rolling basis. Selected applicants are notified by email.
- Developers may apply for their own project or nominate another maintainer.
- Preferred tools need not be Codex. OpenAI explicitly lists OpenCode, Cline, pi, OpenClaw, “or something else.”
- The ChatGPT Pro track sits on top of the older $1 million Codex Open Source Fund. The fund previously granted API credits (older fund form: grants up to $25,000). That $25,000 figure is for the *fund*, not a promised amount on every Pro application.

### 1.2 Official eligibility language

**Who can apply (form / program page):**

> Maintainers of active open-source projects can apply. We look for projects with meaningful usage, broad adoption, or clear importance to the software ecosystem.

**What they look for:**

> We review signals such as repository usage, ecosystem importance, and evidence of active maintenance. That can include pull request review, issue triage, release management, and other ongoing responsibilities carried by primary or core maintainers.

**Who should apply (program page):**

> If you're a core maintainer or run a widely used public project, apply. If your project doesn't fit the criteria but it plays an important role in the ecosystem, apply anyway and explain why.

**Program terms, section 2 (factors OpenAI *may* consider):**

- repository usage
- ecosystem importance
- evidence of active maintenance
- role or permissions
- Program capacity

Applicants must have a valid ChatGPT account and provide “accurate and complete information about themselves, their repositories, and their role in maintaining or administering those repositories.”

Submission “does not guarantee selection, funding, or access.”

### 1.3 Official verification, fraud, and capacity language

From the terms:

- OpenAI may request extra information to verify identity, repository affiliation, maintainer status, or repository control.
- Decisions are final.
- Benefits are personal, limited, non-transferable, have no cash value, and may not be sold, assigned, sublicensed, exchanged, or shared.
- OpenAI may reject, suspend, or revoke benefits if it reasonably believes the applicant:
  - provided false, misleading, or incomplete information
  - used multiple identities or accounts to obtain more than one benefit
  - transferred, resold, or shared a benefit
  - violated OpenAI terms/policies
  - used the program in a harmful, abusive, fraudulent, or unauthorized manner
- Codex Security and API credits are optional extra benefits and may require separate review.
- Applicants may not use Codex Security on repositories they do not own or lack permission to review.
- Program capacity is an explicit selection factor. A qualified project can still be skipped.

There is **no official numeric threshold** for GitHub stars, downloads, contributors, age, or issue volume.

### 1.4 What the form actually asks

Cross-checked against the local form draft, Simon Willison’s 2026-03-07 note, and a 2026-05-07 walkthrough of the live form ([silenceper](https://silenceper.com/en/article/2026-05-07-free-chatgpt-pro-codex-for-oss/)). Confirm fields on the live form before submitting; forms change.

| Field | Constraint / note |
| --- | --- |
| First name / last name | Applicant identity |
| Email | ChatGPT account email |
| GitHub username | Profile should be public |
| GitHub repository URL | **One public repository URL** |
| Maintainer role | Primary or core maintainer |
| Why does this repository qualify? | 500 characters. Form prompt includes GitHub stars, monthly downloads, *or* why the project is important to the ecosystem |
| Interest | Codex Security and/or API credits |
| OpenAI Organization ID | Linked from the form |
| How will you use API credits for your project? | 500 characters |
| Anything else we should know? | 500 characters |

Simon Willison, quoting the form: it asks for “information such as GitHub stars, monthly downloads, or why the project is important to the ecosystem.”

That “or” is official-adjacent form copy, not a published scoring formula. It is the strongest public hint that ecosystem importance can stand in for missing usage metrics.

---

## 2. Official vs unofficial criteria

### 2.1 Official (verified)

| Signal | Official status |
| --- | --- |
| Core / primary maintainer with write access | Stated. Program page: “core maintainers with write access.” |
| Public, active open-source project | Stated. |
| Meaningful usage **or** broad adoption **or** ecosystem importance | Stated as an or-list. |
| Evidence of active maintenance (PR review, issue triage, releases, security/quality) | Stated. |
| Accurate role, identity, and repository affiliation | Required. Verifiable. False statements are revocation grounds. |
| Program capacity | Explicit terms factor. Not visible to applicants. |
| GitHub-hosted public repo | Form requires a GitHub URL. HN commenters correctly note this GitHub-centrism; it is a practical filter, not a published rule against GitLab/kernel.org. |
| Using Codex specifically | **Not required.** Other agents are explicitly allowed. |

### 2.2 Unofficial numbers that are **not** OpenAI policy

| Claim | Source quality | Verdict |
| --- | --- | --- |
| “At least 1,000 GitHub stars” | Secondary blogs/forums (MLQ, Gnoppix, some X recaps) repeating each other. Not on OpenAI pages. | **Not official.** Treat as rumor. |
| Anthropic’s 5,000 stars **or** 1M monthly npm downloads, plus activity in the last three months | Anthropic’s Claude for Open Source program, reported by Simon Willison and The New Stack | **Official for Anthropic, not for OpenAI.** Do not import this cutoff. |
| OSI-approved license, non-commercial use, “clear governance” as hard gates | Apidog and similar SEO posts | **Not on OpenAI pages.** An OSI license is still a 2-minute legitimacy signal a reviewer can check. |
| “Core contributor, active contributor, or even documentation translator can apply” | openai-hub.com | Overbroad relative to official “primary or core maintainer” / write-access language. |
| Empty or brand-new repos will not qualify | Marketing recap (AIHighlight), not OpenAI | Plausible as a review heuristic, **not a published rule.** Consistent with “active,” “usage,” and “widely used.” |

### 2.3 How OpenAI’s bar differs from Anthropic’s

The New Stack (Paul Sawers, 2026-03-06) and Simon Willison (2026-03-07) both note the same contrast:

- Anthropic published numeric gates.
- OpenAI did not.
- OpenAI’s language is more open-ended, which does **not** mean the bar is lower. It means reviewers have discretion and capacity can dominate.

That discretion is why high-metric projects report silence and why a smaller, well-known CLI can still be accepted.

---

## 3. What accepted applications look like in public

OpenAI does not publish acceptances. The table below is **self-reported**. Treat each row as an anecdote, not a template that guarantees selection.

### 3.1 Self-reported acceptances

| Reporter | Project (self-identified) | Public GitHub snapshot on 2026-08-22 | What they said | Source |
| --- | --- | --- | --- | --- |
| Sam Saffron and “a few of us at Discourse” | Discourse | `discourse/discourse`: **47,700** stars, **8,997** forks | Accepted overnight after launch | [OpenAI forum, 2026-03-11](https://community.openai.com/t/codex-for-open-source-2026/1376418) |
| `m13t_dev` / MyPrototypeWhat | Cherry Studio | `CherryHQ/cherry-studio`: **50,902** stars, **4,842** forks, 8,540 commits | Accepted; later account deactivation dispute | Same forum thread, 2026-07-30 |
| `drw` on HN | mycli | `dbcli/mycli`: **11,966** stars, **697** forks, BSD-3-Clause, long release history, distro packages | “happy recipient”; OpenAI “asked for nothing in return; not even a link” | [HN 48497195](https://news.ycombinator.com/item?id=48497195) |
| `idank` on HN | explainshell | `idank/explainshell`: **14,199** stars, **847** forks | Default grant is the subscription; credits if the use case is “interesting enough”; guessed “a few hundred dollars a month,” **not** an official cap | Same HN thread |
| `mkagenius` on HN | coderunner | `instavm/coderunner`: **890** stars, **41** forks, Apache-2.0, created 2025-06, still pushed 2026-08 | “we got it yesterday” for Apple-sandbox coderunner | Same HN thread |
| Reddit r/codex `1udnd8s` | sqlit (self-described) | Likely `Maxteabag/sqlit` at **4,701** stars (not confirmed as the same applicant) | Applicant wrote that the project had 4k+ stars and thought “the size of the user base” got them in | Reddit, crawled 2026-08-17 |
| `mkurz` on HN | unnamed ~13k-star project | Not independently identified | OpenAI Codex OSS confirmation “within 2 days”; Anthropic never replied | HN 48497195 |
| `faysou` on Reddit | unnamed | Unknown | Accepted in March for 6 months | Reddit thread comments |

Observed cluster among *confirmed-enough* cases:

- The applicant is a **named maintainer of a project people already know**, not a user or fan.
- Usage is visible in two minutes: stars in the thousands, package/distro installs, or a household-name product (Discourse, Cherry Studio).
- Maintenance is visible: releases, issues, commits, license, README.
- The one lower-star self-report is coderunner at **890** stars, with a sharp niche (Apple container sandbox for coding agents) and recent activity. That is the strongest public counterexample to a 1,000-star *hard* cutoff. It is still not a zero-usage project.

### 3.2 Self-reported non-responses (not official rejections)

Silence is the common outcome. Terms give OpenAI no duty to send a refusal. Do not treat silence as a scored “no,” but do treat it as evidence that capacity and discretion dominate.

Examples from the June 2026 HN thread and related posts:

| Applicant claim | Outcome they reported | Caution |
| --- | --- | --- |
| EasyInvoicePDF, 900+ stars, ~2k monthly users | No reply after two applications | Small product, not infrastructure |
| PHP (as “the PHP project”) | No reply | Role/org verification may be the blocker, not importance |
| robotgo / gse, claimed 20k+ stars | No reply from OpenAI; Claude was “very fast” | High stars, still silent |
| VT Code, applied March | No reply | Bar “seems high” |
| Projects with “2k stars and 5M monthly downloads” plus another with “2M monthly downloads” | Heard from neither OpenAI nor Anthropic | Downloads without a marquee name still lose to capacity |
| Fork of an archived repo, second attempt | Applying, not accepted at time of post | Forks of dead projects are a weak 2-minute signal |

Several of the loudest “15k stars / 150M downloads / never heard back” comments in that HN thread sit under a mixed Anthropic-and-OpenAI parent. Where the commenter did not name which form, this report does not assign the miss to OpenAI.

### 3.3 What accepted *answers* appear to emphasize

No accepted form text was published in full. Reconstructing from official prompts plus accepted-project shape:

**Qualification (500 chars)** in successful cases likely looks like:

- first-person maintainer role (“I am a core maintainer / I review PRs, triage issues, cut releases”)
- one or two *checkable* usage numbers (stars, downloads, distro packages, production users)
- a specific ecosystem slot (MySQL CLI used via pip/brew/apt; Discourse as forum software; Cherry Studio as a multi-provider desktop client)
- a maintenance-load sentence, not “I want free Pro”

**API-credit use (500 chars)** in official-aligned advice:

- PR review, issue triage, release notes, test suggestions, maintainer automation
- human review remains authoritative
- credits used only on authorized repositories
- not personal experiments, not commercial side projects, not team-wide sharing (benefits are non-transferable)

**Anything else:** extra checkable facts (distro packaging, downstream dependents, CVE/security load, volume of unsolicited PRs). Not a second sales pitch.

OpenAI-adjacent public advice that matches official language, but is still unofficial:

- Jason Liu / `@jxnlco` (2026-03-06 program announcement recap): maintainers “carrying more of the load as software development changes”; Codex trusted to *review* code, not only write it.
- AIHighlight thread (2026-06-27): “Do not apply as a fan or a user… spell out exactly what you keep running and how Codex would cut that workload.” Useful framing; not a published rubric.

---

## 4. What a reviewer can verify on GitHub in two minutes

Assume a human or script opens the submitted repo URL, the applicant’s GitHub profile, and maybe npm/PyPI. They will not read the constitution, threat model, or 500-line README.

### 4.1 Two-minute checklist

| Check | Where | What “good” looks like | What “thin” looks like |
| --- | --- | --- | --- |
| Public repo exists and matches the form URL | Repo header | Public, correct owner | Private, renamed, or applicant is not on the repo |
| Applicant is owner, org member, or has write/admin | Profile + repo | Owner or listed maintainer | Random contributor, mirror, or “I use this project” |
| License | Community profile / LICENSE | SPDX license GitHub recognizes | Missing license (public ≠ open source) |
| One-line description + topics | About sidebar | Problem stated in one sentence; relevant topics | Empty About; topic stuffing |
| Stars / forks / watchers | Sidebar | Independent interest | 0/0/0, or stars with 0 forks and 0 issues |
| Age and last push | Insights / commits | Months of history, recent default-branch activity | Created this week; or last push months ago |
| Releases / tags | Releases | Versioned release, changelog, installable artifact | No tags, or tags with no assets |
| Issues | Issues tab | External people filing bugs; maintainer replies | Zero issues, or only self-authored “good first issue” placeholders |
| Pull requests | PRs | Merged history; more than one author if claiming community | Only maintainer self-merges |
| Contributors | Insights/contributors | More than one human | Single author, or bot-only |
| CI | Actions + README badge | Green required checks on `main` | Missing, failing, or badge-only |
| Community health | Insights → Community | README, license, SECURITY, CONTRIBUTING, CoC, templates | README + license only |
| Discussions | Discussions | External threads | Maintainer talking to themselves |
| Package / Action install | npm, PyPI, GH Marketplace, brew | Real download/install counts | Unpublished, `private: true`, or placeholder name |
| Dependents / Used by | Insights | Other repos depend on it | None |
| Security | SECURITY.md, advisory policy | How to report a vuln | None, on a security-themed tool |
| Honesty vs README claims | README vs sidebar | Claims match stars/releases/pilots | “Widely used” at 0 stars |

GitHub’s community-health files are especially cheap to inspect. On 2026-08-22:

- `daichunghy/patchgate` community health **100%** (README, Apache-2.0, CoC, CONTRIBUTING, PR template; GitHub still reported `issue_template: null` even with files under `.github/ISSUE_TEMPLATE/`).
- `daichunghy/agentsmd` community health **42%** (README + MIT only). Created **2026-08-22**.

### 4.2 What two minutes cannot verify

- Whether the code is good.
- Whether pilots exist if they are only in private docs.
- Whether Discussions were self-scheduled.
- Whether stars were organic.
- Whether the applicant actually does the claimed maintainer work (beyond being owner).

OpenAI’s terms allow extra verification. If the 2-minute view is empty, there is little reason to spend a 20-minute review.

---

## 5. Concrete improvements that change those 2-minute signals, without fraud

Do **not** buy stars, create sockpuppet accounts, fake contributors, fabricate download counts, star-bomb from alt accounts, or write self-replies that pretend to be users. Terms treat false or misleading information as revocation grounds.

Improvements that a reviewer can actually see:

1. **Keep the repository public, licensed, and described.** SPDX license, accurate About text, honest README that does not claim users you do not have.
2. **Ship a real release.** A tagged pre-release with install instructions, checksums or `npm pack`/`action.yml` pinning, and a changelog. Empty tags do not help.
3. **Make default-branch CI visible and green.** Badge pointing at `main`, not only PR heads. CodeQL or equivalent if the product is security-adjacent.
4. **Fill community files GitHub’s meter reads:** README, LICENSE, SECURITY.md, CONTRIBUTING.md, CoC, issue forms, PR template. This is legitimacy, not popularity.
5. **Publish the installable surface.** npm/PyPI with a public package (not `"private": true`), or GitHub Marketplace Action once the product is actually installable. Downloads then become a usage signal.
6. **Get independent humans into the GitHub objects.** One external issue, one external PR, one non-author star, one “Used by” repo, one distro/package consumer. These are the first *usage* pixels.
7. **Releases and rollback docs that match the product.** For a GitHub Action, a pin-to-SHA install snippet that works on a fresh runner.
8. **Topics that are true and few.** `github-actions`, `code-review`, `typescript` help discovery. Twenty overlapping AI topics look like stuffing (agentsmd currently has a long topic list on day one).
9. **Profile hygiene.** Public GitHub profile, same identity as the form, pinned repo matching the application URL, no mismatch with the ChatGPT email / Org ID story.
10. **Stop self-authored theater.** Scheduled Discussions, placeholder contribution issues, and maintainer-only Projects are fine as *maintenance* evidence. They are not community evidence. A reviewer who opens Discussions and sees only the owner will discount them.

None of these create “ecosystem importance.” They only make a true story checkable.

---

## 6. Can PatchGate and agentsmd qualify on ecosystem importance at near-zero usage?

**Short answer:** Official text *allows* an ecosystem-importance case when usage is thin. Public outcomes do **not** show that near-zero-usage, days-old tools get ChatGPT Pro. Applying is allowed. Expecting acceptance is not justified.

### 6.1 Live local metrics, 2026-08-22

Fetched via GitHub API:

| Repo | Created | Stars | Forks | License | Releases | Community health | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `daichunghy/patchgate` | 2026-08-20 | **0** | **0** | Apache-2.0 | `v0.1.0-beta.1`, `v0.1.0-beta.2` | 100% | Topics set; 5 open issues; Discussions enabled; still no independent users |
| `daichunghy/agentsmd` | **2026-08-22** | **0** | **0** | MIT | none | 42% | Created the day of this research; 0 issues; topic-heavy |
| `daichunghy/patchgate-beta-smoke` | — | 0 | 0 | — | — | — | Self-test repo; must not be described as an external pilot |

Compare with self-reported acceptances: Discourse 47k, Cherry Studio 50k, mycli 12k, explainshell 14k, sqlit ~4.7k, coderunner 890. The gap is not subtle.

### 6.2 What “ecosystem importance” can honestly mean here

Official hook: “If a project does not neatly fit the criteria but plays an important role in the ecosystem, applicants should still apply and explain why.”

A *true* ecosystem-importance sentence names a problem other maintainers already have, and a role the repo could play if adopted. It does not treat the problem as proof of adoption.

**PatchGate — honest case (not a prediction of success):**

- Problem: unsolicited and agent-generated PRs now cost more to *triage* than to write. OpenAI’s own Codex repo moved to invitation-only contributions for this reason ([openai/codex discussion #9956](https://github.com/openai/codex/discussions/9956)).
- Product: a deterministic review-readiness gate (policy, commit-bound checks, ownership, human boundary) — not an authorship detector and not a merge oracle.
- Fit to program language: PR review load, maintainer automation, security-adjacent GitHub Action, write-access maintainer.
- Current evidence: public pre-release, license, CI, threat model, tagged betas. **No usage.**
- Required honesty: “pre-release, no verified downloads, no external pilots.” The existing form draft already says this.

**agentsmd — honest case is weaker:**

- The *format* AGENTS.md is ecosystem-important (OpenAI Codex reads it; agents.md claims 60k+ repos; Linux Foundation / AAIF involvement).
- That importance belongs to the **format and the official `agentsmd/agents.md` org** (~23.8k stars), not to a same-day linter/sync/score CLI with 0 stars.
- The tooling niche is already occupied (`agents-md-lint` on npm, Taiizor cookbook Action, coverage scanners). A 2-minute reviewer who searches “AGENTS.md linter” will not land on a 0-star repo created today.
- Claiming “one source of truth for AI agent instructions” overstates uniqueness.

### 6.3 How to write that case honestly (if applying)

Stay inside 500 characters. Do not inflate.

Pattern that matches official “or why it is important” language:

> I am the primary maintainer of [repo], responsible for [review / triage / releases / security]. Usage is not broad yet (0 GitHub stars, no package downloads, no external pilots as of YYYY-MM-DD). The project exists to [one-sentence problem that other public OSS already has]. I am applying on ecosystem-importance, not adoption.

API-credit field: name bounded maintainer tasks (issue triage, fixture drafting, PR-readiness summaries, release checklists) and state that the human remains the approver. Do not describe scanning other people’s repos (Codex Security terms forbid that).

Anything-else field: one or two checkable URLs (release tag, CI run, SECURITY.md). Explicitly state what is *not* true yet.

Do **not**:

- cite self-authored Discussions as community
- cite `patchgate-beta-smoke` as a pilot
- imply npm/Action usage before publish
- imply that AGENTS.md’s 60k-repo footprint is *this* CLI’s footprint
- apply from a second identity if the first application is pending (terms: multiple identities to obtain more than one benefit)

### 6.4 Conservative probability language

There is no public example of a 0-star, <1-week-old repository being accepted. Official text still invites the explanation. The evidence-based stance:

- Applying with an honest ecosystem-importance statement is **compliant**.
- Treating that invitation as “new tools in a hot category get Pro” is **not supported**.
- The program’s own examples and acceptances cluster on **already-used** software.
- Capacity is an official factor. Near-zero-usage applications are the easiest to skip.

---

## 7. Two repos vs the stronger one

**Pick the stronger repository. Do not submit two parallel applications for two new 0-star tools.**

Reasons grounded in official form/terms, not in marketing:

1. **The form takes one repository URL.** Qualification is “why does *this* repository qualify?” A second repo belongs in “anything else,” if at all, as context — not as a second bid.
2. **Benefits are personal and one-per-identity.** Terms forbid using multiple identities or accounts to obtain more than one benefit. Two forms from one person for two newborn repos can look like capacity gaming even if technically one identity.
3. **Two thin signals do not add.** A reviewer who opens PatchGate (0 stars, 2 days old, real CI/releases) then agentsmd (0 stars, created today, 42% community health) will not average them into “ecosystem importance.” They will see one maintainer with two applications and no users.
4. **PatchGate is the stronger 2-minute object today.** Apache-2.0, 100% community health, CI/CodeQL badges, two beta tags, CODEOWNERS/SECURITY/CONTRIBUTING, a precise problem statement adjacent to Codex’s own PR-load problem. agentsmd is a same-day README in a crowded AGENTS.md tooling market.
5. **If agentsmd later grows real usage** (npm downloads, Action installs, independent issues), it can be a later application. Rolling review does not require applying on day one.

Mentioning the sibling tool in “anything else” is reasonable if the sentence is factual and short (“I also maintain a separate AGENTS.md linter at URL; this application is only for PatchGate”). Do not present them as a combined “suite” with implied users.

---

## 8. Bottom line

| Question | Conservative answer |
| --- | --- |
| Is there an official star cutoff? | **No.** OpenAI lists usage, ecosystem importance, active maintenance, role, and capacity. |
| Is “1,000 stars” real? | **Unofficial rumor**, copied across secondary sites. Anthropic’s 5k/1M bar is a different program. |
| What do accepted maintainers look like in public? | Named maintainers of already-used projects (Discourse, Cherry Studio, mycli, explainshell; possibly coderunner at ~890 stars). Overnight for marquee projects; days for some others; silence for many high-star projects too. |
| What does a reviewer check in two minutes? | Public repo, license, role, stars/forks, releases, CI, issues/PRs from other humans, packages/dependents, community files, honesty of README. |
| Can two new 0-star tools win on ecosystem importance? | Official text allows the argument. Public outcomes do not support expecting a grant. Write it honestly or wait for one checkable usage pixel. |
| Two applications or one repo? | **One repo: PatchGate**, if applying at all. Do not multiply thin cases. |

The program is real. Selection is discretionary, capacity-limited, and not a form-completion prize. The only application that is both compliant and rational at current metrics is an honest pre-release / ecosystem-importance statement on the stronger public repository, with no inflated numbers.

---

## 9. Sources

### Official

- <https://openai.com/form/codex-for-oss/>
- <https://developers.openai.com/community/codex-for-oss>
- <https://learn.chatgpt.com/docs/codex-for-oss-terms>
- <https://developers.openai.com/codex/codex-for-oss-terms>
- [@OpenAIDevs launch, 2026-03-06](https://x.com/OpenAIDevs/status/2029998202934677938)
- Older fund form (API credits up to $25,000): <https://openai.com/form/codex-open-source-fund/>

### Reporting that quotes or closely tracks official text

- [Simon Willison, 2026-03-07](https://simonwillison.net/2026/Mar/7/codex-for-open-source/)
- [The New Stack, Paul Sawers, 2026-03-06](https://thenewstack.io/openai-anthropic-open-source/)
- [THE DECODER, 2026-03-07](https://the-decoder.com/openai-offers-open-source-maintainers-six-months-of-free-chatgpt-pro-and-codex-access/)
- [silenceper form walkthrough, 2026-05-07](https://silenceper.com/en/article/2026-05-07-free-chatgpt-pro-codex-for-oss/)
- [HelloCraftAI, 2026-06-14 / updated 2026-07-05](https://hellocraftai.com/blog/codex-for-open-source-oss-maintainer-support-application-checklist-2026/) (Japanese; conservative on unpublished scoring)

### Anecdotes (not official)

- [OpenAI developer forum: Discourse acceptance; Cherry Studio grant + ban dispute](https://community.openai.com/t/codex-for-open-source-2026/1376418)
- [HN item 48497195, June 2026](https://news.ycombinator.com/item?id=48497195) (mycli, explainshell, coderunner acceptances; many non-responses)
- Reddit r/codex `1udnd8s` (sqlit 4k+ stars self-report)
- Jason Liu program recap: <https://x.com/jxnlco/article/2029999382763057603>

### Use with caution (contains unofficial numeric gates or overclaim)

- MLQ / Gnoppix “1,000 stars” (not on OpenAI pages)
- Apidog “OSI license / non-commercial / governance” as if they were published gates
- openai-hub.com broadening eligibility to translators
- AIHighlight “~1,000 stars rough guide”

### Local GitHub snapshots used in sections 6–7

- `gh api repos/daichunghy/patchgate` and `/community/profile` on 2026-08-22
- `gh api repos/daichunghy/agentsmd` and `/community/profile` on 2026-08-22
- Comparison snapshots: `discourse/discourse`, `CherryHQ/cherry-studio`, `dbcli/mycli`, `idank/explainshell`, `instavm/coderunner`
