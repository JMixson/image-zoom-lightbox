import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageResolver } from './ImageResolver';
import contentScript from './index';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({
  createShadowRootUi: vi.fn(async (ctx) => {
    const uiContainer = document.createElement('div');
    ctx.onInvalidated(() => uiContainer.remove());
    return {
      uiContainer,
      mount: () => document.body.append(uiContainer),
      remove: () => uiContainer.remove(),
    };
  }),
}));

describe('content activation', () => {
  let abortController: AbortController;
  let invalidations: (() => void)[];

  beforeEach(async () => {
    abortController = new AbortController();
    invalidations = [];
    vi.spyOn(ImageResolver.prototype, 'resolveActivationCandidate').mockReturnValue(null);
    await contentScript.main({
      addEventListener(target: EventTarget, type: string, listener: EventListener, options: AddEventListenerOptions = {}) {
        target.addEventListener(type, listener, { ...options, signal: abortController.signal });
      },
      onInvalidated(callback: () => void) {
        invalidations.push(callback);
        return () => { invalidations = invalidations.filter(item => item !== callback); };
      },
    } as NonNullable<Parameters<typeof contentScript.main>[0]>);
  });

  afterEach(() => {
    abortController.abort();
    [...invalidations].forEach(callback => callback());
  });

  function press(target: EventTarget = window, init: KeyboardEventInit = {}) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', bubbles: true, composed: true, ...init }));
  }

  function activateImage() {
    const image = document.createElement('img');
    image.src = 'https://example.com/image.png';
    document.body.append(image);
    vi.spyOn(ImageResolver.prototype, 'isVisibleImage').mockReturnValue(true);
    vi.mocked(ImageResolver.prototype.resolveActivationCandidate).mockReturnValue(image);
    press();
    press();
  }

  it('initializes lazily, closes, and reopens without retaining UI listeners', async () => {
    expect(createShadowRootUi).not.toHaveBeenCalled();
    const initialListeners = invalidations.length;
    for (let attempt = 0; attempt < 2; attempt++) {
      activateImage();
      await vi.waitFor(() => expect(document.querySelector('.iz-overlay')).not.toBeNull());
      press(window, { key: 'Escape' });
      await vi.waitFor(() => expect(document.querySelector('.iz-overlay')).toBeNull());
      expect(invalidations).toHaveLength(initialListeners);
    }
  });

  it.each(['escape', 'invalidation'])('does not mount delayed UI after %s', async action => {
    let resolve!: () => void;
    const pending = new Promise<void>(done => { resolve = done; });
    const createUi = vi.mocked(createShadowRootUi).getMockImplementation()!;
    vi.mocked(createShadowRootUi).mockImplementationOnce(async (...args) => {
      await pending;
      return createUi(...args);
    });
    activateImage();
    if (action === 'escape') press(window, { key: 'Escape' });
    else [...invalidations].forEach(callback => callback());
    resolve();
    await pending;
    // Drain UI creation and the cancelled session's continuation.
    await new Promise(done => setTimeout(done, 0));
    expect(document.querySelector('.iz-overlay')).toBeNull();
    expect(invalidations).toHaveLength(1);
  });

  it('allows activation again after UI creation rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(createShadowRootUi).mockRejectedValueOnce(new Error('initialization failed'));
    activateImage();
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledOnce());
    activateImage();
    await vi.waitFor(() => expect(document.querySelector('.iz-overlay')).not.toBeNull());
  });

  it('resolves an image only after the configured double press', () => {
    press();
    expect(ImageResolver.prototype.resolveActivationCandidate).not.toHaveBeenCalled();
    press();
    expect(ImageResolver.prototype.resolveActivationCandidate).toHaveBeenCalledTimes(1);
  });

  it.each(['input', 'textarea', 'select'])('does not activate from %s', tag => {
    const editor = document.createElement(tag);
    document.body.append(editor);
    press(editor);
    press(editor);
    press();
    expect(ImageResolver.prototype.resolveActivationCandidate).not.toHaveBeenCalled();
  });

  it.each(['blur', 'focusin', 'compositionstart'])('resets pending activation on %s', type => {
    press();
    window.dispatchEvent(new Event(type));
    press();
    expect(ImageResolver.prototype.resolveActivationCandidate).not.toHaveBeenCalled();
  });

  it('does not activate during composition or across another shortcut', () => {
    press();
    press(window, { isComposing: true });
    press();
    press(window, { key: 'c', ctrlKey: true });
    press();
    expect(ImageResolver.prototype.resolveActivationCandidate).not.toHaveBeenCalled();
  });
});
