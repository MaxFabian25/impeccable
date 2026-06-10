---
name: impeccable
description: "Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics. Use when the user asks to build web components, pages, artifacts, posters, or applications, or when any design skill requires project context. Call with 'craft' for shape-then-build, 'teach' for product/design context setup, 'document' to generate DESIGN.md, 'extract' to pull reusable components and tokens into the design system, or 'pin'/'unpin' to manage local shortcuts."
argument-hint: "[{{command_hint}}] [target]"
user-invocable: true
license: Apache 2.0. Based on Anthropic's frontend-design skill. See NOTICE.md for attribution.
---

<post-update-cleanup>
BEFORE doing any design work, run this one-time maintenance step. Tell the user:

> **Impeccable was updated.** A few skills were renamed or merged in this version (e.g. `$arrange` is now `$layout`, `$normalize` was folded into `$polish`). I'll clean up the old skill files so they don't clutter your project. This only runs once after an update.

Then run:

```bash
node {{scripts_path}}/cleanup-deprecated.mjs
```

If the script removed files, briefly confirm what was cleaned up. If it found nothing, skip any output and move on.

After running the script, delete this entire section (from `<post-update-cleanup>` through `</post-update-cleanup>` inclusive) from THIS file so it does not run again until the next update. Save the file.
</post-update-cleanup>

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Context Gathering Protocol

Design skills produce generic output without project context. This protocol runs once at the start of a session before design work.

### Context Files

- **PRODUCT.md** (strategic, required): default register, target users, product purpose, jobs to be done, brand personality, anti-references, and design principles. Use it for "who, what, and why".
- **DESIGN.md** (visual, optional but strongly recommended): colors, typography, spacing, radius, components, layout rules, and do/don't guidance. Use it for "how it should look".

Filename matching is case-insensitive. Legacy `.impeccable.md` migrates to `PRODUCT.md` on first load. When files overlap, **DESIGN.md wins on visual decisions; PRODUCT.md wins on strategy, voice, and audience decisions.**

### Session Cache

If PRODUCT.md or DESIGN.md content is already in conversation history from this session, treat it as loaded. Do not re-run `load-context.mjs` just to fetch the same content again.

Reload only when:
- You just ran `{{command_prefix}}impeccable teach`.
- You just ran `{{command_prefix}}impeccable document`.
- The user says PRODUCT.md or DESIGN.md changed manually.

### First Load

When context is not already loaded, run the shared loader from the project root:

```bash
node {{scripts_path}}/load-context.mjs
```

Consume the full JSON output. Do not pipe it through `head`, `tail`, `grep`, or field-filtering `jq`; design work needs the complete product and design context.

### Dispatch

- If `hasProduct` is true and `product` is substantive (more than 200 characters and not mostly `[TODO]` placeholders), proceed.
- If `hasDesign` is false and the current task needs visual consistency, say once: "Note: no DESIGN.md found. I'll use Impeccable's built-in design principles for now. For more on-brand output, run `{{command_prefix}}impeccable document` to generate DESIGN.md from the existing code."
- If `hasProduct` is false, empty, or placeholder-only, tell the user: "I need PRODUCT.md before I can do this well. Running `{{command_prefix}}impeccable teach` now; I'll resume [original task] after." Then run `{{command_prefix}}impeccable teach`, reload context, and resume the original task.

### Register

Every design task is either **editorial** or **product**:

- **Editorial**: marketing, landing, brand, content, campaign, portfolio, or any surface where design is the product.
- **Product**: app UI, admin, dashboard, settings, data table, tool, authenticated surface, or any surface where design serves a task.

Identify the register before designing. Priority order:

1. The task itself, such as "landing page" or "dashboard".
2. The concrete surface in focus, such as route, component, file, screenshot, or DOM selection.
3. The `## Register` field in PRODUCT.md.

If PRODUCT.md is legacy and lacks `## Register`, infer the likely default once from its users, product purpose, and codebase signals. Use that inference for the session and suggest `{{command_prefix}}impeccable teach` to make it explicit.

Load the matching reference when the register matters: [editorial](reference/editorial.md) for editorial work, [product](reference/product.md) for product work. The shared laws below apply to both.

