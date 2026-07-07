#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  runCommandFile,
  summarizeJournal,
  validateJournal,
} = require('../src/bridge/runner');
const {
  writeImportPackCommand,
} = require('../src/workflows/import-pack');
const {
  applyImportPackPlan,
  approveImportPackPlan,
  rejectImportPackPlan,
  validateImportPackPlan,
  writeImportPackPlan,
} = require('../src/workflows/import-pack-plan');
const {
  writeRollbackCommand,
} = require('../src/workflows/rollback');

function usage(status = 0) {
  const out = status === 0 ? process.stdout : process.stderr;
  out.write([
    'Usage:',
    '  siann run <command-file.json> [--engine-dir <path>] [--runner <path>] [--json]',
    '  siann validate-journal <journal-file.json> [--json]',
    '  siann workflow import-pack <manifest.json> --plan <plan-file.json> [--json]',
    '  siann workflow import-pack <manifest.json> --out <command-file.json> [--run] [--json]',
    '  siann workflow validate-plan <plan-file.json> [--json]',
    '  siann workflow approve-plan <plan-file.json> --out <approved-plan-file.json> [--approved-by <name>] [--json]',
    '  siann workflow reject-plan <plan-file.json> --out <rejected-plan-file.json> [--rejected-by <name>] [--reason <text>] [--json]',
    '  siann workflow apply-plan <plan-file.json> --out <command-file.json> [--run] [--json]',
    '  siann rollback <journal.json> [--source-command <command-file.json>] [--out <command-file.json>] [--run] [--json]',
    '',
    'Environment:',
    '  SIANN_ENGINE_DIR  Defaults to ../siann-engine when --engine-dir is omitted.',
    '',
  ].join('\n'));
  process.exit(status);
}

function parseOptions(args) {
  const options = { positional: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--engine-dir') {
      options.engineDir = args[++i];
    } else if (arg === '--runner') {
      options.runner = args[++i];
    } else if (arg === '--out') {
      options.out = args[++i];
    } else if (arg === '--plan') {
      options.plan = args[++i];
    } else if (arg === '--source-command') {
      options.sourceCommand = args[++i];
    } else if (arg === '--approved-by') {
      options.approvedBy = args[++i];
    } else if (arg === '--rejected-by') {
      options.rejectedBy = args[++i];
    } else if (arg === '--reason') {
      options.reason = args[++i];
    } else if (arg === '--run') {
      options.run = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      options.positional.push(arg);
    }
  }
  return options;
}

function printSummary(summary, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `ok: ${summary.ok}`,
    `status: ${summary.status}`,
    `commandFile: ${summary.commandFile}`,
    summary.journal ? `journal: ${summary.journal.path} (${summary.journal.status}, ${summary.journal.risk}, ${summary.journal.entryCount} entries)` : null,
  ].filter(Boolean).join('\n') + '\n');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === '-h' || command === '--help') {
    usage(0);
  }
  const options = parseOptions(rest);
  if (!command || options.help) {
    usage(command ? 0 : 1);
  }

  if (command === 'run') {
    const commandFile = options.positional[0];
    if (!commandFile) {
      usage(1);
    }
    const summary = await runCommandFile(commandFile, {
      engineDir: options.engineDir,
      runner: options.runner,
    });
    printSummary(summary, options.json);
    process.exit(summary.ok ? 0 : 1);
  }

  if (command === 'validate-journal') {
    const journalFile = options.positional[0];
    if (!journalFile) {
      usage(1);
    }
    const journal = validateJournal(JSON.parse(fs.readFileSync(journalFile, 'utf8')));
    const summary = summarizeJournal(journal, path.resolve(journalFile));
    printSummary({ ok: true, journal: summary }, options.json);
    return;
  }

  if (command === 'rollback') {
    const journalFile = options.positional[0];
    if (!journalFile) {
      usage(1);
    }
    const summary = writeRollbackCommand(journalFile, {
      sourceCommandFile: options.sourceCommand,
      outFile: options.out,
    });
    if (options.run) {
      summary.run = await runCommandFile(summary.commandFile, {
        engineDir: options.engineDir,
        runner: options.runner,
      });
      summary.ok = summary.run.ok;
    }
    printSummary(summary, options.json);
    process.exit(summary.ok ? 0 : 1);
  }

  if (command === 'workflow') {
    const workflow = options.positional[0];
    if (!['import-pack', 'validate-plan', 'approve-plan', 'reject-plan', 'apply-plan'].includes(workflow)) {
      usage(1);
    }

    if (workflow === 'validate-plan') {
      const planFile = options.positional[1];
      if (!planFile) {
        usage(1);
      }
      const summary = validateImportPackPlan(planFile);
      printSummary(summary, options.json);
      process.exit(summary.ok ? 0 : 1);
    }

    if (workflow === 'approve-plan') {
      const planFile = options.positional[1];
      if (!planFile || !options.out) {
        usage(1);
      }
      const summary = approveImportPackPlan(planFile, options.out, {
        approvedBy: options.approvedBy,
      });
      printSummary(summary, options.json);
      process.exit(summary.ok ? 0 : 1);
    }

    if (workflow === 'reject-plan') {
      const planFile = options.positional[1];
      if (!planFile || !options.out) {
        usage(1);
      }
      const summary = rejectImportPackPlan(planFile, options.out, {
        rejectedBy: options.rejectedBy,
        reason: options.reason,
      });
      printSummary(summary, options.json);
      process.exit(summary.ok ? 0 : 1);
    }

    if (workflow === 'apply-plan') {
      const planFile = options.positional[1];
      if (!planFile || !options.out) {
        usage(1);
      }
      const summary = applyImportPackPlan(planFile, options.out);
      if (options.run) {
        summary.run = await runCommandFile(summary.commandFile, {
          engineDir: options.engineDir,
          runner: options.runner,
        });
        summary.ok = summary.run.ok;
      }
      printSummary(summary, options.json);
      process.exit(summary.ok ? 0 : 1);
    }

    const manifestFile = options.positional[1];
    if (!manifestFile || (!options.out && !options.plan)) {
      usage(1);
    }
    if (options.plan && options.run) {
      throw new Error('use workflow apply-plan to run a reviewed plan');
    }
    const summary = options.plan
      ? writeImportPackPlan(manifestFile, options.plan)
      : writeImportPackCommand(manifestFile, options.out);
    if (options.run) {
      summary.run = await runCommandFile(summary.commandFile, {
        engineDir: options.engineDir,
        runner: options.runner,
      });
      summary.ok = summary.run.ok;
    }
    printSummary(summary, options.json);
    process.exit(summary.ok ? 0 : 1);
  }

  usage(1);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
