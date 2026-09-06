# Shadow pilot intake

This is the path from “I might try PatchGate” to one safe, useful observation.
Opening the issue form does not enroll a repository and does not count as a
pilot. A pilot exists only after the repository owner gives explicit consent
and the agreed observation is run.

## Start with the smallest question

The first observation should answer one question such as:

- Does a stale or foreign check become visible before a maintainer opens a deep
  review?
- Does the summary make a missing owner or human gate easier to act on?
- Does the result reduce triage work, or does it add another noisy check?

Use the [Shadow pilot interest form](https://github.com/daichunghy/patchgate/issues/new?template=pilot-interest.yml)
with the public repository URL, workflow shape and a proposed scope. Do not
paste tokens, private data or a complete pull-request body.

## What happens next

| Step | Owner | Output |
| --- | --- | --- |
| 1. Intake | Repository owner | Public repository shape and one review-readiness question |
| 2. Scope check | PatchGate maintainer | Confirmed scope, release reference and known unsupported cases |
| 3. Consent | Both maintainers | Explicit agreement on the repository, window and evidence that may be recorded |
| 4. Setup | Repository owner | Full-SHA Action reference, `fail-on: never`, least-privilege permissions and no privileged PR checkout |
| 5. Observation | Both maintainers | Statuses, unknown causes, timing and the first confusing result |
| 6. Decision | Repository owner | Keep, change or remove the shadow check |
| 7. Record | PatchGate maintainer | Redacted result with consent state; public summary only after separate approval |

## Current beta boundary

The current public Action is `v0.1.0-beta.5` and should be pinned by the
immutable release commit shown on the [release page](https://github.com/daichunghy/patchgate/releases/tag/v0.1.0-beta.5).
The first run uses `fail-on: never`; it is not production enforcement. The npm
package is unpublished, and no external repository usage is currently claimed.

The privileged metadata lane reads trusted base policy and GitHub metadata. It
must not check out, install, build, test or execute pull-request code. A
repository that needs contributor-code execution must keep that work in an
unprivileged, read-only workflow.

## What makes a result useful

Please record the first result in plain language:

```text
Repository shape:
Observation scope:
Time to first result:
Result that helped:
Result that confused us:
Unknown or false-block cause:
Decision: keep / change / remove
Consent to retain a redacted record: yes / no
Consent to publish a summary: yes / no / ask later
```

“It ran” is setup evidence. “It changed which pull request we reviewed first”
is usefulness evidence. Neither should be presented as broad adoption without
the corresponding public or consented record.
