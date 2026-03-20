import { type StoredSettingKey } from '@/utils/settings';
import { type ColorAlphaByKey } from '@/types/colorTypes';
import {
  type ColorFieldDefinition,
  type FormFieldChangeHandler,
  type FormState,
} from '@/types/formTypes';

import ColorField from './ColorField';

const CLOSE_BUTTON_COLOR_FIELDS = [
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
] as const satisfies readonly ColorFieldDefinition[];

type CloseButtonColorKey = (typeof CLOSE_BUTTON_COLOR_FIELDS)[number]['key'];

type CloseButtonSectionProps = {
  colorAlphaByKey: Pick<ColorAlphaByKey, CloseButtonColorKey>;
  disabled: boolean;
  formState: Pick<FormState, CloseButtonColorKey>;
  onFieldChange: FormFieldChangeHandler;
  onReset: (key: StoredSettingKey) => void;
};

function CloseButtonSection({
  colorAlphaByKey,
  disabled,
  formState,
  onFieldChange,
  onReset,
}: CloseButtonSectionProps) {
  return (
    <section className="settings-group" aria-labelledby="close-controls-heading">
      <h2 id="close-controls-heading" className="settings-group-title">
        Close Button
      </h2>
      <div className="field-grid">
        {CLOSE_BUTTON_COLOR_FIELDS.map(field => (
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
      </div>
    </section>
  );
}

export default CloseButtonSection;
