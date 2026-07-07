# ADR-0012: Move From Headless Batch Runner To Live Project Bridge

Date: 2026-07-07

Status: Accepted

## Context

The current Reson workflow proves commandability through a headless batch runner:

```text
Node CLI
-> command JSON
-> Ardour-derived session utility
-> open or create session
-> mutate session
-> save, render, observe
-> process exits
```

This path successfully imports real DAW test packs, creates multiple tracks, places audio at specified times, trims BGM regions from `_DAW/placement.md`, renders a preview, emits a journal, and supports snapshot rollback.

However, this is not the final product interaction model. A producer expects to open a project, keep the audio engine running, inspect a timeline, approve a plan, and see the current session update. Mutating `.ardour` project files from a separate process while another UI or engine process owns the same session is unsafe.

## Decision

Keep the headless batch runner as the test, fixture, replay, import, and offline automation path.

For the product UI, move toward a live project bridge:

```text
Reson Studio UI
  timeline, import tools, plan review, preview playback, rollback controls

Local Bridge Server
  HTTP/WebSocket API, command queue, plan approval, observation stream

Live Engine Session Adapter
  owns one open Ardour-derived session, applies commands in engine-safe context

Reson Engine
  Ardour-derived session, tracks, playlists, regions, render, persistence
```

Only one process should own a live session. UI and agent layers must submit mutations through the bridge command queue, not by editing project files or directly touching engine internals.

The bridge must classify commands by live-safety:

- `safe-live`: can run while the project is open and transport state is safe.
- `requires-stop`: must stop playback or wait for a safe transport point.
- `background-job`: can run asynchronously but must report progress and completion.
- `offline-only`: must run through the headless batch path or a closed-session maintenance task.

The existing headless runner remains valuable for deterministic tests, command log replay, CI-style validation, bulk imports, and recovery tools.

## Consequences

The next UI milestone should not depend on Ardour's legacy GTK UI as the product surface. Ardour's GUI can remain a diagnostic and visual comparison tool.

The bridge server needs:

- Project open/close lifecycle.
- Live session ownership rules.
- A serialized command queue.
- Engine-thread-safe mutation scheduling.
- Observation snapshots and incremental event streaming.
- Stale plan rejection against live session state.
- Async job handling for import, waveform analysis, render, snapshot, and rollback.
- Clear failure states when the project is dirty, externally modified, or manually changed outside the bridge.

Rollback in live mode should evolve from file snapshot restore toward live checkpoints and bridge-derived inverse operations where safe. Session-level snapshot restore is still acceptable for offline recovery and early trust building.

This decision shifts the product architecture from "CLI mutates a session file" to "local app operates a single live project through a bridge-owned engine session." It preserves the proven batch runner, but prevents it from becoming the accidental product architecture.

