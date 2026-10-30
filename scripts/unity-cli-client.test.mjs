import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnityCliClient, redactCapabilities } from './unity-cli-client.mjs';

class FakeProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.exitCode = null;
    this.requests = [];
    this.stdin = new Writable({ write: (chunk, encoding, done) => {
      this.requests.push(JSON.parse(chunk.toString('utf8')));
      done();
    } });
  }
  kill() { this.exitCode = -1; this.emit('exit', -1, 'SIGTERM'); }
  reply(id, result, success = true) {
    this.stdout.write(JSON.stringify({ id, envelope: { success, data: { result },
      errors: success ? [] : [{ code: 'native-example', message: 'Native rejection evidence.' }] } }) + '\n');
  }
}

function fixture() {
  const child = new FakeProcess();
  const client = createUnityCliClient({ executablePath: 'unity', projectPath: path.resolve('fixture'),
    spawnProcess: (executable, argv, options) => {
      assert.equal(executable, 'unity');
      assert.deepEqual(argv, ['--non-interactive', '--no-banner', 'shell', '--protocol', 'ndjson']);
      assert.equal(options.windowsHide, true);
      return child;
    } });
  return { child, client };
}

test('public receipt redaction preserves the private original and job evidence', () => {
  const privateReceipt = { result: { jobId: 'job', jobAccessToken: 'private' },
    polling: { command: 'vm_job_status', arguments: { job_access_token: 'private' } } };
  const publicReceipt = redactCapabilities(privateReceipt);
  assert.equal(privateReceipt.result.jobAccessToken, 'private');
  assert.equal(publicReceipt.result.jobId, 'job');
  assert.equal(publicReceipt.result.jobAccessToken, '[redacted]');
  assert.equal(publicReceipt.polling.arguments.job_access_token, '[redacted]');
});

test('redaction preserves catalog schema definitions while removing actual credential strings', () => {
  const value = { contract: { inputSchema: { properties: {
    jobAccessToken: { type: 'string', minLength: 1, description: 'Owner capability.' }
  } } }, result: { jobAccessToken: 'private' } };
  const result = redactCapabilities(value);
  assert.deepEqual(result.contract, value.contract);
  assert.equal(result.result.jobAccessToken, '[redacted]');
});

test('correlates concurrent replies without losing the published polling receipt', async () => {
  const { child, client } = fixture();
  const first = client.automation('sample', { quote: 'a "quoted" value' });
  const second = client.command('vm_catalog_status');
  const owner = { ok: true, result: { jobId: 'job' }, polling: {
    command: 'vm_job_status', arguments: { job_id: 'job', job_type: 'workspace', job_access_token: 'private-capability' }
  } };
  child.reply(child.requests[1].id, { count: 2 });
  child.reply(child.requests[0].id, owner);
  assert.deepEqual(await first, owner);
  assert.deepEqual(await second, { count: 2 });
  const poll = client.poll(owner.polling);
  assert.deepEqual(child.requests[2].argv.slice(-6),
    ['--job_id', 'job', '--job_type', 'workspace', '--job_access_token', 'private-capability']);
  child.reply(child.requests[2].id, { status: 'running' });
  assert.deepEqual(await poll, { status: 'running' });
  client.close();
});

test('decodes a multibyte character split between native stdout chunks', async () => {
  const { child, client } = fixture();
  const request = client.command('sample');
  const bytes = Buffer.from(JSON.stringify({ id: child.requests[0].id,
    envelope: { success: true, data: { result: { label: '控制台' } } } }) + '\n');
  const split = bytes.indexOf(Buffer.from('控')) + 1;
  child.stdout.write(bytes.subarray(0, split));
  child.stdout.write(bytes.subarray(split, split + 1));
  child.stdout.write(bytes.subarray(split + 1));
  assert.deepEqual(await request, { label: '控制台' });
  client.close();
});

test('large payloads use the native arguments_file contract with caller-owned lifetime', async () => {
  const { child, client } = fixture();
  const file = path.join(client.projectPath, 'Temp', '参数 file.json');
  const request = client.automationFromFile('sample', file);
  const argv = child.requests[0].argv;
  assert.equal(argv[argv.indexOf('--arguments_file') + 1], file);
  assert.equal(argv.includes('--arguments_json'), false);
  assert.equal(argv[argv.indexOf('--expected_project_path') + 1], client.projectPath);
  const owner = { ok: true, result: { jobId: 'native-job' }, polling: {
    command: 'vm_job_status', arguments: { job_id: 'native-job', job_access_token: 'private' }
  } };
  child.reply(child.requests[0].id, owner);
  assert.deepEqual(await request, owner);
  client.close();
});

