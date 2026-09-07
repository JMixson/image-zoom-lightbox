import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME_SETTINGS } from '@/utils/settings';
import { OverlayBuilder } from '@/entrypoints/content/OverlayBuilder';
import { ViewerSession, type ViewerUi } from './session';

describe('viewer session lifecycle', () => {
  const sessions: ViewerSession[] = [];
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    sessions.splice(0).forEach(session => session.dispose());
    vi.useRealTimers();
  });

  function createUi(): ViewerUi {
    const uiContainer = document.createElement('div');
    return {
      uiContainer,
      mount: vi.fn(() => { document.body.append(uiContainer); }),
      remove: vi.fn(() => uiContainer.remove()),
    };
  }

  function createSession(create = async () => createUi()) {
    const onDisposed = vi.fn();
    const session = new ViewerSession({
      createUi: create,
      getImageOptions: () => ({
        imageSrc: 'https://example.com/image.png', imageAlt: 'Test image',
        themeSettings: DEFAULT_THEME_SETTINGS, hideControlsByDefault: false,
      }),
      onDisposed,
    });
    sessions.push(session);
    return { session, onDisposed };
  }

  it.each(['close', 'dispose'] as const)('cancels delayed initialization with %s', async action => {
    const ui = createUi();
    let resolve!: (ui: ViewerUi) => void;
    const { session, onDisposed } = createSession(() => new Promise(done => { resolve = done; }));
    const opening = session.open();
    session[action]();
    resolve(ui);
    await opening;
    expect(ui.mount).not.toHaveBeenCalled();
    expect(ui.remove).toHaveBeenCalledOnce();
    expect(session.status).toBe('disposed');
    session.dispose();
    expect(onDisposed).toHaveBeenCalledOnce();
  });

  it('cleans partial mounts after initialization errors and permits a fresh session', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ui = createUi();
    vi.mocked(ui.mount).mockImplementation(() => {
      document.body.append(ui.uiContainer);
      throw new Error('mount failed');
    });
    const { session, onDisposed } = createSession(async () => ui);
    await session.open();
    expect(ui.uiContainer.isConnected).toBe(false);
    expect(onDisposed).toHaveBeenCalledOnce();
    expect(session.status).toBe('disposed');
    const next = createSession().session;
    await next.open();
    expect(next.status).toBe('open');
    expect(document.querySelectorAll('.iz-overlay')).toHaveLength(1);
  });

  it('handles rejected UI creation without an unhandled rejection', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { session, onDisposed } = createSession(async () => { throw new Error('CSS unavailable'); });
    await expect(session.open()).resolves.toBeUndefined();
    expect(onDisposed).toHaveBeenCalledOnce();
  });

  it('keeps loading and errors visible until dismissed', async () => {
    const { session } = createSession();
    await session.open();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Loading image…');
    const image = document.querySelector('img')!;
    image.dispatchEvent(new Event('error'));
    expect(session.status).toBe('open');
    expect(document.querySelector('[role="status"]')?.textContent).toContain('could not be loaded');
    (document.querySelector('.iz-close') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(session.status).toBe('disposed');
  });

  it('ignores late image loads and cancels opening frames after close', async () => {
    const update = vi.spyOn(OverlayBuilder.prototype, 'setImageStatus');
    const { session } = createSession();
    await session.open();
    const image = document.querySelector('img')!;
    const overlay = document.querySelector('.iz-overlay')!;
    session.close();
    image.dispatchEvent(new Event('load'));
    await vi.runAllTimersAsync();
    expect(update).not.toHaveBeenCalled();
    expect(overlay.classList.contains('iz-open')).toBe(false);
    expect(document.querySelector('.iz-overlay')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposes immediately during an animated close and cancels frames and timers', async () => {
    const { session, onDisposed } = createSession();
    await session.open();
    await vi.advanceTimersByTimeAsync(32);
    const image = document.querySelector('img')!;
    Object.defineProperties(image, { naturalWidth: { value: 1600 }, naturalHeight: { value: 900 } });
    image.dispatchEvent(new Event('load'));
    expect((document.querySelector('[role="status"]') as HTMLElement).hidden).toBe(true);
    document.querySelector('.iz-stage')!.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }));
    session.close();
    session.close();
    expect(session.status).toBe('closing');
    expect(vi.getTimerCount()).toBe(1);
    session.dispose();
    expect(document.querySelector('.iz-overlay')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await Promise.resolve();
    expect(onDisposed).toHaveBeenCalledOnce();
  });

  it('finishes ordinary dismissal after the transition fallback', async () => {
    const { session, onDisposed } = createSession();
    await session.open();
    await vi.advanceTimersByTimeAsync(32);
    session.close();
    await vi.advanceTimersByTimeAsync(270);
    expect(session.status).toBe('disposed');
    expect(onDisposed).toHaveBeenCalledOnce();
    expect(document.querySelector('.iz-overlay')).toBeNull();
  });
});
