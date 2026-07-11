#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeWav(file, frequency, seconds = 0.5) {
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

function writeDemoAudio(outDir) {
  const absoluteOutDir = path.resolve(outDir);
  fs.mkdirSync(absoluteOutDir, { recursive: true });
  writeWav(path.join(absoluteOutDir, 'riser.wav'), 660);
  writeWav(path.join(absoluteOutDir, 'impact.wav'), 110);
  return absoluteOutDir;
}

if (require.main === module) {
  const outDir = process.argv[2] || path.join(os.tmpdir(), 'siann-import-pack-demo', 'audio');
  console.log(`Wrote demo audio to ${writeDemoAudio(outDir)}`);
}

module.exports = {
  writeDemoAudio,
  writeWav,
};
