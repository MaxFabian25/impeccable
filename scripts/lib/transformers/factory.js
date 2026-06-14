import path from 'path';
import { cleanDir, ensureDir, writeFile, generateYamlFrontmatter, replacePlaceholders, PROVIDER_PLACEHOLDERS } from '../utils.js';
import { SKILL_CATEGORIES, CATEGORY_ORDER } from '../sub-pages-data.js';

const IMPECCABLE_SUBCOMMANDS = {
  craft: 'create',
  teach: 'system',
  document: 'system',
  extract: 'system',
  live: 'system',
  pin: 'system',
  unpin: 'system',
};

/**
 * Map from frontmatter field name to extraction spec.
 *
 * - sourceKey: property name on the skill object
 * - yamlKey: key name in YAML frontmatter
 * - condition: if provided, field is only emitted when this returns true
 * - value: if provided, use this instead of skill[sourceKey]
 */
const FIELD_SPECS = {
  'user-invocable': {
    sourceKey: 'userInvocable',
    yamlKey: 'user-invocable',
    condition: (skill) => skill.userInvocable,
    value: () => true,
  },
  'argument-hint': {
    sourceKey: 'argumentHint',
    yamlKey: 'argument-hint',
    condition: (skill) => skill.userInvocable && skill.argumentHint,
  },
  license: {
    sourceKey: 'license',
    yamlKey: 'license',
  },
  compatibility: {
    sourceKey: 'compatibility',
    yamlKey: 'compatibility',
  },
  metadata: {
    sourceKey: 'metadata',
    yamlKey: 'metadata',
  },
  'allowed-tools': {
    sourceKey: 'allowedTools',
    yamlKey: 'allowed-tools',
  },
};

function buildCommandHint(skills) {
  const commandCategories = new Map(Object.entries(IMPECCABLE_SUBCOMMANDS));

  for (const skill of skills) {
    if (!skill.userInvocable || skill.name === 'impeccable') continue;
    const category = SKILL_CATEGORIES[skill.name];
    if (!category) {
      throw new Error(`Cannot build command hint: missing category for ${skill.name}`);
    }
    commandCategories.set(skill.name, category);
  }

  return [...CATEGORY_ORDER, 'system']
    .map((category) => [...commandCategories.entries()]
      .filter(([, commandCategory]) => commandCategory === category)
      .map(([command]) => command)
      .join('|'))
    .filter(Boolean)
    .join(' · ');
}

/**
 * Create a transformer function for a given provider config.
 *
 * @param {Object} config - Provider configuration from providers.js
 * @returns {Function} transform(skills, distDir, options?)
 */
export function createTransformer(config) {
  const { provider, skillsPath = 'skills', displayName, frontmatterFields = [], bodyTransform, placeholderProvider } = config;
  const placeholderKey = placeholderProvider || provider;

  const activeFields = frontmatterFields
    .map((name) => FIELD_SPECS[name])
    .filter(Boolean);

  return function transform(skills, distDir, options = {}) {
    if (options.prefix || options.outputSuffix) {
      throw new Error('Prefixed Codex bundles are no longer supported.');
    }

    const { skillsVersion = '' } = options;
    const providerDir = path.join(distDir, provider);
    const skillsDir = path.join(providerDir, skillsPath);

    cleanDir(providerDir);
    ensureDir(skillsDir);

    const allSkillNames = skills.map((s) => s.name);
    const commandNames = skills
      .filter((s) => s.userInvocable)
      .map((s) => s.name)
      .sort((a, b) => a.localeCompare(b));

    let refCount = 0;
    let scriptCount = 0;

    for (const skill of skills) {
      const skillName = skill.name;
      const skillDir = path.join(skillsDir, skillName);

      // Build frontmatter
      const frontmatterObj = {
        name: skillName,
        description: skill.description,
      };
      if (skillsVersion) frontmatterObj.version = skillsVersion;

      for (const spec of activeFields) {
        if (spec.condition && !spec.condition(skill)) continue;
        const val = spec.value ? spec.value(skill) : skill[spec.sourceKey];
        if (val) frontmatterObj[spec.yamlKey] = val;
      }

      if (frontmatterObj['argument-hint']?.includes('{{command_hint}}')) {
        frontmatterObj['argument-hint'] = frontmatterObj['argument-hint'].replace(
          '{{command_hint}}',
          buildCommandHint(skills)
        );
      }

      const frontmatter = generateYamlFrontmatter(frontmatterObj);

      // Build body
      const cmdPrefix = (PROVIDER_PLACEHOLDERS[placeholderKey] || {}).command_prefix || '/';
      let skillBody = replacePlaceholders(skill.body, placeholderKey, commandNames, allSkillNames);

      // Replace {{scripts_path}} with provider-aware path to skill's scripts directory
      const scriptsPath = `${skillsPath}/${skillName}/scripts`;
      const impeccableScriptsPath = `${skillsPath}/impeccable/scripts`;
      skillBody = skillBody.replace(/\{\{scripts_path\}\}/g, scriptsPath);
      skillBody = skillBody.replace(/\{\{impeccable_scripts_path\}\}/g, impeccableScriptsPath);
      if (bodyTransform) skillBody = bodyTransform(skillBody, skill);

      const content = `${frontmatter}\n\n${skillBody}`;
      writeFile(path.join(skillDir, 'SKILL.md'), content);

      // Copy reference files
      if (skill.references && skill.references.length > 0) {
        const refDir = path.join(skillDir, 'reference');
        ensureDir(refDir);
        for (const ref of skill.references) {
          let refContent = replacePlaceholders(ref.content, placeholderKey, [], allSkillNames);
          refContent = refContent.replace(/\{\{scripts_path\}\}/g, scriptsPath);
          refContent = refContent.replace(/\{\{impeccable_scripts_path\}\}/g, impeccableScriptsPath);
          writeFile(path.join(refDir, `${ref.name}.md`), refContent);
          refCount++;
        }
      }

      // Copy script files
      if (skill.scripts && skill.scripts.length > 0) {
        const scriptsOutDir = path.join(skillDir, 'scripts');
        ensureDir(scriptsOutDir);
        for (const script of skill.scripts) {
          writeFile(path.join(scriptsOutDir, script.name), script.content);
          scriptCount++;
        }
      }
    }

    const userInvocableCount = skills.filter((s) => s.userInvocable).length;
    const refInfo = refCount > 0 ? ` (${refCount} reference files)` : '';
    const scriptInfo = scriptCount > 0 ? ` (${scriptCount} script files)` : '';
    console.log(`✓ ${displayName}: ${skills.length} skills (${userInvocableCount} user-invocable)${refInfo}${scriptInfo}`);
  };
}
