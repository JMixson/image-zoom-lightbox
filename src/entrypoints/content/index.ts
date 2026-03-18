import './style.css';

import { type OverlayState } from '@/types/overlayTypes';
import { ACTIVATION_SHORTCUTS, normalizeShortcutKey } from '@/utils/shortcuts';
import {
  DEFAULT_SHORTCUT_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  parseShortcutSettings,
  parseThemeSettings,
  type ShortcutSettings,
  type ThemeSettings,
} from '@/utils/settings';
import {
  getStoredSettings,
  watchShortcutSettings,
  watchThemeSettings,
} from '@/utils/settingsStorage';
import { applyThemeSettings } from '@/utils/theme';
import { clamp } from '@/utils/colors';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: false,
  main(ctx) {
    if (window.top !== window) {
      return;
    }

    const DOUBLE_ACTIVATION_MS = 350;
    const ZOOM_STEP = 1.1;
    const MAX_ZOOM_MULTIPLIER = 8;
    const MAX_IMAGE_ALT_LENGTH = 300;
    const OVERLAY_Z_INDEX = 2147483000;
    const VIEWPORT_PADDING_X = 96;
    const VIEWPORT_PADDING_Y = 96;
    const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

    let lastActivationTs = 0;
    let lastPointerClientX = 0;
    let lastPointerClientY = 0;
    let hoveredImage: HTMLImageElement | null = null;
    let overlayState: OverlayState | null = null;
    let currentThemeSettings: ThemeSettings = { ...DEFAULT_THEME_SETTINGS };
    let currentShortcutSettings: ShortcutSettings = {
      ...DEFAULT_SHORTCUT_SETTINGS,
    };
    let storedSettingsLoadPromise: Promise<void> | null = null;

    function sanitizeImageAltText(value: unknown): string {
      return typeof value === 'string'
        ? value.slice(0, MAX_IMAGE_ALT_LENGTH)
        : '';
    }

    function applyCurrentShortcutSettings(settings: ShortcutSettings): void {
      if (
        currentShortcutSettings.activationShortcut !==
        settings.activationShortcut
      ) {
        lastActivationTs = 0;
      }

      currentShortcutSettings = settings;
    }

    function loadStoredSettings(): Promise<void> {
      if (storedSettingsLoadPromise) {
        return storedSettingsLoadPromise;
      }

      storedSettingsLoadPromise = getStoredSettings()
        .then(settings => {
          currentThemeSettings = parseThemeSettings(settings);
          applyCurrentShortcutSettings(parseShortcutSettings(settings));

          if (overlayState) {
            applyThemeSettings(overlayState.elements.overlay, currentThemeSettings);
          }
        })
        .catch(() => {
          storedSettingsLoadPromise = null;
        });

      return storedSettingsLoadPromise;
    }

    function handleThemeSettingsUpdates(patch: Partial<ThemeSettings>): void {
      if (Object.keys(patch).length === 0) {
        return;
      }

      currentThemeSettings = parseThemeSettings({
        ...currentThemeSettings,
        ...patch,
      });

      if (overlayState) {
        applyThemeSettings(overlayState.elements.overlay, currentThemeSettings);
      }
    }

    function handleShortcutSettingsUpdates(
      patch: Partial<ShortcutSettings>,
    ): void {
      if (Object.keys(patch).length === 0) {
        return;
      }

      applyCurrentShortcutSettings(
        parseShortcutSettings({
          ...currentShortcutSettings,
          ...patch,
        }),
      );
    }

    function applyControlsVisibility(state: OverlayState): void {
      state.elements.overlay.classList.toggle(
        'iz-controls-hidden',
        state.ui.controlsHidden,
      );
    }

    function toggleControlsVisibility(): void {
      if (!overlayState) {
        return;
      }

      overlayState.ui.controlsHidden = !overlayState.ui.controlsHidden;
      applyControlsVisibility(overlayState);
    }

    function getViewportBounds(): { width: number; height: number } {
      return {
        width: Math.max(120, window.innerWidth - VIEWPORT_PADDING_X),
        height: Math.max(120, window.innerHeight - VIEWPORT_PADDING_Y),
      };
    }

    function isVisibleImage(img: Element | null): img is HTMLImageElement {
      if (!(img instanceof HTMLImageElement)) {
        return false;
      }

      const rect = img.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }

      const style = window.getComputedStyle(img);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }

      return Number(style.opacity) !== 0;
    }

    function resolveImageSrc(img: HTMLImageElement): string | null {
      const src = (img.currentSrc || img.src || '').trim();
      if (!src) {
        return null;
      }

      try {
        const url = new URL(src, window.location.href);
        if (!SAFE_IMAGE_PROTOCOLS.has(url.protocol)) {
          return null;
        }
      } catch {
        return null;
      }

      return src;
    }

    function rectContainsPoint(rect: DOMRect, x: number, y: number): boolean {
      return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
    }

    function findImageInSubtree(
      root: Element,
      x: number,
      y: number,
    ): HTMLImageElement | null {
      const hasPoint = Number.isFinite(x) && Number.isFinite(y);
      let firstVisibleImage: HTMLImageElement | null = null;
      let bestPointMatch: HTMLImageElement | null = null;
      let bestPointMatchArea = Number.POSITIVE_INFINITY;

      for (const img of root.querySelectorAll('img')) {
        if (!isVisibleImage(img)) {
          continue;
        }

        if (!firstVisibleImage) {
          firstVisibleImage = img;
        }

        if (!hasPoint) {
          continue;
        }

        const rect = img.getBoundingClientRect();
        if (!rectContainsPoint(rect, x, y)) {
          continue;
        }

        const area = rect.width * rect.height;
        if (area < bestPointMatchArea) {
          bestPointMatch = img;
          bestPointMatchArea = area;
        }
      }

      return bestPointMatch || firstVisibleImage;
    }

    function extractImageFromTarget(
      target: EventTarget | null,
      x: number,
      y: number,
    ): HTMLImageElement | null {
      if (!(target instanceof Element)) {
        return null;
      }

      if (target instanceof HTMLImageElement) {
        return target;
      }

      const closestImg = target.closest('img');
      if (closestImg instanceof HTMLImageElement) {
        return closestImg;
      }

      let current: Element | null = target;
      while (current instanceof Element) {
        const descendantImg = findImageInSubtree(current, x, y);
        if (descendantImg) {
          return descendantImg;
        }

        current = current.parentElement;
      }

      return null;
    }

    function resolveImageFromPoint(
      x: number,
      y: number,
    ): HTMLImageElement | null {
      const elements =
        typeof document.elementsFromPoint === 'function'
          ? document.elementsFromPoint(x, y)
          : [document.elementFromPoint(x, y)];

      for (const el of elements) {
        const img = extractImageFromTarget(el, x, y);
        if (img) {
          return img;
        }
      }

      return null;
    }

    function computeFitScale(state: OverlayState): number {
      if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
        return 1;
      }

      const bounds = getViewportBounds();
      return Math.min(
        bounds.width / state.image.naturalWidth,
        bounds.height / state.image.naturalHeight,
        1,
      );
    }

    function clampTranslation(state: OverlayState): void {
      if (state.image.naturalWidth <= 0 || state.image.naturalHeight <= 0) {
        return;
      }

      const bounds = getViewportBounds();
      const renderedW = state.image.naturalWidth * state.zoom.scale;
      const renderedH = state.image.naturalHeight * state.zoom.scale;

      const maxX = Math.max(0, (renderedW - bounds.width) / 2);
      const maxY = Math.max(0, (renderedH - bounds.height) / 2);

      state.pan.translateX = clamp(state.pan.translateX, -maxX, maxX);
      state.pan.translateY = clamp(state.pan.translateY, -maxY, maxY);
    }

    function updateButtonState(state: OverlayState): void {
      state.elements.zoomOutButton.disabled =
        state.zoom.scale <= state.zoom.minScale + 0.0001;
      state.elements.zoomInButton.disabled =
        state.zoom.scale >= state.zoom.maxScale - 0.0001;

      const isReset =
        Math.abs(state.zoom.scale - state.zoom.fitScale) <= 0.0001 &&
        Math.abs(state.pan.translateX) <= 0.5 &&
        Math.abs(state.pan.translateY) <= 0.5;
      state.elements.resetButton.disabled = isReset;
    }

    function applyTransform(state: OverlayState): void {
      state.elements.shell.style.transform = `translate(-50%, -50%) translate(${state.pan.translateX}px, ${state.pan.translateY}px) scale(${state.zoom.scale})`;

      const dragCursor =
        state.zoom.scale > state.zoom.fitScale + 0.0001
          ? state.drag.active
            ? 'grabbing'
            : 'grab'
          : 'default';

      state.elements.displayImage.style.cursor = dragCursor;
      state.elements.stage.style.cursor = dragCursor;

      updateButtonState(state);
    }

    function zoomAt(clientX: number, clientY: number, factor: number): void {
      const state = overlayState;
      if (!state) {
        return;
      }

      const prevScale = state.zoom.scale;
      const nextScale = clamp(
        prevScale * factor,
        state.zoom.minScale,
        state.zoom.maxScale,
      );
      if (Math.abs(nextScale - prevScale) < 0.00001) {
        return;
      }

      const dx = clientX - window.innerWidth / 2;
      const dy = clientY - window.innerHeight / 2;
      const ratio = nextScale / prevScale;

      state.pan.translateX = dx - (dx - state.pan.translateX) * ratio;
      state.pan.translateY = dy - (dy - state.pan.translateY) * ratio;
      state.zoom.scale = nextScale;

      clampTranslation(state);
      applyTransform(state);
    }

    function resetView(): void {
      const state = overlayState;
      if (!state) {
        return;
      }

      state.zoom.scale = state.zoom.fitScale;
      state.pan.translateX = 0;
      state.pan.translateY = 0;
      clampTranslation(state);
      applyTransform(state);
    }

    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      zoomAt(
        event.clientX,
        event.clientY,
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
      );
    }

    function onPointerDown(event: PointerEvent): void {
      const state = overlayState;
      if (
        !state ||
        event.button !== 0 ||
        state.zoom.scale <= state.zoom.fitScale + 0.0001
      ) {
        return;
      }

      state.drag.active = true;
      state.ui.suppressBackdropClick = false;
      state.drag.startX = event.clientX;
      state.drag.startY = event.clientY;
      state.drag.startTranslateX = state.pan.translateX;
      state.drag.startTranslateY = state.pan.translateY;

      if (typeof state.elements.stage.setPointerCapture === 'function') {
        try {
          state.elements.stage.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture failures.
        }
      }

      event.preventDefault();
      applyTransform(state);
    }

    function onPointerMove(event: PointerEvent): void {
      const state = overlayState;
      if (!state || !state.drag.active) {
        return;
      }

      const dx = event.clientX - state.drag.startX;
      const dy = event.clientY - state.drag.startY;

      if (Math.abs(dx) + Math.abs(dy) > 2) {
        state.ui.suppressBackdropClick = true;
      }

      state.pan.translateX = state.drag.startTranslateX + dx;
      state.pan.translateY = state.drag.startTranslateY + dy;

      clampTranslation(state);
      applyTransform(state);
      event.preventDefault();
    }

    function stopDragging(event?: PointerEvent): void {
      const state = overlayState;
      if (!state || !state.drag.active) {
        return;
      }

      state.drag.active = false;

      if (
        event &&
        typeof state.elements.stage.hasPointerCapture === 'function' &&
        typeof state.elements.stage.releasePointerCapture === 'function'
      ) {
        try {
          if (state.elements.stage.hasPointerCapture(event.pointerId)) {
            state.elements.stage.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Ignore capture failures.
        }
      }

      applyTransform(state);
    }

    function onResize(): void {
      const state = overlayState;
      if (
        !state ||
        state.image.naturalWidth <= 0 ||
        state.image.naturalHeight <= 0
      ) {
        return;
      }

      state.zoom.fitScale = computeFitScale(state);
      state.zoom.minScale = state.zoom.fitScale;
      state.zoom.maxScale = state.zoom.fitScale * MAX_ZOOM_MULTIPLIER;

      state.zoom.scale = clamp(
        state.zoom.scale,
        state.zoom.minScale,
        state.zoom.maxScale,
      );
      clampTranslation(state);
      applyTransform(state);
    }

    function closeOverlay(): void {
      const state = overlayState;
      if (!state) {
        return;
      }

      overlayState = null;
      state.abortController.abort();

      if (state.elements.overlay.isConnected) {
        state.elements.overlay.remove();
      }
    }

    function createOverlayState(imageSrc: string, imageAlt: string): OverlayState {
      const overlay = document.createElement('div');
      overlay.className = 'iz-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.style.zIndex = String(OVERLAY_Z_INDEX);
      applyThemeSettings(overlay, currentThemeSettings);

      const backdrop = document.createElement('div');
      backdrop.className = 'iz-backdrop';

      const stage = document.createElement('div');
      stage.className = 'iz-stage';

      const shell = document.createElement('div');
      shell.className = 'iz-shell';

      const displayImage = document.createElement('img');
      displayImage.className = 'iz-image';
      displayImage.alt = imageAlt;
      displayImage.draggable = false;

      shell.appendChild(displayImage);
      stage.appendChild(shell);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'iz-btn iz-close';
      closeButton.setAttribute('aria-label', 'Close image zoom');
      closeButton.textContent = 'x';

      const toolbar = document.createElement('div');
      toolbar.className = 'iz-toolbar';

      const zoomOutButton = document.createElement('button');
      zoomOutButton.type = 'button';
      zoomOutButton.className = 'iz-btn';
      zoomOutButton.setAttribute('aria-label', 'Zoom out');
      zoomOutButton.textContent = '-';

      const zoomInButton = document.createElement('button');
      zoomInButton.type = 'button';
      zoomInButton.className = 'iz-btn';
      zoomInButton.setAttribute('aria-label', 'Zoom in');
      zoomInButton.textContent = '+';

      const resetButton = document.createElement('button');
      resetButton.type = 'button';
      resetButton.className = 'iz-btn iz-reset';
      resetButton.setAttribute('aria-label', 'Reset to fit');
      resetButton.textContent = 'Fit';

      toolbar.append(zoomOutButton, zoomInButton, resetButton);
      overlay.append(backdrop, stage, closeButton, toolbar);

      return {
        elements: {
          overlay,
          backdrop,
          stage,
          shell,
          displayImage,
          closeButton,
          toolbar,
          zoomInButton,
          zoomOutButton,
          resetButton,
        },
        zoom: {
          scale: 1,
          fitScale: 1,
          minScale: 1,
          maxScale: 1,
        },
        pan: {
          translateX: 0,
          translateY: 0,
        },
        drag: {
          active: false,
          startX: 0,
          startY: 0,
          startTranslateX: 0,
          startTranslateY: 0,
        },
        image: {
          src: imageSrc,
          alt: imageAlt,
          naturalWidth: 0,
          naturalHeight: 0,
        },
        ui: {
          controlsHidden: currentShortcutSettings.hideControlsByDefault,
          suppressBackdropClick: false,
        },
        abortController: new AbortController(),
      };
    }

    function buildOverlay(state: OverlayState): void {
      (document.body || document.documentElement).appendChild(state.elements.overlay);
      applyControlsVisibility(state);

      window.requestAnimationFrame(() => {
        if (overlayState === state) {
          state.elements.overlay.classList.add('iz-open');
        }
      });

      const { signal } = state.abortController;

      state.elements.overlay.addEventListener(
        'wheel',
        event => {
          event.preventDefault();
        },
        { passive: false, signal },
      );

      state.elements.overlay.addEventListener(
        'touchmove',
        event => {
          event.preventDefault();
        },
        { passive: false, signal },
      );

      state.elements.overlay.addEventListener(
        'click',
        event => {
          const targetEl =
            event.target instanceof Element ? event.target : null;
          const clickedInsideViewer =
            !!targetEl &&
            !!targetEl.closest('.iz-shell, .iz-toolbar, .iz-close');

          if (!clickedInsideViewer && !state.ui.suppressBackdropClick) {
            closeOverlay();
          }

          state.ui.suppressBackdropClick = false;
        },
        { signal },
      );

      state.elements.closeButton.addEventListener('click', closeOverlay, { signal });
      state.elements.zoomInButton.addEventListener(
        'click',
        () => {
          zoomAt(window.innerWidth / 2, window.innerHeight / 2, ZOOM_STEP);
        },
        { signal },
      );
      state.elements.zoomOutButton.addEventListener(
        'click',
        () => {
          zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / ZOOM_STEP);
        },
        { signal },
      );
      state.elements.resetButton.addEventListener('click', resetView, { signal });

      state.elements.stage.addEventListener('wheel', onWheel, {
        passive: false,
        signal,
      });
      state.elements.stage.addEventListener('pointerdown', onPointerDown, { signal });
      state.elements.stage.addEventListener('pointermove', onPointerMove, { signal });
      state.elements.stage.addEventListener('pointerup', stopDragging, { signal });
      state.elements.stage.addEventListener('pointercancel', stopDragging, { signal });
      state.elements.stage.addEventListener('lostpointercapture', stopDragging, {
        signal,
      });
      window.addEventListener('resize', onResize, { signal });

      state.elements.displayImage.addEventListener(
        'load',
        () => {
          if (overlayState !== state) {
            return;
          }

          state.image.naturalWidth = Math.max(
            state.elements.displayImage.naturalWidth || 1,
            1,
          );
          state.image.naturalHeight = Math.max(
            state.elements.displayImage.naturalHeight || 1,
            1,
          );

          state.zoom.fitScale = computeFitScale(state);
          state.zoom.minScale = state.zoom.fitScale;
          state.zoom.maxScale = state.zoom.fitScale * MAX_ZOOM_MULTIPLIER;
          state.zoom.scale = state.zoom.fitScale;
          state.pan.translateX = 0;
          state.pan.translateY = 0;

          clampTranslation(state);
          applyTransform(state);
        },
        { once: true, signal },
      );

      state.elements.displayImage.addEventListener(
        'error',
        () => {
          closeOverlay();
        },
        { once: true, signal },
      );

      state.elements.displayImage.src = state.image.src;
      applyTransform(state);
    }

    function openOverlayForImage(img: HTMLImageElement): void {
      if (overlayState || !isVisibleImage(img)) {
        return;
      }

      const src = resolveImageSrc(img);
      if (!src) {
        return;
      }

      const state = createOverlayState(src, sanitizeImageAltText(img.alt));
      overlayState = state;
      buildOverlay(state);
    }

    function onGlobalPointerMove(event: PointerEvent): void {
      lastPointerClientX = event.clientX;
      lastPointerClientY = event.clientY;

      if (overlayState) {
        return;
      }

      let candidate = extractImageFromTarget(
        event.target,
        event.clientX,
        event.clientY,
      );

      if (!candidate) {
        candidate = resolveImageFromPoint(event.clientX, event.clientY);
      }

      hoveredImage = candidate && isVisibleImage(candidate) ? candidate : null;
    }

    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) {
        return false;
      }

      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      );
    }

    function isToggleControlsKeyEvent(event: KeyboardEvent): boolean {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return false;
      }

      const key = normalizeShortcutKey(event.key);
      return !!key && key === currentShortcutSettings.toggleControlsKey;
    }

    function isActivationShortcutEvent(event: KeyboardEvent): boolean {
      if (event.repeat) {
        return false;
      }

      switch (currentShortcutSettings.activationShortcut) {
        case 'double_shift':
          return (
            event.key === ACTIVATION_SHORTCUTS.double_shift &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
          );
        case 'double_meta':
          return (
            event.key === ACTIVATION_SHORTCUTS.double_meta &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          );
        case 'double_ctrl':
        default:
          return (
            event.key === ACTIVATION_SHORTCUTS.double_ctrl &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey
          );
      }
    }

    function onGlobalKeyDown(event: KeyboardEvent): void {
      if (
        overlayState &&
        isToggleControlsKeyEvent(event) &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        toggleControlsVisibility();
        return;
      }

      if (overlayState && event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (overlayState || isEditableTarget(event.target)) {
        return;
      }

      if (!isActivationShortcutEvent(event)) {
        return;
      }

      const now = performance.now();
      const delta = now - lastActivationTs;
      lastActivationTs = now;

      if (delta > DOUBLE_ACTIVATION_MS) {
        return;
      }

      const candidate =
        hoveredImage ??
        resolveImageFromPoint(lastPointerClientX, lastPointerClientY);

      if (candidate && isVisibleImage(candidate)) {
        openOverlayForImage(candidate);
      }
    }

    ctx.addEventListener(document, 'pointermove', onGlobalPointerMove, {
      capture: true,
    });
    ctx.addEventListener(document, 'keydown', onGlobalKeyDown, {
      capture: true,
    });

    const unwatchThemeSettings = watchThemeSettings(handleThemeSettingsUpdates);
    const unwatchShortcutSettings = watchShortcutSettings(
      handleShortcutSettingsUpdates,
    );
    ctx.onInvalidated(closeOverlay);
    ctx.onInvalidated(unwatchThemeSettings);
    ctx.onInvalidated(unwatchShortcutSettings);

    void loadStoredSettings();
  },
});
