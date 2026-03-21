import {
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

import {
  type StoredSettingKey,
  DEFAULT_THEME_SETTINGS,
} from '@/utils/settings';
import {
  formatRgba,
  parseCssColor,
  parseHexColor,
  rgbToHex,
} from '@/utils/colors';
import { clamp } from '@/utils/math';
import { type ColorKey, type EditableColorValue } from '@/types/colorTypes';
import { type ColorFieldChangeHandler } from '@/types/formTypes';

type ColorFieldProps = {
  ariaLabel: string;
  disabled: boolean;
  fieldKey: ColorKey;
  label: string;
  onChange: ColorFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
  value: EditableColorValue;
};

function getColorDisplayValue(
  key: ColorKey,
  color: EditableColorValue,
): string {
  const rgb = parseHexColor(color.hex);
  const alpha = clamp(color.alpha, 0, 1);

  if (!rgb) {
    const fallback = parseCssColor(DEFAULT_THEME_SETTINGS[key]);
    return fallback
      ? formatRgba(fallback.r, fallback.g, fallback.b, alpha)
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

function formatAlphaValue(alpha: number): string {
  const rounded = Math.round(clamp(alpha, 0, 1) * 100) / 100;

  if (rounded === 0 || rounded === 1) {
    return rounded.toFixed(1);
  }

  return rounded.toFixed(2).replace(/0$/, '');
}

function getSliderTrackColor(key: ColorKey, hex: string): string {
  const rgb = parseHexColor(hex);
  if (rgb) {
    return hex;
  }

  const fallback = parseCssColor(DEFAULT_THEME_SETTINGS[key]);
  return fallback ? rgbToHex(fallback.r, fallback.g, fallback.b) : '#000000';
}

function ColorField({
  ariaLabel,
  disabled,
  fieldKey,
  label,
  onChange,
  onReset,
  value,
}: ColorFieldProps) {
  const normalizedAlpha = clamp(value.alpha, 0, 1);
  const alphaPercent = Math.round(normalizedAlpha * 100);
  const displayValue = getColorDisplayValue(fieldKey, value);
  const alphaId = `${fieldKey}-alpha`;
  const alphaInputId = `${fieldKey}-alpha-input`;
  const trackColor = getSliderTrackColor(fieldKey, value.hex);

  const [alphaInputValue, setAlphaInputValue] = useState<string | null>(null);

  function commitAlphaInput(raw: string): void {
    setAlphaInputValue(null);
    const parsed = Number.parseFloat(raw);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const clamped = clamp(parsed, 0, 1);

    if (clamped !== normalizedAlpha) {
      onChange(fieldKey, { ...value, alpha: clamped });
    }
  }

  function handleAlphaInputChange(event: ChangeEvent<HTMLInputElement>): void {
    setAlphaInputValue(event.target.value);
  }

  function handleAlphaInputBlur(): void {
    if (alphaInputValue !== null) {
      commitAlphaInput(alphaInputValue);
    }
  }

  function handleAlphaInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitAlphaInput(event.currentTarget.value);
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      setAlphaInputValue(null);
      event.currentTarget.blur();
    }
  }

  return (
    <div className="field">
      <label htmlFor={fieldKey}>{label}</label>
      <div className="color-field-stack">
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
              onChange={event =>
                onChange(fieldKey, {
                  ...value,
                  hex: event.target.value,
                })
              }
              value={getColorPickerValue(fieldKey, value.hex)}
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
        <div
          className="alpha-row"
          style={{ '--alpha-track-color': trackColor } as CSSProperties}
        >
          <label htmlFor={alphaId} className="alpha-label">
            Opacity
          </label>
          <input
            id={alphaId}
            className="alpha-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            name={alphaId}
            aria-label={`${label} alpha`}
            disabled={disabled}
            onChange={event =>
              onChange(fieldKey, {
                ...value,
                alpha: Number(event.target.value) / 100,
              })
            }
            value={alphaPercent}
          />
          <input
            id={alphaInputId}
            className="alpha-value-input"
            type="number"
            min={0}
            max={1}
            step={0.01}
            disabled={disabled}
            aria-label={`${label} alpha value`}
            value={alphaInputValue ?? formatAlphaValue(normalizedAlpha)}
            onChange={handleAlphaInputChange}
            onBlur={handleAlphaInputBlur}
            onKeyDown={handleAlphaInputKeyDown}
          />
        </div>
      </div>
    </div>
  );
}

export default ColorField;
