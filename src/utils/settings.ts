import { z } from 'zod';

import { clamp, isValidCssColor } from './colors';
import {
  activationShortcutSchema,
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

function createColorSchema<TFallback extends string>(fallback: TFallback) {
  return z
    .string()
    .trim()
    .refine(isValidCssColor)
    .catch(fallback);
}

const themeSettingsSchema = z.object({
  buttonBg: createColorSchema(DEFAULT_THEME_SETTINGS.buttonBg),
  buttonText: createColorSchema(DEFAULT_THEME_SETTINGS.buttonText),
  buttonHoverBg: createColorSchema(DEFAULT_THEME_SETTINGS.buttonHoverBg),
  buttonHoverText: createColorSchema(DEFAULT_THEME_SETTINGS.buttonHoverText),
  buttonActiveBg: createColorSchema(DEFAULT_THEME_SETTINGS.buttonActiveBg),
  buttonDisabledOpacity: z.coerce
    .number()
    .transform(value => clamp(value, 0, 1))
    .catch(DEFAULT_THEME_SETTINGS.buttonDisabledOpacity),
  closeButtonBg: createColorSchema(DEFAULT_THEME_SETTINGS.closeButtonBg),
  closeButtonText: createColorSchema(DEFAULT_THEME_SETTINGS.closeButtonText),
  closeButtonHoverBg: createColorSchema(DEFAULT_THEME_SETTINGS.closeButtonHoverBg),
  closeButtonHoverText: createColorSchema(
    DEFAULT_THEME_SETTINGS.closeButtonHoverText,
  ),
});

const shortcutSettingsSchema = z.object({
  activationShortcut: activationShortcutSchema.catch(
    DEFAULT_SHORTCUT_SETTINGS.activationShortcut,
  ),
  hideControlsByDefault: z.coerce
    .boolean()
    .catch(DEFAULT_SHORTCUT_SETTINGS.hideControlsByDefault),
  toggleControlsKey: z
    .unknown()
    .transform(value => normalizeShortcutKey(value))
    .transform(
      value => value || DEFAULT_SHORTCUT_SETTINGS.toggleControlsKey,
    ),
});

const partialThemeSettingsSchema = themeSettingsSchema.partial();
const partialShortcutSettingsSchema = shortcutSettingsSchema.partial();

export function parseThemeSettings(rawSettings: unknown): ThemeSettings {
  return themeSettingsSchema.parse(rawSettings ?? {});
}

export function parseShortcutSettings(rawSettings: unknown): ShortcutSettings {
  return shortcutSettingsSchema.parse(rawSettings ?? {});
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
  return partialThemeSettingsSchema.parse(rawSettings ?? {});
}

export function parseShortcutSettingsPatch(
  rawSettings: unknown,
): Partial<ShortcutSettings> {
  return partialShortcutSettingsSchema.parse(rawSettings ?? {});
}
