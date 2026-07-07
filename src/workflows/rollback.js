const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function firstBatch(journal) {
  if (!journal || journal.schemaVersion !== 'siann.command_journal.v0') {
    throw new Error('journal schemaVersion must be siann.command_journal.v0');
  }
  if (!Array.isArray(journal.batches) || journal.batches.length === 0) {
    throw new Error('journal batches must be a non-empty array');
  }
  return journal.batches[0];
}

function snapshotPathFromJournal(journal) {
  const batch = firstBatch(journal);
  const snapshot = batch.preState && batch.preState.snapshot;
  if (!snapshot || !snapshot.path) {
    throw new Error('journal batch is missing preState.snapshot.path');
  }
  return snapshot.path;
}

function sessionCommand(sourceCommand) {
  if (!sourceCommand || !Array.isArray(sourceCommand.commands)) {
    throw new Error('source command file must include commands');
  }
  const command = sourceCommand.commands.find((entry) => entry.op === 'create_session' || entry.op === 'open_session');
  if (!command) {
    throw new Error('source command file must include create_session or open_session');
  }
  if (!command.sessionDir) {
    throw new Error('source session command is missing sessionDir');
  }
  return command;
}

function buildRollbackCommand(journal, sourceCommand) {
  const snapshotPath = snapshotPathFromJournal(journal);
  const session = sessionCommand(sourceCommand);
  return {
    schemaVersion: 'siann.command.v0',
    batchRisk: 'normal',
    commands: [
      {
        op: 'restore_batch_snapshot',
        snapshotPath,
        sessionDir: session.sessionDir,
        sessionName: session.sessionName,
      },
      {
        op: 'open_session',
        sessionDir: session.sessionDir,
        sessionName: session.sessionName,
      },
      {
        op: 'observe_session',
      },
    ],
  };
}

function writeRollbackCommand(journalFile, options = {}) {
  const absoluteJournalFile = path.resolve(journalFile);
  const sourceCommandFile = options.sourceCommandFile
    ? path.resolve(options.sourceCommandFile)
    : path.join(path.dirname(absoluteJournalFile), 'import-pack.command.json');
  const outFile = options.outFile
    ? path.resolve(options.outFile)
    : path.join(path.dirname(absoluteJournalFile), 'rollback.command.json');
  const command = buildRollbackCommand(readJson(absoluteJournalFile), readJson(sourceCommandFile));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(command, null, 2)}\n`);
  return {
    ok: true,
    workflow: 'rollback',
    journalFile: absoluteJournalFile,
    sourceCommandFile,
    commandFile: outFile,
    commandCount: command.commands.length,
  };
}

module.exports = {
  buildRollbackCommand,
  snapshotPathFromJournal,
  writeRollbackCommand,
};
