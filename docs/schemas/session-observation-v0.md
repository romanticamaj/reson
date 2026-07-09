# Session Observation v0

`session.observe` is the read model for SIANN Studio UI and agent planning. It
must be deterministic, canonicalizable, and safe to expose outside the engine.
The UI must render from this state; mutations still go through command bridge
commands.

## Envelope

```json
{
  "schemaVersion": "siann.session_observation.v0",
  "session": {
    "id": "session_abc",
    "name": "ImportPackDemo",
    "dir": "/tmp/siann-import-pack-demo/Session",
    "sampleRate": 48000
  },
  "transport": {
    "position": { "samples": 0, "seconds": 0 },
    "tempo": 120,
    "meter": "4/4"
  },
  "tracks": [],
  "regions": [],
  "routes": [],
  "render": {},
  "observationHash": "sha256:..."
}
```

The `observationHash` is calculated from canonical JSON with stable key order.
Mutating commands should include the hash they were planned against so stale
plans are rejected before mutation.

## Tracks

```json
{
  "id": "track_fx_risers",
  "name": "FX Risers",
  "type": "audio",
  "inputChannels": 1,
  "outputChannels": 2,
  "muted": false,
  "soloed": false,
  "gainDb": 0,
  "pan": 0,
  "playlistId": "playlist_fx_risers"
}
```

Track IDs are engine-assigned and stable for the session. UI labels may change;
commands should prefer IDs and reject ambiguous name lookup.

## Regions

```json
{
  "id": "region_riser_01",
  "name": "Riser 01",
  "trackId": "track_fx_risers",
  "start": { "samples": 384000, "seconds": 8 },
  "duration": { "samples": 144000, "seconds": 3 },
  "sourceStart": { "samples": 48000, "seconds": 1 },
  "muted": false,
  "locked": false,
  "layer": 0,
  "sources": [
    {
      "id": "source_riser_01",
      "path": "/tmp/siann-import-pack-demo/audio/riser.wav",
      "sampleRate": 48000,
      "channels": 2
    }
  ]
}
```

Region observations must expose timeline position, source in-point, duration,
track membership, mute/lock state, and source metadata. This is enough for a UI
timeline to draw clips and for an agent to plan moves, trims, and splits.

## Routes

```json
{
  "id": "route_fx_risers",
  "trackId": "track_fx_risers",
  "outputs": ["master"],
  "sends": []
}
```

Routing must stay compact in v0. A later schema can expand plugins, sends,
automation lanes, and bus topology once the mixer command surface is stable.

## Rules

- Observations are snapshots, not mutation APIs.
- Every object that commands can target needs a stable ID.
- Names are display labels and may be duplicated unless a command explicitly
  rejects ambiguity.
- Time values should include samples and seconds; bars/beats can be added after
  tempo and meter are implemented.
- Fields may be omitted only when the engine cannot know them; avoid using
  `null` for unsupported values.

