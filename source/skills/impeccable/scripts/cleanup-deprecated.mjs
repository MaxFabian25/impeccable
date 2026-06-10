#!/usr/bin/env node
/**
 * Cleans up deprecated Impeccable skill files, symlinks, and
 * skills-lock.json entries left over from previous versions.
 *
 * Safe to run repeatedly -- it is a no-op when nothing needs cleaning.
 *
 * Usage (from the project root):
 *   node {{scripts_path}}/cleanup-deprecated.mjs
 *
 * What it does:
 *   1. Finds the Codex plugin skills directory (`skills`).
 *   2. For each deprecated skill name (with and without i- prefix),
 *      checks the lockfile first, then falls back to SKILL.md content
 *      to avoid deleting unrelated user skills.
 *   3. Deletes confirmed matches (files, directories, or symlinks).
 *   4. Removes the corresponding entries from skills-lock.json.
 */

import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, lstatSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Skills that were renamed, merged, or folded in v2.0 and v2.1.
const DEPRECATED_NAMES = [
  'frontend-design',    // renamed to impeccable (v2.0)
  'teach-impeccable',   // folded into $impeccable teach (v2.0)
  'arrange',            // renamed to layout (v2.1)
  'normalize',          // merged into polish (v2.1)
  'extract',            // merged into $impeccable extract (v2.1)
];

const IMPECCABLE_SOURCE = 'MaxFabian25/impeccable';

// Codex plugin skills are the only supported skill surface in this fork.
const SKILLS_DIR_NAME = 'skills';

/**
 * Walk up from startDir until we find a directory that looks like a
 * project root (has package.json, .git, or skills-lock.json).
 */
export function findProjectRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  const { root } = { root: '/' };
  while (dir !== root) {
    if (
      existsSync(join(dir, 'package.json')) ||
      existsSync(join(dir, '.git')) ||
      existsSync(join(dir, 'skills-lock.json'))
    ) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

/**
 * Load skills-lock.json when it exists and is valid.
 */
export function loadLock(projectRoot) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  if (!existsSync(lockPath)) return null;

  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
    return lock && typeof lock === 'object' ? lock : null;
  } catch {
    return null;
  }
}

/**
 * Check whether a skill directory belongs to Impeccable. A matching
 * skills-lock.json source is authoritative; SKILL.md content is the
 * fallback for older installs without a lock entry.
 * Returns false for non-existent paths or skills that don't match.
 */
export function isImpeccableSkill(skillDir, { skillName, lock } = {}) {
  if (skillName && lock?.skills?.[skillName]?.source === IMPECCABLE_SOURCE) {
    return true;
  }

  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) return false;
  try {
    const content = readFileSync(skillMd, 'utf-8');
    return /impeccable/i.test(content);
  } catch {
    return false;
  }
}

/**
 * Build the full list of names to check: each deprecated name, plus
 * its i-prefixed variant.
 */
export function buildTargetNames() {
  const names = [];
  for (const name of DEPRECATED_NAMES) {
    names.push(name);
    names.push(`i-${name}`);
  }
  return names;
}

/**
 * Find the supported Codex plugin skills directory in the project.
 * Returns an absolute path when it exists on disk.
 */
export function findSkillsDirs(projectRoot) {
  const candidate = join(projectRoot, SKILLS_DIR_NAME);
  return existsSync(candidate) ? [candidate] : [];
}

/**
 * Remove deprecated skill directories/symlinks from the Codex skill dir.
 * Returns an array of paths that were deleted.
 */
export function removeDeprecatedSkills(projectRoot) {
  const targets = buildTargetNames();
  const skillsDirs = findSkillsDirs(projectRoot);
  const lock = loadLock(projectRoot);
  const deleted = [];

  for (const skillsDir of skillsDirs) {
    for (const name of targets) {
      const skillPath = join(skillsDir, name);

      // Use lstat to detect symlinks (existsSync follows symlinks and
      // returns false for dangling ones).
      let stat;
      try {
        stat = lstatSync(skillPath);
      } catch {
        continue; // does not exist at all
      }

      if (stat.isSymbolicLink()) {
        // Symlink: check the target if it's alive, otherwise treat
        // dangling symlinks to deprecated names as safe to remove.
        const targetAlive = existsSync(skillPath);
        const isMatch = targetAlive ? isImpeccableSkill(skillPath, { skillName: name, lock }) : true;
        if (isMatch) {
          unlinkSync(skillPath);
          deleted.push(skillPath);
        }
        continue;
      }

      // Regular directory -- verify it belongs to impeccable
      if (isImpeccableSkill(skillPath, { skillName: name, lock })) {
        rmSync(skillPath, { recursive: true, force: true });
        deleted.push(skillPath);
      }
    }
  }

  return deleted;
}

/**
 * Remove deprecated entries from skills-lock.json.
 * Only removes entries whose source is the current fork.
 * Returns the list of removed skill names.
 */
export function cleanSkillsLock(projectRoot) {
  const lockPath = join(projectRoot, 'skills-lock.json');
  const lock = loadLock(projectRoot);

  if (!lock?.skills || typeof lock.skills !== 'object') return [];

  const targets = buildTargetNames();
  const removed = [];

  for (const name of targets) {
    const entry = lock.skills[name];
    if (!entry) continue;
    // Only remove if it belongs to impeccable
    if (entry.source === IMPECCABLE_SOURCE) {
      delete lock.skills[name];
      removed.push(name);
    }
  }

  if (removed.length > 0) {
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  }

  return removed;
}

/**
 * Run the full cleanup. Returns a summary object.
 */
export function cleanup(projectRoot) {
  const root = projectRoot || findProjectRoot();
  const deletedPaths = removeDeprecatedSkills(root);
  const removedLockEntries = cleanSkillsLock(root);
  return { deletedPaths, removedLockEntries, projectRoot: root };
}

// CLI entry point
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const result = cleanup();
  if (result.deletedPaths.length === 0 && result.removedLockEntries.length === 0) {
    console.log('No deprecated Impeccable skills found. Nothing to clean up.');
  } else {
    if (result.deletedPaths.length > 0) {
      console.log(`Removed ${result.deletedPaths.length} deprecated skill(s):`);
      for (const p of result.deletedPaths) console.log(`  - ${p}`);
    }
    if (result.removedLockEntries.length > 0) {
      console.log(`Cleaned ${result.removedLockEntries.length} entry/entries from skills-lock.json:`);
      for (const name of result.removedLockEntries) console.log(`  - ${name}`);
    }
  }
}
