# Reson Docs

This directory contains product, architecture, and decision records for Reson.

Key documents:

- [Architecture spec](superpowers/specs/2026-07-06-reson-architecture-design.md)
- [ADR index](adr/0000-adr-index.md)
- [Initial product and architecture discussion](discussions/2026-07-06-product-architecture-discussion.md)

## Current Direction

Reson is a local AI-native music production environment:

```text
Ardour-derived audio engine
+ command bridge
+ pluggable AI runtime
+ AI-friendly studio UI
```

The first milestone is not a UI rewrite. It is an Ardour commandability spike that proves static JSON commands can create/open a session, import audio, place clips at exact times, save, render, and replay deterministically where feasible.

