import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
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

  test('slop is canonical and old public pages redirect', () => {
    const serverIndex = readFileSync(join(REPO_ROOT, 'server', 'index.js'), 'utf8');
    const buildScript = readFileSync(join(REPO_ROOT, 'scripts', 'build.js'), 'utf8');

    expect(serverIndex).not.toContain('"/gallery"');
    expect(serverIndex).toContain('"/slop"');
    expect(serverIndex).toContain('"/anti-patterns": () => Response.redirect("/slop#catalog", 301)');
    expect(serverIndex).toContain('"/visual-mode": () => Response.redirect("/slop#see-it", 301)');
    expect(buildScript).not.toContain('/gallery /visual-mode#try-it-live 301');
    expect(buildScript).toContain('/anti-patterns /slop#catalog 301');
    expect(buildScript).toContain('/visual-mode /slop#see-it 301');
    expect(buildScript).toContain("fs.rmSync(outdir, { recursive: true, force: true });");
  });

  test('visualize-first site flow stays Codex-only and has source assets', () => {
    const homepage = readFileSync(join(REPO_ROOT, 'public', 'index.html'), 'utf8');
    const subPageBuilder = readFileSync(join(REPO_ROOT, 'scripts', 'build-sub-pages.js'), 'utf8');

    expect(existsSync(join(REPO_ROOT, 'public', 'assets', 'openai_image_2_brand.jpg'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'public', 'assets', 'openai_image_2_hifi.jpg'))).toBe(true);
    expect(homepage).toContain('Visualize, then build');
    expect(homepage).toContain('Picture it before Codex builds it.');
    expect(homepage).toContain('OpenAI image generation via Codex');
    expect(subPageBuilder).toContain('Start with words, pictures, then code.');
    expect(subPageBuilder).toContain('OpenAI image generation');

    for (const source of [homepage, subPageBuilder]) {
      expect(source).not.toContain('Nano Banana');
      expect(source).not.toContain('Imagen');
      expect(source).not.toContain('Grok');
      expect(source).not.toContain('compatible harness');
    }
  });

  test('sitemap includes generated section pages and every current skill detail page', () => {
    const sitemap = readFileSync(join(REPO_ROOT, 'public', 'sitemap.xml'), 'utf8');

    expect(sitemap).toContain('<loc>https://impeccable.style/designing</loc>');
    expect(sitemap).toContain('<loc>https://impeccable.style/slop</loc>');
    expect(sitemap).not.toContain('<loc>https://impeccable.style/anti-patterns</loc>');
    expect(sitemap).not.toContain('<loc>https://impeccable.style/visual-mode</loc>');
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
