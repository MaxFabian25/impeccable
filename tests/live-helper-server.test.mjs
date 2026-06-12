import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

import {
  getLiveServerPath,
  getLiveSessionsDir,
} from '../source/skills/impeccable/scripts/impeccable-paths.mjs';

const ROOT = process.cwd();
const SERVER_SCRIPT = path.join(ROOT, 'source/skills/impeccable/scripts/live-server.mjs');

let child = null;
let cwd = null;

afterEach(async () => {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    child = null;
  }
  if (cwd) {
    rmSync(cwd, { recursive: true, force: true });
    cwd = null;
  }
});

describe('skill live helper server recovery integration', () => {
  it('journals browser events, leases them to poll, and records acknowledgements', async () => {
    cwd = mkdtempSync(path.join(tmpdir(), 'impeccable-live-helper-'));
    const port = await findOpenPort();
    const output = [];
    child = spawn(process.execPath, [SERVER_SCRIPT, `--port=${port}`], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));

    await waitFor(() => existsSync(getLiveServerPath(cwd)), () => output.join(''));
    const info = JSON.parse(readFileSync(getLiveServerPath(cwd), 'utf-8'));
    assert.equal(info.port, port);

    const base = `http://127.0.0.1:${port}`;
    const id = 'abcd1234';
    const post = await fetch(`${base}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: info.token,
        type: 'generate',
        id,
        action: 'polish',
        count: 2,
        pageUrl: '/',
        element: { outerHTML: '<section class="hero">Hero</section>' },
      }),
    });
    assert.equal(post.status, 200);
    assert.equal(existsSync(path.join(getLiveSessionsDir(cwd), `${id}.jsonl`)), true);

    const event = await fetch(`${base}/poll?token=${info.token}&timeout=1000&leaseMs=100`).then((res) => res.json());
    assert.equal(event.type, 'generate');
    assert.equal(event.id, id);

    const leasedStatus = await fetch(`${base}/status?token=${info.token}`).then((res) => res.json());
    assert.equal(leasedStatus.pendingEvents[0].leased, true);

    const ack = await fetch(`${base}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: info.token, id, type: 'done', file: 'src/App.jsx' }),
    }).then((res) => res.json());
    assert.equal(ack.ok, true);

    const status = await fetch(`${base}/status?token=${info.token}`).then((res) => res.json());
    assert.equal(status.pendingEvents.length, 0);
    assert.equal(status.activeSessions[0].phase, 'variants_ready');
    assert.equal(status.activeSessions[0].sourceFile, 'src/App.jsx');

    await fetch(`${base}/stop?token=${info.token}`).catch(() => {});
    await new Promise((resolve) => child.once('exit', resolve));
    child = null;
  });
});

function findOpenPort(start = 8720) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findOpenPort(start + 1)));
  });
}

async function waitFor(predicate, getDebug) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for live helper server.\n' + getDebug());
}
