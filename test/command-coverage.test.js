const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildImportPackCommand } = require('../src/workflows/import-pack');
const { buildLiveImportCommands } = require('../src/workflows/live-import-pack');
const { buildRollbackCommand } = require('../src/workflows/rollback');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectDocumentedCommands() {
  const file = path.join(__dirname, '..', 'docs', 'research', 'engine-command-coverage.md');
  const body = fs.readFileSync(file, 'utf8');
  return new Set([...body.matchAll(/\|\s*`([^`]+)`\s*\|/g)].map((match) => match[1]));
}

function collectFixtureCommands() {
  const ops = new Set();
  const fixtureDir = path.join(__dirname, '..', 'examples', 'bridge');
  for (const file of fs.readdirSync(fixtureDir).filter((entry) => entry.endsWith('.command.json'))) {
    const commandFile = readJson(path.join(fixtureDir, file));
    for (const command of commandFile.commands) {
      ops.add(command.op);
    }
  }
  return ops;
}

test('engine command coverage documents every command used by fixtures and workflows', () => {
  const documented = collectDocumentedCommands();
  const required = collectFixtureCommands();

  const manifest = readJson(path.join(__dirname, '..', 'examples', 'import-pack', 'manifest.json'));
  for (const command of buildImportPackCommand(manifest).commands) {
    required.add(command.op);
  }
  for (const command of buildLiveImportCommands(manifest)) {
    required.add(command.op);
  }
  const rollbackJournal = {
    schemaVersion: 'siann.command_journal.v0',
    batches: [
      {
        preState: {
          snapshot: {
            path: '/tmp/siann-command-coverage/snapshot.tar.gz',
          },
        },
      },
    ],
  };
  const rollbackSourceCommand = {
    schemaVersion: 'siann.command.v0',
    commands: [
      {
        op: 'create_session',
        sessionDir: '/tmp/siann-command-coverage/Session',
        sessionName: 'CoverageSession',
      },
    ],
  };
  for (const command of buildRollbackCommand(rollbackJournal, rollbackSourceCommand).commands) {
    required.add(command.op);
  }

  const missing = [...required].filter((op) => !documented.has(op)).sort();
  assert.deepEqual(missing, []);
});
