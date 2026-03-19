import { isValidCssColor } from './colors';
import { clamp } from './math';
import {
  isActivationShortcut,
  normalizeShortcutKey,
  type ActivationShortcut,
} from './shortcuts';

export type ThemeSettings = {
  buttonBg: string;
  buttonText: string;
  buttonHoverBg: string;
  buttonHoverText: string;
  buttonActiveBg: string;
  buttonDisabledOpacity: number;
  closeButtonBg: string;
  closeButtonText: string;
  closeButtonHoverBg: string;
  closeButtonHoverText: string;
};

export type ShortcutSettings = {
  activationShortcut: ActivationShortcut;
  hideControlsByDefault: boolean;
  toggleControlsKey: string;
};

export type ExtensionSettings = ThemeSettings & ShortcutSettings;

export const DEFAULT_THEME_SETTINGS: ThemeSettings = Object.freeze({
  buttonBg: 'rgba(255, 255, 255, 0.13)',
  buttonText: 'rgba(255, 255, 255, 0.92)',
  buttonHoverBg: 'rgba(255, 255, 255, 0.22)',
  buttonHoverText: '#fff',
  buttonActiveBg: 'rgba(255, 255, 255, 0.1)',
  buttonDisabledOpacity: 0.28,
  closeButtonBg: 'rgba(18, 18, 22, 0.68)',
  closeButtonText: 'rgba(255, 255, 255, 0.75)',
  closeButtonHoverBg: 'rgba(255, 255, 255, 0.14)',
  closeButtonHoverText: '#fff',
});

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = Object.freeze({
  activationShortcut: 'double_ctrl' as ActivationShortcut,
  hideControlsByDefault: false,
  toggleControlsKey: 'h',
});

export const DEFAULT_SETTINGS: ExtensionSettings = Object.freeze({
  ...DEFAULT_THEME_SETTINGS,
  ...DEFAULT_SHORTCUT_SETTINGS,
});

export const DEFAULT_RESET_THEME = Object.freeze({
  text: 'rgba(255, 255, 255, 0.75)',
  hoverBg: 'rgba(255, 255, 255, 0.12)',
  hoverText: '#fff',
});

export const SETTING_LABELS = Object.freeze({
  buttonBg: 'Button background',
  buttonText: 'Button text',
  buttonHoverBg: 'Button hover background',
  buttonHoverText: 'Button hover text',
  buttonActiveBg: 'Button active background',
  buttonDisabledOpacity: 'Button disabled opacity',
  closeButtonBg: 'Close button background',
  closeButtonText: 'Close button text',
  closeButtonHoverBg: 'Close hover background',
  closeButtonHoverText: 'Close hover text',
  activationShortcut: 'Activation shortcut',
  hideControlsByDefault: 'Hide controls by default',
  toggleControlsKey: 'Toggle controls shortcut',
});

export const COLOR_KEYS = [
  'buttonBg',
  'buttonText',
  'buttonHoverBg',
  'buttonHoverText',
  'buttonActiveBg',
  'closeButtonBg',
  'closeButtonText',
  'closeButtonHoverBg',
  'closeButtonHoverText',
] as const;

export const COLOR_KEY_SET = new Set<string>(COLOR_KEYS);

export const THEME_SETTING_KEYS = [
  ...COLOR_KEYS,
  'buttonDisabledOpacity',
] as const;

export const SHORTCUT_SETTING_KEYS = [
  'activationShortcut',
  'hideControlsByDefault',
  'toggleControlsKey',
] as const;

export const STORED_SETTING_KEYS = [
  ...THEME_SETTING_KEYS,
  ...SHORTCUT_SETTING_KEYS,
] as const;

export type ThemeSettingKey = (typeof THEME_SETTING_KEYS)[number];
export type ShortcutSettingKey = (typeof SHORTCUT_SETTING_KEYS)[number];
export type StoredSettingKey = (typeof STORED_SETTING_KEYS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseColorSetting(value: unknown, fallback: string): string {
  return typeof value === 'string' && isValidCssColor(value.trim())
    ? value.trim()
    : fallback;
}

function parseDisabledOpacity(value: unknown): number {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numeric)
    ? clamp(numeric, 0, 1)
    : DEFAULT_THEME_SETTINGS.buttonDisabledOpacity;
}

