const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  RuntimeClient,
  defaultEngineDir,
  engineRuntimeCommand,
} = require('../src/runtime/client');

function writeWav(file, frequency, seconds = 0.25) {
  const sampleRate = 48000;
  const frames = Math.floor(sampleRate * seconds);
  const dataSize = frames * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frames; i += 1) {
    const fade = Math.min(1, i / 1200, (frames - i) / 1200);
    const sample = Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 12000 * fade);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  fs.writeFileSync(file, buffer);
}

test('live runtime imports, places, renders, and closes a SIANN-owned session', {
  skip: !process.env.SIANN_RUN_ENGINE_TESTS,
}, async () => {
  const engineDir = process.env.SIANN_ENGINE_DIR || defaultEngineDir();
  const runtimeBinary = path.join(engineDir, 'build/session_utils/ardour9-siann_runtime');
  assert.equal(fs.existsSync(runtimeBinary), true, `missing runtime binary: ${runtimeBinary}`);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-live-runtime-'));
  const audioPath = path.join(root, 'tone.wav');
  const sessionDir = path.join(root, 'Session');
  const previewPath = path.join(root, 'preview.wav');
  writeWav(audioPath, 440);

  const client = new RuntimeClient(engineRuntimeCommand({ engineDir }));
  await client.start();
  try {
    const start = await client.request('runtime.start', { protocolVersion: 0 });
    assert.equal(start.body.protocolVersion, 0);
    assert.equal(start.body.capabilities.includes('render.preview'), true);

    const created = await client.request('session.create', {
      sessionDir,
      sessionName: 'LiveRuntime',
      sampleRate: 48000,
    });
    const { sessionId } = created.body;
    assert.match(sessionId, /^session_/);

    const initial = await client.request('session.observe', { sessionId });
    const imported = await client.request('commands.apply', {
      sessionId,
      expectedObservationHash: initial.body.observationHash,
      commands: [{
        op: 'import_audio',
        path: audioPath,
        trackName: 'Live Import',
        regionName: 'Tone Region',
        createTrack: true,
        start: '0',
      }],
    });
    const regionId = imported.body.results[0].regionId;
    const rollbackId = imported.body.rollback.rollbackId;
    assert.match(regionId, /^[A-Za-z0-9-]+$/);
    assert.match(rollbackId, /^rollback_/);

    const placed = await client.request('commands.apply', {
      sessionId,
      expectedObservationHash: imported.body.observationHash,
      commands: [{
        op: 'place_audio',
        regionId,
        start: '00:00.100',
      }],
    });
    assert.equal(placed.body.results[0].start, 4800);

    const preview = await client.request('render.preview', {
      sessionId,
      outputPath: previewPath,
      sampleRate: 48000,
      bitDepth: '16',
    });
    assert.equal(preview.body.outputPath, previewPath);
    assert.equal(fs.existsSync(previewPath), true);
    assert.equal(fs.statSync(previewPath).size > 44, true);

    const rolledBack = await client.request('session.rollback', {
      sessionId,
      rollbackId,
    });
    assert.equal(rolledBack.body.rolledBack, true);
    const afterRollback = await client.request('session.observe', { sessionId });
    const liveImportTrack = afterRollback.body.observation.routes.find((route) => route.name === 'Live Import');
    assert.equal(liveImportTrack, undefined);

    const closed = await client.request('session.close', { sessionId });
    assert.equal(closed.body.closed, true);
    await client.request('runtime.stop', {});
  } finally {
    client.close();
  }
});
