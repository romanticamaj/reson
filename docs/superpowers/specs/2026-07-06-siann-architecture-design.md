# SIANN Architecture Design

Date: 2026-07-06

## Product Definition

SIANN is a local, AI-native music production environment.

It is not a web DAW, prompt-to-song generator, or traditional DAW with a chat sidebar. SIANN is a native audio engine and project runtime designed from the start for both humans and agents to operate it.

Core traits:

- Audio-native
- Real-time
- Project-aware
- Agent-operable
- Observable
- Reversible

Current brand name:

> SIANN

## Product Thesis

The market gap is not "AI can generate audio." That is becoming common. The gap is a DAW/session runtime where an AI agent can inspect the project, plan production work, execute bounded changes, render previews, compare results, and roll back safely.

SIANN should feel closer to Codex, Claude Code, or Cursor for music production than to Suno or a browser loop generator.

The producer provides API keys for one or more AI providers. SIANN supplies the local DAW runtime, project graph, audio engine boundary, command bridge, and review/apply workflow.

## Architecture Options

### Option A: Fork Ardour Directly And Replace UI

Fork Ardour, rename the product, and immediately begin replacing or heavily modifying the existing GTK UI.

Pros:

- Starts from the most mature open-source DAW engine.
- Keeps audio, routing, plugin, automation, and bounce behavior close to Ardour.
- Clear GPL-compatible path.

Cons:

- High risk of getting trapped in UI complexity before proving agentic control.
- Ardour's UI and engine boundaries were not designed for AI-first command operation.
- Replacing UI too early may destabilize the audio/session path.

Verdict: not recommended as the first phase.

### Option B: Build A New JUCE DAW Inspired By Ardour

Use Ardour as a reference, but build a smaller new engine and UI from scratch or from OpenStudio-style architecture.

Pros:

- Maximum product control.
- Modern frontend bridge can be designed cleanly.
- Easier to make a small, AI-friendly command surface.

Cons:

- Audio engine maturity becomes the main risk.
- Serious DAW trust requires years of bounce, routing, plugin, automation, and session recall hardening.
- Competes against Ardour's strongest advantage instead of using it.

Verdict: useful as a fallback, not the primary strategy.

### Option C: Ardour-Derived Engine With A New Command Bridge

Fork Ardour, keep the engine and session path intact, and first build a structured command/control layer around it. Delay major UI redesign until commandability is proven.

Pros:

- Preserves Ardour-grade local audio credibility.
- Focuses the first milestone on the true product wedge: agent-operable session control.
- Allows multiple future UIs and AI runtimes to sit above the same command bridge.
- Lets SIANN validate audio operations through Ardour's existing render/session behavior.

Cons:

- Requires learning Ardour's session model and internal APIs.
- The first usable product may feel less visually distinct until the UI layer is redesigned.
- Some Ardour internals may need adapters before they are cleanly commandable.

Verdict: recommended.

## Recommended Direction

SIANN should begin as an Ardour-derived fork with a new command bridge and agent runtime.

Do not start by rewriting the DAW UI. First prove that SIANN can operate an Ardour session through structured, reversible commands while preserving the native audio engine path.

## Current Shipped State

As of 2026-07-07, the first commandability and import-pack workflow is implemented across two repositories:

- `siann-engine` (`/Users/garyhsieh/siann-engine`) is the Ardour-derived engine fork. It contains the C++ session utility runner `session_utils/siann_command.cc`, built as `ardour9-siann_command`.
- `siann` (`/Users/garyhsieh/siann`) contains the developer bridge and product workflow layer: `bin/siann.js`, `src/bridge/runner.js`, `src/workflows/`, `scripts/`, fixtures, tests, docs, and public README.

The current `siann` repo is no longer docs-only. It has production-shaped developer tooling for the first local workflow, but it does not yet include the future Studio UI or agent runtime.

Implemented bridge capabilities:

- Create/open Ardour sessions.
- Create audio tracks.
- Import audio into named tracks.
- Place regions at exact mm:ss-derived positions.
- Trim imported regions with `sourceStart` and `duration`.
- Save sessions.
- Render preview WAV files.
- Observe canonical session state.
- Emit command journals.
- Restore pre-batch snapshots for rollback.
- Enforce approval gates for reviewed plans.

Implemented user-data workflow:

```text
_DAW.zip
-> extracted _DAW/ and _SpliceSFX/ folders
-> multi-track import manifest
-> reviewable plan
-> approved plan
-> Ardour engine command batch
-> .ardour session + preview.wav + journal.json
```

