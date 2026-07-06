# Repository Guidelines

## Project Structure & Module Organization

This repository contains planning documents and the first developer-facing command bridge integration layer for Reson, a local AI-native music production environment.

- `README.md` is public/product-facing. Do not expose internal implementation details, ADR lists, or roadmap-style planning there.
- `docs/README.md` summarizes the current product and architecture direction.
- `docs/adr/` contains architecture decision records. Keep `0000-adr-index.md` updated when adding or superseding ADRs.
- `docs/discussions/` stores dated product and architecture discussion notes.
- `docs/research/` stores engine spike findings, commandability maps, and implementation research.
- `docs/schemas/` stores command, observation, journal, and bridge contract drafts.
- `docs/superpowers/specs/` stores larger design specifications.
- `src/bridge/` contains the Node-based developer bridge wrapper around the engine command runner.
- `bin/reson-bridge.js` is the CLI entrypoint for bridge workflows.
- `examples/bridge/` contains command fixtures that developers can run against a local engine checkout.
- `test/` contains Node test-runner coverage for the bridge wrapper, CLI, and fixtures.

Keep implementation modules separate by the documented architecture: audio engine, command bridge, agent runtime, and UI.

Key internal documents:

- [Architecture design](docs/superpowers/specs/2026-07-06-reson-architecture-design.md)
- [ADR index](docs/adr/0000-adr-index.md)
- [Initial product and architecture discussion](docs/discussions/2026-07-06-product-architecture-discussion.md)
- [Ardour commandability map](docs/research/ardour-commandability-map.md)
- [Engine spike checklist](docs/research/engine-spike-checklist.md)
- [Command journal v0](docs/schemas/command-journal-v0.md)

## Architecture & Implementation Boundaries

Reson is structured around four conceptual layers:

```text
Reson Studio UI
  DAW views, import tools, AI task panel, plan review, preview, rollback.

Reson Agent Runtime
  Model adapters, API key handling, observation, planning, risk policy, tool calls.

Reson Command Bridge
  Typed commands, validation, snapshots, transactions, undo, event logs, render hooks.

Reson Engine
  Ardour-derived session core for tracks, regions, routing, plugins, automation, render.
```

The engine is the trust boundary. AI and UI layers must not directly mutate low-level session state; they operate through the command bridge.

Implementation tracks:

- **Engine:** Ardour-derived session operations for import, placement, save, render, routing, plugins, and automation.
- **Command bridge:** JSON command schemas, observation schemas, validation, transactions, undo, rollback, and replay logs.
- **Agent runtime:** provider adapters, model configuration, tool calling, planning loops, risk policy, and local-only mode.
- **Studio UI:** import-pack workflows, mapping review, AI task panel, plan diffs, preview rendering, and apply/rollback controls.
- **Verification:** fixture sessions, command logs, render artifacts, replay checks, time conversion tests, and rollback coverage.

Example command shape:

```json
{
  "op": "place_audio",
  "sourceMediaId": "media_riser_01",
  "trackId": "track_fx_risers",
  "start": "01:08.000",
  "gainDb": -7,
  "fadeInMs": 20,
  "fadeOutMs": 120
}
```

Commands target stable IDs, not mutable track names. Name-based lookup may exist as a dry-run helper, but ambiguity must be rejected before mutation.

## Architecture Decisions

Accepted decisions are tracked as ADRs:

- [ADR-0001: Use Reson As Working Name](docs/adr/0001-use-reson-as-working-name.md)
- [ADR-0002: Build A Local Native AI-Operable DAW](docs/adr/0002-build-local-native-ai-operable-daw.md)
- [ADR-0003: Start From An Ardour-Derived Engine](docs/adr/0003-start-from-ardour-derived-engine.md)
- [ADR-0004: Separate Engine, Command Bridge, Agent Runtime, And UI](docs/adr/0004-separate-engine-command-bridge-agent-runtime-ui.md)
- [ADR-0005: Use Hybrid Copilot And Agent Autonomy](docs/adr/0005-use-hybrid-copilot-agent-autonomy.md)
- [ADR-0006: Make The Command Bridge The Agent Mutation Boundary](docs/adr/0006-command-bridge-agent-mutation-boundary.md)
- [ADR-0007: Prove Commandability Before UI Redesign](docs/adr/0007-prove-commandability-before-ui-redesign.md)
- [ADR-0008: Start With Import Pack Mapping Prompt Arrange](docs/adr/0008-start-with-import-pack-mapping-prompt-arrange.md)
- [ADR-0009: Keep AI Provider Integrations Runtime-Pluggable](docs/adr/0009-keep-ai-provider-integrations-runtime-pluggable.md)
- [ADR-0010: Treat Privacy And Provider Data Flow As A First-Class Boundary](docs/adr/0010-privacy-provider-data-flow-boundary.md)
- [ADR-0011: Use Journaled Command Rollback For The Engine Bridge](docs/adr/0011-use-journaled-command-rollback-for-engine-bridge.md)

## Build, Test, and Development Commands

Useful repository checks are:

- `git status --short` shows local changes.
- `rg "term" docs/` searches the documentation.
- `find docs -type f | sort` lists tracked documentation areas.
- `npm test` runs the bridge wrapper, CLI, and fixture tests with Node's built-in test runner.
- `node bin/reson-bridge.js run examples/bridge/create-session.command.json --json` runs a command fixture against the local engine checkout.
- `node bin/reson-bridge.js validate-journal /tmp/reson-bridge-demo/create-session/journal.json --json` validates and summarizes a generated command journal.

The bridge CLI defaults to `../reson-engine`. Use `RESON_ENGINE_DIR=/path/to/reson-engine` or `--engine-dir /path/to/reson-engine` when needed.

## Coding Style & Naming Conventions

For Markdown, use sentence-case prose, concise sections, and fenced code blocks for commands or diagrams. Prefer ASCII unless a document specifically needs otherwise.

ADR files use a four-digit sequence and kebab-case title, for example `0007-prove-commandability-before-ui-redesign.md`. Dated discussion and spec files use `YYYY-MM-DD-kebab-case-title.md`.

JavaScript uses CommonJS modules and Node built-ins only for now. Keep bridge code dependency-light until the integration surface stabilizes.

## Testing Guidelines

For documentation-only changes, verify links and references manually, especially ADR index entries. For code, add tests close to the module they cover and include deterministic command-bridge tests for session creation, import, placement, save, render, and replay behavior where feasible.

Planned verification categories:

- Session command dry-run tests.
- Import and region placement tests.
- Time conversion tests for mm:ss, bars/beats, tempo maps, and sample positions.
- Undo and rollback tests.
- Offline render smoke tests.
- Bounce parity or null tests where applicable.
- Command log replay and fixture-session determinism tests.

## Commit & Pull Request Guidelines

Recent commits use short Conventional Commit-style subjects, such as `docs: record initial ADRs and discussion log`. Continue using `type: concise summary`, with `docs:` for documentation-only changes.

Pull requests should include a brief summary, the reason for the change, affected docs or modules, and any validation performed. Link related issues or ADRs when applicable. Include screenshots only for future UI changes.

## Security & Configuration Tips

Do not commit provider keys, local audio assets, rendered stems, or private project files. Keep AI provider integrations runtime-pluggable and document any data-flow or privacy boundary changes in an ADR.

No license file has been added yet. The architecture assumes an Ardour-derived path, so GPL and open-source licensing constraints must be handled before implementation code is introduced.
