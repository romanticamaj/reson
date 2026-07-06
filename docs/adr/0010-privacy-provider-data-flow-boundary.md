# ADR-0010: Treat Privacy And Provider Data Flow As A First-Class Boundary

Date: 2026-07-06

Status: Accepted

## Context

AI agents observing a DAW session can expose filenames, unreleased stems, lyrics, rough mixes, client names, and project structure. Cloud providers may be useful, but data flow must be visible and controllable.

## Decision

Make privacy and provider data flow a first-class boundary.

Rules:

- Store API keys outside project files.
- Show or log the payload category before cloud provider calls.
- Support local-only mode that blocks cloud model calls.
- Default observations to summaries and structured metadata, not raw audio upload.
- Require explicit approval before sending raw audio, stems, lyrics, or full project exports to providers.
- Log provider requests and responses with timestamps, model/provider IDs, redacted secrets, and command transaction IDs.

## Consequences

Provider integration must be auditable from the start.

Privacy is not a later enterprise feature; it is part of product trust for producers and clients.

