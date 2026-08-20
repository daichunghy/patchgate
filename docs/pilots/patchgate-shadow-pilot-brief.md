# PatchGate non-blocking shadow pilot brief

**Status:** recruitment brief; no pilot is claimed until a repository maintainer
explicitly consents.

## What the pilot tests

The pilot asks whether PatchGate helps a maintainer decide what is ready for
review and what needs evidence first. It does not test code correctness, AI
authorship or merge automation.

## Suitable repository

A public repository with GitHub Actions, protected branches, CODEOWNERS or
sensitive paths, and a maintainer willing to review non-blocking results. A
monorepo or generated-file boundary is useful but not required.

## What participation involves

1. A short setup review of the workflow and permissions.
2. Non-blocking observation for one or two weeks, or a small agreed PR sample.
3. A feedback session using the [feedback template](patchgate-shadow-feedback-template.md).

The pilot does not enable a required check, request repository secrets or
execute contributor-controlled code in the privileged metadata lane. The
maintainer can stop the pilot at any time.

## What is recorded

- PatchGate status distribution and unknown causes.
- False blocks or confusing remediation.
- Delivery noise, duplicate checks and timing.
- A maintainer decision: continue, change scope or stop.

Only public repository metadata and consented observations should be shared.
Private PR content, tokens and security-sensitive details must stay out of the
public issue or report.
