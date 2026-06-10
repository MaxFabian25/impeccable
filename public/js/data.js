// Shared client-side command metadata for the public site.
// Keep this aligned with scripts/lib/sub-pages-data.js.

export const readySkills = [
  'impeccable',
];

export const readyCommands = [
  'layout',
];

export const betaCommands = [
  'overdrive',
];

export const skillFocusAreas = {
  impeccable: [
    { area: 'Typography', detail: 'Scale, rhythm, hierarchy, expression' },
    { area: 'Color & Contrast', detail: 'Accessibility, systems, theming' },
    { area: 'Spatial Design', detail: 'Layout, spacing, composition' },
    { area: 'Responsive', detail: 'Fluid layouts, touch targets' },
    { area: 'Interaction', detail: 'States, feedback, affordances' },
    { area: 'Motion', detail: 'Micro-interactions, transitions' },
    { area: 'UX Writing', detail: 'Clarity, voice, error messages' },
  ],
};

export const dimensionGuidelineCounts = {
  Typography: 33,
  'Color & Contrast': 29,
  'Spatial Design': 27,
  Motion: 32,
  Interaction: 36,
  Responsive: 23,
  'UX Writing': 32,
};

export const skillReferenceDomains = [
  'typography',
  'color-and-contrast',
  'spatial-design',
  'responsive-design',
  'interaction-design',
  'motion-design',
  'ux-writing',
];

export const commandCategoryOrder = ['create', 'evaluate', 'refine', 'simplify', 'harden'];

export const commandCategoryLabels = {
  create: 'Create',
  evaluate: 'Evaluate',
  refine: 'Refine',
  simplify: 'Simplify',
  harden: 'Harden',
};

export const commandCategoryCommandOrder = {
  create: ['impeccable', 'shape'],
  evaluate: ['critique', 'audit'],
  refine: ['typeset', 'layout', 'colorize', 'animate', 'delight', 'bolder', 'quieter', 'overdrive'],
  simplify: ['distill', 'clarify', 'adapt'],
  harden: ['polish', 'optimize', 'harden', 'onboard'],
};

export const commandProcessSteps = {
  impeccable: ['Context', 'Direction', 'Build', 'Refine'],
  shape: ['Interview', 'Synthesize', 'Brief', 'Confirm'],
  audit: ['Scan', 'Document', 'Prioritize', 'Recommend'],
  critique: ['Evaluate', 'Critique', 'Prioritize', 'Suggest'],
  typeset: ['Assess', 'Select', 'Scale', 'Refine'],
  layout: ['Assess', 'Grid', 'Rhythm', 'Balance'],
  colorize: ['Analyze', 'Strategy', 'Apply', 'Balance'],
  animate: ['Identify', 'Design', 'Implement', 'Polish'],
  delight: ['Identify', 'Design', 'Implement'],
  bolder: ['Analyze', 'Amplify', 'Impact'],
  quieter: ['Analyze', 'Reduce', 'Refine'],
  overdrive: ['Assess', 'Choose', 'Build', 'Polish'],
  distill: ['Audit', 'Remove', 'Clarify'],
  clarify: ['Read', 'Simplify', 'Improve', 'Test'],
  adapt: ['Analyze', 'Adjust', 'Optimize'],
  polish: ['Discover', 'Review', 'Refine', 'Verify'],
  optimize: ['Profile', 'Identify', 'Improve', 'Measure'],
  harden: ['Test', 'Handle', 'Validate', 'Confirm'],
  onboard: ['Assess', 'Guide', 'Activate', 'Measure'],
};

export const commandCategories = {
  impeccable: 'create',
  shape: 'create',
  audit: 'evaluate',
  critique: 'evaluate',
  typeset: 'refine',
  layout: 'refine',
  colorize: 'refine',
  animate: 'refine',
  delight: 'refine',
  bolder: 'refine',
  quieter: 'refine',
  overdrive: 'refine',
  distill: 'simplify',
  clarify: 'simplify',
  adapt: 'simplify',
  polish: 'harden',
  optimize: 'harden',
  harden: 'harden',
  onboard: 'harden',
};

export const skillRelationships = {
  impeccable: {
    description: 'Codex-native design intelligence with progressive reference loading',
    referenceDomains: ['typography', 'color-and-contrast', 'spatial-design', 'responsive-design', 'interaction-design', 'motion-design', 'ux-writing'],
  },
};

export const commandRelationships = {
  impeccable: { flow: 'Create: Establish project context or design with the full guidebook loaded' },
  shape: { flow: 'Create: Plan UX and UI through structured discovery' },
  audit: { leadsTo: ['harden', 'optimize', 'adapt', 'clarify'], flow: 'Evaluate: Technical quality audit' },
  critique: { leadsTo: ['polish', 'distill', 'bolder', 'quieter', 'typeset', 'layout'], flow: 'Evaluate: UX and design review with scoring' },
  typeset: { combinesWith: ['bolder', 'polish'], flow: 'Refine: Fix typography and type hierarchy' },
  layout: { combinesWith: ['distill', 'adapt'], flow: 'Refine: Fix layout and spacing' },
  colorize: { combinesWith: ['bolder', 'delight'], flow: 'Refine: Add strategic color' },
  animate: { combinesWith: ['delight'], flow: 'Refine: Add purposeful motion' },
  delight: { combinesWith: ['bolder', 'animate'], flow: 'Refine: Add personality and joy' },
  bolder: { pairs: 'quieter', flow: 'Refine: Amplify timid designs' },
  quieter: { pairs: 'bolder', flow: 'Refine: Tone down aggressive designs' },
  overdrive: { combinesWith: ['animate', 'delight'], flow: 'Refine: Technically extraordinary effects' },
  distill: { combinesWith: ['quieter', 'polish'], flow: 'Simplify: Strip to essence' },
  clarify: { combinesWith: ['polish', 'adapt'], flow: 'Simplify: Improve UX copy' },
  adapt: { combinesWith: ['polish', 'clarify'], flow: 'Simplify: Adapt for different contexts' },
  polish: { flow: 'Harden: Final pass and design system alignment' },
  optimize: { flow: 'Harden: Performance improvements' },
  harden: { combinesWith: ['optimize', 'onboard'], flow: 'Harden: Edge cases, error handling, and production resilience' },
  onboard: { combinesWith: ['harden', 'clarify'], flow: 'Harden: First-run activation, empty states, and feature discovery' },
};
