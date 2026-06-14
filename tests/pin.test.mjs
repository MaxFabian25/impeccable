import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  pinCommand,
  renderShortcut,
  unpinCommand,
} from '../skills/impeccable/scripts/pin.mjs';

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), 'impeccable-pin-test-'));
}

describe('pin shortcuts (codex-only)', () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('creates a managed project-local shortcut', () => {
    const result = pinCommand({ projectRoot: tmp, command: 'craft' });
    const skillFile = join(tmp, 'skills', 'craft', 'SKILL.md');

    assert.equal(result.changed, true);
    assert.equal(result.skillFile, skillFile);
    assert.equal(existsSync(skillFile), true);

    const content = readFileSync(skillFile, 'utf-8');
    assert.match(content, /name: craft/);
    assert.match(content, /\$impeccable craft/);
    assert.match(content, /<!-- impeccable-pin command="craft" -->/);
  });

  it('treats an existing managed shortcut as already pinned', () => {
    pinCommand({ projectRoot: tmp, command: 'craft' });
    const result = pinCommand({ projectRoot: tmp, command: 'craft' });

    assert.equal(result.changed, false);
    assert.match(result.message, /Already pinned/);
  });

  it('refuses to overwrite an unmanaged skill', () => {
    const skillDir = join(tmp, 'skills', 'craft');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# My custom craft skill\n', 'utf-8');

    assert.throws(
      () => pinCommand({ projectRoot: tmp, command: 'craft' }),
      /Refusing to overwrite existing skill/,
    );
  });

  it('refuses to write into a non-empty skill directory', () => {
    const skillDir = join(tmp, 'skills', 'craft');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'notes.md'), 'custom notes\n', 'utf-8');

    assert.throws(
      () => pinCommand({ projectRoot: tmp, command: 'craft' }),
      /Refusing to write into non-empty skill directory/,
    );
  });

  it('removes only managed shortcuts', () => {
    pinCommand({ projectRoot: tmp, command: 'document' });
    const skillDir = join(tmp, 'skills', 'document');
    const skillFile = join(skillDir, 'SKILL.md');

    const result = unpinCommand({ projectRoot: tmp, command: 'document' });

    assert.equal(result.changed, true);
    assert.equal(existsSync(skillFile), false);
    assert.equal(existsSync(skillDir), false);
  });

  it('refuses to remove an unmanaged skill', () => {
    const skillDir = join(tmp, 'skills', 'document');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# My custom document skill\n', 'utf-8');

    assert.throws(
      () => unpinCommand({ projectRoot: tmp, command: 'document' }),
      /Refusing to remove unmanaged skill/,
    );
  });

  it('rejects standalone commands that already ship as Codex skills', () => {
    assert.throws(
      () => pinCommand({ projectRoot: tmp, command: 'audit' }),
      /already ship as Codex skills/,
    );
  });

  it('renders the argument hint for commands that accept a target', () => {
    const content = renderShortcut('extract');

    assert.match(content, /argument-hint: "\[target\]"/);
  });
});
