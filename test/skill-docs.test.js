const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('siann-intake skill defines the AI-to-deterministic bridge workflow', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', '.codex', 'skills', 'siann-intake', 'SKILL.md'), 'utf8');

  assert.match(skill, /siann\.import_pack\.v0/);
  assert.match(skill, /node bin\/siann\.js export dawproject/);
  assert.match(skill, /unzip -t/);
  assert.match(skill, /needsReview/);
  assert.match(skill, /Fixed layouts such as `_DAW\/` and `_SpliceSFX\/` are examples, not\s+requirements\./);
  assert.match(skill, /Do not directly\s+mutate engine\/session files\./);
});

test('claude skill points to the canonical siann-intake skill', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', '.claude', 'skills', 'siann-intake', 'SKILL.md'), 'utf8');

  assert.match(skill, /\.codex\/skills\/siann-intake\/SKILL\.md/);
  assert.match(skill, /AI planner owns arbitrary input/);
});

