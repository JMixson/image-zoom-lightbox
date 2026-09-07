import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  type ExtensionSettings,
} from '@/utils/settings';
import * as settingsStorage from '@/utils/settingsStorage';
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

  it('loads settings once for concurrent and subsequent callers', async () => {
    let resolve!: (settings: ExtensionSettings) => void;
    const getStoredSettings = vi.spyOn(settingsStorage, 'getStoredSettings')
      .mockReturnValue(new Promise(done => { resolve = done; }));
    const onThemeChange = vi.fn();
    const manager = new SettingsManager({ onThemeChange });

    const firstLoad = manager.load();
    const secondLoad = manager.load();

    expect(getStoredSettings).toHaveBeenCalledOnce();
    resolve({ ...DEFAULT_SETTINGS, buttonBg: '#abcdef' });
    await Promise.all([firstLoad, secondLoad]);
    await manager.load();

    expect(getStoredSettings).toHaveBeenCalledOnce();
    expect(onThemeChange).toHaveBeenCalledOnce();
    expect(manager.getThemeSettings().buttonBg).toBe('#abcdef');
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
    expect(onThemeChange).toHaveBeenLastCalledWith(
      manager.getThemeSettings(),
    );
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

  it('retries after a rejected load', async () => {
    const getStoredSettings = vi.spyOn(settingsStorage, 'getStoredSettings')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        ...DEFAULT_SETTINGS,
        buttonBg: '#abcdef',
      });

    const manager = new SettingsManager();

    await expect(manager.load()).resolves.toBeUndefined();
    await expect(manager.load()).resolves.toBeUndefined();

    expect(getStoredSettings).toHaveBeenCalledTimes(2);
    expect(manager.getThemeSettings()).toEqual({
      ...DEFAULT_THEME_SETTINGS,
      buttonBg: '#abcdef',
    });
  });
});
