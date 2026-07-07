const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  RuntimeClient,
  RuntimeError,
  defaultEngineDir,
  engineRuntimeCommand,
} = require('../src/runtime/client');

function writeFakeRuntime(source) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siann-runtime-test-'));
  const runtimePath = path.join(tmp, 'fake-runtime.js');
  fs.writeFileSync(runtimePath, source);
  fs.chmodSync(runtimePath, 0o755);
  return runtimePath;
}

test('RuntimeClient sends JSON requests and resolves the matching response', async () => {
  const runtimePath = writeFakeRuntime([
    '#!/usr/bin/env node',
    'const readline = require("node:readline");',
    'const rl = readline.createInterface({ input: process.stdin });',
    'rl.on("line", (line) => {',
    '  const request = JSON.parse(line);',
    '  process.stdout.write(JSON.stringify({ type: "event", body: { status: "busy" } }) + "\\n");',
    '  process.stdout.write(JSON.stringify({',
    '    requestId: request.requestId,',
    '    ok: true,',
    '    type: "response",',
    '    body: { method: request.method, received: request.body }',
    '  }) + "\\n");',
    '});',
  ].join('\n'));
  const client = new RuntimeClient({ command: process.execPath, args: [runtimePath] });

  await client.start();
  const response = await client.request('runtime.start', { protocolVersion: 0 });
  client.close();

  assert.deepEqual(response.body, {
    method: 'runtime.start',
    received: { protocolVersion: 0 },
  });
});

test('RuntimeClient rejects stable error responses with code and message', async () => {
  const runtimePath = writeFakeRuntime([
    '#!/usr/bin/env node',
    'const readline = require("node:readline");',
    'const rl = readline.createInterface({ input: process.stdin });',
    'rl.on("line", (line) => {',
    '  const request = JSON.parse(line);',
    '  process.stdout.write(JSON.stringify({',
    '    requestId: request.requestId,',
    '    ok: false,',
    '    type: "error",',
    '    body: { code: "session_mismatch", message: "unknown sessionId" }',
    '  }) + "\\n");',
    '});',
  ].join('\n'));
  const client = new RuntimeClient({ command: process.execPath, args: [runtimePath] });

  await client.start();
  await assert.rejects(
    () => client.request('session.observe', { sessionId: 'missing' }),
    (error) => {
      assert.equal(error instanceof RuntimeError, true);
      assert.equal(error.code, 'session_mismatch');
      assert.equal(error.message, 'unknown sessionId');
      return true;
    }
  );
  client.close();
});

test('engineRuntimeCommand builds the default ardev runtime invocation', () => {
  const engineDir = path.join(os.tmpdir(), 'siann-engine');

  const invocation = engineRuntimeCommand({ engineDir });

  assert.equal(invocation.command, '/bin/bash');
  assert.equal(invocation.cwd, engineDir);
  assert.match(invocation.args[1], /ardev_common_waf\.sh/);
  assert.match(invocation.args[1], /ardour9-siann_runtime/);
});

test('defaultEngineDir reads SIANN_ENGINE_DIR before falling back to ../siann-engine', () => {
  const previous = process.env.SIANN_ENGINE_DIR;
  process.env.SIANN_ENGINE_DIR = '/tmp/custom-siann-engine';

  assert.equal(defaultEngineDir(), '/tmp/custom-siann-engine');

  if (previous === undefined) {
    delete process.env.SIANN_ENGINE_DIR;
  } else {
    process.env.SIANN_ENGINE_DIR = previous;
  }
});
