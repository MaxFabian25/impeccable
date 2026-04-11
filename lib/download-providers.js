export const FILE_DOWNLOAD_PROVIDER_CONFIG_DIRS = Object.freeze({
  codex: '.codex',
});

export const FILE_DOWNLOAD_PROVIDERS = Object.freeze(
  Object.keys(FILE_DOWNLOAD_PROVIDER_CONFIG_DIRS)
);

export const BUNDLE_DOWNLOAD_PROVIDERS = Object.freeze([
  'codex',
  'codex-prefixed',
]);

export const DOWNLOAD_PROVIDERS = Object.freeze([
  ...FILE_DOWNLOAD_PROVIDERS,
  ...BUNDLE_DOWNLOAD_PROVIDERS,
]);
