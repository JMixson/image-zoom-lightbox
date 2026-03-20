import { type CSSProperties } from 'react';

import { type StoredSettingKey, DEFAULT_THEME_SETTINGS } from '@/utils/settings';
import {
  formatRgba,
  parseCssColor,
  parseHexColor,
  rgbToHex,
} from '@/utils/colors';
import { type ColorKey } from '@/types/colorTypes';

export type ColorFieldValue = {
  alpha: number;
  value: string;
};

type ColorFieldProps = ColorFieldValue & {
  ariaLabel: string;
  disabled: boolean;
  fieldKey: ColorKey;
  label: string;
  onChange: (key: ColorKey, value: string) => void;
  onReset: (key: StoredSettingKey) => void;
};

function getColorDisplayValue(
  key: ColorKey,
  hexValue: string,
  alpha: number,
): string {
  const rgb = parseHexColor(hexValue);

  if (!rgb) {
    const fallback = parseCssColor(DEFAULT_THEME_SETTINGS[key]);
    return fallback
      ? formatRgba(fallback.r, fallback.g, fallback.b, fallback.a)
      : 'rgba(0, 0, 0, 1)';
  }

  return formatRgba(rgb.r, rgb.g, rgb.b, alpha);
}

function getColorPickerValue(key: ColorKey, value: string): string {
  if (parseHexColor(value)) {
    return value;
  }

  const fallback = parseCssColor(DEFAULT_THEME_SETTINGS[key]);
  return fallback ? rgbToHex(fallback.r, fallback.g, fallback.b) : '#000000';
}

function ColorField({
  alpha,
  ariaLabel,
  disabled,
  fieldKey,
  label,
  onChange,
  onReset,
  value,
}: ColorFieldProps) {
  const displayValue = getColorDisplayValue(fieldKey, value, alpha);

  return (
    <div className="field">
      <label htmlFor={fieldKey}>{label}</label>
      <div className="field-control">
        <div className="color-display">
          <span
            className="color-swatch"
            aria-hidden="true"
            style={{ '--swatch-color': displayValue } as CSSProperties}
            title={displayValue}
          />
          <span className="color-value" title={displayValue}>
            {displayValue}
          </span>
          <input
            id={fieldKey}
            className="color-picker-native"
            type="color"
            name={fieldKey}
            aria-label={ariaLabel}
            disabled={disabled}
            onChange={event => onChange(fieldKey, event.target.value)}
            value={getColorPickerValue(fieldKey, value)}
          />
        </div>
        <button
          type="button"
          className="field-reset"
          disabled={disabled}
          onClick={() => onReset(fieldKey)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default ColorField;
