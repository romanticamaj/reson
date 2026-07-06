# Engine Spike Checklist

Date: 2026-07-06

## Goal

Prove whether the Ardour-derived engine path can support Reson's first command bridge: static JSON commands that create/open a session, import audio, place clips at exact timestamps, save, render, and replay deterministically where feasible.

## Phase 0: Repository Setup

- [x] Publish Reson docs repo: `https://github.com/romanticamaj/reson`
- [x] Fork Ardour to `https://github.com/romanticamaj/ardour`
- [x] Clone engine checkout to `/Users/garyhsieh/reson-engine`
- [x] Set engine `origin` to `romanticamaj/ardour`
- [x] Set engine `upstream` to `Ardour/ardour`
- [x] Record checked Ardour revision in `docs/research/ardour-commandability-map.md`

## Phase 1: Build Baseline

- [x] Run `./waf --help`
- [x] Run initial macOS configure discovery.
- [x] Record first blocker: missing Boost headers.
- [x] Install or point Ardour at required dependencies.
- [x] Rerun configure with `--with-backends=coreaudio,dummy --no-phone-home --no-nls --no-lrdf`.
- [x] Build a minimal target or full debug build.
- [x] Run an existing session utility from source.
- [x] Create an empty Ardour session non-interactively with `ardour9-new_empty_session`.
- [ ] Resolve or suppress built-in LV2 manifest warnings during session utility startup.

## Phase 2: Existing API Map

- [x] Identify `session_utils` as primary non-interactive C++ entry point.
- [x] Identify Lua import/session examples.
- [x] Map session create APIs through `session_utils/new_empty_session.cc` and `session_utils/new_session.cc`.
- [ ] Map audio import APIs.
- [ ] Map track creation APIs.
- [ ] Map region placement APIs.
- [x] Map export/render starting point through `session_utils/export.cc`.
- [ ] Decide whether Lua is sufficient for the first spike.
- [ ] Decide whether a new C++ session utility is required.

## Phase 3: Minimal Command Runner

- [ ] Define `reson.command.v0` spike schema.
- [ ] Add a small command runner in the Ardour fork or as a session utility.
- [ ] Support `create_session`.
- [ ] Support `import_audio`.
- [ ] Support `create_track`.
- [ ] Support `place_audio`.
- [ ] Support `save_session`.
- [ ] Support `render`.
- [ ] Emit command log JSON.

## Phase 4: Fixture And Replay

- [ ] Add or reference small fixture audio outside git if licensing is unclear.
- [ ] Create fixture command file.
- [ ] Generate fixture session.
- [ ] Generate rendered artifact.
- [ ] Rerun command log and compare project graph.
- [ ] Compare render hash or perform null test where feasible.

## Phase 5: Decision

- [ ] Document chosen bridge approach.
- [ ] Document rejected approaches.
- [ ] Document rollback strategy.
- [ ] Decide whether to continue with Ardour-derived engine path, deepen C++ integration, or revise approach.
