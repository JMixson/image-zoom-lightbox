import { type StoredSettingKey } from '@/utils/settings';
import { type ColorAlphaByKey } from '@/types/colorTypes';
import {
  type ColorFieldDefinition,
  type FormFieldChangeHandler,
  type FormState,
} from '@/types/formTypes';

import ColorField from './ColorField';

const BUTTON_COLOR_FIELDS = [
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
] as const satisfies readonly ColorFieldDefinition[];

type ButtonColorKey = (typeof BUTTON_COLOR_FIELDS)[number]['key'];

type ToolbarColorSectionProps = {
  colorAlphaByKey: Pick<ColorAlphaByKey, ButtonColorKey>;
  disabled: boolean;
  formState: Pick<FormState, ButtonColorKey | 'buttonDisabledOpacity'>;
  onFieldChange: FormFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
};

function ToolbarColorSection({
  colorAlphaByKey,
  disabled,
  formState,
  onFieldChange,
  onReset,
}: ToolbarColorSectionProps) {
  return (
    <section className="settings-group" aria-labelledby="toolbar-controls-heading">
      <h2 id="toolbar-controls-heading" className="settings-group-title">
        Toolbar Buttons
      </h2>
      <div className="field-grid">
        {BUTTON_COLOR_FIELDS.map(field => (
          <ColorField
            key={field.key}
            alpha={colorAlphaByKey[field.key]}
            ariaLabel={field.ariaLabel}
            disabled={disabled}
            fieldKey={field.key}
            label={field.label}
            onChange={onFieldChange}
            onReset={onReset}
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
              disabled={disabled}
              onChange={event =>
                onFieldChange('buttonDisabledOpacity', event.target.value)
              }
              value={formState.buttonDisabledOpacity}
            />
            <button
              type="button"
              className="field-reset"
              disabled={disabled}
              onClick={() => onReset('buttonDisabledOpacity')}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ToolbarColorSection;
