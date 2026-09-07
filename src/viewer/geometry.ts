import { clamp } from '@/utils/math';

export type Dimensions = { width: number; height: number };
export type Pan = { translateX: number; translateY: number };
export type Zoom = {
  scale: number;
  fitScale: number;
  minScale: number;
  maxScale: number;
};

export function viewportBounds(viewport: Dimensions, padding: Dimensions): Dimensions {
  return {
    width: Math.max(120, viewport.width - padding.width),
    height: Math.max(120, viewport.height - padding.height),
  };
}

export function zoomBounds(image: Dimensions, bounds: Dimensions, maxMultiplier: number) {
  const fitScale = image.width <= 0 || image.height <= 0
    ? 1
    : Math.min(bounds.width / image.width, bounds.height / image.height, 1);
  return { fitScale, minScale: fitScale, maxScale: fitScale * maxMultiplier };
}

export function resizeZoom(
  zoom: Zoom,
  image: Dimensions,
  bounds: Dimensions,
  maxMultiplier: number,
): Zoom {
  const limits = zoomBounds(image, bounds, maxMultiplier);
  return { ...limits, scale: clamp(zoom.scale, limits.minScale, limits.maxScale) };
}

// The anchor is relative to the viewport center, matching the shell's origin.
export function zoomAroundAnchor(
  zoom: Zoom,
  pan: Pan,
  anchor: { x: number; y: number },
  factor: number,
) {
  const scale = clamp(zoom.scale * factor, zoom.minScale, zoom.maxScale);
  if (Math.abs(scale - zoom.scale) < 0.00001) return null;

  const ratio = scale / zoom.scale;
  return {
    scale,
    pan: {
      translateX: anchor.x - (anchor.x - pan.translateX) * ratio,
      translateY: anchor.y - (anchor.y - pan.translateY) * ratio,
    },
  };
}

export function clampPan(
  pan: Pan,
  image: Dimensions,
  bounds: Dimensions,
  scale: number,
): Pan {
  if (image.width <= 0 || image.height <= 0) return { ...pan };
  const maxX = Math.max(0, (image.width * scale - bounds.width) / 2);
  const maxY = Math.max(0, (image.height * scale - bounds.height) / 2);
  return {
    translateX: clamp(pan.translateX, -maxX, maxX),
    translateY: clamp(pan.translateY, -maxY, maxY),
  };
}
