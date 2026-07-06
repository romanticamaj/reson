# ADR-0005: Use Hybrid Copilot And Agent Autonomy

Date: 2026-07-06

Status: Accepted

## Context

The product needs to support both safe reviewed workflows and stronger agentic workflows. A pure copilot would be safe but limited. A fully autonomous agent would be powerful but too risky for DAW sessions.

## Decision

Use a hybrid autonomy model:

- Default: Copilot. AI proposes a plan, the user reviews it, then applies or edits it.
- Low-risk: Auto-apply may be allowed for reversible, bounded operations.
- High-risk: Approval required for destructive edits, mix-bus/plugin changes, automation overwrite, deleting regions, committing generated audio over source material, and exports.

## Consequences

The command bridge must classify command risk and support review/apply workflows.

The product can feel useful early without giving the agent unsafe default authority.

