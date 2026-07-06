const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  applyImportPackPlan,
  buildImportPackPlan,
  writeImportPackPlan,
} = require('../src/workflows/import-pack-plan');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function manifest(root) {
  return {
    schemaVersion: 'reson.import_pack.v0',
    session: {
      dir: path.join(root, 'Session'),
      name: 'ImportPackDemo',
      sampleRate: 48000,
    },
    journalPath: path.join(root, 'journal.json'),
    batchRisk: 'normal',
    snapshotRetention: { maxCount: 3 },
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
      },
      {
        id: 'impact_01',
        path: path.join(root, 'audio', 'impact.wav'),
        trackName: 'Impacts',
        regionName: 'Impact 01',
        start: '12',
      },
    ],
    preview: {
      outputPath: path.join(root, 'preview.wav'),
      sampleRate: 48000,
      bitDepth: '16',
    },
  };
}

test('buildImportPackPlan creates a reviewable plan before apply', () => {
  const root = '/tmp/reson-import-pack-plan-unit';
  const plan = buildImportPackPlan(manifest(root), '/repo/examples/import-pack/manifest.json');

  assert.equal(plan.schemaVersion, 'reson.import_pack_plan.v0');
  assert.equal(plan.workflow, 'import-pack');
  assert.equal(plan.manifestFile, '/repo/examples/import-pack/manifest.json');
  assert.deepEqual(plan.review, {
    required: true,
    state: 'pending',
    instructions: 'Review this plan before running workflow apply-plan.',
  });
  assert.deepEqual(plan.summary, {
    sessionName: 'ImportPackDemo',
    sessionDir: path.join(root, 'Session'),
    trackCount: 2,
    assetCount: 2,
    previewOutputPath: path.join(root, 'preview.wav'),
    risk: 'normal',
    journalPath: path.join(root, 'journal.json'),
    commandCount: 8,
  });
  assert.deepEqual(plan.steps.map((step) => step.kind), [
    'create_session',
    'create_track',
    'create_track',
    'place_asset',
    'place_asset',
    'save_session',
    'render_preview',
    'observe_session',
  ]);
  assert.equal(plan.steps[3].assetId, 'riser_01');
  assert.equal(plan.steps[3].trackName, 'FX Risers');
  assert.equal(plan.steps[3].start, '8');
  assert.equal(plan.command.schemaVersion, 'reson.command.v0');
  assert.equal(plan.command.commands[3].op, 'import_audio');
});

test('writeImportPackPlan writes a review file and applyImportPackPlan materializes a command file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-import-pack-plan-'));
  const manifestFile = path.join(tmp, 'manifest.json');
  const planFile = path.join(tmp, 'plan.json');
  const commandFile = path.join(tmp, 'import-pack.command.json');
  writeJson(manifestFile, manifest(tmp));

  const planSummary = writeImportPackPlan(manifestFile, planFile);

  assert.equal(planSummary.ok, true);
  assert.equal(planSummary.workflow, 'import-pack');
  assert.equal(planSummary.planFile, planFile);
  assert.equal(planSummary.reviewState, 'pending');
  assert.equal(planSummary.commandCount, 8);
  assert.equal(JSON.parse(fs.readFileSync(planFile, 'utf8')).steps[3].kind, 'place_asset');

  const applySummary = applyImportPackPlan(planFile, commandFile);

  assert.equal(applySummary.ok, true);
  assert.equal(applySummary.workflow, 'apply-plan');
  assert.equal(applySummary.planFile, planFile);
  assert.equal(applySummary.commandFile, commandFile);
  assert.equal(applySummary.commandCount, 8);
  assert.equal(JSON.parse(fs.readFileSync(commandFile, 'utf8')).commands[6].op, 'render');
});

test('reson-bridge writes and applies an import-pack plan through the CLI', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-import-pack-plan-cli-'));
  const manifestFile = path.join(tmp, 'manifest.json');
  const planFile = path.join(tmp, 'plan.json');
  const commandFile = path.join(tmp, 'import-pack.command.json');
  writeJson(manifestFile, manifest(tmp));

  const cli = path.join(__dirname, '..', 'bin', 'reson-bridge.js');
  const planResult = spawnSync(process.execPath, [
    cli,
    'workflow',
    'import-pack',
    manifestFile,
    '--plan',
    planFile,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(planResult.status, 0, planResult.stderr);
  const planSummary = JSON.parse(planResult.stdout);
  assert.equal(planSummary.planFile, planFile);
  assert.equal(planSummary.reviewState, 'pending');
  assert.equal(JSON.parse(fs.readFileSync(planFile, 'utf8')).schemaVersion, 'reson.import_pack_plan.v0');

  const applyResult = spawnSync(process.execPath, [
    cli,
    'workflow',
    'apply-plan',
    planFile,
    '--out',
    commandFile,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(applyResult.status, 0, applyResult.stderr);
  const applySummary = JSON.parse(applyResult.stdout);
  assert.equal(applySummary.workflow, 'apply-plan');
  assert.equal(applySummary.commandFile, commandFile);
  assert.equal(JSON.parse(fs.readFileSync(commandFile, 'utf8')).commands.at(-1).op, 'observe_session');
});
