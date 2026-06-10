import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commandCategories, commandRelationships } from '../public/js/data.js';

const REPO_ROOT = join(import.meta.dir, '..');
const CURRENT_COMMANDS = [
  'impeccable',
  'shape',
  'audit',
  'critique',
  'typeset',
  'layout',
  'colorize',
  'animate',
  'delight',
  'bolder',
  'quieter',
  'overdrive',
  'distill',
  'clarify',
  'adapt',
  'polish',
  'optimize',
  'harden',
  'onboard',
].sort();

describe('codex-only site contract', () => {
  test('public command registry exposes only the 19 current commands', () => {
    expect(Object.keys(commandCategories).sort()).toEqual(CURRENT_COMMANDS);
    expect(Object.keys(commandRelationships).sort()).toEqual(CURRENT_COMMANDS);
  });

  test('cheatsheet renders dollar-prefixed commands from the shared data module', () => {
    const cheatsheet = readFileSync(join(REPO_ROOT, 'public', 'cheatsheet.html'), 'utf8');

    expect(cheatsheet).toContain(`from './js/data.js'`);
    expect(cheatsheet).not.toContain('/audit');
    expect(cheatsheet).not.toContain('/shape');
    expect(cheatsheet).not.toContain('/polish');
  });

  test('gallery redirects are removed from runtime and build routing', () => {
    const serverIndex = readFileSync(join(REPO_ROOT, 'server', 'index.js'), 'utf8');
    const buildScript = readFileSync(join(REPO_ROOT, 'scripts', 'build.js'), 'utf8');

    expect(serverIndex).not.toContain('"/gallery"');
    expect(buildScript).not.toContain('/gallery /visual-mode#try-it-live 301');
    expect(buildScript).toContain("fs.rmSync(outdir, { recursive: true, force: true });");
  });

  test('sitemap includes the visual mode page and every current skill detail page', () => {
    const sitemap = readFileSync(join(REPO_ROOT, 'public', 'sitemap.xml'), 'utf8');

    expect(sitemap).toContain('<loc>https://impeccable.style/visual-mode</loc>');
    expect(sitemap).toContain('<loc>https://impeccable.style/skills/layout</loc>');
    expect(sitemap).toContain('<loc>https://impeccable.style/skills/onboard</loc>');
  });

  test('landing-page client no longer carries retired command ids and includes the extract mode guide', () => {
    const demoRenderer = readFileSync(join(REPO_ROOT, 'public', 'js', 'demo-renderer.js'), 'utf8');
    const glassTerminal = readFileSync(join(REPO_ROOT, 'public', 'js', 'components', 'glass-terminal.js'), 'utf8');

    expect(demoRenderer).toContain('$impeccable extract');
    expect(glassTerminal).not.toContain('teach-impeccable');
    expect(glassTerminal).not.toContain('frontend-design');
    expect(glassTerminal).not.toContain("'arrange'");
    expect(glassTerminal).not.toContain("'normalize'");
    expect(glassTerminal).not.toContain("'extract'");
  });
});
