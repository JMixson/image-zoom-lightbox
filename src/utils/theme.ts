import {
  DEFAULT_RESET_THEME,
  DEFAULT_THEME_SETTINGS,
  type ThemeSettings,
} from './settings';

export function applyThemeSettings(
  targetElement: HTMLElement,
  settings: ThemeSettings,
): void {
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

  targetElement.style.setProperty('--iz-button-bg', settings.buttonBg);
  targetElement.style.setProperty('--iz-button-text', settings.buttonText);
  targetElement.style.setProperty(
    '--iz-button-hover-bg',
    settings.buttonHoverBg,
  );
  targetElement.style.setProperty(
    '--iz-button-hover-text',
    settings.buttonHoverText,
  );
  targetElement.style.setProperty(
    '--iz-button-active-bg',
    settings.buttonActiveBg,
  );
  targetElement.style.setProperty(
    '--iz-button-disabled-opacity',
    String(settings.buttonDisabledOpacity),
  );
  targetElement.style.setProperty('--iz-close-bg', settings.closeButtonBg);
  targetElement.style.setProperty('--iz-close-text', settings.closeButtonText);
  targetElement.style.setProperty(
    '--iz-close-hover-bg',
    settings.closeButtonHoverBg,
  );
  targetElement.style.setProperty(
    '--iz-close-hover-text',
    settings.closeButtonHoverText,
  );
  targetElement.style.setProperty('--iz-reset-text', resetText);
  targetElement.style.setProperty('--iz-reset-hover-bg', resetHoverBg);
  targetElement.style.setProperty('--iz-reset-hover-text', resetHoverText);
}
