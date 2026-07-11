const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { writeDemoImportPack } = require('../scripts/create-demo-import-pack');
const { runSmoke } = require('../scripts/smoke-dawproject');

test('writeDemoImportPack creates a portable demo manifest and audio files', () => {
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-demo-import-pack-'));

  const summary = writeDemoImportPack(outRoot);
  const manifest = JSON.parse(fs.readFileSync(summary.manifestFile, 'utf8'));

  assert.equal(summary.ok, true);
  assert.equal(manifest.assets.length, 2);
  assert.equal(fs.existsSync(path.join(outRoot, 'audio', 'riser.wav')), true);
  assert.equal(fs.existsSync(path.join(outRoot, 'audio', 'impact.wav')), true);
  assert.equal(path.isAbsolute(manifest.assets[0].path), true);
});

test('smoke-dawproject script creates a portable DAWproject package', () => {
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-smoke-dawproject-'));

  const summary = runSmoke(outRoot);

  assert.equal(summary.ok, true);
  assert.equal(summary.entryCount, 4);
  assert.equal(summary.mediaCount, 2);
  assert.equal(fs.existsSync(summary.outputFile), true);
});

test('create-demo-import-pack CLI writes JSON summary', () => {
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-demo-import-pack-cli-'));
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'scripts', 'create-demo-import-pack.js'),
    '--out',
    outRoot,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.assetCount, 2);
});

test('smoke-dawproject CLI writes JSON summary', () => {
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-smoke-dawproject-cli-'));
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'scripts', 'smoke-dawproject.js'),
    '--out',
    outRoot,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.entryCount, 4);
});

