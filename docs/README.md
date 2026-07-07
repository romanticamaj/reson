# SIANN Docs

This directory contains product, architecture, and decision records for SIANN.

Key documents:

- [Architecture spec](superpowers/specs/2026-07-06-siann-architecture-design.md)
- [ADR index](adr/0000-adr-index.md)
- [Initial product and architecture discussion](discussions/2026-07-06-product-architecture-discussion.md)
- [Internal schemas](schemas/README.md)

## Current Direction

SIANN is a local AI-native music production environment:

```text
Ardour-derived audio engine
+ command bridge
+ pluggable AI runtime
+ AI-friendly studio UI
```

The first milestone is not a UI rewrite. It is an Ardour commandability spike that proves static JSON commands can create/open a session, import audio, place clips at exact times, save, render, and replay deterministically where feasible.

## Current Implementation Status

SIANN now has two active codebases:

- `/Users/garyhsieh/siann-engine` is the Ardour-derived engine fork. It contains the C++ `session_utils/siann_command.cc` runner that directly opens and mutates Ardour sessions.
- `/Users/garyhsieh/siann` is the product, docs, and developer bridge repo. It now contains a Node CLI wrapper, workflow generators, approval-gated plan files, example fixtures, and tests. It is not docs-only anymore, but it does not yet contain the future Studio UI or AI runtime.

Current shipped workflow:

```text
extracted DAW test pack
-> multi-track manifest
-> reviewable import plan
-> explicit approval gate
-> engine command batch
-> Ardour session mutation
-> preview render
-> journaled rollback
```

The real-user DAW pack workflow supports:

- `_DAW/` BGM assets.
- `_DAW/placement.md` in-point and duration parsing.
- `_SpliceSFX/` sound effects.
- One track per BGM bed or SFX cue.
- `sourceStart` and `duration` trim metadata.
- Rendered preview WAV output.
- Ardour session output for visual inspection.

The next product layer should be a local web-based Studio UI over this bridge, not a rewrite of Ardour's GTK UI.
