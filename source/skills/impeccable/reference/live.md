Interactive live variant mode: select elements in the browser, pick a design action, and get AI-generated HTML+CSS variants hot-swapped via the dev server's HMR.

## Prerequisites

A running dev server with hot module replacement (Vite, Next.js, Bun, etc.), OR a static HTML file open in the browser.

## The contract (read once)

Execute in order. No step skipped, no step reordered.

1. `live.mjs` — boot.
2. Navigate to the URL that serves `pageFile` (infer from `package.json`, docs, terminal output, or an open tab). If a browser tool is available, open the tab yourself before the first poll. Otherwise, tell the user once to open their dev/preview URL. Never use `serverPort` as that URL: it is the helper, not the app.
3. Poll loop with the default long timeout (600000 ms). After every event or `--reply`, run `live-poll.mjs` again immediately. Never pass a short `--timeout=`.
4. On `generate` — read screenshot if present; load the action's reference; plan three distinct directions; write all variants in one edit; `--reply done`; poll again.
5. On `accept` / `discard` — the poll script already cleaned up; just poll again.
6. On `exit` — run the cleanup at the bottom.

Codex policy: run the poll in the foreground with the default long timeout. Do not background it, do not send it to a subagent, and do not shorten the timeout to end the chat turn. After each event or reply, immediately run `live-poll.mjs` again.

Chat is overhead. No recap, no tutorial output, no pasting PRODUCT / DESIGN bodies. Spend tokens on tools and edits; on failure, one or two short sentences.

## Start

```bash
node {{scripts_path}}/live.mjs
```

Output JSON: `{ ok, serverPort, serverToken, pageFiles, hasProduct, product, productPath, hasDesign, design, designPath, migrated, contextDir }`. `pageFiles` is the list of HTML entries the live script was injected into. Keep PRODUCT.md and DESIGN.md in mind for variant generation: **DESIGN.md wins on visual decisions; PRODUCT.md wins on strategic/voice decisions.** When DESIGN.md is missing, identity is not absent; extract it from CSS variables, computed styles, and sibling components on the page (see Step 4 Phase A). Identity preservation is the default. Departure from existing identity requires an explicit trigger from PRODUCT.md anti-references or the user's freeform prompt. If `migrated: true`, the loader auto-renamed legacy `.impeccable.md` to `PRODUCT.md`; mention this once and suggest `{{command_prefix}}impeccable document` for the matching DESIGN.md.

`serverPort` and `serverToken` belong to the small **Impeccable live helper** HTTP server (serves `/live.js`, SSE, and `/poll`). That port is **not** your dev server and is usually not the URL you open to view the app. The browser page is whatever origin serves one of the `pageFiles` entries (Vite / Next / Bun / tunnel / LAN hostname).

If output is `{ ok: false, error: "config_missing" | "config_invalid", path }`, this project hasn't been configured for live mode (or its config is stale). See **First-time setup** at the bottom.

## Poll loop

```
LOOP:
  node {{scripts_path}}/live-poll.mjs   # default long timeout; no --timeout=
  Read JSON; dispatch on "type"

  "generate"  → Handle Generate; reply done; LOOP
  "accept"    → Handle Accept; LOOP
  "discard"   → Handle Discard; LOOP
  "prefetch"  → Handle Prefetch; LOOP
  "timeout"   → LOOP
  "exit"      → break → Cleanup
```

## Handle `generate`

Event: `{id, action, freeformPrompt?, count, pageUrl, element, screenshotPath?, comments?, strokes?}`.

Speed matters — the user is watching a spinner. Minimize tool calls by using the `wrap` helper and writing all variants in a single edit.

### 1. Read the screenshot (if present)

`event.screenshotPath` is only sent when the user placed at least one comment or stroke before Go. When present, it is an absolute path to a PNG of the element as rendered with the annotations baked in. **Read it before planning.** Annotations encode user intent not recoverable from `element.outerHTML` alone.

When `screenshotPath` is absent, do not ask for one and do not go looking for the current rendering. The omission is deliberate: without annotations, a screenshot would anchor the model on the existing design and fight the three-distinct-directions brief. Work from `element.outerHTML`, the computed styles in `event.element`, and the freeform prompt if present.

`event.comments` and `event.strokes` carry structured metadata alongside the visual. Treat the screenshot as primary; use the structured data for specifics worth quoting (e.g. the exact text of a comment).

