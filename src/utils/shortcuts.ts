import { z } from 'zod';

export const ACTIVATION_SHORTCUTS = Object.freeze({
  double_ctrl: 'Control',
  double_shift: 'Shift',
  double_meta: 'Meta',
});

export const activationShortcutSchema = z.enum([
  'double_ctrl',
  'double_shift',
  'double_meta',
]);

export type ActivationShortcut = z.infer<typeof activationShortcutSchema>;

export const ACTIVATION_SHORTCUT_KEYS =
  activationShortcutSchema.options satisfies readonly ActivationShortcut[];

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
