const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

test('reson-bridge run prints a machine-readable command summary', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reson-bridge-cli-'));
  const journalPath = path.join(tmp, 'journal.json');
  const commandPath = path.join(tmp, 'command.json');
  const runnerPath = path.join(tmp, 'fake-runner.js');

  writeJson(commandPath, {
    journalPath,
    commands: [{ op: 'create_session', sessionDir: path.join(tmp, 'Session'), sessionName: 'CliDemo' }],
  });
  writeJson(journalPath, {
    schemaVersion: 'reson.command_journal.v0',
    journalId: 'journal',
    batches: [{
      batchId: 'batch_0001',
      status: 'applied',
      risk: 'low',
      preState: { snapshot: { kind: 'session_archive', path: path.join(tmp, 'snapshots', 'journal_batch_0001_before.tar.gz') } },
      postState: { observationHash: 'sha256:' + 'd'.repeat(64) },
      entries: [{ entryId: 'entry_0001', op: 'create_session', status: 'applied' }],
    }],
  });
  fs.writeFileSync(runnerPath, [
    '#!/usr/bin/env node',
    'console.log("startup noise");',
    'console.log(JSON.stringify({ schemaVersion: "reson.result.v0", results: [{ op: "create_session", ok: true }] }));',
  ].join('\n'));
  fs.chmodSync(runnerPath, 0o755);

  const cli = path.join(__dirname, '..', 'bin', 'reson-bridge.js');
  const result = spawnSync(process.execPath, [cli, 'run', commandPath, '--runner', runnerPath, '--json'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.commandFile, commandPath);
  assert.equal(summary.journal.risk, 'low');
});

test('reson-bridge --help exits successfully', () => {
  const cli = path.join(__dirname, '..', 'bin', 'reson-bridge.js');
  const result = spawnSync(process.execPath, [cli, '--help'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /reson-bridge run <command-file\.json>/);
});