### Exceptions

- `{{command_prefix}}impeccable teach` skips this protocol because it creates PRODUCT.md.
- `{{command_prefix}}impeccable document` loads PRODUCT.md but does not block on missing DESIGN.md because it creates DESIGN.md.

### Why This Matters

PRODUCT.md prevents generic output by giving Codex audience, purpose, voice, and strategic constraints. DESIGN.md prevents visual drift by giving Codex current tokens, component patterns, and visual rules. Session caching keeps multi-command flows efficient without stale context.

---

## Design Direction

Commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Register**: Decide whether this task is editorial or product, then use the matching reference to calibrate typography, color, density, motion, and risk.
- **Color strategy**: Pick Restrained, Committed, Full palette, or Drenched. Editorial can earn any of them; product starts Restrained unless the surface has a specific reason to go further.
- **Theme scene**: Write a one-sentence physical scene for use context: who uses this, where, under what ambient light, and in what state of mind. Let that scene choose light vs dark instead of defaulting.
- **Anchors**: Name 2-3 concrete product, brand, object, publication, or interface references. Avoid abstract words like "modern" or "clean".
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work. The key is intentionality, not intensity.

Then implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

### Typography
→ *Consult [typography reference](reference/typography.md) for OpenType features, web font loading, and the deeper material on scales.*

Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

<typography_principles>
Always apply these — do not consult a reference, just do them:

- Use a modular type scale with fluid sizing (clamp) for headings on marketing/content pages. Use fixed `rem` scales for app UIs and dashboards (no major design system uses fluid type in product UI).
- Use fewer sizes with more contrast. A 5-step scale with at least a 1.25 ratio between steps creates clearer hierarchy than 8 sizes that are 1.1× apart.
- Line-height scales inversely with line length. Narrow columns want tighter leading, wide columns want more. For light text on dark backgrounds, ADD 0.05-0.1 to your normal line-height — light type reads as lighter weight and needs more breathing room.
- Cap line length at ~65-75ch. Body text wider than that is fatiguing.
- Use `text-wrap: balance` on h1-h3 for even heading line lengths; use `text-wrap: pretty` on long prose to reduce orphans.
</typography_principles>

<font_selection_procedure>
DO THIS BEFORE TYPING ANY FONT NAME.

The model's natural failure mode is "I was told not to use Inter, so I will pick my next favorite font, which becomes the new monoculture." Avoid this by performing the following procedure on every project, in order:

Step 1. Read the brief once. Write down 3 concrete words for the brand voice (e.g., "warm and mechanical and opinionated", "calm and clinical and careful", "fast and dense and unimpressed", "handmade and a little weird"). NOT "modern" or "elegant" — those are dead categories.

Step 2. List the 3 fonts you would normally reach for given those words. Write them down. They are most likely from this list:

<reflex_fonts_to_reject>
Fraunces
Newsreader
Lora
Crimson
Crimson Pro
Crimson Text
Playfair Display
Cormorant
Cormorant Garamond
Syne
IBM Plex Mono
IBM Plex Sans
IBM Plex Serif
Space Mono
Space Grotesk
Inter
DM Sans
DM Serif Display
DM Serif Text
Outfit
Plus Jakarta Sans
Instrument Sans
Instrument Serif
</reflex_fonts_to_reject>

Reject every font that appears in the reflex_fonts_to_reject list. They are your training-data defaults and they create monoculture across projects.

Step 3. Browse a font catalog with the 3 brand words in mind. Sources: Google Fonts, Pangram Pangram, Future Fonts, Adobe Fonts, ABC Dinamo, Klim Type Foundry, Velvetyne. Look for something that fits the brand as a *physical object* — a museum exhibit caption, a hand-painted shop sign, a 1970s mainframe terminal manual, a fabric label on the inside of a coat, a children's book printed on cheap newsprint. Reject the first thing that "looks designy" — that's the trained reflex too. Keep looking.

Step 4. Cross-check the result. The right font for an "elegant" brief is NOT necessarily a serif. The right font for a "technical" brief is NOT necessarily a sans-serif. The right font for a "warm" brief is NOT Fraunces. If your final pick lines up with your reflex pattern, go back to Step 3.
</font_selection_procedure>

