---
name: critique
description: Evaluate design from a UX perspective, assessing visual hierarchy, information architecture, emotional resonance, cognitive load, and overall quality with quantitative scoring, persona-based testing, automated anti-pattern detection, and actionable feedback. Use when the user asks to review, critique, evaluate, or give feedback on a design or component.
version: 2.1.7
argument-hint: "[area (feature, page, component...)]"
---

## STEPS

### Step 1: Preparation

Invoke $impeccable, which contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding. If no design context exists yet, you MUST run $impeccable teach first. Additionally gather: what the interface is trying to accomplish.

### Hard Invariants

- Assessment A (LLM design review) and Assessment B (detector/browser evidence) are both required.
- Assessment A must finish before detector findings enter the parent synthesis context. Detector output is deterministic, but it can still anchor judgment.
- If sub-agents are unavailable, fall back sequentially: finish and record Assessment A first, then run Assessment B, then synthesize.
- A skipped detector is a failed critique run unless `npx impeccable detect` is missing or crashes after a real attempt.
- Viewable targets require browser inspection when browser automation is available.
- Any local server started only for critique visualization must run in the background, have a recorded stop method, and be stopped before final reporting unless the user asks to keep it.
- Do not claim a user-visible overlay exists unless script injection succeeded and the detector ran in the page.

### Step 2: Resolve Target and Load Ignore List

Before gathering assessments, do the bookkeeping that makes critique iterative across runs:

1. **Resolve the primary artifact**. The user's phrasing ("the homepage", "the pricing flow") is not stable enough to track. Resolve it to a concrete file path or URL: the same one you will scan or open in a browser. Prefer the source file path over a dev-server URL when both exist, because ports drift and file paths do not.

2. **Compute the slug**:
   ```bash
   node skills/impeccable/scripts/critique-storage.mjs slug "<resolved-path-or-url>"
   ```
   Keep the printed slug. If the command exits non-zero, skip persistence for this run and tell the user the trend will not update.

3. **Read `.impeccable/critique/ignore.md` if it exists**. Each non-empty, non-comment line is a user-accepted deferral, intentional deviation, or false positive. When a finding's text matches a line here as a case-insensitive substring against the rule name or snippet, drop it silently. This is the only prior-run input critique consumes; do not anchor the assessment on previous reports.

### Step 3: Gather Assessments

Launch two independent assessments. **Neither may see the other's output**. This isolation is what makes the combined score honest. Running both in one head silently anchors them to each other; do not shortcut it for cost, speed, or context-size reasons.

Delegate each assessment to a separate sub-agent when the environment supports it. Use your environment's subagent spawning mechanism. Sub-agents should return their findings as structured text. Do NOT output findings to the user yet.

Codex sub-agent gate:
- If a sub-agent spawn tool is exposed and the user explicitly allowed sub-agents, delegation, or parallel agent work, spawn A and B immediately.
- If a sub-agent spawn tool is exposed but the user did not explicitly allow sub-agents, ask exactly once: "Impeccable critique is designed to run two independent sub-agents for an unanchored assessment. May I use sub-agents for this critique?" Then stop until the user answers.
- If allowed, spawn A and B. If declined, run sequentially and report `Assessment independence: degraded (sub-agents declined by user)`.
- If no sub-agent spawn tool is exposed, do not ask; run sequentially and report `Assessment independence: degraded (spawn unavailable in this session)`.
- If spawning fails after permission, run sequentially and report `Assessment independence: degraded (sub-agent spawn failed: <exact error>)`.

Fall back to sequential in-head work only when the environment genuinely cannot spawn sub-agents or the user declines.

**Tab isolation**: When browser automation is available, each assessment MUST create its own new tab. Never reuse an existing tab, even if one is already open at the correct URL. This prevents the two assessments from interfering with each other's page state.

#### Assessment A: LLM Design Review

Read the relevant source files (HTML, CSS, JS/TS) and, if browser automation is available, visually inspect the live page. **Create a new tab** for this; do not reuse existing tabs. After navigation, label the tab by setting the document title:
```javascript
document.title = '[LLM] ' + document.title;
```
Think like a design director. Evaluate:

**AI Slop Detection (CRITICAL)**: Does this look like every other AI-generated interface? Review against ALL **DON'T** guidelines in the impeccable skill. Check for AI color palette, gradient text, dark glows, glassmorphism, hero metric layouts, identical card grids, generic fonts, and all other tells. **The test**: If someone said "AI made this," would you believe them immediately?

