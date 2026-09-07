import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOverlayState } from '@/test/createOverlayState';
import { ZoomController } from './ZoomController';
import { DragController } from './DragController';

function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { pointerId: 7, cancelable: true, ...init });
}

describe('DragController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([
    { button: 0, scale: 1 },
    { button: 1, scale: 2 },
  ])('does not pan with button $button at scale $scale', ({ button, scale }) => {
    const state = createOverlayState({ scale });
    const controller = new DragController(new ZoomController());
    const down = pointer('pointerdown', { button, clientX: 10, clientY: 20 });

    controller.handlePointerDown(state, down);
    controller.handlePointerMove(state, pointer('pointermove', { clientX: 50, clientY: 60 }));

    expect(down.defaultPrevented).toBe(false);
    expect(state.drag.active).toBe(false);
    expect(state.pan).toEqual({ translateX: 0, translateY: 0 });
    expect(state.ui.suppressBackdropClick).toBe(false);
  });

  it('pans from the initial offset, captures the pointer, and stops on release', async () => {
    const state = createOverlayState({ scale: 2, translateX: 4, translateY: -2 });
    const controller = new DragController(new ZoomController());
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.assign(state.elements.stage, {
      setPointerCapture,
      hasPointerCapture: (pointerId: number) => pointerId === 7,
      releasePointerCapture,
    });
    const down = pointer('pointerdown', { clientX: 10, clientY: 15 });
    controller.handlePointerDown(state, down);

    expect(down.defaultPrevented).toBe(true);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(state.elements.stage.style.cursor).toBe('grabbing');

    const move = pointer('pointermove', { clientX: 25, clientY: 5 });
    controller.handlePointerMove(state, move);
    await vi.runAllTimersAsync();

    expect(move.defaultPrevented).toBe(true);
    expect(state.elements.shell.style.transform).toContain('translate(19px, -12px) scale(2)');

    controller.stopDragging(state, pointer('pointerup'));
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(state.elements.stage.style.cursor).toBe('grab');

    controller.handlePointerMove(state, pointer('pointermove', { clientX: 100, clientY: 100 }));
    await vi.runAllTimersAsync();
    expect(state.elements.shell.style.transform).toContain('translate(19px, -12px) scale(2)');
  });

  it('suppresses the release click only after movement exceeds the drag threshold', () => {
    const state = createOverlayState({ scale: 2 });
    const controller = new DragController(new ZoomController());
    controller.handlePointerDown(state, pointer('pointerdown', { clientX: 10, clientY: 10 }));

    controller.handlePointerMove(state, pointer('pointermove', { clientX: 12, clientY: 10 }));
    expect(state.ui.suppressBackdropClick).toBe(false);

    controller.handlePointerMove(state, pointer('pointermove', { clientX: 12, clientY: 11 }));
    controller.stopDragging(state);
    expect(state.ui.suppressBackdropClick).toBe(true);

    controller.handlePointerDown(state, pointer('pointerdown', { clientX: 12, clientY: 11 }));
    expect(state.ui.suppressBackdropClick).toBe(false);
    controller.stopDragging(state);
  });
});
