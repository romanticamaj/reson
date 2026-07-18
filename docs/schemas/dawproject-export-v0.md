# DAWproject Export v0

DAWproject export v0 converts a SIANN import-pack manifest into a Cubase-
importable `.dawproject` package. The goal is audio session exchange, not native
Cubase project generation.

Cubase `.cpr` files are proprietary and are not a SIANN export target. AAF and
OMF remain possible future targets, but DAWproject is the first target because it
is an open ZIP + XML format and can preserve track/event structure.

## Package Layout

```text
session.dawproject
  project.xml
  metadata.xml
  audio/
    riser_01.wav
    impact_01.wav
```

The ZIP currently uses stored entries without compression. Media is copied into
the package so Cubase can import the project without depending on the original
absolute file paths.

## Supported Manifest Fields

| Manifest field | DAWproject output |
| --- | --- |
| `session.name` | `metadata.xml` title and project metadata. |
| `session.sampleRate` | Project and audio metadata reference rate. |
| `tracks[].name` | Audio `Track` names. |
| `assets[].path` | Copied media under `audio/`. |
| `assets[].trackName` | Arrangement lane target. |
| `assets[].regionName` | Clip name. |
| `assets[].start` | Clip timeline start in seconds. |
| `assets[].sourceStart` | Clip `playStart` in seconds. |
| `assets[].duration` | Clip duration in seconds; also derives `playStop` (`sourceStart + duration`). |

When `duration` is omitted, the exporter reads the WAV header and uses the
remaining media duration after `sourceStart`.

Per the DAWproject XSD, `playStart` and `playStop` together define the
trimmed region of the referenced `Audio` content; a `Clip` must not emit one
without the other. The exporter always emits both, even when `sourceStart` is
`0`, so hosts never have to guess the trimmed range from `duration` alone.

## v0 Limits

- WAV media only.
- Time values are seconds, including `mm:ss` and numeric string inputs.
- Tempo is exported as a default 120 BPM marker until tempo-map commands exist.
- No MIDI, plugins, automation, sends, buses, or Cubase-specific project data.
- No binary AAF/OMF generation.

## Verification

Required checks:

- `node --test test/dawproject-export.test.js`
- `npm test`
- Open the exported `.dawproject` in Cubase and verify that audio events appear
  on the expected tracks at their original timeline positions.

