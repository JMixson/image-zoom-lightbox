# Image Zoom Lightbox (Chrome Extension)

A Chrome extension that opens an Edge-style image lightbox when you press `Ctrl` twice while hovering an image.

Created using GPT-5.3-Codex for functionality, and Sonnet 4.6 for styling.

## Preview

![Extension preview](demo.gif)

## Features

- Double-click `Ctrl` activation on hovered images
- Zoom controls (`-`, `+`, `Fit`)
- Mouse wheel zoom around cursor
- Drag-to-pan when zoomed in
- Close with `Esc` or click outside
- Runs on most `http://` and `https://` pages

## Load Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the "extension" folder (the folder containing `manifest.json`).

## Usage

1. Hover any image on a webpage.
2. Press `Ctrl` twice quickly.
3. Zoom with the mouse wheel or toolbar buttons.
4. Drag to pan when zoomed.
5. Press `Esc` (or click outside) to close.

## Project Structure

- `manifest.json`: MV3 extension manifest
- `content.js`: trigger detection, lightbox logic, zoom/pan behavior
- `content.css`: overlay and control styling

## Limitations

- Supports standard `<img>` elements only
- Top frame only (no iframe support)
- No background-image/canvas/SVG support in this version
- Does not run on restricted browser pages (for example, Chrome internal pages)
