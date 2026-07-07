#!/usr/bin/env node
const {
  writeDawZipManifest,
} = require('../src/workflows/daw-zip-manifest');

function usage(status = 0) {
  const out = status === 0 ? process.stdout : process.stderr;
  out.write([
    'Usage:',
    '  create-daw-manifest <extracted-source-dir> --out <manifest.json> [--session-dir <path>] [--preview <path>] [--journal <path>] [--json]',
    '',
  ].join('\n'));
  process.exit(status);
}

function parseOptions(args) {
  const options = { positional: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out') {
      options.out = args[++i];
    } else if (arg === '--session-dir') {
      options.sessionDir = args[++i];
    } else if (arg === '--preview') {
      options.previewPath = args[++i];
    } else if (arg === '--journal') {
      options.journalPath = args[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      options.positional.push(arg);
    }
  }
  return options;
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    usage(0);
  }
  const sourceRoot = options.positional[0];
  if (!sourceRoot || !options.out) {
    usage(1);
  }
  const summary = writeDawZipManifest(sourceRoot, options.out, {
    sessionDir: options.sessionDir,
    previewPath: options.previewPath,
    journalPath: options.journalPath,
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(`Wrote ${summary.manifestFile} with ${summary.trackCount} tracks and ${summary.assetCount} assets\n`);
  }
}

main();
