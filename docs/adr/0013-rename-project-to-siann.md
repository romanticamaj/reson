# ADR-0013: Rename Project To SIANN

Date: 2026-07-07

Status: Accepted

## Context

The product is moving toward an open-source project. Carrying two names across
the repository, CLI, schemas, generated artifacts, and engine bridge would make
the project harder to understand and contribute to.

## Decision

Use **SIANN** as the single public product and project name.

Use `siann` for implementation identifiers:

- Local repository path: `/Users/garyhsieh/siann`.
- Engine checkout path: `/Users/garyhsieh/siann-engine`.
- GitHub repository: `romanticamaj/siann`.
- Bridge CLI: `siann`.
- Environment variable: `SIANN_ENGINE_DIR`.
- Command, result, observation, import-pack, and journal schema namespaces:
  `siann.*`.
- Fixture, generated artifact, and `/tmp` example paths.
- Engine bridge runner names: `siann_command` and `ardour9-siann_command`.

## Consequences

This is a breaking rename for early developer tooling and generated artifacts.
The project is still pre-release, so clarity is more valuable than preserving
the temporary early command names.

The name still requires deeper trademark, domain, GitHub, package, and app-store
clearance before a public launch.
