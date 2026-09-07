import { applyThemeSettings } from '@/utils/theme';
import type { ThemeSettings } from '@/utils/settings';
import type {
  OverlayCreateOptions,
  OverlayEventHandlers,
  OverlayState,
} from '@/types/overlayTypes';

const VIEWER_CLICK_SELECTOR = '.iz-shell, .iz-toolbar, .iz-close';
const CLOSE_TRANSITION_BUFFER_MS = 50;

type OverlayBuilderOptions = {
  mountTarget: HTMLElement;
  documentRef?: Document;
  windowRef?: Window;
  closeTransitionMs?: number;
};

export class OverlayBuilder {
  private readonly mountTarget: HTMLElement;
  private readonly documentRef: Document;
  private readonly windowRef: Window;
  private readonly closeTransitionMs: number;
  private openingFrame: number | undefined;
  private finishClose?: () => void;
  private closePromise?: Promise<void>;

  constructor(options: OverlayBuilderOptions) {
    this.documentRef = options.documentRef ?? document;
    this.windowRef = options.windowRef ?? window;
    this.mountTarget = options.mountTarget;
    this.closeTransitionMs = options.closeTransitionMs ?? 220;
  }

  createState(options: OverlayCreateOptions): OverlayState {
    const overlay = this.documentRef.createElement('div');
    overlay.className = 'iz-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image zoom');
    applyThemeSettings(overlay, options.themeSettings);

    const backdrop = this.documentRef.createElement('div');
    backdrop.className = 'iz-backdrop';

    const stage = this.documentRef.createElement('div');
    stage.className = 'iz-stage';

    const shell = this.documentRef.createElement('div');
    shell.className = 'iz-shell';

    const displayImage = this.documentRef.createElement('img');
    displayImage.className = 'iz-image';
    displayImage.alt = options.imageAlt;
    displayImage.draggable = false;

    shell.appendChild(displayImage);
    stage.appendChild(shell);

    const closeButton = this.createButton('Close image zoom', '\u00D7', 'iz-close');

    const toolbar = this.documentRef.createElement('div');
    toolbar.className = 'iz-toolbar';

    const status = this.documentRef.createElement('p');
    status.className = 'iz-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Loading image…';
    overlay.dataset.imageStatus = 'loading';

    const zoomOutButton = this.createButton('Zoom out', '-');
    const zoomInButton = this.createButton('Zoom in', '+');
    const resetButton = this.createButton('Reset to fit', 'Fit', 'iz-reset');

    toolbar.append(zoomOutButton, zoomInButton, resetButton);
    overlay.append(backdrop, stage, status, closeButton, toolbar);

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
        status,
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
        closing: false,
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

  setImageStatus(state: OverlayState, status: 'loaded' | 'error'): void {
    state.elements.overlay.dataset.imageStatus = status;
    state.elements.status.hidden = status === 'loaded';
    state.elements.status.textContent = status === 'error'
      ? 'This image could not be loaded. Press Escape or click outside to close.'
      : '';
  }

  mount(state: OverlayState, handlers: OverlayEventHandlers): void {
    this.mountTarget.appendChild(state.elements.overlay);
    this.applyControlsVisibility(state);

    this.openingFrame = this.windowRef.requestAnimationFrame(() => {
      this.openingFrame = undefined;
      if (state.elements.overlay.isConnected && !state.ui.closing) {
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

    this.windowRef.addEventListener('resize', handlers.onResize, { signal });

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

  destroy(state: OverlayState): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.stopEvents(state);

    const { overlay, backdrop } = state.elements;
    if (!overlay.isConnected) {
      return Promise.resolve();
    }

    if (!overlay.classList.contains('iz-open') || this.prefersReducedMotion()) {
      overlay.remove();
      return Promise.resolve();
    }

    overlay.classList.remove('iz-open');

    this.closePromise = new Promise(resolve => {
      const cleanup = (): void => {
        this.finishClose = undefined;
        backdrop.removeEventListener('transitionend', onTransitionEnd);
        this.windowRef.clearTimeout(timeoutId);

        if (overlay.isConnected) {
          overlay.remove();
        }

        resolve();
      };

      const onTransitionEnd = (event: TransitionEvent): void => {
        if (event.target === backdrop && event.propertyName === 'opacity') {
          cleanup();
        }
      };

      const timeoutId = this.windowRef.setTimeout(
        cleanup,
        this.closeTransitionMs + CLOSE_TRANSITION_BUFFER_MS,
      );

      backdrop.addEventListener('transitionend', onTransitionEnd);
      this.finishClose = cleanup;
    });
    return this.closePromise;
  }

  dispose(state: OverlayState): void {
    this.stopEvents(state);
    this.finishClose?.();
    state.elements.displayImage.removeAttribute('src');
    state.elements.overlay.remove();
  }

  private stopEvents(state: OverlayState): void {
    state.ui.closing = true;
    state.abortController.abort();
    if (this.openingFrame !== undefined) {
      this.windowRef.cancelAnimationFrame(this.openingFrame);
      this.openingFrame = undefined;
    }
  }

  private applyControlsVisibility(state: OverlayState): void {
    state.elements.overlay.classList.toggle(
      'iz-controls-hidden',
      state.ui.controlsHidden,
    );
  }

  private createButton(label: string, text: string, className = ''): HTMLButtonElement {
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.className = `iz-btn ${className}`.trim();
    button.setAttribute('aria-label', label);
    button.textContent = text;
    return button;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof this.windowRef.matchMedia === 'function' &&
      this.windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
