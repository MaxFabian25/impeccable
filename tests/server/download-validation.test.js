import { describe, expect, test } from 'bun:test';
import path from 'path';
import {
  ALLOWED_BUNDLE_PROVIDERS,
  ALLOWED_FILE_PROVIDERS,
  isAllowedBundleProvider,
  isAllowedFileProvider,
  isAllowedProvider,
} from '../../server/lib/validation.js';
import { getFilePath, handleFileDownload } from '../../server/lib/api-handlers.js';

describe('codex-only download provider validation', () => {
  test('allows codex as the only individual download provider', () => {
    expect(ALLOWED_FILE_PROVIDERS).toEqual(['codex']);
    expect(isAllowedFileProvider('codex')).toBe(true);
    expect(isAllowedFileProvider('legacy-provider')).toBe(false);
    expect(isAllowedFileProvider('other-provider')).toBe(false);
  });

  test('restricts bundle downloads to codex variants', () => {
    expect(ALLOWED_BUNDLE_PROVIDERS).toEqual(['codex', 'codex-prefixed']);
    expect(isAllowedBundleProvider('codex')).toBe(true);
    expect(isAllowedBundleProvider('codex-prefixed')).toBe(true);
    expect(isAllowedProvider('codex-prefixed')).toBe(true);
    expect(isAllowedBundleProvider('universal')).toBe(false);
  });
});

describe('codex-only download file paths', () => {
  test('maps skills into the .codex config directory', () => {
    expect(getFilePath('skill', 'codex', 'impeccable')).toBe(
      path.join(process.cwd(), 'dist', 'codex', '.codex', 'skills', 'impeccable', 'SKILL.md')
    );
  });

  test('maps commands into the same codex skill file path', () => {
    expect(getFilePath('command', 'codex', 'audit')).toBe(
      path.join(process.cwd(), 'dist', 'codex', '.codex', 'skills', 'audit', 'SKILL.md')
    );
  });

  test('rejects bundle-only providers on the individual download route', async () => {
    const response = await handleFileDownload('skill', 'codex-prefixed', 'impeccable');
    expect(response.status).toBe(400);
  });
});
