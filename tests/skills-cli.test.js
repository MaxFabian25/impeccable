import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SKILLS_DIR_NAME,
  installBundleIntoRoot,
  isAlreadyInstalled,
  isUpToDate,
} from '../cli/bin/commands/skills.mjs';

const REPO_ROOT = join(import.meta.dir, '..');
const CLI_PATH = join(REPO_ROOT, 'cli', 'bin', 'cli.js');

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

  test('does not treat prefixed legacy skills as an installed canonical bundle', () => {
    createFakeCodexSkills(tmp, ['i-impeccable']);
    expect(isAlreadyInstalled(tmp)).toBe(null);
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

  test('cli install rejects prefix flags without creating a Codex skill tree', () => {
    const result = runSkillsCli(tmp, ['install', '--yes', '--prefix=../x-']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('prefixed Codex installs are no longer supported');
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

  test('bundle install refuses to overwrite custom canonical skill names', () => {
    const customSkillDir = join(tmp, 'skills', 'audit');
    mkdirSync(customSkillDir, { recursive: true });
    writeFileSync(join(customSkillDir, 'SKILL.md'), '---\nname: audit\n---\nRun $audit.\n');

    const bundleRoot = join(tmp, 'bundle');
    createFakeCodexSkills(bundleRoot, ['audit', 'impeccable']);

    expect(() => installBundleIntoRoot(tmp, bundleRoot)).toThrow(/existing custom skill/);
    expect(readFileSync(join(tmp, 'skills', 'audit', 'SKILL.md'), 'utf8')).toContain('Run $audit.');
  });
});
