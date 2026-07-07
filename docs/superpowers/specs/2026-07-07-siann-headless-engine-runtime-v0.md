# SIANN Headless Engine Runtime v0

Date: 2026-07-07

## Purpose

SIANN should become a headless, commandable DAW runtime rather than a tool that
edits Ardour sessions from the outside. The v0 goal is to prove a persistent
engine process can own a SIANN session and accept multiple commands without
restarting.

## Non-Goals

- No Studio UI implementation.
- No AI agent runtime.
- No arbitrary existing Ardour project import.
- No attempt to remove all Ardour internals in one step.
- No real-time collaborative editing.

## Target Architecture

```text
Client process
  CLI, future UI, future agent

SIANN Runtime API
  JSON request/response over stdio first
  HTTP/WebSocket can follow after behavior stabilizes

SIANN Headless Engine Runtime
  process lifecycle
  session lifecycle
  serialized command queue
  observations
  jobs
  journals

Ardour-Derived Audio Core
  tracks, playlists, regions
  transport-safe mutation points
  import, trim, render, save
```

## Runtime Lifecycle

The runtime starts once and owns one active SIANN session in v0.

Required lifecycle operations:

- `runtime.start`: first request after process spawn; reports protocol version and
  capabilities. The process itself is started by the client (spawn), not by a
  request.
- `session.create`: create a new SIANN session at a runtime-owned path.
- `session.observe`: return canonical session state.
- `commands.apply`: apply a command batch to the active session.
- `session.save`: persist the active session.
- `render.preview`: render a preview artifact.
- `session.close`: close the active session and release resources.
- `runtime.stop`: shut down the process cleanly.

Session-scoped requests (`session.observe`, `commands.apply`, `session.save`,
`render.preview`, `session.close`) must include the `sessionId` returned by
`session.create`. The runtime rejects a request whose `sessionId` does not match
the active session, so a desynced client fails loudly instead of mutating the
wrong session.

`session.open_existing_ardour` is intentionally out of scope.

## Command Model

The existing `siann.command.v0` operations remain the starting surface:

- `create_audio_track`
- `import_audio`
- `place_audio`
- `save_session`
- `render`
- `observe_session`
- rollback-related operations where safe

In v0, the runtime may internally reuse the same Ardour-derived session APIs as
`session_utils/siann_command.cc`, but the public contract should be runtime
requests rather than command files that launch a new process.

Some batch operations overlap with runtime requests (`save_session` vs
`session.save`, `render` vs `render.preview`, `observe_session` vs
`session.observe`). The runtime requests are the canonical client surface. The
batch-op forms remain valid inside `commands.apply` so existing journals and
batch-runner fixtures stay replayable, but new clients should not rely on them
for save/render/observe.

## Request Envelope

Requests should be JSON-serializable and line-delimited for the stdio v0:

```json
{
  "requestId": "req_0001",
  "type": "session.create",
  "body": {
    "sessionName": "SongIdea",
    "sampleRate": 48000
  }
}
```

Responses should always include the request ID:

```json
{
  "requestId": "req_0001",
  "ok": true,
  "type": "session.created",
  "body": {
    "sessionId": "sess_0001",
    "observationHash": "sha256:..."
  }
}
```

Failed requests must still include the request ID and use `ok: false` with a
stable machine-readable code:

```json
{
  "requestId": "req_0002",
  "ok": false,
  "type": "error",
  "body": {
    "code": "session_mismatch",
    "message": "sessionId sess_9999 is not the active session"
  }
}
```

Every request receives exactly one response, even on failure, so clients can
correlate by `requestId` without timeouts guessing at outcomes.

Events may be emitted asynchronously:

```json
{
  "eventId": "evt_0001",
  "type": "session.changed",
  "body": {
    "sessionId": "sess_0001",
    "observationHash": "sha256:..."
  }
}
```

## Session Ownership Rules

- Only the headless runtime mutates the active session.
- UI and agent clients are command clients, not session owners.
- One active session per runtime process in v0.
- Manual mutation through Ardour GUI is not part of the product workflow.
- Ardour GUI may still be used separately for visual comparison of saved output.

## Safety And Rollback

The v0 runtime can keep using snapshot-backed rollback for trust and recovery.
Each applied command batch should produce a journal entry with:

- request ID
- command batch
- pre-observation hash
- post-observation hash
- touched entities
- rollback metadata
- artifacts created

If a command fails, the runtime should either restore the pre-command state or
mark the session as requiring recovery before accepting further mutations.

To carry ADR-0012's stale-plan rejection forward, `commands.apply` may include
an `expectedObservationHash`. When present, the runtime rejects the batch if the
current observation hash differs, forcing the client to re-observe and replan
instead of mutating a session that changed underneath it. In v0 with a single
serialized client this is cheap insurance; it becomes essential once agent and
UI clients coexist.

Requests are processed strictly in the order received. In v0 the runtime may
respond synchronously to every request; the async job protocol for long-running
work (import analysis, render) is deferred until after the first persistent
mutation loop is proven.

## Testing Strategy

Add tests in layers:

- Node contract tests for request/response parsing and runtime client behavior.
- Engine smoke tests that start the runtime, create a session, apply two command
  batches, observe after each batch, render, and close.
- Regression tests that prove the process remains alive across multiple
  mutations.
- Compatibility checks comparing saved/rendered output against the current
  batch runner where practical.

## Current Implementation Status

Implemented in the engine runtime:

- `runtime.start`
- `session.create`
- `session.observe`
- `commands.apply`
- `session.save`
- `render.preview`
- `session.close`
- `runtime.stop`

Implemented live command operations:

- `create_audio_track`
- `import_audio`
- `place_audio`
- `save_session`

The runtime is verified by a gated Node integration test that creates a
SIANN-owned session, imports a generated WAV file, places the imported region,
renders a preview WAV, closes the session, and stops the runtime in one process.

## First Implementation Slice

The smallest useful slice is:

1. Add an engine-side `siann_runtime` or equivalent long-running utility.
2. Implement line-delimited JSON over stdio.
3. Support `runtime.start`, `session.create`, `session.observe`,
   `commands.apply`, `session.save`, and `runtime.stop`.
4. Add a Node client wrapper in this repo.
5. Prove two command batches can mutate the same live session in one process.

Rollback can follow after live import, placement, render, and close are stable.
