# ADR-0006: Make The Command Bridge The Agent Mutation Boundary

Date: 2026-07-06

Status: Accepted

## Context

AI should not directly mutate low-level audio/session state. Direct mutation would make undo, audit, replay, validation, and trust difficult.

The first spec review also identified a conflict: during an Ardour-derived spike, legacy Ardour UI can still mutate state. Therefore the command bridge can only be the mutation boundary for Reson/agent commands until the UI is replaced or constrained.

## Decision

Agents produce structured operation plans. The command bridge validates and applies those plans through explicit engine operations.

Commands target stable IDs rather than mutable names. Name resolution may exist only as a dry-run helper that reports ambiguity.

Mutation commands must include the observation snapshot/version token they were planned against. Stale commands are rejected unless the agent or user re-observes and replans.

During the spike, legacy Ardour UI mutations are allowed only as diagnostic/manual actions and invalidate replay determinism for that run.

## Consequences

The bridge needs typed command schemas, observation schemas, validation, transaction handling, rollback, event logs, and replay tests.

This is the main difference between Reson and a chat assistant bolted onto a DAW.

