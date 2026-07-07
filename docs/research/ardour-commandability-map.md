# Ardour Commandability Map

Date: 2026-07-06

## Purpose

This document tracks the first Reson engine spike: prove whether an Ardour-derived engine can be operated through structured, reversible commands before any UI redesign or live AI integration.

## Repository Setup

- Reson product/docs repo: `https://github.com/romanticamaj/reson`
- Ardour engine fork: `https://github.com/romanticamaj/ardour`
- Local engine checkout: `/Users/garyhsieh/reson-engine`
- Engine `origin`: `https://github.com/romanticamaj/ardour.git`
- Engine `upstream`: `https://github.com/Ardour/ardour.git`
- Checked Ardour revision: `1ec8feeec75247daa70b1fb39ef29a19c5a4ce9d`
- `git describe`: `9.7-121-g1ec8feeec7`

Keep Ardour source out of this repository. Use this repo for product docs, ADRs, command schemas, research notes, and Reson-specific contributor guidance.

## Build Discovery

Initial configure attempt:

```sh
cd /Users/garyhsieh/reson-engine
./waf configure --with-backends=coreaudio,dummy --no-phone-home --no-nls
```

Result:

- C compiler found: `/usr/bin/clang`
- C++ compiler found: `/usr/bin/clang++`
- First configure stopped at missing Boost headers.
- Failure from `build/config.log`: `boost/version.hpp` not found.
- Ardour requires Boost `>= 1.68`.

First dependency blocker:

```text
Checking for boost library >= 1.68 : no
fatal error: 'boost/version.hpp' file not found
```

Boost was already installed by Homebrew, but configure did not find it until `/opt/homebrew/include` was passed explicitly.

Successful configure command:

```sh
PKG_CONFIG_PATH=/opt/homebrew/opt/pangomm@2.46/lib/pkgconfig:/opt/homebrew/opt/cairomm@1.14/lib/pkgconfig:/opt/homebrew/opt/libarchive/lib/pkgconfig:/opt/homebrew/opt/glibmm@2.66/lib/pkgconfig:/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig \
CPPFLAGS="-I/opt/homebrew/opt/libarchive/include -I/opt/homebrew/include -I/opt/homebrew/opt/glibmm@2.66/include -I/opt/homebrew/opt/cairomm@1.14/include -I/opt/homebrew/opt/pangomm@2.46/include" \
LDFLAGS="-L/opt/homebrew/opt/libarchive/lib -L/opt/homebrew/lib -L/opt/homebrew/opt/cairomm@1.14/lib -L/opt/homebrew/opt/pangomm@2.46/lib" \
./waf configure \
  --with-backends=coreaudio,dummy \
  --no-phone-home \
  --no-nls \
  --no-lrdf \
  --boost-include=/opt/homebrew/include \
  --also-libdir=/opt/homebrew/lib,/opt/homebrew/opt/libarchive/lib,/opt/homebrew/opt/cairomm@1.14/lib,/opt/homebrew/opt/pangomm@2.46/lib \
  --also-include=/opt/homebrew/include,/opt/homebrew/opt/glibmm@2.66/include,/opt/homebrew/opt/libarchive/include,/opt/homebrew/opt/cairomm@1.14/include,/opt/homebrew/opt/pangomm@2.46/include
```

Configure result:

- `CoreAudio`: enabled.
- `Dummy backend`: enabled.
- `build session-utils`: enabled.
- `Lua Commandline Tool`: enabled.
- `LV2 support`: enabled.
- `LRDF`: disabled with `--no-lrdf` because Homebrew does not provide a `liblrdf` formula.

Installed or upgraded Homebrew dependencies during discovery:

- `glibmm@2.66`
- `libarchive`
- `liblo`
- `taglib`
- `vamp-plugin-sdk`
- `fftw`
- `libusb`
- `aubio`
- `cairomm@1.14`
- `pangomm@2.46`
- `lv2`
- `lilv`
- `cppunit`
- `libwebsockets`

Homebrew also upgraded several dependent packages while satisfying these installs. It repeatedly warned that taps `facebook/fb` and `sidneys/homebrew` are untrusted and ignored.

The `dummy` backend matters because Ardour session utilities use it for non-interactive session operations.

## Build Baseline

Successful minimal build:

```sh
./waf build --targets=ardour9-new_empty_session
./waf build --targets=ardev_common_waf.sh
./waf build --targets=dummy_audiobackend
./waf build --targets=libardour_pan1in2out,libardour_pan2in2out,libardour_panbalance,libardour_panvbap,a-comp,a-delay,a-eq,a-fluidsynth,a-reverb,reasonablesynth
```

Built targets of interest:

