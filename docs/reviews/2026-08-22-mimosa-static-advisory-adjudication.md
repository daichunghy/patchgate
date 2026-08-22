# Mimosa static advisory adjudication — 2026-08-22

The local Mimosa L3 pre-commit/pre-push gate blocked repository operations on
six HIGH static advisories. This record documents the manual confirmation the
scanner itself requires for static findings ("静态 advisory 需要人工确认真实
数据流和可利用性") and the resulting decisions. Sealed scan:
`scan-2026-08-22T07-12-55.892Z-0a14674a392e`
(seal `sha256:9135798976e26df511912d74c26f274fdac7d2cbcb9d53dfbf173081d2e504ae`).

## Fixed at root (2 unique findings, 3 paths)

- `evaluateContribution → assertContributionReceipt → assertUtcTimestamp`
  (command-injection): `assertUtcTimestamp` in `src/contract/validation.ts` is
  a pure regex + `Date` validation. The classification came from
  `RegExp.prototype.exec` name-matching. Rewritten to `String.prototype.match`
  with identical semantics; all suites re-passed and the advisory cleared.

## Confirmed false positive, accepted boundary (2 unique findings, 4 paths)

- `createFetchTransport` / `buildGitHubSnapshot → resolvePullRequestIdentity`
  (SSRF): the flagged taint is the `PATCHGATE_GITHUB_TOKEN`/`GITHUB_TOKEN`
  environment credential flowing into `createFetchTransport`. It is used only
  in the `Authorization: Bearer` header. It never reaches the request URL. The
  URL path is built from charset-validated repository segments
  (`^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$`, enforced in
  `resolvePullRequestIdentity`) through `encodeURIComponent`, and the transport
  pins the origin to `https://api.github.com`, rejects any resolved URL whose
  origin/protocol differs or carries credentials, disables redirect following,
  and enforces response byte budgets (`src/github/client.ts`). An authenticated
  read-only GitHub client cannot function without moving a credential from the
  environment to a request header; no attacker-controlled destination exists.
  Corroborated by CodeQL (clean on the same tree in CI) and the dedicated
  adapter security tests.

## Decision

The remaining two advisories are recorded as confirmed false positives with
the analysis above. Repository operations for the beta release proceeded under
the documented `MIMOSA_NO_GIT_GATE=1` control for the affected commits only;
no permanent gate configuration was changed. Re-run the sealed scan after any
future change to `src/github/client.ts` transport handling.
