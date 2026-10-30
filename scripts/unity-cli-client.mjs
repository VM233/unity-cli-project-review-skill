import { spawn } from 'node:child_process';
import path from 'node:path';

const maximumFrameBytes = 8 * 1024 * 1024;
const maximumRequestBytes = 4 * 1024 * 1024;
const maximumPendingRequests = 8;

export class UnityCliError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'UnityCliError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return redactCapabilities({ name: this.name, code: this.code,
      message: this.message, details: this.details });
  }
}

export class UnityCliClient {
  #child;
  #pending = new Map();
  #sequence = 0;
  #frame = Buffer.alloc(4096);
  #frameLength = 0;
  #stderr = Buffer.alloc(0);
  #failure = null;
  #executablePath;
  #spawnProcess;

  constructor({ executablePath, projectPath, spawnProcess = spawn }) {
    if (!path.isAbsolute(projectPath))
      throw new UnityCliError('invalid_project_path', 'Use the absolute Unity project root.');
    if (typeof executablePath !== 'string' || executablePath.length === 0)
      throw new UnityCliError('invalid_cli_path', 'Select the installed official Unity CLI executable.');
    this.projectPath = path.normalize(projectPath);
    this.#executablePath = executablePath;
    this.#spawnProcess = spawnProcess;
    this.#startProcess();
  }

  #startProcess() {
    const child = this.#spawnProcess(this.#executablePath,
      ['--non-interactive', '--no-banner', 'shell', '--protocol', 'ndjson'],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.#child = child;
    this.#failure = null;
    this.#frame = Buffer.alloc(4096);
    this.#frameLength = 0;
    this.#stderr = Buffer.alloc(0);
    child.stdout.on('data', chunk => {
      if (this.#child === child) this.#receive(Buffer.from(chunk));
    });
    child.stderr.on('data', chunk => {
      if (this.#child !== child) return;
      const bytes = Buffer.from(chunk);
      this.#stderr = Buffer.concat([this.#stderr, bytes.subarray(-4096)]).subarray(-4096);
    });
    const retire = (code, message, details) => {
      if (this.#child === child) this.#retire(code, message, details);
    };
    child.on('error', error => retire('cli_process_error', error.message));
    child.stdin.on('error', error => retire('cli_pipe_error', error.message));
    child.stdout.on('error', error => retire('cli_pipe_error', error.message));
    child.stdout.on('end', () => retire('cli_eof',
      this.#frameLength ? 'Official CLI ended inside an NDJSON frame.' : 'Official CLI closed its response stream.'));
    child.on('exit', (exitCode, signal) => retire('cli_exited',
      'Official CLI exited; unresolved command outcomes remain unknown.', { exitCode, signal }));
  }

  reconnect() {
    if (!this.#failure)
      throw new UnityCliError('client_connected', 'The official CLI connection is still active; pending requests remain owned by it.');
    this.#startProcess();
    return this;
  }

  async request(argv, { timeoutMs = 15000 } = {}) {
    if (this.#failure) throw this.#failure;
    if (!Array.isArray(argv) || argv.length > 256 || argv.some(value => typeof value !== 'string'))
      throw new UnityCliError('invalid_argv', 'Use at most 256 string argv entries.');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
      throw new UnityCliError('invalid_deadline', 'timeoutMs must be an integer in 1..60000.');
    if (this.#pending.size === maximumPendingRequests)
      throw new UnityCliError('client_request_limit', 'At most eight requests may be in flight.');
    const id = String(++this.#sequence);
    const line = JSON.stringify({ id, argv }) + '\n';
    if (Buffer.byteLength(line) > maximumRequestBytes)
      throw new UnityCliError('client_request_limit', 'Request exceeds 4 MiB; use the published arguments-file contract.');
    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.#retire('cli_deadline',
        'Official CLI response deadline elapsed; preserve receipts and do not replay mutations.', { requestId: id }), timeoutMs);
      this.#pending.set(id, { resolve, reject, timer });
      this.#child.stdin.write(line);
    });
    if (response.envelope?.success !== true) {
      const nativeError = response.envelope?.errors?.[0];
      if (typeof nativeError?.code !== 'string' || typeof nativeError.message !== 'string')
        throw new UnityCliError('cli_protocol_invalid', 'Official CLI failure has no structured error.', { response });
      throw new UnityCliError('cli_command_failed',
        `${nativeError.code}: ${nativeError.message}`, { response });
    }
    return response;
  }

  async command(name, parameters = {}, options) {
    const entries = Object.entries(parameters);
    if (entries.length > 64 || entries.some(([, value]) =>
      !['string', 'number', 'boolean'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))))
      throw new UnityCliError('invalid_native_arguments', 'Native parameters must be at most 64 scalar values.');
    const argv = ['command', '--project-path', this.projectPath, name, '--'];
    for (const [key, value] of entries) argv.push('--' + key, String(value));
    const response = await this.request(argv, options);
    return response.envelope.data.result;
  }

  async automation(command, args = {}, options) {
    return this.#automation(command, {
      arguments_json: JSON.stringify({ ...args, expectedProjectPath: this.projectPath })
    }, options);
  }

  async contract(name, options) {
    const owner = await this.command('vm_catalog_get', { name }, options);
    if (owner?.found === true && owner.contract && typeof owner.contract === 'object')
      return owner.contract;
    if (owner?.found === false && typeof owner.errorCode === 'string' && typeof owner.errorMessage === 'string')
      throw new UnityCliError('cli_contract_unavailable', `${owner.errorCode}: ${owner.errorMessage}`, { owner });
    throw new UnityCliError('cli_protocol_invalid', 'Native catalog did not publish a contract or a structured missing-contract result.', { owner });
  }

  async automationFromFile(command, argumentsFile, options) {
    return this.#automation(command, { arguments_file: argumentsFile }, options);
  }

  async #automation(command, source, options) {
    const owner = await this.command('vm_automation_call', {
      command, ...source,
      expected_project_path: this.projectPath
    }, options);
    if (owner?.ok !== true) {
      if (owner?.ok !== false || typeof owner.error?.code !== 'string' || typeof owner.error.message !== 'string')
        throw new UnityCliError('cli_protocol_invalid', 'Automation failure has no structured error.', { owner });
      throw new UnityCliError('automation_failed',
        `${command}: ${owner.error.code}: ${owner.error.message}`, { owner });
    }
    return owner;
  }

