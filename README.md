# Reson

**AI-native digital audio workstation for producers, musicians, and creative teams.**

Reson is a local music production environment designed for the next generation of human and AI collaboration. It gives producers a studio workspace where an AI assistant can understand the session, suggest arrangement edits, place audio, prepare transitions, render previews, and roll changes back safely.

Unlike prompt-to-song tools, Reson is built for working inside real production sessions. It is designed for producers who already have stems, loops, FX, markers, arrangement ideas, and taste, and want an intelligent copilot that can help organize and execute detailed production work.

```text
Import assets. Describe the goal. Review the plan. Preview the result. Stay in control.
```

## Why Reson

Modern music production is filled with repetitive editing: aligning FX, placing impacts, building transitions, organizing imported assets, naming tracks, preparing alternates, and checking versions. Reson is designed to make that work faster without turning the producer into a passenger.

With Reson, an assistant can help with tasks like:

- Arranging risers, impacts, sweeps, ambience, and transition FX.
- Turning a folder of audio assets into an organized session.
- Placing sounds against markers, drops, choruses, or timecodes.
- Preparing preview renders for fast comparison.
- Suggesting structured edits before anything is applied.
- Keeping creative decisions reviewable and reversible.

Reson is closer to **Cursor for music production** than a one-shot AI song generator.

## Key Capabilities

- **AI-assisted arrangement:** describe production goals in plain language and review proposed timeline edits.
- **Session-aware workflows:** work from tracks, sections, markers, timecodes, media, and arrangement context.
- **Local-first production:** keep the music workspace centered on a native local studio experience.
- **Review before apply:** inspect planned changes before they affect the session.
- **Preview and compare:** render candidate results and decide what belongs in the project.
- **Rollback-friendly editing:** preserve producer control while experimenting quickly.
- **Flexible AI providers:** support cloud and local AI models without locking the product to one provider.
- **Privacy-conscious design:** keep sensitive music, lyrics, stems, and client material under explicit user control.

## Example Workflow

Imagine importing a folder of FX and giving Reson this instruction:

```text
Put risers four seconds before each chorus, impacts on every drop,
and ambience in the intro and outro. Keep FX below the vocal.
```

Reson can turn that request into a reviewable production plan:

1. Read the available assets and session structure.
2. Match files to the intended musical roles.
3. Propose placements against sections, markers, or timecodes.
4. Flag missing files, conflicts, or risky edits.
5. Render a preview.
6. Apply or roll back the result.

The goal is not to replace producer judgment. The goal is to make detailed session work faster, clearer, and easier to audition.

## Built For

- Music producers arranging songs, cues, drops, and transitions.
- Film, trailer, and game audio teams managing large asset packs.
- Remixers and editors working from stems and reference structures.
- Developers building AI-native music production tools.
- Artists who want AI assistance without giving up local session control.

## Product Principles

- **Producer control first:** AI should propose, explain, preview, and apply only within clear boundaries.
- **Real sessions, not disposable generations:** Reson is designed for iterative production work.
- **Audition everything:** creative changes should be easy to hear before committing.
- **Reversible by default:** experimentation should not make sessions fragile.
- **Privacy by design:** provider data flow must be visible and intentional.
- **Extensible for developers:** the system should support new tools, providers, and production workflows over time.

## Developer Access

This repository contains the public project materials, contributor guidance, and the first developer bridge for exploring Reson command workflows.

```sh
git clone <repo-url>
cd reson
npm test
node bin/reson-bridge.js run examples/bridge/create-session.command.json --json
node scripts/create-demo-audio.js /tmp/reson-import-pack-demo/audio
node bin/reson-bridge.js workflow import-pack examples/import-pack/manifest.json --plan /tmp/reson-import-pack-demo/plan.json --json
node bin/reson-bridge.js workflow validate-plan /tmp/reson-import-pack-demo/plan.json --json
node bin/reson-bridge.js workflow approve-plan /tmp/reson-import-pack-demo/plan.json --out /tmp/reson-import-pack-demo/approved-plan.json --approved-by "$USER" --json
node bin/reson-bridge.js workflow apply-plan /tmp/reson-import-pack-demo/approved-plan.json --out /tmp/reson-import-pack-demo/import-pack.command.json --run --json
node bin/reson-bridge.js rollback /tmp/reson-import-pack-demo/journal.json --source-command /tmp/reson-import-pack-demo/import-pack.command.json --out /tmp/reson-import-pack-demo/rollback.command.json --run --json
```

For extracted DAW test packs that follow the `_DAW/` and `_SpliceSFX/` layout,
generate a multi-track manifest first. If `_DAW/placement.md` includes in-point
and length values, they are carried into the plan as `sourceStart` and
`duration` so BGM regions are trimmed during import:

```sh
node scripts/create-daw-manifest.js /tmp/reson-user-daw-source \
  --out /tmp/reson-user-daw-multitrack-demo/manifest.json \
  --session-dir /tmp/reson-user-daw-multitrack-demo/Session \
  --preview /tmp/reson-user-daw-multitrack-demo/preview.wav \
  --journal /tmp/reson-user-daw-multitrack-demo/journal.json \
  --json
```

The bridge CLI expects a local Reson engine checkout next to this repository at `../reson-engine`. Set `RESON_ENGINE_DIR=/path/to/reson-engine` if your checkout lives elsewhere.

For contributor-specific architecture notes, implementation boundaries, and internal documentation links, see [AGENTS.md](AGENTS.md).

## Keywords

AI DAW, AI music production, digital audio workstation, music production copilot, local DAW, agentic music software, AI-assisted arrangement, audio production workflow, prompt-based arrangement, music AI tools.
