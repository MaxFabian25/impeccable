import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { loadContext } from '../../source/skills/impeccable/scripts/load-context.mjs';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-load-context');

describe('loadContext', () => {
  beforeEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('reads PRODUCT.md and DESIGN.md case-insensitively', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'product.md'), '# Product\n');
    fs.writeFileSync(path.join(TEST_DIR, 'Design.md'), '# Design\n');

    const result = loadContext(TEST_DIR);

    expect(result).toMatchObject({
      hasProduct: true,
      product: '# Product\n',
      productPath: 'product.md',
      hasDesign: true,
      design: '# Design\n',
      designPath: 'Design.md',
      migrated: false,
    });
  });

  test('migrates legacy .impeccable.md to PRODUCT.md when needed', () => {
    fs.writeFileSync(path.join(TEST_DIR, '.impeccable.md'), 'legacy context');

    const result = loadContext(TEST_DIR);

    expect(result).toMatchObject({
      hasProduct: true,
      product: 'legacy context',
      productPath: 'PRODUCT.md',
      migrated: true,
    });
    expect(fs.existsSync(path.join(TEST_DIR, 'PRODUCT.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, '.impeccable.md'))).toBe(false);
  });
});
