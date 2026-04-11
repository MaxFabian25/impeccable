/**
 * `impeccable skills` subcommand
 *
 * Codex-only contract:
 * - installs project-local skills into `.codex/skills`
 * - downloads Codex bundles from impeccable.style
 * - optionally prefixes command names after install/update
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  renameSync,
  createWriteStream,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..', '..');
const API_BASE = 'https://impeccable.style';

export const SKILLS_DIR_NAME = '.codex';
export const SKILLS_DIR_RELATIVE = `${SKILLS_DIR_NAME}/skills`;
const PLUGIN_DIR_RELATIVE = '.codex-plugin';
const DEFAULT_PREFIX = 'i-';
const SAFE_PREFIX_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-$/i;
const RETIRED_MANAGED_SKILL_NAMES = [
  'frontend-design',
  'teach-impeccable',
  'arrange',
  'normalize',
  'onboard',
  'extract',
];

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim().toLowerCase());
  }));
}

function assertValidPrefix(prefix) {
  if (!prefix) return;

  if (!SAFE_PREFIX_PATTERN.test(prefix)) {
    throw new Error(
      'Prefix must contain only letters, numbers, and hyphens, and must end with a hyphen (for example "i-").'
    );
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSkillsDir(root) {
  return join(root, SKILLS_DIR_RELATIVE);
}

function getPluginDir(root) {
  return join(root, PLUGIN_DIR_RELATIVE);
}

function isSkillDir(skillsDir, name) {
  const full = join(skillsDir, name);
  try {
    return statSync(full).isDirectory() && existsSync(join(full, 'SKILL.md'));
  } catch {
    return false;
  }
}

function getSkillNames(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir).filter((name) => isSkillDir(skillsDir, name)).sort();
}

function prefixSkillContent(content, prefix, allSkillNames) {
  let result = content.replace(/^name:\s*(.+)$/m, (_, name) => `name: ${prefix}${name.trim()}`);
  const sortedNames = [...allSkillNames].sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    const prefixedName = `${prefix}${name}`;
    const scriptsPath = `${SKILLS_DIR_RELATIVE}/${name}/scripts`;
    const prefixedScriptsPath = `${SKILLS_DIR_RELATIVE}/${prefixedName}/scripts`;

    result = result.replace(new RegExp(escapeRegex(scriptsPath), 'g'), prefixedScriptsPath);
    result = result.replace(
      new RegExp(`\\$(?=${escapeRegex(name)}(?:[^a-zA-Z0-9_-]|$))`, 'g'),
      `$${prefix}`
    );
    result = result.replace(
      new RegExp(`(the) ${escapeRegex(name)} skill`, 'gi'),
      (_, article) => `${article} ${prefix}${name} skill`
    );
  }

  return result;
}

function unprefixSkillContent(content, prefix, prefixedSkillNames) {
  let result = content.replace(new RegExp(`^name:\\s*${escapeRegex(prefix)}`, 'm'), 'name: ');
  const sortedNames = [...prefixedSkillNames].sort((a, b) => b.length - a.length);

  for (const prefixedName of sortedNames) {
    const unprefixedName = prefixedName.slice(prefix.length);
    const prefixedScriptsPath = `${SKILLS_DIR_RELATIVE}/${prefixedName}/scripts`;
    const scriptsPath = `${SKILLS_DIR_RELATIVE}/${unprefixedName}/scripts`;

    result = result.replace(new RegExp(escapeRegex(prefixedScriptsPath), 'g'), scriptsPath);
    result = result.replace(
      new RegExp(`\\$${escapeRegex(prefixedName)}(?=[^a-zA-Z0-9_-]|$)`, 'g'),
      `$${unprefixedName}`
    );
    result = result.replace(
      new RegExp(`(the) ${escapeRegex(prefixedName)} skill`, 'gi'),
      `$1 ${unprefixedName} skill`
    );
  }

  return result;
}

function normalizeForHash(content, prefix = '') {
  let normalized = content.replace(/^version:\s*.+$/m, 'version: NORMALIZED');

  if (prefix) {
    normalized = normalized
      .replace(new RegExp(`^name:\\s*${escapeRegex(prefix)}`, 'm'), 'name: ')
      .replace(new RegExp(`\\$${escapeRegex(prefix)}`, 'g'), '$')
      .replace(new RegExp(`(the) ${escapeRegex(prefix)}`, 'gi'), '$1 ');
  }

  return normalized;
}

function hashContent(content, prefix = '') {
  return createHash('sha256')
    .update(normalizeForHash(content, prefix))
    .digest('hex');
}

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const sourcePath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(sourcePath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(sourcePath));
    }
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        get(response.headers.location, (redirected) => {
          redirected.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

function getBundleSkillNames(bundleRoot) {
  return getSkillNames(join(bundleRoot, SKILLS_DIR_RELATIVE));
}

function removeManagedSkillDirs(root, managedSkillNames) {
  const skillsDir = getSkillsDir(root);
  if (!existsSync(skillsDir) || managedSkillNames.length === 0) return;
  if (!isAlreadyInstalled(root)) return;

  const existingPrefix = detectPrefix(root);
  const candidates = new Set();
  const removableNames = [...new Set([...managedSkillNames, ...RETIRED_MANAGED_SKILL_NAMES])];

  for (const skillName of removableNames) {
    if (existingPrefix) {
      candidates.add(`${existingPrefix}${skillName}`);
    } else {
      candidates.add(skillName);
    }
  }

  for (const candidate of candidates) {
    const candidateDir = join(skillsDir, candidate);
    if (isSkillDir(skillsDir, candidate)) {
      rmSync(candidateDir, { recursive: true, force: true });
    }
  }
}

function listRelativeFiles(dir, baseDir = dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRelativeFiles(fullPath, baseDir));
    } else {
      files.push(fullPath.slice(baseDir.length + 1));
    }
  }
  return files.sort();
}

function hashFileExact(filePath) {
  return createHash('sha256')
    .update(readFileSync(filePath))
    .digest('hex');
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function hasRetiredManagedSkills(root) {
  const skillsDir = getSkillsDir(root);
  if (!existsSync(skillsDir)) return false;

  const prefixes = [''];
  const activePrefix = detectPrefix(root);
  if (activePrefix) prefixes.push(activePrefix);

  return RETIRED_MANAGED_SKILL_NAMES.some((skillName) => prefixes.some((prefix) => (
    isSkillDir(skillsDir, `${prefix}${skillName}`)
  )));
}

function assertPluginManifestIsCompatible(localPluginDir, bundlePluginDir) {
  const localManifestPath = join(localPluginDir, 'plugin.json');
  const bundleManifestPath = join(bundlePluginDir, 'plugin.json');

  if (!existsSync(localManifestPath) || !existsSync(bundleManifestPath)) {
    return;
  }

  const localManifest = readJsonFile(localManifestPath);
  const bundleManifest = readJsonFile(bundleManifestPath);
  const localRepository = typeof localManifest.repository === 'string'
    ? localManifest.repository
    : localManifest.repository?.url;
  const bundleRepository = typeof bundleManifest.repository === 'string'
    ? bundleManifest.repository
    : bundleManifest.repository?.url;

  const samePlugin = localManifest.name === bundleManifest.name
    || (localRepository && bundleRepository && localRepository === bundleRepository);

  if (!samePlugin) {
    throw new Error(
      'Found an existing .codex-plugin/plugin.json for another Codex plugin. Merge or remove it before installing Impeccable.'
    );
  }
}

function isBundleDirSubsetUpToDate(localDir, bundleDir) {
  if (!existsSync(bundleDir)) return true;
  if (!existsSync(localDir)) return false;

  for (const relativePath of listRelativeFiles(bundleDir)) {
    const bundlePath = join(bundleDir, relativePath);
    const localPath = join(localDir, relativePath);
    if (!existsSync(localPath)) return false;
    if (hashFileExact(localPath) !== hashFileExact(bundlePath)) {
      return false;
    }
  }

  return true;
}

function isSkillDirUpToDate(localSkillDir, bundleSkillDir, prefix = '') {
  if (!existsSync(localSkillDir) || !existsSync(bundleSkillDir)) return false;

  const localFiles = listRelativeFiles(localSkillDir);
  const bundleFiles = listRelativeFiles(bundleSkillDir);
  if (localFiles.length !== bundleFiles.length) return false;
  if (localFiles.some((file, index) => file !== bundleFiles[index])) return false;

  for (const relativePath of bundleFiles) {
    const localPath = join(localSkillDir, relativePath);
    const bundlePath = join(bundleSkillDir, relativePath);

    if (relativePath === 'SKILL.md') {
      const localContent = readFileSync(localPath, 'utf8');
      const bundleContent = readFileSync(bundlePath, 'utf8');
      if (hashContent(localContent, prefix) !== hashContent(bundleContent)) {
        return false;
      }
      continue;
    }

    if (hashFileExact(localPath) !== hashFileExact(bundlePath)) {
      return false;
    }
  }

  return true;
}

async function downloadAndExtractBundle(bundleName = 'codex') {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const zipPath = join(tmpdir(), `impeccable-${bundleName}-${stamp}.zip`);
  const extractDir = join(tmpdir(), `impeccable-${bundleName}-${stamp}`);
  await downloadFile(`${API_BASE}/api/download/bundle/${bundleName}`, zipPath);
  mkdirSync(extractDir, { recursive: true });
  execSync(`unzip -qo "${zipPath}" -d "${extractDir}"`, { encoding: 'utf8' });
  rmSync(zipPath, { force: true });
  return extractDir;
}

export function installBundleIntoRoot(root, bundleDir, prefix = '') {
  assertValidPrefix(prefix);

  const bundleSkillsDir = join(bundleDir, SKILLS_DIR_RELATIVE);
  const localSkillsDir = getSkillsDir(root);
  const bundlePluginDir = join(bundleDir, PLUGIN_DIR_RELATIVE);
  const localPluginDir = getPluginDir(root);
  const bundleSkillNames = getBundleSkillNames(bundleDir);

  if (existsSync(bundlePluginDir)) {
    assertPluginManifestIsCompatible(localPluginDir, bundlePluginDir);
  }

  mkdirSync(localSkillsDir, { recursive: true });
  removeManagedSkillDirs(root, bundleSkillNames);
  for (const skillName of bundleSkillNames) {
    const targetName = prefix ? `${prefix}${skillName}` : skillName;
    const targetDir = join(localSkillsDir, targetName);
    if (existsSync(targetDir)) {
      throw new Error(
        `Found an existing custom skill at ${SKILLS_DIR_RELATIVE}/${targetName}. Rename it or use a different prefix before installing Impeccable.`
      );
    }

    copyDirSync(join(bundleSkillsDir, skillName), targetDir);

    if (prefix) {
      const skillPath = join(targetDir, 'SKILL.md');
      const content = readFileSync(skillPath, 'utf8');
      writeFileSync(skillPath, prefixSkillContent(content, prefix, bundleSkillNames));
    }
  }

  if (existsSync(bundlePluginDir)) {
    mkdirSync(localPluginDir, { recursive: true });
    copyDirSync(bundlePluginDir, localPluginDir);
  }

  return bundleSkillNames.length;
}

function hasLocalBundle() {
  return existsSync(join(PACKAGE_ROOT, SKILLS_DIR_RELATIVE));
}

export function isAlreadyInstalled(root) {
  const skillsDir = getSkillsDir(root);
  if (!existsSync(skillsDir)) return null;

  const entries = readdirSync(skillsDir);
  if (entries.some((entry) => entry === 'impeccable' || entry.endsWith('-impeccable'))) {
    return SKILLS_DIR_NAME;
  }

  return null;
}

export function detectPrefix(root) {
  const skillsDir = getSkillsDir(root);
  if (!existsSync(skillsDir)) return '';

  for (const name of readdirSync(skillsDir)) {
    if (name === 'impeccable') return '';
    if (name.endsWith('-impeccable')) return name.slice(0, -'impeccable'.length);
  }

  return '';
}

export function renameSkillsWithPrefix(root, prefix, managedSkillNames = null) {
  if (!prefix) return 0;
  assertValidPrefix(prefix);

  const skillsDir = getSkillsDir(root);
  const allSkillNames = managedSkillNames ? [...managedSkillNames] : getSkillNames(skillsDir);
  let renamedCount = 0;

  for (const name of allSkillNames) {
    if (name.startsWith(prefix)) continue;
    if (!isSkillDir(skillsDir, name)) continue;

    const src = join(skillsDir, name);
    const dest = join(skillsDir, `${prefix}${name}`);
    if (existsSync(dest)) {
      throw new Error(`Cannot prefix ${name}: ${prefix}${name} already exists in ${SKILLS_DIR_RELATIVE}.`);
    }
    renameSync(src, dest);

    const skillPath = join(dest, 'SKILL.md');
    const content = readFileSync(skillPath, 'utf8');
    writeFileSync(skillPath, prefixSkillContent(content, prefix, allSkillNames));
    renamedCount++;
  }

  return renamedCount;
}

export function undoPrefix(root, prefix, managedSkillNames = null) {
  if (!prefix) return;
  assertValidPrefix(prefix);

  const skillsDir = getSkillsDir(root);
  const prefixedNames = managedSkillNames
    ? managedSkillNames
        .map((name) => `${prefix}${name}`)
        .filter((name) => isSkillDir(skillsDir, name))
    : getSkillNames(skillsDir).filter((name) => name.startsWith(prefix));

  for (const name of prefixedNames) {
    const src = join(skillsDir, name);
    const dest = join(skillsDir, name.slice(prefix.length));
    if (existsSync(dest)) {
      throw new Error(`Cannot remove prefix from ${name}: ${dest.slice(skillsDir.length + 1)} already exists.`);
    }
    renameSync(src, dest);

    const skillPath = join(dest, 'SKILL.md');
    const content = readFileSync(skillPath, 'utf8');
    writeFileSync(skillPath, unprefixSkillContent(content, prefix, prefixedNames));
  }
}

export function isUpToDate(root, bundleDir) {
  const localSkillsDir = getSkillsDir(root);
  const bundleSkillsDir = join(bundleDir, SKILLS_DIR_RELATIVE);
  const localPluginDir = getPluginDir(root);
  const bundlePluginDir = join(bundleDir, PLUGIN_DIR_RELATIVE);
  const prefix = detectPrefix(root);
  const bundleSkillNames = getBundleSkillNames(bundleDir);

  if (!existsSync(localSkillsDir) || bundleSkillNames.length === 0) return false;
  if (hasRetiredManagedSkills(root)) return false;

  for (const bundleName of bundleSkillNames) {
    const localName = prefix ? `${prefix}${bundleName}` : bundleName;
    if (!isSkillDirUpToDate(
      join(localSkillsDir, localName),
      join(bundleSkillsDir, bundleName),
      prefix
    )) {
      return false;
    }
  }

  return isBundleDirSubsetUpToDate(localPluginDir, bundlePluginDir);
}

function getSkillsVersion(root) {
  const skillPath = join(getSkillsDir(root), `${detectPrefix(root)}impeccable`, 'SKILL.md');
  if (!existsSync(skillPath)) return null;
  const content = readFileSync(skillPath, 'utf8');
  const match = content.match(/^version:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

async function showHelp() {
  let commands;
  try {
    const response = await fetch(`${API_BASE}/api/commands`);
    commands = await response.json();
  } catch {
    console.error('Could not fetch command list from impeccable.style. Check your network connection.');
    process.exit(1);
  }

  const pad = (value, width) => value + ' '.repeat(Math.max(0, width - value.length));

  console.log('\n  Impeccable for Codex CLI\n');
  console.log('  Install:  npx impeccable skills install');
  console.log('  Update:   npx impeccable skills update');
  console.log('  Docs:     https://impeccable.style/cheatsheet\n');
  console.log(`  ${pad('Command', 22)} Description`);
  console.log(`  ${'-'.repeat(22)} ${'-'.repeat(52)}`);

  for (const command of commands.sort((a, b) => a.id.localeCompare(b.id))) {
    const description = command.description.length > 72
      ? `${command.description.slice(0, 69)}...`
      : command.description;
    console.log(`  ${pad(`$${command.id}`, 22)} ${description}`);
  }

  console.log(`\n  ${commands.length} commands available. Run $<command> in Codex CLI.\n`);
}

async function check() {
  const root = findProjectRoot();

  if (!isAlreadyInstalled(root)) {
    console.log('Impeccable is not installed in this project.');
    console.log('Run `npx impeccable skills install` to install.');
    process.exit(0);
  }

  console.log('Checking for updates...\n');

  let bundleDir;
  try {
    bundleDir = await downloadAndExtractBundle('codex');
    const upToDate = isUpToDate(root, bundleDir);
    rmSync(bundleDir, { recursive: true, force: true });

    if (upToDate) {
      const version = getSkillsVersion(root);
      console.log(`Skills are up to date${version ? ` (v${version})` : ''}.`);
      return;
    }

    console.log('Updates available.');
    console.log('Run `npx impeccable skills update` to update.');
  } catch (error) {
    if (bundleDir) rmSync(bundleDir, { recursive: true, force: true });
    console.error(`Could not check for updates: ${error.message}`);
    process.exit(1);
  }
}

async function install(flags) {
  const root = findProjectRoot();
  const force = flags.includes('--force');
  const yes = flags.includes('-y') || flags.includes('--yes');
  const prefixFlag = flags.find((flag) => flag.startsWith('--prefix='));
  const existing = isAlreadyInstalled(root);

  if (existing && !force) {
    console.log(`Impeccable skills are already installed (found in ${existing}/).`);
    console.log('Run with --force to reinstall.\n');
    process.exit(0);
  }

  let prefix = '';
  if (prefixFlag) {
    prefix = prefixFlag.split('=')[1] || DEFAULT_PREFIX;
  } else if (!yes) {
    const wantsPrefix = await ask(`Prefix commands to avoid conflicts? e.g. $${DEFAULT_PREFIX}audit (y/N) `);
    if (wantsPrefix === 'y' || wantsPrefix === 'yes') {
      const customPrefix = await ask(`Prefix (default: ${DEFAULT_PREFIX}): `);
      prefix = customPrefix || DEFAULT_PREFIX;
    }
  }
  console.log('Installing Codex bundle...\n');

  let bundleDir;
  let bundleSkillNames = [];
  try {
    assertValidPrefix(prefix);

    if (hasLocalBundle()) {
      bundleSkillNames = getBundleSkillNames(PACKAGE_ROOT);
      installBundleIntoRoot(root, PACKAGE_ROOT, prefix);
    } else {
      bundleDir = await downloadAndExtractBundle('codex');
      bundleSkillNames = getBundleSkillNames(bundleDir);
      installBundleIntoRoot(root, bundleDir, prefix);
      rmSync(bundleDir, { recursive: true, force: true });
    }

    if (prefix && bundleSkillNames.length > 0) {
      console.log(`Installed ${bundleSkillNames.length} skills with "${prefix}" prefix.`);
      console.log(`Commands are now available as $${prefix}<command> (for example $${prefix}audit).`);
    }

    console.log(`\nDone! Run $${prefix}impeccable teach in Codex CLI to set up design context.\n`);
  } catch (error) {
    if (bundleDir) rmSync(bundleDir, { recursive: true, force: true });
    console.error(`Install failed: ${error.message}`);
    process.exit(1);
  }
}

async function update(flags = []) {
  const root = findProjectRoot();
  const yes = flags.includes('-y') || flags.includes('--yes');

  if (!isAlreadyInstalled(root)) {
    console.log('No impeccable skills found in this project.');
    console.log('Run `npx impeccable skills install` to install first.');
    process.exit(1);
  }

  console.log('Checking for updates...');

  let bundleDir;
  try {
    bundleDir = await downloadAndExtractBundle('codex');
    const bundleSkillNames = getBundleSkillNames(bundleDir);

    if (isUpToDate(root, bundleDir)) {
      const version = getSkillsVersion(root);
      rmSync(bundleDir, { recursive: true, force: true });
      console.log(`Skills are up to date${version ? ` (v${version})` : ''}. Nothing to do.`);
      return;
    }

    if (!yes) {
      const answer = await ask('Update Codex skills in this project? (Y/n) ');
      if (answer === 'n' || answer === 'no') {
        rmSync(bundleDir, { recursive: true, force: true });
        console.log('Aborted.');
        return;
      }
    }

    const prefix = detectPrefix(root);
    installBundleIntoRoot(root, bundleDir, prefix);
    rmSync(bundleDir, { recursive: true, force: true });

    if (prefix) {
      console.log(`Re-applied "${prefix}" prefix to the Codex skills.`);
    }

    const version = getSkillsVersion(root);
    console.log(`Updated Codex skills${version ? ` to v${version}` : ''}.`);
    console.log('Done!\n');
  } catch (error) {
    if (bundleDir) rmSync(bundleDir, { recursive: true, force: true });
    console.error(`Update failed: ${error.message}`);
    process.exit(1);
  }
}

export async function run(args) {
  const subcommand = args[0];

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    await showHelp();
  } else if (subcommand === 'install') {
    await install(args.slice(1));
  } else if (subcommand === 'update') {
    await update(args.slice(1));
  } else if (subcommand === 'check') {
    await check();
  } else {
    console.error(`Unknown skills command: ${subcommand}`);
    console.error(`Run 'impeccable skills --help' for available commands.`);
    process.exit(1);
  }
}
