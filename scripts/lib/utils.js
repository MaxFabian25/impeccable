import fs from 'fs';
import path from 'path';

// Per-project artifacts live inside `scripts/` of an installed skill but
// belong to the consuming project, not the distributable skill. The build
// excludes them from dist, and the plugin sync preserves them across rm+recopy.
export const PER_PROJECT_SCRIPT_ARTIFACTS = new Set([
  'config.json',
]);

export function stashPerProjectArtifacts(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const stashed = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
        continue;
      }
      if (path.basename(path.dirname(filePath)) !== 'scripts') continue;
      if (!PER_PROJECT_SCRIPT_ARTIFACTS.has(entry.name)) continue;
      stashed.push({
        relPath: path.relative(rootDir, filePath),
        content: fs.readFileSync(filePath),
      });
    }
  };

  walk(rootDir);
  return stashed;
}

export function restorePerProjectArtifacts(rootDir, stashed) {
  for (const { relPath, content } of stashed) {
    const target = path.join(rootDir, relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

/**
 * Parse frontmatter from markdown content
 * Returns { frontmatter: object, body: string }
 */
export function parseFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, frontmatterText, body] = match;
  const frontmatter = {};

  // Simple YAML parser (handles basic key-value and arrays)
  const lines = frontmatterText.split(/\r?\n/);
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Calculate indent level
    const leadingSpaces = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Array item at level 2 (nested under a key)
    if (trimmed.startsWith('- ') && leadingSpaces >= 2) {
      if (currentArray) {
        if (trimmed.startsWith('- name:')) {
          // New object in array
          const obj = {};
          obj.name = trimmed.slice(7).trim();
          currentArray.push(obj);
        } else {
          // Simple string item in array
          currentArray.push(trimmed.slice(2));
        }
      }
      continue;
    }

    // Property of array object (indented further)
    if (leadingSpaces >= 4 && currentArray && currentArray.length > 0) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        const lastObj = currentArray[currentArray.length - 1];
        lastObj[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
      continue;
    }

    // Top-level key-value pair
    if (leadingSpaces === 0) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();

        if (value) {
          const isQuoted = /^(".*"|'.*')$/.test(value);
          const unquotedValue = isQuoted ? value.slice(1, -1) : value;
          const shouldCoerceBoolean =
            key === 'user-invocable' || key === 'user-invokable' || !isQuoted;

          frontmatter[key] = shouldCoerceBoolean
            ? unquotedValue === 'true'
              ? true
              : unquotedValue === 'false'
                ? false
                : unquotedValue
            : unquotedValue;
          currentKey = key;
          currentArray = null;
        } else {
          // Start of array
          currentKey = key;
          currentArray = [];
          frontmatter[key] = currentArray;
        }
      }
    }
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Recursively read all .md files from a directory
 */
export function readFilesRecursive(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      readFilesRecursive(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Read and parse all source files (unified skills architecture)
 * All source lives in source/skills/{name}/SKILL.md
 * Returns { skills } where each skill has userInvocable flag
 */
export function readSourceFiles(rootDir) {
  const skillsDir = path.join(rootDir, 'source/skills');

  const skills = [];

  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryPath = path.join(skillsDir, entry.name);

      if (entry.isDirectory()) {
        // Directory-based skill with potential references
        const skillMdPath = path.join(entryPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(content);

          // Read reference files if they exist
          const references = [];
          const referenceDir = path.join(entryPath, 'reference');
          if (fs.existsSync(referenceDir)) {
            const refFiles = fs.readdirSync(referenceDir)
              .filter(f => f.endsWith('.md'))
              .sort((a, b) => a.localeCompare(b));
            for (const refFile of refFiles) {
              const refPath = path.join(referenceDir, refFile);
              const refContent = fs.readFileSync(refPath, 'utf-8');
              references.push({
                name: path.basename(refFile, '.md'),
                content: refContent,
                filePath: refPath
              });
            }
          }

          // Read script files if they exist
          const scripts = [];
          const scriptsDir = path.join(entryPath, 'scripts');
          if (fs.existsSync(scriptsDir)) {
            const scriptFiles = fs.readdirSync(scriptsDir)
              .filter(f => fs.statSync(path.join(scriptsDir, f)).isFile() && !PER_PROJECT_SCRIPT_ARTIFACTS.has(f))
              .sort((a, b) => a.localeCompare(b));
            for (const scriptFile of scriptFiles) {
              const scriptPath = path.join(scriptsDir, scriptFile);
              const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
              scripts.push({
                name: scriptFile,
                content: scriptContent,
                filePath: scriptPath
              });
            }
          }

          skills.push({
            name: frontmatter.name || entry.name,
            description: frontmatter.description || '',
            license: frontmatter.license || '',
            compatibility: frontmatter.compatibility || '',
            metadata: frontmatter.metadata || null,
            allowedTools: frontmatter['allowed-tools'] || '',
            userInvocable: frontmatter['user-invocable'] === true || frontmatter['user-invocable'] === 'true',
            argumentHint: frontmatter['argument-hint'] || '',
            context: frontmatter.context || null,
            body,
            filePath: skillMdPath,
            references,
            scripts
          });
        }
      }
    }
  }

  return { skills };
}

