# Developing Impeccable

This fork targets Codex CLI only.

## Architecture

- `skills/` is the canonical authored source.
- `scripts/build.js` transforms the source into the Codex runtime format.
- `plugins/impeccable/skills/` is the tracked generated Codex plugin output.
- `plugins/impeccable/.codex-plugin/plugin.json` provides Codex plugin metadata for the bundle.
- `.agents/plugins/marketplace.json` lets the public GitHub repo act as a Codex marketplace.
- `dist/codex*` and the matching ZIPs are the downloadable artifacts served by the website and API routes.

## Build

The build currently depends on Bun.

```bash
bun run build
```

That command:

1. regenerates sub-pages for the site
2. bundles the static site
3. transforms authored skills into Codex output
4. prepares the Codex bundle metadata
5. creates `codex.zip`
6. syncs the generated skills back into `plugins/impeccable/skills/`

## Editing Skills

Add or update skills in:

```text
skills/<skill-name>/SKILL.md
skills/<skill-name>/reference/*.md
skills/<skill-name>/scripts/*
```

Important conventions:

- use Codex command syntax in generated output: `$command`
- keep `skills/` provider-agnostic where possible, and let the Codex placeholder replacement handle command prefixes and config references
- do not add alternate provider frontmatter or directory formats

## Testing

Primary suites:

```bash
bun test tests/build.test.js tests/lib/transformers/providers.test.js tests/server/download-validation.test.js tests/skills-cli.test.js
node --test tests/cleanup-deprecated.test.mjs tests/detect-antipatterns-fixtures.test.mjs tests/detect-antipatterns-browser.test.mjs
```

If Bun is unavailable locally, use targeted Node-based verification scripts before claiming success and note the gap.

## Release Surfaces

- `README.md`: Codex-facing repository docs
- `README.npm.md`: npm package docs
- `site/pages/index.astro`: landing page / download UI
- `site/pages/privacy.astro`: privacy policy
- `functions/api/download/`: download endpoints
- `cli/bin/commands/skills.mjs`: install/update/check flows

## Hard-Cut Rule

Do not preserve old multi-provider surfaces. If a path, doc, or script still mentions Claude Code, Cursor, Gemini, OpenCode, Pi, Trae, Kiro, or Rovo Dev, remove or rewrite it instead of layering compatibility on top. Keep `.agents/plugins/marketplace.json`; that is Codex marketplace metadata for this fork.
