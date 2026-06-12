import { describe, expect, test } from 'bun:test';
import {
  BUNDLE_DOWNLOAD_PROVIDERS,
  DOWNLOAD_PROVIDERS,
  FILE_DOWNLOAD_PROVIDER_SKILLS_DIRS,
  FILE_DOWNLOAD_PROVIDERS,
} from '../lib/download-providers.js';
import { onRequestGet as handleBundleDownload } from '../functions/api/download/bundle/[provider].js';

const isAllowedBundleProvider = provider => BUNDLE_DOWNLOAD_PROVIDERS.includes(provider);
const isAllowedFileProvider = provider => FILE_DOWNLOAD_PROVIDERS.includes(provider);
const isAllowedProvider = provider => DOWNLOAD_PROVIDERS.includes(provider);

describe('codex-only download provider validation', () => {
  test('allows codex as the only individual download provider', () => {
    expect(FILE_DOWNLOAD_PROVIDERS).toEqual(['codex']);
    expect(FILE_DOWNLOAD_PROVIDER_SKILLS_DIRS).toEqual({ codex: 'skills' });
    expect(isAllowedFileProvider('codex')).toBe(true);
    expect(isAllowedFileProvider('legacy-provider')).toBe(false);
    expect(isAllowedFileProvider('other-provider')).toBe(false);
  });

  test('restricts bundle downloads to canonical codex only', () => {
    expect(BUNDLE_DOWNLOAD_PROVIDERS).toEqual(['codex']);
    expect(isAllowedBundleProvider('codex')).toBe(true);
    expect(isAllowedBundleProvider('codex-prefixed')).toBe(false);
    expect(isAllowedProvider('codex-prefixed')).toBe(false);
    expect(isAllowedBundleProvider('universal')).toBe(false);
  });

  test('rejects removed prefixed bundle provider on the bundle route', async () => {
    const response = await handleBundleDownload({
      params: { provider: 'codex-prefixed' },
      request: new Request('https://impeccable.style/api/download/bundle/codex-prefixed'),
      env: {
        ASSETS: {
          fetch() {
            throw new Error('ASSETS.fetch should not be called for invalid providers');
          },
        },
      },
    });
    expect(response.status).toBe(400);
  });
});
