# PatchGate landscape and design research

**Research date:** 2026-08-12  
**Scope:** GitHub pull-request governance, review-readiness automation,
commit-bound evidence, human approval boundaries, coding-agent contribution
rules, and GitHub Actions security.  
**Audience:** PatchGate maintainers and implementers.

## Research question

What must PatchGate do—and explicitly not claim—to provide a defensible,
deterministic review-readiness gate in a landscape that already contains
GitHub Rulesets, CODEOWNERS, policy-as-code bots, CI review tools, and security
posture scanners?

## Bottom line

PatchGate should proceed as a small, evidence-oriented evaluator rather than
as another generic PR automation bot. The strongest product boundary is the
combination of: a trusted base-revision policy, a normalized evidence
snapshot, explicit distinction between native controls and advisory prose, an
explainable human-gate result, and a replayable receipt. The largest technical
risk is not the rule logic; it is confusing a successful workflow result with
trusted evidence when the source identity, tested commit, merge-queue target,
or privilege boundary is not verified.

Confidence in this conclusion is **high** for GitHub workflow behavior and
security constraints, **moderate** for competitive differentiation, and
**low-to-moderate** for the eventual maintainer demand until two external
repositories test the workflow.

## Local evidence and current gap

The repository initially contained only `AGENTS.md` and
`PROJECT_CONSTITUTION.md`. There was no package manifest, source tree, GitHub
Action, fixture set, API adapter, receipt schema, or executable behavior to
audit. The constitution is therefore a product contract, not evidence that
the first release exists.

The implementation added in this pass is intentionally limited to a pure
evaluator and local fixtures. It demonstrates the core decision semantics; it
does not yet demonstrate authenticated GitHub API behavior, Action runtime
behavior, or external adoption.

## Findings by decision question

### 1. GitHub native controls already cover part of the problem

GitHub Rulesets can require status checks, identify the expected GitHub App for
a required check, require code-owner approval, require the most recent
reviewable push, and dismiss stale approvals under configured conditions. The
REST API can enumerate effective repository rulesets, including inherited
rulesets, and the contents API can fetch a file at an explicit commit ref.

Implication: PatchGate should consume and explain native controls instead of
reimplementing them as a second branch-protection system. Its value is the
cross-source decision and the portable explanation, not a competing merge
engine.

