import { type ExtensionSettings } from '@/utils/settings';

import { type ColorAlphaByKey, type ColorKey } from './colorTypes';

export type FormState = {
  [K in ColorKey]: string;
} & {
  activationShortcut: ExtensionSettings['activationShortcut'];
  hideControlsByDefault: boolean;
  toggleControlsKey: string;
  buttonDisabledOpacity: string;
};

export type OptionsFormState = {
  colorAlphaByKey: ColorAlphaByKey;
  fields: FormState;
};

export type ColorFieldDefinition = {
  ariaLabel: string;
  key: ColorKey;
  label: string;
};

export type FormFieldChangeHandler = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;