The test pack flow creates one track per BGM bed and one track per SFX cue. `_DAW/placement.md` supplies in-point and duration values that become `sourceStart` and `duration`, so BGM regions are trimmed rather than always placing full source WAVs.

## System Boundary

```text
SIANN Studio UI
  - classic DAW views
  - AI task panel
  - plan/review/apply workflow
  - diffs, logs, previews, audition

SIANN Agent Runtime
  - model adapters
  - API key management
  - observe/plan/act loops
  - policy and risk levels
  - tool calling over command bridge

SIANN Command Bridge
  - typed command schema
  - state snapshots
  - validation
  - transactions
  - undo/rollback
  - render preview hooks
  - command/event logs

SIANN Engine
  - Ardour-derived audio/session core
  - tracks, regions, playlists
  - routing, buses, sends
  - plugin hosting
  - automation
  - recording
  - offline bounce/export
```

The audio engine is the trust boundary. UI and AI must not directly mutate engine internals.

During the first Ardour-derived spike, this boundary is aspirational for the final SIANN architecture and enforceable only for SIANN/agent commands. Ardour's legacy UI may remain visible for diagnostics, but any manual mutation through that UI is outside the command log and invalidates replay determinism for that session run.

Current code ownership follows this boundary:

- Engine mutations live in `siann-engine/session_utils/siann_command.cc`.
- Bridge orchestration lives in `siann/bin/siann.js` and `siann/src/bridge/runner.js`.
- Workflow-specific planning lives in `siann/src/workflows/`.
- Studio UI and agent runtime are not implemented yet.

## Core Rule

Agents do not edit the session directly.

Agents produce structured operation plans. The command bridge validates and applies those plans through explicit engine operations.

Example:

```json
{
  "op": "place_audio",
  "sourceMediaId": "media_riser_01",
  "trackId": "track_fx_risers",
  "start": "01:08.000",
  "gainDb": -7,
  "fadeInMs": 20,
  "fadeOutMs": 120
}
```

## Audio Engine Boundary

The engine owns:

- Playback timing
- Disk streaming
- Recording
- Track and bus routing
- Sends and inserts
- Plugin hosting
- Automation playback
- Session persistence
- Offline render and bounce
- Sample-rate and latency behavior

The engine must expose stable operations, but it should not know about prompts, model providers, chat history, or AI planning.

Engine operations must be deterministic where possible. Imported or generated media must be copied or referenced through a session media store with metadata: source path, content hash, provider/tool where relevant, prompt where relevant, generation parameters, seed if available, timestamp, and artifact hash. If an operation depends on media analysis or generation, the generated artifact and parameters must be stored so the session is reproducible.

## Command Bridge Boundary

The command bridge is the only mutation path for SIANN UI and AI. During the Ardour spike, legacy Ardour UI mutations are allowed only as diagnostic/manual actions and are not replayable command-bridge state.

Responsibilities:

- Accept typed commands.
- Validate inputs before mutation.
- Convert musical time, absolute time, and sample positions.
- Resolve project entities by stable IDs.
- Group related edits into transactions.
- Produce undo and rollback metadata.
- Emit command events for logs and UI.
- Support dry-run and preview mode.
- Refuse unsafe or ambiguous commands.

Rollback rule:

- Preferred: apply a command group as an atomic Ardour transaction if Ardour exposes a safe transaction boundary.
- Fallback: create a pre-command session snapshot before mutation and restore that snapshot on failure or rollback.
- Partial command failure must leave the session in its pre-command state or mark the session as dirty/non-deterministic and require explicit user recovery.
- Saved sessions are not treated as irreversible commits; rollback must restore from the pre-command snapshot if transaction undo is unavailable.
- Rendered files are external artifacts. Rollback removes or invalidates render artifacts created by the rolled-back transaction, but it must not delete user-imported source media.

Initial command groups:

- Session: create, open, save, duplicate, snapshot.
- Tracks: create, rename, color, arm, mute, solo, route.
- Media: import, relink, inspect, analyze.
- Regions: place, move, trim, split, duplicate, fade, gain.
- Markers: create, update, section labels.
- Mixer: set gain, pan, send level, plugin bypass.
- Render: render range, render stem, render preview.

Commands must be JSON-serializable so they can be emitted by UI, scripts, local tools, or cloud/local AI runtimes.

Commands target stable IDs, not mutable human names. Name-based resolution may exist as a dry-run helper, but ambiguity must produce an error and never silently choose a track, region, marker, or source file.

## Agent Runtime Boundary

