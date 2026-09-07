import { describe, expect, it } from 'vitest';

import { DEFAULT_SHORTCUT_SETTINGS } from '@/utils/settings';
import { ActivationDetector } from './ActivationDetector';

function createDetector(nowRef: { value: number }): ActivationDetector {
  return new ActivationDetector(DEFAULT_SHORTCUT_SETTINGS, {
    doubleActivationMs: 350,
    performanceRef: {
      now: () => nowRef.value,
    } as Performance,
  });
}

describe('ActivationDetector', () => {
  it('consumes each pair and resets on intervening input or composition', () => {
    const detector = createDetector({ value: 100 });
    const press = (init: KeyboardEventInit = { key: 'Control' }) =>
      detector.shouldActivate(new KeyboardEvent('keydown', init));

    expect(press()).toBe(false);
    expect(press()).toBe(true);
    expect(press()).toBe(false);
    expect(press({ key: 'a', ctrlKey: true })).toBe(false);
    expect(press()).toBe(false);
    expect(press({ key: 'Control', isComposing: true })).toBe(false);
    expect(press()).toBe(false);
    detector.reset();
    expect(press()).toBe(false);
  });

  it('ignores activation and control toggles from a shadow-root editor', () => {
    const detector = createDetector({ value: 100 });
    const host = document.createElement('div');
    const editor = document.createElement('input');
    host.attachShadow({ mode: 'open' }).append(editor);
    document.body.append(host);
    const results: boolean[] = [];
    host.addEventListener('keydown', event => {
      expect(event.target).toBe(host);
      results.push(detector.shouldActivate(event));
      expect(detector.matchesToggleControls(event)).toBe(false);
    });
    for (const key of ['Control', 'Control', 'h']) {
      editor.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
    }
    expect(results).toEqual([false, false, false]);
    expect(detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' }))).toBe(false);
  });

  it.each([
    { delay: 350, activates: true },
    { delay: 351, activates: false },
  ])('activates after $delay ms: $activates', ({ delay, activates }) => {
    const nowRef = { value: 100 };
    const detector = createDetector(nowRef);

    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(false);

    nowRef.value += delay;
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(activates);
  });

  it('resets when the activation shortcut changes', () => {
    const nowRef = { value: 100 };
    const detector = createDetector(nowRef);

    detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' }));

    detector.updateShortcutSettings({
      ...DEFAULT_SHORTCUT_SETTINGS,
      activationShortcut: 'double_shift',
    });

    nowRef.value = 250;
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Shift' })),
    ).toBe(false);
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Shift' })),
    ).toBe(true);
  });

  it('ignores repeated key events', () => {
    const nowRef = { value: 100 };
    const detector = createDetector(nowRef);

    expect(
      detector.shouldActivate(
        new KeyboardEvent('keydown', {
          key: 'Control',
          repeat: true,
        }),
      ),
    ).toBe(false);

    nowRef.value = 200;
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(false);
  });

  it.each(['metaKey', 'shiftKey', 'altKey'] as const)(
    'resets a pending activation when Control is combined with %s',
    modifier => {
      const detector = createDetector({ value: 100 });
      const press = (init: KeyboardEventInit = {}) => detector.shouldActivate(
        new KeyboardEvent('keydown', { key: 'Control', ...init }),
      );

      expect(press()).toBe(false);
      expect(press({ [modifier]: true })).toBe(false);
      expect(press()).toBe(false);
      expect(press()).toBe(true);
    },
  );

  it('matches only the configured toggle-controls key', () => {
    const detector = createDetector({ value: 100 });

    expect(
      detector.matchesToggleControls(
        new KeyboardEvent('keydown', { key: ' H ' }),
      ),
    ).toBe(true);
    expect(
      detector.matchesToggleControls(
        new KeyboardEvent('keydown', {
          key: 'h',
          ctrlKey: true,
        }),
      ),
    ).toBe(false);
    expect(
      detector.matchesToggleControls(
        new KeyboardEvent('keydown', {
          key: 'h',
          repeat: true,
        }),
      ),
    ).toBe(false);
    expect(
      detector.matchesToggleControls(
        new KeyboardEvent('keydown', { key: 'x' }),
      ),
    ).toBe(false);
  });
});
