# PatchGate release-candidate checklist

**Current state:** unpublished development package; no public Action tag or
`v0.1` release is claimed.

The publication and rollback procedure is documented separately in the [beta
release and rollback runbook](releases/beta-release-and-rollback.md). This
checklist is a prerequisite, not permission to publish.

## Local gate

Run from a clean checkout after building the CLI and Action bundle:

```bash
npm run verify
npm run check:release-candidate
```

The release-candidate check confirms that:

- `package.json` remains private and explicitly uses a development version;
- root `action.yml`, the Action bundle and the CLI are present;
- the README has no stale repository placeholder;
- `npm pack --dry-run` contains the intended package and Action artifacts;
- `node_modules` is not included in the pack surface.

Passing this command is a packaging precondition, not release authorization.

## Before a public beta

A maintainer must separately verify and record:

1. merged root Action migration and successful public main-branch workflows;
2. public CodeQL and Security Audit runs;
3. immutable Action reference and clean consumer installation;
4. tested rollback to a known-good Action commit;
5. two consented non-blocking shadow installations;
6. support, security reporting and compatibility wording.

Do not create a `v0.1.0` release from local tests alone. Keep the package and
Action unpublished while any required evidence remains missing.