/**
 * Ensure directory exists, create if needed
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Clean directory (remove all contents)
 */
export function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Write file with automatic directory creation
 */
export function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Curated short-list for the homepage Antidote section. The full catalog lives
// on /anti-patterns; this teaser stays editorial instead of mirroring SKILL.md.
const CURATED_CATEGORIES = [
  {
    name: 'Typography',
    do: [
      'Pair a distinctive display face with a restrained body face; vary across projects.',
      'Use a >=1.25 scale ratio between hierarchy steps. Flat scales read as bland.',
      'Cap body line length at 65-75ch. Wider is fatiguing.',
    ],
    dont: [
      'Inter, Roboto, Plex, Fraunces, or any other reflex default. Look further.',
      'Monospace as lazy shorthand for "technical."',
      'Long passages in uppercase. Reserve all-caps for short labels.',
    ],
  },
  {
    name: 'Color & Contrast',
    do: [
      'Use OKLCH. Reduce chroma near lightness extremes.',
      'Tint neutrals toward the brand hue. Chroma 0.005-0.01 is enough.',
      'Pick a color strategy before picking colors: Restrained, Committed, Full, or Drenched.',
    ],
    dont: [
      'Pure #000 or #fff. Always tint.',
      'Dark mode plus purple-to-cyan gradients. The AI tell.',
      'Gradient text via background-clip. Use weight or size for emphasis.',
    ],
  },
  {
    name: 'Layout & Space',
    do: [
      'Vary spacing for rhythm. Tight groupings, generous separations.',
      'Use the simplest tool: Flexbox for 1D, Grid for 2D, plain flow often enough.',
      'Let whitespace carry hierarchy before reaching for color or scale.',
    ],
    dont: [
      'Wrap everything in cards. Nested cards are always wrong.',
      'Identical card grids of icon plus heading plus text, repeated endlessly.',
      'The hero-metric template: big number, small label, supporting stats, gradient accent.',
    ],
  },
  {
    name: 'Visual Details',
    do: [
      'Commit to an aesthetic direction and execute it with precision.',
      'Use ornament only where it earns its place.',
    ],
    dont: [
      'Side-stripe borders where border-left or border-right is thicker than 1px.',
      'Glassmorphism everywhere. Rare and purposeful or nothing.',
      'Rounded rectangles with generic drop shadows. Could be any AI output.',
    ],
  },
  {
    name: 'Motion',
    do: [
      'Use transform and opacity. Animate composited properties only.',
      'Ease out with exponential curves: quart, quint, or expo.',
      'Respect prefers-reduced-motion on every transition.',
    ],
    dont: [
      'Animate layout: width, height, padding, or margin.',
      'Bounce or elastic easing. Feels dated and tacky.',
      'Decorative motion for its own sake. Motion should signal state.',
    ],
  },
  {
    name: 'Interaction',
    do: [
      'Use optimistic UI: update immediately, sync later.',
      'Design empty states that teach the interface, not just say "nothing here."',
      'Progressive disclosure: start simple, reveal sophistication on demand.',
    ],
    dont: [
      'Make every button primary. Hierarchy matters.',
      'Default to a modal. Exhaust inline alternatives first.',
      'Repeat information the user can already see.',
    ],
  },
];

/**
 * Return curated homepage patterns.
 *
 * The homepage Antidote section is an editorial teaser, not an exhaustive
 * extraction of the current skill source. The full rule catalog is generated
 * separately under /anti-patterns.
 */
export function readPatterns(_rootDir) {
  return {
    patterns: CURATED_CATEGORIES.map((category) => ({ name: category.name, items: [...category.do] })),
    antipatterns: CURATED_CATEGORIES.map((category) => ({ name: category.name, items: [...category.dont] })),
  };
}

/**
 * Extract full DO/DON'T patterns from source/skills/impeccable/SKILL.md.
 *
 * This is for detector drift validation, not the homepage teaser.
 */
