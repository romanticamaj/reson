# Import Pack Workflow

This example turns a small asset manifest into a reviewable Reson plan, applies
the reviewed plan through the bridge, renders a preview, and leaves rollback
metadata in the generated journal.

```sh
node scripts/create-demo-audio.js /tmp/reson-import-pack-demo/audio
node bin/reson-bridge.js workflow import-pack examples/import-pack/manifest.json \
  --plan /tmp/reson-import-pack-demo/plan.json \
  --json
node bin/reson-bridge.js workflow validate-plan /tmp/reson-import-pack-demo/plan.json --json
node bin/reson-bridge.js workflow approve-plan /tmp/reson-import-pack-demo/plan.json \
  --out /tmp/reson-import-pack-demo/approved-plan.json \
  --approved-by "$USER" \
  --json
node bin/reson-bridge.js workflow apply-plan /tmp/reson-import-pack-demo/approved-plan.json \
  --out /tmp/reson-import-pack-demo/import-pack.command.json \
  --run \
  --json
node bin/reson-bridge.js validate-journal /tmp/reson-import-pack-demo/journal.json --json
node bin/reson-bridge.js rollback /tmp/reson-import-pack-demo/journal.json \
  --source-command /tmp/reson-import-pack-demo/import-pack.command.json \
  --out /tmp/reson-import-pack-demo/rollback.command.json \
  --run \
  --json
```

The generated plan contains the session summary, track and asset placement
steps, preview render target, review state, command hash, and command batch to
apply. Pending plans cannot be applied directly; approve the plan first so the
bridge can verify that the command hash has not changed. Applying the approved
plan creates a session under `/tmp/reson-import-pack-demo/Session`, places a
riser and impact on separate tracks, renders `/tmp/reson-import-pack-demo/preview.wav`,
and records the snapshot path needed for rollback. The rollback command restores
the pre-batch snapshot and observes the restored session.

For extracted DAW test packs with `_DAW/` BGM files, `_DAW/placement.md`, and
`_SpliceSFX/` sound effects, generate a multi-track manifest before the same
plan/apply flow:

```sh
node scripts/create-daw-manifest.js /tmp/reson-user-daw-source \
  --out /tmp/reson-user-daw-multitrack-demo/manifest.json \
  --session-dir /tmp/reson-user-daw-multitrack-demo/Session \
  --preview /tmp/reson-user-daw-multitrack-demo/preview.wav \
  --journal /tmp/reson-user-daw-multitrack-demo/journal.json \
  --json
```

The generated layout creates one track per BGM bed and one track per SFX cue so
the timeline is easier to inspect visually in Ardour or a future Reson UI. BGM
rows in `placement.md` provide `sourceStart` and `duration`, which the engine
uses to trim imported regions instead of always placing whole source files.
