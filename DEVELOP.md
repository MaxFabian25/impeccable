# Developing Impeccable

This fork targets Codex CLI only.

## Architecture

- `source/skills/` is the canonical authored source.
- `scripts/build.js` transforms the source into the Codex runtime format.
- `.codex/skills/` is the tracked generated output used by the repo and packaged installer.
- `.codex-plugin/plugin.json` provides Codex plugin metadata for the bundle.
- `dist/codex*` and the matching ZIPs are the downloadable artifacts served by the website and API routes.

## Build

The build currently depends on Bun.

```bash
bun run build
```

That command:

1. regenerates sub-pages for the site
2. bundles the static site
3. transforms authored skills into Codex and prefixed-Codex outputs
4. prepares the Codex bundle metadata
5. creates `codex.zip` and `codex-prefixed.zip`
6. syncs the generated skills back into `.codex/skills/`

## Editing Skills

Add or update skills in:

```text
source/skills/<skill-name>/SKILL.md
source/skills/<skill-name>/reference/*.md
source/skills/<skill-name>/scripts/*
```

Important conventions:

- use Codex command syntax in generated output: `$command`
- keep `source/skills` provider-agnostic where possible, and let the Codex placeholder replacement handle command prefixes and config references
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
- `public/index.html`: landing page / download UI
- `public/privacy.html`: privacy policy
- `functions/api/download/`: download endpoints
- `bin/commands/skills.mjs`: install/update/check flows

## Hard-Cut Rule

Do not preserve old multi-provider surfaces. If a path, doc, or script still mentions Claude Code, Cursor, Gemini, OpenCode, Pi, Trae, Kiro, Rovo Dev, or `.agents`, remove or rewrite it instead of layering compatibility on top.
