# ADR-0015: Use DAWproject Export As An Engine-Independent First Slice

Date: 2026-07-11

Status: Accepted

## Context

SIANN is still designed to become a local AI-native DAW with a headless engine
runtime. Earlier decisions focused on proving commandability through an
Ardour-derived engine and using that runtime as the trust boundary for live
session mutation, preview rendering, rollback, and future UI control.

During Cubase validation, we found that the first useful product workflow does
not require an audio engine at all. An agent can inspect audio files and
placement notes, create a SIANN import-pack manifest, and export a
Cubase-compatible `.dawproject` package. Cubase then provides the visual and
playback verification.

This creates a viable product slice before the engine build is stable on every
target platform, especially Windows.

## Decision

Treat **Agent Intake -> Manifest -> DAWproject Export** as SIANN's first
engine-independent product slice.

This slice can run from the `siann` repository alone:

- Load the `siann-intake` skill.
- Inspect audio files, cue sheets, placement notes, and producer instructions.
- Infer or generate a `siann.import_pack.v0` manifest.
- Export a DAWproject package with copied WAV media and timeline placement.
- Validate the result in Cubase or another DAWproject-compatible host.

The headless SIANN engine remains the target runtime for live session control,
preview rendering, rollback, observation, and future Studio UI integration.

## Consequences

Windows onboarding should start with the Node-only DAWproject path instead of
native engine compilation. Engine build and runtime support remain a separate
milestone.

The first externally useful SIANN experience can be described as an
AI-operable DAW session generator: producers provide audio and intent, SIANN
generates a structured project that can be opened in a production DAW.

This does not replace ADR-0014. It changes sequencing:

```text
Phase 1: Agent -> Manifest -> DAWproject
Phase 2: Agent -> Command Bridge -> Headless Engine Runtime
Phase 3: SIANN Studio UI + Engine Runtime
```

The command bridge and engine must still converge on the same manifest,
placement, stable-ID, and rollback concepts so Phase 1 output can evolve into
Phase 2 live control without changing the user-facing workflow.
