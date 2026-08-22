# Independent review and pilot outreach

**Status:** copy-ready outreach drafts; no external response or pilot is
claimed.

This guide is for one-to-one, context-specific contact with a maintainer or
technical contributor. It is not a mailing list, bulk-comment or engagement
scheme. Send a message only when the recipient's repository or work is clearly
related to PatchGate's review-readiness boundary.

## What to ask for first

Ask for a small independent review before asking for a pilot. A reviewer can
challenge the product boundary without installing anything or sharing private
repository data.

### Short public review request

```text
Hi [name/team] — I am maintaining PatchGate, a small Apache-2.0 project that
checks whether a PR has trusted policy, commit-bound evidence, ownership and a
qualified human gate before it is represented as ready for review.

I am looking for one technically informed critique of the public PR and its
trust-boundary claims, not an endorsement. The review questions are:

1. Is the base-revision/evidence model understandable?
2. Which result would you distrust first in your workflow?
3. Is the documented unsupported behavior safer than guessing?

A short reply on the public issue is enough. No installation, private data or
commitment is required.
```

### Consent-first shadow-pilot request

```text
Hi [maintainer] — would you be open to a small, non-blocking PatchGate shadow
observation on [repository] for [window/sample]?

It uses a full-SHA Action reference, contents/pull-request/actions read and
checks write only. It does not enable a required check, request repository
secrets, checkout PR code in the privileged lane or change rulesets. You can
stop it at any time. We would record only the status distribution, unknown
causes, noise and your decision about usefulness; publication of any summary
would require your explicit consent.

The setup and rollback steps are here: [shadow runbook URL]. Would this scope
fit a real review-readiness problem in your repository? A “no” is completely
fine.
```

## Target selection

Use one target at a time and explain the connection in the first sentence.

| Target type | Legitimate reason to contact | Evidence to seek |
| --- | --- | --- |
| Policy/governance bot maintainer | Compare explicit policy discovery and authority boundaries | Technical critique, not endorsement |
| Danger-style review automation maintainer | Compare review preparation and human handoff boundaries | Edge case or integration feedback |
| Reviewdog-style maintainer | Compare check delivery, source identity and noise control | Delivery/UX critique |
| Zizmor/security workflow maintainer | Review `pull_request_target`, permissions and untrusted-code boundaries | Security critique or no-go finding |

Do not infer a target's interest from a name alone. Confirm the exact public
profile/repository and use the repository's stated contribution channel.

## Contact limits

- one relevant initial message per target;
- at most one polite follow-up after 5–7 days;
- no cross-posting the same copy into unrelated issues or Discussions;
- stop after a clear no, no response, or an opt-out;
- never ask for stars, forks, positive wording or ChatGPT Pro support;
- never describe an unanswered message as community participation.

## Evidence record

Keep this record privately until a participant approves a public summary.

| Field | Value |
| --- | --- |
| Exact public profile/repository | |
| Why this target is relevant | |
| Contact channel and URL | |
| Date of initial message | |
| Follow-up date, if any | |
| Response or no-response state | |
| Pilot consent: yes / no / not asked | |
| Public-summary permission | |
| Linked issue/PR or redacted note | |

An independent response, contribution or consented pilot may be added to the
evidence dossier only with its provenance and consent state. A self-authored
issue, scheduled Discussion or unanswered outreach attempt remains maintenance
context, not adoption evidence.