**Evidence:** [available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [repository rulesets API](https://docs.github.com/en/rest/repos/rules), [repository contents API](https://docs.github.com/en/rest/repos/contents), and [code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).

### 2. Commit binding must be an explicit input, not an implementation detail

GitHub documents that required checks must pass on the latest required commit;
checks from earlier commits do not satisfy the requirement. A pull-request
workflow normally uses the PR merge ref, while a `merge_group` workflow uses
the merge-group SHA. A merge queue therefore changes the evidence target and
must be treated as a distinct evaluation event.

Implication: the evaluator must receive `testedSha` and `targetKind` from the
adapter. It must not silently compare every check with `headSha`, and it must
not assume that the ambient `GITHUB_SHA` means the contributor branch head.
Every evidence item should retain both its observed `headSha` and the target
against which it was accepted.

**Evidence:** [required status-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), [workflow events and `merge_group`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), and [check-run API](https://docs.github.com/en/rest/checks/runs).

### 3. “Expected source” is stronger than a name match, but an Action-only release has a ceiling

GitHub supports expected sources for required status checks, which addresses
the risk that another actor with write access reports a green status under the
same name. The Checks API is controlled by GitHub Apps for check-run writes.
An ordinary Action run is associated with GitHub Actions, not with a distinct
PatchGate App identity.

Implication: PatchGate must expose an evidence-strength field. The first
Action-only implementation can verify the check name, conclusion, SHA, and
workflow/run metadata, but it must not claim an independently identifiable
PatchGate source. A high-assurance mode that requires an expected PatchGate
App must be implemented as a GitHub App or remain unsupported. The README and
receipt must make this distinction visible.

**Evidence:** [GitHub required-check source guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [status-check types](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks), and [check-run write requirements](https://docs.github.com/en/rest/checks/runs).

### 4. Base-revision policy is a real security boundary

Policy Bot reads policy from the most recent commit on the target branch and
offers local validation and simulation. This validates the general product
pattern of target-branch policy, while also showing why PatchGate must record
the exact base revision and digest: remote policy refs, inherited policies,
edited comments, commit attribution, and approval invalidation all create
time-of-check and identity edge cases.

Implication: a PR must never make its own `patchgate.yml` authoritative for
that same evaluation. Policy changes should be detected against the trusted
base policy and routed to the configured human gate. The receipt should carry
the base SHA and policy-source digest, not only the path name.

**Evidence:** [Policy Bot configuration and target-branch loading](https://github.com/palantir/policy-bot#configuration), [Policy Bot validation/simulation](https://github.com/palantir/policy-bot#testing-and-debugging-policies), and [Policy Bot security caveats](https://github.com/palantir/policy-bot#security).

### 5. Existing PR automation tools prove demand for local rules, not PatchGate’s full differentiation

Danger evaluates a project-owned `Dangerfile` in CI and posts messages,
warnings, or failures for team conventions such as changelog entries, test
coverage, assignees, and PR size. Reviewpad provides YAML policy-as-code,
reviewer assignment, labels, comments, and a merge-protection check. OpenSSF
Scorecard measures repository security-health practices rather than whether a
specific contribution is reviewable.

These tools occupy adjacent positions:

| Capability | GitHub native | Policy Bot | Reviewpad / Danger | PatchGate target |
| --- | --- | --- | --- | --- |
| Branch/merge enforcement | Strong | Via a check | Reviewpad Protect or CI | Consumed and explained |
| Arbitrary team conventions | Limited | Strong approval policy | Strong and flexible | Narrow deterministic classes |
| Pre-PR contributor/agent preflight | Limited | Not the central UX | Not the central UX | First-class |
| Trusted base policy | Native branch controls | Target-branch policy | Repository config | Explicit base SHA + digest |
| Evidence target and source explanation | Partial | Tool-specific | Tool-specific | Receipt-level contract |
| Human handoff boundary | Reviews/CODEOWNERS | Approval policies | Custom workflow | Explicit status and gate |
| Security posture score | No | No | No | Out of scope; consume evidence |

The competitive hypothesis is therefore credible but unproven. PatchGate
should not expand into a general scripting language or security scanner before
it proves that maintainers use the preflight and receipt surfaces.

**Evidence:** [Danger JS](https://danger.systems/js/), [Reviewpad documentation](https://docs.reviewpad.com/), [Policy Bot](https://github.com/palantir/policy-bot), and [OpenSSF Scorecard](https://github.com/ossf/scorecard).

### 6. Issue linkage must use GitHub’s linked-issue semantics, not only a regex

GitHub supports linking a PR to an issue manually or through supported closing
keywords, with cross-repository syntax rules. A body regex can be useful for
local preflight, but it cannot prove that the referenced issue exists, is in
the intended repository, or is actually linked.

Implication: the policy should select `linked_issue` as the authoritative
signal when the adapter can retrieve it, and classify body-only matches as
advisory or `needs_confirmation`. The first local fixture may accept a
normalized linked-issue snapshot, but the future adapter must not promote a
string match to verified linkage.

**Evidence:** [linking a pull request to an issue](https://docs.github.com/en/enterprise-cloud@latest/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) and [issues API semantics](https://docs.github.com/en/rest/issues/issues).

### 7. Review freshness and qualified approval are separate dimensions

GitHub can dismiss stale approvals after a code-modifying push and can require
approval of the most recent reviewable push. The reviews API exposes review
state and commit identity, but a raw `APPROVED` value is not enough: dismissed
reviews, author approvals, bot identities, team membership, and repository
permissions affect eligibility.

Implication: the adapter must normalize an approval as an active, qualified
approval. The pure evaluator should compare the normalized review to the
configured target SHA and never infer team qualification from a username
string. When the adapter cannot establish qualification, the result should be
`human_review_required` or `evidence_missing`, not green.

**Evidence:** [pull-request review API](https://docs.github.com/en/rest/pulls/reviews), [review behavior and stale approvals](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews), and [ruleset review options](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

### 8. The privileged/untrusted workflow split is mandatory

GitHub documents that `pull_request_target` runs with the base repository’s
token and secrets. Checking out and executing a fork PR in that context can
run contributor-controlled build scripts with elevated privilege. GitHub
Security Lab also documents script-injection and time-of-check/time-of-use
patterns, while GitHub’s 2026 checkout hardening reduces a common pattern but
does not remove the architectural risk.

Implication: PatchGate’s trusted lane must treat PR fields, titles, bodies,
labels, paths, and artifacts as untrusted data. It should use API reads and
fixed code from the default branch, pass untrusted verification through a
separate read-only workflow, and bind any returned artifact/evidence to the
exact target SHA and run identity. It must never interpolate PR text into a
shell command.

**Evidence:** [securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [GitHub Security Lab: preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/), [GitHub Security Lab: untrusted input](https://securitylab.github.com/resources/github-actions-untrusted-input/), and [safer checkout defaults](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/).

### 9. Coding-agent research supports explicit verification and handoff, not authorship detection

RepoComplianceBench reports a study of 106 issues from 49 repositories with AI
contribution rules. In the authors’ experiments, agents rarely retrieved rules
proactively; reminders and verifier feedback improved disclosure and
verification, while refusal in AI-banned repositories and human escalation
remained unresolved. A separate 2026 preprint reports security smells in
agent-assisted PRs and argues for context-aware guardrails at the human–AI
boundary.

These are early preprints and should not be treated as universal prevalence
estimates. They do support PatchGate’s narrow design: make rules discoverable
before contribution, verify concrete evidence, and represent a human gate
without pretending the gate proves that a human inspected the code.

**Evidence:** [RepoComplianceBench](https://arxiv.org/abs/2607.26819) and [Trust but Verify?](https://arxiv.org/abs/2607.12428).

## Design changes adopted in this pass

1. **Explicit evidence target:** every check and approval is evaluated against
   `testedSha` and `targetKind`; `headSha` remains a separate PR identity.
2. **Evidence strength:** a check name and SHA are not the same as a verified
   expected App source. Action-only operation is documented as a lower-trust
   mode.
3. **Deterministic core:** the evaluator hashes a canonical normalized input;
   wall-clock time belongs to the outer receipt envelope and does not affect
   the pure decision.
4. **Fail-closed ambiguity:** absent or mismatched base policy is
   `policy_ambiguous`; missing commit-bound evidence is `evidence_missing`;
   unsatisfied declared human gates are `human_review_required`.
5. **Structured linkage:** body text may be an advisory clue, while verified
   issue linkage must come from normalized GitHub metadata.
6. **Reviewability signals:** file count, ownership domains, generated files,
   and subsystem boundaries are separate explainable signals. No aggregate
   risk score is introduced.
7. **Action boundary:** the trusted Action lane reads metadata only. Running
   contributor code is outside the privileged decision lane.

## Evidence ledger

| Source | Type | Direct claim used | Limitation |
| --- | --- | --- | --- |
| GitHub Rulesets/docs | First-party documentation | Native review/check controls and expected sources | Product behavior can change; adapter needs integration tests |
| GitHub Actions docs | First-party documentation | Event SHA, permissions, `pull_request_target`, merge queue | Docs describe platform behavior, not PatchGate implementation |
| GitHub REST API docs | First-party API documentation | Read/write permissions and metadata fields | API access varies by token type and repository visibility |
| Policy Bot | Open-source project documentation | Target-branch policy, simulation, caveats | Its implementation and deployment model differ from PatchGate |
| Reviewpad | First-party product docs | YAML automation and merge protection | Current docs display a temporary unavailability notice |
| Danger JS | First-party project docs | CI-native convention automation | It is intentionally scriptable rather than receipt-oriented |
| OpenSSF Scorecard | Open-source project | Security-health metric boundary | Not a PR readiness evaluator |
| RepoComplianceBench | arXiv preprint | Agent rule discovery, disclosure, verification, handoff findings | Early benchmark; not a production prevalence estimate |
| Trust but Verify? | arXiv preprint/workshop paper | Agent-assisted security-smell findings | Method uses LLM judging plus manual analysis; requires replication |
| GitHub Security Lab | First-party security research | Privileged workflow and untrusted-input abuse paths | Examples are threat evidence, not a probability model |

## Open gaps that must not be hidden

- No GitHub API adapter has been implemented or tested against live repositories.
- No GitHub App exists to provide a distinct expected source for a high-assurance
  PatchGate check.
- CODEOWNERS parsing and GitHub team/permission qualification are not yet
  implemented in the local slice.
- Linked-issue retrieval is not yet implemented; body matching is not proof.
- No merge-queue integration test exists yet.
- No two external public repositories have piloted the workflow.
- No empirical calibration data exists for reviewability thresholds. Defaults
  must remain advisory until maintainers supply evidence.
- Receipts are not signed or tamper-proof.

## Recommended decision

Continue with the deterministic core and a narrow GitHub metadata adapter.
Prioritize correctness of revision/source/authority binding over more rule
classes. Keep high-assurance App identity, artifact attestation, and broad
cross-platform support as explicit follow-on work. The next product proof is
not a dashboard; it is two external repositories using preflight and a
required check while producing fixture cases for every observed edge case.
