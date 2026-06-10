import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 3897;
const BASE = `http://127.0.0.1:${PORT}`;

let child;
let cwd;
let token;
let output = '';

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 10000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(`http://localhost:${PORT}`) || output.includes(`http://127.0.0.1:${PORT}`)) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  });
}

async function stopServer() {
  if (!child) return;
  try {
    await fetch(`${BASE}/stop`);
  } catch {
    // The process may exit before the response body is consumed.
  }
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve();
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  child = null;
}

before(async () => {
  cwd = realpathSync(mkdtempSync(path.join(tmpdir(), 'impeccable-live-test-')));
  child = spawn(process.execPath, [path.join(ROOT, 'bin/cli.js'), 'live', `--port=${PORT}`], {
    cwd,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer();
  const script = await fetch(`${BASE}/detect.js`).then((res) => res.text());
  const match = script.match(/__IMPECCABLE_LIVE_TOKEN__="([^"]+)"/);
  assert.ok(match, 'detect.js exposes a live token for annotation requests');
  token = match[1];
});

after(async () => {
  await stopServer();
  if (cwd) rmSync(cwd, { recursive: true, force: true });
});

describe('live annotation server', () => {
  it('serves the injected browser script with annotation hooks', async () => {
    const script = await fetch(`${BASE}/detect.js`).then((res) => res.text());
    assert.match(script, /impeccable-annot-overlay/);
    assert.match(script, /modern-screenshot\.js/);
    assert.match(script, /\/annotation\?token=/);
  });

  it('serves the modern-screenshot browser build', async () => {
    const res = await fetch(`${BASE}/modern-screenshot.js`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/javascript');
    const text = await res.text();
    assert.match(text, /modernScreenshot/);
    assert.match(text, /domToPng/);
  });

  it('reports annotation support in health', async () => {
    const health = await fetch(`${BASE}/health`).then((res) => res.json());
    assert.equal(health.status, 'ok');
    assert.equal(health.hasAnnotationQueue, true);
  });

  it('rejects invalid annotation uploads', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const badToken = await fetch(`${BASE}/annotation?token=wrong&eventId=annot-1`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: png,
    });
    assert.equal(badToken.status, 401);

    const badId = await fetch(`${BASE}/annotation?token=${token}&eventId=has%20spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: png,
    });
    assert.equal(badId.status, 400);

    const badType = await fetch(`${BASE}/annotation?token=${token}&eventId=annot-1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: png,
    });
    assert.equal(badType.status, 415);
  });

  it('stores uploaded PNG captures under .impeccable-live', async () => {
    const eventId = `annot-${Date.now().toString(36)}`;
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    ]);
    const res = await fetch(`${BASE}/annotation?token=${token}&eventId=${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: png,
    });
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.ok, true);
    assert.equal(readFileSync(payload.path).length, png.length);
    assert.ok(realpathSync(payload.path).startsWith(path.join(cwd, '.impeccable-live', 'annotations')));
  });

  it('queues annotation events with comments and strokes for polling', async () => {
    const id = `annot-${Date.now().toString(36)}-event`;
    const post = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        type: 'annotation',
        id,
        pageUrl: 'http://example.test/page',
        screenshotPath: path.join(cwd, '.impeccable-live', 'annotations', 'fake.png'),
        comments: [{ x: 10.22, y: 20.25, text: 'tighten this spacing' }],
        strokes: [{ points: [[1, 2], [3.44, 4.45]] }],
        element: { selector: '#hero', tagName: 'section', outerHTML: '<section id="hero"></section>' },
      }),
    });
    assert.equal(post.status, 200);

    const event = await fetch(`${BASE}/poll?token=${token}&timeout=1000`).then((res) => res.json());
    assert.equal(event.id, id);
    assert.equal(event.type, 'annotation');
    assert.equal(event.comments[0].text, 'tighten this spacing');
    assert.deepEqual(event.strokes[0].points[1], [3.4, 4.5]);
    assert.equal(event.element.selector, '#hero');
  });

  it('rejects malformed annotation event fields', async () => {
    const res = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        type: 'annotation',
        id: 'annot-bad',
        comments: 'not an array',
      }),
    });
    assert.equal(res.status, 400);
    const payload = await res.json();
    assert.match(payload.error, /comments/);
  });
});
