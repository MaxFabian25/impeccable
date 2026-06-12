# STYLE.md

Editorial brief for Impeccable for Codex. Read this before writing or editing
user-facing copy: the homepage, skill pages, tutorials, READMEs, and public
site data.

The bar: for every paragraph, point to the sentence that makes it specifically
Impeccable. If you cannot, the paragraph is generic by default.

## Principles

1. Open with the reader's wrong belief, your strongest claim, or the example.
2. Take a position someone could disagree with.
3. Name names. Use numbers. Prefer file paths, command names, rule counts, and
   concrete mechanisms over abstract claims.
4. Let verbs lead. Cut nominalizations when a direct verb works.
5. Vary sentence length on purpose. Smooth uniform rhythm is an AI tell.
6. Use bullets for parallel options. Use paragraphs for argument.
7. Plain words first. Technical terms only when something rests on them.
8. Respect the reader's competence. Skip tutorial voice unless the page is a
   tutorial.
9. Concrete over comprehensive. Leave things out when coverage weakens the
   point.
10. Close by handing off the next move, or just stop.

## Denylist

The build's `validateProse` step in `scripts/build.js` fails on these patterns
in user-facing copy. Add a rule here when adding one to the validator.

### Stolen-Engineer Diction

| Banned | Why | Use instead |
|---|---|---|
| `load-bearing` | Usually vague. | Name what the thing actually does. |
| `highest-leverage` | Vague claim of impact. | Say what specifically pays off. |
| `biggest unlock` | Marketing-speak. | Describe the actual change. |

### Internal Jargon Leaking Out

| Banned | Why | Use instead |
|---|---|---|
| `reflex defaults` | Eval-team shorthand. | "first guesses", "instincts", or the exact behavior. |
| `collapses into monoculture` | Research-note voice. | Describe what went wrong, such as "every run picked the same fonts". |
| `data-driven` | Empty unless the data is named. | Cite the evidence. |

### Marketing Voice

| Banned | Why | Use instead |
|---|---|---|
| `seamless`, `seamlessly` | Hollow positive. | Say what works without friction. |
| `robust`, `robustness` | Hollow positive. | Cite the failure mode handled. |
| `elevate`, `elevates` | Marketing verb. | Use the specific verb: improve, raise, sharpen. |
| `empower`, `empowers` | Marketing verb. | "let you" or "make possible". |
| `underscore`, `underscores` | AI tell. | "show" or "make clear". |
| `pivotal` | Hollow positive. | "central", "key", or a concrete role. |
| `tapestry` | AI scenery noun. | Cut it. |

### Verbs

| Banned | Why | Use instead |
|---|---|---|
| `delve`, `delves`, `delved`, `delving` | One of the clearest AI tells. | "look at", "explore", or delete the setup. |

### Throat-Clearing

| Banned | Why | Use instead |
|---|---|---|
| `in today's ...` | Generic opener. | Start at the actual point. |
| `gone are the days` | Cliche opener. | Make the point directly. |
| `whether you're ...` | Audience-pandering. | Pick one reader. |
| `let's dive in` | Throat-clearing. | Just start. |

### Closers And Transitions

| Banned | Why | Use instead |
|---|---|---|
| `in summary`, `in conclusion` | Restates what was just said. | End on the strongest sentence. |
| `moreover`, `furthermore` | Metronome transition crutch. | Drop it, use "also", or restructure. |

### Punctuation

| Banned | Why | Use instead |
|---|---|---|
| U+2014 em dash, `&mdash;`, `&#8212;`, `&#x2014;` | Avoids choosing the relationship between clauses. | Comma, colon, semicolon, period, or parentheses. |
| ` -- ` | Failed em-dash cleanup. | Real punctuation. |

## Patterns The Validator Cannot Catch

- Negation pivot: "not just X, but Y", "less about X, more about Y".
- Triadic everything: every list has exactly three items, every adjective stack
  has exactly three parts.
- Five-paragraph essay shape on every page.
- Uniform paragraph length.
- Synthetic balance when one recommendation is clearly better.
- Hollow confidence: "powerful" without a mechanism or number.
- Interchangeable copy: swap "Impeccable" for another product name. If nothing
  becomes false, the copy is generic.

## When In Doubt

Read the paragraph aloud. If you stumble, rewrite. If a sentence describes
nothing specific to this product, cut it.
