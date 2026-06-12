import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { patchCspMeta, resolveFiles, revertCspMeta, validateConfig } from '../source/skills/impeccable/scripts/live-inject.mjs';

function withTempProject(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'impeccable-live-inject-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relPath) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, '<!doctype html><body></body>');
}

describe('live inject config resolution', () => {
  it('expands globs, applies excludes, and preserves literal missing files', () => withTempProject((root) => {
    write(root, 'public/index.html');
    write(root, 'public/docs/page.html');
    write(root, 'public/email/template.html');
    write(root, 'node_modules/pkg/index.html');
    write(root, '.git/hooks/page.html');

    const files = resolveFiles(root, {
      files: ['missing.html', 'public/**/*.html', 'node_modules/**/*.html', '.git/**/*.html'],
      exclude: ['public/email/**'],
    });

    assert.equal(files[0], 'missing.html');
    assert.ok(files.includes('public/index.html'));
    assert.ok(files.includes('public/docs/page.html'));
    assert.ok(!files.includes('public/email/template.html'));
    assert.ok(!files.includes('node_modules/pkg/index.html'));
    assert.ok(!files.includes('.git/hooks/page.html'));
  }));

  it('validates optional exclude as a non-empty string array', () => {
    assert.doesNotThrow(() => validateConfig({
      files: ['public/**/*.html'],
      exclude: ['public/email/**'],
      insertBefore: '</body>',
      commentSyntax: 'html',
    }));

    assert.throws(() => validateConfig({
      files: ['public/**/*.html'],
      exclude: 'public/email/**',
      insertBefore: '</body>',
      commentSyntax: 'html',
    }), /config\.exclude/);
  });

  it('patches and exactly restores in-document CSP meta tags', () => {
    const html = '<!doctype html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'"></head><body></body>';
    const patched = patchCspMeta(html, 4173);

    assert.match(patched, /data-impeccable-csp-original="/);
    assert.match(patched, /script-src 'self' http:\/\/localhost:4173/);
    assert.match(patched, /connect-src 'self' http:\/\/localhost:4173/);
    assert.match(patched, /img-src 'self' blob:/);
    assert.equal(patchCspMeta(patched, 4173), patched);
    assert.equal(revertCspMeta(patched), html);
  });

  it('preserves space before self-closing CSP meta slash when patching and reverting', () => {
    const html = '<!doctype html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; connect-src \'self\';" /></head><body></body>';
    const patched = patchCspMeta(html, 8400);

    assert.match(patched, /data-impeccable-csp-original="[^"]+" \/>/);
    assert.equal(patchCspMeta(patched, 8400), patched);
    assert.equal(revertCspMeta(patched), html);
  });
});
