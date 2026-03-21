import { type COLOR_KEYS } from '../utils/settings';

export type ColorKey = (typeof COLOR_KEYS)[number];

export type EditableColorValue = {
  alpha: number;
  hex: string;
};

export type ColorFormState = Record<ColorKey, EditableColorValue>;
