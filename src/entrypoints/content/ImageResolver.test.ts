import { describe, expect, it } from 'vitest';

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

  it('tracks hovered images only when the overlay is closed', () => {
    const resolver = new ImageResolver();
    const firstImage = createImage('https://example.com/first.jpg');
    const secondImage = createImage('https://example.com/second.jpg');

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [secondImage],
    });

    resolver.handlePointerMove(
      {
        clientX: 10,
        clientY: 20,
        target: firstImage,
      } as unknown as PointerEvent,
      false,
    );

    resolver.handlePointerMove(
      {
        clientX: 30,
        clientY: 40,
        target: secondImage,
      } as unknown as PointerEvent,
      true,
    );

    expect(resolver.resolveActivationCandidate()).toBe(firstImage);
  });

  it('prefers the tracked hovered image over point-resolved candidates', () => {
    const resolver = new ImageResolver();
    const hoveredImage = createImage('https://example.com/hovered.jpg');
    const fallbackImage = createImage('https://example.com/fallback.jpg');

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [fallbackImage],
    });

    resolver.handlePointerMove(
      {
        clientX: 10,
        clientY: 20,
        target: hoveredImage,
      } as unknown as PointerEvent,
      false,
    );

    expect(resolver.resolveActivationCandidate()).toBe(hoveredImage);
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
