import { OverlayBuilder } from '@/entrypoints/content/OverlayBuilder';
import type { OverlayState } from '@/types/overlayTypes';
import { DEFAULT_THEME_SETTINGS } from '@/utils/settings';

type CreateOverlayStateOptions = {
  naturalWidth?: number;
  naturalHeight?: number;
  scale?: number;
  fitScale?: number;
  minScale?: number;
  maxScale?: number;
  translateX?: number;
  translateY?: number;
  controlsHidden?: boolean;
  suppressBackdropClick?: boolean;
  closing?: boolean;
  dragActive?: boolean;
};

export function createOverlayState(options: CreateOverlayStateOptions = {}): OverlayState {
  const state = new OverlayBuilder({ mountTarget: document.body }).createState({
    imageSrc: 'https://example.com/image.jpg',
    imageAlt: 'Example image',
    themeSettings: DEFAULT_THEME_SETTINGS,
    hideControlsByDefault: options.controlsHidden ?? false,
  });
  document.body.append(state.elements.overlay);
  state.image.naturalWidth = options.naturalWidth ?? 1200;
  state.image.naturalHeight = options.naturalHeight ?? 800;
  Object.defineProperties(state.elements.displayImage, {
    naturalWidth: { configurable: true, value: state.image.naturalWidth },
    naturalHeight: { configurable: true, value: state.image.naturalHeight },
  });
  state.zoom = {
    scale: options.scale ?? 1,
    fitScale: options.fitScale ?? 1,
    minScale: options.minScale ?? 1,
    maxScale: options.maxScale ?? 8,
  };
  state.pan = {
    translateX: options.translateX ?? 0,
    translateY: options.translateY ?? 0,
  };
  state.drag.active = options.dragActive ?? false;
  state.ui.suppressBackdropClick = options.suppressBackdropClick ?? false;
  state.ui.closing = options.closing ?? false;
  return state;
}
