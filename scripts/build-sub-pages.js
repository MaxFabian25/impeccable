/**
 * Generate static HTML files for /skills, /anti-patterns, /tutorials,
 * /visual-mode, and /designing.
 *
 * Called from both scripts/build.js (before buildStaticSite) and
 * server/index.js (at module load), so dev and prod share the same
 * code path and output shape.
 *
 * Output lives under public/skills/, public/anti-patterns/,
 * public/tutorials/, public/visual-mode/, and public/designing/.
 * Bun's HTML loader picks them up the same way it picks up the
 * hand-authored pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  buildSubPageData,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  LAYER_LABELS,
  LAYER_DESCRIPTIONS,
  GALLERY_ITEMS,
} from './lib/sub-pages-data.js';
import { renderMarkdown, slugify } from './lib/render-markdown.js';
import { renderPage } from './lib/render-page.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the before/after split-compare demo block for a skill.
 * Returns '' when the skill has no demo data (e.g. $shape).
 */
function renderSkillDemo(skill) {
  if (!skill.demo) return '';
  const { before, after, caption } = skill.demo;
  return `
<section class="skill-demo" aria-label="Before and after demo">
  <div class="split-comparison" data-demo="skill-${skill.id}">
    <p class="skill-demo-eyebrow">Drag or hover to compare</p>
    <div class="split-container">
      <div class="split-before">
        <div class="split-content">${before}</div>
      </div>
      <div class="split-after">
        <div class="split-content">${after || before}</div>
      </div>
      <div class="split-divider"></div>
    </div>
    <div class="split-labels">
      <span class="split-label-item" data-point="before">Before</span>
      ${caption ? `<p class="skill-demo-caption">${escapeHtml(caption)}</p>` : '<span></span>'}
      <span class="split-label-item" data-point="after">After</span>
    </div>
  </div>
</section>`;
}

/**
 * Render one skill detail page HTML body (without the site shell).
 */
function renderSkillDetail(skill, knownSkillIds) {
  const bodyHtml = renderMarkdown(skill.body, {
    knownSkillIds,
    currentSkillId: skill.id,
  });

  const editorialHtml = skill.editorial
    ? renderMarkdown(skill.editorial.body, { knownSkillIds, currentSkillId: skill.id })
    : '';

  const demoHtml = renderSkillDemo(skill);

  const tagline = skill.editorial?.frontmatter?.tagline || skill.description;
  const categoryLabel = CATEGORY_LABELS[skill.category] || skill.category;

  // Reference files as collapsible <details> blocks
  let referencesHtml = '';
  if (skill.references && skill.references.length > 0) {
    const refs = skill.references
      .map((ref) => {
        const slug = slugify(ref.name);
        const refBody = renderMarkdown(ref.content, {
          knownSkillIds,
          currentSkillId: skill.id,
        });
        const title = ref.name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return `
<details class="skill-reference" id="reference-${slug}">
  <summary><span class="skill-reference-label">Reference</span><span class="skill-reference-title">${escapeHtml(title)}</span></summary>
  <div class="prose skill-reference-body">
${refBody}
  </div>
</details>`;
      })
      .join('\n');
    referencesHtml = `
<section class="skill-references" aria-label="Reference material">
  <h2 class="skill-references-heading">Deeper reference</h2>
  ${refs}
</section>`;
  }

  const metaStrip = `
<div class="skill-meta-strip">
  <span class="skill-meta-chip skill-meta-category" data-category="${skill.category}">${escapeHtml(categoryLabel)}</span>
  <span class="skill-meta-chip">User-invocable</span>
  ${skill.argumentHint ? `<span class="skill-meta-chip skill-meta-args">${escapeHtml(skill.argumentHint)}</span>` : ''}
</div>`;

  const hasDemo = demoHtml.trim().length > 0;

  return `
<article class="skill-detail">
  <div class="skill-detail-hero${hasDemo ? ' skill-detail-hero--has-demo' : ''}">
    <header class="skill-detail-header">
      <p class="skill-detail-eyebrow"><a href="/skills">Skills</a> / ${escapeHtml(categoryLabel)}</p>
      <h1 class="skill-detail-title"><span class="skill-detail-title-slash">$</span>${escapeHtml(skill.id)}</h1>
      <p class="skill-detail-tagline">${escapeHtml(tagline)}</p>
      ${metaStrip}
    </header>
    ${demoHtml}
  </div>

  ${editorialHtml ? `<section class="skill-detail-editorial prose">\n${editorialHtml}\n</section>` : ''}

  <section class="skill-source-card">
    <header class="skill-source-card-header">
      <span class="skill-source-card-label">SKILL.md</span>
      <span class="skill-source-card-subtitle">The canonical skill definition Codex loads.</span>
    </header>
    <div class="skill-source-card-body prose">
${bodyHtml}
    </div>
  </section>

  ${referencesHtml}
</article>
`;
}

