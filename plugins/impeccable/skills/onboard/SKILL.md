---
name: onboard
description: Create or improve onboarding, first-run experiences, empty states, feature discovery, and activation flows. Use when the user asks to improve onboarding, empty states, first-use flows, guided tours, tutorials, progressive disclosure, or time-to-value.
version: 2.1.7
argument-hint: "[target]"
---

Create or improve onboarding experiences that help users understand, adopt, and succeed with the product quickly.

Before changing an onboarding flow, identify the "aha moment" users should reach and the users' experience level. If either is missing and cannot be inferred from confirmed project context, ask before designing.

## Assess Onboarding Needs

Understand what users need to learn and why:

1. **Identify the challenge**:
   - What are users trying to accomplish?
   - What is confusing or unclear about the current experience?
   - Where do users get stuck or drop off?
   - What is the "aha moment" we want users to reach?

2. **Understand the users**:
   - What is their experience level? Beginners, power users, or mixed?
   - What is their motivation? Excited and exploring, or required by work?
   - What is their time commitment? 5 minutes, 30 minutes, or one quick action?
   - What alternatives do they know? A competitor, spreadsheets, paper, or nothing?

3. **Define success**:
   - What is the minimum users need to learn to be successful?
   - What key action should they take first?
   - How will we know onboarding worked: completion rate, activation rate, time to value, or support-ticket reduction?

**CRITICAL**: Onboarding should get users to value as quickly as possible, not teach everything possible.

## Onboarding Principles

### Show, Do Not Tell

- Demonstrate with working examples, not just descriptions.
- Teach inside real product surfaces, not a disconnected tutorial mode.
- Use progressive disclosure: teach one thing at a time.

### Make It Optional When Possible

- Let experienced users skip onboarding.
- Do not block access to the product unless setup is truly required.
- Provide "Skip" or "I'll explore on my own" options.

### Shorten Time To Value

- Get users to the "aha moment" as early as possible.
- Front-load the concepts needed for the first useful action.
- Teach the 20% that delivers 80% of value.
- Save advanced features for contextual discovery.

### Prefer Context Over Ceremony

- Teach features when users need them, not upfront.
- Treat empty states as onboarding opportunities.
- Use brief tooltips and hints at the point of use.

### Respect User Intelligence

- Do not patronize or over-explain.
- Keep copy concise and concrete.
- Assume users understand standard interface patterns.

## Design Onboarding Experiences

Choose the pattern that matches the user and product context.

### Initial Product Onboarding

**Welcome screen**:
- Clear value proposition: what is this product?
- What users will accomplish.
- Honest time estimate.
- Skip option for experienced users.

**Account setup**:
- Minimal required information.
- Explain why each required field matters.
- Smart defaults where possible.
- Social login when appropriate.

**Core concept introduction**:
- Introduce 1 to 3 core concepts, not every feature.
- Use simple language and real examples.
- Make it interactive when possible.
- Show progress when the sequence has multiple steps.

**First success**:
- Guide users to accomplish something real.
- Use pre-populated examples or templates when helpful.
- Celebrate completion quietly.
- Provide a clear next step.

### Feature Discovery And Adoption

**Empty states** should show:
- What will appear here.
- Why it is valuable.
- Clear CTA to create the first item.
- Example or template option.

Example:

```text
No projects yet
Projects help you organize your work and collaborate with your team.
[Create your first project] or [Start from template]
```

**Contextual tooltips**:
- Appear at the relevant moment.
- Point directly at the relevant UI element.
- Explain the benefit briefly.
- Are dismissible and remembered.
- Offer a "Learn more" link only when useful.

**Feature announcements**:
- Highlight what is new and why it matters.
- Let users try immediately.
- Stay dismissible.

**Progressive onboarding**:
- Teach features when users encounter them.
- Use badges or indicators on new or unused features.
- Unlock complexity gradually instead of showing every option at once.

### Guided Tours And Walkthroughs

Use guided tours for complex interfaces, significant product changes, or domain-specific tools where users need orientation.

Design tours to:
- Spotlight specific UI elements.
- Keep steps short, usually 3 to 7 steps.
- Allow users to click through freely.
- Include a skip option.
- Make the tour replayable from help or settings.

Prefer workflow teaching over feature labeling: "Create a project" beats "This is the project button."

### Interactive Tutorials

Use interactive tutorials when users need hands-on practice, concepts are unfamiliar, or mistakes are high-stakes.

Design tutorials with:
- A sandbox environment or sample data.
- Clear objectives.
- Step-by-step guidance.
- Validation that confirms the user did it right.
- A graduation moment that moves them back to the real product.

### Documentation And Help

Use in-product help for support that users can pull when needed:

- Contextual help links near complex features.
- Keyboard shortcut references.
- Searchable help center.
- Short video or interactive examples for complex workflows.
- `?` icons near advanced concepts, not obvious controls.

## Empty State Design

Every empty state needs:

1. **What will be here**: "Your recent projects will appear here."
2. **Why it matters**: "Projects help you organize your work and collaborate with your team."
3. **How to get started**: one clear primary action and, when useful, one secondary path.
4. **Visual interest**: an illustration, icon, example, or preview that earns its space.
5. **Contextual help**: a short help link only when it reduces uncertainty.

Handle each empty-state type differently:

- **First use**: emphasize value and provide templates.
- **User cleared**: use a lighter touch and make recreation easy.
- **No results**: suggest a different query and offer to clear filters.
- **No permissions**: explain why and how to request access.
- **Error state**: explain what happened and provide retry or fallback action.

## Implementation Patterns

Use technical patterns that respect users' time:

- Track completed or dismissed onboarding so users are not nagged.
- Store seen-state locally or in the user profile, depending on whether the learning should follow the user across devices.
- Keep modals accessible with focus management, Escape handling, and clear close controls.
- Use analytics for completion, drop-off, skip rate, and time to value.

```javascript
localStorage.setItem('onboarding-completed', 'true');
localStorage.setItem('feature-tooltip-seen-reports', 'true');
```

**IMPORTANT**: Do not show the same onboarding repeatedly. Track completion and respect dismissals.

## Verify Onboarding Quality

Test the flow with realistic users or realistic scenarios:

- **Time to completion**: Can users complete onboarding quickly?
- **Comprehension**: Do users understand the core concept after completing?
- **Action**: Do users take the desired next step?
- **Skip rate**: Are too many users skipping?
- **Completion rate**: Are users completing?
- **Time to value**: How long until users get first value?

## Never

- Force users through long onboarding before they can use the product.
- Patronize users with obvious explanations.
- Show the same tooltip repeatedly.
- Block the whole UI during a tour.
- Create a tutorial mode disconnected from the real product.
- Overwhelm users with information upfront.
- Hide skip controls or make them feel punitive.
- Forget returning users.

Remember: You are a product educator with strong design judgment. Get users to their "aha moment" quickly, teach the essential, make it contextual, and respect their time.