Reading annotations precisely:

- **Comment position is load-bearing.** Its `{x, y}` is element-local CSS px (same coord space as `element.boundingRect`). Find the child under that point and apply the comment text LOCALLY to that sub-element. A comment near the title is about the title, not a global description.
- **Comments and strokes are independent annotations** unless clearly paired by overlap or tight proximity. Don't let the visual weight of a prominent stroke override the precise location of a textually-specific comment elsewhere.
- **Strokes are gestures — read them by shape.** Closed loop = "this thing" (emphasis / focus); arrow = direction (move / point to); cross or slash = delete; free scribble = emphasis or delete depending on context. A loop around region X means "pay attention to X," not "only change pixels inside X."
- **When a stroke's intent is ambiguous** (circle or arrow? emphasis or move?), state your reading in one sentence of rationale rather than silently guessing. If the uncertainty materially changes the brief, ask one short clarifying question before generating.

### 2. Wrap the element

```bash
node {{scripts_path}}/live-wrap.mjs --id EVENT_ID --count EVENT_COUNT --element-id "ELEMENT_ID" --classes "class1,class2" --tag "div" --text "TEXT_SNIPPET"
```

Flag mapping — keep them separate, don't collapse into `--query`:

- `--element-id` ← `event.element.id`
- `--classes` ← `event.element.classes` joined with commas
- `--tag` ← `event.element.tagName`
- `--text` ← first ~80 chars of `event.element.textContent` (trim, single-line). Pass this every call. When the picked element shares classes and tag with sibling components (a list of cards, repeated sections), this disambiguates which source branch to wrap.

The helper searches ID first, then classes, then tag + class combo. If `event.pageUrl` implies the file (e.g. `/` is usually `index.html`), pass `--file PATH` to skip the search. `--query` is a fallback for raw text search only — do not use it for normal element lookups.

If `--text` matches multiple candidates equally well, wrap exits with `{ error: "element_ambiguous", candidates: [...] }` and `fallback: "agent-driven"` — read the candidate line ranges, decide which one matches the picked element from page context, and write the wrapper manually per the fallback flow.

Output on success: `{ file, insertLine, commentSyntax }`.

