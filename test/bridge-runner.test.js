const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  parseResultOutput,
  runCommandFile,
  summarizeJournal,
  validateJournal,
} = require('../src/bridge/runner');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

test('parseResultOutput reads the final result JSON after engine noise', () => {
  const parsed = parseResultOutput([
    '-- List Of Registered Controllables',
    'plugin scan warning',
    '{"schemaVersion":"siann.result.v0","results":[{"op":"observe_session","ok":true}]}',
  ].join('\n'));

  assert.equal(parsed.schemaVersion, 'siann.result.v0');
  assert.equal(parsed.results[0].op, 'observe_session');
});

test('validateJournal rejects missing batches', () => {
  assert.throws(
    () => validateJournal({ schemaVersion: 'siann.command_journal.v0', journalId: 'bad' }),
    /journal batches must be a non-empty array/
  );
});

test('summarizeJournal exposes developer-facing journal status', () => {
  const journal = {
    schemaVersion: 'siann.command_journal.v0',
    journalId: 'demo',
    batches: [{
      batchId: 'batch_0001',
      status: 'applied',
      risk: 'normal',
      preState: {
        snapshot: {
          kind: 'session_archive',
          path: '/tmp/demo/snapshots/demo_batch_0001_before.tar.gz',
          sha256: 'sha256:' + 'a'.repeat(64),
        },
      },
      postState: { observationHash: 'sha256:' + 'b'.repeat(64) },
      entries: [{ entryId: 'entry_0001', op: 'create_session', status: 'applied' }],
    }],
  };

  assert.deepEqual(summarizeJournal(journal, '/tmp/demo/journal.json'), {
    path: '/tmp/demo/journal.json',
    journalId: 'demo',
    status: 'applied',
    risk: 'normal',
    entryCount: 1,
    snapshotPath: '/tmp/demo/snapshots/demo_batch_0001_before.tar.gz',
  });
});

test('runCommandFile wraps a runner, parses result output, and loads the journal', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-test-'));
  const journalPath = path.join(tmp, 'journal.json');
  const commandPath = path.join(tmp, 'command.json');
  const runnerPath = path.join(tmp, 'fake-runner.js');

  writeJson(commandPath, {
    journalPath,
    commands: [{ op: 'create_session', sessionDir: path.join(tmp, 'Session'), sessionName: 'Demo' }],
  });
  writeJson(journalPath, {
    schemaVersion: 'siann.command_journal.v0',
    journalId: 'journal',
    batches: [{
      batchId: 'batch_0001',
      status: 'applied',
      risk: 'normal',
      preState: { snapshot: { kind: 'session_archive', path: path.join(tmp, 'snapshots', 'journal_batch_0001_before.tar.gz') } },
      postState: { observationHash: 'sha256:' + 'c'.repeat(64) },
      entries: [{ entryId: 'entry_0001', op: 'create_session', status: 'applied' }],
    }],
  });
  fs.writeFileSync(runnerPath, [
    '#!/usr/bin/env node',
    'console.log("engine warning before json");',
    'console.log(JSON.stringify({ schemaVersion: "siann.result.v0", results: [{ op: "create_session", ok: true }] }));',
  ].join('\n'));
  fs.chmodSync(runnerPath, 0o755);

  const summary = await runCommandFile(commandPath, { runner: runnerPath });

  assert.equal(summary.ok, true);
  assert.equal(summary.result.results[0].op, 'create_session');
  assert.equal(summary.journal.status, 'applied');
  assert.equal(summary.journal.entryCount, 1);
});

test('runCommandFile summarizes failed journals even when the runner prints no result JSON', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-failed-test-'));
  const journalPath = path.join(tmp, 'journal.json');
  const commandPath = path.join(tmp, 'command.json');
  const runnerPath = path.join(tmp, 'fake-failing-runner.js');

  writeJson(commandPath, {
    journalPath,
    batchRisk: 'high',
    commands: [{ op: 'create_session', sessionDir: path.join(tmp, 'Session'), sessionName: 'Rejected' }],
  });
  writeJson(journalPath, {
    schemaVersion: 'siann.command_journal.v0',
    journalId: 'journal',
    batches: [{
      batchId: 'batch_0001',
      status: 'failed',
      risk: 'high',
      preState: {},
      postState: {},
      entries: [],
    }],
  });
  fs.writeFileSync(runnerPath, [
    '#!/usr/bin/env node',
    'console.error("high-risk batch requires riskApproval.confirmed=true");',
    'process.exit(1);',
  ].join('\n'));
  fs.chmodSync(runnerPath, 0o755);

  const summary = await runCommandFile(commandPath, { runner: runnerPath });

  assert.equal(summary.ok, false);
  assert.equal(summary.status, 1);
  assert.equal(summary.result, null);
  assert.equal(summary.journal.status, 'failed');
  assert.equal(summary.journal.risk, 'high');
  assert.match(summary.stderr, /high-risk batch/);
});
