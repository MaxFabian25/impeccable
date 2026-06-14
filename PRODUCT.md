# Product

## Users

Impeccable serves frontend and full-stack developers using Codex CLI who want stronger design output from AI-generated UI work. They already know generic AI interfaces have recognizable quality problems. They need a practical Codex plugin that gives the agent a sharper design vocabulary, targeted steering commands, and deterministic checks for common visual anti-patterns.

Secondary users are plugin authors and maintainers who need a clear example of a public, GitHub-backed Codex plugin with authored source skills, generated installable plugin output, and a small local CLI runtime.

## Product Purpose

Impeccable for Codex CLI is a design skill pack and detector for frontend work. It gives Codex a shared design language through `$impeccable`, `$audit`, `$critique`, `$polish`, `$typeset`, `$layout`, `$onboard`, and related commands. It also ships `npx impeccable detect` for scanning source files or URLs for recurring AI design tells and broader design quality issues.

Success means a Codex user can steer design work with precise commands instead of vague prose, and Codex can produce interfaces that survive professional design review without collapsing into purple gradients, generic card grids, weak hierarchy, or careless responsive behavior.

## Brand Personality

The product voice is expert, decisive, and editorial. It should sound like an experienced design director: specific, opinionated, and useful without becoming theatrical. It avoids hedging, hype, and generic SaaS optimism.

Three-word personality: **expert, decisive, editorial**.

## Anti-References

Avoid the exact habits Impeccable teaches Codex to notice:

- Generic AI-tool marketing: dark blue or black pages with purple/cyan gradients, glowing particles, glass panels, and synthetic bokeh.
- SaaS sameness: hero metrics, feature-card walls, decorative sparklines, "boost productivity" copy, and undifferentiated dashboard mockups.
- Weak design critique: vague "make it modern" instructions, generic "improve the vibe" language, or recommendations that do not name a concrete visual behavior.
- Multi-provider drift: non-Codex install paths, slash-command assumptions, or generated provider surfaces outside this fork's Codex plugin layout.
- Over-decoration: visuals that exist only because landing pages usually have them.

## Design Principles

1. **Practice what the plugin teaches.** The public site, docs, and examples should avoid the anti-patterns that the detector and skills flag.
2. **Codex-first clarity.** Use Codex-native `$` commands and the local plugin layout consistently: `skills/` as authored source and `plugins/impeccable/skills` as generated installable output.
3. **Show quality through execution.** The site and examples should demonstrate design taste directly, not merely describe it.
4. **Editorial over marketing.** Favor considered typography, confident hierarchy, useful examples, and precise prose over conversion-page decoration.
5. **Hard cutovers over compatibility clutter.** Remove old provider assumptions and outdated command surfaces rather than preserving confusing shims.

## Accessibility & Inclusion

Baseline: WCAG 2.1 AA for the public site and generated examples.

- Preserve keyboard navigation and visible focus states for all interactive UI.
- Respect `prefers-reduced-motion` for animation-heavy examples.
- Keep contrast checks grounded in actual rendered colors, not visual guesswork.
- Prefer semantic HTML before ARIA.
- Keep copy direct and readable, while using exact design vocabulary when precision matters.