**Fallback errors.** Wrap only writes into files it judges to be source (tracked by git, not marked GENERATED, not listed in config's `generatedFiles`). If it can't land on a source file, it errors without writing — accepting a variant into a generated file is silent data loss. Three shapes:

- `{ error: "file_is_generated", file, hint }` — user-supplied `--file` points at a generated file.
- `{ error: "element_not_in_source", generatedMatch, hint }` — element exists only in a generated file (the next build would wipe any edits).
- `{ error: "element_not_found", hint }` — element isn't in any project file; likely runtime-injected (JS component, data-driven render).
- `{ error: "element_ambiguous", candidates, hint }` — multiple source elements match both structural hints and text content. Read the candidate ranges and write the wrapper manually around the correct one.

All three carry `fallback: "agent-driven"`. Follow **Handle fallback** below.

### 3. Load the action's reference

If `event.action` is `impeccable` (the default freeform action), use SKILL.md's shared laws plus the loaded register reference (`editorial.md` or `product.md`). Do not load a sub-command reference.

Any other `event.action` (`bolder`, `quieter`, `distill`, `polish`, `typeset`, `colorize`, `layout`, `adapt`, `animate`, `delight`, `overdrive`): Read `reference/<action>.md` before planning. Each sub-command encodes a specific discipline; skipping its reference produces generic output.

### 4. Plan three variants: identity first, then mode, then axes

The wrong frame for live mode is "show three different design directions." Live runs on an existing surface; the brand has already been chosen. The job is variation within identity, not selection between identities. Failure mode: three editorial-typographic variants on a brief that was not editorial. Bigger failure mode: three off-brand variants the user cannot accept because they do not look like their product.

Four phases. Do them in order.

#### Phase A: Extract the Identity

The existing surface has an identity already. Read it before planning anything. Sources, in priority order:

1. **DESIGN.md** if loaded: visual system fields such as palette, type pairing, motion, and components. This is authoritative.
2. **CSS custom properties** in the page's stylesheets, such as `:root { --color-...; --font-...; }`. These are de facto tokens.
3. **Computed styles** on the picked element and its parent: colors, fonts, spacing scales, corner radii.
4. **Sibling components** on the page: asymmetric or centered, dense or airy, bold or quiet, decorated or plain.

Write down what you see in one sentence. The sentence describes the surface that is actually on screen, not what the brand should become. Capture, in roughly this order:

- The dominant surface color and accent color by hex or token name.
- The type pairing, with actual font names loaded, primary first.
- The layout topology: stacked, side-by-side, grid, asymmetric, overlay.
- The surface treatment: corners, borders, shadows, and decoration density.
- The voice tone from the copy itself, not from aesthetic feel.

Be specific. "Modern" is not a color, "elegant" is not a type pairing, and "clean" is not a layout. If you cannot extract a real value for an axis, skip it rather than fabricate. The point is to record what is.

Do not include adjectives that name an aesthetic family, such as "editorial-leaning", "terminal-flavored", or "brutalist". Those are conclusions, not data. They belong to Phase C lane selection in departure mode, not to identity description.

This sentence is the **identity lock**. Every variant must be readable as the same brand if rendered side by side. Absence of DESIGN.md is never an excuse; extract from CSS and computed styles instead.

#### Phase B: Pick Mode

**Default mode** preserves the existing identity. Variants vary expression axes within it. This is the right mode for most live sessions. The user picked an element on a real product they are shipping; they expect variants of their surface, not three different brands' surfaces.

**Departure mode** rejects the existing identity and proposes alternatives consistent with PRODUCT.md voice. Trigger only when at least one is true:

- PRODUCT.md anti-references explicitly call out the current surface, such as "the current index.html is itself an example", "diffuse away from this", or "the page on screen is the failure". Generic anti-references do not trigger departure mode; only ones that point at this surface specifically do.
- The user's freeform prompt explicitly asks for departure, such as "rebuild this from scratch", "what if it were not editorial at all", or "show me something completely different".

If you are unsure, use default mode. The cost of being wrong about default is three on-brand variants with similar feel. The cost of being wrong about departure is three off-brand variants.

#### Phase C: Plan Three Variants

**Default mode.** Each variant commits to a different **primary axis** of difference while preserving the identity sentence:

1. **Hierarchy** — which element commands the eye?
2. **Layout topology** — stacked / side-by-side / grid / asymmetric / overlay
3. **Typographic system** — pairing logic, scale ratio, case/weight strategy within the available faces
4. **Color strategy** — which existing palette role carries the surface; use brand tokens, not new hues
5. **Density** — minimal / comfortable / dense
6. **Structural decomposition** — merge, split, progressive disclosure

Three variants means three different axes. The trio reads as the same brand at three angles. Do not introduce new fonts, new palette hues, or new aesthetic-family signals; those belong to departure mode.

**Departure mode.** Each variant anchors to a different **aesthetic lane**, drawn from non-monoculture options. Lanes are illustrative, not exhaustive:

- Tech-minimal (Stripe / Linear / Vercel restraint)
- Brutalist-utility (system fonts, raw HTML defaults, Craigslist energy)
- Terminal-native (actual code surface, syntax-highlighted UI as the design)
- Industrial-signage (dimensional type, arrow systems, ISO standards, wayfinding)
- Technical-drawing (isometric line art, callout numbers, blueprint blue, exploded-view diagrams)
- Drenched-saturated (Liquid Death / Mailchimp full-palette / single-hue commitment)
- Swiss-grid-rigorous (visible grid as voice, tight type, accumulated systems)

Avoid SKILL.md's **reflex-reject aesthetic lanes**. Do not trade one monoculture for another. Editorial-typographic is currently a reflex-reject lane; three variants that all read as "magazine cover" are the second-order training reflex.

#### Phase D: Squint Test

**Default mode squint.** Read each variant's identity sentence and compare it to the locked identity from Phase A. If any variant has drifted to a different palette, type voice, or visual rhetoric, it crossed into departure mode by accident; rework it. Then check that each variant commits to a different primary axis. Three "tighter density" variants is failure.

**Departure mode squint.** Two passes, family before sentence:

1. **Family pass.** Label each variant with one design-family word: editorial, brutalist, terminal, signage, drenched, swiss, technical-drawing, tech-minimal. If any two variants share a family label, rework. This pass is non-negotiable in departure mode.
2. **Sentence pass.** Write three one-sentence descriptions side by side. If two of them rhyme ("both feature big type" / "both are stacks of sections" / "both center the CTA"), rework the offender.

**When the primary axis is color or theme, forbid the trio from sharing theme plus dominant hue.** Two dark variants plus one more dark variant is not distinct. Aim for three color worlds, not three shades of the same.

**For action-specific invocations**, each variant must vary along the dimension the action names:

- `bolder` — amplify a different dimension per variant (scale / saturation / structural change). Not three "slightly bigger" variants.
- `quieter` — pull back a different dimension (color / ornament / spacing).
- `distill` — remove a different class of excess (visual noise / redundant content / nested structure).
- `polish` — target a different refinement axis (rhythm / hierarchy / micro-details like corner radii, focus states, optical kerning).
- `typeset` — different type pairing AND different scale ratio each. Not three riffs on one pairing.
- `colorize` — different hue family each (not shades of one hue). Vary chroma and contrast strategy.
- `layout` — different structural arrangement (stacked / side-by-side / grid / asymmetric). Not spacing tweaks.
- `adapt` — different target context per variant (mobile-first / tablet / desktop / print or low-data). Don't make three mobile layouts.
- `animate` — different motion vocabulary (cascade stagger / clip wipe / scale-and-focus / morph / parallax). Not three staggered fades.
- `delight` — different flavor of personality (unexpected micro-interaction / typographic surprise / illustrated accent / sonic-or-haptic moment / easter-egg interaction).
- `overdrive` — different convention broken (scale / structure / motion / input model / state transitions). Skip `overdrive.md`'s "propose and ask" step — live mode is non-interactive.

### 5. Apply the freeform prompt (if present)

`event.freeformPrompt` is the user's ceiling on direction. All variants must honor it while still exploring meaningfully different interpretations. The interpretations stay within whichever mode you picked in Phase B.

In **default mode**, the prompt narrows the axes you choose, not the identity. "Make it feel more confident" can become: variant 1 amplifies hierarchy, variant 2 commits the existing accent color, and variant 3 tightens density and removes decorative slack. Three different axes, same brand.

In **departure mode**, the prompt narrows the lanes you draw from, not the families. "Make it feel like a newspaper front page" is a departure prompt; honor it by choosing meaningfully different newspaper-adjacent lanes, such as broadsheet, tabloid, and trade journal, then run the family pass to confirm they do not collapse into one.

When the prompt and PRODUCT.md anti-references conflict, the anti-references win. They describe the brand's standing position; the prompt is one moment.

### 6. Write all variants in a single edit

Complete HTML replacement of the original element for each variant, not a CSS-only patch. Consider the element's context (computed styles, parent structure, CSS variables from `event.element`).

Write CSS + all variants in ONE edit at the `insertLine` reported by `wrap`. Colocate scoped CSS as a `<style>` tag inside the variant wrapper — `<style>` works anywhere in modern browsers and this ensures CSS and HTML arrive atomically (no FOUC).

```html
<!-- Variants: insert below this line -->
<style data-impeccable-css="SESSION_ID">
  @scope ([data-impeccable-variant="1"]) { ... }
  @scope ([data-impeccable-variant="2"]) { ... }
</style>
<div data-impeccable-variant="1">
  <!-- variant 1: full element replacement (single top-level element) -->
</div>
<div data-impeccable-variant="2" style="display: none">
  <!-- variant 2: full element replacement -->
</div>
<div data-impeccable-variant="3" style="display: none">
  <!-- variant 3: full element replacement -->
</div>
```

**Each variant div contains exactly one top-level element — the full replacement for the original.** Use the same tag as the original (e.g. `<section>` if the user picked a `<section>`). Loose siblings (heading + paragraph + div as direct children of the variant div) break the outline tracking and the accept flow, which both assume one child.

The first variant has no `display: none` (visible by default). All others do. If variants use only inline styles and no scoped CSS, omit the `<style>` tag entirely. Use `@scope` for CSS isolation (Chrome 118+ / Firefox 128+ / Safari 17.4+).

One edit, all variants — the browser's MutationObserver picks everything up in one pass.

**Author every `:scope` rule with a descendant combinator.** The `@scope` boundary is the variant wrapper `<div data-impeccable-variant="N">`, not the element you're designing. A bare `:scope { background: cream; }` styles the wrapper, not the inner replacement, so the cream lands on a `display: contents` shell while the actual element keeps page defaults. Always step in: `:scope > .card`, `:scope > section`, `:scope .hero-title`, etc.

**JSX / TSX target files.** Wrap `<style>` content in a template literal so the CSS `{` / `}` are not parsed as JSX expressions, and use `className=` / `style={{...}}` on every variant element. Keep `data-impeccable-*` attributes as plain strings:

```tsx
<style data-impeccable-css="SESSION_ID">{`
  @scope ([data-impeccable-variant="1"]) { ... }
  @scope ([data-impeccable-variant="2"]) { ... }
`}</style>
<div data-impeccable-variant="1">
  {/* variant 1 */}
</div>
<div data-impeccable-variant="2" style={{ display: 'none' }}>
  {/* variant 2 */}
</div>
```

The wrap script already gives JSX a single-rooted wrapper: a `<div data-impeccable-variants="...">` outer element with marker comments tucked inside. Drop the variants block above into the "Variants: insert below this line" comment and the source stays valid TSX.

### 7. Signal done

```bash
node {{scripts_path}}/live-poll.mjs --reply EVENT_ID done --file RELATIVE_PATH
```

`RELATIVE_PATH` is relative to project root (`public/index.html`, `src/App.tsx`, etc.) — the browser fetches source directly if the dev server lacks HMR.

Then run `live-poll.mjs` again immediately.

### Aborting an In-Flight Session

If wrap or generation fails after the browser has flipped to GENERATING, tell the browser so its bar resets to PICKING:

```bash
node {{scripts_path}}/live-poll.mjs --reply EVENT_ID error "Short reason"
```

Do not run `live-accept --discard` for this. That is a pure file mutator, the browser does not see it, and the bar gets stuck on the GENERATING dots until the user refreshes. `--discard` is only correct when the browser initiated the discard and the agent is just running source-side cleanup the browser already triggered.

## Handle fallback

When wrap returns `fallback: "agent-driven"`, the deterministic flow doesn't apply. Pick up here.

The goal is the same: give the user three variants to choose from AND persist the accepted one in a place the next build won't wipe. The difference is that you have to pick the right source file yourself.

### Step 1: Identify where the element actually lives

Use the error payload:

- `element_not_in_source` with `generatedMatch: "public/docs/foo.html"` — the served HTML is generated. Find the generator (grep for writers of that path, e.g. `scripts/build-sub-pages.js`, an Astro/Next template) and locate the template or partial that emits this element.
- `element_not_found` — the element is runtime-injected. Look for the component that renders it (React/Vue/Svelte), the JS that assembles it, or the data source that feeds it.
- `file_is_generated` with `file: "..."` — user pointed at a generated file explicitly. Same resolution as `element_not_in_source`.

Read the candidate source until you're confident where a change to the element would belong. If the change is purely visual, that source might be a shared stylesheet, not the template.

### Step 2: Show three variants in the DOM for preview

The browser bar is waiting for variants. Even without a wrapper in source, you still need to show something:

1. Manually write the wrapper scaffold into the **served** file (the one the browser actually loaded). Use the same structure `live-wrap.mjs` produces — `<!-- impeccable-variants-start ID --><div data-impeccable-variants="ID" data-impeccable-variant-count="3" style="display: contents">…</div><!-- end -->`.
2. Insert your three variant divs inside it, same shape as the deterministic path.
3. Signal done with `--reply EVENT_ID done --file <served file>`. The browser's no-HMR fallback will fetch and inject.

This served-file edit is **temporary** — next regen wipes it, and that's fine. The real work happens on accept.

### Step 3: On accept, write to true source

When the accept event arrives (`_acceptResult.handled` will usually be `false` here because accept also refuses to persist into generated files — see Handle accept for the carbonize branch), extract the accepted variant's content and write it into the source you identified in Step 1:

- Structural change → edit the template / component source.
- Visual-only change → add or update rules in the appropriate stylesheet; remove the inline `<style>` scope.
- Data-driven → update the data source or the render logic.

Then remove the temporary wrapper from the served file if it's still there.

### Step 4: On discard, clean up the served file

Remove the wrapper you inserted in Step 2. Nothing else to do.

## Handle `accept`

Event: `{id, variantId, _acceptResult}`. The poll script already ran `live-accept.mjs` to handle the file operation deterministically; the browser DOM is already updated.

- `_acceptResult.handled: true` and `carbonize: false` — nothing to do. Poll again.
- `_acceptResult.handled: true` and `carbonize: true` — **post-accept cleanup is required before the next poll.** See the "Required after accept (carbonize)" section below. The `event._acceptResult.todo` field and a stderr banner both list the steps explicitly; neither is decorative.
- `_acceptResult.handled: false, mode: "fallback"` — the session lived in a generated file and the script refused to persist there. You've already written the accepted variant into true source during Handle fallback Step 3; just clean up the temporary wrapper in the served file if any, and poll again.
- `_acceptResult.handled: false` without `mode` — manual cleanup: read file, find markers, edit.

### Required after accept (carbonize)

When `_acceptResult.carbonize === true`, the accepted variant was stitched into source with helper markers and inline CSS so the browser can render it immediately with no visual gap. That stitch-in is **temporary**. The agent must rewrite it into permanent form before doing anything else. Skipping this leaves dead `@scope` rules for unaccepted variants, a pointless `data-impeccable-variant` wrapper, and `impeccable-carbonize-start/end` comment noise in the source file — all of which accumulate across sessions.

Do these five steps in the current thread, synchronously, before the next poll. Do not poll again until the file is clean.

1. **Locate the carbonize block** in the source file (`_acceptResult.file`). It is bracketed by `<!-- impeccable-carbonize-start SESSION_ID -->` and `<!-- impeccable-carbonize-end SESSION_ID -->` and contains a `<style data-impeccable-css="SESSION_ID">` element.
2. **Move the CSS rules** into the project's real stylesheet. Which stylesheet depends on the project (e.g. `public/css/workflow.css` for this repo, or the component's co-located CSS file for a Vite/Next project — pick whichever already owns styling for the surrounding element).
3. **Rewrite `@scope ([data-impeccable-variant="N"])` selectors** to target real, semantic classes on the accepted HTML. Example: `@scope ([data-impeccable-variant="2"]) { .v2-label { … } }` becomes `.why-visual--v2 .v2-label { … }` if the accepted element already carries `.why-visual--v2`, or pick/add a suitable class if it doesn't.
4. **Unwrap the accepted content.** Delete the `<div data-impeccable-variant="N" style="display: contents">` that wraps it.
5. **Delete the inline `<style>` block and both `<!-- impeccable-carbonize-start/end -->` markers.** Also drop any `@scope` rules for variants other than the accepted one — those are dead code now.