- `build/session_utils/ardour9-new_empty_session`
- `build/session_utils/ardour9-reson_command`
- `build/libs/backends/dummy/libdummy_audiobackend.dylib`
- `build/gtk2_ardour/ardev_common_waf.sh`
- Panner dylibs under `build/libs/panners/`
- Built-in LV2 dylibs under `build/libs/LV2/`

Verified help command:

```sh
cd /Users/garyhsieh/reson-engine/session_utils
./run ardour9-new_empty_session --help
```

Verified non-interactive empty session creation:

```sh
rm -rf /tmp/reson-engine-spike
mkdir -p /tmp/reson-engine-spike
cd /Users/garyhsieh/reson-engine/session_utils
./run ardour9-new_empty_session -s 48000 /tmp/reson-engine-spike/EmptySession EmptySession
```

Output included:

```text
Created session in '/tmp/reson-engine-spike/EmptySession'
```

Generated session file:

```text
/tmp/reson-engine-spike/EmptySession/EmptySession.ardour
```

Known runtime warnings:

- Built-in LV2 bundle `.dylib` files exist, but TTL manifests are still missing under `build/libs/LV2/*.lv2/manifest.ttl`.
- A local `SpectraLayers.vst3` plugin produced a warning during plugin scan.
- These warnings did not block empty session creation.

## Reson Command Runner

Engine fork commit:

```text
a4aeb7e882 session-utils: add reson command runner
a4f30920f4 session-utils: import audio in reson command
63b63919ff session-utils: render audio in reson command
2ccd95592e session-utils: place audio regions in reson command
1584772143 session-utils: observe audio project graph
99e9de08c9 session-utils: emit reson command journal
27f310db87 session-utils: restore reson command snapshots
1ec8feeec7 session-utils: journal failed reson batches
93a2c72347 session-utils: prune reson snapshots
23f2fc8830 session-utils: enforce reson batch risk
a982bd43e9 session-utils: canonicalize reson observations
f4d3404724 session-utils: trim imported audio regions
```

New utility:

```text
session_utils/reson_command.cc
```

Build command:

```sh
./waf build --targets=ardour9-reson_command
```

Run command:

```sh
cd /Users/garyhsieh/reson-engine
TOP=/Users/garyhsieh/reson-engine
. build/gtk2_ardour/ardev_common_waf.sh
build/session_utils/ardour9-reson_command /tmp/reson-command-spike/create-session.json
```

Supported operations:

- `create_session`
- `open_session`
- `create_audio_track`
- `import_audio`
- `place_audio`
- `render`
- `save_session`
- `observe_session`
- `restore_batch_snapshot`

Current `import_audio` fields:

- `path`: source WAV or audio file path.
- `trackId` or `trackName`: target audio track.
- `regionName`: optional requested region name.
- `start`: timeline placement position.
- `sourceStart`: optional source in-point for trimmed imports.
- `duration`: optional imported region duration.
- `createTrack`: optional track creation fallback.

Verified command file:

```json
{
  "schemaVersion": "reson.command.v0",
  "commands": [
    {
      "op": "create_session",
      "sessionDir": "/tmp/reson-command-spike/CommandSession",
      "sessionName": "CommandSession",
      "sampleRate": 48000
    },
    {
      "op": "create_audio_track",
      "name": "FX Risers",
      "inputChannels": 1,
      "outputChannels": 2,
      "count": 2
    },
    {
      "op": "save_session"
    },
    {
      "op": "observe_session"
    }
  ]
}
```

Observed result:

```json
{
  "schemaVersion": "reson.result.v0",
  "results": [
    {
      "op": "create_session",
      "ok": true
    },
    {
      "op": "create_audio_track",
      "ok": true,
      "count": 2
    },
    {
      "op": "save_session",
      "ok": true
    },
    {
      "op": "observe_session",
      "ok": true
    }
  ]
}
```

Verification:

- Created `/tmp/reson-command-spike/CommandSession/CommandSession.ardour`.
- Reopened the session with `open_session`.
- `observe_session` returned `FX Risers 1` and `FX Risers 2`.
- `rg "FX Risers" /tmp/reson-command-spike/CommandSession/CommandSession.ardour` confirmed the tracks were persisted.

Audio import verification:

- Fixture: `/Users/garyhsieh/reson-engine/share/media/click-120bpm.flac`.
- Command: `import_audio` with `trackName: "Imported Click"`, `createTrack: true`, `start: "00:01.000"`, and `regionName: "Click Loop"`.
- Result JSON returned `sourceCount: 1`, `trackName: "Imported Click"`, `regionName: "Click Loop"`, and `start: 48000`.
- Session XML persisted `click-120bpm.wav`, the `Imported Click` audio route, and the `Click Loop` playlist region.
- Negative validation: `start: "abc"` exits non-zero with `Error: invalid time position: abc`.

