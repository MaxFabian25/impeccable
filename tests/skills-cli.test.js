import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SKILLS_DIR_NAME,
  installBundleIntoRoot,
  isAlreadyInstalled,
  detectPrefix,
  renameSkillsWithPrefix,
  undoPrefix,
  isUpToDate,
} from '../bin/commands/skills.mjs';

const REPO_ROOT = join(import.meta.dir, '..');
const CLI_PATH = join(REPO_ROOT, 'bin', 'cli.js');

function createFakeCodexSkills(root, skills = ['audit', 'polish', 'impeccable']) {
  for (const skill of skills) {
    const skillDir = join(root, 'skills', skill);
    mkdirSync(skillDir, { recursive: true });
    const extraBody = skill === 'impeccable'
      ? '\nnode skills/impeccable/scripts/cleanup-deprecated.mjs'
      : '';
    writeFileSync(join(skillDir, 'SKILL.md'), [
      '---',
      `name: ${skill}`,
      'argument-hint: "[area]"',
      '---',
      '',
      'Run $audit first, then $polish to finish.',
      'Use the impeccable skill for setup.',
      extraBody,
    ].join('\n'));
  }
}

function runSkillsCli(cwd, args) {
  return spawnSync('node', [CLI_PATH, 'skills', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

describe('codex-only installer contract', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'imp-test-cli-'));
  });

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test('uses skills as the only install root', () => {
    expect(SKILLS_DIR_NAME).toBe('skills');
  });

  test('detects an existing Codex install', () => {
    createFakeCodexSkills(tmp);
    expect(isAlreadyInstalled(tmp)).toBe('skills');
  });

  test('ignores non-Codex harness directories', () => {
    const skillDir = join(tmp, '.legacy', 'skills', 'impeccable');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: impeccable\n---\n');

    expect(isAlreadyInstalled(tmp)).toBe(null);
  });

  test('renames codex skills with a prefix and updates references', () => {
    createFakeCodexSkills(tmp);

    const renamed = renameSkillsWithPrefix(tmp, 'i-');

    expect(renamed).toBe(3);
    expect(readdirSync(join(tmp, 'skills')).sort()).toEqual([
      'i-audit',
      'i-impeccable',
      'i-polish',
    ]);

    const content = readFileSync(join(tmp, 'skills', 'i-audit', 'SKILL.md'), 'utf8');
    expect(content).toContain('name: i-audit');
    expect(content).toContain('$i-audit');
    expect(content).toContain('$i-polish');
    expect(content).toContain('the i-impeccable skill');

    const impeccableContent = readFileSync(join(tmp, 'skills', 'i-impeccable', 'SKILL.md'), 'utf8');
    expect(impeccableContent).toContain('node skills/i-impeccable/scripts/cleanup-deprecated.mjs');
  });

  test('rejects unsafe prefixes before mutating skills', () => {
    createFakeCodexSkills(tmp);

    expect(() => renameSkillsWithPrefix(tmp, '../x-')).toThrow(/prefix/i);
    expect(readdirSync(join(tmp, 'skills')).sort()).toEqual([
      'audit',
      'impeccable',
      'polish',
    ]);
  });

  test('detects the active prefix from codex skills', () => {
    createFakeCodexSkills(tmp);
    renameSkillsWithPrefix(tmp, 'x-');

    expect(detectPrefix(tmp)).toBe('x-');
  });

  test('undoPrefix restores the canonical codex skill names', () => {
    createFakeCodexSkills(tmp);
    renameSkillsWithPrefix(tmp, 'x-');

    undoPrefix(tmp, 'x-');

    expect(readdirSync(join(tmp, 'skills')).sort()).toEqual([
      'audit',
      'impeccable',
      'polish',
    ]);

    const content = readFileSync(join(tmp, 'skills', 'audit', 'SKILL.md'), 'utf8');
    expect(content).toContain('name: audit');
    expect(content).toContain('$audit');
    expect(content).toContain('$polish');
    expect(content).toContain('the impeccable skill');
  });

  test('prefixing only mutates the codex skill tree', () => {
    createFakeCodexSkills(tmp, ['audit']);
    const otherSkillDir = join(tmp, '.legacy', 'skills', 'audit');
    mkdirSync(otherSkillDir, { recursive: true });
    writeFileSync(join(otherSkillDir, 'SKILL.md'), '---\nname: audit\n---\n');

    renameSkillsWithPrefix(tmp, 'i-');

    expect(existsSync(join(tmp, '.legacy', 'skills', 'audit', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, '.legacy', 'skills', 'i-audit', 'SKILL.md'))).toBe(false);
  });

  test('prefixing can be scoped to bundle-managed skills only', () => {
    createFakeCodexSkills(tmp, ['audit', 'impeccable']);
    const customSkillDir = join(tmp, 'skills', 'custom');
    mkdirSync(customSkillDir, { recursive: true });
    writeFileSync(join(customSkillDir, 'SKILL.md'), '---\nname: custom\n---\nRun $custom.\n');

    const renamed = renameSkillsWithPrefix(tmp, 'i-', ['audit', 'impeccable']);

    expect(renamed).toBe(2);
    expect(existsSync(join(tmp, 'skills', 'i-audit', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, 'skills', 'i-impeccable', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, 'skills', 'custom', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, 'skills', 'i-custom', 'SKILL.md'))).toBe(false);
  });

  test('plugin manifest drift marks the install as outdated', () => {
    createFakeCodexSkills(tmp, ['audit', 'impeccable']);
    mkdirSync(join(tmp, '.codex-plugin'), { recursive: true });
    writeFileSync(join(tmp, '.codex-plugin', 'plugin.json'), '{"version":"2.1.7"}\n');

    const bundleRoot = join(tmp, 'bundle');
    createFakeCodexSkills(bundleRoot, ['audit', 'impeccable']);
    mkdirSync(join(bundleRoot, '.codex-plugin'), { recursive: true });
    writeFileSync(join(bundleRoot, '.codex-plugin', 'plugin.json'), '{"version":"2.1.8"}\n');

    expect(isUpToDate(tmp, bundleRoot)).toBe(false);
  });

  test('bundled script drift marks the install as outdated', () => {
    createFakeCodexSkills(tmp, ['impeccable']);
    mkdirSync(join(tmp, 'skills', 'impeccable', 'scripts'), { recursive: true });
    writeFileSync(
      join(tmp, 'skills', 'impeccable', 'scripts', 'cleanup-deprecated.mjs'),
      'export const version = "local";\n'
    );

    const bundleRoot = join(tmp, 'bundle');
    createFakeCodexSkills(bundleRoot, ['impeccable']);
    mkdirSync(join(bundleRoot, 'skills', 'impeccable', 'scripts'), { recursive: true });
    writeFileSync(
      join(bundleRoot, 'skills', 'impeccable', 'scripts', 'cleanup-deprecated.mjs'),
      'export const version = "bundle";\n'
    );

    expect(isUpToDate(tmp, bundleRoot)).toBe(false);
  });

  test('retired managed skills mark the install as outdated', () => {
    createFakeCodexSkills(tmp, ['audit', 'impeccable']);
    const staleSkillDir = join(tmp, 'skills', 'normalize');
    mkdirSync(staleSkillDir, { recursive: true });
    writeFileSync(join(staleSkillDir, 'SKILL.md'), '---\nname: normalize\n---\n');

    const bundleRoot = join(tmp, 'bundle');
    createFakeCodexSkills(bundleRoot, ['audit', 'impeccable']);

    expect(isUpToDate(tmp, bundleRoot)).toBe(false);
  });

  test('cli install rejects unsafe prefixes without creating a Codex skill tree', () => {
    const result = runSkillsCli(tmp, ['install', '--yes', '--prefix=../x-']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Install failed');
    expect(existsSync(join(tmp, 'skills'))).toBe(false);
  });

  test('cli install fails atomically when another Codex plugin already owns plugin.json', () => {
    mkdirSync(join(tmp, '.codex-plugin'), { recursive: true });
    writeFileSync(
      join(tmp, '.codex-plugin', 'plugin.json'),
      JSON.stringify({ name: 'other-plugin', repository: 'https://example.com/other' }, null, 2)
    );
    mkdirSync(join(tmp, 'skills', 'custom'), { recursive: true });
    writeFileSync(join(tmp, 'skills', 'custom', 'SKILL.md'), '---\nname: custom\n---\n');

    const result = runSkillsCli(tmp, ['install', '--yes']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('another Codex plugin');
    expect(readdirSync(join(tmp, 'skills')).sort()).toEqual(['custom']);
    expect(existsSync(join(tmp, 'skills', 'impeccable'))).toBe(false);
  });

  test('bundle install preserves custom unprefixed skill names when managed skills are prefixed', () => {
    createFakeCodexSkills(tmp, ['audit', 'impeccable']);
    renameSkillsWithPrefix(tmp, 'i-', ['audit', 'impeccable']);

    const customSkillDir = join(tmp, 'skills', 'audit');
    mkdirSync(customSkillDir, { recursive: true });
    writeFileSync(join(customSkillDir, 'SKILL.md'), '---\nname: audit\n---\nRun $audit.\n');

    const bundleRoot = join(tmp, 'bundle');
    createFakeCodexSkills(bundleRoot, ['audit', 'impeccable']);

    expect(() => installBundleIntoRoot(tmp, bundleRoot, 'i-')).not.toThrow();
    expect(existsSync(join(tmp, 'skills', 'audit', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, 'skills', 'i-audit', 'SKILL.md'))).toBe(true);
  });
});
