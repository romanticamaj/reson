# 2026-07-06 Product And Architecture Discussion

## Summary

This discussion established Reson as a spec-first, local AI-native DAW project.

The product direction is:

> Native audio engine, designed from the bottom up for both humans and agents to operate.

The working name is **Reson**, from resonance plus reasoning.

## Market Framing

The market was split into several categories:

- AI-native or generative DAWs: Suno Studio, Mozart AI, BandLab, RipX.
- Traditional DAWs gaining AI features: Fender Studio Pro, Logic Pro, Cubase.
- Agentic DAW/control tools: LIA, Melosurf, DAWZY, DAWPilot-like tools.
- Plugin-level AI copilots: MixingGPT, LANDR Composer, and similar tools.

The conclusion was that the open market gap is not one-shot generation. The gap is an agentic DAW/project runtime:

```text
observe -> plan -> act -> render/preview -> verify -> rollback
```

This frames Reson as closer to Codex, Claude Code, or Cursor for music production than to a prompt-to-song generator.

## Product Definition

Reson is not intended to be:

- A web DAW.
- Another Suno.
- Cubase with a chat sidebar.
- A generic AI song generator.

Reson is intended to be:

- Local audio engine.
- AI-operable session runtime.
- Modern control/UI layer.
- Producer-facing AI assistant with user-provided API keys.

Core terms:

- Audio-native.
- Real-time.
- Project-aware.
- Agent-operable.
- Observable.
- Reversible.

## Engine Direction

The audio engine was identified as the product's credibility layer.

The user stated that audio engineering users will trust the product only if the audio engine, bounce, routing, mixing, plugin behavior, and session recall are reliable.

OpenStudio was considered useful as a reference for modern frontend and AI work, but Ardour was selected as the stronger starting point for engine credibility.

The accepted direction is:

> Use Ardour as the local engine/session foundation and build Reson's command bridge and agent runtime around it.

## Boundary Decision

The architecture should separate:

```text
Reson Engine
Reson Command Bridge
Reson Agent Runtime
Reson Studio UI
```

The engine is the trust boundary.

AI and UI should not directly mutate low-level engine state. They should emit structured commands through the command bridge.

## Autonomy Decision

The user selected a hybrid autonomy model:

- Default copilot mode for review/apply.
- Auto-apply for low-risk reversible operations.
- Approval required for destructive or high-risk operations.

## First Workflow

The first workflow is:

```text
Import Pack + Mapping + Prompt Arrange
```

The user imports audio/music/FX files plus mapping data. The prompt asks Reson to place them on the timeline at correct mm:ss or section-relative positions.

The MVP uses explicit markers/sections. Automatic song-section detection is deferred.

## Naming Discussion

Candidate names discussed:

- Reson
- Sonant
- Trace
- Axiom
- Nodal
- Motif
- Phase
- Loom

Reson was selected as working name because it combines:

- Resonance: sound and audio-native identity.
- Reasoning: agent planning and project understanding.

Collision checks were shallow and not a substitute for trademark clearance.

## Spec Review Outcomes

A subagent reviewed the initial architecture spec and identified several improvements:

- Clarify that legacy Ardour UI can mutate state during the spike, so command-log determinism applies only to command-bridge operations.
- Define rollback semantics: Ardour transaction if available, otherwise pre-command session snapshot restore.
- Add a Project Observation API.
- Add stale snapshot rejection.
- Add stable IDs instead of mutable names in commands.
- Add explicit section source of truth.
- Add generated/imported media custody rules.
- Add privacy/provider data-flow boundary.
- Add replay determinism tests.

These findings were integrated into the architecture spec.

## Current Repo State

Repo:

```text
/Users/garyhsieh/reson
```

Initial architecture spec:

```text
docs/superpowers/specs/2026-07-06-reson-architecture-design.md
```

Initial spec commit:

```text
23ee3ff docs: add Reson architecture design spec
```