Then poll again.

The current thread is responsible for the rewrite and for verifying the five steps are complete before issuing the next poll. In practice, inline is usually faster and less error-prone.

## Handle `discard`

Event: `{id, _acceptResult}`. The poll script already restored the original and removed all variant markers. Nothing to do. Poll again.

## Handle `prefetch`

Event: `{pageUrl}`. The browser fires this the first time the user selects an element on a given route, as a latency shortcut — it signals the user is likely about to Go on a page you haven't read yet.

Resolve `pageUrl` to the underlying file:

- Root `/` → the `pageFile` returned by `live.mjs` (usually `public/index.html` or equivalent).
- Sub-routes (e.g. `/docs`, `/docs/live`) → the generated or source file for that route. Use your knowledge of the project layout (multi-page static sites often resolve `/foo` → `public/foo/index.html`; SPAs may map all routes to a single entry).

Read the file into context, then poll again. No `--reply` — this is speculative pre-work; Go will come later. If you can't confidently resolve the route to a file, skip and poll again.

Dedupe is the browser's job (one prefetch per unique pathname per session) — trust it. If the same file shows up twice from different routes mapping to the same file, the second Read is cached anyway.

## Exit

The user can stop live mode by:
- Saying "stop live mode" / "exit live" in chat
- Closing the browser tab (SSE drops, poll returns `exit` after 8s)
- The browser's exit button

