import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  type ExtensionSettings,
  type ShortcutSettings,
  type ThemeSettings,
} from '@/utils/settings';
import { setStoredSettings } from '@/utils/settingsStorage';
import { SettingsManager } from './SettingsManager';

describe('SettingsManager', () => {
  it('loads stored settings and invokes callbacks with parsed values', async () => {
    const onThemeChange = vi.fn();
    const onShortcutChange = vi.fn();
    const manager = new SettingsManager({
      onThemeChange,
      onShortcutChange,
    });

    await setStoredSettings({
      buttonBg: '#112233',
      buttonDisabledOpacity: 0.6,
      activationShortcut: 'double_shift',
      hideControlsByDefault: true,
      toggleControlsKey: ' Z ',
    });

    await manager.load();

    expect(manager.getThemeSettings()).toEqual({
      ...DEFAULT_THEME_SETTINGS,
      buttonBg: '#112233',
      buttonDisabledOpacity: 0.6,
    });
    expect(manager.getShortcutSettings()).toEqual({
      ...DEFAULT_SHORTCUT_SETTINGS,
      activationShortcut: 'double_shift',
      hideControlsByDefault: true,
      toggleControlsKey: 'z',
    });
    expect(onThemeChange).toHaveBeenCalledOnce();
    expect(onThemeChange).toHaveBeenCalledWith(manager.getThemeSettings());
    expect(onShortcutChange).toHaveBeenCalledOnce();
    expect(onShortcutChange).toHaveBeenCalledWith(
      manager.getShortcutSettings(),
    );
  });

  it('caches the in-flight load promise', async () => {
    const manager = new SettingsManager();

    const firstLoad = manager.load();
    const secondLoad = manager.load();

    expect(secondLoad).toBe(firstLoad);

    await expect(firstLoad).resolves.toBeUndefined();

    const thirdLoad = manager.load();

    expect(thirdLoad).toBe(firstLoad);
  });

  it('applies theme and shortcut patches while watching storage changes', async () => {
    const onThemeChange = vi.fn();
    const onShortcutChange = vi.fn();
    const manager = new SettingsManager({
      onThemeChange,
      onShortcutChange,
    });
    const stopWatching = manager.startWatching();

    await setStoredSettings({
      buttonBg: '#445566',
      buttonDisabledOpacity: 0.4,
      hideControlsByDefault: true,
      toggleControlsKey: ' Q ',
    });

    expect(manager.getThemeSettings()).toEqual({
      ...DEFAULT_THEME_SETTINGS,
      buttonBg: '#445566',
      buttonDisabledOpacity: 0.4,
    });
    expect(manager.getShortcutSettings()).toEqual({
      ...DEFAULT_SHORTCUT_SETTINGS,
      hideControlsByDefault: true,
      toggleControlsKey: 'q',
    });
    expect(onThemeChange).toHaveBeenCalledTimes(2);
    expect(onThemeChange).toHaveBeenLastCalledWith(
      manager.getThemeSettings(),
    );
    expect(onShortcutChange).toHaveBeenCalledTimes(2);
    expect(onShortcutChange).toHaveBeenLastCalledWith(
      manager.getShortcutSettings(),
    );

    stopWatching();
  });

  it('stops applying patches after watching is stopped', async () => {
    const onThemeChange = vi.fn();
    const onShortcutChange = vi.fn();
    const manager = new SettingsManager({
      onThemeChange,
      onShortcutChange,
    });
    const stopWatching = manager.startWatching();

    await setStoredSettings({
      buttonBg: '#111111',
      toggleControlsKey: ' J ',
    });

    expect(manager.getThemeSettings().buttonBg).toBe('#111111');
    expect(manager.getShortcutSettings().toggleControlsKey).toBe('j');

    const themeCallsBeforeStop = onThemeChange.mock.calls.length;
    const shortcutCallsBeforeStop = onShortcutChange.mock.calls.length;

    stopWatching();

    await setStoredSettings({
      buttonBg: '#222222',
      toggleControlsKey: ' K ',
    });

    expect(onThemeChange).toHaveBeenCalledTimes(themeCallsBeforeStop);
    expect(onShortcutChange).toHaveBeenCalledTimes(shortcutCallsBeforeStop);
    expect(manager.getThemeSettings().buttonBg).toBe('#111111');
    expect(manager.getShortcutSettings().toggleControlsKey).toBe('j');
  });
});

describe('SettingsManager mocked storage behavior', () => {
  afterEach(() => {
    vi.doUnmock('@/utils/settingsStorage');
    vi.resetModules();
  });

  it('retries after a rejected load', async () => {
    const getStoredSettings = vi
      .fn<() => Promise<ExtensionSettings>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        ...DEFAULT_SETTINGS,
        buttonBg: '#abcdef',
      });

    vi.resetModules();
    vi.doMock('@/utils/settingsStorage', () => ({
      getStoredSettings,
      watchShortcutSettings: vi.fn(),
      watchThemeSettings: vi.fn(),
    }));

    const { SettingsManager: MockedSettingsManager } = await import(
      './SettingsManager'
    );
    const manager = new MockedSettingsManager();

    await expect(manager.load()).resolves.toBeUndefined();
    await expect(manager.load()).resolves.toBeUndefined();

    expect(getStoredSettings).toHaveBeenCalledTimes(2);
    expect(manager.getThemeSettings()).toEqual({
      ...DEFAULT_THEME_SETTINGS,
      buttonBg: '#abcdef',
    });
  });

  it('ignores empty theme and shortcut patches from watchers', async () => {
    const onThemeChange = vi.fn();
    const onShortcutChange = vi.fn();
    const unwatchThemeSettings = vi.fn();
    const unwatchShortcutSettings = vi.fn();
    const watchThemeSettings = vi.fn(
      (callback: (patch: Partial<ThemeSettings>) => void) => {
        callback({});
        return unwatchThemeSettings;
      },
    );
    const watchShortcutSettings = vi.fn(
      (callback: (patch: Partial<ShortcutSettings>) => void) => {
        callback({});
        return unwatchShortcutSettings;
      },
    );

    vi.resetModules();
    vi.doMock('@/utils/settingsStorage', () => ({
      getStoredSettings: vi.fn(),
      watchShortcutSettings,
      watchThemeSettings,
    }));

    const { SettingsManager: MockedSettingsManager } = await import(
      './SettingsManager'
    );
    const manager = new MockedSettingsManager({
      onThemeChange,
      onShortcutChange,
    });

    const stopWatching = manager.startWatching();

    expect(onThemeChange).not.toHaveBeenCalled();
    expect(onShortcutChange).not.toHaveBeenCalled();
    expect(manager.getThemeSettings()).toEqual(DEFAULT_THEME_SETTINGS);
    expect(manager.getShortcutSettings()).toEqual(DEFAULT_SHORTCUT_SETTINGS);

    stopWatching();

    expect(unwatchThemeSettings).toHaveBeenCalledOnce();
    expect(unwatchShortcutSettings).toHaveBeenCalledOnce();
  });
});
