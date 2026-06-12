import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ACCEPT_SCRIPT = path.join(ROOT, 'source/skills/impeccable/scripts/live-accept.mjs');

function withTempProject(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'impeccable-live-accept-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('live accept', () => {
  it('writes JSX-safe carbonize style and wrapper syntax', () => withTempProject((root) => {
    const appPath = path.join(root, 'src/App.jsx');
    fs.mkdirSync(path.dirname(appPath), { recursive: true });
    fs.writeFileSync(appPath, `export function App() {
  return (
    <main>
      {/* impeccable-variants-start abc123 */}
      <div data-impeccable-variants="abc123" data-impeccable-variant-count="2">
        <style data-impeccable-css="abc123">{\`
          @scope ([data-impeccable-variant="2"]) {
            .card { color: red; }
          }
        \`}</style>
        <div data-impeccable-variant="original">
          <section className="card">Original</section>
        </div>
        <div data-impeccable-variant="2">
          <section className="card">Accepted</section>
        </div>
      </div>
      {/* impeccable-variants-end abc123 */}
    </main>
  );
}
`);

    const result = spawnSync(process.execPath, [ACCEPT_SCRIPT, '--id', 'abc123', '--variant', '2'], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.handled, true);
    assert.equal(output.carbonize, true);

    const updated = fs.readFileSync(appPath, 'utf8');
    assert.match(updated, /<style data-impeccable-css="abc123">\{`/);
    assert.match(updated, /`}\s*<\/style>/);
    assert.match(updated, /<div data-impeccable-variant="2" style=\{\{ display: 'contents' \}\}>/);
    assert.match(updated, /<section className="card">Accepted<\/section>/);
    assert.doesNotMatch(updated, /style="display: contents"/);
    assert.doesNotMatch(updated, /Original/);
  }));
});
