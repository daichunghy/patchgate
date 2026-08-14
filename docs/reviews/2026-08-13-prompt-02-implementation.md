# Prompt 2 implementation report

**Date:** 2026-08-13  
**Scope:** PG-108, PG-109, PG-110 and the corrective semantics required before
them  
**Authority:** `PROJECT_CONSTITUTION.md`, then the Prompt 2 specification and
the repository design documents  
**Repository state:** `/Users/macos/Desktop/Github` is not a Git repository;
no Git repository was initialized.

## 1. Baseline before edits

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm run verify` | 0 | 5 test files, 43 tests; lint/typecheck/unit pass |
| `npm run build` | 0 | TypeScript build pass |
| `npm run test:schema` | 0 | 11 tests |
| `npm run test:determinism` | 0 | 5 tests |
| `npm run test:fixtures` | 0 | 1 test |
| `npm audit` | 0 | 0 vulnerabilities |
| Git repository check | absent | `.git` is not present |

This baseline was local evaluator evidence only. It did not prove authenticated
GitHub retrieval, Action safety, merge protection, or release readiness.

## 2. Subagents and independent findings

Three pre-implementation subagents reviewed read-only in parallel:

| Agent | Scope | Finding integrated |
| --- | --- | --- |
| Observation contract reviewer | types, contract, schemas, fixtures, backlog | Missing observation groups, versioning and policy contract digest |
| Evidence/security reviewer | evaluator, evidence, policy, threat/deep-dive | False green from bare collections, source spoofing, review identity and policyChanged |
| Compatibility/test reviewer | tests, fixtures, scripts, docs | Missing executable oracle/manifest, pure-core filesystem coupling and unsupported claims |

The agent findings were independently reproduced against source before edits.
The implementation agent remained the only editor; subagents did not modify
files.

## 3. Contract decision record

- **Observation shape:** an `observations` map sits beside existing payload
  collections. It avoids duplicating every item while preserving per-group
  source, revision, completeness, permission and normalized digest. Policy
  source metadata is a per-record array so missing CODEOWNERS/Rulesets data
  cannot be hidden by another source.
- **Trust boundary:** `createTrustedPolicyArtifact(rawBytes, expectedIdentity)`
  parses and normalizes one raw artifact, then derives raw `digest` and
  normalized `contractDigest`. The evaluator recomputes the normalized digest.
  These checks prove internal consistency only; they are not signatures or
  source-authenticity proof. G3 authenticated adapters remain necessary.
- **Invalid versus unknown:** malformed/unsupported input, bad timestamps,
  target contradictions, missing immutable identity and observation digest
  mismatch reject with exit `2` and stable diagnostic IDs. A well-formed source
  conflict or incomplete/insufficient observation produces a receipt with
  `policy_ambiguous` or `evidence_missing` and exit `1`.
- **Check candidate selection:** name → target SHA → expected App/workflow
  identity → run/check provenance → complete collection → unique eligible
  candidate → status → conclusion. Duplicate eligible candidates are
  ambiguous; no array-order or newest-run selection is used.
- **Version namespaces:** evaluation-input schema `0.1`, receipt schema `0.1`,
  evaluator/package `0.1.0-dev`.
- **Pure boundary:** `assertEvaluationInput` is the schema/semantic boundary;
  `evaluateValidated` is pure and clock-free; `deliverReceipt` is the only
  delivery step that receives `evaluatedAt`.

## 4. Slice checkpoints

1. **Types/schema:** versioned input, observation metadata, policy contract
   digest, check/workflow/run identity, actor/review/team identity, bounds and
   conditional schemas.
2. **Runtime boundary:** cross-field invariants, normalized observation digest
   recomputation, target binding, duplicate identity checks, stable diagnostic
   IDs and receipt referential-integrity validation.
3. **Evaluator semantics:** dependency-aware completeness gates, confirmed
   failure versus unknown evidence, policy-change derivation from paths,
   immutable qualification requirements and advisory/blocking reviewability.
4. **Digest/replay:** audit timestamps excluded from semantic digests; authority,
   completeness, permission, source/revision and normalized items included;
   receipt core/envelope separation and executable 50-entry fixture manifest.
5. **Documentation:** architecture, receipt contract, threat model, roadmap,
   execution plan, backlog and this report updated with local/live evidence
   boundaries.

## 5. Findings register

| ID | Severity | Finding | Fix evidence | Status |
| --- | --- | --- | --- | --- |
| PG2-P0-001 | P0 | Normalized policy could be replaced while retaining the raw source claim | `src/policy.ts`, `src/evaluator-core.ts`, policy-binding tests/fixtures | fixed; post-review clear |
| PG2-P0-002 | P0 | Incomplete collections and bare empty arrays could create green or confirmed failure | `src/types.ts`, `src/contract/validation.ts`, `src/evaluator-core.ts`, PG-108/109 fixtures | fixed; post-review clear |
| PG2-P1-003 | P1 | Check/workflow identity and reviewer provenance were insufficient | types, schemas, source verifier, receipt evidence and security tests | fixed; post-review clear |
| PG2-P1-004 | P1 | Pure evaluator loaded schemas/filesystem and delivered receipt clock was implicit | `src/evaluator-core.ts`, `src/evaluator.ts`, receipt tests | fixed; post-review clear |
| PG2-P1-005 | P1 | No versioned fixture oracle or manifest bijection existed | `fixtures/manifest.json`, 50 fixtures, `test/fixture.test.ts`, `test/cli-smoke.test.ts` | fixed; targeted post-review pass |
| PG2-P1-006 | P1 | Rehashed satisfied human gates did not bind `approvedBy` to qualified reviewer evidence | `src/contract/validation.ts`, `test/security.test.ts` | fixed; targeted post-review pass |
| PG2-P1-007 | P1 | Incomplete changed paths could be treated as irrelevant and still produce green | `src/evaluator-core.ts`, `test/evaluator.test.ts` | fixed; targeted post-review pass |
| PG2-P1-008 | P1 | Rehashed team-backed approvals could omit immutable team provenance | `src/contract/validation.ts`, `test/security.test.ts` | fixed; targeted subagent re-review pass |
| PG2-P1-009 | P1 | A rehashed passed check could retain a failed or otherwise unacceptable selected conclusion | check requirement observations now bind acceptable conclusions, expected source and selected conclusion; security regression fixture/test | fixed; local exploit now rejects with `RECEIPT_EVIDENCE_INCONSISTENT` |
| PG2-P1-010 | P1 | A rehashed satisfied gate could fall below configured distinct qualified-actor count | receipt gates now record `requiredCount`; validation recomputes distinct qualified actors and exact review refs | fixed; local exploit now rejects with `RECEIPT_EVIDENCE_INCONSISTENT` |
| PG2-P1-011 | P1 | Workflow evidence references omitted run attempt and reviewer qualification could match an unrelated principal | workflow refs include run ID and attempt; receipt validation matches immutable configured login/team principal | fixed; regression coverage and full verification pass |

## 6. Behavior matrix

| Situation | Result |
| --- | --- |
| Complete + sufficient linked issues with zero verified links | confirmed `blocked` when required |
| Linked issue collection incomplete/insufficient | `evidence_missing` |
| Completed required check, right SHA/source, acceptable conclusion | passed |
| Completed unacceptable conclusion | `blocked` |
| Missing/pending/wrong/duplicate check candidate | `evidence_missing` |
| Complete reviews with no qualified current approval | `human_review_required` |
| Review/qualification observation incomplete | `evidence_missing` |
| Ownership required but ownership observation unavailable | `evidence_missing` |
| Advisory reviewability unavailable | advisory only; does not block |
| Blocking reviewability unavailable | `evidence_missing` |
| Policy/source authority conflict | `policy_ambiguous` |

## 7. G1 closure manifest

| Package | Outcome | Executable evidence | Residual gap |
| --- | --- | --- | --- |
| PG-101 | technical evidence complete | three schemas; `test/schema.test.ts` | public use still needs G0 |
| PG-102 | technical evidence complete | validation boundary; CLI diagnostics | no live adapter |
| PG-103 | technical evidence complete | semantic digest tests | no GitHub transport |
| PG-104 | technical evidence complete | receipt digest and integrity tests | checksum is not a signature |
| PG-105 | technical evidence complete | `test/status-precedence.test.ts` | none in local scope |
| PG-106 | technical evidence complete | schema/semantic rejection tests | no universal policy parser |
| PG-107 | technical evidence complete | candidate resolver and duplicate fixtures | no authenticated selection adapter |
| PG-108 | technical evidence complete | observation contract, semantic tests and manifest | live permission/pagination evidence absent |
| PG-109 | technical evidence complete | dependency-aware evaluator tests and behavior matrix | no live linked-issue/review adapter |
| PG-110 | technical evidence complete | 50-entry discriminated manifest with exact requirement-result, exit, status/reason and digest oracles; CLI process smoke | no external consumer compatibility evidence |

This is **G1 technical implementation evidence** only. Roadmap 2.0 now records
G1 as `locally_verified` and tracks G0 repository identity, Git history,
license and publication authority separately. Public Action, pilot and release
work still require G0 evidence.

## 8. Final verification and post-review

Verification was rerun after the final fixes:

| Command | Exit | Evidence |
| --- | ---: | --- |
| `npm run verify` | 0 | lint, typecheck, 6 non-CLI test files, 49 tests plus 3 CLI smoke tests |
| `npm run build` | 0 | TypeScript build pass |
| `npm run test:schema` | 0 | 8 tests |
| `npm run test:determinism` | 0 | 6 tests |
| `npm run test:fixtures` | 0 | 3 tests; 50 manifest entries with reject/evaluate/assert oracles and exact requirement results |
| `npm run test:security` | 0 | 11 security tests |
| `npm run test:cli` | 0 | 3 process-level CLI smoke tests; build plus exit `0/1/2` matrix |
| `npm audit` | 0 | 0 vulnerabilities |
| CLI valid fixture | 0 | versioned ready snapshot |
| CLI malformed JSON | 2 | `JSON_MALFORMED` |
| CLI unsupported schema | 2 | `INPUT_VERSION_UNSUPPORTED` |
| CLI preflight | 0 | local policy artifact with raw and contract digests |

Two post-implementation agents reviewed read-only. The compatibility/oracle
review initially found the manifest assert-oracle gap, receipt qualification
binding gap and incomplete-path gap; these became PG2-P1-006/007 and were fixed.
A further targeted review found the team-provenance gap, recorded as PG2-P1-008;
the implementation and regression test are now in place. The primary-agent
closure audit then reproduced two additional rehash attacks: changing the
selected passing check to an unacceptable conclusion and deleting one of two
required qualified approvals. These became PG2-P1-009/010; PG2-P1-011 closes
the related workflow-attempt and principal-binding gap. Both manual attacks now
reject with `RECEIPT_EVIDENCE_INCONSISTENT`, and the 50-entry fixture manifest
contains executable regression oracles. No post-review subagent edited the
workspace.

## 9. Residual gaps and handoff

- Local replay cannot prove that a caller did not fabricate a self-consistent
  snapshot; source authenticity remains a G3 authenticated-adapter obligation.
- No GitHub API adapter, GitHub Action, merge-group integration, live permission
  test, external pilot, public remote or license was added.
- CODEOWNERS parsing and native Rulesets semantics remain explicitly outside
  this prompt's scope.
- The next maintainer decision brief is `PG-001` repository identity/publishing
  authority and `PG-003` OSI license. No Git initialization, publishing,
  release, program submission or license choice was performed.