<typography_rules>
DO use a modular type scale with fluid sizing (clamp) on headings.
DO vary font weights and sizes to create clear visual hierarchy.
DO vary your font choices across projects. If you used a serif display font on the last project, look for a sans, monospace, or display face on this one.

DO NOT use overused fonts like Inter, Roboto, Arial, Open Sans, or system defaults — but also do not simply switch to your second-favorite. Every font in the reflex_fonts_to_reject list above is banned. Look further.
DO NOT use monospace typography as lazy shorthand for "technical/developer" vibes.
DO NOT put large icons with rounded corners above every heading. They rarely add value and make sites look templated.
DO NOT use an oversized italic serif as the hero headline unless the brand explicitly demands that editorial register.
DO NOT use a tiny uppercase tracked label above the hero headline as default hero scaffolding.
DO NOT use repeated eyebrow or kicker labels as section scaffolding. Let headings, spacing, and structure carry hierarchy instead.
DO NOT use only one font family for the entire page. Pair a distinctive display font with a refined body font.
DO NOT use a flat type hierarchy where sizes are too close together. Aim for at least a 1.25 ratio between steps.
DO NOT set long body passages in uppercase. Reserve all-caps for short labels and headings.
</typography_rules>

### Color & Theme
→ *Consult [color reference](reference/color-and-contrast.md) for the deeper material on contrast, accessibility, and palette construction.*

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

Pick one explicit color strategy before writing CSS:

- **Restrained**: neutrals carry the interface, accent appears only where it changes hierarchy or state.
- **Committed**: one color is a structural brand material, not a small accent.
- **Full palette**: several related hues carry sections, categories, or narrative turns.
- **Drenched**: one dominant color controls the atmosphere across a major surface.

Editorial surfaces can use Committed, Full palette, or Drenched when the reference and audience justify it. Product surfaces default to Restrained unless a specific screen earns more color, such as onboarding, an empty state, a report cover, or a brand moment inside the product.

<color_principles>
Always apply these — do not consult a reference, just do them:

- Use OKLCH, not HSL. OKLCH is perceptually uniform: equal steps in lightness *look* equal, which HSL does not deliver. As you move toward white or black, REDUCE chroma — high chroma at extreme lightness looks garish. A light blue at 85% lightness wants ~0.08 chroma, not the 0.15 of your base color.
- Tint your neutrals toward your brand hue. Even a chroma of 0.005-0.01 is perceptible and creates subconscious cohesion between brand color and UI surfaces. The hue you tint toward should come from THIS brand, not from a "warm = friendly" or "cool = tech" formula. Pick the brand's actual hue first, then tint everything toward it.
- The 60-30-10 rule is about visual *weight*, not pixel count. 60% neutral / surface, 30% secondary text and borders, 10% accent. Accents work BECAUSE they're rare. Overuse kills their power.
</color_principles>

<theme_selection>
Theme (light vs dark) should be DERIVED from audience and viewing context, not picked from a default. Read the brief and ask: when is this product used, by whom, in what physical setting?

- A perp DEX consumed during fast trading sessions → dark
- A hospital portal consumed by anxious patients on phones late at night → light
- A children's reading app → light
- A vintage motorcycle forum where users sit in their garage at 9pm → dark
- An observability dashboard for SREs in a dark office → dark
- A wedding planning checklist for couples on a Sunday morning → light
- A music player app for headphone listening at night → dark
- A food magazine homepage browsed during a coffee break → light

Do not default everything to light "to play it safe." Do not default everything to dark "to look cool." Both defaults are the lazy reflex. The correct theme is the one the actual user wants in their actual context.
</theme_selection>

<color_rules>
DO use modern CSS color functions (oklch, color-mix, light-dark) for perceptually uniform, maintainable palettes.
DO tint your neutrals toward your brand hue. Even a subtle hint creates subconscious cohesion.

