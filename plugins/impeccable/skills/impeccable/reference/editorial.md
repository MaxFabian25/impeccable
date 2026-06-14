# Editorial Register

Use this register when design is the product: marketing pages, landing pages, brand sites, editorial content, campaign pages, portfolios, and other surfaces where the visual point of view carries the experience.

## The Editorial Slop Test

If someone could look at the result and say "AI made that" without hesitation, it failed. The bar is distinctiveness: a reader should ask "how was this made?", not "which AI made this?"

Editorial is not neutral. Average landing pages are now invisible. Restraint only works when it has a point of view; otherwise it reads as generic. Editorial work should commit to a specific audience, risk some strangeness, and choose a lane strongly enough that the page can be remembered.

## Typography

### Font Selection

Run the root skill's font selection procedure every time:

1. Read the brief and write three concrete brand-voice words, not "modern" or "elegant".
2. List the fonts you would reach for by reflex and reject anything in the reflex-reject list.
3. Browse a real catalog with the brand words in mind. Pick for the brand as a physical object: a museum caption, a terminal manual, a fabric label, a cheap-newsprint book.
4. Cross-check the result. "Elegant" is not automatically serif; "technical" is not automatically sans; "warm" is not automatically Fraunces.

Editorial usually wants a distinctive display face plus a refined body face. Use fluid heading sizes with `clamp()` and a scale ratio of at least 1.25 between visible steps.

## Color

Editorial has permission to use Committed, Full palette, and Drenched color strategies.

- Name a real reference before picking a strategy: a type foundry specimen page, a magazine feature, a fashion campaign, a concert poster, a museum identity.
- Treat palette as voice. A calm site and a restless site should not share the same palette mechanics.
- When the strategy is Committed or Drenched, color carries the surface. Do not hedge with neutral edges everywhere.
- If the last editorial project used one palette mechanic, this one should not reflexively do the same.

## Layout

- Use asymmetric compositions when they clarify emphasis.
- Let spacing breathe with `clamp()` on larger viewports.
- Vary rhythm: tight groups, generous separations, and one dominant idea per fold when the narrative benefits.
- Do not center everything by default. Centering can work, but it should be a decision, not scaffolding.
- Cards are optional. Use them only when content is truly discrete or actionable.

## Motion

One orchestrated page-load or scroll moment is stronger than scattered micro-interactions. Use motion to choreograph attention, not to decorate every element.

For collapsing and expanding sections, transition `grid-template-rows` instead of animating `height`.

## Editorial Bans

These apply in addition to the root skill's absolute bans:

- Monospace as lazy shorthand for technical or developer tone.
- Large rounded-corner icons above every heading.
- Single-font-family pages when the surface needs a brand voice.
- All-caps body copy at body sizes.
- Timid palettes and average layouts on surfaces that exist to persuade or express.

## Editorial Permissions

Editorial can afford things product UI usually cannot:

- Ambitious first-load motion, scroll-triggered transitions, and typographic choreography.
- Single-purpose viewports with one dominant idea.
- Typographic risk: enormous display type, unexpected italics, mixed cases, expressive pairings.
- Unexpected color strategy when it matches the audience and message.
- Art direction per section. Consistency of voice beats identical treatment section to section.
