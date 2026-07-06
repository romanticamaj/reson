# Import Pack Workflow

This example turns a small asset manifest into a Reson command batch, runs it
through the bridge, renders a preview, and leaves rollback metadata in the
generated journal.

```sh
node scripts/create-demo-audio.js /tmp/reson-import-pack-demo/audio
node bin/reson-bridge.js workflow import-pack examples/import-pack/manifest.json \
  --out /tmp/reson-import-pack-demo/import-pack.command.json \
  --run \
  --json
node bin/reson-bridge.js validate-journal /tmp/reson-import-pack-demo/journal.json --json
```

The workflow creates a session under `/tmp/reson-import-pack-demo/Session`,
places a riser and impact on separate tracks, renders
`/tmp/reson-import-pack-demo/preview.wav`, and records the snapshot path needed
for rollback.
