const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('bridge command fixtures are valid developer examples', () => {
  const fixtureDir = path.join(__dirname, '..', 'examples', 'bridge');
  const files = fs.readdirSync(fixtureDir).filter((file) => file.endsWith('.command.json'));

  assert.ok(files.length > 0, 'expected at least one bridge command fixture');
  for (const file of files) {
    const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf8'));
    assert.equal(fixture.schemaVersion, 'reson.command.v0', `${file} should declare command schema`);
    assert.equal(typeof fixture.journalPath, 'string', `${file} should write a command journal`);
    assert.ok(Array.isArray(fixture.commands), `${file} should include commands`);
    assert.ok(fixture.commands.length > 0, `${file} should not be empty`);
    assert.ok(fixture.commands.every((command) => typeof command.op === 'string'), `${file} commands should declare op`);
  }
});
