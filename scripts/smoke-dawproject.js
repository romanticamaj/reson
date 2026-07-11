#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { writeDawprojectExport } = require('../src/exporters/dawproject');
const { writeDemoImportPack } = require('./create-demo-import-pack');

function parseArgs(argv) {
  const options = {
    outRoot: path.join(os.tmpdir(), 'siann-dawproject-smoke'),
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      options.outRoot = argv[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  process.stdout.write([
    'Usage:',
    '  node scripts/smoke-dawproject.js [--out <dir>] [--json]',
    '',
  ].join('\n'));
}

function readStoreZipEntries(file) {
  const buffer = fs.readFileSync(file);
  const entries = [];
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({
      name: buffer.toString('utf8', nameStart, nameStart + nameLength),
      method,
      size: compressedSize,
    });
    offset = dataStart + compressedSize;
  }
  return entries;
}

function runSmoke(outRoot) {
  const absoluteOutRoot = path.resolve(outRoot);
  const demo = writeDemoImportPack(absoluteOutRoot);
  const outputFile = path.join(absoluteOutRoot, 'session.dawproject');
  const exported = writeDawprojectExport(demo.manifestFile, outputFile);
  const entries = readStoreZipEntries(outputFile);
  const entryNames = new Set(entries.map((entry) => entry.name));
  for (const required of ['project.xml', 'metadata.xml', 'audio/riser_01.wav', 'audio/impact_01.wav']) {
    if (!entryNames.has(required)) {
      throw new Error(`missing DAWproject entry: ${required}`);
    }
  }
  return {
    ok: true,
    workflow: 'smoke-dawproject',
    outRoot: absoluteOutRoot,
    manifestFile: demo.manifestFile,
    outputFile,
    entryCount: entries.length,
    mediaCount: exported.mediaCount,
  };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      usage();
      process.exit(0);
    }
    const summary = runSmoke(options.outRoot);
    process.stdout.write(options.json
      ? `${JSON.stringify(summary, null, 2)}\n`
      : `Wrote DAWproject smoke package to ${summary.outputFile}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  readStoreZipEntries,
  runSmoke,
};

