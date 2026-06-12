import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { readSourceFiles } from '../scripts/lib/utils.js';
import { PROVIDERS, transformCodex } from '../scripts/lib/transformers/index.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-build');

describe('codex-only build contract', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('provider registry is codex-only', () => {
    expect(Object.keys(PROVIDERS)).toEqual(['codex']);
    expect(PROVIDERS.codex).toEqual({
      provider: 'codex',
      skillsPath: 'skills',
      displayName: 'Codex CLI',
      frontmatterFields: ['argument-hint', 'license'],
    });
  });

  test('authored and generated impeccable skills omit one-time cleanup bootstrap', () => {
    const authored = fs.readFileSync(path.join(process.cwd(), 'source/skills/impeccable/SKILL.md'), 'utf8');
    const generated = fs.readFileSync(
      path.join(process.cwd(), 'plugins/impeccable/skills/impeccable/SKILL.md'),
      'utf8'
    );

    expect(authored).not.toContain('<post-update-cleanup>');
    expect(generated).not.toContain('<post-update-cleanup>');
    expect(fs.existsSync(path.join(process.cwd(), 'source/skills/impeccable/scripts/cleanup-deprecated.mjs'))).toBe(true);
    expect(fs.existsSync(
      path.join(process.cwd(), 'plugins/impeccable/skills/impeccable/scripts/cleanup-deprecated.mjs')
    )).toBe(true);
  });

  test('live browser accept fallback preserves variant attributes for scoped styles', () => {
    const authored = fs.readFileSync(
      path.join(process.cwd(), 'source/skills/impeccable/scripts/live-browser.js'),
      'utf8'
    );
    const generated = fs.readFileSync(
      path.join(process.cwd(), 'plugins/impeccable/skills/impeccable/scripts/live-browser.js'),
      'utf8'
    );

    for (const script of [authored, generated]) {
      expect(script).toContain("accepted.style.display = 'contents';");
      expect(script).toContain('parent.replaceChild(accepted, wrapper);');
      expect(script).not.toContain('accepted.firstElementChild.cloneNode(true)');
    }
  });

  test('transformCodex writes skills into the codex distribution tree', () => {
    const skillDir = path.join(TEST_DIR, 'source/skills/test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---
name: test-skill
description: A test skill
license: Apache-2.0
---

This is a test skill body.`
    );

    const distDir = path.join(TEST_DIR, 'dist');
    const { skills } = readSourceFiles(TEST_DIR);

    transformCodex(skills, distDir, { skillsVersion: '9.9.9' });

    const skillPath = path.join(distDir, 'codex/skills/test-skill/SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
    expect(fs.readFileSync(skillPath, 'utf8')).toContain('version: 9.9.9');

    const distEntries = fs.readdirSync(distDir).sort();
    expect(distEntries).toEqual(['codex']);
  });

  test('transformCodex applies codex placeholders without prefixing', () => {
    const auditDir = path.join(TEST_DIR, 'source/skills/audit');
    fs.mkdirSync(auditDir, { recursive: true });
    fs.writeFileSync(
      path.join(auditDir, 'SKILL.md'),
      `---
name: audit
description: Run technical quality checks
user-invocable: true
argument-hint: "[area]"
---

Invoke {{command_prefix}}impeccable first.
Ask {{model}} for help.
Then run {{command_prefix}}polish.`
    );

    const impeccableDir = path.join(TEST_DIR, 'source/skills/impeccable');
    fs.mkdirSync(impeccableDir, { recursive: true });
    fs.writeFileSync(
      path.join(impeccableDir, 'SKILL.md'),
      `---
name: impeccable
description: Main skill
user-invocable: true
---

Teach design context.`
    );

    const polishDir = path.join(TEST_DIR, 'source/skills/polish');
    fs.mkdirSync(polishDir, { recursive: true });
    fs.writeFileSync(
      path.join(polishDir, 'SKILL.md'),
      `---
name: polish
description: Polish a finished feature
user-invocable: true
---

Make the details feel intentional.`
    );

    const distDir = path.join(TEST_DIR, 'dist');
    const { skills } = readSourceFiles(TEST_DIR);

    transformCodex(skills, distDir);

    const auditPath = path.join(distDir, 'codex/skills/audit/SKILL.md');
    const content = fs.readFileSync(auditPath, 'utf8');

    expect(content).toContain('name: audit');
    expect(content).toContain('argument-hint: "[area]"');
    expect(content).toContain('$impeccable');
    expect(content).toContain('GPT');
    expect(content).toContain('$polish');
    expect(fs.existsSync(path.join(distDir, 'codex-prefixed'))).toBe(false);
  });
});
