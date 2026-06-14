/**
 * `impeccable skills` subcommand
 *
 * Codex-only contract:
 * - installs project-local plugin skills into `skills`
 * - downloads Codex bundles from impeccable.style
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  createWriteStream,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import extract from 'extract-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..', '..', '..');
const PACKAGE_PLUGIN_ROOT = join(PACKAGE_ROOT, 'plugins', 'impeccable');
const API_BASE = 'https://impeccable.style';

export const SKILLS_DIR_NAME = 'skills';
export const SKILLS_DIR_RELATIVE = SKILLS_DIR_NAME;
const PLUGIN_DIR_RELATIVE = '.codex-plugin';
const MARKETPLACE_DIR_RELATIVE = '.agents/plugins';
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

function getSkillsDir(root) {
  return join(root, SKILLS_DIR_RELATIVE);
}

function getPluginDir(root) {
  return join(root, PLUGIN_DIR_RELATIVE);
}

function getMarketplaceDir(root) {
  return join(root, MARKETPLACE_DIR_RELATIVE);
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

function normalizeForHash(content) {
  return content.replace(/^version:\s*.+$/m, 'version: NORMALIZED');
}

function hashContent(content) {
  return createHash('sha256')
    .update(normalizeForHash(content))
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

  const candidates = new Set();
  const removableNames = [...new Set([...managedSkillNames, ...RETIRED_MANAGED_SKILL_NAMES])];

  for (const skillName of removableNames) {
    candidates.add(skillName);
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

  return RETIRED_MANAGED_SKILL_NAMES.some((skillName) => (
    isSkillDir(skillsDir, skillName) || isSkillDir(skillsDir, `i-${skillName}`)
  ));
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

function isSkillDirUpToDate(localSkillDir, bundleSkillDir) {
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
      if (hashContent(localContent) !== hashContent(bundleContent)) {
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
  await extract(zipPath, { dir: extractDir });
  rmSync(zipPath, { force: true });
  return extractDir;
}

export function installBundleIntoRoot(root, bundleDir) {
  const bundleSkillsDir = join(bundleDir, SKILLS_DIR_RELATIVE);
  const localSkillsDir = getSkillsDir(root);
  const bundlePluginDir = join(bundleDir, PLUGIN_DIR_RELATIVE);
  const localPluginDir = getPluginDir(root);
  const bundleMarketplaceDir = join(bundleDir, MARKETPLACE_DIR_RELATIVE);
  const localMarketplaceDir = getMarketplaceDir(root);
  const bundleSkillNames = getBundleSkillNames(bundleDir);

  if (existsSync(bundlePluginDir)) {
    assertPluginManifestIsCompatible(localPluginDir, bundlePluginDir);
  }

  mkdirSync(localSkillsDir, { recursive: true });
  removeManagedSkillDirs(root, bundleSkillNames);
  for (const skillName of bundleSkillNames) {
    const targetDir = join(localSkillsDir, skillName);
    if (existsSync(targetDir)) {
      throw new Error(
        `Found an existing custom skill at ${SKILLS_DIR_RELATIVE}/${skillName}. Rename it before installing Impeccable.`
      );
    }

    copyDirSync(join(bundleSkillsDir, skillName), targetDir);
  }

  if (existsSync(bundlePluginDir)) {
    mkdirSync(localPluginDir, { recursive: true });
    copyDirSync(bundlePluginDir, localPluginDir);
  }

  if (existsSync(bundleMarketplaceDir)) {
    mkdirSync(localMarketplaceDir, { recursive: true });
    copyDirSync(bundleMarketplaceDir, localMarketplaceDir);
  }

  return bundleSkillNames.length;
}

function hasLocalBundle() {
  return existsSync(join(PACKAGE_PLUGIN_ROOT, SKILLS_DIR_RELATIVE))
    || existsSync(join(PACKAGE_ROOT, SKILLS_DIR_RELATIVE));
}

function getLocalBundleRoot() {
  return existsSync(join(PACKAGE_PLUGIN_ROOT, SKILLS_DIR_RELATIVE))
    ? PACKAGE_PLUGIN_ROOT
    : PACKAGE_ROOT;
}

export function isAlreadyInstalled(root) {
  const skillsDir = getSkillsDir(root);
  if (!existsSync(skillsDir)) return null;

  const entries = readdirSync(skillsDir);
  if (entries.some((entry) => entry === 'impeccable')) {
    return SKILLS_DIR_NAME;
  }

  return null;
}

export function isUpToDate(root, bundleDir) {
  const localSkillsDir = getSkillsDir(root);
  const bundleSkillsDir = join(bundleDir, SKILLS_DIR_RELATIVE);
  const localPluginDir = getPluginDir(root);
  const bundlePluginDir = join(bundleDir, PLUGIN_DIR_RELATIVE);
  const localMarketplaceDir = getMarketplaceDir(root);
  const bundleMarketplaceDir = join(bundleDir, MARKETPLACE_DIR_RELATIVE);
  const bundleSkillNames = getBundleSkillNames(bundleDir);

  if (!existsSync(localSkillsDir) || bundleSkillNames.length === 0) return false;
  if (hasRetiredManagedSkills(root)) return false;

  for (const bundleName of bundleSkillNames) {
    if (!isSkillDirUpToDate(
      join(localSkillsDir, bundleName),
      join(bundleSkillsDir, bundleName)
    )) {
      return false;
    }
  }

  return isBundleDirSubsetUpToDate(localPluginDir, bundlePluginDir)
    && isBundleDirSubsetUpToDate(localMarketplaceDir, bundleMarketplaceDir);
}

function getSkillsVersion(root) {
  const skillPath = join(getSkillsDir(root), 'impeccable', 'SKILL.md');
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
  const prefixFlag = flags.find((flag) => flag === '--prefix' || flag.startsWith('--prefix='));
  const existing = isAlreadyInstalled(root);

  if (prefixFlag) {
    console.error('Install failed: prefixed Codex installs are no longer supported. Use canonical $audit, $polish, and $impeccable commands.');
    process.exit(1);
  }

  if (existing && !force) {
    console.log(`Impeccable skills are already installed (found in ${existing}/).`);
    console.log('Run with --force to reinstall.\n');
    process.exit(0);
  }

  console.log('Installing Codex bundle...\n');

  let bundleDir;
  try {
    if (hasLocalBundle()) {
      const localBundleRoot = getLocalBundleRoot();
      installBundleIntoRoot(root, localBundleRoot);
    } else {
      bundleDir = await downloadAndExtractBundle('codex');
      installBundleIntoRoot(root, bundleDir);
      rmSync(bundleDir, { recursive: true, force: true });
    }

    console.log(`\nDone! Run $impeccable teach in Codex CLI to set up design context.\n`);
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

    installBundleIntoRoot(root, bundleDir);
    rmSync(bundleDir, { recursive: true, force: true });

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
