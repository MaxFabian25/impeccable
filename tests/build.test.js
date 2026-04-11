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
      configDir: '.codex',
      displayName: 'Codex CLI',
      frontmatterFields: ['argument-hint', 'license'],
    });
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

    const skillPath = path.join(distDir, 'codex/.codex/skills/test-skill/SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
    expect(fs.readFileSync(skillPath, 'utf8')).toContain('version: 9.9.9');

    const distEntries = fs.readdirSync(distDir).sort();
    expect(distEntries).toEqual(['codex']);
  });

  test('transformCodex applies codex placeholders and prefixing', () => {
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

    transformCodex(skills, distDir, { prefix: 'i-', outputSuffix: '-prefixed' });

    const auditPath = path.join(distDir, 'codex-prefixed/.codex/skills/i-audit/SKILL.md');
    const content = fs.readFileSync(auditPath, 'utf8');

    expect(content).toContain('name: i-audit');
    expect(content).toContain('argument-hint: "[area]"');
    expect(content).toContain('$i-impeccable');
    expect(content).toContain('GPT');
    expect(content).toContain('$i-polish');
  });
});