export function readSkillPatterns(rootDir) {
  const skillPath = path.join(rootDir, 'source/skills/impeccable/SKILL.md');

  if (!fs.existsSync(skillPath)) {
    return { patterns: [], antipatterns: [] };
  }

  const content = fs.readFileSync(skillPath, 'utf-8');
  const lines = content.split('\n');
  const patternsMap = {};
  const antipatternsMap = {};
  let currentSection = null;

  const pushPattern = (item) => {
    if (!currentSection) return;
    if (!patternsMap[currentSection]) patternsMap[currentSection] = [];
    patternsMap[currentSection].push(item);
  };

  const pushAntipattern = (item) => {
    if (!currentSection) return;
    if (!antipatternsMap[currentSection]) antipatternsMap[currentSection] = [];
    antipatternsMap[currentSection].push(item);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      currentSection = trimmed.slice(4).trim();
      if (currentSection === 'Color & Theme') {
        currentSection = 'Color & Contrast';
      }
      continue;
    }

    if (trimmed.startsWith('**DO**:')) {
      pushPattern(trimmed.slice(7).trim());
      continue;
    }

    if (trimmed.startsWith("**DON'T**:")) {
      pushAntipattern(trimmed.slice(10).trim());
      continue;
    }

    if (trimmed.startsWith('DO NOT: ')) {
      pushAntipattern(trimmed.slice('DO NOT: '.length).trim());
      continue;
    }

    if (trimmed.startsWith('DO NOT ')) {
      pushAntipattern(trimmed.slice('DO NOT '.length).trim());
      continue;
    }

    if (trimmed.startsWith('DO: ')) {
      pushPattern(trimmed.slice('DO: '.length).trim());
      continue;
    }

    if (trimmed.startsWith('DO ')) {
      pushPattern(trimmed.slice('DO '.length).trim());
    }
  }

  const sectionOrder = [
    'Typography',
    'Color & Contrast',
    'Layout & Space',
    'Visual Details',
    'Motion',
    'Interaction',
    'Responsive',
    'UX Writing',
  ];

  const patterns = [];
  const antipatterns = [];

  for (const section of sectionOrder) {
    if (patternsMap[section]?.length > 0) {
      patterns.push({ name: section, items: patternsMap[section] });
    }
    if (antipatternsMap[section]?.length > 0) {
      antipatterns.push({ name: section, items: antipatternsMap[section] });
    }
  }

  return { patterns, antipatterns };
}

/**
 * Provider-specific placeholders
 */
export const PROVIDER_PLACEHOLDERS = {
  'codex': {
    model: 'GPT',
    config_file: 'AGENTS.md',
    ask_instruction: 'ask the user directly to clarify what you cannot infer.',
    command_prefix: '$'
  }
};

/**
 * Replace all {{placeholder}} tokens with provider-specific values
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EXCLUDED_FROM_SUGGESTIONS = new Set([
  'impeccable',         // foundational skill, not a steering command
  'teach-impeccable',   // deprecated shim
  'frontend-design',    // deprecated shim
]);

export function replacePlaceholders(content, provider, commandNames = [], allSkillNames = []) {
  const placeholders = PROVIDER_PLACEHOLDERS[provider] || PROVIDER_PLACEHOLDERS.codex;
  const cmdPrefix = placeholders.command_prefix || '/';
  const commandList = commandNames
    .filter(n => !EXCLUDED_FROM_SUGGESTIONS.has(n))
    .map(n => `${cmdPrefix}${n}`)
    .join(', ');

  let result = content
    .replace(/\{\{model\}\}/g, placeholders.model)
    .replace(/\{\{config_file\}\}/g, placeholders.config_file)
    .replace(/\{\{ask_instruction\}\}/g, placeholders.ask_instruction)
    .replace(/\{\{command_prefix\}\}/g, cmdPrefix)
    .replace(/\{\{available_commands\}\}/g, commandList);

  // Replace `/skillname` invocations with the correct command prefix for this provider
  // (e.g., `/normalize` → `$normalize` for Codex)
  if (cmdPrefix !== '/' && allSkillNames.length > 0) {
    const sorted = [...allSkillNames].sort((a, b) => b.length - a.length);
    for (const name of sorted) {
      result = result.replace(
        new RegExp(`\\/(?=${escapeRegex(name)}(?:[^a-zA-Z0-9_-]|$))`, 'g'),
        cmdPrefix
      );
    }
  }

  return result;
}

/**
 * Generate YAML frontmatter string
 */
function yamlNeedsQuoting(value) {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (/^\s|\s$/.test(value)) return true;
  if (/^[\[\]{},&*!|>'"%@`#]/.test(value)) return true;
  if (/^[?:-](\s|$)/.test(value)) return true;
  if (/: |\s#|:$/.test(value)) return true;
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) return true;
  return false;
}

function formatYamlScalar(value) {
  if (typeof value !== 'string') return String(value);
  if (!yamlNeedsQuoting(value)) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function generateYamlFrontmatter(data) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`  - name: ${formatYamlScalar(item.name)}`);
          if (item.description) lines.push(`    description: ${formatYamlScalar(item.description)}`);
          if (item.required !== undefined) lines.push(`    required: ${item.required}`);
        } else {
          lines.push(`  - ${formatYamlScalar(item)}`);
        }
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${formatYamlScalar(value)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}