Trim import verification:

- `import_audio` now supports `sourceStart` and `duration`.
- The command runner maps `sourceStart` to the region's source offset and `duration` to region length.
- Verified with `/Users/garyhsieh/Downloads/_DAW.zip` extracted under `/tmp/reson-user-daw-source`.
- Generated `/tmp/reson-user-daw-trim-demo/Session/UserDawPlacementDemo.ardour`.
- Rendered `/tmp/reson-user-daw-trim-demo/preview.wav`.
- Observed BGM region lengths matched `_DAW/placement.md`: `52`, `109`, `35`, `69`, `50`, and `55` seconds.

Render verification:

- Command: `render` with `outputPath: "/tmp/reson-command-render-spike/out/render.wav"`, `bitDepth: "16"`, and `sampleRate: 48000`.
- Result JSON returned `ok: true` and the normalized `.wav` output path.
- Output file: 16-bit stereo 48000 Hz WAV, approximately 375 KB.
- SHA-256: `0b4f64cbfd80f16247972f4bf3f5960635dc653d88054550ba3b47f0847ed4ae`.
- Replaying the same command log into a second session produced the same SHA-256 and `cmp_rc=0`.
- Headless sessions created by this runner can lack a master bus, so `render` exports master outputs when available and otherwise falls back to audio track output ports.

Placement verification:

- Command: `place_audio` accepts `regionId` or `regionName`, a required `start`, and optional `trackId` or `trackName`.
- Same-track test: imported `Click Loop` at `00:01.000`, placed it at `00:02.500`, saved, reopened, and rendered successfully.
- Same-track result JSON returned `start: 120000`; session XML persisted the playlist region at `a705600000`.
- Cross-track test: imported `Moved Click` into `Source Track`, placed it onto `Target Track` at `00:03.000`, saved, reopened, and rendered successfully.
- Cross-track result JSON returned `trackName: "Target Track"` and `start: 144000`; session XML showed the region under `Target Track.1` and an empty `Source Track.1` playlist.

Observation graph verification:

- `observe_session` now emits audio track playlists, regions, region timing, layer, lock, mute, source counts, and source metadata.
- Source metadata uses deterministic `fileName` instead of absolute source paths so independent replay folders can be compared directly.
- Two independent command-log replays to `/tmp/reson-command-graph-a` and `/tmp/reson-command-graph-b` produced identical observation JSON with `graph_cmp_rc=0`.
- Both graph replay renders also matched SHA-256 `0b4f64cbfd80f16247972f4bf3f5960635dc653d88054550ba3b47f0847ed4ae`.

Command journal verification:

- Root `journalPath` in a command file now asks `ardour9-reson_command` to write a `reson.command_journal.v0` file after a successful batch.
- Verified basic create-track journal output with three entries: `create_session`, `create_audio_track`, and `save_session`.
- Verified import/place journal output with five entries: `create_session`, `create_audio_track`, `import_audio`, `place_audio`, and `save_session`.
- Journal entries include pre/post observation hashes when a session exists, touched stable engine IDs for track/playlist/region/source operations, and `restore_batch_snapshot` rollback metadata.
- Snapshot files are gzip-compressed tar archives with SHA-256 recorded in the journal.
- Restore verification: created a session, captured a pre-mutation snapshot, added `Rollback Target`, saved, restored with `restore_batch_snapshot`, reopened, observed the session, and confirmed `Rollback Target` was removed.
- Import/place journal regression still passed after snapshot archive creation was added.
- Failed-batch verification: created a session, added `Before Failure`, then ran an unsupported operation. The runner exited non-zero and still wrote a journal with batch status `failed`, the applied `create_audio_track` entry, the failed operation entry, and the error message.
- Snapshot retention verification: three command files with `snapshotRetention.maxCount: 2` produced journal-specific snapshot paths and pruned the oldest archive, leaving the latest two snapshots.
- Risk policy verification: `batchRisk: low` is preserved in the journal, unapproved `batchRisk: high` exits non-zero before creating a session, and `batchRisk: high` with `riskApproval.confirmed: true` executes and records high risk.
- Canonical observation verification: `observe_session` emits recursively sorted observation object keys, and journal `observationHash` matches the SHA-256 of canonical observation JSON.

## Candidate Command Surfaces

### Session Utilities

Directory: `/Users/garyhsieh/reson-engine/session_utils`

The upstream `session_utils/README` describes non-interactive command-line tools that directly use `libardour` to access Ardour sessions.

Existing tools of interest:

