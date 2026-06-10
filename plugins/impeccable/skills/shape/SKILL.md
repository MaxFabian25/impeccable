---
name: shape
description: Plan the UX and UI for a feature before writing code. Runs a structured discovery interview, then produces a design brief that guides implementation. Use during the planning phase to establish design direction, constraints, and strategy before any code is written.
version: 2.1.7
argument-hint: "[feature to shape]"
---

## MANDATORY PREPARATION

Invoke $impeccable, which contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding. If no design context exists yet, you MUST run $impeccable teach first.

---

Shape the UX and UI for a feature before any code is written. This skill produces a **design brief**: a structured artifact that guides implementation through discovery, not guesswork.

**Scope**: Design planning only. This skill does NOT write code. It produces the thinking that makes code good.

**Output**: A design brief that can be handed off to $impeccable craft, $impeccable, or any other implementation skill. When visual direction probes are used, the images are supporting artifacts, not the primary output.

## Philosophy

Most AI-generated UIs fail not because of bad code, but because of skipped thinking. They jump to "here's a card grid" without asking "what is the user trying to accomplish?" This skill inverts that: understand deeply first, so implementation is precise.

## Phase 1: Discovery Interview

**Do NOT write any code or make any design decisions during this phase.** Your only job is to understand the feature deeply enough to make excellent design decisions later.

Ask these questions in conversation, adapting based on answers. Don't dump them all at once; have a natural dialogue, and ask directly for anything you cannot infer.

### Purpose & Context
- What is this feature for? What problem does it solve?
- Who specifically will use it? (Not "users"; be specific: role, context, frequency)
- What does success look like? How will you know this feature is working?
- What's the user's state of mind when they reach this feature? (Rushed? Exploring? Anxious? Focused?)

### Content & Data
- What content or data does this feature display or collect?
- What are the realistic ranges? (Minimum, typical, maximum, e.g., 0 items, 5 items, 500 items)
- What are the edge cases? (Empty state, error state, first-time use, power user)
- Is any content dynamic? What changes and how often?

### Design Goals
- What's the single most important thing a user should do or understand here?
- What should this feel like? (Fast/efficient? Calm/trustworthy? Fun/playful? Premium/refined?)
- Are there existing patterns in the product this should be consistent with?
- Are there specific examples (inside or outside the product) that capture what you're going for?

### Constraints
- Are there technical constraints? (Framework, performance budget, browser support)
- Are there content constraints? (Localization, dynamic text length, user-generated content)
- Mobile/responsive requirements?
- Accessibility requirements beyond WCAG AA?

### Anti-Goals
- What should this NOT be? What would be a wrong direction?
- What's the biggest risk of getting this wrong?

## Phase 1.5: Visual Direction Probe (Capability-Gated)

After the discovery interview, generate a small set of visual direction probes before writing the final brief when all of these are true:

- The work is net-new or directionally ambiguous enough that visual exploration will clarify the brief.
- The requested fidelity is mid-fi, high-fi, or production-ready. Skip for sketch-only planning.
- The current environment has built-in image generation capability. Do not ask the user to set up external APIs, shell scripts, or one-off tooling just to do this.

When those conditions are met, this step is the default. Use it to explore visual lanes, not to replace the brief.

### What To Generate

Generate 2 to 4 distinct direction probes based on the discovery answers, especially:

- Color strategy
- Aesthetic tone and scene
- Named anchor references
- Scope and fidelity

The probes should differ in primary visual direction, such as hierarchy, topology, density, typographic voice, or color strategy. Do not make mere palette variants.

### How To Use The Probes

- Treat them as direction tests, not final designs.
- Use them to pressure-test whether the brief is pointing at the right lane.
- Ask the user which direction feels closest, what feels off, and what should carry forward.
- If the probes reveal a mismatch, revise the brief inputs before finalizing the brief.

### Limits

- Do not skip discovery because image generation is available.
- Do not treat generated imagery as final UX specification, final copy, or final accessibility behavior.
- Do not use this step for minor refinements of existing work. It is for shaping a new surface or clarifying a major directional choice.

If image generation is unavailable, or the task does not benefit from it, skip this phase and proceed directly to the design brief.

## Phase 2: Design Brief

After the interview, synthesize everything into a structured design brief. Present it to the user for confirmation before considering this skill complete.

### Brief Structure

**1. Feature Summary** (2-3 sentences)
What this is, who it's for, what it needs to accomplish.

**2. Primary User Action**
The single most important thing a user should do or understand here.

**3. Design Direction**
How this should feel. What aesthetic approach fits. Reference the project's Design Context in `AGENTS.md` and explain how this feature should express it.

If you ran the Visual Direction Probe step, name which probe direction won and what changed in the brief because of it.

**4. Layout Strategy**
High-level spatial approach: what gets emphasis, what's secondary, how information flows. Describe the visual hierarchy and rhythm, not specific CSS.

**5. Key States**
List every state the feature needs: default, empty, loading, error, success, edge cases. For each, note what the user needs to see and feel.

**6. Interaction Model**
How users interact with this feature. What happens on click, hover, scroll? What feedback do they get? What's the flow from entry to completion?

**7. Content Requirements**
What copy, labels, empty state messages, error messages, and microcopy are needed. Note any dynamic content and its realistic ranges.

**8. Recommended References**
Based on the brief, list which impeccable reference files would be most valuable during implementation (e.g., spatial-design.md for complex layouts, motion-design.md for animated features, interaction-design.md for form-heavy features).

**9. Open Questions**
Anything unresolved that the implementer should resolve during build.

---

Ask for explicit confirmation of the brief before finishing. If the user disagrees with any part, revisit the relevant discovery questions.

Once confirmed, the brief is complete. The user can now hand it to $impeccable, or use it to guide any other implementation approach. (If the user wants the full discovery-then-build flow in one step, they should use $impeccable craft instead, which runs this skill internally.)