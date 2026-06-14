/**
 * Static-source regression guards for live-browser.js.
 *
 * `skills/impeccable/scripts/live-browser.js` is a self-contained
 * IIFE served directly to user pages by live-server.mjs. That makes internal
 * helpers awkward to import, but some real-world bugs have compact source
 * shapes we can forbid.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE_BROWSER = path.resolve(
  __dirname,
  '..',
  'skills/impeccable/scripts/live-browser.js',
);
const SOURCE = fs.readFileSync(LIVE_BROWSER, 'utf-8');

describe('live-browser.js regression guards', () => {
  it('resolveCanvasBackground does not fall back to `getComputedStyle(...).backgroundColor || ...`', () => {
    // The browser returns the literal string `"rgba(0, 0, 0, 0)"` for an
    // unset body/html background. That string is truthy, so a `||` chain
    // short-circuits to transparent-black and modern-screenshot can flash a
    // black overlay while loading. The correct fallback is literal white.
    const buggy =
      /getComputedStyle\(document\.(?:body|documentElement)\)\.backgroundColor\s*\|\|/;
    assert.ok(
      !buggy.test(SOURCE),
      'live-browser.js must not chain `getComputedStyle(...).backgroundColor || ...`; use a literal #ffffff fallback instead.',
    );
  });

  it('detectPageTheme honors alpha when reading body / html backgroundColor', () => {
    assert.match(
      SOURCE,
      /function detectPageTheme\b[\s\S]{0,1500}?function readOpaque\b/,
      'detectPageTheme must keep its readOpaque helper that filters transparent backgrounds before luminance checks',
    );
  });
});
