# G0 maintainer decision brief

**Status:** awaiting maintainer decisions  
**Date:** 2026-08-13  
**Workspace:** `/Users/macos/Desktop/Github`

## Verified current state

- No local Git repository is initialized.
- No license file exists.
- No public remote exists.
- The package remains private at `0.1.0-dev`.
- The latest verified baseline is 49 non-CLI tests, 4 CLI process
  tests, 50 fixture/oracle entries, 11 security tests, and zero vulnerabilities
  from `npm audit --audit-level=high`.
- GitHub CLI is authenticated to `daichunghy-ben`. Authentication is not
  authorization to create or publish a repository.

## Decision boundary

G0 requires a real public repository, an OSI-approved license, community health
files, a passing real pull-request CI run, a passing secret scan, and a live
default-branch ruleset. An agent may prepare files, but only the maintainer may
choose the legal/publishing identity and authorize external writes.

Roadmap 2.0 also requires usable public feedback/private-security routes and a
consent-safe early-user research protocol. Candidate recruitment is not
adoption, a completed session is not a shadow install, and a shadow install is
not an enforcement pilot.

## Neutral license decision

| Option | Operational summary | Maintainer must consider |
| --- | --- | --- |
| MIT | Short permissive license; preserve copyright and license notice | It does not contain Apache-2.0's explicit patent grant/termination language |
| Apache-2.0 | Permissive license with explicit patent grant/termination and notice conditions | Longer compliance surface; NOTICE handling applies when relevant |

Official catalog: https://opensource.org/licenses

This is an operational comparison, not legal advice. The agent must not select
the license or copyright identity.

## Proposed technical sequence

1. Complete independent read-only repository, OSS and CI/security audits.
2. Record maintainer decisions below.
3. Scan intended Git inventory for secrets and generated files.
4. Initialize local Git only if authorized.
5. Add the selected license, community surfaces and minimal-permission CI.
6. Rerun the full local verification matrix.
7. Create/push the exact public remote only if authorized.
8. Open a real foundation PR, wait for CI and verify run/SHA/event.
9. Merge and configure a ruleset only under separate explicit permission.
10. Read back GitHub state before closing G0.

## Maintainer response block

```text
G0-MD-01 GitHub owner:
G0-MD-02 Repository slug:
G0-MD-03 Public visibility authorized now? yes/no:
G0-MD-04 Default branch:
G0-MD-05 License SPDX ID:
G0-MD-06 Copyright holder text:
G0-MD-07 Copyright year:
G0-MD-08 Initialize local Git and create commits? yes/no:
G0-MD-09 Create remote and push to the exact owner/slug? yes/no:
G0-MD-10 Open a real foundation PR and wait for CI? yes/no:
G0-MD-11 After CI pass, may the agent merge the PR? yes/no:
G0-MD-12 After merge, may the agent configure the proposed ruleset? yes/no:
G0-MD-13 Security contact: GitHub private vulnerability reporting only, or a maintainer-supplied address?
```

## Provisional gate status

`G0: dependency_pending — maintainer owner/license/publication decisions and
live evidence are absent.`

The executing Prompt 3 agent must expand this brief with current-source links,
namespace checks, subagent findings, exact command exits and remaining
uncertainties before requesting the final decision.
