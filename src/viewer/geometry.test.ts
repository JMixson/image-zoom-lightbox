import { describe, expect, it } from 'vitest';
import { clampPan, resizeZoom, viewportBounds, zoomAroundAnchor, zoomBounds } from './geometry';

describe('viewer geometry', () => {
  const bounds = { width: 904, height: 704 };

  it('fits portrait and landscape images without enlarging small images', () => {
    expect(zoomBounds({ width: 1600, height: 900 }, bounds, 8).fitScale).toBeCloseTo(904 / 1600);
    expect(zoomBounds({ width: 900, height: 1600 }, bounds, 8).fitScale).toBeCloseTo(704 / 1600);
    expect(zoomBounds({ width: 30, height: 20 }, bounds, 8)).toEqual({ fitScale: 1, minScale: 1, maxScale: 8 });
    expect(zoomBounds({ width: 0, height: 0 }, bounds, 8).fitScale).toBe(1);
    expect(viewportBounds({ width: 100, height: 100 }, { width: 96, height: 96 })).toEqual({ width: 120, height: 120 });
  });

  it.each([
    { factor: 10, scale: 4 },
    { factor: 0.001, scale: 1 },
  ])('preserves the anchor when zoom is clamped to $scale', ({ factor, scale }) => {
    const zoom = { scale: 2, fitScale: 1, minScale: 1, maxScale: 4 };
    const pan = { translateX: 30, translateY: -40 };
    const anchor = { x: 100, y: 50 };
    const next = zoomAroundAnchor(zoom, pan, anchor, factor)!;
    expect(next.scale).toBe(scale);
    expect((anchor.x - next.pan.translateX) / next.scale).toBe((anchor.x - pan.translateX) / zoom.scale);
    expect((anchor.y - next.pan.translateY) / next.scale).toBe((anchor.y - pan.translateY) / zoom.scale);
    expect(zoom.scale).toBe(2);
    expect(pan).toEqual({ translateX: 30, translateY: -40 });
    expect(zoomAroundAnchor({ ...zoom, scale }, pan, anchor, factor)).toBeNull();
  });

  it('centers axes smaller than the viewport and bounds the other axis', () => {
    const pan = clampPan({ translateX: 999, translateY: -999 }, { width: 1000, height: 200 }, bounds, 1);
    expect(pan.translateX).toBe(48);
    expect(pan.translateY).toBeCloseTo(0);
  });

  it('preserves an allowed scale on resize and clamps to new fit limits otherwise', () => {
    const zoom = { scale: 2, fitScale: 1, minScale: 1, maxScale: 8 };
    expect(resizeZoom(zoom, { width: 1000, height: 500 }, bounds, 8).scale).toBe(2);
    expect(resizeZoom({ ...zoom, scale: 100 }, { width: 1000, height: 500 }, bounds, 8).scale).toBeCloseTo(0.904 * 8);
    expect(resizeZoom({ ...zoom, scale: 0.1 }, { width: 1000, height: 500 }, bounds, 8).scale).toBeCloseTo(0.904);
  });
});