DO NOT use gray text on colored backgrounds; it looks washed out. Use a shade of the background color instead.
DO NOT use pure black (#000) or pure white (#fff). Always tint; pure black/white never appears in nature.
DO NOT use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds.
DO NOT use gradient text for impact — see <absolute_bans> below for the strict definition. Solid colors only for text.
DO NOT default to dark mode with glowing accents. It looks "cool" without requiring actual design decisions.
DO NOT default to light mode "to be safe" either. The point is to choose, not to retreat to a safe option.
</color_rules>

### Layout & Space
→ *Consult [spatial reference](reference/spatial-design.md) for the deeper material on grids, container queries, and optical adjustments.*

Create visual rhythm through varied spacing, not the same padding everywhere. Embrace asymmetry and unexpected compositions. Break the grid intentionally for emphasis.

<spatial_principles>
Always apply these — do not consult a reference, just do them:

- Use a 4pt spacing scale with semantic token names (`--space-sm`, `--space-md`), not pixel-named (`--spacing-8`). Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. 8pt is too coarse — you'll often want 12px between two values.
- Use `gap` instead of margins for sibling spacing. It eliminates margin collapse and the cleanup hacks that come with it.
- Vary spacing for hierarchy. A heading with extra space above it reads as more important — make use of that. Don't apply the same padding everywhere.
- Self-adjusting grid pattern: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` is the breakpoint-free responsive grid for card-style content.
- Container queries are for components, viewport queries are for page layout. A card in a sidebar should adapt to the sidebar's width, not the viewport's.
</spatial_principles>

<spatial_rules>
DO create visual rhythm through varied spacing: tight groupings, generous separations.
DO use fluid spacing with clamp() that breathes on larger screens.
DO use asymmetry and unexpected compositions; break the grid intentionally for emphasis.

DO NOT wrap everything in cards. Not everything needs a container.
DO NOT nest cards inside cards. Visual noise; flatten the hierarchy.
DO NOT use identical card grids (same-sized cards with icon + heading + text, repeated endlessly).
DO NOT use the hero metric layout template (big number, small label, supporting stats, gradient accent).
DO NOT center everything. Left-aligned text with asymmetric layouts feels more designed.
DO NOT use the same spacing everywhere. Without rhythm, layouts feel monotonous.
DO NOT let body text wrap beyond ~80 characters per line. Add a max-width like 65–75ch so the eye can track easily.
</spatial_rules>

### Visual Details

<absolute_bans>
These CSS patterns are NEVER acceptable. They are the most recognizable AI design tells. Match-and-refuse: if you find yourself about to write any of these, stop and rewrite the element with a different structure entirely.

BAN 1: Side-stripe borders on cards/list items/callouts/alerts
  - PATTERN: `border-left:` or `border-right:` with width greater than 1px
  - INCLUDES: hard-coded colors AND CSS variables
  - FORBIDDEN: `border-left: 3px solid red`, `border-left: 4px solid #ff0000`, `border-left: 4px solid var(--color-warning)`, `border-left: 5px solid oklch(...)`, etc.
  - WHY: this is the single most overused "design touch" in admin, dashboard, and medical UIs. It never looks intentional regardless of color, radius, opacity, or whether the variable name is "primary" or "warning" or "accent."
  - REWRITE: use a different element structure entirely. Do not just swap to box-shadow inset. Reach for full borders, background tints, leading numbers/icons, or no visual indicator at all.

BAN 2: Gradient text
  - PATTERN: `background-clip: text` (or `-webkit-background-clip: text`) combined with a gradient background
  - FORBIDDEN: any combination that makes text fill come from a `linear-gradient`, `radial-gradient`, or `conic-gradient`
  - WHY: gradient text is decorative rather than meaningful and is one of the top three AI design tells
  - REWRITE: use a single solid color for text. If you want emphasis, use weight or size, not gradient fill.
</absolute_bans>

DO: Use intentional, purposeful decorative elements that reinforce brand.
DO NOT: Use border-left or border-right greater than 1px as a colored accent stripe on cards, list items, callouts, or alerts. See <absolute_bans> above for the strict CSS pattern.
DO NOT: Use glassmorphism everywhere (blur effects, glass cards, glow borders used decoratively rather than purposefully).
DO NOT: Use sparklines as decoration. Tiny charts that look sophisticated but convey nothing meaningful.
DO NOT: Use rounded rectangles with generic drop shadows. Safe, forgettable, could be any AI output.
DO NOT: Use modals unless there's truly no better alternative. Modals are lazy.

### Motion
→ *Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion.*

Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.

**DO**: Use motion to convey state changes: entrances, exits, feedback
**DO**: Use exponential easing (ease-out-quart/quint/expo) for natural deceleration
**DO**: For height animations, use grid-template-rows transitions instead of animating height directly
**DON'T**: Animate layout properties (width, height, padding, margin). Use transform and opacity only
**DON'T**: Use bounce or elastic easing. They feel dated and tacky; real objects decelerate smoothly

### Interaction
→ *Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns.*

Make interactions feel fast. Use optimistic UI: update immediately, sync later.

**DO**: Use progressive disclosure. Start simple, reveal sophistication through interaction (basic options first, advanced behind expandable sections; hover states that reveal secondary actions)
**DO**: Design empty states that teach the interface, not just say "nothing here"
**DO**: Make every interactive surface feel intentional and responsive
**DON'T**: Repeat the same information (redundant headers, intros that restate the heading)
**DON'T**: Make every button primary. Use ghost buttons, text links, secondary styles; hierarchy matters

### Responsive
→ *Consult [responsive reference](reference/responsive-design.md) for mobile-first, fluid design, and container queries.*

**DO**: Use container queries (@container) for component-level responsiveness
**DO**: Adapt the interface for different contexts, not just shrink it
**DON'T**: Hide critical functionality on mobile. Adapt the interface, don't amputate it

### UX Writing
→ *Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states.*

**DO**: Make every word earn its place
**DON'T**: Repeat information users can already see

---

## The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which AI made this?"

Review the DON'T guidelines above. They are the fingerprints of AI-generated work from 2024-2025.

---

## Implementation Principles

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices across generations.

Remember: {{model}} is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

## Craft Mode

If this skill is invoked with the argument "craft" (e.g., `{{command_prefix}}impeccable craft [feature description]`), follow the [craft flow](reference/craft.md). Pass any additional arguments as the feature description.

---

## Teach Mode

If this skill is invoked with the argument "teach" (e.g., `{{command_prefix}}impeccable teach`), skip all design work above and instead run the teach flow below. This is a one-time setup that gathers strategic product context and writes `PRODUCT.md`.

### Step 1: Load Current Context

Run the shared loader from the project root:

```bash
node {{scripts_path}}/load-context.mjs
```

Use the result to choose the path:

- If neither PRODUCT.md nor DESIGN.md exists, continue through this teach flow.
- If PRODUCT.md exists and DESIGN.md is missing, ask whether to refresh PRODUCT.md or run `{{command_prefix}}impeccable document` for the visual file.
- If PRODUCT.md exists but lacks a `## Register` section, infer a register hypothesis from the codebase, confirm it with the user, and add the section.
- If both files exist, ask which one the user wants refreshed before editing anything.
- If only DESIGN.md exists, continue through this teach flow to create PRODUCT.md.

Never silently overwrite existing PRODUCT.md or DESIGN.md.

### Step 2: Explore the Codebase

Before asking questions, thoroughly scan the project to discover what you can:

- **README and docs**: Project purpose, target audience, any stated goals
- **Package.json / config files**: Tech stack, dependencies, existing design libraries
- **Existing components**: Current design patterns, spacing, typography in use
- **Brand assets**: Logos, favicons, color values already defined
- **Design tokens / CSS variables**: Existing color palettes, font stacks, spacing scales
- **Any style guides or brand documentation**

Also form a **register hypothesis** from what you find:

- Editorial signals: marketing home pages, pricing, about pages, blogs, docs, hero sections, campaign pages, portfolios, large typographic moments, scroll-driven narrative sections.
- Product signals: app shells, dashboards, settings, forms, data tables, authenticated routes, side or top navigation, repeated task flows.

Register is a hypothesis at this point, not a decision. Step 3 confirms it.

Note what you've learned and what remains unclear.

### Step 3: Ask Strategic Questions

Ask only about what you could not infer from the codebase:

#### Register
- Should the primary surface be treated as **editorial** (design is the product) or **product** (design serves a task)?
- If the codebase signal is clear, lead with it: "This looks like a [product/editorial] surface; does that match your intent?"
- If the project has both, choose the default for PRODUCT.md. Individual tasks can override it later.

#### Users & Purpose
- Who uses this? What's their context when using it?
- What job are they trying to get done?
- For editorial, what emotions should the interface evoke? (confidence, delight, calm, urgency, etc.)
- For product, what workflow are users in? What's the primary task on a typical screen?

#### Brand & Personality
- How would you describe the brand personality in 3 words?
- Any reference sites or apps that capture the right feel? What specifically about them?
- What should this explicitly NOT look like? Any anti-references?

#### Accessibility & Inclusion
- Specific accessibility requirements? (WCAG level, known user needs)
- Considerations for reduced motion, color blindness, or other accommodations?

Skip questions where the answer is already clear from the codebase exploration. Do not ask about colors, fonts, radii, shadows, or component styling here. Those belong in DESIGN.md.

### Step 4: Write PRODUCT.md

Synthesize your findings and the user's answers into a project-root `PRODUCT.md`:

```markdown
# Product

## Register
[editorial or product]

## Users
[Who they are, their context, the job to be done]

## Product Purpose
[What this product does, why it exists, and what success looks like]

## Brand Personality
[Voice, tone, 3-word personality, emotional goals]

## Anti-References
[What this should not look like. Include specific bad examples or patterns to avoid.]

## Design Principles
[3-5 strategic principles derived from the conversation. These are not token rules.]

## Accessibility & Inclusion
[WCAG level, known user needs, motion/color considerations]
```

Write the file to `PRODUCT.md` in the project root. If a legacy `.impeccable.md` was migrated by the loader, merge the new strategic structure into that content rather than discarding useful existing notes.

### Step 5: Decide On DESIGN.md

If the project has meaningful visual source to analyze, ask whether to run `{{command_prefix}}impeccable document` next. That flow generates `DESIGN.md` from CSS tokens, components, and rendered UI.

If the project is empty or pre-implementation, offer `{{command_prefix}}impeccable document` in seed mode. Seed mode asks a few visual direction questions and writes a starter DESIGN.md without a DESIGN.json sidecar. Tell the user to refresh it after the first real interface exists.

### Step 6: Confirm

Confirm what was written, summarize the 3-5 strategic principles, and note whether DESIGN.md exists or is still pending.

Run `node {{scripts_path}}/load-context.mjs` one final time and consume the full JSON output so the freshly written PRODUCT.md is in session context for any follow-up command.

If teach was invoked because another command needed context first, resume that original command now with the fresh PRODUCT.md loaded.

---

## Document Mode

If this skill is invoked with the argument "document" (e.g., `{{command_prefix}}impeccable document`), follow the [document flow](reference/document.md). Pass any additional arguments as the documentation target.

---

## Extract Mode

If this skill is invoked with the argument "extract" (e.g., `{{command_prefix}}impeccable extract [target]`), follow the [extract flow](reference/extract.md). Pass any additional arguments as the extraction target.

---

## Pin / Unpin Mode

If this skill is invoked with `pin <command>` or `unpin <command>` (e.g., `{{command_prefix}}impeccable pin craft`):

- **Pin** creates a managed project-local shortcut so `{{command_prefix}}<command>` invokes `{{command_prefix}}impeccable <command>` directly.
- **Unpin** removes only shortcuts created by the Impeccable pin script.
- Valid targets are root-only commands that do not already ship as standalone Codex skills: `craft`, `teach`, `document`, `extract`.
- Do not pin standalone commands such as `{{command_prefix}}audit`, `{{command_prefix}}polish`, or `{{command_prefix}}layout`. They already ship directly in the Codex plugin.
- The script writes only to `skills/<command>/SKILL.md` in the current project and refuses to overwrite or remove unmanaged skill files.

Run:

```bash
node {{scripts_path}}/pin.mjs <pin|unpin> <command>
```

Report the script output. Do not edit project-local shortcut files by hand.
