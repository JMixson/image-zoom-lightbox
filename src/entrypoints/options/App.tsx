import {
  useEffect,
  useState,
  type CSSProperties,
  type SubmitEvent,
} from 'react';

import {
  COLOR_KEY_SET,
  COLOR_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  SETTING_LABELS,
  parseSettings,
  type ExtensionSettings,
  type StoredSettingKey,
} from '@/utils/settings';
import {
  formatRgba,
  parseCssColor,
  parseHexColor,
  rgbToHex,
} from '@/utils/colors';
import { normalizeShortcutKey } from '@/utils/shortcuts';
import {
  getStoredSettings,
  setStoredSetting,
  setStoredSettings,
} from '@/utils/settingsStorage';
import { getThemeCssVariables } from '@/utils/theme';
import { type ColorAlphaByKey, type ColorKey } from '@/types/colorTypes';
import { type ColorFieldDefinition, type FormState } from '@/types/formTypes';

type StatusState = {
  isError: boolean;
  message: string;
};

const BUTTON_COLOR_FIELDS: readonly ColorFieldDefinition[] = [
  {
    key: 'buttonBg',
    label: 'Button background',
    ariaLabel: 'Button background color',
  },
  {
    key: 'buttonText',
    label: 'Button text',
    ariaLabel: 'Button text color',
  },
  {
    key: 'buttonHoverBg',
    label: 'Button hover background',
    ariaLabel: 'Button hover background color',
  },
  {
    key: 'buttonHoverText',
    label: 'Button hover text',
    ariaLabel: 'Button hover text color',
  },
  {
    key: 'buttonActiveBg',
    label: 'Button active background',
    ariaLabel: 'Button active background color',
  },
] as const;

const CLOSE_BUTTON_COLOR_FIELDS: readonly ColorFieldDefinition[] = [
  {
    key: 'closeButtonBg',
    label: 'Close button background',
    ariaLabel: 'Close button background color',
  },
  {
    key: 'closeButtonText',
    label: 'Close button text',
    ariaLabel: 'Close button text color',
  },
  {
    key: 'closeButtonHoverBg',
    label: 'Close hover background',
    ariaLabel: 'Close hover background color',
  },
  {
    key: 'closeButtonHoverText',
    label: 'Close hover text',
    ariaLabel: 'Close hover text color',
  },
] as const;

const ERROR_STATUS_COLOR = 'rgba(255, 181, 181, 0.95)';
const SUCCESS_STATUS_COLOR = 'rgba(183, 255, 196, 0.95)';

function settingsToFormState(settings: ExtensionSettings): {
  colorAlphaByKey: ColorAlphaByKey;
  formState: FormState;
} {
  const colorAlphaByKey = {} as ColorAlphaByKey;
  const colorFields = {} as Record<ColorKey, string>;

  for (const key of COLOR_KEYS) {
    const parsed =
      parseCssColor(settings[key]) ??
      parseCssColor(DEFAULT_THEME_SETTINGS[key]);

    if (!parsed) {
      colorFields[key] = '#000000';
      colorAlphaByKey[key] = 1;
      continue;
    }

    colorFields[key] = rgbToHex(parsed.r, parsed.g, parsed.b);
    colorAlphaByKey[key] = parsed.a;
  }

  return {
    colorAlphaByKey,
    formState: {
      ...colorFields,
      activationShortcut: settings.activationShortcut,
      hideControlsByDefault: settings.hideControlsByDefault,
      toggleControlsKey: settings.toggleControlsKey,
      buttonDisabledOpacity: String(settings.buttonDisabledOpacity),
    },
  };
}

function formStateToRawSettings(
  formState: FormState,
  colorAlphaByKey: ColorAlphaByKey,
): Record<string, unknown> {
  const rawSettings: Record<string, unknown> = {
    activationShortcut: formState.activationShortcut,
    hideControlsByDefault: formState.hideControlsByDefault,
    toggleControlsKey: formState.toggleControlsKey,
    buttonDisabledOpacity: formState.buttonDisabledOpacity,
  };

  for (const key of COLOR_KEYS) {
    const rgb = parseHexColor(formState[key]);

    rawSettings[key] = rgb
      ? formatRgba(rgb.r, rgb.g, rgb.b, colorAlphaByKey[key] ?? 1)
      : DEFAULT_THEME_SETTINGS[key];
  }

  return rawSettings;
}

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

