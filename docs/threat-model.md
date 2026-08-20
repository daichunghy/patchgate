# PatchGate architecture threat model

**Scope:** the GitHub adapter, local/shadow Action candidate, untrusted
verification workflow, pure evaluator, receipt, and status-check publication
path.
**Current implementation state:** the deterministic evaluator, local/mock
adapter, Action runner, bundle verification and shadow workflow exist locally.
Authorized live smoke, public release, external shadow installations and
enforcement remain unproven.

## Assets

- integrity of the merge-blocking PatchGate result;
- trusted base policy and its digest;
- commit identity for policy, PR head, test merge, and merge group;
- qualified human approval state;
- check/workflow source identity and run metadata;
- receipt integrity, schema version, and remediation details;
- GitHub tokens, App credentials, secrets, and runner compute;
- contributor privacy and repository metadata.

## Trust boundaries

1. Contributor-controlled PR branch → GitHub event/API metadata.
2. Contributor-controlled code → untrusted verification runner.
3. Untrusted verification result/artifact → trusted decision adapter.
4. GitHub API response → normalized evaluator input.
5. Evaluator result → merge-blocking GitHub check or derived comment.
6. Base-revision policy → current PR head, where the head must not redefine the
   rules used to evaluate itself.

## Attacker capabilities

An attacker may open a fork PR, edit PR title/body/labels, change files and
workflow scripts in the fork, push new commits after a review or test starts,
submit stale or misleading artifacts, and attempt to exploit permissive GitHub
workflow expressions. A repository collaborator with write access may have
additional ability to create statuses or edit comments.

The model does not assume that an attacker can break GitHub’s authenticated API,
forge a Git SHA, compromise a protected GitHub App, or become a qualified
reviewer without the repository’s own access-control failure.

## Prioritized abuse paths

| Priority | Abuse path | Impact | Required mitigation |
| --- | --- | --- | --- |
| High | PR changes `patchgate.yml` to relax its own rule | Policy-integrity bypass | Fetch policy from base SHA; record digest; evaluate policy changes under the old policy |
| High | `pull_request_target` checks out or executes fork code | Token/secret theft or repository write | Metadata-only trusted lane; no checkout/install/build/test in privileged job |
| High | Same-name check or status from an unexpected source is accepted | False green merge gate | Match expected App/workflow source; document Action-only ceiling; use GitHub expected-source setting where available |
| High | Old approval/check is reused after a new push | Unreviewed code represented as reviewed | Compare evidence to `testedSha`; consume active review state; honor stale-review/native rules |
| Medium | Untrusted artifact is treated as authoritative | Forged test or provenance evidence | Bind artifact to run, producer, target SHA, digest, and verification policy; treat attestations as one evidence source |
| Medium | PR text is interpolated into shell or query | Command injection or evaluator confusion | Treat text as data; parameterize API calls; never interpolate into shell; escape derived UI |
| Medium | Receipt schema/version is downgraded or replayed | Obsolete or misleading decision | Version schema; include input/policy/evidence digests; reject unsupported versions |
| Medium | CODEOWNERS/team identity is guessed from usernames | False human gate satisfaction | Normalize qualification through authenticated GitHub permissions/team data |
| Low | Huge/generated/boundary-heavy PR floods review or runner resources | Availability and review fatigue | Advisory-first budgets, bounded input sizes, pagination and explicit resource limits |

## Existing controls versus open controls

### Existing in this repository

- Constitution explicitly separates trusted policy from discovery prose.
- Constitution defines the base-policy rule and three workflow lanes.
- The local evaluator compares evidence with an explicit tested revision and
  emits distinct ambiguity/evidence/human-gate statuses.
- Prompt 2 adds per-group observation completeness, permission, source/revision
  and normalized-digest checks; incomplete collections cannot be hidden by a
  successful item.
- Prompt 2 binds a normalized policy contract digest to the raw policy source
  record and rejects policy-source conflicts, stale targets, duplicate check
  identities, and missing immutable reviewer/check identities.
- Receipts carry the minimum normalized review, issue, ownership, check and
  observation evidence needed for local replay, and validate evidence
  references and human-gate consistency.
- Fixtures cover stale checks, wrong check sources, proposed policy-source
  changes that cannot govern the same PR, missing qualified approval, and
  reviewability modes. These are local contract/security probes only; they do
  not prove authenticated GitHub retrieval or Action security.

### Required before public Action release

- pinned Action implementation from a trusted base/default branch, with the
  self-contained bundle committed and verified;
- minimal `permissions` declaration and documented token/App requirements;
- no PR checkout in the privileged path;
- safe handling of PR title/body/labels and all shell inputs;
- `pull_request` and `merge_group` evidence-target integration tests;
- artifact provenance and TOCTOU tests if artifacts cross workflow boundaries;
- expected-source setup documentation for the repository’s required check;
- negative test proving a foreign App/name cannot produce a pass;
- receipt redaction test and schema compatibility test.

## Residual risk

Even with these controls, PatchGate cannot prove functional correctness,
security safety, legal compliance, or that a human read every changed line.
GitHub administrators can still override some native protections, and an
authorized actor can create a valid but substantively wrong check. The receipt
must describe the evidence boundary rather than inflate it into an assurance
claim.
