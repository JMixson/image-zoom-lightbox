import CloseButtonSection from '@/components/CloseButtonSection';
import KeyboardSection from '@/components/KeyboardSection';
import PreviewPanel from '@/components/PreviewPanel';
import ToolbarColorSection from '@/components/ToolbarColorSection';
import { useSettings } from '@/hooks/useSettings';

const ERROR_STATUS_COLOR = 'rgba(255, 181, 181, 0.95)';
const SUCCESS_STATUS_COLOR = 'rgba(183, 255, 196, 0.95)';

function App() {
  const {
    colorFields,
    formState,
    handleResetDefaults,
    handleResetField,
    handleSubmit,
    isFormDisabled,
    previewStyle,
    status,
    updateColorField,
    updateField,
  } = useSettings();

  return (
    <main className="page">
      <header className="heading">
        <h1>Image Zoom Lightbox Settings</h1>
        <p>
          Customize overlay colors and keyboard behavior. Any invalid value is
          ignored and falls back to the default settings.
        </p>
      </header>
      <form className="panel" noValidate onSubmit={handleSubmit}>
        <KeyboardSection
          disabled={isFormDisabled}
          formState={formState}
          onFieldChange={updateField}
          onReset={handleResetField}
        />
        <ToolbarColorSection
          colorFields={colorFields}
          disabled={isFormDisabled}
          formState={formState}
          onColorChange={updateColorField}
          onReset={handleResetField}
          onFieldChange={updateField}
        />
        <CloseButtonSection
          colorFields={colorFields}
          disabled={isFormDisabled}
          onColorChange={updateColorField}
          onReset={handleResetField}
        />
        <div className="actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isFormDisabled}
          >
            Save
          </button>
          <button
            type="button"
            className="btn"
            disabled={isFormDisabled}
            onClick={handleResetDefaults}
          >
            Reset defaults
          </button>
          <p
            className="status"
            role="status"
            aria-live="polite"
            style={{
              color: status.isError ? ERROR_STATUS_COLOR : SUCCESS_STATUS_COLOR,
            }}
          >
            {status.message}
          </p>
        </div>
      </form>
      <PreviewPanel previewStyle={previewStyle} />
    </main>
  );
}

export default App;
