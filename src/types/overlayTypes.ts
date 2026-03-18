export type OverlayState = {
  elements: {
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
