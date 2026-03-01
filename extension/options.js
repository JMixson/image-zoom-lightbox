(() => {
  'use strict';

  const DEFAULT_THEME_SETTINGS = Object.freeze({
    buttonBg: 'rgba(255, 255, 255, 0.13)',
    buttonText: 'rgba(255, 255, 255, 0.92)',
    buttonHoverBg: 'rgba(255, 255, 255, 0.22)',
    buttonHoverText: '#fff',
    buttonActiveBg: 'rgba(255, 255, 255, 0.1)',
    buttonDisabledOpacity: 0.28,
    closeButtonBg: 'rgba(18, 18, 22, 0.68)',
    closeButtonText: 'rgba(255, 255, 255, 0.75)',
    closeButtonHoverBg: 'rgba(255, 255, 255, 0.14)',
    closeButtonHoverText: '#fff',
  });
  const DEFAULT_RESET_THEME = Object.freeze({
    text: 'rgba(255, 255, 255, 0.75)',
    hoverBg: 'rgba(255, 255, 255, 0.12)',
    hoverText: '#fff',
  });
  const THEME_SETTING_KEYS = Object.keys(DEFAULT_THEME_SETTINGS);
  const SETTING_LABELS = Object.freeze({
    buttonBg: 'Button background',
    buttonText: 'Button text',
    buttonHoverBg: 'Button hover background',
    buttonHoverText: 'Button hover text',
    buttonActiveBg: 'Button active background',
    buttonDisabledOpacity: 'Button disabled opacity',
    closeButtonBg: 'Close button background',
    closeButtonText: 'Close button text',
    closeButtonHoverBg: 'Close hover background',
    closeButtonHoverText: 'Close hover text',
  });
  const COLOR_KEYS = [
    'buttonBg',
    'buttonText',
    'buttonHoverBg',
    'buttonHoverText',
    'buttonActiveBg',
    'closeButtonBg',
    'closeButtonText',
    'closeButtonHoverBg',
    'closeButtonHoverText',
  ];
  const COLOR_KEY_SET = new Set(COLOR_KEYS);

  const formEl = document.getElementById('theme-form');
  const resetBtnEl = document.getElementById('reset-defaults');
  const statusEl = document.getElementById('status');
  const previewEl = document.getElementById('preview');
  const colorParserCtx = document.createElement('canvas').getContext('2d');
  const colorAlphaByKey = {};

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function toHexChannel(value) {
    const channel = clamp(Math.round(value), 0, 255);
    return channel.toString(16).padStart(2, '0');
  }

  function rgbToHex(r, g, b) {
    return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
  }

  function parseHexColor(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const match = value.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) {
      return null;
    }

    return {
      r: Number.parseInt(match[1].slice(0, 2), 16),
      g: Number.parseInt(match[1].slice(2, 4), 16),
      b: Number.parseInt(match[1].slice(4, 6), 16),
    };
  }

  function parseCssColor(value) {
    if (!colorParserCtx || typeof value !== 'string' || !isValidCssColor(value)) {
      return null;
    }

    colorParserCtx.fillStyle = '#000000';
    colorParserCtx.fillStyle = value.trim();
    const normalized = colorParserCtx.fillStyle;
    if (!normalized) {
      return null;
    }

    const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      return {
        r: Number.parseInt(hexMatch[1].slice(0, 2), 16),
        g: Number.parseInt(hexMatch[1].slice(2, 4), 16),
        b: Number.parseInt(hexMatch[1].slice(4, 6), 16),
        a: 1,
      };
    }

    const rgbMatch = normalized.match(/^rgba?\((.+)\)$/i);
    if (!rgbMatch) {
      return null;
    }

    const parts = rgbMatch[1].split(',').map(part => part.trim());
    if (parts.length < 3 || parts.length > 4) {
      return null;
    }

    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts.length === 4 ? Number(parts[3]) : 1;
    if (![r, g, b, a].every(Number.isFinite)) {
      return null;
    }

    return {
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
      a: clamp(a, 0, 1),
    };
  }

  function formatRgba(r, g, b, a) {
    const roundedAlpha = Math.round(clamp(a, 0, 1) * 1000) / 1000;
    return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${roundedAlpha})`;
  }

  function normalizeDisplayColor(value, fallback) {
    const parsed = parseCssColor(value) || parseCssColor(fallback);
    if (!parsed) {
      return 'rgba(0, 0, 0, 1)';
    }

    return formatRgba(parsed.r, parsed.g, parsed.b, parsed.a);
  }

  function updateColorDisplayForKey(key, colorValue) {
    const colorTextEl = formEl?.querySelector(`[data-rgba-for="${key}"]`);
    const swatchEl = formEl?.querySelector(`[data-swatch-for="${key}"]`);
    const normalized = normalizeDisplayColor(colorValue, DEFAULT_THEME_SETTINGS[key]);

    if (colorTextEl) {
      colorTextEl.textContent = normalized;
      colorTextEl.title = normalized;
    }

    if (swatchEl instanceof HTMLElement) {
      swatchEl.style.setProperty('--swatch-color', normalized);
      swatchEl.title = normalized;
    }
  }

  function updateColorDisplays(settings) {
    for (const key of COLOR_KEYS) {
      updateColorDisplayForKey(key, settings?.[key]);
    }
  }

  function updateColorFieldFromCss(key, cssColor) {
    const field = formEl?.elements?.namedItem(key);
    if (!field) {
      return;
    }

    const parsed =
      parseCssColor(cssColor) || parseCssColor(DEFAULT_THEME_SETTINGS[key]);
    if (!parsed) {
      field.value = '#000000';
      colorAlphaByKey[key] = 1;
      updateColorDisplayForKey(key, 'rgba(0, 0, 0, 1)');
      return;
    }

    field.value = rgbToHex(parsed.r, parsed.g, parsed.b);
    colorAlphaByKey[key] = parsed.a;
    updateColorDisplayForKey(key, formatRgba(parsed.r, parsed.g, parsed.b, parsed.a));
  }

  function isValidCssColor(value) {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }

    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      ? CSS.supports('color', trimmed)
      : false;
  }

  function sanitizeThemeSettings(rawSettings) {
    const raw =
      rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
    const sanitized = { ...DEFAULT_THEME_SETTINGS };

    for (const key of COLOR_KEYS) {
      if (hasOwn(raw, key) && isValidCssColor(raw[key])) {
        sanitized[key] = raw[key].trim();
      }
    }

    if (hasOwn(raw, 'buttonDisabledOpacity')) {
      const numericOpacity = Number(raw.buttonDisabledOpacity);
      if (Number.isFinite(numericOpacity)) {
        sanitized.buttonDisabledOpacity = clamp(numericOpacity, 0, 1);
      }
    }

    return sanitized;
  }

  function hasStorageSync() {
    return typeof chrome !== 'undefined' && !!chrome.storage?.sync;
  }

  function getStoredThemeSettings() {
    return new Promise(resolve => {
      if (!hasStorageSync()) {
        resolve({});
        return;
      }

      chrome.storage.sync.get(THEME_SETTING_KEYS, items => {
        if (chrome.runtime?.lastError) {
          resolve({});
          return;
        }

        resolve(items || {});
      });
    });
  }

  function saveThemeSettings(settings) {
    return new Promise(resolve => {
      if (!hasStorageSync()) {
        resolve(false);
        return;
      }

      chrome.storage.sync.set(settings, () => {
        resolve(!chrome.runtime?.lastError);
      });
    });
  }

  function readFormValues() {
    const raw = {};

    for (const key of THEME_SETTING_KEYS) {
      const field = formEl?.elements?.namedItem(key);
      if (!field) {
        continue;
      }

      if (key === 'buttonDisabledOpacity') {
        raw[key] = field.value;
        continue;
      }
      if (COLOR_KEY_SET.has(key)) {
        const rgb = parseHexColor(String(field.value || ''));
        if (!rgb) {
          raw[key] = DEFAULT_THEME_SETTINGS[key];
          continue;
        }

        const alpha = hasOwn(colorAlphaByKey, key) ? colorAlphaByKey[key] : 1;
        raw[key] = formatRgba(rgb.r, rgb.g, rgb.b, alpha);
        continue;
      }

      raw[key] = String(field.value || '');
    }

    return raw;
  }

  function writeFormValues(settings) {
    for (const key of THEME_SETTING_KEYS) {
      const field = formEl?.elements?.namedItem(key);
      if (!field) {
        continue;
      }

      if (key === 'buttonDisabledOpacity') {
        field.value = String(settings[key]);
        continue;
      }

      if (COLOR_KEY_SET.has(key)) {
        updateColorFieldFromCss(key, settings[key]);
        continue;
      }

      field.value = settings[key];
    }
  }

  function setFieldValue(key, value) {
    if (COLOR_KEY_SET.has(key)) {
      updateColorFieldFromCss(key, String(value));
      return;
    }

    const field = formEl?.elements?.namedItem(key);
    if (field) {
      field.value = String(value);
    }
  }

  function setStatus(message, isError = false) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.style.color = isError
      ? 'rgba(255, 181, 181, 0.95)'
      : 'rgba(183, 255, 196, 0.95)';
  }

  function applyPreview(settings) {
    if (!previewEl) {
      return;
    }

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

    previewEl.style.setProperty('--iz-button-bg', settings.buttonBg);
    previewEl.style.setProperty('--iz-button-text', settings.buttonText);
    previewEl.style.setProperty('--iz-button-hover-bg', settings.buttonHoverBg);
    previewEl.style.setProperty('--iz-button-hover-text', settings.buttonHoverText);
    previewEl.style.setProperty(
      '--iz-button-active-bg',
      settings.buttonActiveBg,
    );
    previewEl.style.setProperty(
      '--iz-button-disabled-opacity',
      String(settings.buttonDisabledOpacity),
    );
    previewEl.style.setProperty('--iz-close-bg', settings.closeButtonBg);
    previewEl.style.setProperty('--iz-close-text', settings.closeButtonText);
    previewEl.style.setProperty(
      '--iz-close-hover-bg',
      settings.closeButtonHoverBg,
    );
    previewEl.style.setProperty(
      '--iz-close-hover-text',
      settings.closeButtonHoverText,
    );
    previewEl.style.setProperty('--iz-reset-text', resetText);
    previewEl.style.setProperty('--iz-reset-hover-bg', resetHoverBg);
    previewEl.style.setProperty('--iz-reset-hover-text', resetHoverText);
  }

  async function initialize() {
    if (!formEl || !resetBtnEl) {
      return;
    }

    if (!hasStorageSync()) {
      formEl.querySelectorAll('input, button').forEach(el => {
        el.disabled = true;
      });
      setStatus('Storage API is unavailable on this page.', true);
      return;
    }

    const stored = await getStoredThemeSettings();
    const initial = sanitizeThemeSettings(stored);

    writeFormValues(initial);
    applyPreview(initial);
    updateColorDisplays(initial);

    formEl.addEventListener('input', () => {
      const previewSettings = sanitizeThemeSettings(readFormValues());
      applyPreview(previewSettings);
      updateColorDisplays(previewSettings);
    });

    formEl.addEventListener('submit', async event => {
      event.preventDefault();
      const raw = readFormValues();
      const sanitized = sanitizeThemeSettings(raw);
      const saved = await saveThemeSettings(sanitized);

      if (!saved) {
        setStatus('Failed to save settings.', true);
        return;
      }

      writeFormValues(sanitized);
      applyPreview(sanitized);
      updateColorDisplays(sanitized);
      setStatus('Saved.');
    });

    formEl.addEventListener('click', async event => {
      const resetTrigger =
        event.target instanceof Element
          ? event.target.closest('.field-reset')
          : null;
      if (!resetTrigger) {
        return;
      }

      const key = resetTrigger.getAttribute('data-reset-key');
      if (!key || !hasOwn(DEFAULT_THEME_SETTINGS, key)) {
        return;
      }

      const resetValue = DEFAULT_THEME_SETTINGS[key];
      const saved = await saveThemeSettings({ [key]: resetValue });
      if (!saved) {
        setStatus('Failed to reset setting.', true);
        return;
      }

      setFieldValue(key, resetValue);
      const updatedSettings = sanitizeThemeSettings(readFormValues());
      applyPreview(updatedSettings);
      updateColorDisplays(updatedSettings);
      const label = SETTING_LABELS[key] || 'Setting';
      setStatus(`${label} reset.`);
    });

    resetBtnEl.addEventListener('click', async () => {
      const defaults = { ...DEFAULT_THEME_SETTINGS };
      const saved = await saveThemeSettings(defaults);

      if (!saved) {
        setStatus('Failed to reset settings.', true);
        return;
      }

      writeFormValues(defaults);
      applyPreview(defaults);
      updateColorDisplays(defaults);
      setStatus('Defaults restored.');
    });
  }

  void initialize();
})();
