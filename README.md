<div align="center">
<img src="images\promo-title-screen.jpg" alt="Promo title screen"/>
</div>

# Image Zoom Lightbox

A browser extension that opens an image lightbox when you use a configurable double-press shortcut while hovering an image.

Hover over an image and press your chosen shortcut twice to open a clean lightbox with quick zoom and pan controls. Customize the shortcut, control visibility, and overlay colors in Settings, and keep your preferences saved for future sessions.

> **A note on AI:** Image Zoom Lightbox is developed by a human with AI assistance (mostly Codex) helping write, refactor, and review code. Every change is reviewed, tested, and shipped intentionally.

[![Available in the Chrome Web Store](https://user-images.githubusercontent.com/22908993/166417152-f870bfbd-1770-4c28-b69d-a7303aebc9a6.png)](https://chromewebstore.google.com/detail/image-zoom-lightbox/hlhkddoebkcjafoajhecgdmcjpbghhpe) [![Get the add-on](https://user-images.githubusercontent.com/22908993/166417727-3481fef4-00e5-4cf0-bb03-27fb880d993c.png)](https://addons.mozilla.org/en-US/firefox/addon/image-zoom-lightbox/)

## Preview

![Extension preview](images/demo.gif)

## Features

- Configurable double-press activation shortcut on hovered images (`Ctrl + Ctrl` by default)
- Zoom controls (`-`, `+`, `Fit`)
- Toggle toolbar and close controls with `h` by default while the lightbox is open
- Mouse wheel zoom around the cursor
- Drag-to-pan when zoomed in
- Customizable toolbar and close button colors
- Customizable activation shortcut and controls-toggle shortcut
- Option to hide overlay controls by default
- Settings are saved for future browser sessions
- Activation shortcut is ignored while typing in editable fields
- Close with `Esc` or by clicking outside the viewer
- Runs on most `http://` and `https://` pages

### macOS Notes

If the default activation shortcut does not work well with your browser or system setup, switch to `Shift + Shift` or `Cmd/Meta + Cmd/Meta` in Settings.

### Edge Notes

Microsoft Edge includes a built-in **Magnify image** feature that can also uses `Ctrl + Ctrl`. If there is a conflict, either:

- Change this extension's activation shortcut in Settings
- Turn off Edge's **Magnify image** setting at `edge://settings/privacy/sitePermissions/allPermissions/magnifyImages`

## Limitations

- Supports standard `<img>` elements only
- Top frame only; no iframe support
- No `background-image`, `canvas`, or `svg` support in this version
- Does not run on restricted browser pages such as internal browser URLs

<table>
  <tbody>
    <tr>
      <td><img alt="Lightbox Feature Screenshot" src="/images/default-lightbox.jpg" /></td>
      <td><img alt="Zoomed In Lightbox Feature Screenshot" src="/images/zoomed-in-lightbox.jpg" /></td>
    </tr>
    <tr>
      <td><img alt="Options Screen Screenshot" src="/images/default-options.jpg" /></td>
      <td><img alt="Customized Lightbox Controls Screenshot" src="/images/customized-lightbox-green.jpg" /></td>
    </tr>
  </tbody>
</table>

## Tech Stack

- [WXT](https://wxt.dev/) for extension development and cross-browser builds
- React 19 for the popup and options pages
- TypeScript 5 throughout the project
- Vitest with `jsdom` and the WXT Vitest plugin for unit testing
- pnpm for package management and scripts
- Manifest V3 configuration managed in `wxt.config.ts`

## Development

Install dependencies:

```bash
pnpm install
```

Start a Chromium or Firefox browser development build:

```bash
pnpm dev
pnpm dev:firefox
```

Type-check the project:

```bash
pnpm compile
```

## Production Builds

Build for Chromium or Firefox browsers:

```bash
pnpm build
pnpm build:firefox
```

Create distributable zip archives:

```bash
pnpm zip
pnpm zip:firefox
```

WXT writes generated extension artifacts to `.output/`.

## Install Locally

### Chromium Browsers

1. Run `pnpm build` or `pnpm dev`.
2. Open your browser's extensions page, such as `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated Chromium build directory inside `.output/`.

### Firefox

1. Run `pnpm build:firefox` or `pnpm dev:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select the generated Firefox zip file inside `.output/` (ends in `-firefox.zip`).

## Testing

Run the full unit test suite:

```bash
pnpm test
```

Run tests in watch mode during development:

```bash
pnpm test:watch
```

Generate a coverage report:

```bash
pnpm test:coverage
```

The test suite uses Vitest with `jsdom`, WXT's test plugin, and shared setup in `src/test/`.

## Project Structure

```text
.
|-- public/
|   |-- favicon.ico
|   `-- images/
|       |-- icon-16.png
|       |-- icon-32.png
|       |-- icon-48.png
|       `-- icon-128.png
|-- images/                           # README screenshots and demo assets
|-- src/
|   |-- components/                   # shared React UI for popup/options
|   |   |-- CloseButtonSection.tsx
|   |   |-- ColorField.tsx
|   |   |-- KeyboardSection.tsx
|   |   |-- PreviewPanel.tsx
|   |   `-- ToolbarColorSection.tsx
|   |-- entrypoints/
|   |   |-- content/
|   |   |   |-- index.ts              # content script orchestration
|   |   |   |-- ActivationDetector.ts # double-press activation and shortcut matching
|   |   |   |-- ActivationDetector.test.ts
|   |   |   |-- ImageResolver.ts      # hovered image lookup and source validation
|   |   |   |-- ImageResolver.test.ts
|   |   |   |-- SettingsManager.ts    # stored settings loading and watchers
|   |   |   |-- SettingsManager.test.ts
|   |   |   |-- OverlayBuilder.ts     # overlay DOM creation, theming, and teardown
|   |   |   |-- ZoomController.ts     # fit, zoom, pan limits, and button states
|   |   |   |-- ZoomController.test.ts
|   |   |   |-- DragController.ts     # pointer-driven panning behavior
|   |   |   |-- DragController.test.ts
|   |   |   `-- style.css             # lightbox styles
|   |   |-- options/                  # React settings page
|   |   |   |-- App.tsx
|   |   |   |-- main.tsx
|   |   |   |-- index.html
|   |   |   `-- style.css
|   |   `-- popup/                    # React popup entrypoint
|   |       |-- App.tsx
|   |       |-- main.tsx
|   |       |-- index.html
|   |       `-- style.css
|   |-- hooks/
|   |   `-- useSettings.ts            # shared settings loader for React entrypoints
|   |-- test/
|   |   |-- createOverlayState.ts     # shared overlay test state factory
|   |   `-- setup.ts                  # shared Vitest/jsdom setup
|   |-- types/
|   |   |-- overlayTypes.ts           # shared overlay state and event types
|   |   |-- formTypes.ts              # options form value types
|   |   `-- colorTypes.ts             # color-related shared types
|   `-- utils/
|       |-- colors.test.ts
|       |-- settingsStorage.ts        # WXT storage access and watchers
|       |-- settings.ts               # defaults, parsing, and validation
|       |-- settings.test.ts
|       |-- shortcuts.ts              # shortcut constants and normalization
|       |-- shortcuts.test.ts
|       |-- theme.ts                  # CSS variable application for the overlay
|       |-- colors.ts                 # CSS color validation helpers
|       |-- formConversions.ts        # options form <-> stored settings mapping
|       `-- math.ts                   # shared numeric helpers like clamp
|-- vitest.config.ts                  # Vitest + WXT unit test configuration
|-- wxt.config.ts                     # WXT config and shared manifest metadata
`-- package.json                      # scripts, dependencies, and extension version
```
