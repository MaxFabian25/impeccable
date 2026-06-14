import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('live reference authoring contract', () => {
  it('keeps live preview CSS guidance capability-mode driven', () => {
    const liveMd = readFileSync(join(ROOT, 'skills/impeccable/reference/live.md'), 'utf-8');

    assert.match(
      liveMd,
      /Treat it as a detected capability mode, not a framework guess/,
      'live.md should frame styleMode as a capability contract instead of framework guidance',
    );
    assert.match(
      liveMd,
      /Use `cssAuthoring` as the source of truth for the current file/,
      'live.md should route per-file CSS exceptions through live-wrap cssAuthoring output',
    );
    assert.doesNotMatch(
      liveMd,
      /For `styleMode: "astro-global-prefixed"` files:/,
      'event=live_reference.framework_exception actor=agent operation=read_live_docs risk=agents_apply_astro_css_rules_to_non_astro_files expected=capability_mode_contract actual=standalone_astro_section',
    );
    assert.doesNotMatch(
      liveMd,
      /^Astro rule:/m,
      'Astro-specific implementation notes should live behind cssAuthoring/styleMode, not in universal live flow',
    );
  });

  it('passes cssAuthoring through live-wrap output instead of hard-coding scoped CSS', () => {
    const liveWrap = readFileSync(join(ROOT, 'skills/impeccable/scripts/live-wrap.mjs'), 'utf-8');

    assert.match(
      liveWrap,
      /cssAuthoring: buildCssAuthoring\(styleMode, count\)/,
      'live-wrap output should include the CSS authoring contract',
    );
    assert.match(
      liveWrap,
      /astro-global-prefixed/,
      'live-wrap should expose the Astro preview CSS mode through cssAuthoring',
    );
  });
});