/**
 * Render the unified Docs sidebar used across /skills and /tutorials.
 * Shows every skill grouped by category, then tutorials as a final
 * group. Pass the current page identifier so we can mark it:
 *
 *   { kind: 'skill', id: 'polish' }
 *   { kind: 'tutorial', slug: 'getting-started' }
 *   null (no current page)
 */
function renderDocsSidebar(skillsByCategory, tutorials, current = null) {
  // Label the toggle button with the current page so mobile users know
  // where they are at a glance, then open the menu to switch.
  let currentLabel = 'Docs menu';
  if (current?.kind === 'skill') {
    currentLabel = `$${current.id}`;
  } else if (current?.kind === 'tutorial') {
    const t = tutorials.find((x) => x.slug === current.slug);
    if (t) currentLabel = t.title;
  }

  let html = `
<aside class="skills-sidebar" aria-label="Documentation">
  <button class="skills-sidebar-toggle" type="button" aria-expanded="false" aria-controls="skills-sidebar-inner">
    <span class="skills-sidebar-toggle-label">${escapeHtml(currentLabel)}</span>
    <svg class="skills-sidebar-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>
  <div class="skills-sidebar-inner" id="skills-sidebar-inner">
    <p class="skills-sidebar-label">Docs</p>
`;

  // Tutorials first: walk-throughs are the on-ramp, they go at the top.
  if (tutorials && tutorials.length > 0) {
    html += `
    <div class="skills-sidebar-group" data-category="tutorials">
      <p class="skills-sidebar-group-title">Tutorials</p>
      <ul class="skills-sidebar-list">
${tutorials
  .map((t) => {
    const isCurrent = current?.kind === 'tutorial' && current.slug === t.slug;
    const attr = isCurrent ? ' aria-current="page"' : '';
    return `        <li><a href="/tutorials/${t.slug}"${attr}>${escapeHtml(t.title)}</a></li>`;
  })
  .join('\n')}
      </ul>
    </div>
    <hr class="skills-sidebar-divider">
`;
  }

  // Sub-command links that appear as indented entries after their parent skill.
  const SUB_COMMANDS = {
    impeccable: [
      { id: 'impeccable-craft', label: '$impeccable craft', href: '/skills/impeccable#craft' },
      { id: 'impeccable-teach', label: '$impeccable teach', href: '/skills/impeccable#teach' },
      { id: 'impeccable-extract', label: '$impeccable extract', href: '/skills/impeccable#extract' },
    ],
  };

  // Then the skills, grouped by category.
  for (const category of CATEGORY_ORDER) {
    const list = skillsByCategory[category] || [];
    if (list.length === 0) continue;
    html += `
    <div class="skills-sidebar-group" data-category="${category}">
      <p class="skills-sidebar-group-title">${escapeHtml(CATEGORY_LABELS[category])}</p>
      <ul class="skills-sidebar-list">
${list
  .flatMap((s) => {
    const isCurrent = current?.kind === 'skill' && current.id === s.id;
    const attr = isCurrent ? ' aria-current="page"' : '';
    const items = [`        <li><a href="/skills/${s.id}"${attr}>$${escapeHtml(s.id)}</a></li>`];
    const subs = SUB_COMMANDS[s.id];
    if (subs) {
      for (const sub of subs) {
        items.push(`        <li class="skills-sidebar-sub"><a href="${sub.href}">${escapeHtml(sub.label)}</a></li>`);
      }
    }
    return items;
  })
  .join('\n')}
      </ul>
    </div>
`;
  }

  html += `
  </div>
</aside>`;
  return html;
}

/**
 * Render the /skills overview main column content (not the sidebar).
 * This is the orientation piece: what skills are, how to pick one,
 * the six categories explained with inline cross-links to detail pages.
 */
