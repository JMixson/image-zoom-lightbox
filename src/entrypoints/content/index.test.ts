import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageResolver } from './ImageResolver';
import contentScript from './index';

vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({
  createShadowRootUi: vi.fn(async () => ({ uiContainer: document.createElement('div') })),
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
      onInvalidated(callback: () => void) { invalidations.push(callback); },
    } as NonNullable<Parameters<typeof contentScript.main>[0]>);
  });

  afterEach(() => {
    abortController.abort();
    invalidations.forEach(callback => callback());
  });

  function press(target: EventTarget = window, init: KeyboardEventInit = {}) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', bubbles: true, composed: true, ...init }));
  }

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
