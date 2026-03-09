# Image Zoom Lightbox (Chrome Extension)

A Chrome extension that opens an Edge-style image lightbox when you use a configurable double-press activation shortcut while hovering an image.

## Preview

![Extension preview](images/demo.gif)

## Features

- Configurable double-press activation shortcut on hovered images (`Ctrl + Ctrl` by default)
- Zoom controls (`-`, `+`, `Fit`)
- Toggle toolbar/close controls with `h` by default while the lightbox is open
- Mouse wheel zoom around cursor
- Drag-to-pan when zoomed in
- Color customization for toolbar and close button styles (via Settings)
- Customizable activation shortcut (supported modifier double-presses via Settings)
- Option to hide overlay controls by default (via Settings)
- Customizable controls-toggle shortcut (via Settings, resettable to default)
- Activation shortcut is ignored while typing in editable fields
- Close with `Esc` or click outside
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

## Load Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension` folder (the folder containing `manifest.json`).

## Usage

1. Hover any image on a webpage.
2. Press the configured activation shortcut twice quickly. The default is `Ctrl + Ctrl`.
3. Zoom with the mouse wheel or toolbar buttons.
4. Drag to pan when zoomed.
5. Press the controls-toggle shortcut to hide/show the toolbar and close button. The default is `h`.
6. Press `Esc` (or click outside) to close.

If you enable "Hide overlay controls by default" in Options, step 5 is also how
you reveal the controls after opening the lightbox.

You can change the activation shortcut in Options. Supported choices are
modifier double-press shortcuts such as `Ctrl + Ctrl`, `Shift + Shift`, and
`Cmd/Meta + Cmd/Meta`.

## Project Structure

Files within the `extension` folder

- `manifest.json`: MV3 extension manifest (permissions, content scripts, popup, and options page setup)
- `content.js`: Trigger detection, lightbox behavior, and zoom/pan interactions
- `content.css`: Lightbox overlay and in-page control styling
- `popup.html`: Popup UI markup
- `popup.css`: Popup UI styling
- `popup.js`: Popup behavior and controls
- `options.html`: Options page markup
- `options.css`: Options page styling
- `options.js`: Options page logic and settings handling

## Limitations

- Supports standard `<img>` elements only
- Top frame only (no iframe support)
- No background-image/canvas/SVG support in this version
- Does not run on restricted browser pages (for example, Chrome internal pages)