The agent runtime owns reasoning, provider integration, tool calling, and task state.

Responsibilities:

- Store API provider configuration without leaking secrets into projects.
- Support provider adapters such as OpenAI, Anthropic, local models, and future specialized music agents.
- Request project state through observation tools.
- Generate operation plans.
- Classify risk before execution.
- Ask for confirmation when required.
- Call command bridge tools.
- Read command results and render previews.
- Iterate or roll back.

The agent runtime must not hold raw pointers or direct references to engine state.

## Privacy And Provider Boundary

Agents can expose sensitive project data: filenames, unreleased stems, lyrics, client names, prompt text, rough mixes, and arrangement metadata.

SIANN must make provider data flow explicit:

- Users configure API keys outside project files.
- Before a cloud provider receives project data, SIANN shows or logs the payload category being sent.
- Local-only mode blocks cloud model calls and permits only local model/runtime adapters.
- Agent observations should default to summaries and structured metadata, not raw audio upload.
- Any raw audio, stem, lyric, or full project export sent to a provider requires explicit user approval.
- Provider requests and responses are logged with timestamps, model/provider IDs, redacted secrets, and command transaction IDs.

## Autonomy Model

SIANN starts with a hybrid autonomy model.

Default mode: Copilot.

- AI proposes a plan.
- User reviews the plan.
- User applies or edits the plan.

Low-risk mode: Auto-apply allowed.

- Examples: create marker, rename track, organize imported files, place muted preview clips.
- Still logged and reversible.

High-risk mode: Approval required.

- Examples: destructive edits, plugin changes on existing mix buses, overwriting automation, deleting regions, committing generated audio over source material, exporting deliverables.

## UI Boundary

The UI is one client of the command bridge, not the owner of project truth.

The first UI can be simple. It should prioritize:

- Project/session browser.
- Import pack panel.
- Mapping table.
- AI task panel.
- Operation plan review.
- Apply/rollback controls.
- Timeline inspection sufficient to validate placement.

Long-term, SIANN Studio can become a full modern DAW UI, but early work should avoid rewriting Ardour's entire interface before command bridge viability is proven.

Ardour's existing GUI is C++/GTK/gtkmm with custom canvas components. It is useful for diagnostics and visual comparison, but it is not the intended long-term SIANN UI direction. The preferred next UI milestone is a local web frontend over the command bridge: import pack inspection, timeline blocks, plan review, approve/apply, preview playback, and rollback.

## First Product Workflow

MVP workflow: Import Pack + Mapping + Prompt Arrange.

Input:

- Audio files.
- FX files.
- Optional mapping file in JSON or CSV.
- Prompt from producer.

Example prompt:

> Put risers four seconds before each chorus, impacts on every drop, and ambience in the intro and outro. Keep FX below the vocal.

Flow:

1. Import media into session.
2. Parse mapping.
3. Observe explicit user-provided session markers/sections, tracks, tempo map, and current arrangement.
4. Build a candidate operation plan.
5. Validate missing files, time conflicts, track availability, and destructive risk.
6. Show plan for review.
7. Apply plan as a transaction.
8. Render preview if requested.
9. Allow rollback.

Current implemented subset:

- Generate an import-pack manifest from an extracted `_DAW/` and `_SpliceSFX/` test pack.
- Generate a reviewable plan from that manifest.
- Validate and approve the plan before apply.
- Apply the approved plan through the Ardour-derived engine.
- Render a preview.
- Validate the journal.
- Roll back by restoring the pre-batch snapshot.

## Mapping Format

Initial mapping should be simple and explicit.

Example:

```json
{
  "files": [
    {
      "path": "fx/riser_01.wav",
      "role": "riser",
      "target": "before_section",
      "sectionId": "section_chorus_01",
      "offset": "-00:04.000",
      "trackId": "track_fx_risers",
      "gainDb": -7
    },
    {
      "path": "fx/impact_01.wav",
      "role": "impact",
      "target": "section_start",
      "sectionId": "section_drop_01",
      "trackId": "track_fx_impacts",
      "gainDb": -5
    }
  ]
}
```

For the MVP, section knowledge must come from explicit user-provided markers, section labels, or mapping data. Automatic chorus/drop/verse detection is out of scope until the command bridge and observation API are stable.

## Project Observation API

The command bridge owns a read model over the engine for UI and agents.

Initial observation command:

```json
{
  "op": "observe_session",
  "schemaVersion": "siann.observe.v0",
  "include": ["tracks", "regions", "markers", "sections", "tempoMap", "media"]
}
```

Observation responses must include:

