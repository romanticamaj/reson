const fs = require('node:fs');
const path = require('node:path');

const {
  buildImportPackCommand,
  loadImportPackManifest,
  validateManifest,
} = require('./import-pack');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function commandStep(command, manifest) {
  if (command.op === 'create_session') {
    return {
      kind: 'create_session',
      sessionName: command.sessionName,
      sessionDir: command.sessionDir,
      sampleRate: command.sampleRate,
    };
  }
  if (command.op === 'create_audio_track') {
    return {
      kind: 'create_track',
      name: command.name,
      inputChannels: command.inputChannels,
      outputChannels: command.outputChannels,
      count: command.count,
    };
  }
  if (command.op === 'import_audio') {
    const asset = manifest.assets.find((entry) => (
      entry.path === command.path
      && entry.trackName === command.trackName
      && entry.regionName === command.regionName
      && entry.start === command.start
    ));
    return {
      kind: 'place_asset',
      assetId: asset ? asset.id : null,
      path: command.path,
      trackName: command.trackName,
      regionName: command.regionName,
      start: command.start,
    };
  }
  if (command.op === 'save_session') {
    return { kind: 'save_session' };
  }
  if (command.op === 'render') {
    return {
      kind: 'render_preview',
      outputPath: command.outputPath,
      sampleRate: command.sampleRate,
      bitDepth: command.bitDepth,
      normalize: command.normalize,
    };
  }
  if (command.op === 'observe_session') {
    return { kind: 'observe_session' };
  }
  return { kind: command.op, command };
}

function buildImportPackPlan(manifest, manifestFile) {
  validateManifest(manifest);
  const command = buildImportPackCommand(manifest);
  const previewOutputPath = manifest.preview ? manifest.preview.outputPath : null;

  return {
    schemaVersion: 'reson.import_pack_plan.v0',
    workflow: 'import-pack',
    manifestFile: manifestFile ? path.resolve(manifestFile) : null,
    summary: {
      sessionName: manifest.session.name,
      sessionDir: manifest.session.dir,
      trackCount: manifest.tracks.length,
      assetCount: manifest.assets.length,
      previewOutputPath,
      risk: command.batchRisk,
      journalPath: command.journalPath,
      commandCount: command.commands.length,
    },
    steps: command.commands.map((entry) => commandStep(entry, manifest)),
    review: {
      required: true,
      state: 'pending',
      instructions: 'Review this plan before running workflow apply-plan.',
    },
    command,
  };
}

function writeImportPackPlan(manifestFile, planFile) {
  const absoluteManifestFile = path.resolve(manifestFile);
  const absolutePlanFile = path.resolve(planFile);
  const plan = buildImportPackPlan(loadImportPackManifest(absoluteManifestFile), absoluteManifestFile);
  writeJson(absolutePlanFile, plan);
  return {
    ok: true,
    workflow: 'import-pack',
    manifestFile: absoluteManifestFile,
    planFile: absolutePlanFile,
    reviewState: plan.review.state,
    commandCount: plan.command.commands.length,
  };
}

function loadImportPackPlan(planFile) {
  const absolutePlanFile = path.resolve(planFile);
  const plan = readJson(absolutePlanFile);
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('plan must be an object');
  }
  if (plan.schemaVersion !== 'reson.import_pack_plan.v0') {
    throw new Error('schemaVersion must be reson.import_pack_plan.v0');
  }
  if (plan.workflow !== 'import-pack') {
    throw new Error('workflow must be import-pack');
  }
  if (!plan.command || typeof plan.command !== 'object' || Array.isArray(plan.command)) {
    throw new Error('plan.command must be an object');
  }
  if (!Array.isArray(plan.command.commands)) {
    throw new Error('plan.command.commands must be an array');
  }
  return plan;
}

function applyImportPackPlan(planFile, outFile) {
  const absolutePlanFile = path.resolve(planFile);
  const absoluteOutFile = path.resolve(outFile);
  const plan = loadImportPackPlan(absolutePlanFile);
  writeJson(absoluteOutFile, plan.command);
  return {
    ok: true,
    workflow: 'apply-plan',
    planFile: absolutePlanFile,
    commandFile: absoluteOutFile,
    commandCount: plan.command.commands.length,
  };
}

module.exports = {
  applyImportPackPlan,
  buildImportPackPlan,
  loadImportPackPlan,
  writeImportPackPlan,
};
