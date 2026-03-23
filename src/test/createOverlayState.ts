import type { OverlayState } from '@/types/overlayTypes';

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

export function createOverlayState(
  options: CreateOverlayStateOptions = {},
): OverlayState {
  const overlay = document.createElement('div');
  const backdrop = document.createElement('div');
  const stage = document.createElement('div');
  const shell = document.createElement('div');
  const displayImage = document.createElement('img');
  const closeButton = document.createElement('button');
  const toolbar = document.createElement('div');
  const zoomInButton = document.createElement('button');
  const zoomOutButton = document.createElement('button');
  const resetButton = document.createElement('button');

  shell.append(displayImage);
  toolbar.append(zoomOutButton, resetButton, zoomInButton);
  stage.append(shell);
  overlay.append(backdrop, stage, closeButton, toolbar);
  document.body.append(overlay);

  Object.defineProperty(displayImage, 'naturalWidth', {
    configurable: true,
    value: options.naturalWidth ?? 1200,
  });
  Object.defineProperty(displayImage, 'naturalHeight', {
    configurable: true,
    value: options.naturalHeight ?? 800,
  });

  return {
    elements: {
      overlay: overlay as HTMLDivElement,
      backdrop: backdrop as HTMLDivElement,
      stage: stage as HTMLDivElement,
      shell: shell as HTMLDivElement,
      displayImage,
      closeButton,
      toolbar: toolbar as HTMLDivElement,
      zoomInButton,
      zoomOutButton,
      resetButton,
    },
    zoom: {
      scale: options.scale ?? 1,
      fitScale: options.fitScale ?? 1,
      minScale: options.minScale ?? 1,
      maxScale: options.maxScale ?? 8,
    },
    pan: {
      translateX: options.translateX ?? 0,
      translateY: options.translateY ?? 0,
    },
    drag: {
      active: options.dragActive ?? false,
      startX: 0,
      startY: 0,
      startTranslateX: 0,
      startTranslateY: 0,
    },
    image: {
      src: 'https://example.com/image.jpg',
      alt: 'Example image',
      naturalWidth: options.naturalWidth ?? 1200,
      naturalHeight: options.naturalHeight ?? 800,
    },
    ui: {
      controlsHidden: options.controlsHidden ?? false,
      suppressBackdropClick: options.suppressBackdropClick ?? false,
      closing: options.closing ?? false,
    },
    abortController: new AbortController(),
  };
}
