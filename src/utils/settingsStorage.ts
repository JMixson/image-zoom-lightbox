import { storage } from 'wxt/utils/storage';

import {
  DEFAULT_SETTINGS,
  SHORTCUT_SETTING_KEYS,
  STORED_SETTING_KEYS,
  THEME_SETTING_KEYS,
  parseShortcutSettingsPatch,
  parseSettings,
  parseThemeSettingsPatch,
  type ExtensionSettings,
  type ShortcutSettings,
  type StoredSettingKey,
  type ThemeSettings,
} from './settings';

function defineSettingItem<TKey extends StoredSettingKey>(key: TKey) {
  return storage.defineItem<ExtensionSettings[TKey]>(`sync:${key}`, {
    fallback: DEFAULT_SETTINGS[key],
  });
}

export const SETTINGS_ITEMS = {
  buttonBg: defineSettingItem('buttonBg'),
  buttonText: defineSettingItem('buttonText'),
  buttonHoverBg: defineSettingItem('buttonHoverBg'),
  buttonHoverText: defineSettingItem('buttonHoverText'),
  buttonActiveBg: defineSettingItem('buttonActiveBg'),
  buttonDisabledOpacity: defineSettingItem('buttonDisabledOpacity'),
  closeButtonBg: defineSettingItem('closeButtonBg'),
  closeButtonText: defineSettingItem('closeButtonText'),
  closeButtonHoverBg: defineSettingItem('closeButtonHoverBg'),
  closeButtonHoverText: defineSettingItem('closeButtonHoverText'),
  activationShortcut: defineSettingItem('activationShortcut'),
  hideControlsByDefault: defineSettingItem('hideControlsByDefault'),
  toggleControlsKey: defineSettingItem('toggleControlsKey'),
} as const satisfies Record<
  StoredSettingKey,
  ReturnType<typeof defineSettingItem>
>;

async function readStoredValues<TKey extends StoredSettingKey>(
  keys: readonly TKey[],
): Promise<Record<TKey, unknown>> {
  const items = keys.map(key => SETTINGS_ITEMS[key]);
  const entries = await storage.getItems(items);

  // Create a map from item key to value for resilient keyed lookup
  const valuesByKey = new Map(
    entries.map((entry, index) => [items[index].key, entry?.value]),
  );

  return Object.fromEntries(
    keys.map(key => [key, valuesByKey.get(SETTINGS_ITEMS[key].key)]),
  ) as Record<TKey, unknown>;
}

export async function getStoredSettings(): Promise<ExtensionSettings> {
  return parseSettings(await readStoredValues(STORED_SETTING_KEYS));
}

export async function setStoredSetting<TKey extends StoredSettingKey>(
  key: TKey,
  value: ExtensionSettings[TKey],
): Promise<void> {
  await storage.setItems([{ item: SETTINGS_ITEMS[key], value }]);
}

export async function setStoredSettings(
  settings: Partial<ExtensionSettings>,
): Promise<void> {
  const updates = STORED_SETTING_KEYS.flatMap(key =>
    Object.hasOwn(settings, key)
      ? [{ item: SETTINGS_ITEMS[key], value: settings[key] }]
      : [],
  );

  if (updates.length === 0) {
    return;
  }

  await storage.setItems(updates);
}

export function watchThemeSettings(
  callback: (patch: Partial<ThemeSettings>) => void,
): () => void {
  const unwatchers = THEME_SETTING_KEYS.map(key =>
    SETTINGS_ITEMS[key].watch(newValue => {
      callback(parseThemeSettingsPatch({ [key]: newValue }));
    }),
  );

  return () => {
    unwatchers.forEach(unwatch => unwatch());
  };
}

export function watchShortcutSettings(
  callback: (patch: Partial<ShortcutSettings>) => void,
): () => void {
  const unwatchers = SHORTCUT_SETTING_KEYS.map(key =>
    SETTINGS_ITEMS[key].watch(newValue => {
      callback(parseShortcutSettingsPatch({ [key]: newValue }));
    }),
  );

  return () => {
    unwatchers.forEach(unwatch => unwatch());
  };
}
