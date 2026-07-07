# Security Policy

SIANN is pre-release software. Please avoid sharing private projects, client audio, provider keys, or unpublished music when reporting issues.

## Reporting Security Issues

For now, report security-sensitive issues privately to the repository owner instead of opening a public issue. Include:

- A short description of the issue.
- Reproduction steps or affected commands.
- Whether private audio, credentials, or provider payloads could be exposed.
- Suggested impact and urgency.

## Sensitive Data

Do not commit:

- AI provider keys or local credential files.
- Private audio assets, rendered stems, or client sessions.
- Large generated media artifacts.
- Local `.ardour` sessions unless they are intentional fixtures.

Changes that affect provider data flow, local privacy boundaries, command approval, or rollback behavior should update docs and, when architectural, add or amend an ADR.