function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return fallback;
}

export function parseThemeSettings(rawSettings: unknown): ThemeSettings {
  const settings = readRecord(rawSettings);

  return {
    buttonBg: parseColorSetting(
      settings.buttonBg,
      DEFAULT_THEME_SETTINGS.buttonBg,
    ),
    buttonText: parseColorSetting(
      settings.buttonText,
      DEFAULT_THEME_SETTINGS.buttonText,
    ),
    buttonHoverBg: parseColorSetting(
      settings.buttonHoverBg,
      DEFAULT_THEME_SETTINGS.buttonHoverBg,
    ),
    buttonHoverText: parseColorSetting(
      settings.buttonHoverText,
      DEFAULT_THEME_SETTINGS.buttonHoverText,
    ),
    buttonActiveBg: parseColorSetting(
      settings.buttonActiveBg,
      DEFAULT_THEME_SETTINGS.buttonActiveBg,
    ),
    buttonDisabledOpacity: parseDisabledOpacity(settings.buttonDisabledOpacity),
    closeButtonBg: parseColorSetting(
      settings.closeButtonBg,
      DEFAULT_THEME_SETTINGS.closeButtonBg,
    ),
    closeButtonText: parseColorSetting(
      settings.closeButtonText,
      DEFAULT_THEME_SETTINGS.closeButtonText,
    ),
    closeButtonHoverBg: parseColorSetting(
      settings.closeButtonHoverBg,
      DEFAULT_THEME_SETTINGS.closeButtonHoverBg,
    ),
    closeButtonHoverText: parseColorSetting(
      settings.closeButtonHoverText,
      DEFAULT_THEME_SETTINGS.closeButtonHoverText,
    ),
  };
}

export function parseShortcutSettings(rawSettings: unknown): ShortcutSettings {
  const settings = readRecord(rawSettings);
  const toggleControlsKey = normalizeShortcutKey(settings.toggleControlsKey);

  return {
    activationShortcut: isActivationShortcut(settings.activationShortcut)
      ? settings.activationShortcut
      : DEFAULT_SHORTCUT_SETTINGS.activationShortcut,
    hideControlsByDefault: parseBooleanSetting(
      settings.hideControlsByDefault,
      DEFAULT_SHORTCUT_SETTINGS.hideControlsByDefault,
    ),
    toggleControlsKey:
      toggleControlsKey || DEFAULT_SHORTCUT_SETTINGS.toggleControlsKey,
  };
}

export function parseSettings(rawSettings: unknown): ExtensionSettings {
  return {
    ...parseThemeSettings(rawSettings),
    ...parseShortcutSettings(rawSettings),
  };
}

export function parseThemeSettingsPatch(
  rawSettings: unknown,
): Partial<ThemeSettings> {
  const settings = readRecord(rawSettings);
  const patch: Partial<ThemeSettings> = {};

  for (const key of COLOR_KEYS) {
    if (key in settings) {
      patch[key] = parseColorSetting(
        settings[key],
        DEFAULT_THEME_SETTINGS[key],
      );
    }
  }

  if ('buttonDisabledOpacity' in settings) {
    patch.buttonDisabledOpacity = parseDisabledOpacity(
      settings.buttonDisabledOpacity,
    );
  }

  return patch;
}

export function parseShortcutSettingsPatch(
  rawSettings: unknown,
): Partial<ShortcutSettings> {
  const settings = readRecord(rawSettings);
  const patch: Partial<ShortcutSettings> = {};

  if ('activationShortcut' in settings) {
    patch.activationShortcut = isActivationShortcut(settings.activationShortcut)
      ? settings.activationShortcut
      : DEFAULT_SHORTCUT_SETTINGS.activationShortcut;
  }

  if ('hideControlsByDefault' in settings) {
    patch.hideControlsByDefault = parseBooleanSetting(
      settings.hideControlsByDefault,
      DEFAULT_SHORTCUT_SETTINGS.hideControlsByDefault,
    );
  }

  if ('toggleControlsKey' in settings) {
    patch.toggleControlsKey =
      normalizeShortcutKey(settings.toggleControlsKey) ||
      DEFAULT_SHORTCUT_SETTINGS.toggleControlsKey;
  }

  return patch;
}
