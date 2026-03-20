import {
  DEFAULT_RESET_THEME,
  DEFAULT_THEME_SETTINGS,
  type ThemeSettings,
} from './settings';

export function getThemeCssVariables(
  settings: ThemeSettings,
): Record<string, string> {
  const resetText =
    settings.buttonText === DEFAULT_THEME_SETTINGS.buttonText
      ? DEFAULT_RESET_THEME.text
      : settings.buttonText;
  const resetHoverBg =
    settings.buttonHoverBg === DEFAULT_THEME_SETTINGS.buttonHoverBg
      ? DEFAULT_RESET_THEME.hoverBg
      : settings.buttonHoverBg;
  const resetHoverText =
    settings.buttonHoverText === DEFAULT_THEME_SETTINGS.buttonHoverText
      ? DEFAULT_RESET_THEME.hoverText
      : settings.buttonHoverText;

  return {
    '--iz-button-bg': settings.buttonBg,
    '--iz-button-text': settings.buttonText,
    '--iz-button-hover-bg': settings.buttonHoverBg,
    '--iz-button-hover-text': settings.buttonHoverText,
    '--iz-button-active-bg': settings.buttonActiveBg,
    '--iz-button-disabled-opacity': String(settings.buttonDisabledOpacity),
    '--iz-close-bg': settings.closeButtonBg,
    '--iz-close-text': settings.closeButtonText,
    '--iz-close-hover-bg': settings.closeButtonHoverBg,
    '--iz-close-hover-text': settings.closeButtonHoverText,
    '--iz-reset-text': resetText,
    '--iz-reset-hover-bg': resetHoverBg,
    '--iz-reset-hover-text': resetHoverText,
  };
}

export function applyThemeSettings(
  targetElement: HTMLElement,
  settings: ThemeSettings,
): void {
  for (const [property, value] of Object.entries(
    getThemeCssVariables(settings),
  )) {
    targetElement.style.setProperty(property, value);
  }
}
