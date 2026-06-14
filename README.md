# Impeccable for Codex CLI

Impeccable is a Codex-native design skill pack for frontend work. It gives Codex a stronger design vocabulary, 19 steering commands, and explicit anti-pattern guidance so the output stops collapsing into the same generic UI defaults.

## What's Included

- `impeccable`: the core design skill, with reference material across typography, color, layout, motion, responsive behavior, interaction design, and UX writing.
- 19 user-invocable commands such as `$audit`, `$critique`, `$polish`, `$typeset`, `$layout`, `$onboard`, and `$overdrive`.
- A deterministic anti-pattern detector and CLI for scanning HTML, JSX, TSX, Vue, and Svelte for common “AI slop” tells and general design quality issues.

## Install

Recommended:

```bash
codex plugin marketplace add MaxFabian25/impeccable --ref main
codex plugin add impeccable@impeccable
```

This installs the public GitHub-backed Codex plugin. The plugin source lives in this repository:

- `plugins/impeccable/skills/`
- `plugins/impeccable/.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`

Manual options:

```bash
# From a local checkout
cp -R plugins/impeccable/skills plugins/impeccable/.codex-plugin /path/to/your-project/

# Or download a bundle from impeccable.style
# Canonical bundle: $audit, $polish, ...
```

## Use in Codex

Start by teaching project context:

```text
$impeccable teach
```

Then use the steering commands directly:

```text
$audit checkout flow
$critique landing page
$polish settings screen
$layout dashboard
$typeset marketing hero
```

The core command language is `$...`, not `/...`.

## CLI

Impeccable also ships a standalone detector:

```bash
npx impeccable detect src/
npx impeccable detect https://example.com
npx impeccable detect --json src/
```

Useful follow-up commands:

```bash
npx impeccable skills check
npx impeccable skills update
```

## Community & Ecosystem

Use the public repo for Codex plugin issues, focused pull requests, and local fork coordination:

- [MaxFabian25/impeccable](https://github.com/MaxFabian25/impeccable): Codex plugin source, marketplace metadata, and detector runtime.
- [Impeccable on npm](https://www.npmjs.com/package/impeccable): standalone detector releases for `npx impeccable ...` workflows.

## Repository Layout

```text
skills/                  canonical authored skills
plugins/impeccable/skills/      tracked Codex plugin output used in the repo
plugins/impeccable/.codex-plugin/plugin.json Codex plugin manifest
.agents/plugins/marketplace.json Git-backed Codex marketplace metadata
scripts/build.js                Codex bundle build pipeline
functions/api/download/         download routes for Codex bundles and files
cli/                            anti-pattern detector and CLI runtime
```

## Contributing

See [DEVELOP.md](DEVELOP.md) for contributor notes and build details.

## License

Apache 2.0. See [LICENSE](LICENSE).

The core skill builds on Anthropic's original frontend-design skill. See [NOTICE.md](NOTICE.md) for attribution.
