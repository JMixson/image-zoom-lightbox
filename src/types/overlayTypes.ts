import type { ThemeSettings } from '@/utils/settings';

export type OverlayElements = {
  overlay: HTMLDivElement;
  backdrop: HTMLDivElement;
  stage: HTMLDivElement;
  shell: HTMLDivElement;
  displayImage: HTMLImageElement;
  closeButton: HTMLButtonElement;
  toolbar: HTMLDivElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
};

export type OverlayState = {
  elements: OverlayElements;
  zoom: {
    scale: number;
    fitScale: number;
    minScale: number;
    maxScale: number;
  };
  pan: {
    translateX: number;
    translateY: number;
  };
  drag: {
    active: boolean;
    startX: number;
    startY: number;
    startTranslateX: number;
    startTranslateY: number;
  };
  image: {
    readonly src: string;
    readonly alt: string;
    naturalWidth: number;
    naturalHeight: number;
  };
  ui: {
    controlsHidden: boolean;
    suppressBackdropClick: boolean;
  };
  abortController: AbortController;
};

export type OverlayCreateOptions = {
  imageSrc: string;
  imageAlt: string;
  themeSettings: ThemeSettings;
  hideControlsByDefault: boolean;
};

export type OverlayEventHandlers = {
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onWheel: (event: WheelEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onLostPointerCapture: (event: PointerEvent) => void;
  onResize: () => void;
  onImageLoad: () => void;
  onImageError: () => void;
};

export type ViewportBounds = {
  width: number;
  height: number;
};
