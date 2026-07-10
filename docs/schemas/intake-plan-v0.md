# Intake Plan v0

`siann.intake_plan.v0` is the boundary between nondeterministic AI intake and
deterministic audio execution.

The AI or heuristic planner may inspect loose files, naming patterns, context
documents, placement sheets, and user instructions. Its job is to produce a
reviewable SIANN manifest plus assumptions and uncertainty. It must not mutate
the audio engine directly.

Once a valid `siann.import_pack.v0` manifest exists, execution moves to the
command bridge and engine, where validation, rendering, DAWproject export,
journaling, and rollback are deterministic.

## Shape

```json
{
  "schemaVersion": "siann.intake_plan.v0",
  "source": {
    "root": "/tmp/source",
    "contextFile": "/tmp/source/notes.md",
    "fileCount": 14,
    "audioFileCount": 13
  },
  "planner": {
    "kind": "heuristic",
    "strategy": "daw_zip_heuristic",
    "confidence": 0.86
  },
  "assumptions": [],
  "needsReview": [],
  "evidence": [],
  "manifest": {
    "schemaVersion": "siann.import_pack.v0"
  }
}
```

## Planner Responsibilities

- Discover audio files and context documents.
- Infer track grouping, region names, starts, source in-points, and durations.
- Produce `siann.import_pack.v0` only when the mapping is structurally valid.
- Record assumptions and evidence for review.
- Add `needsReview` items when confidence is low or user intent is ambiguous.

## Deterministic Boundary

The command bridge accepts structured manifests and commands, not arbitrary
natural language. AI output must cross the boundary as JSON:

```text
raw files + context
-> AI/heuristic intake planner
-> siann.intake_plan.v0
-> reviewed siann.import_pack.v0
-> command bridge / engine / exporters
```

## Current v0 Strategies

| Strategy | Status | Notes |
| --- | --- | --- |
| `daw_zip_heuristic` | implemented | Detects `_DAW/`, `_SpliceSFX/`, filename timecodes, and `_DAW/placement.md`. |
| `unsupported_freeform` | implemented | Produces a review-blocked plan when deterministic heuristics cannot infer a manifest. |
| `llm_intake_planner` | planned | Future model-backed planner for loose audio files and non-fixed context. |

## Review Rules

- `needsReview` with severity `high` blocks deterministic execution.
- `confidence` is advisory; validation still decides whether the manifest can
  enter the bridge.
- Missing durations are acceptable for SFX and short clips when WAV headers can
  provide length later.
- AI-generated names and placements should be treated as proposed mappings until
  reviewed or validated by tests.