**Holistic Design Review**: visual hierarchy (eye flow, primary action clarity), information architecture (structure, grouping, cognitive load), emotional resonance (does it match brand and audience?), discoverability (are interactive elements obvious?), composition (balance, whitespace, rhythm), typography (hierarchy, readability, font choices), color (purposeful use, cohesion, accessibility), states & edge cases (empty, loading, error, success), microcopy (clarity, tone, helpfulness).

**Cognitive Load** (consult [cognitive-load](reference/cognitive-load.md)):
- Run the 8-item cognitive load checklist. Report failure count: 0-1 = low (good), 2-3 = moderate, 4+ = critical.
- Count visible options at each decision point. If >4, flag it.
- Check for progressive disclosure: is complexity revealed only when needed?

**Emotional Journey**:
- What emotion does this interface evoke? Is that intentional?
- **Peak-end rule**: Is the most intense moment positive? Does the experience end well?
- **Emotional valleys**: Check for anxiety spikes at high-stakes moments (payment, delete, commit). Are there design interventions (progress indicators, reassurance copy, undo options)?

**Nielsen's Heuristics** (consult [heuristics-scoring](reference/heuristics-scoring.md)):
Score each of the 10 heuristics 0-4. This scoring will be presented in the report.

Return structured findings covering: AI slop verdict, heuristic scores, cognitive load assessment, what's working (2-3 items), priority issues (3-5 with what/why/fix), minor observations, and provocative questions.

#### Assessment B: Automated Detection

Run the deterministic detector, which flags specific AI slop tells and general design quality issues.

**CLI scan**:
```bash
npx impeccable detect --json [target]
```

- Pass HTML/JSX/TSX/Vue/Svelte files or directories as `[target]` (anything with markup). Do not pass CSS-only files.
- For URLs, use the CLI scan when you want deterministic findings from the live page. It runs through agent-browser and needs a working local browser install.
- For large trees (500+ scannable files), narrow scope or ask the user
- Exit code 0 = clean, 2 = findings
- If the detector entrypoint is missing or fails to load, report deterministic scan unavailable and continue with browser/manual review.

**Browser visualization**: Required when browser automation tools are available AND the target is a viewable page. The **[Human]** overlay tab is the user-facing deliverable; the critique is incomplete without it. Skip only if the target is not a viewable page (CSS-only file, non-browser target).

The overlay is a **visual aid for the user**. It highlights issues directly in their browser. Do NOT scroll through the page to screenshot overlays. Instead, read the console output to get the results programmatically.

1. **Create a new tab** and navigate to the page (use dev server URL for local files, or direct URL). Do not reuse existing tabs.
2. **Preflight mutable injection** by setting `document.title` and appending a harmless `<script>` tag. Read-only evaluate APIs do not count.
3. If mutation is unavailable, skip live server, browser presentation, and injection; report the fallback signal instead.
4. **Start the live detection server**:
   ```bash
   npx impeccable live &
   ```
   Note the port printed to stdout (auto-assigned). Use `--port=PORT` to fix it.
5. **Label the tab** via `javascript_tool` so the user can distinguish it:
   ```javascript
   document.title = '[Human] ' + document.title;
   ```
6. **Scroll to top** to ensure the page is scrolled to the very top before injection
7. **Inject** via `javascript_tool` (replace PORT with the port from step 1):
   ```javascript
   const s = document.createElement('script'); s.src = 'http://localhost:PORT/detect.js'; document.head.appendChild(s);
   ```
8. Wait 2-3 seconds for the detector to render overlays
9. **Read results from console** using `read_console_messages` with pattern `impeccable`. The detector logs all findings with the `[impeccable]` prefix. Do NOT scroll through the page to take screenshots of the overlays.
10. **If the user captures annotations** from an overlay, consume the next event from the poll command printed by `npx impeccable live`. The event includes `{screenshotPath, comments, strokes, element}`. Read `screenshotPath` first when present; comment `{x, y}` positions are element-local CSS pixels and should be applied to the sub-element at that point.
11. **Cleanup**: Stop the live server when done:
   ```bash
   npx impeccable live stop
   ```

For multi-view targets, inject on 3-5 representative pages. If injection fails, continue with CLI results only.

Return: CLI findings (JSON), browser console findings (if applicable), and any false positives noted.

