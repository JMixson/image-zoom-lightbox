import { type ExtensionSettings } from '@/utils/settings';

import { type ColorFormState, type ColorKey } from './colorTypes';

export type FormState = {
  activationShortcut: ExtensionSettings['activationShortcut'];
  hideControlsByDefault: boolean;
  toggleControlsKey: string;
  buttonDisabledOpacity: string;
};

export type OptionsFormState = {
  colors: ColorFormState;
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

export type ColorFieldChangeHandler = <K extends ColorKey>(
  key: K,
  value: ColorFormState[K],
) => void;