When the poll returns `exit`, proceed to cleanup. If the poll is still running as a background task, kill it first.

## Cleanup

```bash
node {{scripts_path}}/live-server.mjs stop
```

Stops the HTTP server and runs `live-inject.mjs --remove` to strip `localhost:…/live.js` from the HTML entry. To stop the server but keep the inject tag (for a quick restart), use `stop --keep-inject`. `config.json` persists for future sessions.

Then:
- Remove any leftover variant wrappers (search for `impeccable-variants-start` markers).
- Remove any leftover carbonize blocks (search for `impeccable-carbonize-start` markers).

## First-time setup (config missing or invalid)

If `live.mjs` outputs `{ ok: false, error: "config_missing" | "config_invalid", path }`, write `config.json` at the reported path.

Schema:

```json
{
  "files": ["<path-or-glob>", "<path-or-glob>", ...],
  "exclude": ["<optional-glob>", ...],
  "insertBefore": "</body>",
  "commentSyntax": "html",
  "cspChecked": true
}
```

`files` is the inject target: **the HTML files the browser actually loads**, not necessarily source. Each entry is either a literal path (`"public/index.html"`) or a glob pattern (`"public/**/*.html"`). Tracked or generated does not matter here; wrap has its own generated-file guard and routes accepts through the fallback flow.