After Assessment B returns usable CLI findings, reuse them. Do not rerun `npx impeccable detect` in the parent unless Assessment B failed, was truncated, or omitted count, rule names, or file locations.

Final Run Notes must include target slug, ignore list, assessment independence, CLI detector, browser visibility, overlay injection, live-server cleanup, temp-file cleanup, and any fallback signal used. Do not run repo status checks, late API spelunking, or unrelated verification after the report is assembled.

### Step 4: Generate Combined Critique Report

Synthesize both assessments into a single report. Do NOT simply concatenate. Weave the findings together, noting where the LLM review and detector agree, where the detector caught issues the LLM missed, and where detector findings are false positives.

The chat response is the primary user-facing deliverable. Present the full structured critique below in chat; do not replace it with a summary and a link. The persisted snapshot is only an archive/backlog for later commands.

Structure your feedback as a design director would:

#### Design Health Score
> *Consult [heuristics-scoring](reference/heuristics-scoring.md)*

Present the Nielsen's 10 heuristics scores as a table:

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | ? | [specific finding or "n/a" if solid] |
| 2 | Match System / Real World | ? | |
| 3 | User Control and Freedom | ? | |
| 4 | Consistency and Standards | ? | |
| 5 | Error Prevention | ? | |
| 6 | Recognition Rather Than Recall | ? | |
| 7 | Flexibility and Efficiency | ? | |
| 8 | Aesthetic and Minimalist Design | ? | |
| 9 | Error Recovery | ? | |
| 10 | Help and Documentation | ? | |
| **Total** | | **??/40** | **[Rating band]** |

Be honest with scores. A 4 means genuinely excellent. Most real interfaces score 20-32.

#### Anti-Patterns Verdict

**Start here.** Does this look AI-generated?

**LLM assessment**: Your own evaluation of AI slop tells. Cover overall aesthetic feel, layout sameness, generic composition, missed opportunities for personality.

**Deterministic scan**: Summarize what the automated detector found, with counts and file locations. Note any additional issues the detector caught that you missed, and flag any false positives.

**Visual overlays** (if injection succeeded): Tell the user that overlays are now visible in the **[Human]** tab in their browser, highlighting the detected issues. Summarize what the console output reported. If browser visualization was attempted but injection failed, say that no reliable user-visible overlay is available and report the fallback signal instead.

#### Overall Impression
A brief gut reaction: what works, what doesn't, and the single biggest opportunity.

#### What's Working
Highlight 2-3 things done well. Be specific about why they work.

#### Priority Issues
The 3-5 most impactful design problems, ordered by importance.

For each issue, tag with **P0-P3 severity** (consult [heuristics-scoring](reference/heuristics-scoring.md) for severity definitions):
- **[P?] What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: What to do about it (be concrete)
- **Suggested command**: Which command could address this (from: $adapt, $animate, $audit, $bolder, $clarify, $colorize, $critique, $delight, $distill, $harden, $layout, $onboard, $optimize, $overdrive, $polish, $quieter, $shape, $typeset)

#### Persona Red Flags
> *Consult [personas](reference/personas.md)*

Auto-select 2-3 personas most relevant to this interface type (use the selection table in the reference). If `PRODUCT.md` contains audience or brand context from `$impeccable teach`, also generate 1-2 project-specific personas from that information.

For each selected persona, walk through the primary user action and list specific red flags found:

**Alex (Power User)**: No keyboard shortcuts detected. Form requires 8 clicks for primary action. Forced modal onboarding. High abandonment risk.

**Jordan (First-Timer)**: Icon-only nav in sidebar. Technical jargon in error messages ("404 Not Found"). No visible help. Will abandon at step 2.

Be specific. Name the exact elements and interactions that fail each persona. Don't write generic persona descriptions; write what broke for them.

#### Minor Observations
Quick notes on smaller issues worth addressing.

#### Questions to Consider
Provocative questions that might unlock better solutions:
- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a confident version of this look like?"

#### Run Notes

Keep this compact. Include status for target slug, ignore list, assessment independence, CLI detector, browser visibility, overlay injection, live server cleanup, temp-file cleanup, snapshot write, trend read, and any fallback signal used. For failed or skipped steps, give the concrete observed reason.

Run Notes are final-chat only. Do not include this section in the persisted snapshot body, because persistence, trend read, and temp cleanup happen after the snapshot write and would otherwise archive stale status.

