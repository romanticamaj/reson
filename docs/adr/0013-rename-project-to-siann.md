# ADR-0013: Rename Project To SIANN

Date: 2026-07-07

Status: Accepted

## Context

ADR-0001 selected Reson as the working name so the project could move quickly
through early architecture and engine spike work. The product now needs a
stronger public name before the Studio UI and broader developer-facing material
are shaped around it.

The existing repository, bridge CLI, command schemas, and engine runner already
use `reson` identifiers in paths, binary names, fixtures, journals, and local
developer commands. Renaming those implementation identifiers immediately would
create churn without changing the product direction.

## Decision

Use **SIANN** as the public product and project name.

Use SIANN for:

- Public README and product-facing language.
- Architecture descriptions.
- Studio UI and agent/runtime product concepts.
- Future public branding.

Keep the existing `reson` implementation identifiers temporarily:

- Local repository path: `/Users/garyhsieh/reson`.
- Engine checkout path: `/Users/garyhsieh/reson-engine`.
- Bridge CLI: `reson-bridge`.
- Environment variable: `RESON_ENGINE_DIR`.
- Existing command, fixture, and journal identifiers.

Any future migration from `reson-*` implementation identifiers to `siann-*`
should be handled as a separate compatibility-aware change.

## Consequences

SIANN replaces Reson in public-facing and active architecture documentation.
Historical ADRs may still reference Reson when describing earlier decisions.

Developer commands remain stable for now, so existing tests, examples, generated
plans, journals, and engine integrations keep working.

The name still requires deeper trademark, domain, GitHub, package, and app-store
clearance before a public launch.
