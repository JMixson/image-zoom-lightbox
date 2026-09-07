# Viewer browser smoke checks

Use the installed Vite binary (no package installation):

```sh
./node_modules/.bin/vite --config src/test/browser/vite.config.ts
```

Open http://localhost:5173/src/test/browser/index.html. This fixture runs the actual session, builder, geometry, and input controllers in a shadow root with hostile page CSS. It does not load the extension or replace packaged-extension testing.

- Open the image; check fit, zoom buttons, cursor-centered wheel zoom, pan bounds, and Fit.
- Drag and release; the viewer must remain open. Click the backdrop or press Escape to dismiss.
- Reopen repeatedly, including closing before the image loads.
- Open the broken image; an error stays visible and Escape/backdrop dismissal works.
- Open with hidden controls; H reveals them and Escape closes.
- Check reduced motion in browser emulation.

Before release, also load the built Chromium/Firefox extensions and check double-press activation, typing exclusion (including shadow-root editors and IME), live preferences, extension reload during opening, and host-page interactions. Native modal/focus changes remain a later rewrite step; Tab trapping and page inertness are not implemented by this harness.
