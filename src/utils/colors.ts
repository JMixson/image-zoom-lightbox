export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type RgbaColor = RgbColor & {
  a: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toHexChannel(value: number): string {
  const channel = clamp(Math.round(value), 0, 255);
  return channel.toString(16).padStart(2, '0');
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

export function parseHexColor(value: string): RgbColor | null {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }

  return {
    r: Number.parseInt(match[1].slice(0, 2), 16),
    g: Number.parseInt(match[1].slice(2, 4), 16),
    b: Number.parseInt(match[1].slice(4, 6), 16),
  };
}

function parseCssChannel(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith('%')) {
    const numeric = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(numeric)
      ? clamp((numeric / 100) * 255, 0, 255)
      : null;
  }

  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 255) : null;
}

function parseCssAlpha(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith('%')) {
    const numeric = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(numeric) ? clamp(numeric / 100, 0, 1) : null;
  }

  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : null;
}

function parseHexCssColor(value: string): RgbaColor | null {
  const match = value.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) {
    return null;
  }

  const shorthand = match[1].length === 3 || match[1].length === 4;
  const normalized = shorthand
    ? [...match[1]].map(channel => channel + channel).join('')
    : match[1];

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a:
      normalized.length === 8
        ? Number.parseInt(normalized.slice(6, 8), 16) / 255
        : 1,
  };
}

function parseRgbCssColor(value: string): RgbaColor | null {
  const rgbMatch = value.trim().match(/^rgba?\((.+)\)$/i);
  if (!rgbMatch) {
    return null;
  }

  const body = rgbMatch[1].trim();
  let channels: string[] = [];
  let alphaToken: string | null = null;

  if (body.includes(',')) {
    const parts = body.split(',').map(part => part.trim());
    if (parts.length < 3 || parts.length > 4) {
      return null;
    }

    channels = parts.slice(0, 3);
    alphaToken = parts[3] ?? null;
  } else {
    const slashParts = body.split('/').map(part => part.trim());
    if (slashParts.length > 2) {
      return null;
    }

    channels = slashParts[0].split(/\s+/).filter(Boolean);
    if (channels.length !== 3) {
      return null;
    }

    alphaToken = slashParts[1] ?? null;
  }

  const [rToken, gToken, bToken] = channels;
  const r = parseCssChannel(rToken);
  const g = parseCssChannel(gToken);
  const b = parseCssChannel(bToken);
  const a = alphaToken === null ? 1 : parseCssAlpha(alphaToken);

  if (
    r === null ||
    g === null ||
    b === null ||
    a === null ||
    ![r, g, b, a].every(Number.isFinite)
  ) {
    return null;
  }

  return { r, g, b, a };
}

export function isValidCssColor(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('color', trimmed)
    : false;
}

export function parseCssColor(value: string): RgbaColor | null {
  if (!isValidCssColor(value)) {
    return null;
  }

  return parseHexCssColor(value) ?? parseRgbCssColor(value);
}

export function formatRgba(r: number, g: number, b: number, a: number): string {
  const roundedAlpha = Math.round(clamp(a, 0, 1) * 1000) / 1000;
  return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${roundedAlpha})`;
}

export function normalizeDisplayColor(value: string, fallback: string): string {
  const parsed = parseCssColor(value) ?? parseCssColor(fallback);
  if (!parsed) {
    return 'rgba(0, 0, 0, 1)';
  }

  return formatRgba(parsed.r, parsed.g, parsed.b, parsed.a);
}
