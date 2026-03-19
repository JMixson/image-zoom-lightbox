import type { OverlayState } from '@/types/overlayTypes';
import { ZoomController } from './ZoomController';

const DRAG_THRESHOLD_PX = 2;

export class DragController {
  constructor(private readonly zoomController: ZoomController) {}

  handlePointerDown(state: OverlayState, event: PointerEvent): void {
    if (event.button !== 0 || !this.zoomController.canDrag(state)) {
      return;
    }

    state.drag.active = true;
    state.ui.suppressBackdropClick = false;
    state.drag.startX = event.clientX;
    state.drag.startY = event.clientY;
    state.drag.startTranslateX = state.pan.translateX;
    state.drag.startTranslateY = state.pan.translateY;

    if (typeof state.elements.stage.setPointerCapture === 'function') {
      try {
        state.elements.stage.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures.
      }
    }

    event.preventDefault();
    this.zoomController.applyTransform(state);
  }

  handlePointerMove(state: OverlayState, event: PointerEvent): void {
    if (!state.drag.active) {
      return;
    }

    const dx = event.clientX - state.drag.startX;
    const dy = event.clientY - state.drag.startY;

    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
      state.ui.suppressBackdropClick = true;
    }

    state.pan.translateX = state.drag.startTranslateX + dx;
    state.pan.translateY = state.drag.startTranslateY + dy;

    this.zoomController.applyTransform(state, { clampTranslation: true });
    event.preventDefault();
  }

  stopDragging(state: OverlayState, event?: PointerEvent): void {
    if (!state.drag.active) {
      return;
    }

    state.drag.active = false;

    if (
      event &&
      typeof state.elements.stage.hasPointerCapture === 'function' &&
      typeof state.elements.stage.releasePointerCapture === 'function'
    ) {
      try {
        if (state.elements.stage.hasPointerCapture(event.pointerId)) {
          state.elements.stage.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore capture failures.
      }
    }

    this.zoomController.applyTransform(state);
  }
}