function renderSkillsOverviewMain(skillsByCategory) {
  const totalSkills = Object.values(skillsByCategory).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  let categoriesHtml = '';
  for (const category of CATEGORY_ORDER) {
    const list = skillsByCategory[category] || [];
    if (list.length === 0) continue;

    const skillChips = list
      .map(
        (s) =>
          `<a class="skills-overview-chip" href="/skills/${s.id}">$${escapeHtml(s.id)}</a>`,
      )
      .join('');

    categoriesHtml += `
    <section class="skills-overview-category" data-category="${category}" id="category-${category}">
      <div class="skills-overview-category-meta">
        <h2 class="skills-overview-category-title">${escapeHtml(CATEGORY_LABELS[category])}</h2>
        <p class="skills-overview-category-count">${list.length} ${list.length === 1 ? 'skill' : 'skills'}</p>
      </div>
      <p class="skills-overview-category-desc">${escapeHtml(CATEGORY_DESCRIPTIONS[category])}</p>
      <div class="skills-overview-chips">
${skillChips}
      </div>
    </section>
`;
  }

  return `
<div class="skills-overview-content">
  <header class="skills-overview-header">
    <p class="sub-page-eyebrow">${totalSkills} commands</p>
    <h1 class="sub-page-title">Skills</h1>
    <p class="sub-page-lede">One skill, <a href="/skills/impeccable">$impeccable</a>, teaches your AI design. Nineteen commands steer the result. Each command does one job with an opinion about what good looks like.</p>
  </header>

  <section class="skills-overview-howto">
    <h2 class="skills-overview-howto-title">How to pick one</h2>
    <p>Skills are named after the intent you bring to them. Reviewing something? <a href="/skills/critique">$critique</a> or <a href="/skills/audit">$audit</a>. Fixing type? <a href="/skills/typeset">$typeset</a>. Last-mile pass before shipping? <a href="/skills/polish">$polish</a>. The categories below group skills by the job.</p>
  </section>

  <div class="skills-overview-categories">
${categoriesHtml}
  </div>
</div>`;
}

/**
 * Wrap sidebar + main content in the docs-browser layout shell.
 */
function wrapInDocsLayout(sidebarHtml, mainHtml) {
  return `
<div class="skills-layout">
  ${sidebarHtml}
  <div class="skills-main">
${mainHtml}
  </div>
</div>`;
}

/**
 * Group anti-pattern rules by skill section.
 * Rules without a skillSection fall into a 'General quality' bucket.
 */
