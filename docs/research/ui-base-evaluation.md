# UI Base Evaluation

SIANN Studio should be a replaceable UI shell over the command bridge and
headless engine runtime. The goal is not to clone Ardour's GTK UI; Ardour
remains the compatibility and feature reference while SIANN builds an
AI-operable workflow around observed state, plans, previews, and rollback.

## Evaluation Criteria

- Timeline and mixer interaction quality.
- AI-friendly architecture: state in, command out, minimal hidden mutation.
- Web or embeddable UI feasibility.
- Licensing compatibility with GPL-2.0-or-later engine work.
- Ability to reuse ideas without inheriting unwanted engine assumptions.

## Candidates

| Candidate | Fit | Notes |
| --- | --- | --- |
| openDAW | Strong UI reference, possible web shell research base. | Browser DAW, modern TypeScript ecosystem, AGPL-3/commercial licensing considerations. Evaluate as UI architecture reference before any fork. |
| Zrythm | Strong DAW workflow reference. | Featureful native DAW with automation and editing depth. Useful for workflow study; direct reuse needs licensing and architecture review. |
| LMMS | Useful production-pattern reference. | Mature Qt DAW with song editor, mixer, piano roll, and beat workflows. Less aligned with SIANN's audio-session editing target. |
| Ardour | Compatibility and feature reference. | GPL engine ancestry and mature multitrack workflow. UI stack is not the intended SIANN Studio base. |

## Current Recommendation

Do not commit to a UI fork yet. Build the first Studio UI as a thin local web
shell that consumes `session.observe`, displays tracks and regions, and sends
commands through the same runtime protocol used by the CLI.

The first UI spike should support:

1. Open or create a SIANN-owned session through the bridge.
2. Render the observed track and region timeline.
3. Import an audio pack.
4. Move or trim one region through a command.
5. Render preview and expose rollback.

After that spike, evaluate whether openDAW can be reused directly, studied as a
reference, or avoided because licensing and engine assumptions would slow SIANN
down.

