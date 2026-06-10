# Impeccable Repository Notes

## Purpose

This fork is Codex-only. The repository maintains one authored skill source and one generated Codex distribution surface.

## Canonical Flow

1. Author and edit skills in `source/skills/<name>/SKILL.md`
2. Run the build to generate:
   - `dist/codex/skills/`
   - `dist/codex.zip`
3. Sync the generated Codex skills back into the plugin source at `plugins/impeccable/skills/`

## Key Paths

```text
source/skills/                  canonical authored skills
plugins/impeccable/skills/      tracked Codex plugin output
plugins/impeccable/.codex-plugin/plugin.json Codex plugin manifest
.agents/plugins/marketplace.json Git-backed Codex marketplace metadata
scripts/build.js                build orchestration
scripts/lib/transformers/       Codex transformer config
lib/download-providers.js       Codex download registry
functions/api/download/         download routes
server/                         local dev server
src/                            detector + CLI runtime
tests/                          contract coverage
```

## Commands

```bash
# Build the Codex bundle
bun run build

# Run the detector test suites
bun test tests/build.test.js tests/lib/transformers/providers.test.js tests/server/download-validation.test.js tests/skills-cli.test.js
node --test tests/cleanup-deprecated.test.mjs tests/detect-antipatterns-fixtures.test.mjs tests/detect-antipatterns-browser.test.mjs
```

## Repository Rules

- Do not reintroduce non-Codex provider outputs, docs, or install paths.
- Keep the command prefix Codex-native: `$audit`, `$polish`, `$impeccable`, and so on.
- Treat `plugins/impeccable/skills` plus `plugins/impeccable/.codex-plugin/plugin.json` as the installable surface.
- Keep `source/skills` as the single authored source of truth.
