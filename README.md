# Image Zoom Lightbox

A browser extension that opens an Edge-style image lightbox when you use a configurable double-press shortcut while hovering an image.

## Preview

![Extension preview](images/demo.gif)

## Browser Support

- Chromium-based browsers via the default WXT build, including Chrome and Edge
- Firefox via the Firefox-specific WXT build

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
- React for the popup and options pages
- TypeScript throughout the project
- Manifest V3 configuration managed in `wxt.config.ts`

## Development

Install dependencies:

```bash
pnpm install
```

Start the default development build for Chromium browsers:

```bash
pnpm dev
```

Start a Firefox development build:

```bash
pnpm dev:firefox
```

Type-check the project:

```bash
pnpm compile
```

## Production Builds

Build for Chromium browsers:

```bash
pnpm build
```

Build for Firefox:

```bash
pnpm build:firefox
```

Create distributable zip archives:

```bash
pnpm zip
pnpm zip:firefox
```

WXT writes generated extension artifacts to `.output/`.

## Loading the Extension Locally

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

## Usage

1. Hover any image on a webpage.
2. Press the configured activation shortcut twice quickly. The default is `Ctrl + Ctrl`.
3. Zoom with the mouse wheel or toolbar buttons.
4. Drag to pan when zoomed.
5. Press the controls-toggle shortcut to hide or show the toolbar and close button. The default is `h`.
6. Press `Esc` or click outside the viewer to close.

If you enable "Hide overlay controls by default" in Settings, use the toggle shortcut to reveal the controls after opening the lightbox.

You can change the activation shortcut in Settings. Supported choices are:

- `Ctrl + Ctrl`
- `Shift + Shift`
- `Cmd/Meta + Cmd/Meta`

### macOS Notes

If the default activation shortcut does not work well with your browser or system setup, switch to `Shift + Shift` or `Cmd/Meta + Cmd/Meta` in Settings.

### Edge Notes

Microsoft Edge includes a built-in **Magnify image** feature that can also use `Ctrl + Ctrl`. If that conflicts with this extension, either:

- Change this extension's activation shortcut in Settings
- Turn off Edge's **Magnify image** setting at `edge://settings/privacy/sitePermissions/allPermissions/magnifyImages`

## Project Structure

- `wxt.config.ts`: shared extension metadata, browser settings, and WXT config
- `src/entrypoints/content`: content script and lightbox styles injected into web pages
- `src/entrypoints/popup`: React popup UI for opening Settings
- `src/entrypoints/options`: React settings page for shortcuts and theme customization
- `src/utils`: WXT-backed settings storage, color, shortcut, theme, and settings helpers
- `public/images`: packaged extension icons
- `images`: README screenshots and demo assets

## Limitations

- Supports standard `<img>` elements only
- Top frame only; no iframe support
- No `background-image`, `canvas`, or `svg` support in this version
- Does not run on restricted browser pages such as internal browser URLs
