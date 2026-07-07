const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildDawZipManifest,
  writeDawZipManifest,
} = require('../src/workflows/daw-zip-manifest');

function writeWavPlaceholder(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'RIFF placeholder');
}

function fixture(root) {
  writeWavPlaceholder(path.join(root, '_DAW', '00m05s_BGM01_AcousticGuitarDawn_a.wav'));
  writeWavPlaceholder(path.join(root, '_DAW', '00m57s_BGM02_FeltPianoAutumnDrift_a.wav'));
  writeWavPlaceholder(path.join(root, '_SpliceSFX', 'SFX_C01_01m03s_wood-box-open.wav'));
  writeWavPlaceholder(path.join(root, '_SpliceSFX', 'SFX_C02_01m32s_leaves-crunch.wav'));
}

test('buildDawZipManifest creates one track per BGM bed and SFX cue', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-daw-source-'));
  const outRoot = path.join(os.tmpdir(), 'reson-daw-demo');
  fixture(sourceRoot);

  const manifest = buildDawZipManifest(sourceRoot, { outRoot });

  assert.equal(manifest.schemaVersion, 'reson.import_pack.v0');
  assert.equal(manifest.session.name, 'UserDawPlacementDemo');
  assert.deepEqual(manifest.tracks.map((track) => track.name), [
    'BGM01 AcousticGuitarDawn',
    'BGM02 FeltPianoAutumnDrift',
    'SFX C01 wood-box-open',
    'SFX C02 leaves-crunch',
  ]);
  assert.deepEqual(manifest.assets.map((asset) => ({
    trackName: asset.trackName,
    regionName: asset.regionName,
    start: asset.start,
  })), [
    { trackName: 'BGM01 AcousticGuitarDawn', regionName: 'BGM01 AcousticGuitarDawn a', start: '5' },
    { trackName: 'BGM02 FeltPianoAutumnDrift', regionName: 'BGM02 FeltPianoAutumnDrift a', start: '57' },
    { trackName: 'SFX C01 wood-box-open', regionName: 'SFX C01 wood-box-open', start: '63' },
    { trackName: 'SFX C02 leaves-crunch', regionName: 'SFX C02 leaves-crunch', start: '92' },
  ]);
});

test('writeDawZipManifest writes a reusable manifest file', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-daw-source-write-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-daw-demo-write-'));
  const manifestFile = path.join(outRoot, 'manifest.json');
  fixture(sourceRoot);

  const summary = writeDawZipManifest(sourceRoot, manifestFile, { outRoot });

  assert.equal(summary.ok, true);
  assert.equal(summary.assetCount, 4);
  assert.equal(summary.trackCount, 4);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  assert.equal(manifest.tracks.length, 4);
  assert.equal(manifest.assets[0].path, path.join(sourceRoot, '_DAW', '00m05s_BGM01_AcousticGuitarDawn_a.wav'));
});

test('create-daw-manifest CLI writes a multi-track manifest', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-daw-source-cli-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-daw-demo-cli-'));
  const manifestFile = path.join(outRoot, 'manifest.json');
  fixture(sourceRoot);

  const script = path.join(__dirname, '..', 'scripts', 'create-daw-manifest.js');
  const result = spawnSync(process.execPath, [
    script,
    sourceRoot,
    '--out',
    manifestFile,
    '--session-dir',
    path.join(outRoot, 'Session'),
    '--preview',
    path.join(outRoot, 'preview.wav'),
    '--journal',
    path.join(outRoot, 'journal.json'),
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.trackCount, 4);
  assert.equal(summary.assetCount, 4);
  assert.equal(JSON.parse(fs.readFileSync(manifestFile, 'utf8')).tracks[2].name, 'SFX C01 wood-box-open');
});
