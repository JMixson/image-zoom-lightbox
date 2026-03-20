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
const OVERLAY_Z_INDEX = 2147483647;
const VIEWPORT_PADDING_X = 96;
const VIEWPORT_PADDING_Y = 96;
const SAFE_IMAGE_PROTOCOLS = ['http:', 'https:', 'blob:'];

type OverlayUi = Awaited<ReturnType<typeof createShadowRootUi>>;
type OverlayInfrastructure = {
  overlayUi: OverlayUi;
  overlayBuilder: OverlayBuilder;
};

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  allFrames: false,
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (window.top !== window) {
      return;
    }

    let overlayState: OverlayState | null = null;
    let overlayUi: OverlayUi | null = null;
    let overlayBuilder: OverlayBuilder | null = null;
    let overlayInfrastructurePromise: Promise<OverlayInfrastructure> | null =
      null;
    let overlayOpening = false;

    const getOverlayInfrastructure = (): Promise<OverlayInfrastructure> => {
      if (!overlayInfrastructurePromise) {
        overlayInfrastructurePromise = createShadowRootUi(ctx, {
          name: 'iz-lightbox-overlay',
          anchor: document.documentElement,
          position: 'modal',
          zIndex: OVERLAY_Z_INDEX,
          onMount: (uiContainer, shadow, shadowHost) => {
            // Z-index hardening is applied at multiple layers so the overlay
            // stays above aggressive page stacking contexts and extension UI.
            shadowHost.style.position = 'fixed';
            shadowHost.style.top = '0';
            shadowHost.style.left = '0';
            shadowHost.style.width = '0';
            shadowHost.style.height = '0';
            shadowHost.style.overflow = 'visible';
            shadowHost.style.zIndex = String(OVERLAY_Z_INDEX);
            shadowHost.style.isolation = 'isolate';

            const shadowDocumentElement = shadow.querySelector('html');
            if (shadowDocumentElement instanceof HTMLElement) {
              shadowDocumentElement.style.zIndex = String(OVERLAY_Z_INDEX);
            }

            return uiContainer;
          },
        })
          .then(createdOverlayUi => {
            overlayUi = createdOverlayUi;
            overlayBuilder = new OverlayBuilder({
              mountTarget: createdOverlayUi.uiContainer,
            });

            return {
              overlayUi: createdOverlayUi,
              overlayBuilder,
            };
          })
          .catch(error => {
            overlayInfrastructurePromise = null;
            throw error;
          });
      }

      return overlayInfrastructurePromise;
    };

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
        if (overlayState && overlayBuilder) {
          overlayBuilder.applyTheme(overlayState, settings);
        }
      },
      onShortcutChange: settings => {
        activationDetector.updateShortcutSettings(settings);
      },
    });

    function closeOverlay(): void {
      const state = overlayState;
      const currentOverlayUi = overlayUi;
      const currentOverlayBuilder = overlayBuilder;

      if (
        !state ||
        state.ui.closing ||
        !currentOverlayUi ||
        !currentOverlayBuilder
      ) {
        if (state && (!currentOverlayUi || !currentOverlayBuilder)) {
          overlayState = null;
        }

        return;
      }

      state.ui.closing = true;
      void currentOverlayBuilder.destroy(state).finally(() => {
        currentOverlayUi.remove();
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

    async function mountOverlay(state: OverlayState): Promise<void> {
      const { overlayUi, overlayBuilder } = await getOverlayInfrastructure();
      if (overlayState !== state || state.ui.closing) {
        return;
      }

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

    async function openOverlayForImage(image: HTMLImageElement): Promise<void> {
      if (
        overlayState ||
        overlayOpening ||
        !imageResolver.isVisibleImage(image)
      ) {
        return;
      }

      const imageSrc = imageResolver.resolveImageSrc(image);
      if (!imageSrc) {
        return;
      }

      overlayOpening = true;

      try {
        const { overlayBuilder } = await getOverlayInfrastructure();
        if (overlayState || !imageResolver.isVisibleImage(image)) {
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

        try {
          await mountOverlay(state);
        } catch {
          if (overlayState === state) {
            overlayState = null;
          }
        }
      } finally {
        overlayOpening = false;
      }
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
        overlayBuilder &&
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

      if (overlayState) {
        return;
      }

      if (!activationDetector.shouldActivate(event)) {
        return;
      }

      const candidate = imageResolver.resolveActivationCandidate();
      if (candidate) {
        void openOverlayForImage(candidate);
      }
    }

    ctx.addEventListener(window, 'pointermove', onGlobalPointerMove, {
      capture: true,
      passive: true,
    });
    ctx.addEventListener(window, 'keydown', onGlobalKeyDown, {
      capture: true,
    });

    const stopWatchingSettings = settingsManager.startWatching();

    ctx.onInvalidated(closeOverlay);
    ctx.onInvalidated(stopWatchingSettings);

    void getOverlayInfrastructure();
    void settingsManager.load();
  },
});
