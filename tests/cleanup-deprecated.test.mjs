import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  findProjectRoot,
  isImpeccableSkill,
  buildTargetNames,
  findSkillsDirs,
  removeDeprecatedSkills,
  cleanSkillsLock,
  cleanup,
} from '../source/skills/impeccable/scripts/cleanup-deprecated.mjs';

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), 'impeccable-cleanup-test-'));
}

function writeSkill(root, name, content) {
  const dir = join(root, 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), content, 'utf-8');
  return dir;
}

describe('cleanup-deprecated (codex-only)', () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmpDir();
    writeFileSync(join(tmp, 'package.json'), '{}', 'utf-8');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('findProjectRoot', () => {
    it('finds directory with package.json', () => {
      const sub = join(tmp, 'a', 'b', 'c');
      mkdirSync(sub, { recursive: true });
      assert.equal(findProjectRoot(sub), tmp);
    });

    it('finds directory with skills-lock.json', () => {
      const root2 = makeTmpDir();
      writeFileSync(join(root2, 'skills-lock.json'), '{}', 'utf-8');
      assert.equal(findProjectRoot(root2), root2);
      rmSync(root2, { recursive: true, force: true });
    });
  });

  describe('isImpeccableSkill', () => {
    it('returns true when SKILL.md mentions impeccable', () => {
      const dir = writeSkill(tmp, 'arrange', 'Invoke $impeccable first.');
      assert.equal(isImpeccableSkill(dir), true);
    });

    it('returns false when SKILL.md does not mention impeccable', () => {
      const dir = writeSkill(tmp, 'arrange', 'This is my custom arrange skill.');
      assert.equal(isImpeccableSkill(dir), false);
    });
  });

  describe('buildTargetNames', () => {
    it('includes both unprefixed and i-prefixed names', () => {
      const names = buildTargetNames();
      assert.ok(names.includes('arrange'));
      assert.ok(names.includes('i-arrange'));
      assert.ok(names.includes('extract'));
      assert.ok(names.includes('i-extract'));
      assert.equal(names.length, 12);
    });
  });

  describe('findSkillsDirs', () => {
    it('finds the Codex plugin skills directory when it exists', () => {
      mkdirSync(join(tmp, 'skills'), { recursive: true });
      assert.deepEqual(findSkillsDirs(tmp), [join(tmp, 'skills')]);
    });

    it('returns an empty list when the Codex plugin skills directory is absent', () => {
      assert.deepEqual(findSkillsDirs(tmp), []);
    });
  });

  describe('removeDeprecatedSkills', () => {
    it('deletes Codex-owned deprecated skill directories', () => {
      writeSkill(tmp, 'arrange', 'Invoke $impeccable first.');
      writeSkill(tmp, 'normalize', 'Run $impeccable teach.');
      const deleted = removeDeprecatedSkills(tmp);

      assert.equal(deleted.length, 2);
      assert.equal(existsSync(join(tmp, 'skills', 'arrange')), false);
      assert.equal(existsSync(join(tmp, 'skills', 'normalize')), false);
    });

    it('does not delete unrelated skills', () => {
      writeSkill(tmp, 'arrange', 'My custom layout organizer.');
      const deleted = removeDeprecatedSkills(tmp);

      assert.equal(deleted.length, 0);
      assert.equal(existsSync(join(tmp, 'skills', 'arrange')), true);
    });

    it('deletes i-prefixed variants', () => {
      writeSkill(tmp, 'i-normalize', 'Invoke $impeccable first.');
      const deleted = removeDeprecatedSkills(tmp);

      assert.equal(deleted.length, 1);
      assert.equal(existsSync(join(tmp, 'skills', 'i-normalize')), false);
    });
  });

  describe('cleanSkillsLock', () => {
    it('removes deprecated entries from the current fork source only', () => {
      const lock = {
        version: 1,
        skills: {
          arrange: { source: 'MaxFabian25/impeccable', sourceType: 'github', computedHash: 'abc' },
          extract: { source: 'MaxFabian25/impeccable', sourceType: 'github', computedHash: 'def' },
          polish: { source: 'some-other/package', sourceType: 'github', computedHash: 'ghi' },
        },
      };
      writeFileSync(join(tmp, 'skills-lock.json'), JSON.stringify(lock), 'utf-8');

      const removed = cleanSkillsLock(tmp);
      assert.deepEqual(removed, ['arrange', 'extract']);

      const updated = JSON.parse(readFileSync(join(tmp, 'skills-lock.json'), 'utf-8'));
      assert.equal(updated.skills.arrange, undefined);
      assert.equal(updated.skills.extract, undefined);
      assert.ok(updated.skills.polish);
    });

    it('does not remove entries from other sources', () => {
      const lock = {
        version: 1,
        skills: {
          extract: { source: 'some-other/package', sourceType: 'github', computedHash: 'xyz' },
        },
      };
      writeFileSync(join(tmp, 'skills-lock.json'), JSON.stringify(lock), 'utf-8');

      const removed = cleanSkillsLock(tmp);
      assert.equal(removed.length, 0);
    });
  });

  describe('cleanup integration', () => {
    it('cleans skill folders and lock entries in one pass', () => {
      writeSkill(tmp, 'arrange', 'Invoke $impeccable.');
      writeSkill(tmp, 'extract', 'Run $impeccable extract.');

      const lock = {
        version: 1,
        skills: {
          arrange: { source: 'MaxFabian25/impeccable', sourceType: 'github', computedHash: 'a' },
          extract: { source: 'MaxFabian25/impeccable', sourceType: 'github', computedHash: 'b' },
          polish: { source: 'some-other/package', sourceType: 'github', computedHash: 'c' },
        },
      };
      writeFileSync(join(tmp, 'skills-lock.json'), JSON.stringify(lock), 'utf-8');

      const result = cleanup(tmp);
      assert.equal(result.deletedPaths.length, 2);
      assert.equal(result.removedLockEntries.length, 2);
      assert.equal(existsSync(join(tmp, 'skills', 'arrange')), false);
      assert.equal(existsSync(join(tmp, 'skills', 'extract')), false);
    });
  });
});