`exclude` is optional. Use it for files a `files` glob would otherwise include but Live should skip: email templates, demo fixtures, generated examples, or any HTML that is not a live page.

`cspChecked` tracks whether the CSP detection step below has already run. Absent on first setup; set to `true` after CSP is checked (whether patched, declined, or not needed).

Hard-excluded paths cannot be overridden. `**/node_modules/**` and `**/.git/**` never match, even if the user includes them. Those are vendor/metadata directories and should never receive the tracking script.

Glob syntax: `**` matches any number of path segments including zero, `*` matches any characters except `/`, and `?` matches one character except `/`. Paths are always relative to the project root with forward slashes.

| Framework | `files` | `insertBefore` | `commentSyntax` |
|-----------|---------|----------------|-----------------|
| SPA with single shell (Vite / React / Plain HTML) | `["index.html"]` | `</body>` | `html` |
| Next.js (App Router) | `["app/layout.tsx"]` | `</body>` | `jsx` |
| Next.js (Pages) | `["pages/_document.tsx"]` | `</body>` | `jsx` |
| Nuxt | `["app.vue"]` | `</body>` | `html` |
| Svelte / SvelteKit | `["src/app.html"]` | `</body>` | `html` |
| Astro | `[" <root layout .astro>"]` | `</body>` | `html` |
| Multi-page (separate HTML per route) | `["public/**/*.html"]`, a glob covering the served directory | `</body>` | `html` |

