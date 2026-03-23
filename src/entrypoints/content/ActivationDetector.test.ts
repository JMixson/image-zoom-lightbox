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
  it('requires two presses within the configured threshold', () => {
    const nowRef = { value: 100 };
    const detector = createDetector(nowRef);

    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(false);

    nowRef.value = 300;
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(true);

    nowRef.value = 900;
    expect(
      detector.shouldActivate(new KeyboardEvent('keydown', { key: 'Control' })),
    ).toBe(false);
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

  it('rejects modifier combinations that should not count', () => {
    const detector = createDetector({ value: 100 });

    expect(
      detector.shouldActivate(
        new KeyboardEvent('keydown', {
          key: 'Control',
          metaKey: true,
        }),
      ),
    ).toBe(false);
    expect(
      detector.shouldActivate(
        new KeyboardEvent('keydown', {
          key: 'Control',
          shiftKey: true,
        }),
      ),
    ).toBe(false);
  });

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

  it('recognizes editable targets', () => {
    const detector = createDetector({ value: 100 });
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const contentEditable = document.createElement('div');
    const plainDiv = document.createElement('div');

    Object.defineProperty(contentEditable, 'isContentEditable', {
      configurable: true,
      value: true,
    });

    expect(detector.isEditableTarget(input)).toBe(true);
    expect(detector.isEditableTarget(textarea)).toBe(true);
    expect(detector.isEditableTarget(select)).toBe(true);
    expect(detector.isEditableTarget(contentEditable)).toBe(true);
    expect(detector.isEditableTarget(plainDiv)).toBe(false);
    expect(detector.isEditableTarget(null)).toBe(false);
  });
});
