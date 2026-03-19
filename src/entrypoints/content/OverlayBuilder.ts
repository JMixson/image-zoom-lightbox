import { applyThemeSettings } from '@/utils/theme';
import type { ThemeSettings } from '@/utils/settings';
import type {
  OverlayCreateOptions,
  OverlayEventHandlers,
  OverlayState,
} from '@/types/overlayTypes';

const VIEWER_CLICK_SELECTOR = '.iz-shell, .iz-toolbar, .iz-close';

type OverlayBuilderOptions = {
  overlayZIndex?: number;
};

export class OverlayBuilder {
  private readonly overlayZIndex: number;

  constructor(options: OverlayBuilderOptions = {}) {
    this.overlayZIndex = options.overlayZIndex ?? 2147483000;
  }

  createState(options: OverlayCreateOptions): OverlayState {
    const overlay = document.createElement('div');
    overlay.className = 'iz-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.zIndex = String(this.overlayZIndex);
    applyThemeSettings(overlay, options.themeSettings);

    const backdrop = document.createElement('div');
    backdrop.className = 'iz-backdrop';

    const stage = document.createElement('div');
    stage.className = 'iz-stage';

    const shell = document.createElement('div');
    shell.className = 'iz-shell';

    const displayImage = document.createElement('img');
    displayImage.className = 'iz-image';
    displayImage.alt = options.imageAlt;
    displayImage.draggable = false;

    shell.appendChild(displayImage);
    stage.appendChild(shell);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'iz-btn iz-close';
    closeButton.setAttribute('aria-label', 'Close image zoom');
    closeButton.textContent = 'x';

    const toolbar = document.createElement('div');
    toolbar.className = 'iz-toolbar';

    const zoomOutButton = document.createElement('button');
    zoomOutButton.type = 'button';
    zoomOutButton.className = 'iz-btn';
    zoomOutButton.setAttribute('aria-label', 'Zoom out');
    zoomOutButton.textContent = '-';

    const zoomInButton = document.createElement('button');
    zoomInButton.type = 'button';
    zoomInButton.className = 'iz-btn';
    zoomInButton.setAttribute('aria-label', 'Zoom in');
    zoomInButton.textContent = '+';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'iz-btn iz-reset';
    resetButton.setAttribute('aria-label', 'Reset to fit');
    resetButton.textContent = 'Fit';

    toolbar.append(zoomOutButton, zoomInButton, resetButton);
    overlay.append(backdrop, stage, closeButton, toolbar);

    return {
      elements: {
        overlay,
        backdrop,
        stage,
        shell,
        displayImage,
        closeButton,
        toolbar,
        zoomInButton,
        zoomOutButton,
        resetButton,
      },
      zoom: {
        scale: 1,
        fitScale: 1,
        minScale: 1,
        maxScale: 1,
      },
      pan: {
        translateX: 0,
        translateY: 0,
      },
      drag: {
        active: false,
        startX: 0,
        startY: 0,
        startTranslateX: 0,
        startTranslateY: 0,
      },
      image: {
        src: options.imageSrc,
        alt: options.imageAlt,
        naturalWidth: 0,
        naturalHeight: 0,
      },
      ui: {
        controlsHidden: options.hideControlsByDefault,
        suppressBackdropClick: false,
      },
      abortController: new AbortController(),
    };
  }

  applyTheme(state: OverlayState, themeSettings: ThemeSettings): void {
    applyThemeSettings(state.elements.overlay, themeSettings);
  }

  toggleControlsVisibility(state: OverlayState): void {
    state.ui.controlsHidden = !state.ui.controlsHidden;
    this.applyControlsVisibility(state);
  }

  mount(state: OverlayState, handlers: OverlayEventHandlers): void {
    (document.body || document.documentElement).appendChild(state.elements.overlay);
    this.applyControlsVisibility(state);

    window.requestAnimationFrame(() => {
      if (state.elements.overlay.isConnected) {
        state.elements.overlay.classList.add('iz-open');
      }
    });

    const { signal } = state.abortController;

    state.elements.overlay.addEventListener(
      'wheel',
      event => {
        event.preventDefault();
      },
      { passive: false, signal },
    );

    state.elements.overlay.addEventListener(
      'touchmove',
      event => {
        event.preventDefault();
      },
      { passive: false, signal },
    );

    state.elements.overlay.addEventListener(
      'click',
      event => {
        const targetElement =
          event.target instanceof Element ? event.target : null;
        const clickedInsideViewer =
          !!targetElement && !!targetElement.closest(VIEWER_CLICK_SELECTOR);

        if (!clickedInsideViewer && !state.ui.suppressBackdropClick) {
          handlers.onClose();
        }

        state.ui.suppressBackdropClick = false;
      },
      { signal },
    );

    state.elements.closeButton.addEventListener('click', handlers.onClose, {
      signal,
    });
    state.elements.zoomInButton.addEventListener('click', handlers.onZoomIn, {
      signal,
    });
    state.elements.zoomOutButton.addEventListener('click', handlers.onZoomOut, {
      signal,
    });
    state.elements.resetButton.addEventListener('click', handlers.onReset, {
      signal,
    });

    state.elements.stage.addEventListener('wheel', handlers.onWheel, {
      passive: false,
      signal,
    });
    state.elements.stage.addEventListener(
      'pointerdown',
      handlers.onPointerDown,
      { signal },
    );
    state.elements.stage.addEventListener(
      'pointermove',
      handlers.onPointerMove,
      { signal },
    );
    state.elements.stage.addEventListener('pointerup', handlers.onPointerUp, {
      signal,
    });
    state.elements.stage.addEventListener(
      'pointercancel',
      handlers.onPointerCancel,
      { signal },
    );
    state.elements.stage.addEventListener(
      'lostpointercapture',
      handlers.onLostPointerCapture,
      { signal },
    );

    window.addEventListener('resize', handlers.onResize, { signal });

    state.elements.displayImage.addEventListener('load', handlers.onImageLoad, {
      once: true,
      signal,
    });
    state.elements.displayImage.addEventListener(
      'error',
      handlers.onImageError,
      {
        once: true,
        signal,
      },
    );

    state.elements.displayImage.src = state.image.src;
  }

  destroy(state: OverlayState): void {
    state.abortController.abort();

    if (state.elements.overlay.isConnected) {
      state.elements.overlay.remove();
    }
  }

  private applyControlsVisibility(state: OverlayState): void {
    state.elements.overlay.classList.toggle(
      'iz-controls-hidden',
      state.ui.controlsHidden,
    );
  }
}
