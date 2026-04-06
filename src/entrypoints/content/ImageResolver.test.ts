import { afterEach, describe, expect, it } from 'vitest';

import { ImageResolver } from './ImageResolver';

function setRect(
  element: Element,
  rect: Pick<DOMRect, 'width' | 'height' | 'left' | 'top'>,
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => ({}),
    }),
  });
}

function createImage(src = 'https://example.com/image.jpg'): HTMLImageElement {
  const image = document.createElement('img');
  image.src = src;
  image.style.opacity = '1';
  setRect(image, { left: 0, top: 0, width: 120, height: 80 });
  document.body.append(image);
  return image;
}

function mockHoveredElements(elements: Element[]): void {
  const originalQuerySelectorAll = document.querySelectorAll.bind(document);

  Object.defineProperty(document, 'querySelectorAll', {
    configurable: true,
    value: (selectors: string) =>
      selectors === ':hover' ? elements : originalQuerySelectorAll(selectors),
  });
}

function mockElementsFromPoint(elements: Array<Element | null>): void {
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: () => elements,
  });

  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => elements[0] ?? null,
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(document, 'querySelectorAll');
  Reflect.deleteProperty(document, 'elementsFromPoint');
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('ImageResolver', () => {
  it('truncates alt text and rejects non-string input', () => {
    const resolver = new ImageResolver({ maxImageAltLength: 5 });

    expect(resolver.sanitizeImageAltText('abcdefg')).toBe('abcde');
    expect(resolver.sanitizeImageAltText(42)).toBe('');
  });

  it('accepts safe image protocols and rejects unsafe or malformed URLs', () => {
    const resolver = new ImageResolver();
    const safeImage = createImage('https://example.com/image.jpg');
    const blobImage = createImage('blob:https://example.com/test-image');
    const unsafeImage = createImage();
    const malformedImage = createImage();

    Object.defineProperty(unsafeImage, 'src', {
      configurable: true,
      value: 'javascript:alert(1)',
    });
    Object.defineProperty(malformedImage, 'src', {
      configurable: true,
      value: 'http://[::1',
    });

    expect(resolver.resolveImageSrc(safeImage)).toBe(
      'https://example.com/image.jpg',
    );
    expect(resolver.resolveImageSrc(blobImage)).toBe(
      'blob:https://example.com/test-image',
    );
    expect(resolver.resolveImageSrc(unsafeImage)).toBeNull();
    expect(resolver.resolveImageSrc(malformedImage)).toBeNull();
  });

  it('rejects hidden, transparent, and zero-size images', () => {
    const resolver = new ImageResolver();
    const hiddenImage = createImage();
    const transparentImage = createImage();
    const zeroSizeImage = createImage();

    hiddenImage.style.display = 'none';
    transparentImage.style.opacity = '0';
    setRect(zeroSizeImage, { left: 0, top: 0, width: 0, height: 0 });

    expect(resolver.isVisibleImage(hiddenImage)).toBe(false);
    expect(resolver.isVisibleImage(transparentImage)).toBe(false);
    expect(resolver.isVisibleImage(zeroSizeImage)).toBe(false);
  });

  it('resolves directly hovered images without prior pointer tracking', () => {
    const resolver = new ImageResolver();
    const hoveredImage = createImage('https://example.com/hovered.jpg');

    mockHoveredElements([document.documentElement, document.body, hoveredImage]);

    expect(resolver.resolveActivationCandidate()).toBe(hoveredImage);
  });

  it('falls back to the current pointer position when :hover has no image', () => {
    const resolver = new ImageResolver();
    const image = createImage('https://example.com/point-match.jpg');

    mockHoveredElements([document.documentElement, document.body]);
    mockElementsFromPoint([document.body]);

    resolver.handlePointerMove(
      {
        clientX: 10,
        clientY: 20,
        target: document.body,
      } as unknown as PointerEvent,
      false,
    );

    expect(resolver.resolveActivationCandidate()).toBe(image);
  });

  it('rejects body and html hover state when no image is under the pointer', () => {
    const resolver = new ImageResolver();

    createImage('https://example.com/page-image.jpg');
    mockHoveredElements([document.documentElement, document.body]);
    mockElementsFromPoint([document.body]);

    resolver.handlePointerMove(
      {
        clientX: 500,
        clientY: 500,
        target: document.body,
      } as unknown as PointerEvent,
      false,
    );

    expect(resolver.resolveActivationCandidate()).toBeNull();
  });

  it('rejects hovered containers whose descendant image is not under the pointer', () => {
    const resolver = new ImageResolver();
    const container = document.createElement('div');
    const image = document.createElement('img');

    image.src = 'https://example.com/nested.jpg';
    image.style.opacity = '1';
    setRect(image, { left: 0, top: 0, width: 120, height: 80 });
    setRect(container, { left: 0, top: 0, width: 600, height: 600 });
    container.append(image);
    document.body.append(container);

    mockHoveredElements([document.documentElement, document.body, container]);
    mockElementsFromPoint([container]);

    resolver.handlePointerMove(
      {
        clientX: 500,
        clientY: 500,
        target: container,
      } as unknown as PointerEvent,
      false,
    );

    expect(resolver.resolveActivationCandidate()).toBeNull();
  });

  it('does not reuse a stale tracked image after the pointer leaves it', () => {
    const resolver = new ImageResolver();
    const image = createImage('https://example.com/tracked.jpg');

    mockHoveredElements([document.documentElement, document.body]);
    mockElementsFromPoint([document.body]);

    resolver.handlePointerMove(
      {
        clientX: 10,
        clientY: 20,
        target: image,
      } as unknown as PointerEvent,
      false,
    );

    resolver.handlePointerMove(
      {
        clientX: 500,
        clientY: 500,
        target: document.body,
      } as unknown as PointerEvent,
      true,
    );

    expect(resolver.resolveActivationCandidate()).toBeNull();
  });

  it('rejects invisible activation candidates', () => {
    const resolver = new ImageResolver();
    const hiddenImage = createImage('https://example.com/hidden.jpg');

    hiddenImage.style.visibility = 'hidden';

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [hiddenImage],
    });

    resolver.handlePointerMove(
      {
        clientX: 10,
        clientY: 20,
        target: document.body,
      } as unknown as PointerEvent,
      false,
    );

    expect(resolver.resolveActivationCandidate()).toBeNull();
  });
});
