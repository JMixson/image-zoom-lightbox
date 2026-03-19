import './style.css';

import { ActivationDetector } from './ActivationDetector';
import { DragController } from './DragController';
import { ImageResolver } from './ImageResolver';
import { OverlayBuilder } from './OverlayBuilder';
import { SettingsManager } from './SettingsManager';
import type { OverlayState } from '@/types/overlayTypes';
import { ZoomController } from './ZoomController';

const DOUBLE_ACTIVATION_MS = 350;
const ZOOM_STEP = 1.1;
const MAX_ZOOM_MULTIPLIER = 8;
const MAX_IMAGE_ALT_LENGTH = 300;
const OVERLAY_Z_INDEX = 2147483000;
const VIEWPORT_PADDING_X = 96;
const VIEWPORT_PADDING_Y = 96;
const SAFE_IMAGE_PROTOCOLS = ['http:', 'https:', 'blob:'];

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: false,
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (window.top !== window) {
      return;
    }

    const overlayUi = await createShadowRootUi(ctx, {
      name: 'iz-lightbox-overlay',
      position: 'modal',
      zIndex: OVERLAY_Z_INDEX,
      onMount: uiContainer => uiContainer,
    });

    let overlayState: OverlayState | null = null;

    const overlayBuilder = new OverlayBuilder({
      mountTarget: overlayUi.uiContainer,
    });
    const imageResolver = new ImageResolver({
      maxImageAltLength: MAX_IMAGE_ALT_LENGTH,
      safeImageProtocols: SAFE_IMAGE_PROTOCOLS,
    });
    const zoomController = new ZoomController({
      zoomStep: ZOOM_STEP,
      maxZoomMultiplier: MAX_ZOOM_MULTIPLIER,
      viewportPaddingX: VIEWPORT_PADDING_X,
      viewportPaddingY: VIEWPORT_PADDING_Y,
    });
    const dragController = new DragController(zoomController);
    const settingsManager = new SettingsManager();
    const activationDetector = new ActivationDetector(
      settingsManager.getShortcutSettings(),
      { doubleActivationMs: DOUBLE_ACTIVATION_MS },
    );

    settingsManager.setCallbacks({
      onThemeChange: settings => {
        if (overlayState) {
          overlayBuilder.applyTheme(overlayState, settings);
        }
      },
      onShortcutChange: settings => {
        activationDetector.updateShortcutSettings(settings);
      },
    });

    function closeOverlay(): void {
      const state = overlayState;
      if (!state || state.ui.closing) {
        return;
      }

      state.ui.closing = true;
      void overlayBuilder.destroy(state).finally(() => {
        overlayUi.remove();
        if (overlayState === state) {
          overlayState = null;
        }
      });
    }

    function runIfOverlayActive(
      state: OverlayState,
      callback: () => void,
    ): void {
      if (overlayState === state && !state.ui.closing) {
        callback();
      }
    }

    function mountOverlay(state: OverlayState): void {
      if (!overlayUi.shadowHost.isConnected) {
        overlayUi.mount();
      }

      const zoomFromCenter = (direction: 'in' | 'out'): void => {
        zoomController.zoomAt(
          state,
          window.innerWidth / 2,
          window.innerHeight / 2,
          zoomController.getZoomFactor(direction),
        );
      };

      overlayBuilder.mount(state, {
        onClose: closeOverlay,
        onZoomIn: () => {
          zoomFromCenter('in');
        },
        onZoomOut: () => {
          zoomFromCenter('out');
        },
        onReset: () => {
          zoomController.resetView(state);
        },
        onWheel: event => {
          event.preventDefault();
          zoomController.zoomAt(
            state,
            event.clientX,
            event.clientY,
            event.deltaY < 0
              ? zoomController.getZoomFactor('in')
              : zoomController.getZoomFactor('out'),
          );
        },
        onPointerDown: event => {
          dragController.handlePointerDown(state, event);
        },
        onPointerMove: event => {
          dragController.handlePointerMove(state, event);
        },
        onPointerUp: event => {
          dragController.stopDragging(state, event);
        },
        onPointerCancel: event => {
          dragController.stopDragging(state, event);
        },
        onLostPointerCapture: event => {
          dragController.stopDragging(state, event);
        },
        onResize: () => {
          runIfOverlayActive(state, () => {
            zoomController.resize(state);
          });
        },
        onImageLoad: () => {
          runIfOverlayActive(state, () => {
            zoomController.initializeLoadedImage(state);
          });
        },
        onImageError: () => {
          runIfOverlayActive(state, () => {
            closeOverlay();
          });
        },
      });

      zoomController.applyTransform(state);
    }

    function openOverlayForImage(image: HTMLImageElement): void {
      if (overlayState || !imageResolver.isVisibleImage(image)) {
        return;
      }

      const imageSrc = imageResolver.resolveImageSrc(image);
      if (!imageSrc) {
        return;
      }

      const state = overlayBuilder.createState({
        imageSrc,
        imageAlt: imageResolver.sanitizeImageAltText(image.alt),
        themeSettings: settingsManager.getThemeSettings(),
        hideControlsByDefault:
          settingsManager.getShortcutSettings().hideControlsByDefault,
      });

      overlayState = state;
      mountOverlay(state);
    }

    function onGlobalPointerMove(event: PointerEvent): void {
      imageResolver.handlePointerMove(event, !!overlayState);
    }

    function onGlobalKeyDown(event: KeyboardEvent): void {
      if (overlayState?.ui.closing) {
        if (event.key === 'Escape') {
          event.preventDefault();
        }

        return;
      }

      if (
        overlayState &&
        activationDetector.matchesToggleControls(event) &&
        !activationDetector.isEditableTarget(event.target)
      ) {
        event.preventDefault();
        overlayBuilder.toggleControlsVisibility(overlayState);
        return;
      }

      if (overlayState && event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (overlayState || activationDetector.isEditableTarget(event.target)) {
        return;
      }

      if (!activationDetector.shouldActivate(event)) {
        return;
      }

      const candidate = imageResolver.resolveActivationCandidate();
      if (candidate) {
        openOverlayForImage(candidate);
      }
    }

    ctx.addEventListener(document, 'pointermove', onGlobalPointerMove, {
      capture: true,
    });
    ctx.addEventListener(document, 'keydown', onGlobalKeyDown, {
      capture: true,
    });

    const stopWatchingSettings = settingsManager.startWatching();

    ctx.onInvalidated(closeOverlay);
    ctx.onInvalidated(stopWatchingSettings);

    void settingsManager.load();
  },
});
