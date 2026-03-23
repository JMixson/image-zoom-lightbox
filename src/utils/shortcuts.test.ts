import { describe, expect, it } from 'vitest';

import { isActivationShortcut, normalizeShortcutKey } from './shortcuts';

describe('normalizeShortcutKey', () => {
  it('trims input, lowercases it, and keeps only the first character', () => {
    expect(normalizeShortcutKey('  Shift ')).toBe('s');
    expect(normalizeShortcutKey('H')).toBe('h');
  });

  it('returns an empty string for invalid values', () => {
    expect(normalizeShortcutKey('   ')).toBe('');
    expect(normalizeShortcutKey(null)).toBe('');
    expect(normalizeShortcutKey(5)).toBe('');
  });
});

describe('isActivationShortcut', () => {
  it('accepts only supported shortcut values', () => {
    expect(isActivationShortcut('double_ctrl')).toBe(true);
    expect(isActivationShortcut('double_shift')).toBe(true);
    expect(isActivationShortcut('double_meta')).toBe(true);
    expect(isActivationShortcut('ctrl')).toBe(false);
    expect(isActivationShortcut(null)).toBe(false);
  });
});
