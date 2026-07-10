const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildIntakePlan,
  writeIntakePlan,
} = require('../src/workflows/intake-plan');

function writeWavPlaceholder(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'RIFF placeholder');
}

function fixture(root) {
  fs.mkdirSync(path.join(root, '_DAW'), { recursive: true });
  fs.writeFileSync(path.join(root, '_DAW', 'placement.md'), [
    '| 放置時碼 | Bed | 變化版 | 你設的區間 | 檔案 |',
    '| 00m05s | BGM01 | AcousticGuitarDawn_a | 起 00:00 ｜ 長 00:52 / 全 02:12 | `00m05s_BGM01_AcousticGuitarDawn_a.wav` |',
  ].join('\n'));
  writeWavPlaceholder(path.join(root, '_DAW', '00m05s_BGM01_AcousticGuitarDawn_a.wav'));
  writeWavPlaceholder(path.join(root, '_SpliceSFX', 'SFX_C01_01m03s_wood-box-open.wav'));
}

test('buildIntakePlan converts supported messy input into a SIANN manifest with review metadata', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-source-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-out-'));
  fixture(sourceRoot);

  const plan = buildIntakePlan(sourceRoot, { outRoot });

  assert.equal(plan.schemaVersion, 'siann.intake_plan.v0');
  assert.equal(plan.planner.kind, 'heuristic');
  assert.equal(plan.planner.strategy, 'daw_zip_heuristic');
  assert.equal(plan.source.audioFileCount, 2);
  assert.equal(plan.manifest.schemaVersion, 'siann.import_pack.v0');
  assert.equal(plan.manifest.tracks.length, 2);
  assert.equal(plan.manifest.assets[0].duration, '52');
  assert.ok(plan.assumptions.some((item) => item.includes('_DAW/_SpliceSFX')));
});

test('writeIntakePlan writes the agent-reviewable intake plan', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-write-source-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-write-out-'));
  const planFile = path.join(outRoot, 'intake-plan.json');
  fixture(sourceRoot);

  const summary = writeIntakePlan(sourceRoot, planFile);

  assert.equal(summary.ok, true);
  assert.equal(summary.workflow, 'plan-intake');
  assert.equal(summary.manifest.assetCount, 2);
  assert.equal(JSON.parse(fs.readFileSync(planFile, 'utf8')).manifest.tracks[0].name, 'BGM01 AcousticGuitarDawn');
});

test('siann plan intake writes a machine-readable summary', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-cli-source-'));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-cli-out-'));
  const planFile = path.join(outRoot, 'intake-plan.json');
  fixture(sourceRoot);

  const cli = path.join(__dirname, '..', 'bin', 'siann.js');
  const result = spawnSync(process.execPath, [
    cli,
    'plan',
    'intake',
    sourceRoot,
    '--out',
    planFile,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.strategy, 'daw_zip_heuristic');
  assert.equal(summary.manifest.trackCount, 2);
});

test('unsupported input produces a review-blocked intake plan', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-unsupported-'));
  const planFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'siann-intake-unsupported-out-')), 'intake-plan.json');
  writeWavPlaceholder(path.join(sourceRoot, 'loose.wav'));

  const summary = writeIntakePlan(sourceRoot, planFile);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

  assert.equal(summary.ok, false);
  assert.equal(summary.strategy, 'unsupported_freeform');
  assert.equal(plan.manifest, null);
  assert.equal(plan.needsReview[0].severity, 'high');
});

