import { describe, expect, it } from 'vitest';

import {
  formatRgba,
  normalizeDisplayColor,
  parseCssColor,
  parseHexColor,
} from './colors';

describe('parseHexColor', () => {
  it('accepts valid 6-digit hex values', () => {
    expect(parseHexColor('  #1a2B3c  ')).toEqual({
      r: 26,
      g: 43,
      b: 60,
    });
  });

  it('rejects invalid input', () => {
    expect(parseHexColor('#abc')).toBeNull();
    expect(parseHexColor('123456')).toBeNull();
  });
});

describe('parseCssColor', () => {
  it.each([
    ['rgb(10, 20, 30)', { r: 10, g: 20, b: 30, a: 1 }],
    ['rgba(10 20 30 / 50%)', { r: 10, g: 20, b: 30, a: 0.5 }],
    ['#abcd', { r: 170, g: 187, b: 204, a: 221 / 255 }],
  ])('accepts supported color format %s', (value, expected) => {
    expect(parseCssColor(value)).toEqual(expected);
  });

  it.each(['not-a-color', 'rgb(10, 20)', 'hsl(0 0% 0%)'])(
    'returns null for invalid CSS color %s',
    value => {
      expect(parseCssColor(value)).toBeNull();
    },
  );
});

describe('formatRgba', () => {
  it('rounds and clamps channels and alpha', () => {
    expect(formatRgba(255.6, -2, 127.4, 1.2345)).toBe('rgba(255, 0, 127, 1)');
    expect(formatRgba(10.49, 10.5, 10.51, 0.3336)).toBe(
      'rgba(10, 11, 11, 0.334)',
    );
  });
});

describe('normalizeDisplayColor', () => {
  it('falls back when the input color is invalid', () => {
    expect(normalizeDisplayColor('bad-value', '#00000080')).toBe(
      'rgba(0, 0, 0, 0.502)',
    );
  });

  it('returns opaque black when both colors are invalid', () => {
    expect(normalizeDisplayColor('bad-value', 'also-bad')).toBe(
      'rgba(0, 0, 0, 1)',
    );
  });
});
