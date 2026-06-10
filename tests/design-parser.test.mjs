import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseDesignMd } from '../src/design-parser.mjs';
import { loadDesignSystemPayload } from '../src/detect-antipatterns.mjs';

describe('parseDesignMd', () => {
  it('extracts core sections from Stitch-style markdown', () => {
    const parsed = parseDesignMd(`---
version: alpha
---
# Design System: Demo

## 1. Overview

**Creative North Star: "Editorial Workshop"**

The system is direct and type-led.

**Key Characteristics:**
- Sparse color
- Dense information

## 2. Colors

### Primary
- **Signal Magenta** (\`oklch(60% 0.25 350)\`): Used for active states.

### Named Rules
**The One Voice Rule.** Use one accent only.

## 3. Typography
- **Display**: Cormorant Garamond for major headings.

## 4. Elevation
- **Soft Lift** (\`0 4px 24px rgba(0,0,0,0.12)\`): Hover only.

## 5. Components
### Buttons
- Shape: square

## 6. Do's and Don'ts
### Do:
- **Do** use the accent sparingly.
### Don't:
- **Don't** use gradient text.
`);

    assert.equal(parsed.title, 'Design System: Demo');
    assert.equal(parsed.overview.northStar, 'Editorial Workshop');
    assert.deepEqual(parsed.overview.keyCharacteristics, ['Sparse color', 'Dense information']);
    assert.equal(parsed.colors.groups[0].colors[0].name, 'Signal Magenta');
    assert.equal(parsed.colors.rules[0].name, 'The One Voice Rule');
    assert.equal(parsed.typography.fonts.display.name, 'Display');
    assert.equal(parsed.elevation.shadows[0].name, 'Soft Lift');
    assert.equal(parsed.components.items[0].name, 'Buttons');
    assert.deepEqual(parsed.dosDonts.dos, ['Do use the accent sparingly.']);
    assert.deepEqual(parsed.dosDonts.donts, ["Don't use gradient text."]);
  });

  it('accepts current Impeccable DESIGN.md section casing', () => {
    const parsed = parseDesignMd(`# Design System

## Do's And Don'ts
- Do keep typography crisp.
- Don't use glow.
`);

    assert.deepEqual(parsed.dosDonts.dos, ['Do keep typography crisp.']);
    assert.deepEqual(parsed.dosDonts.donts, ["Don't use glow."]);
  });
});

describe('loadDesignSystemPayload', () => {
  it('prefers DESIGN.json and marks stale markdown', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'impeccable-design-payload-'));
    try {
      writeFileSync(join(tmp, 'DESIGN.json'), JSON.stringify({
        schemaVersion: 1,
        title: 'Design System: Sidecar',
      }), 'utf-8');
      writeFileSync(join(tmp, 'DESIGN.md'), '# Design System\n', 'utf-8');

      const payload = await loadDesignSystemPayload(tmp);

      assert.equal(payload.present, true);
      assert.equal(payload.mode, 'sidecar');
      assert.equal(payload.model.title, 'Design System: Sidecar');
      assert.equal(typeof payload.mdNewerThanJson, 'boolean');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('falls back to parsed DESIGN.md when no sidecar exists', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'impeccable-design-payload-'));
    try {
      writeFileSync(join(tmp, 'DESIGN.md'), '# Design System\n\n## Colors\n\n### Primary\n- **Ink** (`oklch(10% 0 0)`): Text.\n', 'utf-8');

      const payload = await loadDesignSystemPayload(tmp);

      assert.equal(payload.present, true);
      assert.equal(payload.mode, 'parsed-md');
      assert.equal(payload.parsedMd.colors.groups[0].colors[0].name, 'Ink');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns absent when neither file exists', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'impeccable-design-payload-'));
    try {
      assert.deepEqual(await loadDesignSystemPayload(tmp), { present: false });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
