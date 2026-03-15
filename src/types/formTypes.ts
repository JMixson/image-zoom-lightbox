import { type ExtensionSettings } from '@/utils/settings';

import { type ColorKey } from './colorTypes';

export type FormState = {
  [K in ColorKey]: string;
} & {
  activationShortcut: ExtensionSettings['activationShortcut'];
  hideControlsByDefault: boolean;
  toggleControlsKey: string;
  buttonDisabledOpacity: string;
};

export type ColorFieldDefinition = {
  ariaLabel: string;
  key: ColorKey;
  label: string;
};
