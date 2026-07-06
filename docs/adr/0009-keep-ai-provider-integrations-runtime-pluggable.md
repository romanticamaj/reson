# ADR-0009: Keep AI Provider Integrations Runtime-Pluggable

Date: 2026-07-06

Status: Accepted

## Context

The product should allow producers to provide API keys and use different AI providers. The system should support OpenAI, Anthropic, local models, and future specialized music agents without binding the engine to any provider.

## Decision

Keep AI integrations inside Reson Agent Runtime.

The runtime owns:

- Provider adapters.
- API key configuration.
- Tool calling.
- Observe/plan/act loops.
- Risk policy.
- Task state.

The engine and command bridge must remain provider-agnostic.

## Consequences

API keys are configured outside project files.

Provider swapping should not require audio engine changes.

The first spike uses static JSON and no live AI to avoid model variability while proving the command bridge.

