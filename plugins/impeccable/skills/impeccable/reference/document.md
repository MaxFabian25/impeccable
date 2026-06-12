Generate or refresh a project-root `DESIGN.md` that captures the current visual design system for future design work.

`DESIGN.md` is the visual counterpart to `PRODUCT.md`:

- PRODUCT.md answers who, what, why, voice, and strategic principles.
- DESIGN.md answers colors, typography, spacing, shape, components, layout, and visual do/don't guidance.

Follow the Google Stitch DESIGN.md two-layer shape: YAML front matter carrying machine-readable design tokens, followed by a markdown body that explains how to use them. The markdown body must use these six top-level sections in this order:

1. `## Overview`
2. `## Colors`
3. `## Typography`
4. `## Elevation`
5. `## Components`
6. `## Do's and Don'ts`

The front matter is normative for token values. The markdown body is where you explain purpose, context, and usage. Do not rename or reorder the six body sections.

## Front Matter Token Schema

Use front matter for compact, machine-readable tokens. Keep it to values the project actually uses:

```yaml
---
name: <project or product name>
description: <one sentence visual system summary>
colors:
  accent: "#b8422e"
  surface: "#faf7f2"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
---
```

Rules:

- Token references use `{path.to.token}`, such as `{colors.accent}` or `{rounded.md}`.
- Stitch validates colors as hex sRGB. If a project deliberately uses OKLCH, Display-P3, or HSL as its source of truth, keep that canonical value in front matter and accept that strict Stitch linting may warn.
- Component tokens are intentionally small: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, and `width`. Anything richer belongs in `.impeccable/design.json`.
- Do not invent top-level front matter groups like `motion`, `layout`, `breakpoints`, or `shadows`. Put those in the sidecar extensions or the markdown body.

## When To Run

- The user just ran `$impeccable teach` and wants the visual side documented.
- A command noticed `PRODUCT.md` exists but `DESIGN.md` is missing.
- The visual design has drifted and the file needs a refresh.
- Before a larger redesign, so the current system is captured before changing it.
- The project is pre-implementation and needs a seed `DESIGN.md` before the first serious interface is built.

If `DESIGN.md` already exists, do not silently overwrite it. Read it, summarize what is already there, and ask whether to refresh, merge, or leave it alone.

## Choose A Path

- **Scan mode**: Use when there is an existing visual system to inspect. Extract real colors, typography, spacing, elevation, and components from source and rendered UI. Write both `DESIGN.md` and `.impeccable/design.json`.
- **Seed mode**: Use when the project has little or no implemented UI. Ask a short visual-direction interview, write a starter `DESIGN.md` marked as seed, and skip `.impeccable/design.json` until there is real source to scan.

## Step 1: Load Context

Run:

```bash
node skills/impeccable/scripts/load-context.mjs
```

Use PRODUCT.md to understand users, purpose, voice, anti-references, and strategic design principles. If `hasProduct` is false, pause and run `$impeccable teach` first unless the user explicitly wants a visual-only extraction.

If the project has meaningful visual source, use scan mode. If there is no implemented UI yet, use seed mode.

## Scan Mode

### Step 2: Find Design Sources

Search the project in this order:

1. CSS custom properties: `--color-*`, `--font-*`, `--space-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`.
2. Tailwind config: `tailwind.config.{js,ts,mjs,cjs}` and any preset files.
3. Theme/token files: `theme.ts`, `tokens.ts`, `tokens.json`, `design-tokens.json`, Style Dictionary outputs, CSS modules with shared variables.
4. Global stylesheets: app globals, reset files, public CSS, root layout styles.
5. Component implementations: buttons, cards, inputs, nav, dialogs, tables, tabs, sidebars, empty states.
6. Rendered UI if browser automation is available: sample computed styles for body text, headings, links, buttons, cards, inputs, and navigation.

Record both the token values and where they came from. Prefer values used repeatedly over one-off styling.

### Step 3: Extract And Stage Token Candidates

Build the front matter draft:

```yaml
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

- Colors: one front matter entry per repeated color. Use semantic names. Use hex when strict Stitch interoperability matters; use OKLCH only when the project already treats OKLCH as canonical.
- Typography: one entry per repeated role. Include only real properties: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, and similar typography fields.
- Spacing and rounded: identify the repeated scale. Do not document every arbitrary margin.
- Components: document stable component variants. Reference primitives with `{colors.*}`, `{rounded.*}`, and `{typography.*}`.
- Shadows, motion, breakpoints, focus rings, and full HTML/CSS examples do not fit the front matter schema. Stage them for `.impeccable/design.json`.

### Step 4: Ask For Human Visual Language

Some parts cannot be extracted reliably from code. Ask only for what is missing:

- Visual atmosphere in 3-6 adjectives.
- Color names if raw token names are too mechanical.
- Typography character: clinical, editorial, playful, industrial, dense, airy, etc.
- Component feel: quiet, tactile, precise, soft, brutal, luxurious, utilitarian.
- Any visual anti-references not already in PRODUCT.md.

Keep this to one short interaction when possible. Offer concrete suggestions based on the extracted system.

### Step 5: Write DESIGN.md

Write `DESIGN.md` at the project root. Open with the staged YAML front matter, then write the six fixed Stitch sections:

```markdown
---
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