test('close rejects in-flight callers and rejects later reuse immediately', async () => {
  const { child, client } = fixture();
  const first = client.command('pending');
  client.close();
  await assert.rejects(first, { code: 'client_closed' });
  await assert.rejects(client.command('after-close'), { code: 'client_closed' });
  assert.equal(child.requests.length, 1);
});

test('a fresh factory instance works even if its imported module stays cached', async () => {
  const first = fixture();
  first.client.close();
  const second = fixture();
  const pending = second.client.command('state');
  second.child.reply(second.child.requests[0].id, { fresh: true });
  assert.deepEqual(await pending, { fresh: true });
  second.client.close();
});

for (const [event, code] of [['error', 'cli_process_error'], ['exit', 'cli_exited']]) {
  test(`process ${event} rejects every pending caller`, async () => {
    const { child, client } = fixture();
    const first = client.command('one'), second = client.command('two');
    if (event === 'error') child.emit('error', new Error('owned spawn failure'));
    else { child.exitCode = 7; child.emit('exit', 7, null); }
    await assert.rejects(first, { code });
    await assert.rejects(second, { code });
  });
}

test('a pipe failure does not leave an unresolved promise', async () => {
  const { child, client } = fixture();
  const pending = client.command('one');
  child.stdin.emit('error', new Error('closed pipe'));
  await assert.rejects(pending, { code: 'cli_pipe_error' });
});

test('truncated EOF and malformed frames expose protocol failure', async () => {
  for (const partial of [true, false]) {
    const { child, client } = fixture();
    const pending = client.command('one');
    child.stdout.write(partial ? '{"id":' : 'bad-json\n');
    if (partial) child.stdout.end();
    await assert.rejects(pending, { code: partial ? 'cli_eof' : 'cli_protocol_invalid' });
  }
});

test('response identity mismatch fails instead of discarding the response', async () => {
  const { child, client } = fixture();
  const pending = client.command('one');
  child.reply('unrecognized', {});
  await assert.rejects(pending, { code: 'cli_protocol_invalid' });
});

test('deadline retires observation without replaying the request', async () => {
  const { child, client } = fixture();
  await assert.rejects(client.command('mutation', {}, { timeoutMs: 20 }), { code: 'cli_deadline' });
  assert.equal(child.requests.length, 1);
});

test('transport and domain failures remain distinct', async () => {
  const first = fixture(), second = fixture();
  const transport = first.client.command('sample');
  first.child.reply(first.child.requests[0].id, {}, false);
  await assert.rejects(transport, error => error.code === 'cli_command_failed' &&
    error.message === 'native-example: Native rejection evidence.');
  const domain = second.client.automation('sample');
  second.child.reply(second.child.requests[0].id, { ok: false,
    error: { code: 'domain-example', message: 'Domain rejection evidence.', retryable: false } });
  await assert.rejects(domain, error => error.code === 'automation_failed' &&
    error.message === 'sample: domain-example: Domain rejection evidence.' &&
    error.details.owner.error.code === 'domain-example');
  first.client.close(); second.client.close();
});

test('the original discovery misuse exposes its native command_not_found explanation', async () => {
  const { child, client } = fixture();
  const pending = client.automation('vm_catalog_list', { query: 'player' });
  const owner = { ok: false, command: 'vm_catalog_list',
    error: { code: 'command_not_found', message: "Automation command 'vm_catalog_list' was not found.", retryable: false } };
  child.reply(child.requests[0].id, owner);
  await assert.rejects(pending, error => {
    assert.match(error.message, /command_not_found/);
    assert.match(error.message, /Automation command 'vm_catalog_list' was not found/);
    assert.deepEqual(error.details.owner, owner);
    return true;
  });
  assert.equal(child.requests.length, 1);
  client.close();
});

test('serializing a native failure redacts capabilities without changing its private receipt', async () => {
  const { child, client } = fixture();
  const pending = client.automation('sample');
  child.reply(child.requests[0].id, { ok: false,
    error: { code: 'owned-failure', message: 'An owned operation failed.' },
    result: { jobId: 'owned-job', jobAccessToken: 'private-capability' } });
  await assert.rejects(pending, error => {
    const publicError = JSON.parse(JSON.stringify(error));
    assert.equal(error.details.owner.result.jobAccessToken, 'private-capability');
    assert.equal(publicError.details.owner.result.jobAccessToken, '[redacted]');
    assert.equal(publicError.details.owner.result.jobId, 'owned-job');
    return true;
  });
  client.close();
});

test('malformed domain failure is a protocol defect rather than a generic domain rejection', async () => {
  const { child, client } = fixture();
  const pending = client.automation('sample');
  child.reply(child.requests[0].id, { ok: false });
  await assert.rejects(pending, { code: 'cli_protocol_invalid' });
  client.close();
});

