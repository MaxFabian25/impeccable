Generate or refresh a project-root `DESIGN.md` that captures the current visual design system for future design work.

`DESIGN.md` is the visual counterpart to `PRODUCT.md`:

- PRODUCT.md answers who, what, why, voice, and strategic principles.
- DESIGN.md answers colors, typography, spacing, shape, components, layout, and visual do/don't guidance.

Follow the Stitch-style shape: machine-readable YAML front matter for tokens, then a markdown body explaining how to use them.

## When To Run

- The user just ran `$impeccable teach` and wants the visual side documented.
- A command noticed `PRODUCT.md` exists but `DESIGN.md` is missing.
- The visual design has drifted and the file needs a refresh.
- Before a larger redesign, so the current system is captured before changing it.

If `DESIGN.md` already exists, do not silently overwrite it. Read it, summarize what is already there, and ask whether to refresh, merge, or leave it alone.

## Step 1: Load Context

Run:

```bash
node {{scripts_path}}/load-context.mjs
```

Use PRODUCT.md to understand users, purpose, voice, anti-references, and strategic design principles. If `hasProduct` is false, pause and run `$impeccable teach` first unless the user explicitly wants a visual-only extraction.

## Step 2: Find Design Sources

Search the project in this order:

1. CSS custom properties: `--color-*`, `--font-*`, `--space-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`.
2. Tailwind config: `tailwind.config.{js,ts,mjs,cjs}` and any preset files.
3. Theme/token files: `theme.ts`, `tokens.ts`, `tokens.json`, `design-tokens.json`, Style Dictionary outputs, CSS modules with shared variables.
4. Global stylesheets: app globals, reset files, public CSS, root layout styles.
5. Component implementations: buttons, cards, inputs, nav, dialogs, tables, tabs, sidebars, empty states.
6. Rendered UI if browser automation is available: sample computed styles for body text, headings, links, buttons, cards, inputs, and navigation.

Record both the token values and where they came from. Prefer values used repeatedly over one-off styling.

## Step 3: Extract Token Candidates

Build a draft model:

```yaml
version: alpha
name: <project or product name>
description: <one sentence visual system summary>
colors:
  <semantic-token>: "#RRGGBB"
typography:
  <role-token>:
    fontFamily: <family>
    fontSize: <size>
    fontWeight: <weight>
    lineHeight: <line-height>
    letterSpacing: <letter-spacing>
rounded:
  <scale-token>: <dimension>
spacing:
  <scale-token>: <dimension>
components:
  <component-token>:
    <style-property>: <value or token reference>
```

Use semantic token names when the codebase already has them. If the codebase uses raw or framework names, translate them into descriptive semantic names and keep the exact value.

Extraction rules:

- Colors: group by role: background, surface, text, border, accent, state, data visualization. Include hex values; add OKLCH values only if the project already uses OKLCH or the conversion helps explain contrast/chroma.
- Typography: record actual font families, sizes, weights, line heights, and letter spacing used in repeated roles.
- Spacing: identify the base unit and the repeated scale. Do not document every arbitrary margin.
- Rounded and shadows: document repeated radii and elevation/depth treatments.
- Components: document stable component patterns, not every page-specific variant.

## Step 4: Ask For Human Visual Language

Some parts cannot be extracted reliably from code. Ask only for what is missing:

- Visual atmosphere in 3-6 adjectives.
- Color names if raw token names are too mechanical.
- Typography character: clinical, editorial, playful, industrial, dense, airy, etc.
- Component feel: quiet, tactile, precise, soft, brutal, luxurious, utilitarian.
- Any visual anti-references not already in PRODUCT.md.

Keep this to one short interaction when possible. Offer concrete suggestions based on the extracted system.

## Step 5: Write DESIGN.md

Write `DESIGN.md` at the project root with YAML front matter plus markdown explanation:

```markdown
---
version: alpha
name: <system name>
description: <short summary>
colors:
  background: "#ffffff"
  surface: "#f7f7f4"
  text-primary: "#161616"
typography:
  body-md:
    fontFamily: <font family>
    fontSize: 16px
    fontWeight: 400
rounded:
  md: 8px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.md}"
---

# Design System

## Overview
[Visual atmosphere, system philosophy, and how it supports PRODUCT.md.]

## Colors
- **Background** (#ffffff): [role and usage]

## Typography
- **Body**: [family, size, weight, character, usage]

## Layout
[Grid, max-widths, spacing rhythm, density, responsive behavior.]

## Shapes, Elevation & Depth
[Radii, borders, shadows, layering.]

## Components
- **Buttons**: [shape, padding, color, hover/focus states]
- **Cards**: [surface, border/shadow, padding, media treatment]
- **Inputs**: [stroke, background, focus treatment]
- **Navigation**: [layout, active states, mobile behavior]

## Do's And Don'ts
- Do [specific visual rule].
- Don't [specific visual anti-pattern].
```

Omit sections that truly do not apply, but keep the order above for sections that are present.

## Step 6: Confirm

After writing the file:

1. Summarize the extracted token sources.
2. Name any inferred choices that should be reviewed by the user.
3. Mention whether PRODUCT.md influenced the visual interpretation.
4. Offer a concise refinement pass for names, atmosphere language, or missing component categories.
5. Run `node {{scripts_path}}/load-context.mjs` one final time and consume the full JSON output so the freshly written DESIGN.md is in session context for any follow-up command.

## Quality Bar

- Do not paste raw CSS as documentation.
- Do not invent tokens that are not present or approved.
- Do not track one-off values as system rules.
- Do not duplicate PRODUCT.md prose. Reference strategic principles only when they explain a visual decision.
- Include exact values for every token that can be extracted.
- Keep the document useful for agents and humans, not just mechanically complete.
