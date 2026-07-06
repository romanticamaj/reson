const fs = require('node:fs');
const crypto = require('node:crypto');
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

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
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
    integrity: {
      commandHash: sha256(command),
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
  if (!plan.review || typeof plan.review !== 'object' || Array.isArray(plan.review)) {
    throw new Error('plan.review must be an object');
  }
  return plan;
}

function planValidationIssues(plan) {
  const issues = [];
  const currentCommandHash = sha256(plan.command);
  const expectedCommandHash = plan.integrity && plan.integrity.commandHash;
  if (!expectedCommandHash) {
    issues.push({
      code: 'missing_command_hash',
      message: 'plan.integrity.commandHash is required',
    });
  } else if (expectedCommandHash !== currentCommandHash) {
    issues.push({
      code: 'command_hash_mismatch',
      message: 'plan command hash does not match integrity hash',
    });
  }
  if (plan.review.state === 'approved') {
    if (!plan.review.approvedBy) {
      issues.push({
        code: 'missing_approved_by',
        message: 'approved plans require review.approvedBy',
      });
    }
    if (!plan.review.approvedAt) {
      issues.push({
        code: 'missing_approved_at',
        message: 'approved plans require review.approvedAt',
      });
    }
    if (plan.review.commandHash !== currentCommandHash) {
      issues.push({
        code: 'approved_hash_mismatch',
        message: 'plan command hash does not match approved hash',
      });
    }
  } else if (plan.review.state !== 'pending' && plan.review.state !== 'rejected') {
    issues.push({
      code: 'invalid_review_state',
      message: 'plan review state must be pending, approved, or rejected',
    });
  }
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    issues.push({
      code: 'missing_steps',
      message: 'plan.steps must be a non-empty array',
    });
  }
  return {
    issues,
    currentCommandHash,
  };
}

function validateImportPackPlan(planFile) {
  const absolutePlanFile = path.resolve(planFile);
  const plan = loadImportPackPlan(absolutePlanFile);
  const { issues, currentCommandHash } = planValidationIssues(plan);
  return {
    ok: issues.length === 0,
    workflow: 'validate-plan',
    planFile: absolutePlanFile,
    reviewState: plan.review.state,
    approvable: issues.length === 0 && plan.review.state === 'pending',
    applicable: issues.length === 0 && plan.review.state === 'approved',
    commandHash: currentCommandHash,
    issues,
  };
}

function approveImportPackPlan(planFile, outFile, options = {}) {
  const absolutePlanFile = path.resolve(planFile);
  const absoluteOutFile = path.resolve(outFile);
  const plan = loadImportPackPlan(absolutePlanFile);
  const validation = validateImportPackPlan(absolutePlanFile);
  if (!validation.ok) {
    throw new Error(`plan is not approvable: ${validation.issues.map((issue) => issue.code).join(', ')}`);
  }
  if (plan.review.state !== 'pending') {
    throw new Error('only pending plans can be approved');
  }
  const approvedPlan = {
    ...plan,
    review: {
      ...plan.review,
      state: 'approved',
      approvedBy: options.approvedBy || process.env.USER || 'unknown',
      approvedAt: options.approvedAt || new Date().toISOString(),
      commandHash: validation.commandHash,
    },
  };
  writeJson(absoluteOutFile, approvedPlan);
  return {
    ok: true,
    workflow: 'approve-plan',
    sourcePlanFile: absolutePlanFile,
    planFile: absoluteOutFile,
    reviewState: approvedPlan.review.state,
    approvedBy: approvedPlan.review.approvedBy,
    commandHash: approvedPlan.review.commandHash,
    commandCount: approvedPlan.command.commands.length,
  };
}

function rejectImportPackPlan(planFile, outFile, options = {}) {
  const absolutePlanFile = path.resolve(planFile);
  const absoluteOutFile = path.resolve(outFile);
  const plan = loadImportPackPlan(absolutePlanFile);
  const rejectedPlan = {
    ...plan,
    review: {
      ...plan.review,
      state: 'rejected',
      rejectedBy: options.rejectedBy || process.env.USER || 'unknown',
      rejectedAt: options.rejectedAt || new Date().toISOString(),
      reason: options.reason || 'Rejected during review.',
    },
  };
  writeJson(absoluteOutFile, rejectedPlan);
  return {
    ok: true,
    workflow: 'reject-plan',
    sourcePlanFile: absolutePlanFile,
    planFile: absoluteOutFile,
    reviewState: rejectedPlan.review.state,
    rejectedBy: rejectedPlan.review.rejectedBy,
    reason: rejectedPlan.review.reason,
  };
}

function applyImportPackPlan(planFile, outFile) {
  const absolutePlanFile = path.resolve(planFile);
  const absoluteOutFile = path.resolve(outFile);
  const plan = loadImportPackPlan(absolutePlanFile);
  const validation = validateImportPackPlan(absolutePlanFile);
  if (!validation.ok) {
    const approvedHashIssue = validation.issues.find((issue) => issue.code === 'approved_hash_mismatch');
    if (approvedHashIssue) {
      throw new Error(approvedHashIssue.message);
    }
    throw new Error(`plan is not applicable: ${validation.issues.map((issue) => issue.code).join(', ')}`);
  }
  if (plan.review.state !== 'approved') {
    throw new Error('plan must be approved before apply');
  }
  writeJson(absoluteOutFile, plan.command);
  return {
    ok: true,
    workflow: 'apply-plan',
    planFile: absolutePlanFile,
    commandFile: absoluteOutFile,
    commandHash: validation.commandHash,
    commandCount: plan.command.commands.length,
  };
}

module.exports = {
  applyImportPackPlan,
  approveImportPackPlan,
  buildImportPackPlan,
  loadImportPackPlan,
  rejectImportPackPlan,
  validateImportPackPlan,
  writeImportPackPlan,
};
