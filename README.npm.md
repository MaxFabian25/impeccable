# Impeccable CLI

Impeccable is a Codex CLI design companion. It ships:

- Codex-only skill installation via `npx impeccable skills install`
- update and version checks for the Codex bundle
- a standalone anti-pattern detector for frontend codebases

## Quick Start

```bash
# Install the Codex bundle into the current project
npx impeccable skills install

# Check for updates
npx impeccable skills check

# Update the installed Codex bundle
npx impeccable skills update

# Scan files or directories for anti-patterns
npx impeccable detect src/

# Scan a live URL (requires Puppeteer)
npx impeccable detect https://example.com

# JSON output for CI/tooling
npx impeccable detect --json src/

# Regex-only mode (faster, no jsdom)
npx impeccable detect --fast src/
```

## Codex Commands

After installation, use the commands in Codex CLI with the `$` prefix:

- `$impeccable teach`
- `$audit`
- `$critique`
- `$polish`
- `$typeset`
- `$layout`

## What the Installer Writes

`npx impeccable skills install` installs:

- `.codex/skills/`
- `.codex-plugin/plugin.json`

By default it prefers the bundle shipped inside the npm package. Updates and checks download the latest Codex bundle from `impeccable.style`.

## Detector Exit Codes

- `0`: no issues found
- `2`: anti-patterns detected

## Requirements

- Node.js 18+
- `jsdom` for markup analysis
- `puppeteer` only when scanning live URLs

## License

[Apache 2.0](https://github.com/MaxFabian25/impeccable/blob/main/LICENSE)
