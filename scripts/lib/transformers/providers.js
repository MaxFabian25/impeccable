/**
 * Provider configurations for the transformer factory.
 *
 * The fork is Codex-only by contract. Keep one output surface:
 * - provider: key into PROVIDER_PLACEHOLDERS
 * - configDir: dot-directory name
 * - displayName: human-readable name for build logs
 * - frontmatterFields: optional fields to emit beyond name + description
 */
export const PROVIDERS = {
  codex: {
    provider: 'codex',
    configDir: '.codex',
    displayName: 'Codex CLI',
    frontmatterFields: ['argument-hint', 'license'],
  },
};
