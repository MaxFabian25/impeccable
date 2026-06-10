# Product Register

Use this register when design serves the product: app UIs, admin dashboards, settings panels, data tables, tools, authenticated surfaces, and anything where the user is trying to complete a task.

## The Product Slop Test

Familiarity is often a feature here. The test is whether a user fluent in the category's best tools would trust the interface immediately, or pause at every subtly wrong component.

Product UI fails when it is strange without purpose: over-decorated buttons, mismatched form controls, gratuitous motion, display fonts in labels, or invented affordances for standard tasks. The bar is earned familiarity. The tool should disappear into the task.

## Typography

- System fonts are legitimate. `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` can be the right choice.
- One family is often enough. A well-tuned sans can carry headings, buttons, labels, body, and data.
- Use fixed `rem` scales, not viewport-fluid headings. Product UI needs spatial predictability.
- Use a tighter scale ratio, often 1.125 to 1.2, because product surfaces have more type roles.
- Line length still applies for prose. Data and compact UI can run denser when users need comparison.

## Color

Product defaults to Restrained. A single surface can earn Committed, such as an onboarding welcome or a focused report, but the baseline is restraint.

- Define semantic states: hover, focus, active, disabled, selected, loading, error, warning, success, and info.
- Use accent color for primary actions, current selection, and state indicators, not general decoration.
- Add a second neutral layer for sidebars, toolbars, panels, and app chrome.
- Keep inactive states quiet. Full-saturation accents on inactive UI create noise.

## Layout

- Use predictable grids. Consistency is an affordance.
- Use familiar patterns where users expect them: top bars, side nav, breadcrumbs, tabs, standard form flows.
- Responsive behavior is structural: collapse sidebars, reflow tables, change panel relationships. Do not rely on fluid typography to solve product layout.

## Components

Every interactive component needs default, hover, focus, active, disabled, loading, and error states. Do not ship partial components.

- Prefer skeleton states over isolated spinners in content regions.
- Empty states should teach the interface, not just say "nothing here".
- Keep affordances consistent across the surface: button shape, form vocabulary, icon style, density, and focus treatment.

## Motion

- Keep most transitions between 150 and 250 ms.
- Motion should convey state: feedback, reveal, loading, navigation, or relationship.
- Avoid orchestrated page-load choreography. Product UI loads into a task; users do not want to watch a performance before working.

## Product Bans

These apply in addition to the root skill's absolute bans:

- Decorative motion that conveys no state.
- Inconsistent component vocabulary across screens.
- Display fonts in labels, buttons, data, or dense task UI.
- Reinventing standard affordances for flavor: weird form controls, non-standard modals, decorative scrollbars.
- Heavy color on inactive states.

## Product Permissions

Product can afford things editorial often cannot:

- System fonts and familiar sans defaults.
- Standard navigation patterns.
- Density when comparison or repeated action requires it.
- Consistency over surprise. Save delight for moments, not every screen.
