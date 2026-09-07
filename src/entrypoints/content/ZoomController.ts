import type { OverlayState } from '@/types/overlayTypes';
import {
  clampPan,
  resizeZoom,
  viewportBounds,
  zoomAroundAnchor,
  type Dimensions,
} from '@/viewer/geometry';

const SCALE_EPSILON = 0.0001;
const TRANSLATION_EPSILON = 0.5;

type ZoomControllerOptions = {
  zoomStep?: number;
  maxZoomMultiplier?: number;
  viewportPaddingX?: number;
  viewportPaddingY?: number;
  windowRef?: Window;
};

type ScheduledTransform = {
  frameId: number;
  clampTranslation: boolean;
};

export class ZoomController {
  readonly zoomStep: number;

  private readonly maxZoomMultiplier: number;
  private readonly viewportPaddingX: number;
  private readonly viewportPaddingY: number;
  private readonly windowRef: Window;
  private readonly scheduledTransforms = new WeakMap<
    OverlayState,
    ScheduledTransform
  >();

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

    this.updateZoomBounds(state);
    this.resetView(state);
  }

  resize(state: OverlayState): void {
    if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
      return;
    }

    this.updateZoomBounds(state);

    this.applyTransform(state, { clampTranslation: true });
  }

  zoomAt(
    state: OverlayState,
    clientX: number,
    clientY: number,
    factor: number,
  ): void {
    const next = zoomAroundAnchor(
      state.zoom,
      state.pan,
      {
        x: clientX - this.windowRef.innerWidth / 2,
        y: clientY - this.windowRef.innerHeight / 2,
      },
      factor,
    );
    if (!next) return;
    state.pan = next.pan;
    state.zoom.scale = next.scale;

    this.scheduleTransform(state, { clampTranslation: true });
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
    this.cancelScheduledTransform(state);
    this.commitTransform(state, options);
  }

  scheduleTransform(
    state: OverlayState,
    options: { clampTranslation?: boolean } = {},
  ): void {
    const scheduledTransform = this.scheduledTransforms.get(state);
    if (scheduledTransform) {
      scheduledTransform.clampTranslation =
        scheduledTransform.clampTranslation || !!options.clampTranslation;
      return;
    }

    const nextTransform: ScheduledTransform = {
      frameId: 0,
      clampTranslation: !!options.clampTranslation,
    };

    nextTransform.frameId = this.windowRef.requestAnimationFrame(() => {
      this.scheduledTransforms.delete(state);

      if (state.ui.closing || !state.elements.overlay.isConnected) {
        return;
      }

      this.commitTransform(state, {
        clampTranslation: nextTransform.clampTranslation,
      });
    });

    this.scheduledTransforms.set(state, nextTransform);
  }

  cancelScheduledTransform(state: OverlayState): void {
    const scheduledTransform = this.scheduledTransforms.get(state);
    if (!scheduledTransform) {
      return;
    }

    this.windowRef.cancelAnimationFrame(scheduledTransform.frameId);
    this.scheduledTransforms.delete(state);
  }

  private commitTransform(
    state: OverlayState,
    options: { clampTranslation?: boolean } = {},
  ): void {
    if (options.clampTranslation) {
      state.pan = clampPan(
        state.pan, this.imageDimensions(state), this.getViewportBounds(), state.zoom.scale,
      );
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

  private updateZoomBounds(state: OverlayState): void {
    state.zoom = resizeZoom(
      state.zoom, this.imageDimensions(state), this.getViewportBounds(), this.maxZoomMultiplier,
    );
  }

  private imageDimensions(state: OverlayState): Dimensions {
    return { width: state.image.naturalWidth, height: state.image.naturalHeight };
  }

  private getViewportBounds(): Dimensions {
    return viewportBounds(
      { width: this.windowRef.innerWidth, height: this.windowRef.innerHeight },
      { width: this.viewportPaddingX, height: this.viewportPaddingY },
    );
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
