import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';

import {
  DEFAULT_SETTINGS,
  SETTING_LABELS,
  parseSettings,
  type StoredSettingKey,
} from '@/utils/settings';
import { normalizeShortcutKey } from '@/utils/shortcuts';
import {
  getStoredSettings,
  setStoredSetting,
  setStoredSettings,
} from '@/utils/settingsStorage';
import { getThemeCssVariables } from '@/utils/theme';
import { type FormState } from '@/types/formTypes';

import {
  applyStoredSettingToFormState,
  formStateToRawSettings,
  settingsToFormState,
} from '@/utils/formConversions';

export type StatusState = {
  isError: boolean;
  message: string;
  timestamp: number;
};

const EMPTY_STATUS: StatusState = {
  isError: false,
  message: '',
  timestamp: 0,
};
const INITIAL_SETTINGS_STATE = settingsToFormState(DEFAULT_SETTINGS);
const STATUS_CLEAR_DELAY_MS = 3000;

function createStatus(isError: boolean, message: string): StatusState {
  return {
    isError,
    message,
    timestamp: Date.now(),
  };
}

export function useSettings() {
  const [status, setStatus] = useState<StatusState>(EMPTY_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [optionsFormState, setOptionsFormState] = useState(INITIAL_SETTINGS_STATE);

  const previewSettings = parseSettings(
    formStateToRawSettings(optionsFormState),
  );
  const previewStyle = getThemeCssVariables(previewSettings) as CSSProperties;
  const { colorAlphaByKey, fields: formState } = optionsFormState;

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const initialSettings = await getStoredSettings();
        if (!isActive) {
          return;
        }

        setOptionsFormState(settingsToFormState(initialSettings));
      } catch {
        if (!isActive) {
          return;
        }

        setStatus(createStatus(true, 'Failed to load settings.'));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!status.message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus(EMPTY_STATUS);
    }, STATUS_CLEAR_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status.timestamp]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setOptionsFormState(previous => {
      const nextValue =
        key === 'toggleControlsKey'
          ? normalizeShortcutKey(String(value))
          : value;

      return {
        ...previous,
        fields: {
          ...previous.fields,
          [key]: nextValue,
        } as FormState,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitizedSettings = parseSettings(
      formStateToRawSettings(optionsFormState),
    );

    try {
      await setStoredSettings(sanitizedSettings);
    } catch {
      setStatus(createStatus(true, 'Failed to save settings.'));
      return;
    }

    setOptionsFormState(settingsToFormState(sanitizedSettings));
    setStatus(createStatus(false, 'Saved.'));
  }

  async function handleResetField(key: StoredSettingKey) {
    const resetValue = DEFAULT_SETTINGS[key];

    try {
      await setStoredSetting(key, resetValue);
    } catch {
      setStatus(createStatus(true, 'Failed to reset setting.'));
      return;
    }

    setOptionsFormState(previous =>
      applyStoredSettingToFormState(previous, key, resetValue),
    );
    setStatus(createStatus(false, `${SETTING_LABELS[key]} reset.`));
  }

  async function handleResetDefaults() {
    try {
      await setStoredSettings(DEFAULT_SETTINGS);
    } catch {
      setStatus(createStatus(true, 'Failed to reset settings.'));
      return;
    }

    setOptionsFormState(settingsToFormState(DEFAULT_SETTINGS));
    setStatus(createStatus(false, 'Defaults restored.'));
  }

  return {
    colorAlphaByKey,
    formState,
    handleResetDefaults,
    handleResetField,
    handleSubmit,
    isFormDisabled: isLoading,
    previewStyle,
    updateField,
    status,
  };
}
