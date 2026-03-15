export const ACTIVATION_SHORTCUTS = Object.freeze({
  double_ctrl: 'Control',
  double_shift: 'Shift',
  double_meta: 'Meta',
});

export const ACTIVATION_SHORTCUT_KEYS = [
  'double_ctrl',
  'double_shift',
  'double_meta',
] as const;

export type ActivationShortcut = (typeof ACTIVATION_SHORTCUT_KEYS)[number];

const ACTIVATION_SHORTCUT_KEY_SET = new Set<string>(ACTIVATION_SHORTCUT_KEYS);

export function isActivationShortcut(value: unknown): value is ActivationShortcut {
  return (
    typeof value === 'string' &&
    ACTIVATION_SHORTCUT_KEY_SET.has(value)
  );
}

export function normalizeShortcutKey(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.slice(0, 1).toLowerCase();
}
