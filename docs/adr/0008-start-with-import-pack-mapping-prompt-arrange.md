# ADR-0008: Start With Import Pack Mapping Prompt Arrange

Date: 2026-07-06

Status: Accepted

## Context

The starter workflow should prove that Reson is an AI-operable project runtime, not just an audio generator.

The user's initial requirement is to import music/FX files plus a mapping of where they should appear in mm:ss time, then prompt the DAW to locate and place them properly.

## Decision

Use **Import Pack + Mapping + Prompt Arrange** as the first product workflow.

Inputs:

- Audio files.
- FX files.
- Optional JSON/CSV mapping.
- Producer prompt.
- Explicit user-provided markers/sections.

For MVP, section knowledge must come from explicit user markers, section labels, or mapping data. Automatic chorus/drop/verse detection is out of scope until the command bridge and observation API are stable.

## Consequences

The MVP validates media import, timeline placement, stable IDs, section references, review/apply, rollback, and optional render preview.

The workflow stays concrete and avoids premature broad AI mixing/generation scope.

