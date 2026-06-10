---
version: alpha
name: Impeccable Editorial System
description: A high-contrast editorial design system for a Codex-first design skill pack.
colors:
  ink: "oklch(10% 0 0)"
  text-primary: "oklch(10% 0 0)"
  paper: "oklch(98% 0 0)"
  cream: "oklch(96% 0.005 350)"
  charcoal: "oklch(25% 0 0)"
  ash: "oklch(55% 0 0)"
  mist: "oklch(92% 0 0)"
  background: "oklch(96% 0.005 350)"
  accent: "oklch(60% 0.25 350)"
  accent-hover: "oklch(52% 0.25 350)"
  accent-dim: "oklch(60% 0.25 350 / 0.15)"
  accent-soft: "oklch(60% 0.25 350 / 0.25)"
  category-create-bg: "#fdf2f8"
  category-create-border: "#ec4899"
  category-create-text: "#be185d"
  category-evaluate-bg: "#fdf4ff"
  category-evaluate-border: "#d946ef"
  category-evaluate-text: "#a21caf"
  category-refine-bg: "#eff6ff"
  category-refine-border: "#3b82f6"
  category-refine-text: "#1d4ed8"
  category-simplify-bg: "#fffbeb"
  category-simplify-border: "#f59e0b"
  category-simplify-text: "#b45309"
  category-harden-bg: "#f0fdf4"
  category-harden-border: "#22c55e"
  category-harden-text: "#15803d"
  category-system-bg: "#f5f5f4"
  category-system-border: "#78716c"
  category-system-text: "#44403c"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: 16px
    lineHeight: 1.625
  mono:
    fontFamily: "Space Grotesk, monospace"
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  2xl: 80px
  3xl: 120px
rounded:
  hairline: 2px
  small: 4px
  medium: 8px
  pill: 99px
layout:
  max-width: 1400px
  content-width: 900px
motion:
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  ease-in-out: "cubic-bezier(0.65, 0, 0.35, 1)"
  ease-out-quint: "cubic-bezier(0.22, 1, 0.36, 1)"
  duration-fast: 0.15s
  duration-base: 0.3s
  duration-slow: 0.6s
  duration-slower: 0.8s
components:
  site-header:
    background: "color-mix(in oklch, var(--color-paper) 94%, transparent)"
    border: "1px solid var(--color-mist)"
    blur: "saturate(1.4) blur(16px)"
  command-pill:
    background: "{colors.cream}"
    border: "1px solid {colors.mist}"
    rounded: "{rounded.pill}"
  code-chip:
    background: "{colors.accent-dim}"
    textColor: "{colors.accent}"
    rounded: "{rounded.small}"
---

# Design System

## Overview

Impeccable uses an editorial, high-contrast visual system: paper, ink, considered serif display type, precise sans-serif body text, and a single assertive magenta accent. The system should feel like a design publication that happens to ship tooling, not a generic developer SaaS site.

The product critiques generic AI aesthetics, so the interface must avoid the same tells. It can be expressive, but expression comes from type scale, spacing, confident hierarchy, and clear examples rather than decorative noise.

## Colors

- **Ink** (`oklch(10% 0 0)`): primary headings, strong text, active navigation, and dark fills.
- **Paper** (`oklch(98% 0 0)`): main page surface. Keep it clean and high contrast.
- **Cream** (`oklch(96% 0.005 350)`): quiet secondary surface for pills, panels, and callouts.
- **Charcoal** (`oklch(25% 0 0)`): secondary body text where pure ink would feel too heavy.
- **Ash** (`oklch(55% 0 0)`): metadata, captions, index numbers, and lower-priority UI labels.
- **Mist** (`oklch(92% 0 0)`): borders, dividers, scroll thumbs, and low-emphasis structure.
- **Accent** (`oklch(60% 0.25 350)`): active links, selection, command highlights, and a small number of interactive cues.

Category colors are functional and should remain scoped to command/category navigation. Do not let them become the whole page palette.

## Typography

- **Display**: Cormorant Garamond, regular, tight leading, slight negative tracking. Use for brand-scale headings and editorial section titles.
- **Body**: Instrument Sans, regular to semibold, readable line length, generous leading. Use for prose, UI labels, and dense documentation.
- **Mono**: Space Grotesk. Use for command names, code-adjacent metadata, counters, and detector-oriented labels.

Display headings carry the brand. Body text carries trust. Mono text should be sparing and functional, not a full terminal aesthetic.

## Layout

- Use `1400px` as the broad page max-width and `900px` as the readable content width.
- Space on an 8px base with larger editorial jumps: 8, 16, 24, 32, 48, 80, 120.
- Prefer full-width sections with constrained inner content over nested cards.
- Use generous vertical rhythm around explanatory sections; use denser spacing only in reference surfaces, navs, and command grids.
- Mobile layouts should preserve hierarchy rather than simply stacking every decorative module.

## Shapes, Elevation & Depth

- Default corners are restrained: 2px for frames, 4px for code chips and tiny controls, 8px for ordinary UI, 99px for pills.
- Shadows are rare and should feel like paper depth, not glowing panels.
- Borders do most structural work. Use `mist` borders for quiet structure and ink borders only for active or high-value surfaces.
- The site may use subtle grain, but the grain must remain background texture and never compete with content.

## Components

- **Site header**: sticky, translucent paper surface, blurred backdrop, mist bottom border, serif brand mark, quiet nav links.
- **Buttons and command pills**: compact, type-led, high contrast when active. Prefer ink fills or cream pills with mist borders.
- **Cards**: use cards for repeated items and actual framed artifacts. Avoid page sections styled as floating cards.
- **Code chips**: mono type, accent-dim background, accent text, 4px radius.
- **Galleries and demos**: framed like specimens. Use clear labels and restrained borders so before/after changes do the work.
- **Detector/category badges**: use the category palette only to identify command groups or detector layers.

## Do's And Don'ts

- Do let typography and spacing provide most of the personality.
- Do use the magenta accent sparingly and deliberately.
- Do keep examples concrete: show the command, the before state, and the improved state.
- Do respect reduced motion and keep animated demos optional or non-blocking.
- Don't use purple-blue hero gradients, glassmorphism, bokeh blobs, or neon tool-marketing tropes.
- Don't bury Codex command syntax behind generic product copy.
- Don't add decorative cards where a clean section or list would be clearer.
- Don't let category colors dominate the interface outside category-specific surfaces.
