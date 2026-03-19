import { ACTIVATION_SHORTCUTS, normalizeShortcutKey } from '@/utils/shortcuts';
import type { ShortcutSettings } from '@/utils/settings';

type ActivationDetectorOptions = {
  doubleActivationMs?: number;
  performanceRef?: Performance;
};

export class ActivationDetector {
  private readonly doubleActivationMs: number;
  private readonly performanceRef: Performance;

  private lastActivationTs = 0;
  private shortcutSettings: ShortcutSettings;

  constructor(
    shortcutSettings: ShortcutSettings,
    options: ActivationDetectorOptions = {},
  ) {
    this.doubleActivationMs = options.doubleActivationMs ?? 350;
    this.performanceRef = options.performanceRef ?? performance;
    this.shortcutSettings = shortcutSettings;
  }

  updateShortcutSettings(settings: ShortcutSettings): void {
    if (
      this.shortcutSettings.activationShortcut !== settings.activationShortcut
    ) {
      this.lastActivationTs = 0;
    }

    this.shortcutSettings = settings;
  }

  isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }

    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  matchesToggleControls(event: KeyboardEvent): boolean {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    const key = normalizeShortcutKey(event.key);
    return !!key && key === this.shortcutSettings.toggleControlsKey;
  }

  shouldActivate(event: KeyboardEvent): boolean {
    if (!this.isActivationShortcutEvent(event)) {
      return false;
    }

    const now = this.performanceRef.now();
    const delta = now - this.lastActivationTs;
    this.lastActivationTs = now;

    return delta <= this.doubleActivationMs;
  }

  private isActivationShortcutEvent(event: KeyboardEvent): boolean {
    if (event.repeat) {
      return false;
    }

    switch (this.shortcutSettings.activationShortcut) {
      case 'double_shift':
        return (
          event.key === ACTIVATION_SHORTCUTS.double_shift &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        );
      case 'double_meta':
        return (
          event.key === ACTIVATION_SHORTCUTS.double_meta &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        );
      case 'double_ctrl':
      default:
        return (
          event.key === ACTIVATION_SHORTCUTS.double_ctrl &&
          !event.shiftKey &&
          !event.altKey &&
          !event.metaKey
        );
    }
  }
}
