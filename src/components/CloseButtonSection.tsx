import { type StoredSettingKey } from '@/utils/settings';
import {
  type ColorFieldChangeHandler,
  type ColorFieldDefinition,
} from '@/types/formTypes';
import { type ColorFormState } from '@/types/colorTypes';

import ColorField from './ColorField';

const DEFAULT_COLOR_FIELDS = [
  {
    key: 'closeButtonBg',
    label: 'Background',
    ariaLabel: 'Close button background color',
  },
  {
    key: 'closeButtonText',
    label: 'Text',
    ariaLabel: 'Close button text color',
  },
] as const satisfies readonly ColorFieldDefinition[];

const HOVER_COLOR_FIELDS = [
  {
    key: 'closeButtonHoverBg',
    label: 'Hover background',
    ariaLabel: 'Close hover background color',
  },
  {
    key: 'closeButtonHoverText',
    label: 'Hover text',
    ariaLabel: 'Close hover text color',
  },
] as const satisfies readonly ColorFieldDefinition[];

const CLOSE_BUTTON_COLOR_FIELDS = [
  ...DEFAULT_COLOR_FIELDS,
  ...HOVER_COLOR_FIELDS,
] as const;

type CloseButtonColorKey = (typeof CLOSE_BUTTON_COLOR_FIELDS)[number]['key'];

type CloseButtonSectionProps = {
  colorFields: Pick<ColorFormState, CloseButtonColorKey>;
  disabled: boolean;
  onColorChange: ColorFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
};

function CloseButtonSection({
  colorFields,
  disabled,
  onColorChange,
  onReset,
}: CloseButtonSectionProps) {
  return (
    <section
      className="settings-group"
      aria-labelledby="close-controls-heading"
    >
      <h2 id="close-controls-heading" className="settings-group-title">
        Close Button
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
        <summary className="settings-summary">Hover States</summary>
        <div className="field-grid">
          {HOVER_COLOR_FIELDS.map(field => (
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

export default CloseButtonSection;
