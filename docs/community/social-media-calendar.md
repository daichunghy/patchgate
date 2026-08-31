# PatchGate social media calendar

**Status:** draft calendar for review

**Copy snapshot:** 2026-08-31

This calendar turns the message kit into a small sequence of channel-specific
posts. It is designed to create useful technical conversations, not a burst of
self-promotion. Every post stays draft-only until a person with an authorized
account or posting session publishes it.

## Publishing rules

- Publish one idea at a time and leave space for replies.
- Lead with a concrete review-readiness observation: a SHA, an owner, a
  fixture, a command or a remediation sentence.
- Use the narrowest link: a Discussion for a question, the first-use guide for
  setup, or the evidence packet for a local run.
- Do not ask for stars, forks, endorsements or positive wording.
- Record `draft`, `published`, `reply`, `consent`, `decline` or `no response`.
- A post, impression, star or self-authored Discussion is maintenance context,
  not evidence of adoption.

## Two-week sequence

| Date | Channel | Job | Asset | Status |
| --- | --- | --- | --- | --- |
| 2026-09-05 | GitHub Discussion | Ask about wrong-commit evidence | [Discussion hub](https://github.com/daichunghy/patchgate/discussions) | draft |
| 2026-09-07 | X | Make the SHA problem memorable | Draft 1 below | draft |
| 2026-09-09 | LinkedIn | Explain the maintainer job | Draft 2 below | draft |
| 2026-09-11 | Facebook/Zalo | Offer a consent-first observation | Draft 3 below | draft |
| 2026-09-13 | Technical forum | Invite a technical critique | Draft 4 below | draft |
| 2026-09-15 | GitHub Discussion | Ask where CODEOWNERS becomes ambiguous | Draft 5 below | draft |
| 2026-09-17 | X | Show the local ready case | Draft 6 below | draft |
| 2026-09-19 | LinkedIn | Explain what the beta does not claim | Draft 7 below | draft |

The sequence intentionally alternates observation, explanation, invitation and
boundary. Do not publish the next item merely because its date has arrived if a
previous post has an unanswered question worth resolving first.

## Draft 1 — X

> A green check from the wrong commit is still wrong evidence. PatchGate keeps
> `baseSha`, `headSha` and `testedSha` separate, then shows what a maintainer
> can verify before a deep review. The beta is shadow-only.

Link: <https://github.com/daichunghy/patchgate/discussions>

Body length: 205 characters; the full raw URL keeps this draft under 280
characters.

## Draft 2 — LinkedIn

> Maintainers often open a pull request before they know whether the basic
> review signals are present. The issue may be missing, a green check may belong
> to an older commit, or the required owner may not have approved.
>
> PatchGate moves those deterministic questions into a preflight and a
> machine-readable receipt. The public `v0.1.0-beta.5` Action is shadow-only,
> the npm package is unpublished, and no external adoption is claimed.

Link: <https://github.com/daichunghy/patchgate>

## Draft 3 — Facebook or Zalo

> Mình đang tìm một repo public có một câu hỏi rất cụ thể về review PR: kết quả
> kiểm tra có giúp maintainer biết nên nhìn PR nào trước không, hay chỉ thêm
> một check gây nhiễu?
>
> PatchGate beta.5 hiện chỉ chạy shadow, dùng full SHA, không thay đổi điều
> kiện merge và không checkout code của PR trong privileged metadata lane. Nếu
> có thử, mình chỉ ghi nhận kết quả đã được đồng ý và không cần dữ liệu riêng tư.

Link: <https://github.com/daichunghy/patchgate/issues/4>

## Draft 4 — Technical forum

> PatchGate is a small Apache-2.0 project for review-readiness checks on GitHub
> pull requests. It evaluates issue linkage, commit-bound check evidence,
> CODEOWNERS and configured human approval, then reports an actionable receipt.
>
> The public beta is shadow-only. I am looking for a technical critique of the
> authority model or the unsupported cases before asking anyone to install it.
> The local evidence packet is enough to start; no repository token or private
> pull-request data is required.

Link: <https://github.com/daichunghy/patchgate/blob/main/docs/community/evidence-review-packet.md>

## Draft 5 — GitHub Discussion

**Title:** Where does CODEOWNERS stop being enough for your review workflow?

> CODEOWNERS gives a repository a useful ownership boundary, but it does not
> answer every review question. Generated files, overlapping patterns,
> unsupported syntax and missing permissions can change what an approval means.
>
> PatchGate documents a bounded subset instead of guessing about every
> CODEOWNERS behavior. What edge case has caused the most confusion in your
> repository? A small fixture or a link to the relevant GitHub behavior is more
> useful than a general opinion.

## Draft 6 — X

> Run the ready fixture, inspect the receipt, then compare it with a stale-check
> case. See which evidence changed the result. No GitHub token is needed. The
> beta is shadow-only.

Link: <https://github.com/daichunghy/patchgate/blob/main/docs/community/evidence-review-packet.md>

Body length: 176 characters; the full raw URL keeps this draft under 280
characters.

## Draft 7 — LinkedIn

> PatchGate is not a code-correctness oracle, an AI-authorship detector or a
> compliance certificate. It checks a narrower question: has the pull request
> supplied the policy, evidence, ownership and human gate that this repository
> expects before a maintainer spends review time?
>
> That narrower boundary is also the current limitation. The public beta is
> shadow-only, the npm package is unpublished, and external repository usage is
> still unverified.

Link: <https://github.com/daichunghy/patchgate/blob/main/docs/PROJECT_CONSTITUTION.md>

## Reply handling

| Reply | Response | Record as |
| --- | --- | --- |
| “Can I try it?” | Point to the first-use guide and ask only for public workflow shape. | interest |
| “Is it production-ready?” | Say no: beta, shadow-only, unpublished npm package. | question |
| “I can run a shadow observation.” | Confirm scope, full-SHA reference, no secrets, no privileged PR checkout and consent state. | consent |
| “Not relevant.” | Thank them once and stop. | decline |
| No reply | Do not follow up publicly or describe it as engagement. | no response |

## Publication record

When a draft is actually published, copy one row into the activity record with
the exact URL and state. Do not backfill reach or adoption numbers from memory.

| Date | Channel | Draft ID | URL | Response state | Consent/public-summary state |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

The best outcome from this calendar is a reproducible first-use report or a
specific technical objection. A larger audience without either is only a
larger number.
