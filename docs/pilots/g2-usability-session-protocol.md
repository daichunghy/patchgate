# G2 preflight usability session protocol

**Status:** protocol prepared; no participant or pilot evidence is claimed  
**Scope:** PG-211, UR-001, UR-002, UR-003, UR-004, UR-101, UR-102, UR-103, UR-105, UR-106

## Purpose

Measure whether a maintainer or automated tool can reach a useful, correctly
interpreted local preflight without needing raw JSON or privileged credentials.
The session tests the interface and documentation, not repository quality and
not the participant.

## Safety and consent

- Use a disposable local repository or a repository the participant explicitly
  authorizes for the session.
- Do not request GitHub tokens, secrets, private pull-request bodies, comments,
  or personal data that is not needed for the task.
- Record a participant code, not a name, unless the participant separately
  consents to attribution.
- The facilitator may observe and timestamp actions but must not alter the
  repository or claim that a session is a pilot, install, or enforcement test.
- Stop immediately if the participant is asked to enable a required check,
  publish a remote, or execute pull-request code.

## Tasks

Each participant attempts the tasks in order with the same clean-room fixture
set. The facilitator gives only the task statement; rescue help is recorded.

| ID | Task statement | Success condition |
| --- | --- | --- |
| T1 | Create a safe PatchGate draft in the supplied repository. | Participant finds `init`, creates the file, and understands enforcement is not enabled. |
| T2 | Validate the draft and run local preflight. | Participant obtains a human-readable valid result without opening raw JSON. |
| T3 | Inspect a Git-ref preflight where the working tree policy differs from `HEAD`. | Participant identifies the base revision as authoritative and does not trust the working-tree change. |
| T4 | Review a prose conflict and an unsupported guidance finding. | Participant distinguishes `needs_confirmation`/`unsupported` from enforcement and names the remediation owner. |
| T5 | Diagnose a repository with no policy using `doctor`. | Participant understands the missing-policy diagnostic and the next safe action. |

## Measures

Record one row per task:

| Field | Definition |
| --- | --- |
| `participantCode` | Consent-safe pseudonymous code |
| `taskId` | `T1`–`T5` |
| `startedAt` / `completedAt` | Local timestamps; used for duration only |
| `completed` | Whether the success condition was met without facilitator rescue |
| `assistanceLevel` | `none`, `hint`, or `rescue` |
| `interpretation` | Participant's one-sentence explanation of authority/status |
| `remediation` | Participant's named next action and evidence supplier |
| `confusion` | Free-text observation, avoiding unnecessary personal data |
| `mappedIssue` | Existing issue, documentation change, product decision, or `none` |

Summarize raw counts and ranges only. Do not calculate universal success rates
from three sessions and do not call a task successful when the facilitator had
to explain the authority model.

## Exit criteria and follow-up

PG-211 needs at least three consent-safe sessions with raw task timing,
comprehension and assistance recorded. Each finding must map to a code fix,
documentation change, explicit non-goal, or a new backlog package. PG-212 may
close only after the mapped P0/P1 onboarding findings are resolved and the
corresponding verification command or artifact is linked.
