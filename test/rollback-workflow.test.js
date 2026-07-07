const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildRollbackCommand,
  writeRollbackCommand,
} = require('../src/workflows/rollback');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function commandFile(root) {
  return {
    schemaVersion: 'siann.command.v0',
    journalPath: path.join(root, 'journal.json'),
    commands: [
      {
        op: 'create_session',
        sessionDir: path.join(root, 'Session'),
        sessionName: 'RollbackWorkflowDemo',
        sampleRate: 48000,
      },
      { op: 'create_audio_track', name: 'Rollback Target' },
      { op: 'save_session' },
      { op: 'observe_session' },
    ],
  };
}

function journal(root) {
  return {
    schemaVersion: 'siann.command_journal.v0',
    journalId: 'journal',
    batches: [{
      batchId: 'batch_0001',
      status: 'applied',
      risk: 'normal',
      preState: {
        snapshot: {
          kind: 'session_archive',
          path: path.join(root, 'snapshots', 'journal_batch_0001_before.tar.gz'),
          sha256: 'sha256:' + 'a'.repeat(64),
        },
      },
      postState: { observationHash: 'sha256:' + 'b'.repeat(64) },
      entries: [
        { entryId: 'entry_0001', op: 'create_session', status: 'applied' },
        { entryId: 'entry_0002', op: 'create_audio_track', status: 'applied' },
      ],
    }],
  };
}

test('buildRollbackCommand creates restore, reopen, and observe commands', () => {
  const root = '/tmp/siann-rollback-unit';
  const rollback = buildRollbackCommand(journal(root), commandFile(root));

  assert.equal(rollback.schemaVersion, 'siann.command.v0');
  assert.equal(rollback.batchRisk, 'normal');
  assert.deepEqual(rollback.commands.map((command) => command.op), [
    'restore_batch_snapshot',
    'open_session',
    'observe_session',
  ]);
  assert.equal(rollback.commands[0].snapshotPath, path.join(root, 'snapshots', 'journal_batch_0001_before.tar.gz'));
  assert.equal(rollback.commands[0].sessionDir, path.join(root, 'Session'));
  assert.equal(rollback.commands[1].sessionName, 'RollbackWorkflowDemo');
});

test('writeRollbackCommand writes a rollback command file next to the journal by default', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-rollback-write-'));
  const journalFile = path.join(root, 'journal.json');
  const commandPath = path.join(root, 'import-pack.command.json');
  writeJson(journalFile, journal(root));
  writeJson(commandPath, commandFile(root));

  const summary = writeRollbackCommand(journalFile, { sourceCommandFile: commandPath });

  assert.equal(summary.ok, true);
  assert.equal(summary.workflow, 'rollback');
  assert.equal(summary.commandCount, 3);
  assert.equal(summary.commandFile, path.join(root, 'rollback.command.json'));
  assert.equal(JSON.parse(fs.readFileSync(summary.commandFile, 'utf8')).commands[0].op, 'restore_batch_snapshot');
});

test('siann rollback writes a machine-readable rollback summary', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-rollback-cli-'));
  const journalFile = path.join(root, 'journal.json');
  const commandPath = path.join(root, 'import-pack.command.json');
  const outFile = path.join(root, 'restore.command.json');
  writeJson(journalFile, journal(root));
  writeJson(commandPath, commandFile(root));

  const cli = path.join(__dirname, '..', 'bin', 'siann.js');
  const result = spawnSync(process.execPath, [
    cli,
    'rollback',
    journalFile,
    '--source-command',
    commandPath,
    '--out',
    outFile,
    '--json',
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.workflow, 'rollback');
  assert.equal(summary.commandFile, outFile);
  assert.equal(JSON.parse(fs.readFileSync(outFile, 'utf8')).commands.at(-1).op, 'observe_session');
});