- `new_session.cc`: create a new session with sample rate, master channel count, and optional template.
- `new_empty_session.cc`: create a new empty session.
- `export.cc`: export a session to WAV using Ardour export handling.
- `common.cc` / `common.h`: shared initialization and session helpers.

Early read: this is the strongest first bridge candidate because it is already C++, non-interactive, and linked against Ardour session APIs.

Confirmed baseline:

- `ardour9-new_empty_session` can be built and run from source.
- It can create an empty Ardour session non-interactively with the dummy backend once backend and panner targets are built.
- `ardour9-reson_command` can run a JSON command sequence that creates a session, creates audio tracks, saves, reopens, and observes the session.

### Lua Scripts

Directory: `/Users/garyhsieh/reson-engine/share/scripts`

Relevant examples:

- `s_import_files.lua`: demonstrates `Editor:do_import(...)`.
- `_session_test.lua`: demonstrates session script lifecycle and `Session` access.

Early read: Lua may be useful for probing editor/session operations quickly, especially import and placement. It may not be sufficient for a durable headless command runner.

### OSC

No conclusion yet. Per ADR-0007, reject OSC for structural edits unless research proves it can safely create sessions, import media, place regions, save, render, and support rollback semantics.

### In-Process C++ Runner

If Lua and existing utilities are insufficient, prototype a Reson-specific C++ session utility in the Ardour fork. Start by copying `session_utils/example.cc` or extending the session utility pattern, not by modifying UI code.

## Required Operations

The first commandability spike must map these operations to Ardour APIs:

- Create/open session.
- Save session.
- Create tracks.
- Import audio.
- Place regions at exact mm:ss timestamps.
- Set gain/fades where feasible.
- Render/export range or full session.
- Capture pre-command rollback state.
- Emit enough observation data for a stable project graph.

## Minimal Command Shape

Initial JSON command file target:

```json
{
  "schemaVersion": "reson.command.v0",
  "commands": [
    {
      "op": "create_session",
      "sessionDir": "fixtures/out/CommandabilityTest",
      "sampleRate": 48000
    },
    {
      "op": "place_audio",
      "path": "fixtures/audio/riser.wav",
      "trackName": "FX Risers",
      "start": "01:08.000",
      "gainDb": -7
    },
    {
      "op": "render",
      "output": "fixtures/out/CommandabilityTest/render.wav"
    }
  ]
}
```

This is a spike format only. Durable Reson commands should target stable IDs, not names.

## Resolved Spike Questions

- Audio tracks can be created non-interactively through the C++ session utility bridge.
- Source media import no longer relies on editor UI state for the proven import/place path.
- Time strings are mapped to sample positions inside `ardour9-reson_command`.
- One session utility can open, mutate, save, observe, render, and export in one process.
- Rollback starts with pre-batch session snapshots and command journals, not direct agent access to Ardour undo.
- The first committed utility is the unified `ardour9-reson_command` runner.

## Current Recommendation

Do not integrate live AI yet. Do not rewrite Ardour's GTK UI as the next step.

The build, empty-session, command-runner, import, placement, render, observation graph, and rollback baselines are now proven. Rollback semantics for the spike are defined by `reson.command_journal.v0`, pre-batch session snapshots, `restore_batch_snapshot`, snapshot retention, batch risk gating, and canonical observation hashes.

The next product milestone should be a local web frontend over the existing bridge: inspect imported assets, show a timeline, review plan diffs, approve/apply, play rendered previews, and roll back. Ardour's existing GUI remains useful for visual comparison.

## Phase 5 Bridge Decision

Continue with the Ardour-derived engine path and deepen the C++ session utility bridge. The first durable bridge should be a journaled command runner, not a UI integration, OSC control path, or live AI loop.

Rollback starts with session-level snapshots around command batches, plus command journals that record pre-command observation, touched stable IDs, post-command observation, and verification artifacts where available. Fine-grained inverse commands can follow after the bridge can prove them from observed engine state.

Rejected rollback approaches:

- Direct agent access to Ardour undo stacks.
- OSC for structural session edits.
- Name-only rollback plans.
- Agent-authored inverse commands that are not derived from bridge observations.

See `docs/adr/0011-use-journaled-command-rollback-for-engine-bridge.md` for the accepted decision.

The first schema contract is `docs/schemas/command-journal-v0.md`.

The current engine spike implements journal emission, failed-batch journaling, session snapshot archive creation, `restore_batch_snapshot` replay, snapshot retention pruning, risk-specific approval gating, and canonical observation hashing.

The current product workflow also implements multi-track DAW test-pack import, approval-gated import plans, `_DAW/placement.md` trim parsing, `sourceStart`/`duration` propagation, and trimmed region creation in the engine.
