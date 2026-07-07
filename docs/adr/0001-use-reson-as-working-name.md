# ADR-0001: Use Reson As Working Name

Date: 2026-07-06

Status: Superseded by [ADR-0013: Rename Project To SIANN](0013-rename-project-to-siann.md)

## Context

The project needs a name before creating a repo and writing architecture documents. The product is not simply "AI DAW"; it is a local audio-native project runtime that combines resonance with reasoning.

Names discussed included Reson, Sonant, Trace, Axiom, Nodal, Motif, Phase, and Loom.

Early collision checks found:

- Sonant has stronger audio/app collisions.
- Trace has a pro-audio brand collision through Trace Audio.
- Auralis, AriaForge, Conductor, DAWPilot, and AudioPilot all have meaningful collisions or confusing adjacent usage.
- Reson has weak overlaps, including acoustic/audio-related uses, but no obvious strong collision in the AI-native DAW/product-runtime space.

## Decision

Use **Reson** as the working name and repo name.

Use these provisional component names:

- Reson Engine
- Reson Command Bridge
- Reson Runtime
- Reson Agent
- Reson Studio

## Consequences

The repo is located at:

```text
/Users/garyhsieh/reson
```

Reson remains a working name, not a cleared trademark. A deeper trademark, domain, GitHub, package, and app-store collision check is required before public launch.
