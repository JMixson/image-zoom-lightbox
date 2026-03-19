import { clamp } from '@/utils/math';
import type { OverlayState, ViewportBounds } from '@/types/overlayTypes';

const SCALE_EPSILON = 0.0001;
const SCALE_CHANGE_EPSILON = 0.00001;
const TRANSLATION_EPSILON = 0.5;

type ZoomControllerOptions = {
  zoomStep?: number;
  maxZoomMultiplier?: number;
  viewportPaddingX?: number;
  viewportPaddingY?: number;
  windowRef?: Window;
};

export class ZoomController {
  readonly zoomStep: number;

  private readonly maxZoomMultiplier: number;
  private readonly viewportPaddingX: number;
  private readonly viewportPaddingY: number;
  private readonly windowRef: Window;

  constructor(options: ZoomControllerOptions = {}) {
    this.zoomStep = options.zoomStep ?? 1.1;
    this.maxZoomMultiplier = options.maxZoomMultiplier ?? 8;
    this.viewportPaddingX = options.viewportPaddingX ?? 96;
    this.viewportPaddingY = options.viewportPaddingY ?? 96;
    this.windowRef = options.windowRef ?? window;
  }

  getZoomFactor(direction: 'in' | 'out'): number {
    return direction === 'in' ? this.zoomStep : 1 / this.zoomStep;
  }

  canDrag(state: OverlayState): boolean {
    return state.zoom.scale > state.zoom.fitScale + SCALE_EPSILON;
  }

  initializeLoadedImage(state: OverlayState): void {
    state.image.naturalWidth = Math.max(
      state.elements.displayImage.naturalWidth || 1,
      1,
    );
    state.image.naturalHeight = Math.max(
      state.elements.displayImage.naturalHeight || 1,
      1,
    );

    state.zoom.fitScale = this.computeFitScale(state);
    state.zoom.minScale = state.zoom.fitScale;
    state.zoom.maxScale = state.zoom.fitScale * this.maxZoomMultiplier;
    state.zoom.scale = state.zoom.fitScale;
    state.pan.translateX = 0;
    state.pan.translateY = 0;

    this.applyTransform(state, { clampTranslation: true });
  }

  resize(state: OverlayState): void {
    if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
      return;
    }

    state.zoom.fitScale = this.computeFitScale(state);
    state.zoom.minScale = state.zoom.fitScale;
    state.zoom.maxScale = state.zoom.fitScale * this.maxZoomMultiplier;
    state.zoom.scale = clamp(
      state.zoom.scale,
      state.zoom.minScale,
      state.zoom.maxScale,
    );

    this.applyTransform(state, { clampTranslation: true });
  }

  zoomAt(
    state: OverlayState,
    clientX: number,
    clientY: number,
    factor: number,
  ): void {
    const prevScale = state.zoom.scale;
    const nextScale = clamp(
      prevScale * factor,
      state.zoom.minScale,
      state.zoom.maxScale,
    );
    if (Math.abs(nextScale - prevScale) < SCALE_CHANGE_EPSILON) {
      return;
    }

    const dx = clientX - this.windowRef.innerWidth / 2;
    const dy = clientY - this.windowRef.innerHeight / 2;
    const ratio = nextScale / prevScale;

    state.pan.translateX = dx - (dx - state.pan.translateX) * ratio;
    state.pan.translateY = dy - (dy - state.pan.translateY) * ratio;
    state.zoom.scale = nextScale;

    this.applyTransform(state, { clampTranslation: true });
  }

  resetView(state: OverlayState): void {
    state.zoom.scale = state.zoom.fitScale;
    state.pan.translateX = 0;
    state.pan.translateY = 0;

    this.applyTransform(state, { clampTranslation: true });
  }

  applyTransform(
    state: OverlayState,
    options: { clampTranslation?: boolean } = {},
  ): void {
    if (options.clampTranslation) {
      this.clampTranslation(state);
    }

    state.elements.shell.style.transform =
      `translate(-50%, -50%) translate(${state.pan.translateX}px, ${state.pan.translateY}px) scale(${state.zoom.scale})`;

    const dragCursor = this.canDrag(state)
      ? state.drag.active
        ? 'grabbing'
        : 'grab'
      : 'default';

    state.elements.displayImage.style.cursor = dragCursor;
    state.elements.stage.style.cursor = dragCursor;

    this.updateButtonState(state);
  }

  private computeFitScale(state: OverlayState): number {
    if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
      return 1;
    }

    const bounds = this.getViewportBounds();
    return Math.min(
      bounds.width / state.image.naturalWidth,
      bounds.height / state.image.naturalHeight,
      1,
    );
  }

  private clampTranslation(state: OverlayState): void {
    if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
      return;
    }

    const bounds = this.getViewportBounds();
    const renderedWidth = state.image.naturalWidth * state.zoom.scale;
    const renderedHeight = state.image.naturalHeight * state.zoom.scale;

    const maxX = Math.max(0, (renderedWidth - bounds.width) / 2);
    const maxY = Math.max(0, (renderedHeight - bounds.height) / 2);

    state.pan.translateX = clamp(state.pan.translateX, -maxX, maxX);
    state.pan.translateY = clamp(state.pan.translateY, -maxY, maxY);
  }

  private getViewportBounds(): ViewportBounds {
    return {
      width: Math.max(120, this.windowRef.innerWidth - this.viewportPaddingX),
      height: Math.max(120, this.windowRef.innerHeight - this.viewportPaddingY),
    };
  }

  private updateButtonState(state: OverlayState): void {
    state.elements.zoomOutButton.disabled =
      state.zoom.scale <= state.zoom.minScale + SCALE_EPSILON;
    state.elements.zoomInButton.disabled =
      state.zoom.scale >= state.zoom.maxScale - SCALE_EPSILON;

    const isReset =
      Math.abs(state.zoom.scale - state.zoom.fitScale) <= SCALE_EPSILON &&
      Math.abs(state.pan.translateX) <= TRANSLATION_EPSILON &&
      Math.abs(state.pan.translateY) <= TRANSLATION_EPSILON;

    state.elements.resetButton.disabled = isReset;
  }
}
