# Authorized GitHub live read-only smoke protocol

This protocol is intentionally separate from recorded/mock evidence. It is not
authorization to run. A maintainer must first supply the exact repository,
pull-request target, credential kind, and permission scope.

## Preconditions

- exact `OWNER/REPOSITORY` and positive pull number;
- public/private visibility and whether the repository is disposable or
  maintainer-approved;
- `pull_request` head or merge target; merge-group is unsupported in the
  current scalar contract;
- read-only credential source and declared endpoint capabilities, without
  sharing the token value;
- explicit confirmation that no check, comment, status, artifact, ruleset,
  branch-protection, or workflow write may occur.

## Command

```bash
PATCHGATE_GITHUB_TOKEN='read-only-token' \
  node dist/src/cli.js github snapshot \
  --live --repo OWNER/REPOSITORY --pull 123 --target head \
  --output /tmp/patchgate-g3-live-snapshot.json
```

Do not put the token in shell history or a command argument. The command must
be run only after `npm run build` and the local/mock suite pass.

## Record, redacted

Record the command with the token removed, repository/PR target, API version,
credential class, declared scopes, request/page/retry/rate-limit metrics,
capability observations, final status, diagnostics, and validation result.
Do not retain PR body, review body, comments, issue title/body, workflow logs,
artifacts, emails, or private file content. A live smoke is not a pilot,
shadow installation, enforcement test, or proof of code correctness.
