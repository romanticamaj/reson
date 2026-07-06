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
- Checked Ardour revision: `8655718b29d6e9c50e9feac80987a326a53e219f`
- `git describe`: `9.7-113-g8655718b29`

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

## Open Questions

- Which Ardour API creates audio tracks non-interactively with the least side effect?
- Which API imports source media without relying on editor UI state?
- How should mm:ss strings map to Ardour sample positions across sample rates?
- Can existing session utilities open, mutate, save, and export in one process?
- Can rollback use Ardour transaction/undo directly, or does the spike need pre-command session snapshots?
- Which operation should become the first committed utility: `reson-command-runner`, `reson-observe-session`, or separate Ardour-style utilities?

## Current Recommendation

Do not redesign UI yet. Do not integrate live AI yet.

The build and empty-session baseline is now proven. Next prototype a small `session_utils`-style C++ runner or extend the utility pattern to import audio and place a region. Keep using static commands and the dummy backend until import/place/save/render are proven.
