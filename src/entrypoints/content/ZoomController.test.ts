import { describe, expect, it } from 'vitest';

import { createOverlayState } from '@/test/createOverlayState';
import { ZoomController } from './ZoomController';

type TestWindowRef = {
  cancelAnimationFrame: (frameId: number) => void;
  flushAnimationFrame: () => void;
  innerHeight: number;
  innerWidth: number;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
};

function createWindowRef(
  innerWidth = 1000,
  innerHeight = 800,
): TestWindowRef {
  let nextFrameId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  return {
    cancelAnimationFrame: (frameId: number) => {
      callbacks.delete(frameId);
    },
    flushAnimationFrame: () => {
      const pending = [...callbacks.entries()];
      callbacks.clear();

      for (const [frameId, callback] of pending) {
        callback(frameId);
      }
    },
    innerHeight,
    innerWidth,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      callbacks.set(frameId, callback);
      return frameId;
    },
  } as TestWindowRef;
}

describe('ZoomController', () => {
  it('initializes fit, min, max, and current scale from the loaded image', () => {
    const windowRef = createWindowRef(1000, 800);
    const controller = new ZoomController({
      windowRef: windowRef as unknown as Window,
    });
    const state = createOverlayState({
      naturalWidth: 1600,
      naturalHeight: 900,
    });

    controller.initializeLoadedImage(state);

    expect(state.zoom.fitScale).toBeCloseTo(904 / 1600);
    expect(state.zoom.minScale).toBeCloseTo(904 / 1600);
    expect(state.zoom.maxScale).toBeCloseTo((904 / 1600) * 8);
    expect(state.zoom.scale).toBeCloseTo(904 / 1600);
    expect(state.pan.translateX).toBe(0);
    expect(state.pan.translateY).toBe(0);
  });

  it('allows dragging only when zoomed in beyond fit scale', () => {
    const controller = new ZoomController({
      windowRef: createWindowRef() as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      scale: 1,
    });

    expect(controller.canDrag(state)).toBe(false);

    state.zoom.scale = 1.2;
    expect(controller.canDrag(state)).toBe(true);
  });

  it('zooms around the pointer position', () => {
    const windowRef = createWindowRef(1000, 800);
    const controller = new ZoomController({
      windowRef: windowRef as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 1,
    });

    controller.zoomAt(state, 600, 450, 2);

    expect(state.zoom.scale).toBe(2);
    expect(state.pan.translateX).toBe(-100);
    expect(state.pan.translateY).toBe(-50);
  });

  it('clamps zooming to the configured min and max scale', () => {
    const controller = new ZoomController({
      windowRef: createWindowRef() as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 1.5,
    });

    controller.zoomAt(state, 500, 400, 10);
    expect(state.zoom.scale).toBe(4);

    controller.zoomAt(state, 500, 400, 0.001);
    expect(state.zoom.scale).toBe(1);
  });

  it('recomputes fit scale on resize and clamps the current scale', () => {
    const windowRef = createWindowRef(1000, 800);
    const controller = new ZoomController({
      windowRef: windowRef as unknown as Window,
    });
    const state = createOverlayState({
      naturalWidth: 1200,
      naturalHeight: 600,
      scale: 10,
      fitScale: 1,
      minScale: 1,
      maxScale: 8,
    });

    windowRef.innerWidth = 700;
    windowRef.innerHeight = 500;

    controller.resize(state);

    expect(state.zoom.fitScale).toBeCloseTo(604 / 1200);
    expect(state.zoom.minScale).toBeCloseTo(604 / 1200);
    expect(state.zoom.maxScale).toBeCloseTo((604 / 1200) * 8);
    expect(state.zoom.scale).toBeCloseTo((604 / 1200) * 8);
  });

  it('resets the view to the fit scale and centered translation', () => {
    const controller = new ZoomController({
      windowRef: createWindowRef() as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 2,
      translateX: 120,
      translateY: -90,
    });

    controller.resetView(state);

    expect(state.zoom.scale).toBe(1);
    expect(state.pan.translateX).toBe(0);
    expect(state.pan.translateY).toBe(0);
  });

  it('updates transform output, button states, and drag cursors', () => {
    const controller = new ZoomController({
      windowRef: createWindowRef() as unknown as Window,
    });
    const state = createOverlayState({
      naturalWidth: 1200,
      naturalHeight: 800,
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 1,
    });

    controller.applyTransform(state, { clampTranslation: true });

    expect(state.elements.shell.style.transform).toContain('scale(1)');
    expect(state.elements.zoomOutButton.disabled).toBe(true);
    expect(state.elements.zoomInButton.disabled).toBe(false);
    expect(state.elements.resetButton.disabled).toBe(true);
    expect(state.elements.displayImage.style.cursor).toBe('default');
    expect(state.elements.stage.style.cursor).toBe('default');

    state.zoom.scale = 2;
    controller.applyTransform(state, { clampTranslation: true });

    expect(state.elements.zoomOutButton.disabled).toBe(false);
    expect(state.elements.zoomInButton.disabled).toBe(false);
    expect(state.elements.resetButton.disabled).toBe(false);
    expect(state.elements.displayImage.style.cursor).toBe('grab');
    expect(state.elements.stage.style.cursor).toBe('grab');

    state.zoom.scale = 4;
    state.drag.active = true;
    controller.applyTransform(state, { clampTranslation: true });

    expect(state.elements.zoomInButton.disabled).toBe(true);
    expect(state.elements.displayImage.style.cursor).toBe('grabbing');
    expect(state.elements.stage.style.cursor).toBe('grabbing');
  });

  it('commits scheduled transforms on the next animation frame', () => {
    const windowRef = createWindowRef();
    const controller = new ZoomController({
      windowRef: windowRef as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 2,
      translateX: 25,
      translateY: -15,
    });

    controller.scheduleTransform(state, { clampTranslation: true });
    expect(state.elements.shell.style.transform).toBe('');

    windowRef.flushAnimationFrame();

    expect(state.elements.shell.style.transform).toContain(
      'translate(25px, -15px) scale(2)',
    );
  });

  it('prevents a pending scheduled transform from committing after cancellation', () => {
    const windowRef = createWindowRef();
    const controller = new ZoomController({
      windowRef: windowRef as unknown as Window,
    });
    const state = createOverlayState({
      fitScale: 1,
      minScale: 1,
      maxScale: 4,
      scale: 2,
      translateX: 25,
      translateY: -15,
    });

    controller.scheduleTransform(state, { clampTranslation: true });
    controller.cancelScheduledTransform(state);

    state.pan.translateX = 100;
    state.pan.translateY = 80;
    windowRef.flushAnimationFrame();

    expect(state.elements.shell.style.transform).toBe('');
  });
});
