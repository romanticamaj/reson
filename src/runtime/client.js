const { spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');

class RuntimeError extends Error {
  constructor(code, message, response) {
    super(message || code || 'runtime error');
    this.name = 'RuntimeError';
    this.code = code || 'runtime_error';
    this.response = response;
  }
}

class RuntimeClient {
  constructor(options) {
    if (!options || !options.command) {
      throw new Error('RuntimeClient requires a command');
    }
    this.command = options.command;
    this.args = options.args || [];
    this.cwd = options.cwd || process.cwd();
    this.env = options.env || {};
    this.child = null;
    this.pending = new Map();
    this.nextRequestId = 1;
    this.stderr = '';
  }

  async start() {
    if (this.child) {
      return;
    }
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString();
    });
    this.child.on('error', (error) => {
      this.rejectAll(error);
    });
    this.child.on('close', (status) => {
      this.rejectAll(new Error(`runtime process exited with status ${status}`));
    });

    const lines = readline.createInterface({ input: this.child.stdout });
    lines.on('line', (line) => this.handleLine(line));
  }

  request(method, body = {}) {
    if (!this.child || !this.child.stdin.writable) {
      return Promise.reject(new Error('runtime process is not running'));
    }
    const requestId = `req_${this.nextRequestId++}`;
    const request = { requestId, method, body };
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error) {
          this.pending.delete(requestId);
          reject(error);
        }
      });
    });
  }

  handleLine(line) {
    if (!line.trim()) {
      return;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      return;
    }
    if (!message.requestId) {
      return;
    }
    const pending = this.pending.get(message.requestId);
    if (!pending) {
      return;
    }
    this.pending.delete(message.requestId);
    if (message.ok === false || message.type === 'error') {
      const body = message.body || {};
      pending.reject(new RuntimeError(body.code, body.message, message));
      return;
    }
    pending.resolve(message);
  }

  close() {
    if (!this.child) {
      return;
    }
    this.child.stdin.end();
    this.child.kill();
    this.child = null;
  }

  rejectAll(error) {
    for (const { reject } of this.pending.values()) {
      reject(error);
    }
    this.pending.clear();
  }
}

function defaultEngineDir() {
  return process.env.SIANN_ENGINE_DIR || path.resolve(process.cwd(), '..', 'siann-engine');
}

function engineRuntimeCommand(options = {}) {
  const engineDir = options.engineDir || defaultEngineDir();
  const quotedEngineDir = JSON.stringify(engineDir);
  return {
    command: '/bin/bash',
    args: ['-lc', [
      `TOP=${quotedEngineDir}`,
      `. ${quotedEngineDir}/build/gtk2_ardour/ardev_common_waf.sh`,
      `${quotedEngineDir}/build/session_utils/ardour9-siann_runtime`,
    ].join('; ')],
    cwd: engineDir,
  };
}

module.exports = {
  RuntimeClient,
  RuntimeError,
  defaultEngineDir,
  engineRuntimeCommand,
};
