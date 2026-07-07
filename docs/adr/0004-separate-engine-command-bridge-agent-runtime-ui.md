# ADR-0004: Separate Engine, Command Bridge, Agent Runtime, And UI

Date: 2026-07-06

Status: Accepted

## Context

The project needs a stable audio backend and a redesignable AI-friendly control system. UI and AI must be able to evolve without destabilizing the engine.

## Decision

Separate SIANN into four conceptual layers:

```text
SIANN Engine
  Ardour-derived audio/session core.

SIANN Command Bridge
  Typed mutation and observation boundary.

SIANN Agent Runtime
  AI provider adapters, planning, tool calling, policy, and task state.

SIANN Studio UI
  Human-facing DAW views, AI task panel, plan review, audition, and rollback.
```

The engine should not know about prompts, model providers, chat history, or AI planning.

## Consequences

The command bridge becomes the architectural hinge. Both UI and AI use it for mutation. The engine remains the trust boundary.

During the first Ardour spike, this is aspirational for the final architecture because legacy Ardour UI can still mutate session state directly.