function groupRulesBySection(rules) {
  // Canonical ordering. Additional sections referenced by rules (e.g.
  // 'Interaction', 'Responsive' from LLM-only entries) are appended to
  // the end, before 'General quality', so every rule renders.
  const primaryOrder = [
    'Visual Details',
    'Typography',
    'Color & Contrast',
    'Layout & Space',
    'Motion',
    'Interaction',
    'Responsive',
  ];
  const bySection = {};
  for (const name of primaryOrder) bySection[name] = [];
  bySection['General quality'] = [];

  for (const rule of rules) {
    const section = rule.skillSection || 'General quality';
    if (!bySection[section]) bySection[section] = [];
    bySection[section].push(rule);
  }

  // Sort each bucket: slop first (they're the named tells), then quality.
  for (const name of Object.keys(bySection)) {
    bySection[name].sort((a, b) => {
      if (a.category !== b.category) return a.category === 'slop' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Final render order: primary sections first, then any extras that
  // rules introduced, then General quality last.
  const order = [...primaryOrder];
  for (const name of Object.keys(bySection)) {
    if (!order.includes(name) && name !== 'General quality') {
      order.push(name);
    }
  }
  order.push('General quality');

  return { order, bySection };
}

/**
 * Render the anti-patterns sidebar: a table of contents of rule sections
 * with per-section rule counts. Every entry anchor-jumps to the section
 * in the main column.
 */
function renderAntiPatternsSidebar(grouped) {
  const entries = grouped.order
    .filter((section) => grouped.bySection[section]?.length > 0)
    .map((section) => {
      const slug = slugify(section);
      const count = grouped.bySection[section].length;
      return `        <li><a href="#section-${slug}"><span>${escapeHtml(section)}</span><span class="anti-patterns-sidebar-count">${count}</span></a></li>`;
    })
    .join('\n');

  return `
<aside class="skills-sidebar anti-patterns-sidebar" aria-label="Anti-pattern sections">
  <button class="skills-sidebar-toggle" type="button" aria-expanded="false" aria-controls="anti-patterns-sidebar-inner">
    <span class="skills-sidebar-toggle-label">Sections</span>
    <svg class="skills-sidebar-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>
  <div class="skills-sidebar-inner" id="anti-patterns-sidebar-inner">
    <p class="skills-sidebar-label">Sections</p>
    <div class="skills-sidebar-group">
      <ul class="skills-sidebar-list anti-patterns-sidebar-list">
${entries}
      </ul>
    </div>
  </div>
</aside>`;
}

/**
 * Render one rule card inside the anti-patterns main column.
 */
function renderRuleCard(rule) {
  const categoryLabel = rule.category === 'slop' ? 'AI slop' : 'Quality';
  const layer = rule.layer || 'cli';
  const layerLabel = LAYER_LABELS[layer] || layer;
  const layerTitle = LAYER_DESCRIPTIONS[layer] || '';
  const skillLink = rule.skillSection
    ? `<a class="rule-card-skill-link" href="/skills/impeccable#${slugify(rule.skillSection)}">See in $impeccable</a>`
    : '';
  const visual = rule.visual
    ? `<div class="rule-card-visual" aria-hidden="true"><div class="rule-card-visual-inner">${rule.visual}</div></div>`
    : '';
  return `
    <article class="rule-card" id="rule-${rule.id}" data-layer="${layer}">
      ${visual}
      <div class="rule-card-body">
        <div class="rule-card-head">
          <span class="rule-card-category" data-category="${rule.category}">${categoryLabel}</span>
          <span class="rule-card-layer" data-layer="${layer}" title="${escapeAttr(layerTitle)}">${escapeHtml(layerLabel)}</span>
        </div>
        <h3 class="rule-card-name">${escapeHtml(rule.name)}</h3>
        <p class="rule-card-desc">${escapeHtml(rule.description)}</p>
        ${skillLink}
      </div>
    </article>`;
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

/**
 * Render the /tutorials index main content.
 */
function renderTutorialsIndexMain(tutorials) {
  const cards = tutorials
    .map(
      (t) => `
    <a class="tutorial-card" href="/tutorials/${t.slug}">
      <span class="tutorial-card-number">${String(t.order).padStart(2, '0')}</span>
      <div class="tutorial-card-body">
        <h2 class="tutorial-card-title">${escapeHtml(t.title)}</h2>
        <p class="tutorial-card-tagline">${escapeHtml(t.tagline || t.description)}</p>
      </div>
      <span class="tutorial-card-arrow">→</span>
    </a>`,
    )
    .join('\n');

  return `
<div class="tutorials-content">
  <header class="sub-page-header">
    <p class="sub-page-eyebrow">${tutorials.length} walk-throughs</p>
    <h1 class="sub-page-title">Tutorials</h1>
    <p class="sub-page-lede">Short, opinionated walk-throughs of the highest-leverage workflows. Each one takes around ten minutes and ends with something working in your project.</p>
  </header>

  <div class="tutorial-cards">
${cards}
  </div>
</div>`;
}

/**
 * Render the /visual-mode page main content.
 *
 * Single-column layout, no sidebar. Editorial header, live iframe embed
 * of the detector running on a synthetic slop page, three-card section
 * explaining the invocation methods, then a grid of real specimens the
 * user can click into to see the overlay on a different page.
 */
function renderVisualModeMain() {
  const specimenCards = GALLERY_ITEMS.map(
    (item) => `
      <a class="gallery-card" href="/antipattern-examples/${item.id}.html">
        <div class="gallery-card-thumb">
          <img src="../antipattern-images/${item.id}.png" alt="${escapeAttr(item.title)} specimen" loading="lazy" width="540" height="540">
        </div>
        <div class="gallery-card-body">
          <h3 class="gallery-card-title">${escapeHtml(item.title)}</h3>
          <p class="gallery-card-desc">${escapeHtml(item.desc)}</p>
        </div>
      </a>`,
  ).join('\n');

  return `
<div class="visual-mode-page">
  <header class="visual-mode-page-header">
    <p class="sub-page-eyebrow">Live detection overlay</p>
    <h1 class="sub-page-title">Visual Mode</h1>
    <p class="sub-page-lede">See every anti-pattern flagged directly on the page. No screenshots, no JSON to map back to line numbers. The overlay draws an outline and a label on every element the detector catches, so you fix them in place.</p>
  </header>

  <section class="visual-mode-demo-wrap" aria-label="Visual Mode demo">
    <div class="visual-mode-preview">
      <div class="visual-mode-preview-header">
        <span class="visual-mode-preview-dot red"></span>
        <span class="visual-mode-preview-dot yellow"></span>
        <span class="visual-mode-preview-dot green"></span>
        <span class="visual-mode-preview-title">Live on a synthetic slop page</span>
      </div>
      <iframe src="/antipattern-examples/visual-mode-demo.html" class="visual-mode-frame" loading="lazy" title="Impeccable overlay running on a demo page"></iframe>
    </div>
    <p class="visual-mode-demo-caption">Hover or tap any outlined element to see which rule fired.</p>
  </section>

  <section class="visual-mode-methods" aria-label="Where to run Visual Mode">
    <h2 class="visual-mode-methods-title">Three ways to run it</h2>
    <div class="visual-mode-methods-grid">
      <article class="visual-mode-method">
        <p class="visual-mode-method-label">Inside $critique</p>
        <h3 class="visual-mode-method-name"><a href="/skills/critique">$critique</a></h3>
        <p class="visual-mode-method-desc">The design review skill opens the overlay automatically during its browser assessment pass. You get the deterministic findings highlighted in place while the LLM runs its separate heuristic review.</p>
      </article>
      <article class="visual-mode-method">
        <p class="visual-mode-method-label">Standalone CLI</p>
        <h3 class="visual-mode-method-name"><code>npx impeccable live</code></h3>
        <p class="visual-mode-method-desc">Starts a local server that serves the detector script. Inject it into any page via a <code>&lt;script&gt;</code> tag to see the overlay. Works on your own dev server, a staging URL, or anyone's live page.</p>
      </article>
      <article class="visual-mode-method">
        <p class="visual-mode-method-label">Easiest</p>
        <h3 class="visual-mode-method-name">Chrome extension</h3>
        <p class="visual-mode-method-desc">One-click activation on any tab. <a href="https://chromewebstore.google.com/detail/impeccable/bdkgmiklpdmaojlpflclinlofgjfpabf" target="_blank" rel="noopener">Install from Chrome Web Store &rarr;</a></p>
      </article>
    </div>
  </section>

  <section class="visual-mode-gallery" id="try-it-live" aria-label="Try it on synthetic specimens">
    <header class="visual-mode-gallery-header">
      <h2 class="visual-mode-gallery-title">Try it live</h2>
      <p class="visual-mode-gallery-lede">These ${GALLERY_ITEMS.length} synthetic slop pages ship with the detector script baked in. Click any to see the overlay running on a real page, then scroll around and hover the outlined elements.</p>
    </header>
    <div class="gallery-grid">
${specimenCards}
    </div>
  </section>
</div>`;
}

/**
 * Render the /designing page main content.
 *
 * This is the Codex-only adaptation of upstream's orientation page:
 * same "start, iterate, polish, maintain" loop, but with $ commands,
 * local /skills links, and no multi-provider install or slash-command copy.
 */
function renderDesigningMain() {
  const phases = [
    {
      id: 'start',
      eyebrow: '01',
      title: 'Start with context.',
      summary: 'Teach Codex what the product is, what register it should use, and which design system it should respect before asking it to redesign anything.',
      commands: [
        { label: '$impeccable teach', href: '/skills/impeccable#teach' },
        { label: '$impeccable craft', href: '/skills/impeccable#craft' },
        { label: '$clarify', href: '/skills/clarify' },
      ],
      body: 'The first pass is not decoration. It is shared vocabulary: goals, audience, brand or product register, constraints, and the DESIGN.md rules later commands will read.',
    },
    {
      id: 'iterate',
      eyebrow: '02',
      title: 'Iterate in the browser.',
      summary: 'Use the visual loop when the problem is spatial, interactive, or hard to describe from source alone.',
      commands: [
        { label: '$critique', href: '/skills/critique' },
        { label: '$adapt', href: '/skills/adapt' },
        { label: 'npx impeccable live', href: '/visual-mode' },
      ],
      body: 'Review the rendered surface, mark what feels wrong, and let Codex propose concrete variants against the real page instead of guessing from files.',
    },
    {
      id: 'polish',
      eyebrow: '03',
      title: 'Polish the visible layer.',
      summary: 'Once the direction is right, move through the parts users actually feel: type, color, layout, motion, density, and interaction.',
      commands: [
        { label: '$polish', href: '/skills/polish' },
        { label: '$typeset', href: '/skills/typeset' },
        { label: '$colorize', href: '/skills/colorize' },
        { label: '$animate', href: '/skills/animate' },
      ],
      body: 'Polish is not a vague final pass. It is a sequence of small decisions that make hierarchy, rhythm, affordance, and restraint visible.',
    },
    {
      id: 'maintain',
      eyebrow: '04',
      title: 'Maintain the system.',
      summary: 'After the feature works, consolidate repeated choices so the next screen starts from a better baseline.',
      commands: [
        { label: '$audit', href: '/skills/audit' },
        { label: '$harden', href: '/skills/harden' },
        { label: '$impeccable extract', href: '/skills/impeccable#extract' },
      ],
      body: 'Design debt is easiest to pay down when the pattern is still fresh. Extract repeated ideas, document the good ones, and remove the little contradictions before they spread.',
    },
  ];

  const phaseCards = phases.map((phase) => `
    <section class="designing-phase" id="${phase.id}">
      <div class="designing-phase-kicker">${phase.eyebrow}</div>
      <div class="designing-phase-content">
        <h2 class="designing-phase-title">${escapeHtml(phase.title)}</h2>
        <p class="designing-phase-summary">${escapeHtml(phase.summary)}</p>
        <p class="designing-phase-body">${escapeHtml(phase.body)}</p>
        <div class="designing-phase-commands" aria-label="${escapeAttr(phase.title)} commands">
${phase.commands.map((command) => `          <a href="${command.href}" class="designing-command">${escapeHtml(command.label)}</a>`).join('\n')}
        </div>
      </div>
    </section>`).join('\n');

  return `
<div class="designing-page">
  <section class="designing-hero" aria-labelledby="designing-title">
    <div class="designing-hero-copy">
      <p class="sub-page-eyebrow">Workflow orientation</p>
      <h1 class="sub-page-title" id="designing-title">Designing with Impeccable</h1>
      <p class="sub-page-lede">A practical loop for using the Codex-only Impeccable skillset: start with context, iterate where you can see the work, polish deliberately, then fold the best decisions back into the system.</p>
    </div>

    <nav class="designing-loop" aria-label="Designing loop">
      <a href="#start" class="designing-loop-step designing-loop-step--start">
        <span class="designing-loop-num">01</span>
        <span class="designing-loop-name">Start</span>
      </a>
      <a href="#iterate" class="designing-loop-step designing-loop-step--iterate">
        <span class="designing-loop-num">02</span>
        <span class="designing-loop-name">Iterate</span>
      </a>
      <a href="#polish" class="designing-loop-step designing-loop-step--polish">
        <span class="designing-loop-num">03</span>
        <span class="designing-loop-name">Polish</span>
      </a>
      <a href="#maintain" class="designing-loop-step designing-loop-step--maintain">
        <span class="designing-loop-num">04</span>
        <span class="designing-loop-name">Maintain</span>
      </a>
      <div class="designing-loop-center" aria-hidden="true">
        <span>Codex</span>
        <strong>Impeccable</strong>
      </div>
    </nav>
  </section>

  <section class="designing-principle" aria-label="Core principle">
    <p>Use Impeccable when design intent matters more than raw implementation speed. The skill is useful because each command narrows the kind of judgment Codex should apply.</p>
  </section>

  <div class="designing-phases">
${phaseCards}
  </div>

  <section class="designing-appendix" aria-label="Useful links">
    <div>
      <p class="designing-appendix-kicker">Before the loop</p>
      <h2 class="designing-appendix-title">Pick the register.</h2>
      <p>Brand surfaces and product surfaces need different defaults. Capture that distinction in PRODUCT.md during <a href="/skills/impeccable#teach">$impeccable teach</a>, then let the later commands inherit it.</p>
    </div>
    <div>
      <p class="designing-appendix-kicker">When stuck</p>
      <h2 class="designing-appendix-title">Look at the anti-patterns.</h2>
      <p>The <a href="/anti-patterns">anti-pattern catalog</a> names the visual tells Impeccable is trained to avoid. If a page feels wrong but the reason is fuzzy, start there.</p>
    </div>
  </section>

  <nav class="designing-next" aria-label="Next steps">
    <a href="/skills/impeccable" class="designing-next-link">
      <span>New project</span>
      <strong>Start with $impeccable teach</strong>
    </a>
    <a href="/tutorials" class="designing-next-link">
      <span>Walk a scenario</span>
      <strong>Open the tutorials</strong>
    </a>
  </nav>
</div>`;
}

/**
 * Render a tutorial detail page main content.
 */
function renderTutorialDetail(tutorial, knownSkillIds) {
  const bodyHtml = renderMarkdown(tutorial.body, { knownSkillIds });
  return `
<article class="tutorial-detail">
  <header class="tutorial-detail-header">
    <p class="skill-detail-eyebrow"><a href="/tutorials">Tutorials</a> / ${String(tutorial.order).padStart(2, '0')}</p>
    <h1 class="tutorial-detail-title">${escapeHtml(tutorial.title)}</h1>
    ${tutorial.tagline ? `<p class="tutorial-detail-tagline">${escapeHtml(tutorial.tagline)}</p>` : ''}
  </header>

  <section class="tutorial-detail-body prose">
${bodyHtml}
  </section>
</article>`;
}

/**
 * Render the /anti-patterns main column content.
 */
function renderAntiPatternsMain(grouped, totalRules) {
  let sectionsHtml = '';
  for (const section of grouped.order) {
    const rules = grouped.bySection[section] || [];
    if (rules.length === 0) continue;
    const slug = slugify(section);
    sectionsHtml += `
    <section class="anti-patterns-section" id="section-${slug}">
      <header class="anti-patterns-section-header">
        <h2 class="anti-patterns-section-title">${escapeHtml(section)}</h2>
        <p class="anti-patterns-section-count">${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}</p>
      </header>
      <div class="rule-card-grid">
${rules.map(renderRuleCard).join('\n')}
      </div>
    </section>`;
  }

  const detectedCount = grouped.order
    .flatMap((s) => grouped.bySection[s] || [])
    .filter((r) => r.layer !== 'llm').length;
  const llmCount = totalRules - detectedCount;

  return `
<div class="anti-patterns-content">
  <header class="anti-patterns-header">
    <p class="sub-page-eyebrow">${totalRules} rules</p>
    <h1 class="sub-page-title">Anti-patterns</h1>
    <p class="sub-page-lede">The full catalog of patterns <a href="/skills/impeccable">$impeccable</a> teaches against. ${detectedCount} are caught by a deterministic detector (<code>npx impeccable detect</code> or the browser extension). ${llmCount} can only be flagged by <a href="/skills/critique">$critique</a>'s LLM review pass. Want to see them live on real pages? Try <a href="/visual-mode">Visual Mode</a>.</p>
  </header>

  <details class="anti-patterns-legend">
    <summary class="anti-patterns-legend-summary">
      <span class="anti-patterns-legend-title">How to read this</span>
      <svg class="anti-patterns-legend-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </summary>
    <div class="anti-patterns-legend-body">
      <p><strong>AI slop</strong> rules flag the visible tells of AI-generated UIs. <strong>Quality</strong> rules flag general design mistakes that are not AI-specific but still hurt the work. Each rule also shows how it is detected:</p>
      <dl class="anti-patterns-legend-layers">
        <div><dt><span class="rule-card-layer" data-layer="cli">CLI</span></dt><dd>Deterministic. Runs from <code>npx impeccable detect</code> on files, no browser required.</dd></div>
        <div><dt><span class="rule-card-layer" data-layer="browser">Browser</span></dt><dd>Deterministic, but needs real browser layout. Runs via the browser extension or <code>npx impeccable detect https://...</code>, which uses agent-browser under the hood.</dd></div>
        <div><dt><span class="rule-card-layer" data-layer="llm">LLM only</span></dt><dd>No deterministic detector. Caught by <a href="/skills/critique">$critique</a> during its LLM design review.</dd></div>
      </dl>
    </div>
  </details>

  <div class="anti-patterns-sections">
${sectionsHtml}
  </div>
</div>`;
}

/**
 * Entry point. Generates all sub-page HTML files.
 *
 * @param {string} rootDir
 * @returns {Promise<{ files: string[] }>} list of generated file paths (absolute)
 */
export async function generateSubPages(rootDir) {
  const data = await buildSubPageData(rootDir);
  const outDirs = {
    skills: path.join(rootDir, 'public/skills'),
    antiPatterns: path.join(rootDir, 'public/anti-patterns'),
    tutorials: path.join(rootDir, 'public/tutorials'),
    visualMode: path.join(rootDir, 'public/visual-mode'),
    designing: path.join(rootDir, 'public/designing'),
  };

  // Fresh output dirs each time so stale files don't linger.
  for (const dir of Object.values(outDirs)) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  const generated = [];

  // Skills index: docs-browser layout with unified sidebar.
  {
    const sidebar = renderDocsSidebar(data.skillsByCategory, data.tutorials, null);
    const main = renderSkillsOverviewMain(data.skillsByCategory);
    const html = renderPage({
      title: 'Skills | Impeccable',
      description:
        '19 commands that teach Codex how to design. Browse by category: create, evaluate, refine, simplify, harden.',
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'docs',
      canonicalPath: '/skills',
      bodyClass: 'sub-page skills-layout-page',
    });
    const out = path.join(outDirs.skills, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Skills detail pages: same docs-browser shell as the overview.
  for (const skill of data.skills) {
    const sidebar = renderDocsSidebar(data.skillsByCategory, data.tutorials, { kind: 'skill', id: skill.id });
    const main = renderSkillDetail(skill, data.knownSkillIds);
    const title = `$${skill.id} | Impeccable`;
    const description = skill.editorial?.frontmatter?.tagline || skill.description;
    const html = renderPage({
      title,
      description,
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'docs',
      canonicalPath: `/skills/${skill.id}`,
      bodyClass: 'sub-page skills-layout-page',
    });
    const out = path.join(outDirs.skills, `${skill.id}.html`);
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Anti-patterns index: single page, docs-browser shell with TOC sidebar.
  {
    const grouped = groupRulesBySection(data.rules);
    const sidebar = renderAntiPatternsSidebar(grouped);
    const main = renderAntiPatternsMain(grouped, data.rules.length);
    const html = renderPage({
      title: 'Anti-patterns | Impeccable',
      description: `${data.rules.length} deterministic detection rules that flag the visible tells of AI-generated interfaces and common quality issues. Used by npx impeccable detect and the browser extension.`,
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'anti-patterns',
      canonicalPath: '/anti-patterns',
      bodyClass: 'sub-page skills-layout-page anti-patterns-page',
    });
    const out = path.join(outDirs.antiPatterns, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Tutorials index (under the unified Docs umbrella).
  if (data.tutorials.length > 0) {
    const sidebar = renderDocsSidebar(data.skillsByCategory, data.tutorials, null);
    const main = renderTutorialsIndexMain(data.tutorials);
    const html = renderPage({
      title: 'Tutorials | Impeccable',
      description: `${data.tutorials.length} short, opinionated walk-throughs of the highest-leverage Impeccable workflows.`,
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'docs',
      canonicalPath: '/tutorials',
      bodyClass: 'sub-page skills-layout-page tutorials-page',
    });
    const out = path.join(outDirs.tutorials, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Visual Mode: single standalone page, no sidebar, single-column layout.
  {
    const html = renderPage({
      title: 'Visual Mode | Impeccable',
      description:
        'See every anti-pattern flagged directly on the page. Live detection overlay from Impeccable, available via $critique, npx impeccable live, or the Chrome extension.',
      bodyHtml: renderVisualModeMain(),
      activeNav: 'visual-mode',
      canonicalPath: '/visual-mode',
      bodyClass: 'sub-page visual-mode-page-body',
    });
    const out = path.join(outDirs.visualMode, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Designing: orientation page for the Codex-only workflow loop.
  {
    const html = renderPage({
      title: 'Designing with Impeccable',
      description:
        'A practical Codex-only loop for using Impeccable: start with context, iterate in the browser, polish deliberately, and maintain the system.',
      bodyHtml: renderDesigningMain(),
      activeNav: 'designing',
      canonicalPath: '/designing',
      bodyClass: 'sub-page designing-page-body',
    });
    const out = path.join(outDirs.designing, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Tutorial detail pages.
  for (const tutorial of data.tutorials) {
    const sidebar = renderDocsSidebar(data.skillsByCategory, data.tutorials, { kind: 'tutorial', slug: tutorial.slug });
    const main = renderTutorialDetail(tutorial, data.knownSkillIds);
    const html = renderPage({
      title: `${tutorial.title} | Tutorials | Impeccable`,
      description: tutorial.description || tutorial.tagline || '',
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'docs',
      canonicalPath: `/tutorials/${tutorial.slug}`,
      bodyClass: 'sub-page skills-layout-page tutorials-page',
    });
    const out = path.join(outDirs.tutorials, `${tutorial.slug}.html`);
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  return { files: generated };
}
