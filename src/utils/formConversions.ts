import {
  COLOR_KEY_SET,
  COLOR_KEYS,
  DEFAULT_THEME_SETTINGS,
  parseShortcutSettingsPatch,
  parseThemeSettingsPatch,
  type ExtensionSettings,
  type StoredSettingKey,
} from '@/utils/settings';
import {
  formatRgba,
  parseCssColor,
  parseHexColor,
  rgbToHex,
} from '@/utils/colors';
import { type ColorKey } from '@/types/colorTypes';
import { type OptionsFormState } from '@/types/formTypes';

function isColorKey(key: StoredSettingKey): key is ColorKey {
  return COLOR_KEY_SET.has(key);
}

function parseColorValue(key: ColorKey, value: unknown) {
  const patch = parseThemeSettingsPatch({ [key]: value });
  return (
    parseCssColor(patch[key] ?? DEFAULT_THEME_SETTINGS[key]) ??
    parseCssColor(DEFAULT_THEME_SETTINGS[key])
  );
}

function applyColorFieldToFormState(
  state: OptionsFormState,
  key: ColorKey,
  value: unknown,
): OptionsFormState {
  const parsed = parseColorValue(key, value);

  return {
    ...state,
    colors: {
      ...state.colors,
      [key]: {
        alpha: parsed?.a ?? 1,
        hex: parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : '#000000',
      },
    },
    fields: {
      ...state.fields,
    },
  };
}

const NON_COLOR_FIELD_APPLIERS = {
  activationShortcut: (
    state: OptionsFormState,
    value: unknown,
  ): OptionsFormState => {
    const patch = parseShortcutSettingsPatch({ activationShortcut: value });

    return {
      ...state,
      fields: {
        ...state.fields,
        activationShortcut:
          patch.activationShortcut ?? state.fields.activationShortcut,
      },
    };
  },
  hideControlsByDefault: (
    state: OptionsFormState,
    value: unknown,
  ): OptionsFormState => {
    const patch = parseShortcutSettingsPatch({ hideControlsByDefault: value });

    return {
      ...state,
      fields: {
        ...state.fields,
        hideControlsByDefault:
          patch.hideControlsByDefault ?? state.fields.hideControlsByDefault,
      },
    };
  },
  toggleControlsKey: (
    state: OptionsFormState,
    value: unknown,
  ): OptionsFormState => {
    const patch = parseShortcutSettingsPatch({ toggleControlsKey: value });

    return {
      ...state,
      fields: {
        ...state.fields,
        toggleControlsKey: patch.toggleControlsKey ?? state.fields.toggleControlsKey,
      },
    };
  },
} satisfies Record<
  Exclude<StoredSettingKey, ColorKey | 'buttonDisabledOpacity'>,
  (state: OptionsFormState, value: unknown) => OptionsFormState
>;

export function settingsToFormState(
  settings: ExtensionSettings,
): OptionsFormState {
  const colorFields = {} as OptionsFormState['colors'];

  for (const key of COLOR_KEYS) {
    const parsed =
      parseCssColor(settings[key]) ?? parseCssColor(DEFAULT_THEME_SETTINGS[key]);

    if (!parsed) {
      colorFields[key] = {
        alpha: 1,
        hex: '#000000',
      };
      continue;
    }

    colorFields[key] = {
      alpha: parsed.a,
      hex: rgbToHex(parsed.r, parsed.g, parsed.b),
    };
  }

  return {
    colors: colorFields,
    fields: {
      activationShortcut: settings.activationShortcut,
      hideControlsByDefault: settings.hideControlsByDefault,
      toggleControlsKey: settings.toggleControlsKey,
    },
  };
}

export function formStateToRawSettings(
  state: OptionsFormState,
): Record<string, unknown> {
  const rawSettings: Record<string, unknown> = {
    activationShortcut: state.fields.activationShortcut,
    hideControlsByDefault: state.fields.hideControlsByDefault,
    toggleControlsKey: state.fields.toggleControlsKey,
  };

  for (const key of COLOR_KEYS) {
    const color = state.colors[key];
    const rgb = parseHexColor(color.hex);

    rawSettings[key] = rgb
      ? formatRgba(rgb.r, rgb.g, rgb.b, color.alpha)
      : DEFAULT_THEME_SETTINGS[key];
  }

  return rawSettings;
}

export function applyStoredSettingToFormState(
  state: OptionsFormState,
  key: StoredSettingKey,
  value: unknown,
): OptionsFormState {
  if (isColorKey(key)) {
    return applyColorFieldToFormState(state, key, value);
  }

  if (key === 'buttonDisabledOpacity') {
    return state;
  }

  return NON_COLOR_FIELD_APPLIERS[key](state, value);
}
