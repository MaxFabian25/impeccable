import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { loadContext } from '../../skills/impeccable/scripts/load-context.mjs';

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
    fs.writeFileSync(path.join(TEST_DIR, 'product.md'), '# Product\n\n## Register\n\nproduct\n');
    fs.writeFileSync(path.join(TEST_DIR, 'Design.md'), '# Design\n');

    const result = loadContext(TEST_DIR);

    expect(result).toMatchObject({
      hasProduct: true,
      product: '# Product\n\n## Register\n\nproduct\n',
      register: 'product',
      productPath: 'product.md',
      hasDesign: true,
      design: '# Design\n',
      designIsSeed: false,
      designPath: 'Design.md',
      migrated: false,
    });
  });

  test('detects seed DESIGN.md and ignores invalid register values', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'PRODUCT.md'), '# Product\n\n## Register\n\nmaybe\n');
    fs.writeFileSync(path.join(TEST_DIR, 'DESIGN.md'), '# Design\n\n<!-- SEED - refresh later. -->\n');

    const result = loadContext(TEST_DIR);

    expect(result.register).toBeNull();
    expect(result.designIsSeed).toBe(true);
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