Pick an anchor that exists in every file (`</body>` almost always works). Use `insertAfter` if the anchor should match **after** a specific line.

For multi-page sites, prefer a glob over a literal file list. New pages added later are picked up automatically on the next `live-inject.mjs` run.

For multi-page sites whose pages are *rebuilt* by a generator (Astro, static-site generators, custom scripts like `build-sub-pages.js`), the inject survives only until the next regeneration. Re-run `live.mjs` after each build. Accept is unaffected — it writes to true source via the fallback flow.

### Config drift warning

On every `live.mjs` boot, after inject, the project is scanned for HTML files under common page-source roots (`public/`, `src/`, `app/`, `pages/`). If any exist that are not covered by the resolved `files` list, the output includes `configDrift`:

```json
{
  "ok": true,
  "pageFiles": ["public/index.html"],
  "configDrift": {
    "orphans": ["public/docs/new-command.html"],
    "orphanCount": 1,
    "hint": "1 HTML file(s) exist but aren't in config.files. Consider adding them, or use a glob pattern like \"public/**/*.html\"."
  }
}
```

When `configDrift` is present, surface it to the user once before entering the poll loop:

> Noticed N HTML file(s) in the project that are not in `config.files`:
>
> - `public/new-section/index.html`
> - `public/docs/new-command.html`
>
> Add them, or switch `files` to a glob like `["public/**/*.html"]` and let it track new pages automatically?

Do not auto-update config. Let the user decide. `configDrift` is `null` when there is no drift.

### CSP detection (first-time only)

If `config.cspChecked === true`, skip this entire section. You already asked this user once; the answer sticks.

Otherwise, run the detection helper:

```bash
node {{scripts_path}}/detect-csp.mjs
```

Output: `{ shape, signals }` where `shape` is one of `append-arrays`, `append-string`, `middleware`, `meta-tag`, or `null`. The shape is named by *patch mechanism*, so one template covers many frameworks.

