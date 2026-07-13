const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildDawprojectPackage,
  parseSeconds,
  readWavInfo,
  writeDawprojectExport,
} = require('../src/exporters/dawproject');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function createDemoAudio(dir) {
  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'create-demo-audio.js'), dir], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
}

function manifest(root) {
  return {
    schemaVersion: 'siann.import_pack.v0',
    session: {
      dir: path.join(root, 'Session'),
      name: 'CubaseExchangeDemo',
      sampleRate: 48000,
    },
    tracks: [
      { name: 'FX Risers', inputChannels: 1, outputChannels: 2 },
      { name: 'Impacts', inputChannels: 1, outputChannels: 2 },
    ],
    assets: [
      {
        id: 'riser_01',
        path: path.join(root, 'audio', 'riser.wav'),
        trackName: 'FX Risers',
        regionName: 'Riser 01',
        start: '8',
        sourceStart: '0.1',
        duration: '0.3',
      },
      {
        id: 'impact_01',
        path: path.join(root, 'audio', 'impact.wav'),
        trackName: 'Impacts',
        regionName: 'Impact 01',
        start: '00:12.000',
      },
    ],
  };
}

function readStoreZip(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    assert.equal(method, 0, 'expected store-only zip entries');
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    entries.set(name, buffer.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return entries;
}

test('parseSeconds supports numeric and clock placement values', () => {
  assert.equal(parseSeconds('8'), 8);
  assert.equal(parseSeconds('00:12.250'), 12.25);
});

test('buildDawprojectPackage maps import-pack tracks and assets to DAWproject entries', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-dawproject-package-'));
  createDemoAudio(path.join(tmp, 'audio'));

  const data = manifest(tmp);
  const pack = buildDawprojectPackage(data);
  const entries = new Map(pack.entries.map((entry) => [entry.name, Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data)]));
  const project = entries.get('project.xml').toString('utf8');
  const metadata = entries.get('metadata.xml').toString('utf8');

  assert.equal(entries.has('audio/riser_01.wav'), true);
  assert.equal(entries.has('audio/impact_01.wav'), true);
  assert.match(project, /<Track contentType="audio" loaded="true" id="id\d+" name="FX Risers">/);
  assert.match(project, /<Clip time="8" duration="0.3" contentTimeUnit="seconds" playStart="0.1" playStop="0.4" name="Riser 01">/);
  assert.match(project, /<Clip time="12" duration="0.5" contentTimeUnit="seconds" playStart="0" playStop="0.5" name="Impact 01">/);
  assert.match(project, /<File path="audio\/riser_01.wav"\/>/);
  assert.match(metadata, /<Title>CubaseExchangeDemo<\/Title>/);
});

test('writeDawprojectExport writes a Cubase-importable package shape', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-dawproject-write-'));
  createDemoAudio(path.join(tmp, 'audio'));
  const manifestFile = path.join(tmp, 'manifest.json');
  const outFile = path.join(tmp, 'session.dawproject');
  writeJson(manifestFile, manifest(tmp));

  const summary = writeDawprojectExport(manifestFile, outFile);

  assert.equal(summary.ok, true);
  assert.equal(summary.workflow, 'export-dawproject');
  assert.equal(summary.entryCount, 4);
  assert.equal(summary.mediaCount, 2);
  const zip = readStoreZip(fs.readFileSync(outFile));
  assert.equal(zip.has('project.xml'), true);
  assert.equal(zip.has('metadata.xml'), true);
  assert.equal(zip.has('audio/riser_01.wav'), true);
  assert.equal(readWavInfo(path.join(tmp, 'audio', 'riser.wav')).duration, 0.5);
});

test('siann export dawproject writes a machine-readable summary', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-dawproject-cli-'));
  createDemoAudio(path.join(tmp, 'audio'));
  const manifestFile = path.join(tmp, 'manifest.json');
  const outFile = path.join(tmp, 'session.dawproject');
  writeJson(manifestFile, manifest(tmp));

  const cli = path.join(__dirname, '..', 'bin', 'siann.js');
  const result = spawnSync(process.execPath, [
    cli,
    'export',
    'dawproject',
    manifestFile,
    '--out',
    outFile,
    '--copy-media',
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.outputFile, outFile);
  assert.equal(fs.existsSync(outFile), true);
});

