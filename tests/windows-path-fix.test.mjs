import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Windows path doubling fix', () => {
  test('fileURLToPath handles POSIX file URLs correctly', () => {
    const posixUrl = new URL('file:///home/user/cli/engine/detect-antipatterns.mjs');
    assert.equal(fileURLToPath(posixUrl), '/home/user/cli/engine/detect-antipatterns.mjs');
  });

  test('source file no longer uses raw URL pathname for local path construction', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'cli', 'engine', 'detect-antipatterns.mjs'),
      'utf8'
    );

    const pathnameBugPattern = /path\.(resolve|join|dirname)\(\s*new URL\(import\.meta\.url\)\.pathname/g;
    assert.equal(src.match(pathnameBugPattern), null);
    assert.match(src, /fileURLToPath\(import\.meta\.url\)/);
  });
});
