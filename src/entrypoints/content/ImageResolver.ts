type ImageResolverOptions = {
  maxImageAltLength?: number;
  safeImageProtocols?: Iterable<string>;
  documentRef?: Document;
  windowRef?: Window;
};

export class ImageResolver {
  private readonly documentRef: Document;
  private readonly windowRef: Window;
  private readonly maxImageAltLength: number;
  private readonly safeImageProtocols: Set<string>;

  private hoveredImage: HTMLImageElement | null = null;
  private hasPointerPosition = false;
  private lastPointerClientX = 0;
  private lastPointerClientY = 0;

  constructor(options: ImageResolverOptions = {}) {
    this.documentRef = options.documentRef ?? document;
    this.windowRef = options.windowRef ?? window;
    this.maxImageAltLength = options.maxImageAltLength ?? 300;
    this.safeImageProtocols = new Set(
      options.safeImageProtocols ?? ['http:', 'https:', 'blob:'],
    );
  }

  sanitizeImageAltText(value: unknown): string {
    return typeof value === 'string' ? value.slice(0, this.maxImageAltLength) : '';
  }

  isVisibleImage(img: Element | null): img is HTMLImageElement {
    if (!(img instanceof HTMLImageElement)) {
      return false;
    }

    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const style = this.windowRef.getComputedStyle(img);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return Number(style.opacity) !== 0;
  }

  resolveImageSrc(img: HTMLImageElement): string | null {
    const src = (img.currentSrc || img.src || '').trim();
    if (!src) {
      return null;
    }

    try {
      const url = new URL(src, this.windowRef.location.href);
      if (!this.safeImageProtocols.has(url.protocol)) {
        return null;
      }
    } catch {
      return null;
    }

    return src;
  }

  handlePointerMove(event: PointerEvent, overlayOpen: boolean): void {
    this.hasPointerPosition = true;
    this.lastPointerClientX = event.clientX;
    this.lastPointerClientY = event.clientY;

    if (overlayOpen) {
      return;
    }

    let candidate = this.extractImageFromTarget(
      event.target,
      event.clientX,
      event.clientY,
    );

    if (!candidate) {
      candidate = this.resolveImageFromPoint(event.clientX, event.clientY);
    }

    this.hoveredImage =
      candidate && this.isVisibleImage(candidate) ? candidate : null;
  }

  resolveActivationCandidate(): HTMLImageElement | null {
    const hoveredImage = this.resolveHoveredImage();
    if (hoveredImage && this.isVisibleImage(hoveredImage)) {
      return hoveredImage;
    }

    if (!this.hasPointerPosition) {
      return null;
    }

    const candidate =
      this.resolveImageFromPoint(
        this.lastPointerClientX,
        this.lastPointerClientY,
      ) ?? this.resolveTrackedHoveredImage();

    return candidate && this.isVisibleImage(candidate) ? candidate : null;
  }

  private resolveHoveredImage(): HTMLImageElement | null {
    let hoveredElements: Element[] = [];

    try {
      hoveredElements = Array.from(this.documentRef.querySelectorAll(':hover'));
    } catch {
      return null;
    }

    for (let index = hoveredElements.length - 1; index >= 0; index -= 1) {
      const image = this.extractDirectImageFromTarget(hoveredElements[index]);
      if (image) {
        return image;
      }
    }

    return null;
  }

  private resolveImageFromPoint(x: number, y: number): HTMLImageElement | null {
    const elements =
      typeof this.documentRef.elementsFromPoint === 'function'
        ? this.documentRef.elementsFromPoint(x, y)
        : [this.documentRef.elementFromPoint(x, y)];

    for (const element of elements) {
      const image = this.extractImageFromTarget(element, x, y);
      if (image) {
        return image;
      }
    }

    return null;
  }

  private extractImageFromTarget(
    target: EventTarget | null,
    x: number,
    y: number,
  ): HTMLImageElement | null {
    const directImage = this.extractDirectImageFromTarget(target);
    if (directImage) {
      return directImage;
    }

    if (!(target instanceof Element)) {
      return null;
    }

    let current: Element | null = target;
    while (current instanceof Element) {
      const descendantImage = this.findImageInSubtree(current, x, y);
      if (descendantImage) {
        return descendantImage;
      }

      current = current.parentElement;
    }

    return null;
  }

  private findImageInSubtree(
    root: Element,
    x: number,
    y: number,
  ): HTMLImageElement | null {
    const hasPoint = Number.isFinite(x) && Number.isFinite(y);
    let bestPointMatch: HTMLImageElement | null = null;
    let bestPointMatchArea = Number.POSITIVE_INFINITY;

    for (const image of root.querySelectorAll('img')) {
      if (!this.isVisibleImage(image)) {
        continue;
      }

      if (!hasPoint) {
        continue;
      }

      const rect = image.getBoundingClientRect();
      if (!this.rectContainsPoint(rect, x, y)) {
        continue;
      }

      const area = rect.width * rect.height;
      if (area < bestPointMatchArea) {
        bestPointMatch = image;
        bestPointMatchArea = area;
      }
    }

    return hasPoint ? bestPointMatch : null;
  }

  private extractDirectImageFromTarget(
    target: EventTarget | null,
  ): HTMLImageElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    return target instanceof HTMLImageElement ? target : null;
  }

  private resolveTrackedHoveredImage(): HTMLImageElement | null {
    const trackedImage = this.hoveredImage;
    if (
      !trackedImage ||
      !this.rectContainsPoint(
        trackedImage.getBoundingClientRect(),
        this.lastPointerClientX,
        this.lastPointerClientY,
      )
    ) {
      return null;
    }

    return trackedImage;
  }

  private rectContainsPoint(rect: DOMRect, x: number, y: number): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }
}