**Remember**:
- Be direct. Vague feedback wastes everyone's time.
- Be specific. "The submit button," not "some elements."
- Say what's wrong AND why it matters to users.
- Give concrete suggestions, not just "consider exploring..."
- Prioritize ruthlessly. If everything is important, nothing is.
- Don't soften criticism. Developers need honest feedback to ship great design.

### Step 5: Persist the Snapshot

Once the report above is finalized, write it to `.impeccable/critique/` so the user can refer back and so $polish can pick up priority issues without copy-paste.

Skip this step if the target slug was null.

1. **Write the report body to a temp file**. Use the full report through Persona Red Flags, Minor Observations, and Questions to Consider, but stop before Run Notes, Ask the User, and Recommended Actions.

2. **Pass structured metadata through `IMPECCABLE_CRITIQUE_META`**, then run:
   ```bash
   IMPECCABLE_CRITIQUE_META='{"target":"<user phrasing>","total_score":<n>,"p0_count":<n>,"p1_count":<n>}' \
     node skills/impeccable/scripts/critique-storage.mjs write <slug> <body-file>
   ```
   The helper prints the absolute path it wrote.

3. **Delete the temp body file** after the write attempt completes, whether the write succeeded or failed. If deletion fails, mention `temp-file cleanup failed: <reason>` briefly in the final output, but do not block the critique.

4. **Read the trend**:
   ```bash
   node skills/impeccable/scripts/critique-storage.mjs trend <slug> 5
   ```

5. **Append a single line to the user-visible output**, after the report and before questions:

   > **Trend for `<slug>` (last 5 runs): 24 -> 28 -> 32 -> 29 -> 32**
   > Wrote `.impeccable/critique/<filename>`.

   If this is the first run for the slug, say: "First run for this target, no trend yet."

This is fire-and-forget. Do not show raw helper JSON. If persistence fails, state the failure briefly and continue.

### Step 6: Ask the User

**After presenting findings**, ask targeted follow-up questions based on what was actually found. These answers will shape the action plan.

Ask questions along these lines (adapt to the specific findings; do NOT ask generic questions):

1. **Priority direction**: Based on the issues found, ask which category matters most to the user right now. For example: "I found problems with visual hierarchy, color usage, and information overload. Which area should we tackle first?" Offer the top 2-3 issue categories as options.

2. **Design intent**: If the critique found a tonal mismatch, ask whether it was intentional. For example: "The interface feels clinical and corporate. Is that the intended tone, or should it feel warmer/bolder/more playful?" Offer 2-3 tonal directions as options based on what would fix the issues found.

3. **Scope**: Ask how much the user wants to take on. For example: "I found N issues. Want to address everything, or focus on the top 3?" Offer scope options like "Top 3 only", "All issues", "Critical issues only".

4. **Constraints** (optional; only ask if relevant): If the findings touch many areas, ask if anything is off-limits. For example: "Should any sections stay as-is?" This prevents the plan from touching things the user considers done.

**Rules for questions**:
- Every question must reference specific findings from the report. Never ask generic "who is your audience?" questions.
- Keep it to 2-4 questions maximum. Respect the user's time.
- Offer concrete options, not open-ended prompts.
- If findings are straightforward (e.g., only 1-2 clear issues), skip questions and go directly to Recommended Actions.
- The user-visible response must either include targeted questions or explicitly say `Questions skipped: <reason>` because the findings were straightforward. Each question must include 2-3 concrete answer options tied to the actual critique findings.

### Step 7: Recommended Actions

**After receiving the user's answers**, present a prioritized action summary reflecting the user's priorities and scope from Ask the User.

#### Action Summary

List recommended commands in priority order, based on the user's answers:

1. **`$command-name`**: Brief description of what to fix (specific context from critique findings)
2. **`$command-name`**: Brief description (specific context)
...

**Rules for recommendations**:
- Only recommend commands from: $adapt, $animate, $audit, $bolder, $clarify, $colorize, $critique, $delight, $distill, $harden, $layout, $onboard, $optimize, $overdrive, $polish, $quieter, $shape, $typeset
- Order by the user's stated priorities first, then by impact
- Each item's description should carry enough context that the command knows what to focus on
- Map each Priority Issue to the appropriate command
- Skip commands that would address zero issues
- If the user chose a limited scope, only include items within that scope
- If the user marked areas as off-limits, exclude commands that would touch those areas
- End with `$polish` as the final step if any fixes were recommended

After presenting the summary, tell the user:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `$critique` after fixes to see your score improve.