function ColorField({
  alpha,
  ariaLabel,
  disabled,
  fieldKey,
  label,
  onChange,
  onReset,
  value,
}: {
  alpha: number;
  ariaLabel: string;
  disabled: boolean;
  fieldKey: ColorKey;
  label: string;
  onChange: (key: ColorKey, value: string) => void;
  onReset: (key: StoredSettingKey) => void;
  value: string;
}) {
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
            value={value}
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

function App() {
  const [status, setStatus] = useState<StatusState>({
    isError: false,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>(
    () => settingsToFormState(DEFAULT_SETTINGS).formState,
  );
  const [colorAlphaByKey, setColorAlphaByKey] = useState<ColorAlphaByKey>(
    () => settingsToFormState(DEFAULT_SETTINGS).colorAlphaByKey,
  );

  const previewSettings = parseSettings(
    formStateToRawSettings(formState, colorAlphaByKey),
  );
  const previewStyle = getThemeCssVariables(previewSettings) as CSSProperties;
  const isFormDisabled = isLoading;

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const initialSettings = await getStoredSettings();
        if (!isActive) {
          return;
        }

        const nextState = settingsToFormState(initialSettings);
        setFormState(nextState.formState);
        setColorAlphaByKey(nextState.colorAlphaByKey);
      } catch {
        if (!isActive) {
          return;
        }

        setStatus({ isError: true, message: 'Failed to load settings.' });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  function setStoredFieldValue(key: StoredSettingKey, value: unknown): void {
    if (COLOR_KEY_SET.has(key)) {
      const colorKey = key as ColorKey;
      const parsed =
        parseCssColor(String(value)) ??
        parseCssColor(DEFAULT_THEME_SETTINGS[colorKey]);

      setFormState(previous => ({
        ...previous,
        [colorKey]: parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : '#000000',
      }));
      setColorAlphaByKey(previous => ({
        ...previous,
        [colorKey]: parsed?.a ?? 1,
      }));
      return;
    }

    if (key === 'hideControlsByDefault') {
      setFormState(previous => ({
        ...previous,
        hideControlsByDefault: Boolean(value),
      }));
      return;
    }

    if (key === 'buttonDisabledOpacity') {
      setFormState(previous => ({
        ...previous,
        buttonDisabledOpacity: String(value),
      }));
      return;
    }

    if (key === 'activationShortcut' || key === 'toggleControlsKey') {
      setFormState(previous => ({
        ...previous,
        [key]: String(value),
      }));
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitizedSettings = parseSettings(
      formStateToRawSettings(formState, colorAlphaByKey),
    );

    try {
      await setStoredSettings(sanitizedSettings);
    } catch {
      setStatus({ isError: true, message: 'Failed to save settings.' });
      return;
    }

    const nextState = settingsToFormState(sanitizedSettings);
    setFormState(nextState.formState);
    setColorAlphaByKey(nextState.colorAlphaByKey);
    setStatus({ isError: false, message: 'Saved.' });
  }

  async function handleResetField(key: StoredSettingKey) {
    const resetValue = DEFAULT_SETTINGS[key];

    try {
      await setStoredSetting(key, resetValue);
    } catch {
      setStatus({ isError: true, message: 'Failed to reset setting.' });
      return;
    }

    setStoredFieldValue(key, resetValue);
    setStatus({ isError: false, message: `${SETTING_LABELS[key]} reset.` });
  }

  async function handleResetDefaults() {
    try {
      await setStoredSettings(DEFAULT_SETTINGS);
    } catch {
      setStatus({ isError: true, message: 'Failed to reset settings.' });
      return;
    }

    const nextState = settingsToFormState(DEFAULT_SETTINGS);
    setFormState(nextState.formState);
    setColorAlphaByKey(nextState.colorAlphaByKey);
    setStatus({ isError: false, message: 'Defaults restored.' });
  }

  return (
    <main className="page">
      <header className="heading">
        <h1>Image Zoom Lightbox Settings</h1>
        <p>
          Customize overlay colors and keyboard behavior. Any invalid value is
          ignored and falls back to the default settings.
        </p>
      </header>
      <form className="panel" noValidate onSubmit={handleSubmit}>
        <section className="settings-group" aria-labelledby="keyboard-heading">
          <h2 id="keyboard-heading" className="settings-group-title">
            Keyboard
          </h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="activationShortcut">Activation shortcut</label>
              <div className="field-control">
                <select
                  id="activationShortcut"
                  className="select-input"
                  name="activationShortcut"
                  aria-label="Activation shortcut"
                  disabled={isFormDisabled}
                  onChange={event =>
                    setFormState(previous => ({
                      ...previous,
                      activationShortcut: event.target
                        .value as ExtensionSettings['activationShortcut'],
                    }))
                  }
                  value={formState.activationShortcut}
                >
                  <option value="double_ctrl">Ctrl + Ctrl</option>
                  <option value="double_shift">Shift + Shift</option>
                  <option value="double_meta">Cmd/Meta + Cmd/Meta</option>
                </select>
                <button
                  type="button"
                  className="field-reset"
                  disabled={isFormDisabled}
                  onClick={() => handleResetField('activationShortcut')}
                >
                  Reset
                </button>
              </div>
              <p className="field-help">
                Choose which supported double-press shortcut opens the lightbox
                while hovering an image.
              </p>
            </div>
            <div className="field">
              <label htmlFor="hideControlsByDefault">
                Hide overlay controls by default
              </label>
              <div className="field-control field-control-toggle">
                <input
                  id="hideControlsByDefault"
                  className="toggle-input"
                  type="checkbox"
                  name="hideControlsByDefault"
                  aria-label="Hide overlay controls by default"
                  checked={formState.hideControlsByDefault}
                  disabled={isFormDisabled}
                  onChange={event =>
                    setFormState(previous => ({
                      ...previous,
                      hideControlsByDefault: event.target.checked,
                    }))
                  }
                />
                <label
                  className="toggle-switch"
                  htmlFor="hideControlsByDefault"
                >
                  <span className="toggle-track" aria-hidden="true" />
                  <span className="toggle-label">Enable</span>
                </label>
              </div>
              <p className="field-help">
                When enabled, the toolbar and close button stay hidden until you
                press the toggle shortcut.
              </p>
            </div>
            <div className="field">
              <label htmlFor="toggleControlsKey">
                Toggle controls shortcut
              </label>
              <div className="field-control">
                <input
                  id="toggleControlsKey"
                  className="shortcut-input"
                  type="text"
                  name="toggleControlsKey"
                  maxLength={1}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  aria-label="Toggle controls shortcut key"
                  disabled={isFormDisabled}
                  onChange={event =>
                    setFormState(previous => ({
                      ...previous,
                      toggleControlsKey: normalizeShortcutKey(
                        event.target.value,
                      ),
                    }))
                  }
                  value={formState.toggleControlsKey}
                />
                <button
                  type="button"
                  className="field-reset"
                  disabled={isFormDisabled}
                  onClick={() => handleResetField('toggleControlsKey')}
                >
                  Reset
                </button>
              </div>
              <p className="field-help">
                Press this key while the zoom overlay is open to hide or show
                the toolbar and close button.
              </p>
            </div>
          </div>
        </section>
        <section
          className="settings-group"
          aria-labelledby="toolbar-controls-heading"
        >
          <h2 id="toolbar-controls-heading" className="settings-group-title">
            Toolbar Buttons
          </h2>
          <div className="field-grid">
            {BUTTON_COLOR_FIELDS.map(field => (
              <ColorField
                key={field.key}
                alpha={colorAlphaByKey[field.key]}
                ariaLabel={field.ariaLabel}
                disabled={isFormDisabled}
                fieldKey={field.key}
                label={field.label}
                onChange={(key, value) =>
                  setFormState(previous => ({
                    ...previous,
                    [key]: value,
                  }))
                }
                onReset={handleResetField}
                value={formState[field.key]}
              />
            ))}
            <div className="field">
              <label htmlFor="buttonDisabledOpacity">
                Button disabled opacity (0 - 1)
              </label>
              <div className="field-control">
                <input
                  id="buttonDisabledOpacity"
                  className="numeric-input"
                  type="number"
                  name="buttonDisabledOpacity"
                  min={0}
                  max={1}
                  step="0.01"
                  disabled={isFormDisabled}
                  onChange={event =>
                    setFormState(previous => ({
                      ...previous,
                      buttonDisabledOpacity: event.target.value,
                    }))
                  }
                  value={formState.buttonDisabledOpacity}
                />
                <button
                  type="button"
                  className="field-reset"
                  disabled={isFormDisabled}
                  onClick={() => handleResetField('buttonDisabledOpacity')}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>
        <section
          className="settings-group"
          aria-labelledby="close-controls-heading"
        >
          <h2 id="close-controls-heading" className="settings-group-title">
            Close Button
          </h2>
          <div className="field-grid">
            {CLOSE_BUTTON_COLOR_FIELDS.map(field => (
              <ColorField
                key={field.key}
                alpha={colorAlphaByKey[field.key]}
                ariaLabel={field.ariaLabel}
                disabled={isFormDisabled}
                fieldKey={field.key}
                label={field.label}
                onChange={(key, value) =>
                  setFormState(previous => ({
                    ...previous,
                    [key]: value,
                  }))
                }
                onReset={handleResetField}
                value={formState[field.key]}
              />
            ))}
          </div>
        </section>
        <div className="actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isFormDisabled}
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            disabled={isFormDisabled}
            onClick={handleResetDefaults}
          >
            Reset defaults
          </button>
          <p
            className="status"
            role="status"
            aria-live="polite"
            style={{
              color: status.isError ? ERROR_STATUS_COLOR : SUCCESS_STATUS_COLOR,
            }}
          >
            {status.message}
          </p>
        </div>
      </form>
      <section className="panel preview-panel">
        <h2>Preview</h2>
        <div className="preview" style={previewStyle}>
          <div className="preview-toolbar">
            <button className="preview-btn">-</button>
            <button className="preview-btn">+</button>
            <button className="preview-btn preview-reset">Fit</button>
          </div>
          <button className="preview-btn preview-close">x</button>
        </div>
      </section>
    </main>
  );
}

export default App;