test('request concurrency and response bytes have explicit bounds', async () => {
  const first = fixture();
  const pending = Array.from({ length: 8 }, () => first.client.command('pending'));
  await assert.rejects(first.client.command('ninth'), { code: 'client_request_limit' });
  first.client.close();
  await Promise.all(pending.map(item => assert.rejects(item, { code: 'client_closed' })));
  const second = fixture();
  const overflow = second.client.command('overflow');
  second.child.stdout.write(Buffer.alloc(8 * 1024 * 1024 + 1, 65));
  await assert.rejects(overflow, { code: 'cli_protocol_limit' });
});

function reconnectFixture() {
  const children = [new FakeProcess(), new FakeProcess()];
  let created = 0;
  const client = createUnityCliClient({ executablePath: 'unity', projectPath: path.resolve('fixture'),
    spawnProcess: () => children[created++] });
  return { children, client, created: () => created };
}

test('retained polling closure resumes its original job after explicit reconnect without replay', async () => {
  const { children, client } = reconnectFixture();
  const polling = { command: 'vm_job_status', arguments: {
    job_id: 'original-job', job_access_token: 'original-private-capability' } };
  const retainedPoll = () => client.poll(polling);
  await assert.rejects(client.command('uncertain-mutation', {}, { timeoutMs: 20 }), { code: 'cli_deadline' });
  assert.equal(client.reconnect(), client);
  const resumed = retainedPoll();
  assert.equal(children[0].requests.length, 1);
  assert.equal(children[1].requests.length, 1);
  assert.deepEqual(children[1].requests[0].argv.slice(-6),
    ['vm_job_status', '--', '--job_id', 'original-job', '--job_access_token', 'original-private-capability']);
  children[1].reply(children[1].requests[0].id, { jobId: 'original-job', status: 'succeeded' });
  assert.equal((await resumed).jobId, 'original-job');
  client.close();
});

test('late retired-child events cannot corrupt a replacement connection', async () => {
  const { children, client } = reconnectFixture();
  client.close();
  client.reconnect();
  const pending = client.command('state');
  children[0].stdout.write('invalid old frame\n');
  children[0].stdout.emit('end');
  children[0].stderr.write('retired stderr');
  children[0].stdin.emit('error', new Error('retired pipe'));
  children[0].emit('exit', 9, null);
  children[1].reply(children[1].requests[0].id, { current: true });
  assert.deepEqual(await pending, { current: true });
  client.close();
});

test('reconnect refuses to replace a healthy child or abandon an in-flight request', async () => {
  const { children, client, created } = reconnectFixture();
  const pending = client.command('state');
  assert.throws(() => client.reconnect(), { code: 'client_connected' });
  assert.equal(created(), 1);
  children[0].reply(children[0].requests[0].id, { owned: true });
  assert.deepEqual(await pending, { owned: true });
  client.close();
});

test('cleanup capabilities are redacted in public errors but their schema remains intact', async () => {
  const { child, client } = fixture();
  const request = client.automation('cleanup');
  child.reply(child.requests[0].id, { ok: false, error: { code: 'cleanup-failed', message: 'Cleanup failed.' },
    cleanupToken: 'private-cleanup', details: { cleanup_token: 'private-native-cleanup' },
    schema: { cleanupToken: { type: 'string' } } });
  await assert.rejects(request, error => {
    const publicError = JSON.parse(JSON.stringify(error));
    assert.equal(error.details.owner.cleanupToken, 'private-cleanup');
    assert.equal(publicError.details.owner.cleanupToken, '[redacted]');
    assert.equal(publicError.details.owner.details.cleanup_token, '[redacted]');
    assert.deepEqual(publicError.details.owner.schema.cleanupToken, { type: 'string' });
    return true;
  });
  client.close();
});

test('contract discovery returns the native schema without redacting its capability definitions', async () => {
  const { child, client } = fixture();
  const pending = client.contract('sample');
  const contract = { name: 'sample', inputSchema: { properties: { cleanupToken: { type: 'string' } } } };
  child.reply(child.requests[0].id, { found: true, contract });
  assert.deepEqual(await pending, contract);
  assert.ok(child.requests[0].argv.includes('vm_catalog_get'));
  client.close();
});

test('missing contract reports its native cause instead of returning undefined to file writers', async () => {
  const { child, client } = fixture();
  const pending = client.contract('missing');
  child.reply(child.requests[0].id, { found: false, ok: false, errorCode: 'command_not_found',
    errorMessage: "No contract is registered for 'missing'." });
  await assert.rejects(pending, error => error.code === 'cli_contract_unavailable' &&
    error.message.includes('command_not_found') && error.details.owner.found === false);
  client.close();
});

test('a malformed found-contract result is rejected at the protocol boundary', async () => {
  const { child, client } = fixture();
  const pending = client.contract('malformed');
  child.reply(child.requests[0].id, { found: true });
  await assert.rejects(pending, { code: 'cli_protocol_invalid' });
  client.close();
});
