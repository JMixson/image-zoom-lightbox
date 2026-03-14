function App() {
  return (
    <>
      <main className="page">
        <header className="heading">
          <h1>Image Zoom Lightbox Settings</h1>
          <p>
            Customize overlay colors and keyboard behavior. Any invalid value is
            ignored and falls back to the default settings.
          </p>
        </header>
        <form id="theme-form" className="panel" noValidate="">
          <section
            className="settings-group"
            aria-labelledby="keyboard-heading"
          >
            <h2 id="keyboard-heading" className="settings-group-title">
              Keyboard
            </h2>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="activationShortcut">Activation shortcut</label>
                <div className="field-control">
                  <select
                    id="activationShortcut"
                    className="select-input"
                    name="activationShortcut"
                    aria-label="Activation shortcut"
                  >
                    <option value="double_ctrl">Ctrl + Ctrl</option>
                    <option value="double_shift">Shift + Shift</option>
                    <option value="double_meta">Cmd/Meta + Cmd/Meta</option>
                  </select>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="activationShortcut"
                  >
                    Reset
                  </button>
                </div>
                <p className="field-help">
                  Choose which supported double-press shortcut opens the
                  lightbox while hovering an image.
                </p>
              </div>
              <div className="field">
                <label htmlFor="hideControlsByDefault">
                  Hide overlay controls by default
                </label>
                <div className="field-control field-control-toggle">
                  <input
                    id="hideControlsByDefault"
                    className="toggle-input"
                    type="checkbox"
                    name="hideControlsByDefault"
                    aria-label="Hide overlay controls by default"
                  />
                  <label
                    className="toggle-switch"
                    htmlFor="hideControlsByDefault"
                  >
                    <span className="toggle-track" aria-hidden="true" />
                    <span className="toggle-label">Enable</span>
                  </label>
                </div>
                <p className="field-help">
                  When enabled, the toolbar and close button stay hidden until
                  you press the toggle shortcut.
                </p>
              </div>
              <div className="field">
                <label htmlFor="toggleControlsKey">
                  Toggle controls shortcut
                </label>
                <div className="field-control">
                  <input
                    id="toggleControlsKey"
                    className="shortcut-input"
                    type="text"
                    name="toggleControlsKey"
                    maxLength={1}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    aria-label="Toggle controls shortcut key"
                  />
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="toggleControlsKey"
                  >
                    Reset
                  </button>
                </div>
                <p className="field-help">
                  Press this key while the zoom overlay is open to hide or show
                  the toolbar and close button.
                </p>
              </div>
            </div>
          </section>
          <section
            className="settings-group"
            aria-labelledby="toolbar-controls-heading"
          >
            <h2 id="toolbar-controls-heading" className="settings-group-title">
              Toolbar Buttons
            </h2>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="buttonBg">Button background</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="buttonBg"
                      aria-hidden="true"
                    />
                    <span className="color-value" data-rgba-for="buttonBg" />
                    <input
                      id="buttonBg"
                      className="color-picker-native"
                      type="color"
                      name="buttonBg"
                      aria-label="Button background color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonBg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="buttonText">Button text</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="buttonText"
                      aria-hidden="true"
                    />
                    <span className="color-value" data-rgba-for="buttonText" />
                    <input
                      id="buttonText"
                      className="color-picker-native"
                      type="color"
                      name="buttonText"
                      aria-label="Button text color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonText"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="buttonHoverBg">Button hover background</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="buttonHoverBg"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="buttonHoverBg"
                    />
                    <input
                      id="buttonHoverBg"
                      className="color-picker-native"
                      type="color"
                      name="buttonHoverBg"
                      aria-label="Button hover background color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonHoverBg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="buttonHoverText">Button hover text</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="buttonHoverText"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="buttonHoverText"
                    />
                    <input
                      id="buttonHoverText"
                      className="color-picker-native"
                      type="color"
                      name="buttonHoverText"
                      aria-label="Button hover text color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonHoverText"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="buttonActiveBg">Button active background</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="buttonActiveBg"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="buttonActiveBg"
                    />
                    <input
                      id="buttonActiveBg"
                      className="color-picker-native"
                      type="color"
                      name="buttonActiveBg"
                      aria-label="Button active background color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonActiveBg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="buttonDisabledOpacity">
                  Button disabled opacity (0 - 1)
                </label>
                <div className="field-control">
                  <input
                    id="buttonDisabledOpacity"
                    className="numeric-input"
                    type="number"
                    name="buttonDisabledOpacity"
                    min={0}
                    max={1}
                    step="0.01"
                  />
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="buttonDisabledOpacity"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section
            className="settings-group"
            aria-labelledby="close-controls-heading"
          >
            <h2 id="close-controls-heading" className="settings-group-title">
              Close Button
            </h2>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="closeButtonBg">Close button background</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="closeButtonBg"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="closeButtonBg"
                    />
                    <input
                      id="closeButtonBg"
                      className="color-picker-native"
                      type="color"
                      name="closeButtonBg"
                      aria-label="Close button background color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="closeButtonBg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="closeButtonText">Close button text</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="closeButtonText"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="closeButtonText"
                    />
                    <input
                      id="closeButtonText"
                      className="color-picker-native"
                      type="color"
                      name="closeButtonText"
                      aria-label="Close button text color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="closeButtonText"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="closeButtonHoverBg">
                  Close hover background
                </label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="closeButtonHoverBg"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="closeButtonHoverBg"
                    />
                    <input
                      id="closeButtonHoverBg"
                      className="color-picker-native"
                      type="color"
                      name="closeButtonHoverBg"
                      aria-label="Close hover background color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="closeButtonHoverBg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="closeButtonHoverText">Close hover text</label>
                <div className="field-control">
                  <div className="color-display">
                    <span
                      className="color-swatch"
                      data-swatch-for="closeButtonHoverText"
                      aria-hidden="true"
                    />
                    <span
                      className="color-value"
                      data-rgba-for="closeButtonHoverText"
                    />
                    <input
                      id="closeButtonHoverText"
                      className="color-picker-native"
                      type="color"
                      name="closeButtonHoverText"
                      aria-label="Close hover text color"
                    />
                  </div>
                  <button
                    type="button"
                    className="field-reset"
                    data-reset-key="closeButtonHoverText"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </section>
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Save
            </button>
            <button type="button" id="reset-defaults" className="btn">
              Reset defaults
            </button>
            <p
              id="status"
              className="status"
              role="status"
              aria-live="polite"
            />
          </div>
        </form>
        <section className="panel preview-panel">
          <h2>Preview</h2>
          <div id="preview" className="preview">
            <div className="preview-toolbar">
              <button className="preview-btn">-</button>
              <button className="preview-btn">+</button>
              <button className="preview-btn preview-reset">Fit</button>
            </div>
            <button className="preview-btn preview-close">x</button>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
