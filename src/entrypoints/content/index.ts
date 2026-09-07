import './style.css';

import { ActivationDetector } from './ActivationDetector';
import { ImageResolver } from './ImageResolver';
import { SettingsManager } from './SettingsManager';
import { ViewerSession } from '@/viewer/session';

const OVERLAY_Z_INDEX = 2147483647;

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  allFrames: false,
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (window.top !== window) return;

    let session: ViewerSession | null = null;
    let disposed = false;
    const imageResolver = new ImageResolver();
    const settingsManager = new SettingsManager();
    const activationDetector = new ActivationDetector(settingsManager.getShortcutSettings());

    async function createUi() {
      // Release WXT's per-UI invalidation listeners when this session ends.
      const cleanups: (() => void)[] = [];
      const uiContext = Object.create(ctx) as typeof ctx;
      uiContext.onInvalidated = callback => {
        const cleanup = ctx.onInvalidated(callback);
        cleanups.push(cleanup);
        return cleanup;
      };
      const cleanup = () => cleanups.splice(0).forEach(unwatch => unwatch());
      try {
        const ui = await createShadowRootUi(uiContext, {
          name: 'iz-lightbox-overlay',
          anchor: document.documentElement,
          position: 'modal',
          zIndex: OVERLAY_Z_INDEX,
          onMount: (uiContainer, shadow, shadowHost) => {
            // Preserve the existing stacking safeguards until modal browser checks pass.
            Object.assign(shadowHost.style, {
              position: 'fixed', top: '0', left: '0', width: '0', height: '0',
              overflow: 'visible', zIndex: String(OVERLAY_Z_INDEX), isolation: 'isolate',
            });
            const root = shadow.querySelector('html');
            if (root instanceof HTMLElement) root.style.zIndex = String(OVERLAY_Z_INDEX);
            return uiContainer;
          },
        });
        return {
          uiContainer: ui.uiContainer,
          mount: () => ui.mount(),
          remove: () => { cleanup(); ui.remove(); },
        };
      } catch (error) {
        cleanup();
        throw error;
      }
    }

    settingsManager.setCallbacks({
      onThemeChange: settings => session?.applyTheme(settings),
      onShortcutChange: settings => activationDetector.updateShortcutSettings(settings),
    });

    function openOverlayForImage(image: HTMLImageElement): void {
      if (disposed || session || !image.isConnected || !imageResolver.isVisibleImage(image)) return;
      const imageSrc = imageResolver.resolveImageSrc(image);
      if (!imageSrc) return;

      const nextSession = new ViewerSession({
        createUi,
        getImageOptions: () => ({
          imageSrc,
          imageAlt: imageResolver.sanitizeImageAltText(image.alt),
          themeSettings: settingsManager.getThemeSettings(),
          hideControlsByDefault: settingsManager.getShortcutSettings().hideControlsByDefault,
        }),
        onDisposed: () => { if (session === nextSession) session = null; },
      });
      session = nextSession;
      void nextSession.open();
    }

    function onGlobalKeyDown(event: KeyboardEvent): void {
      if (disposed) return;
      if (session) {
        if (event.key === 'Escape') {
          event.preventDefault();
          session.close();
        } else if (session.status === 'open' && activationDetector.matchesToggleControls(event)) {
          event.preventDefault();
          session.toggleControls();
        }
        return;
      }
      if (!activationDetector.shouldActivate(event)) return;
      const candidate = imageResolver.resolveActivationCandidate();
      if (candidate) openOverlayForImage(candidate);
    }

    ctx.addEventListener(window, 'pointermove', event => {
      imageResolver.handlePointerMove(event, !!session);
    }, { capture: true, passive: true });
    ctx.addEventListener(window, 'keydown', onGlobalKeyDown, { capture: true });
    for (const eventName of ['blur', 'focusin', 'compositionstart'] as const) {
      ctx.addEventListener(window, eventName, () => activationDetector.reset());
    }

    const stopWatchingSettings = settingsManager.startWatching();
    ctx.onInvalidated(() => {
      disposed = true;
      activationDetector.reset();
      session?.dispose();
      stopWatchingSettings();
    });
    void settingsManager.load();
  },
});
