import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_RE =
  /^rgba?\(\s*(?:[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+%?)?|[\d.]+%?\s+[\d.]+%?\s+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?)\s*\)$/i;

const originalCss = globalThis.CSS;
const originalCssSupports = globalThis.CSS?.supports;
const originalPointerEvent = globalThis.PointerEvent;

function isSupportedColor(value: string): boolean {
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) || RGB_COLOR_RE.test(trimmed);
}

function cssSupports(property: string, value?: string): boolean {
  if (value === undefined) {
    return false;
  }

  return property === 'color' && isSupportedColor(value);
}

beforeAll(() => {
  if (!globalThis.CSS) {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: {},
    });
  }

  Object.defineProperty(globalThis.CSS, 'supports', {
    configurable: true,
    value: cssSupports,
    writable: true,
  });

  if (!globalThis.PointerEvent) {
    class TestPointerEvent extends MouseEvent {
      pointerId: number;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }

    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      value: TestPointerEvent,
    });
  }
});

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

afterAll(() => {
  if (originalCss) {
    Object.defineProperty(originalCss, 'supports', {
      configurable: true,
      value: originalCssSupports,
      writable: true,
    });
  } else {
    Reflect.deleteProperty(globalThis, 'CSS');
  }

  if (originalPointerEvent) {
    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      value: originalPointerEvent,
    });
  } else {
    Reflect.deleteProperty(globalThis, 'PointerEvent');
  }
});
