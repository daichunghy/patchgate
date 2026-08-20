# Maintainer workflow proposal for Codex for Open Source

**Status:** draft application support; not evidence of current OpenAI API use.

This is a concrete six-month plan for using Codex in PatchGate maintenance if
the application is selected. PatchGate's evaluator remains deterministic and
does not depend on an LLM to decide a contribution status.

## Proposed workflow

### 1. Issue triage and fixture creation

Use Codex to group incoming issues by rule class, identify the smallest
reproduction and draft a fixture or documentation change. A maintainer confirms
the issue, authority source and expected result before code is changed.

### 2. Pull-request review preparation

Use Codex to summarize changed paths, compare a PR with the trusted policy and
locate missing evidence. The final decision remains PatchGate's deterministic
receipt plus qualified human review; Codex does not approve or merge a PR.

### 3. Security maintenance

Use Codex Security only on PatchGate or another repository with explicit owner
authorization. Triage findings against the threat model, reproduce them in a
fixture where possible, and keep the maintainer responsible for disclosure and
the final patch.

### 4. Release and pilot maintenance

Use Codex to prepare release checklists, compare immutable Action references,
review rollback instructions, summarize pilot feedback and turn confirmed
problems into scoped issues. Release publication and pilot consent remain human
actions.

## API-credit guardrails

- No private repository data or secrets in prompts.
- No autonomous merge, release or enforcement decision.
- No scanning of a repository without owner authorization.
- Keep a monthly usage and cost log tied to a maintainer task.
- Prefer small fixture, triage and documentation jobs over open-ended prompts.
- Record the resulting issue, PR, test or release artifact for auditability.

## Draft application answer

> API credits would support bounded issue triage, deterministic regression-fixture
> drafting, pull-request review preparation, security finding triage on
> authorized repositories, and release/rollback checklists. PatchGate would keep
> its evaluator deterministic, require maintainer approval for code and releases,
> exclude secrets and private repository data, and link each useful output to a
> public issue, test, PR or release artifact.
