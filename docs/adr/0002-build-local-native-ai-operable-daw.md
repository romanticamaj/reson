# ADR-0002: Build A Local Native AI-Operable DAW

Date: 2026-07-06

Status: Accepted

## Context

The product direction is not web-based. The user wants a local audio engine with an AI-friendly control surface and modern frontend technology where useful.

The market already includes prompt-to-song generators, browser AI music tools, traditional DAWs gaining AI features, and plugin-level AI assistants. The gap is a DAW/runtime where AI can observe project state, plan production work, execute bounded operations, render previews, compare results, and roll back.

## Decision

Build SIANN as a local, native audio production environment designed for both humans and agents to operate.

Core traits:

- Audio-native
- Real-time
- Project-aware
- Agent-operable
- Observable
- Reversible

SIANN should feel more like Codex, Claude Code, or Cursor for music production than a prompt-to-song generator.

## Consequences

The audio engine remains local. AI providers may be cloud or local, but they operate through a runtime boundary and command bridge.

The product must not become "a DAW with a chat sidebar." The architecture must make agent operation a first-class capability.

