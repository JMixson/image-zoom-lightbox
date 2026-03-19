import {
  DEFAULT_SHORTCUT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  parseShortcutSettings,
  parseThemeSettings,
  type ShortcutSettings,
  type ThemeSettings,
} from '@/utils/settings';
import {
  getStoredSettings,
  watchShortcutSettings,
  watchThemeSettings,
} from '@/utils/settingsStorage';

type SettingsManagerOptions = {
  onThemeChange?: (settings: ThemeSettings) => void;
  onShortcutChange?: (settings: ShortcutSettings) => void;
};

export class SettingsManager {
  private callbacks: SettingsManagerOptions;
  private currentThemeSettings: ThemeSettings = { ...DEFAULT_THEME_SETTINGS };
  private currentShortcutSettings: ShortcutSettings = {
    ...DEFAULT_SHORTCUT_SETTINGS,
  };
  private storedSettingsLoadPromise: Promise<void> | null = null;

  constructor(options: SettingsManagerOptions = {}) {
    this.callbacks = { ...options };
  }

  getThemeSettings(): ThemeSettings {
    return this.currentThemeSettings;
  }

  getShortcutSettings(): ShortcutSettings {
    return this.currentShortcutSettings;
  }

  setCallbacks(callbacks: SettingsManagerOptions): void {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks,
    };
  }

  load(): Promise<void> {
    if (this.storedSettingsLoadPromise) {
      return this.storedSettingsLoadPromise;
    }

    this.storedSettingsLoadPromise = getStoredSettings()
      .then(settings => {
        this.currentThemeSettings = parseThemeSettings(settings);
        this.callbacks.onThemeChange?.(this.currentThemeSettings);
        this.applyShortcutSettings(parseShortcutSettings(settings));
      })
      .catch(() => {
        this.storedSettingsLoadPromise = null;
      });

    return this.storedSettingsLoadPromise;
  }

  startWatching(): () => void {
    const unwatchThemeSettings = watchThemeSettings(patch => {
      if (Object.keys(patch).length === 0) {
        return;
      }

      this.currentThemeSettings = parseThemeSettings({
        ...this.currentThemeSettings,
        ...patch,
      });
      this.callbacks.onThemeChange?.(this.currentThemeSettings);
    });

    const unwatchShortcutSettings = watchShortcutSettings(patch => {
      if (Object.keys(patch).length === 0) {
        return;
      }

      this.applyShortcutSettings(
        parseShortcutSettings({
          ...this.currentShortcutSettings,
          ...patch,
        }),
      );
    });

    return () => {
      unwatchThemeSettings();
      unwatchShortcutSettings();
    };
  }

  private applyShortcutSettings(settings: ShortcutSettings): void {
    this.currentShortcutSettings = settings;
    this.callbacks.onShortcutChange?.(this.currentShortcutSettings);
  }
}
