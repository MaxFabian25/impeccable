import { afterEach, describe, expect, mock, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import { initAnchorScroll, initHashTracking } from '../site/public/js/utils/scroll.js';

function installDom(html, url = 'https://impeccable.test/') {
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    url,
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.history = dom.window.history;
  globalThis.location = dom.window.location;
  globalThis.requestAnimationFrame = (callback) => callback();

  Object.defineProperty(dom.window, 'scrollY', {
    configurable: true,
    value: 20,
  });

  dom.window.scrollTo = mock(() => {});

  return dom;
}

function positionElement(element, top) {
  element.getBoundingClientRect = () => ({
    top,
    bottom: top + 100,
    height: 100,
    left: 0,
    right: 100,
    width: 100,
  });
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.history;
  delete globalThis.location;
  delete globalThis.requestAnimationFrame;
});

describe('site scroll helpers', () => {
  test('anchor clicks use instant scrolling instead of deferring to CSS', () => {
    const dom = installDom(`
      <a href="#target">Target</a>
      <section id="target"></section>
    `);
    const target = dom.window.document.getElementById('target');
    positionElement(target, 220);

    initAnchorScroll();
    dom.window.document.querySelector('a').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(dom.window.scrollTo).toHaveBeenCalledWith({ top: 200, behavior: 'instant' });
  });

  test('initial hash restore retries after async site content renders', () => {
    const dom = installDom('<section id="language"></section>', 'https://impeccable.test/#cmd-overdrive');

    initHashTracking();
    expect(dom.window.scrollTo).not.toHaveBeenCalled();

    const target = dom.window.document.createElement('div');
    target.id = 'cmd-overdrive';
    positionElement(target, 360);
    dom.window.document.body.appendChild(target);

    dom.window.dispatchEvent(new dom.window.CustomEvent('impeccable:content-loaded'));

    expect(dom.window.scrollTo).toHaveBeenCalledWith({ top: 340, behavior: 'instant' });
  });
});