## Elevation
[Radii, borders, shadows, layering, density, and depth rules.]

## Components
- **Buttons**: [shape, padding, color, hover/focus states]
- **Cards**: [surface, border/shadow, padding, media treatment]
- **Inputs**: [stroke, background, focus treatment]
- **Navigation**: [layout, active states, mobile behavior]

## Do's and Don'ts
- Do [specific visual rule].
- Don't [specific visual anti-pattern].
```

Keep all six sections even if one is short. Put layout, motion, responsive behavior, and shadow philosophy in Overview, Elevation, or Components unless the project has explicit tokens for them in the sidecar. The parser and live panel expect the six-section shape.

### Step 5b: Write .impeccable/design.json

After `DESIGN.md` is written, also write a machine-readable sidecar at project-root `.impeccable/design.json`. Front matter owns primitive tokens. The sidecar extends it with what the front matter cannot hold: tonal ramps, display names, shadow/elevation tokens, motion tokens, breakpoints, full component HTML/CSS snippets, and narrative.

Regenerate `.impeccable/design.json` whenever `DESIGN.md` is regenerated. If the user asks only to refresh the sidecar, preserve `DESIGN.md` and rewrite `.impeccable/design.json`.

Use this schema:

```json
{
  "schemaVersion": 2,
  "generatedAt": "ISO-8601 string",
  "title": "Design System: <project name>",
  "extensions": {
    "colorMeta": {
      "accent": {
        "role": "primary",
        "displayName": "Editorial Magenta",
        "tonalRamp": ["...", "...", "..."]
      }
    },
    "typographyMeta": {
      "display": {
        "displayName": "Display",
        "purpose": "Hero headlines only."
      }
    },
    "shadows": [
      {
        "name": "Soft Lift",
        "value": "0 4px 24px rgba(0,0,0,0.12)",
        "purpose": "When to use it."
      }
    ],
    "motion": [],
    "breakpoints": []
  },
  "components": [
    {
      "name": "Primary Button",
      "kind": "button",
      "description": "One-line what and when.",
      "html": "<button class=\"ds-btn-primary\">Save</button>",
      "css": ".ds-btn-primary { padding: 12px 20px; border-radius: 8px; }"
    }
  ],
  "narrative": {
    "northStar": "Named metaphor",
    "overview": "The visual philosophy from DESIGN.md.",
    "keyCharacteristics": ["..."],
    "rules": [{ "name": "The One Accent Rule", "section": "colors", "body": "..." }],
    "dos": ["Do ..."],
    "donts": ["Don't ..."]
  }
}
```

If an older project already has schemaVersion 1, preserve useful values by migrating primitive token arrays into `DESIGN.md` front matter and moving extra metadata into `extensions`.

Component previews must be self-contained. Expand Tailwind utilities or CSS-in-JS theme values into literal CSS or project CSS variables. Prefix classes with `ds-`. Include hover and focus-visible rules where meaningful. Do not reference framework runtimes, icon packages, image paths, or external CSS bundles.

If the project has no component library yet, synthesize 3-5 canonical primitives from the documented tokens: primary button, input, chip, card, and navigation.

## Seed Mode

Use seed mode when the project has no meaningful visual implementation yet. The output is a direction scaffold, not extracted truth.

Ask only the missing questions:

1. **Color strategy**: Restrained, Committed, Full palette, or Drenched?
2. **Theme scene**: Who uses the product, where, under what ambient light, and in what state of mind?
3. **Typography direction**: system/product, editorial display plus body, technical, warm, dense, refined, or another concrete lane?
4. **Motion energy**: none, functional only, calm, expressive, or cinematic?
5. **References and anti-reference**: 2-3 named visual anchors and one thing this must not resemble.

Then write `DESIGN.md` with this marker near the top:

```markdown
<!-- SEED - refresh with scan mode after the first real interface exists. -->
```

Use the same six sections, but label uncertain choices as direction rather than extracted tokens. Do not write `.impeccable/design.json` in seed mode; the live design panel should wait for scan mode so it does not present guesses as system facts.

## Step 6: Confirm

After writing the file:

1. Summarize the extracted token sources.
2. Name any inferred choices that should be reviewed by the user.
3. Mention whether PRODUCT.md influenced the visual interpretation.
4. Mention whether `.impeccable/design.json` was written/refreshed for the live design panel, or skipped because this was seed mode.
5. Offer a concise refinement pass for names, atmosphere language, or missing component categories.
6. Run `node skills/impeccable/scripts/load-context.mjs` one final time and consume the full JSON output so the freshly written DESIGN.md is in session context for any follow-up command.

## Quality Bar

- Do not paste raw CSS as documentation.
- Do not invent tokens that are not present or approved.
- Do not track one-off values as system rules.
- Do not duplicate PRODUCT.md prose. Reference strategic principles only when they explain a visual decision.
- Do not duplicate token values between front matter and prose. The front matter is normative.
- Do not put non-Stitch token groups in front matter. Use `.impeccable/design.json` `extensions`.
- Include exact values for every token that can be extracted.
- Keep `.impeccable/design.json` aligned with `DESIGN.md`.
- Keep the document useful for agents and humans, not just mechanically complete.
