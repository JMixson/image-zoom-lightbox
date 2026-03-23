import { describe, expect, it, vi } from 'vitest';

import { createOverlayState } from '@/test/createOverlayState';
import type { ZoomController } from './ZoomController';
import { DragController } from './DragController';

function createZoomControllerStub(canDrag = true): ZoomController {
  return {
    applyTransform: vi.fn(),
    canDrag: vi.fn(() => canDrag),
    scheduleTransform: vi.fn(),
  } as unknown as ZoomController;
}

describe('DragController', () => {
  it('starts dragging only for a primary-button event when dragging is allowed', () => {
    const state = createOverlayState({
      fitScale: 1,
      maxScale: 4,
      minScale: 1,
      scale: 2,
      translateX: 12,
      translateY: -8,
    });
    const blockedZoomController = createZoomControllerStub(false);
    const blockedController = new DragController(blockedZoomController);

    blockedController.handlePointerDown(
      state,
      {
        button: 0,
        clientX: 50,
        clientY: 60,
        pointerId: 1,
        preventDefault: vi.fn(),
      } as unknown as PointerEvent,
    );

    expect(state.drag.active).toBe(false);

    const zoomController = createZoomControllerStub(true);
    const controller = new DragController(zoomController);
    const preventDefault = vi.fn();

    controller.handlePointerDown(
      state,
      {
        button: 1,
        clientX: 50,
        clientY: 60,
        pointerId: 1,
        preventDefault,
      } as unknown as PointerEvent,
    );

    expect(state.drag.active).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();

    controller.handlePointerDown(
      state,
      {
        button: 0,
        clientX: 50,
        clientY: 60,
        pointerId: 1,
        preventDefault,
      } as unknown as PointerEvent,
    );

    expect(state.drag.active).toBe(true);
    expect(state.drag.startX).toBe(50);
    expect(state.drag.startY).toBe(60);
    expect(state.drag.startTranslateX).toBe(12);
    expect(state.drag.startTranslateY).toBe(-8);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(zoomController.applyTransform).toHaveBeenCalledWith(state, {
      clampTranslation: true,
    });
  });

  it('captures the pointer when supported', () => {
    const state = createOverlayState({ fitScale: 1, minScale: 1, scale: 2 });
    const zoomController = createZoomControllerStub(true);
    const controller = new DragController(zoomController);
    const setPointerCapture = vi.fn();

    Object.defineProperty(state.elements.stage, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });

    controller.handlePointerDown(
      state,
      {
        button: 0,
        clientX: 10,
        clientY: 20,
        pointerId: 7,
        preventDefault: vi.fn(),
      } as unknown as PointerEvent,
    );

    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('updates translation from pointer delta and schedules a clamped transform', () => {
    const state = createOverlayState({
      dragActive: true,
      scale: 2,
      fitScale: 1,
      minScale: 1,
      translateX: 4,
      translateY: -2,
    });
    const zoomController = createZoomControllerStub(true);
    const controller = new DragController(zoomController);
    const preventDefault = vi.fn();

    state.drag.startX = 10;
    state.drag.startY = 15;
    state.drag.startTranslateX = 4;
    state.drag.startTranslateY = -2;

    controller.handlePointerMove(
      state,
      {
        clientX: 25,
        clientY: 5,
        preventDefault,
      } as unknown as PointerEvent,
    );

    expect(state.pan.translateX).toBe(19);
    expect(state.pan.translateY).toBe(-12);
    expect(zoomController.scheduleTransform).toHaveBeenCalledWith(state, {
      clampTranslation: true,
    });
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('suppresses backdrop clicks after the drag threshold is crossed', () => {
    const state = createOverlayState({
      dragActive: true,
      fitScale: 1,
      minScale: 1,
      scale: 2,
    });
    const controller = new DragController(createZoomControllerStub(true));

    state.drag.startX = 10;
    state.drag.startY = 10;

    controller.handlePointerMove(
      state,
      {
        clientX: 11,
        clientY: 10,
        preventDefault: vi.fn(),
      } as unknown as PointerEvent,
    );
    expect(state.ui.suppressBackdropClick).toBe(false);

    controller.handlePointerMove(
      state,
      {
        clientX: 12,
        clientY: 11,
        preventDefault: vi.fn(),
      } as unknown as PointerEvent,
    );
    expect(state.ui.suppressBackdropClick).toBe(true);
  });

  it('stops dragging and releases pointer capture when held', () => {
    const state = createOverlayState({
      dragActive: true,
      fitScale: 1,
      minScale: 1,
      scale: 2,
    });
    const zoomController = createZoomControllerStub(true);
    const controller = new DragController(zoomController);
    const hasPointerCapture = vi.fn(() => true);
    const releasePointerCapture = vi.fn();

    Object.defineProperty(state.elements.stage, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCapture,
    });
    Object.defineProperty(state.elements.stage, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });

    controller.stopDragging(
      state,
      {
        pointerId: 7,
      } as PointerEvent,
    );

    expect(state.drag.active).toBe(false);
    expect(hasPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(zoomController.applyTransform).toHaveBeenCalledWith(state, {
      clampTranslation: true,
    });
  });
});