  async poll(polling, options) {
    if (typeof polling?.command !== 'string' || !polling.arguments || typeof polling.arguments !== 'object')
      throw new UnityCliError('invalid_polling_receipt', 'Keep the original published polling command and arguments.');
    return this.command(polling.command, polling.arguments, options);
  }

  close() {
    this.#retire('client_closed', 'The caller closed this CLI client; explicitly reconnect or create a new instance to resume saved receipts.');
  }

  #receive(chunk) {
    if (this.#failure) return;
    let offset = 0;
    while (offset < chunk.length) {
      const newline = chunk.indexOf(10, offset);
      const end = newline < 0 ? chunk.length : newline;
      const needed = this.#frameLength + end - offset;
      if (needed > maximumFrameBytes) {
        this.#retire('cli_protocol_limit', 'Official CLI response frame exceeds 8 MiB.');
        return;
      }
      if (needed > this.#frame.length) {
        const grown = Buffer.alloc(Math.min(maximumFrameBytes, Math.max(needed, this.#frame.length * 2)));
        this.#frame.copy(grown, 0, 0, this.#frameLength);
        this.#frame = grown;
      }
      chunk.copy(this.#frame, this.#frameLength, offset, end);
      this.#frameLength = needed;
      if (newline < 0) return;
      let response;
      try {
        response = JSON.parse(this.#frame.subarray(0, this.#frameLength).toString('utf8'));
      } catch {
        this.#retire('cli_protocol_invalid', 'Official CLI emitted malformed NDJSON.');
        return;
      }
      this.#frameLength = 0;
      const pending = this.#pending.get(response.id);
      if (!pending) {
        this.#retire('cli_protocol_invalid', 'Official CLI returned an unknown response identity.');
        return;
      }
      clearTimeout(pending.timer);
      this.#pending.delete(response.id);
      pending.resolve(response);
      offset = newline + 1;
    }
  }

  #retire(code, message, details = {}) {
    if (this.#failure) return;
    this.#failure = new UnityCliError(code, message, { ...details, stderrTail: this.#stderr.toString('utf8') });
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(this.#failure);
    }
    this.#pending.clear();
    this.#frame = Buffer.alloc(0);
    this.#child.stdin.end();
    if (this.#child.exitCode === null) this.#child.kill();
  }
}

export function createUnityCliClient(options) {
  return new UnityCliClient(options);
}

export function redactCapabilities(value) {
  return JSON.parse(JSON.stringify(value, (key, entry) =>
    typeof entry === 'string' && /^(?:jobAccessToken|buildJobAccessToken|job_access_token|cleanupToken|cleanup_token)$/i.test(key)
      ? '[redacted]' : entry));
}
