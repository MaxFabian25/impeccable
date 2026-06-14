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

  it('grounds the generation shader on the captured backdrop tone', () => {
    assert.match(
      SOURCE,
      /uniform vec3 u_paper;/,
      'generation shader must accept a paper/backdrop uniform instead of assuming fixed white paper',
    );
    assert.match(
      SOURCE,
      /gl\.uniform3f\(uPaper,\s*paperRgb\[0\],\s*paperRgb\[1\],\s*paperRgb\[2\]\)/,
      'generation shader must receive the resolved paper/backdrop RGB tone',
    );
  });

  it('keeps capture alpha when rendering the generation shader', () => {
    assert.match(
      SOURCE,
      /gl_FragColor = vec4\(mix\(ground, u_accent, dotAmt\), tex\.a\);/,
      'shader must preserve capture alpha so rounded or transparent areas do not render black',
    );
  });

  it('clears the cached CSS color parse canvas before each fill', () => {
    assert.match(
      SOURCE,
      /function cssColorToRgb01\b[\s\S]{0,500}?colorParseCtx\.clearRect\(0, 0, 1, 1\);[\s\S]{0,300}?colorParseCtx\.fillRect\(0, 0, 1, 1\);/,
      'semi-transparent color parsing must not blend with the previous cached canvas pixel',
    );
  });

  it('propagates the capture paper tone through initial and resumed shader overlays', () => {
    assert.match(
      SOURCE,
      /\(\{ blob, paper \} = await captureElementToBlob\(el, snapshot, rect\)\);[\s\S]{0,800}?showShaderOverlay\(el, blob, rect, paper\);/,
      'initial generation capture must pass the paper tone into the shader overlay',
    );
    assert.match(
      SOURCE,
      /const \{ blob, paper \} = await captureElementToBlob\(origEl, null, rect\);[\s\S]{0,200}?showShaderOverlay\(origEl, blob, rect, paper\);/,
      'shader resume after reload must pass the paper tone into the restarted overlay',
    );
  });

  it('detect mode shows an empty result toast once per requested scan', () => {
    assert.match(
      SOURCE,
      /const DETECT_EMPTY_MESSAGE = 'No detector issues found\.';/,
      'live detector zero-result copy should live in one named constant',
    );
    assert.match(
      SOURCE,
      /function requestDetectScan\(\)[\s\S]{0,240}?const scanId = String\(\+\+detectScanSeq\);[\s\S]{0,120}?activeDetectScanId = scanId;[\s\S]{0,160}?config: \{ scanId \}/,
      'Detect scans must send a fresh scan id to the detector',
    );
    assert.match(
      SOURCE,
      /if \(!detectActive\) return;[\s\S]{0,80}?if \(activeDetectScanId && e\.data\.scanId !== activeDetectScanId\) return;/,
      'live detector results must ignore inactive and stale scan ids',
    );
    assert.match(
      SOURCE,
      /if \(pendingDetectScanId && detectCount === 0\) \{[\s\S]{0,80}?showToast\(DETECT_EMPTY_MESSAGE, 3200\);[\s\S]{0,120}?pendingDetectScanId = null;/,
      'a matching zero-result scan must use the existing toast UI and clear the pending scan id',
    );
    assert.match(
      SOURCE,
      /window\.postMessage\(\{ source: 'impeccable-command', action: 'remove' \}, '\*'\);[\s\S]{0,80}?activeDetectScanId = null;[\s\S]{0,80}?pendingDetectScanId = null;/,
      'turning Detect off must clear scan ids',
    );
  });
});
