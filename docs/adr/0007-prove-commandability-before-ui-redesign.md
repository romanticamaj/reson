# ADR-0007: Prove Commandability Before UI Redesign

Date: 2026-07-06

Status: Accepted

## Context

Replacing Ardour's UI first would be high risk and could trap the project in large GTK/UI work before proving the core product wedge.

The core risk is whether Ardour can be safely operated through structured commands while preserving DAW trust.

## Decision

Run a commandability spike before major UI redesign.

Default spike decisions:

- macOS first because the current development machine is macOS.
- Keep Ardour's existing UI visible for diagnostics.
- Start with static JSON commands and no live AI.
- Prefer existing Ardour Lua/session APIs first.
- Reject OSC for structural edits unless research proves it can safely support them.
- If Lua is insufficient, prototype an in-process C++ command runner.
- Keep Ardour session compatibility during the spike.

## Consequences

The first output is research and a minimal command bridge, not a new polished UI.

Required spike outputs include:

- Ardour commandability map.
- Minimal command schema v0.
- Minimal observation schema v0.
- Rollback mechanism decision.
- Bridge approach decision with rejected alternatives.
- Fixture session, command log, rendered artifact, and replay result.

