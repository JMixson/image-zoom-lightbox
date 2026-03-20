import { type StoredSettingKey } from '@/utils/settings';
import {
  type FormFieldChangeHandler,
  type FormState,
} from '@/types/formTypes';

type KeyboardSectionProps = {
  disabled: boolean;
  formState: Pick<
    FormState,
    'activationShortcut' | 'hideControlsByDefault' | 'toggleControlsKey'
  >;
  onFieldChange: FormFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
};

function KeyboardSection({
  disabled,
  formState,
  onFieldChange,
  onReset,
}: KeyboardSectionProps) {
  return (
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
              disabled={disabled}
              onChange={event =>
                onFieldChange(
                  'activationShortcut',
                  event.target.value as FormState['activationShortcut'],
                )
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
              disabled={disabled}
              onClick={() => onReset('activationShortcut')}
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
              disabled={disabled}
              onChange={event =>
                onFieldChange('hideControlsByDefault', event.target.checked)
              }
            />
            <label className="toggle-switch" htmlFor="hideControlsByDefault">
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
          <label htmlFor="toggleControlsKey">Toggle controls shortcut</label>
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
              disabled={disabled}
              onChange={event =>
                onFieldChange('toggleControlsKey', event.target.value)
              }
              value={formState.toggleControlsKey}
            />
            <button
              type="button"
              className="field-reset"
              disabled={disabled}
              onClick={() => onReset('toggleControlsKey')}
            >
              Reset
            </button>
          </div>
          <p className="field-help">
            Press this key while the zoom overlay is open to hide or show the
            toolbar and close button.
          </p>
        </div>
      </div>
    </section>
  );
}

export default KeyboardSection;
