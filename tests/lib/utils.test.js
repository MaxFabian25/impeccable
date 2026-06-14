import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
  parseFrontmatter,
  readFilesRecursive,
  readSourceFiles,
  ensureDir,
  cleanDir,
  writeFile,
  generateYamlFrontmatter,
  readPatterns,
  readSkillPatterns,
  replacePlaceholders,
  stashPerProjectArtifacts,
  restorePerProjectArtifacts,
} from '../../scripts/lib/utils.js';

// Temporary test directory
const TEST_DIR = path.join(process.cwd(), 'test-tmp');

describe('parseFrontmatter', () => {
  test('should parse basic frontmatter with simple key-value pairs', () => {
    const content = `---
name: test-skill
description: A test skill
---

This is the body content.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('test-skill');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.body).toBe('This is the body content.');
  });

  test('should parse frontmatter with argument-hint', () => {
    const content = `---
name: test-skill
description: A test skill
argument-hint: <output> [TARGET=<value>]
---

Body here.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('test-skill');
    expect(result.frontmatter['argument-hint']).toBe('<output> [TARGET=<value>]');
  });

  test('should return empty frontmatter when no frontmatter present', () => {
    const content = 'Just some content without frontmatter.';
    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });

  test('should handle empty body', () => {
    const content = `---
name: test
---
`;
    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('test');
    expect(result.body).toBe('');
  });

  test('should handle frontmatter with license field', () => {
    const content = `---
name: skill-name
description: A skill
license: MIT
---

Skill body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.license).toBe('MIT');
  });

  test('should parse user-invocable boolean', () => {
    const content = `---
name: test-skill
user-invocable: true
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter['user-invocable']).toBe(true);
  });

  test('should parse quoted user-invocable boolean as true', () => {
    const content = `---
name: test-skill
user-invocable: 'true'
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter['user-invocable']).toBe(true);
  });

  test('should keep quoted non-user-invocable booleans as plain strings', () => {
    const content = `---
name: test-skill
description: 'true'
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.description).toBe('true');
  });

  test('should parse allowed-tools field', () => {
    const content = `---
name: test-skill
allowed-tools: Bash
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter['allowed-tools']).toBe('Bash');
  });

  test('should parse CRLF frontmatter', () => {
    const content = '---\r\nname: test-skill\r\ndescription: CRLF line endings\r\n---\r\nBody.';

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('test-skill');
    expect(result.frontmatter.description).toBe('CRLF line endings');
    expect(result.body).toBe('Body.');
  });
});

describe('generateYamlFrontmatter', () => {
  test('should generate basic frontmatter', () => {
    const data = {
      name: 'test-skill',
      description: 'A test'
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('---');
    expect(result).toContain('name: test-skill');
    expect(result).toContain('description: A test');
  });

  test('should generate frontmatter with argument-hint', () => {
    const data = {
      name: 'test',
      description: 'Test skill',
      'argument-hint': '<output> [TARGET=<value>]'
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('argument-hint: <output> [TARGET=<value>]');
  });

  test('should generate frontmatter with boolean', () => {
    const data = {
      name: 'test',
      description: 'Test',
      'user-invocable': true
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('user-invocable: true');
  });

  test('should quote strings with colon-space so YAML stays valid', () => {
    const data = {
      name: 'harden',
      description: 'Make interfaces production-ready: error handling and empty states'
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('description: "Make interfaces production-ready: error handling and empty states"');
  });

  test('should quote strings starting with YAML flow indicators', () => {
    const data = {
      name: 'test',
      'argument-hint': '[command] [target]'
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('argument-hint: "[command] [target]"');
  });

  test('should not quote plain strings without special chars', () => {
    const data = {
      name: 'simple',
      description: 'A plain description with no colons or hashes'
    };

    const result = generateYamlFrontmatter(data);
    expect(result).toContain('description: A plain description with no colons or hashes');
    expect(result).not.toContain('"A plain');
  });

  test('should roundtrip: generate and parse back', () => {
    const original = {
      name: 'roundtrip-test',
      description: 'Testing roundtrip',
      'argument-hint': '<arg1>'
    };

    const yaml = generateYamlFrontmatter(original);
    const content = `${yaml}\n\nBody content`;
    const parsed = parseFrontmatter(content);

    expect(parsed.frontmatter.name).toBe(original.name);
    expect(parsed.frontmatter.description).toBe(original.description);
    expect(parsed.frontmatter['argument-hint']).toBe('<arg1>');
  });
});

describe('ensureDir', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should create directory if it does not exist', () => {
    const testPath = path.join(TEST_DIR, 'new-dir');
    ensureDir(testPath);

    expect(fs.existsSync(testPath)).toBe(true);
    expect(fs.statSync(testPath).isDirectory()).toBe(true);
  });

  test('should create nested directories', () => {
    const testPath = path.join(TEST_DIR, 'level1', 'level2', 'level3');
    ensureDir(testPath);

    expect(fs.existsSync(testPath)).toBe(true);
  });

  test('should not throw if directory already exists', () => {
    const testPath = path.join(TEST_DIR, 'existing');
    fs.mkdirSync(testPath, { recursive: true });

    expect(() => ensureDir(testPath)).not.toThrow();
  });
});

describe('cleanDir', () => {
  beforeEach(() => {
    ensureDir(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should remove directory and all contents', () => {
    const filePath = path.join(TEST_DIR, 'test.txt');
    fs.writeFileSync(filePath, 'content');

    expect(fs.existsSync(filePath)).toBe(true);

    cleanDir(TEST_DIR);
    expect(fs.existsSync(TEST_DIR)).toBe(false);
  });

  test('should not throw if directory does not exist', () => {
    const nonExistent = path.join(TEST_DIR, 'does-not-exist');
    expect(() => cleanDir(nonExistent)).not.toThrow();
  });

  test('should remove nested directories', () => {
    const nestedPath = path.join(TEST_DIR, 'level1', 'level2');
    ensureDir(nestedPath);
    fs.writeFileSync(path.join(nestedPath, 'file.txt'), 'content');

    cleanDir(TEST_DIR);
    expect(fs.existsSync(TEST_DIR)).toBe(false);
  });
});

describe('writeFile', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should write file with content', () => {
    const filePath = path.join(TEST_DIR, 'test.txt');
    const content = 'Hello, world!';

    writeFile(filePath, content);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
  });

  test('should create parent directories automatically', () => {
    const filePath = path.join(TEST_DIR, 'nested', 'deep', 'file.txt');
    writeFile(filePath, 'content');

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('content');
  });

  test('should overwrite existing file', () => {
    const filePath = path.join(TEST_DIR, 'file.txt');
    writeFile(filePath, 'first');
    writeFile(filePath, 'second');

    expect(fs.readFileSync(filePath, 'utf-8')).toBe('second');
  });
});

describe('readFilesRecursive', () => {
  beforeEach(() => {
    ensureDir(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should find all markdown files in directory', () => {
    writeFile(path.join(TEST_DIR, 'file1.md'), 'content1');
    writeFile(path.join(TEST_DIR, 'file2.md'), 'content2');
    writeFile(path.join(TEST_DIR, 'file3.txt'), 'not markdown');

    const files = readFilesRecursive(TEST_DIR);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('file1.md'))).toBe(true);
    expect(files.some(f => f.endsWith('file2.md'))).toBe(true);
  });

  test('should find markdown files in nested directories', () => {
    writeFile(path.join(TEST_DIR, 'root.md'), 'root');
    writeFile(path.join(TEST_DIR, 'sub', 'nested.md'), 'nested');
    writeFile(path.join(TEST_DIR, 'sub', 'deep', 'deeper.md'), 'deeper');

    const files = readFilesRecursive(TEST_DIR);
    expect(files).toHaveLength(3);
    expect(files.some(f => f.endsWith('root.md'))).toBe(true);
    expect(files.some(f => f.endsWith('nested.md'))).toBe(true);
    expect(files.some(f => f.endsWith('deeper.md'))).toBe(true);
  });

  test('should return empty array for non-existent directory', () => {
    const files = readFilesRecursive(path.join(TEST_DIR, 'does-not-exist'));
    expect(files).toEqual([]);
  });

  test('should return empty array for directory with no markdown files', () => {
    writeFile(path.join(TEST_DIR, 'file.txt'), 'text');
    writeFile(path.join(TEST_DIR, 'file.js'), 'code');

    const files = readFilesRecursive(TEST_DIR);
    expect(files).toEqual([]);
  });
});

describe('readSourceFiles', () => {
  const testRootDir = TEST_DIR;

  beforeEach(() => {
    ensureDir(testRootDir);
  });

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true });
    }
  });

  test('should read and parse skill files from directory-based structure', () => {
    const skillContent = `---
name: test-skill
description: A test skill
license: MIT
---

Skill instructions here.`;

    const skillDir = path.join(testRootDir, 'skills/test-skill');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('test-skill');
    expect(skills[0].description).toBe('A test skill');
    expect(skills[0].license).toBe('MIT');
    expect(skills[0].body).toBe('Skill instructions here.');
  });

  test('should read skill with user-invocable flag', () => {
    const skillContent = `---
name: audit
description: Run technical quality checks
user-invocable: true
---

Audit the code.`;

    const skillDir = path.join(testRootDir, 'skills/audit');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].userInvocable).toBe(true);
  });

  test('should read skill with quoted user-invocable flag', () => {
    const skillContent = `---
name: audit
description: Run technical quality checks
user-invocable: 'true'
---

Audit the code.`;

    const skillDir = path.join(testRootDir, 'skills/audit');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].userInvocable).toBe(true);
  });

  test('should read skill with reference files', () => {
    const skillContent = `---
name: impeccable
description: Impeccable design skill
---

Impeccable design instructions.`;

    const skillDir = path.join(testRootDir, 'skills/impeccable');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const refDir = path.join(skillDir, 'reference');
    ensureDir(refDir);
    fs.writeFileSync(path.join(refDir, 'typography.md'), 'Typography reference content.');
    fs.writeFileSync(path.join(refDir, 'color.md'), 'Color reference content.');

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].references).toHaveLength(2);
    // References may not be in a specific order due to fs.readdirSync
    const refNames = skills[0].references.map(r => r.name).sort();
    expect(refNames).toEqual(['color', 'typography']);
  });

  test('should use filename as name if not in frontmatter', () => {
    const skillDir = path.join(testRootDir, 'skills/my-skill');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'Just body, no frontmatter.');

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('my-skill');
  });

  test('should handle empty source directories', () => {
    ensureDir(path.join(testRootDir, 'skills'));

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toEqual([]);
  });

  test('should read multiple skills', () => {
    const skill1Dir = path.join(testRootDir, 'skills/skill1');
    ensureDir(skill1Dir);
    fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), '---\nname: skill1\n---\nSkill1');

    const skill2Dir = path.join(testRootDir, 'skills/skill2');
    ensureDir(skill2Dir);
    fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), '---\nname: skill2\n---\nSkill2');

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(2);
  });

  test('should ignore non-md files in skill directories', () => {
    const skillDir = path.join(testRootDir, 'skills/test-skill');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: test-skill\n---\nBody');

    const refDir = path.join(skillDir, 'reference');
    ensureDir(refDir);
    fs.writeFileSync(path.join(refDir, 'readme.txt'), 'Not a markdown file');
    fs.writeFileSync(path.join(refDir, 'typography.md'), 'Valid reference');

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].references).toHaveLength(1);
    expect(skills[0].references[0].name).toBe('typography');
  });

  test('should skip per-project script artifacts', () => {
    const skillDir = path.join(testRootDir, 'skills/impeccable');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: impeccable\n---\nBody');

    const scriptsDir = path.join(skillDir, 'scripts');
    ensureDir(scriptsDir);
    fs.writeFileSync(path.join(scriptsDir, 'live.mjs'), 'console.log("live");');
    fs.writeFileSync(path.join(scriptsDir, 'config.json'), '{"files":["public/index.html"]}');

    const { skills } = readSourceFiles(testRootDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].scripts.map((script) => script.name)).toEqual(['live.mjs']);
  });

  test('should preserve per-project script artifacts across sync', () => {
    const skillsRoot = path.join(testRootDir, 'plugins/impeccable/skills');
    const scriptsDir = path.join(skillsRoot, 'impeccable/scripts');
    ensureDir(scriptsDir);
    fs.writeFileSync(path.join(scriptsDir, 'config.json'), '{"files":["public/index.html"]}');
    fs.writeFileSync(path.join(scriptsDir, 'live.mjs'), 'console.log("old");');

    const stashed = stashPerProjectArtifacts(skillsRoot);
    expect(stashed.map((item) => item.relPath)).toEqual(['impeccable/scripts/config.json']);

    cleanDir(skillsRoot);
    ensureDir(scriptsDir);
    fs.writeFileSync(path.join(scriptsDir, 'live.mjs'), 'console.log("new");');

    restorePerProjectArtifacts(skillsRoot, stashed);

    expect(fs.readFileSync(path.join(scriptsDir, 'config.json'), 'utf-8')).toBe('{"files":["public/index.html"]}');
    expect(fs.readFileSync(path.join(scriptsDir, 'live.mjs'), 'utf-8')).toBe('console.log("new");');
  });

  test('should handle missing skills directory', () => {
    const { skills } = readSourceFiles(testRootDir);
    expect(skills).toEqual([]);
  });

  test('should parse all frontmatter fields correctly', () => {
    const skillContent = `---
name: test-skill
description: A comprehensive test skill
license: Apache-2.0
compatibility: codex
user-invocable: true
allowed-tools: Bash,Edit
---

Body content.`;

    const skillDir = path.join(testRootDir, 'skills/test-skill');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const { skills } = readSourceFiles(testRootDir);

    expect(skills[0].name).toBe('test-skill');
    expect(skills[0].description).toBe('A comprehensive test skill');
    expect(skills[0].license).toBe('Apache-2.0');
    expect(skills[0].compatibility).toBe('codex');
    expect(skills[0].userInvocable).toBe(true);
    expect(skills[0].allowedTools).toBe('Bash,Edit');
  });
});

describe('readPatterns', () => {
  const testRootDir = TEST_DIR;

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true });
    }
  });

  test('should return the curated homepage pattern categories', () => {
    const { patterns, antipatterns } = readPatterns(testRootDir);

    expect(patterns.map((category) => category.name)).toEqual([
      'Typography',
      'Color & Contrast',
      'Layout & Space',
      'Visual Details',
      'Motion',
      'Interaction',
    ]);
    expect(antipatterns.map((category) => category.name)).toEqual(patterns.map((category) => category.name));
    expect(patterns[0].items).toContain('Pair a distinctive display face with a restrained body face; vary across projects.');
    expect(antipatterns[2].items).toContain('Wrap everything in cards. Nested cards are always wrong.');
  });

  test('should not depend on a source SKILL.md file', () => {
    const skillContent = `---
name: impeccable
---

### Motion
**DO**: Use ease-out for natural movement.

### Typography
**DO**: Use modular scale.

### Color & Contrast
**DO**: Use tinted neutrals.`;

    const skillDir = path.join(testRootDir, 'skills/impeccable');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const withSource = readPatterns(testRootDir);
    fs.rmSync(testRootDir, { recursive: true, force: true });
    const withoutSource = readPatterns(testRootDir);

    expect(withSource).toEqual(withoutSource);
  });
});

describe('readSkillPatterns', () => {
  const testRootDir = TEST_DIR;

  beforeEach(() => {
    ensureDir(testRootDir);
  });

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true });
    }
  });

  test('should extract DO and DON\'T patterns from SKILL.md', () => {
    const skillContent = `---
name: impeccable
---

### Typography
**DO**: Use variable fonts for flexibility.
**DON'T**: Use system fonts like Arial.

### Color & Theme
DO Use OKLCH color space.
DO NOT Use pure black.

### Layout & Space
DO: Use consistent spacing scale.
DO NOT: Nest cards inside cards.`;

    const skillDir = path.join(testRootDir, 'skills/impeccable');
    ensureDir(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

    const { patterns, antipatterns } = readSkillPatterns(testRootDir);

    expect(patterns.map((category) => category.name)).toEqual([
      'Typography',
      'Color & Contrast',
      'Layout & Space',
    ]);
    expect(antipatterns.map((category) => category.name)).toEqual(patterns.map((category) => category.name));
    expect(patterns[0].items).toContain('Use variable fonts for flexibility.');
    expect(patterns[1].items).toContain('Use OKLCH color space.');
    expect(antipatterns[2].items).toContain('Nest cards inside cards.');
  });

  test('should return empty arrays when source SKILL.md is missing', () => {
    const { patterns, antipatterns } = readSkillPatterns(testRootDir);

    expect(patterns).toEqual([]);
    expect(antipatterns).toEqual([]);
  });
});

describe('replacePlaceholders', () => {
  test('should replace {{model}} with provider-specific value', () => {
    expect(replacePlaceholders('Ask {{model}} for help.', 'codex')).toBe('Ask GPT for help.');
  });

  test('should replace {{config_file}} with provider-specific value', () => {
    expect(replacePlaceholders('See {{config_file}}.', 'codex')).toBe('See AGENTS.md.');
  });

  test('should replace {{ask_instruction}} with provider-specific value', () => {
    const result = replacePlaceholders('{{ask_instruction}}', 'codex');
    expect(result).toBe("STOP and use Codex's structured user-input/question tool when available; if unavailable, ask directly in chat to clarify what you cannot infer.");
  });

  test('should replace {{available_commands}} with command list', () => {
    const result = replacePlaceholders('Commands: {{available_commands}}', 'codex', ['audit', 'polish', 'optimize']);
    expect(result).toBe('Commands: $audit, $polish, $optimize');
  });

  test('should exclude impeccable from {{available_commands}}', () => {
    const result = replacePlaceholders('Commands: {{available_commands}}', 'codex', ['audit', 'impeccable', 'polish']);
    expect(result).toBe('Commands: $audit, $polish');
  });

  test('should exclude legacy teach-impeccable from {{available_commands}}', () => {
    const result = replacePlaceholders('Commands: {{available_commands}}', 'codex', ['audit', 'teach-impeccable', 'polish']);
    expect(result).toBe('Commands: $audit, $polish');
  });

  test('should produce empty string for {{available_commands}} with no commands', () => {
    const result = replacePlaceholders('Commands: {{available_commands}}.', 'codex', []);
    expect(result).toBe('Commands: .');
  });

  test('should replace multiple placeholders in the same string', () => {
    const result = replacePlaceholders('{{model}} uses {{config_file}} and {{ask_instruction}}', 'codex');
    expect(result).toBe("GPT uses AGENTS.md and STOP and use Codex's structured user-input/question tool when available; if unavailable, ask directly in chat to clarify what you cannot infer.");
  });

  test('should replace multiple occurrences of the same placeholder', () => {
    const result = replacePlaceholders('{{model}} and {{model}} again.', 'codex');
    expect(result).toBe('GPT and GPT again.');
  });

  test('should fall back to codex placeholders for unknown provider', () => {
    const result = replacePlaceholders('{{model}} {{config_file}}', 'unknown-provider');
    expect(result).toBe('GPT AGENTS.md');
  });
});
