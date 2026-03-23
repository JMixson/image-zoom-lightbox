import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  parseSettings,
  parseShortcutSettings,
  parseShortcutSettingsPatch,
  parseThemeSettings,
  parseThemeSettingsPatch,
} from './settings';

describe('parseThemeSettings', () => {
  it('returns defaults for invalid color values', () => {
    const parsed = parseThemeSettings({
      buttonBg: 'not-a-color',
      buttonText: 42,
      buttonHoverBg: 'rgb(12, 34)',
      buttonHoverText: '',
      buttonActiveBg: null,
      closeButtonBg: 'hsl(0 0 0)',
      closeButtonText: undefined,
      closeButtonHoverBg: 'transparent',
      closeButtonHoverText: {},
    });

    expect(parsed).toMatchObject({
      buttonBg: DEFAULT_THEME_SETTINGS.buttonBg,
      buttonText: DEFAULT_THEME_SETTINGS.buttonText,
      buttonHoverBg: DEFAULT_THEME_SETTINGS.buttonHoverBg,
      buttonHoverText: DEFAULT_THEME_SETTINGS.buttonHoverText,
      buttonActiveBg: DEFAULT_THEME_SETTINGS.buttonActiveBg,
      closeButtonBg: DEFAULT_THEME_SETTINGS.closeButtonBg,
      closeButtonText: DEFAULT_THEME_SETTINGS.closeButtonText,
      closeButtonHoverBg: DEFAULT_THEME_SETTINGS.closeButtonHoverBg,
      closeButtonHoverText: DEFAULT_THEME_SETTINGS.closeButtonHoverText,
    });
  });

  it('clamps buttonDisabledOpacity to the 0..1 range', () => {
    expect(
      parseThemeSettings({ buttonDisabledOpacity: 3 }).buttonDisabledOpacity,
    ).toBe(1);
    expect(
      parseThemeSettings({ buttonDisabledOpacity: '-1' }).buttonDisabledOpacity,
    ).toBe(0);
  });
});

describe('parseShortcutSettings', () => {
  it('falls back for an invalid activation shortcut', () => {
    const parsed = parseShortcutSettings({
      activationShortcut: 'caps_lock',
    });

    expect(parsed.activationShortcut).toBe(
      DEFAULT_SHORTCUT_SETTINGS.activationShortcut,
    );
  });

  it('normalizes toggleControlsKey and accepts boolean-like values', () => {
    expect(
      parseShortcutSettings({
        hideControlsByDefault: 'true',
        toggleControlsKey: '  J ',
      }),
    ).toMatchObject({
      hideControlsByDefault: true,
      toggleControlsKey: 'j',
    });

    expect(
      parseShortcutSettings({
        hideControlsByDefault: 0,
      }).hideControlsByDefault,
    ).toBe(false);
  });
});

describe('parseSettings', () => {
  it('merges theme and shortcut parsing', () => {
    const parsed = parseSettings({
      buttonBg: '#112233',
      buttonDisabledOpacity: '0.6',
      activationShortcut: 'double_shift',
      hideControlsByDefault: 1,
      toggleControlsKey: ' Z ',
    });

    expect(parsed).toEqual({
      ...DEFAULT_SETTINGS,
      buttonBg: '#112233',
      buttonDisabledOpacity: 0.6,
      activationShortcut: 'double_shift',
      hideControlsByDefault: true,
      toggleControlsKey: 'z',
    });
  });
});

describe('parseThemeSettingsPatch', () => {
  it('returns only keys that were provided', () => {
    expect(
      parseThemeSettingsPatch({
        buttonBg: '#abcdef',
        closeButtonText: 'bad-value',
      }),
    ).toEqual({
      buttonBg: '#abcdef',
      closeButtonText: DEFAULT_THEME_SETTINGS.closeButtonText,
    });
  });
});

describe('parseShortcutSettingsPatch', () => {
  it('returns only keys that were provided', () => {
    expect(
      parseShortcutSettingsPatch({
        hideControlsByDefault: 1,
        toggleControlsKey: ' Q ',
      }),
    ).toEqual({
      hideControlsByDefault: true,
      toggleControlsKey: 'q',
    });
  });
});
