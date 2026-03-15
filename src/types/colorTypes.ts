import { type COLOR_KEYS } from '../utils/settings';

export type ColorKey = (typeof COLOR_KEYS)[number];

export type ColorAlphaByKey = Record<ColorKey, number>;
