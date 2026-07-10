const fs = require('node:fs');
const path = require('node:path');

const {
  buildDawZipManifest,
} = require('./daw-zip-manifest');
const {
  validateManifest,
} = require('./import-pack');

function assertDirectory(dir, name) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${name} must be an existing directory`);
  }
}

function readContext(file) {
  if (!file) {
    return null;
  }
  const absoluteFile = path.resolve(file);
  return {
    path: absoluteFile,
    text: fs.readFileSync(absoluteFile, 'utf8'),
  };
}

function listFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolute));
      }
    }
  }
  return files.sort();
}

function hasDawZipShape(root) {
  return fs.existsSync(path.join(root, '_DAW')) || fs.existsSync(path.join(root, '_SpliceSFX'));
}

function buildIntakePlan(sourceRoot, options = {}) {
  const absoluteSourceRoot = path.resolve(sourceRoot);
  assertDirectory(absoluteSourceRoot, 'sourceRoot');
  const outRoot = path.resolve(options.outRoot || path.join(absoluteSourceRoot, '.siann-intake'));
  const context = readContext(options.contextFile);
  const sourceFiles = listFiles(absoluteSourceRoot);
  const assumptions = [];
  const needsReview = [];
  const evidence = [];

  let manifest = null;
  let strategy = null;
  let confidence = 0;

  if (hasDawZipShape(absoluteSourceRoot)) {
    strategy = 'daw_zip_heuristic';
    manifest = buildDawZipManifest(absoluteSourceRoot, {
      outRoot,
      sessionDir: options.sessionDir || path.join(outRoot, 'Session'),
      previewPath: options.previewPath || path.join(outRoot, 'preview.wav'),
      journalPath: options.journalPath || path.join(outRoot, 'journal.json'),
      sessionName: options.sessionName || 'SIANNIntakeSession',
      sampleRate: options.sampleRate || 48000,
    });
    confidence = context ? 0.86 : 0.82;
    assumptions.push('Detected _DAW/_SpliceSFX folder layout and filename timecode pattern.');
    evidence.push({ kind: 'folder_layout', value: '_DAW/_SpliceSFX' });
    if (sourceFiles.some((file) => file.endsWith('_DAW/placement.md'))) {
      evidence.push({ kind: 'placement_sheet', value: '_DAW/placement.md' });
    } else {
      assumptions.push('No _DAW/placement.md found; sourceStart and duration are inferred only when present elsewhere.');
      needsReview.push({ severity: 'medium', message: 'BGM trim durations were not provided.' });
    }
  } else {
    strategy = 'unsupported_freeform';
    confidence = 0.2;
    needsReview.push({
      severity: 'high',
      message: 'No supported deterministic intake shape was detected. An AI planner must infer track grouping and placement before execution.',
    });
  }

  if (manifest) {
    validateManifest(manifest);
  }

  return {
    schemaVersion: 'siann.intake_plan.v0',
    source: {
      root: absoluteSourceRoot,
      contextFile: context ? context.path : null,
      fileCount: sourceFiles.length,
      audioFileCount: sourceFiles.filter((file) => file.toLowerCase().endsWith('.wav')).length,
    },
    planner: {
      kind: 'heuristic',
      strategy,
      confidence,
    },
    assumptions,
    needsReview,
    evidence,
    manifest,
  };
}

function writeIntakePlan(sourceRoot, outFile, options = {}) {
  const absoluteOutFile = path.resolve(outFile);
  const plan = buildIntakePlan(sourceRoot, {
    ...options,
    outRoot: options.outRoot || path.dirname(absoluteOutFile),
  });
  fs.mkdirSync(path.dirname(absoluteOutFile), { recursive: true });
  fs.writeFileSync(absoluteOutFile, `${JSON.stringify(plan, null, 2)}\n`);
  return {
    ok: plan.needsReview.every((item) => item.severity !== 'high'),
    workflow: 'plan-intake',
    sourceRoot: path.resolve(sourceRoot),
    planFile: absoluteOutFile,
    strategy: plan.planner.strategy,
    confidence: plan.planner.confidence,
    needsReviewCount: plan.needsReview.length,
    manifest: plan.manifest ? {
      trackCount: plan.manifest.tracks.length,
      assetCount: plan.manifest.assets.length,
    } : null,
  };
}

module.exports = {
  buildIntakePlan,
  writeIntakePlan,
};