- **`null`** — no CSP; skip to writing `config.json` with `cspChecked: true`.
- **`append-arrays`** — CSP defined as structured directive arrays. Auto-patchable. See *append-arrays* below. Covers:
  - Monorepo helpers with `additionalScriptSrc` / `additionalConnectSrc` options (Next.js + shared config package)
  - SvelteKit `kit.csp.directives`
  - Nuxt `nuxt-security` module's `contentSecurityPolicy`
- **`append-string`** — CSP written as a literal value string. Auto-patchable. See *append-string* below. Covers:
  - Inline `next.config.*` `headers()` with a CSP literal
  - Nuxt `routeRules` / `nitro.routeRules` headers
- **`middleware`** or **`meta-tag`** — rarer. Detected but not auto-patched in v1. Show the user the detected files and ask them to add `http://localhost:8400` to `script-src` and `connect-src` manually, then mark `cspChecked: true` and proceed.

#### Consent prompt template

Use this phrasing so the experience is consistent across agents:

> **CSP patch needed.** I detected a Content Security Policy in your project that blocks `http://localhost:8400` — the live picker won't load without an allowance. Here's the change I'd make:
>
> ```diff
> [file: <patchTarget>]
> [exact diff, 2–5 lines]
> ```
>
> It's guarded by `NODE_ENV === "development"` so the extra entry only appears in dev and never reaches production. You can remove it any time by reverting this file. Apply? [y/n]

On "no": skip the patch, mention live won't work until the user adds the allowance manually, still write `cspChecked: true` (the question's been asked).

On "yes": apply the Shape-specific patch below, then write `cspChecked: true`.

#### append-arrays

CSP expressed as structured directive arrays. Patch mechanism: declare a dev-only array, spread it into the script-src and connect-src arrays.

**Declare near the top of the file that holds the CSP arrays:**

```ts
// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? ["http://localhost:8400"] : [];
```

**Append `...__impeccableLiveDev` to the script-src and connect-src directive arrays.** Per-framework specifics:

- **Next.js + monorepo helper** — edit the *app's* `next.config.*` (not the shared helper), appending to `additionalScriptSrc` and `additionalConnectSrc` passed into `createBaseNextConfig` (or equivalent). Keeps the shared package clean.
- **SvelteKit** — edit `svelte.config.js`, appending to `kit.csp.directives['script-src']` and `kit.csp.directives['connect-src']`.
- **Nuxt + nuxt-security** — edit `nuxt.config.*`, appending to `security.headers.contentSecurityPolicy['script-src']` and `['connect-src']`.

Reference outputs:
- `tests/framework-fixtures/nextjs-turborepo/expected-after-patch.ts` (Next.js)
- `tests/framework-fixtures/sveltekit-csp/expected-after-patch.js` (SvelteKit)

Idempotency: if `__impeccableLiveDev` already exists in the file, the patch is already applied; skip asking and just mark `cspChecked: true`.

#### append-string

CSP built as a literal value string. Two-point patch: declare a dev-only string near the top, interpolate it into the CSP at the `script-src` and `connect-src` directives.

```ts
// Dev-only allowance so impeccable live mode can load.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";
```

Then in the CSP value string:
- `script-src 'self' 'unsafe-inline'` → `` `script-src 'self' 'unsafe-inline'${__impeccableLiveDev}` ``
- `connect-src 'self'` → `` `connect-src 'self'${__impeccableLiveDev}` ``

(Leading space on the dev string so it concatenates cleanly into the existing value. Convert the literal CSP directives into template strings as part of the edit if they aren't already.)

Per-framework specifics:
- **Next.js inline `headers()`** — edit `next.config.*`, splicing the variable into the CSP value.
- **Nuxt `routeRules`** — edit `nuxt.config.*`, splicing into the CSP in `routeRules['/**'].headers['Content-Security-Policy']`.

Reference outputs:
- `tests/framework-fixtures/nextjs-inline-csp/expected-after-patch.js` (Next.js)
- `tests/framework-fixtures/nuxt-csp/expected-after-patch.ts` (Nuxt)

### Troubleshooting

If a user says "no" to the CSP patch at setup time and later complains that live doesn't work: their dev CSP blocks `http://localhost:8400`. Fix: delete `cspChecked` from `config.json` and re-run `live.mjs` — setup will ask again.

Then re-run `live.mjs`.
