import { type StoredSettingKey } from '@/utils/settings';
import {
  type ColorFieldChangeHandler,
  type ColorFieldDefinition,
} from '@/types/formTypes';
import { type ColorFormState } from '@/types/colorTypes';

import ColorField from './ColorField';

const DEFAULT_COLOR_FIELDS = [
  {
    key: 'buttonBg',
    label: 'Background',
    ariaLabel: 'Button background color',
  },
  {
    key: 'buttonText',
    label: 'Text',
    ariaLabel: 'Button text color',
  },
] as const satisfies readonly ColorFieldDefinition[];

const ADVANCED_COLOR_FIELDS = [
  {
    key: 'buttonHoverBg',
    label: 'Hover background',
    ariaLabel: 'Button hover background color',
  },
  {
    key: 'buttonHoverText',
    label: 'Hover text',
    ariaLabel: 'Button hover text color',
  },
  {
    key: 'buttonActiveBg',
    label: 'Active background',
    ariaLabel: 'Button active background color',
  },
] as const satisfies readonly ColorFieldDefinition[];

const BUTTON_COLOR_FIELDS = [
  ...DEFAULT_COLOR_FIELDS,
  ...ADVANCED_COLOR_FIELDS,
] as const;

type ButtonColorKey = (typeof BUTTON_COLOR_FIELDS)[number]['key'];

type ToolbarColorSectionProps = {
  colorFields: Pick<ColorFormState, ButtonColorKey>;
  disabled: boolean;
  onColorChange: ColorFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
};

function ToolbarColorSection({
  colorFields,
  disabled,
  onColorChange,
  onReset,
}: ToolbarColorSectionProps) {
  return (
    <section
      className="settings-group"
      aria-labelledby="toolbar-controls-heading"
    >
      <h2 id="toolbar-controls-heading" className="settings-group-title">
        Toolbar Buttons
      </h2>
      <div className="field-grid">
        {DEFAULT_COLOR_FIELDS.map(field => (
          <ColorField
            key={field.key}
            ariaLabel={field.ariaLabel}
            disabled={disabled}
            fieldKey={field.key}
            label={field.label}
            onChange={onColorChange}
            onReset={onReset}
            value={colorFields[field.key]}
          />
        ))}
      </div>
      <details className="settings-details">
        <summary className="settings-summary">
          Hover &amp; Active States
        </summary>
        <div className="field-grid">
          {ADVANCED_COLOR_FIELDS.map(field => (
            <ColorField
              key={field.key}
              ariaLabel={field.ariaLabel}
              disabled={disabled}
              fieldKey={field.key}
              label={field.label}
              onChange={onColorChange}
              onReset={onReset}
              value={colorFields[field.key]}
            />
          ))}
        </div>
      </details>
    </section>
  );
}

export default ToolbarColorSection;