- Schema version.
- Snapshot/version token.
- Session ID.
- Entity list with stable SIANN IDs.
- Mapping from Ardour-native IDs or paths to SIANN IDs where available.
- Tempo map and time-signature map serialization.
- Marker and section definitions.
- Dirty/non-deterministic flag if legacy UI or non-command mutations occurred.

Mutation commands must include the snapshot/version token they were planned against. The bridge rejects stale commands unless the user or agent explicitly re-observes and replans.

## Project Graph

The command bridge and agent runtime should expose a semantic project graph over the engine.

Initial graph entities:

- Session
- Track
- Bus
- Region
- Source media
- Marker
- Section
- Plugin
- Automation lane
- Render target
- Agent action

Each entity needs:

- Stable ID
- Human-readable name
- Type
- Time range where relevant
- Parent/child relationships
- Readable summary for agents
- Full detailed state for deterministic tools

## Verification Strategy

SIANN must earn trust like a DAW, not like a chatbot.

Required test categories:

- Session command dry-run tests.
- Undo/rollback tests.
- Import and region placement tests.
- Time conversion tests for mm:ss, bars/beats, tempo maps, and sample positions.
- Offline render smoke tests.
- Bounce parity/null tests where applicable.
- Plugin chain state recall tests.
- Command log replay tests.
- Replay determinism tests: the same fixture session plus the same command log should produce the same project graph and, where feasible, the same render hash or null-test result.

AI quality tests are separate from engine correctness. A bad plan should not corrupt the session.

## First Technical Spike

The first spike should answer whether Ardour can serve as SIANN Engine.

Default spike decisions:

- Primary platform: macOS first, because the current development machine is macOS. Linux remains the expected easier build/reference platform if macOS blocks progress.
- UI posture: keep Ardour's existing UI visible during the spike. Do not redesign UI yet.
- Bridge shape: start with a local JSON command runner. Prefer the lowest-risk path that reaches Ardour session operations, whether in-process or through existing scripting/control surfaces. Do not commit to a permanent IPC protocol until commandability is proven.
- Session format: keep Ardour session compatibility during the spike. Do not rename or fork the session format until SIANN-specific metadata is required.
- AI involvement: no live AI in the first spike. Use static JSON commands to prove the command bridge before adding model variability.

Bridge decision ladder:

1. Test Ardour Lua/session APIs for import, track creation, region placement, save, and render.
2. Reject OSC for structural edits unless research proves it supports the required session mutations safely.
3. If Lua is insufficient, prototype an in-process C++ command runner.
4. Timebox bridge research to one short spike. The output must state chosen path, rejected alternatives, and why.

Tasks:

1. Fork Ardour under the SIANN working name.
2. Build on the primary development platform.
3. Identify APIs for session open/save.
4. Identify APIs for importing audio.
5. Identify APIs for creating tracks.
6. Identify APIs for placing regions at exact timestamps.
7. Identify APIs for offline render.
8. Implement or prototype a minimal command bridge surface for those actions.
9. Drive the bridge with static JSON, no AI required.
10. Verify a rendered result.

Success criteria:

- A JSON command file can create/open a session, import audio, place it at mm:ss positions, save, and render.
- The operation uses atomic transaction undo if available, or pre-command session snapshot restore if not.
- The render path remains Ardour-derived.
- The spike produces one fixture session, one command log, one rendered artifact, and one replay result.

Required outputs:

- `docs/research/ardour-commandability-map.md`
- Minimal command schema v0
- Minimal observation schema v0
- Rollback mechanism decision
- Bridge approach decision with rejected alternatives
- Fixture session, command log, and rendered artifact path

## Non-Goals For The First Spike

- Full UI redesign.
- Full chat assistant.
- Cloud collaboration.
- Prompt-to-song generation.
- Full mixing automation.
- Plugin recommendation agents.
- Replacing Ardour's DSP or render path.

## Resolved Follow-Up

These questions were deferred to, and are now answered by, the Ardour commandability research spike in `docs/research/ardour-commandability-map.md`:

- Which Ardour internal API is safest for session mutations.
- Whether existing Lua or OSC paths are sufficient for early command execution.
- Whether a new in-process command service is needed.
- How SIANN-specific metadata should be stored without breaking Ardour session compatibility.
- How to separate AI-generated code policy from upstream Ardour contribution policy if upstream contributions are later desired.

## Completed Immediate Next Step

The Ardour commandability research spike is complete. Keep UI and live AI work behind the proven command bridge.

The output document is:

```text
docs/research/ardour-commandability-map.md
```
