import './style.css';

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
    let overlayOpen = false;
    let activeImageSrc: string | null = null;

    let scale = 1;
    let fitScale = 1;
    let minScale = 1;
    let maxScale = 1;
    let translateX = 0;
    let translateY = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startTranslateX = 0;
    let startTranslateY = 0;
    let suppressBackdropClick = false;

    let naturalWidth = 0;
    let naturalHeight = 0;

    let overlayEl: HTMLDivElement | null = null;
    let backdropEl: HTMLDivElement | null = null;
    let stageEl: HTMLDivElement | null = null;
    let shellEl: HTMLDivElement | null = null;
    let displayImgEl: HTMLImageElement | null = null;
    let closeBtnEl: HTMLButtonElement | null = null;
    let toolbarEl: HTMLDivElement | null = null;
    let zoomInBtnEl: HTMLButtonElement | null = null;
    let zoomOutBtnEl: HTMLButtonElement | null = null;
    let resetBtnEl: HTMLButtonElement | null = null;
    let overlayAbortController: AbortController | null = null;
    let controlsHidden = false;
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

          if (overlayEl) {
            applyThemeSettings(overlayEl, currentThemeSettings);
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

      if (overlayEl) {
        applyThemeSettings(overlayEl, currentThemeSettings);
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

    function applyControlsVisibility(): void {
      if (!overlayEl) {
        return;
      }

      overlayEl.classList.toggle('iz-controls-hidden', controlsHidden);
    }

    function toggleControlsVisibility(): void {
      if (!overlayOpen) {
        return;
      }

      controlsHidden = !controlsHidden;
      applyControlsVisibility();
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

    function computeFitScale(): number {
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return 1;
      }

      const bounds = getViewportBounds();
      return Math.min(
        bounds.width / naturalWidth,
        bounds.height / naturalHeight,
        1,
      );
    }

    function clampTranslation(): void {
      if (!overlayOpen || naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }

      const bounds = getViewportBounds();
      const renderedW = naturalWidth * scale;
      const renderedH = naturalHeight * scale;

      const maxX = Math.max(0, (renderedW - bounds.width) / 2);
      const maxY = Math.max(0, (renderedH - bounds.height) / 2);

      translateX = clamp(translateX, -maxX, maxX);
      translateY = clamp(translateY, -maxY, maxY);
    }

    function updateButtonState(): void {
      if (!zoomOutBtnEl || !zoomInBtnEl || !resetBtnEl) {
        return;
      }

      zoomOutBtnEl.disabled = scale <= minScale + 0.0001;
      zoomInBtnEl.disabled = scale >= maxScale - 0.0001;

      const isReset =
        Math.abs(scale - fitScale) <= 0.0001 &&
        Math.abs(translateX) <= 0.5 &&
        Math.abs(translateY) <= 0.5;
      resetBtnEl.disabled = isReset;
    }

    function applyTransform(): void {
      if (!shellEl) {
        return;
      }

      shellEl.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;

      const dragCursor =
        scale > fitScale + 0.0001
          ? isDragging
            ? 'grabbing'
            : 'grab'
          : 'default';

      if (displayImgEl) {
        displayImgEl.style.cursor = dragCursor;
      }

      if (stageEl) {
        stageEl.style.cursor = dragCursor;
      }

      updateButtonState();
    }

    function zoomAt(clientX: number, clientY: number, factor: number): void {
      if (!overlayOpen || !shellEl) {
        return;
      }

      const prevScale = scale;
      const nextScale = clamp(prevScale * factor, minScale, maxScale);
      if (Math.abs(nextScale - prevScale) < 0.00001) {
        return;
      }

      const dx = clientX - window.innerWidth / 2;
      const dy = clientY - window.innerHeight / 2;
      const ratio = nextScale / prevScale;

      translateX = dx - (dx - translateX) * ratio;
      translateY = dy - (dy - translateY) * ratio;
      scale = nextScale;

      clampTranslation();
      applyTransform();
    }

    function resetView(): void {
      scale = fitScale;
      translateX = 0;
      translateY = 0;
      clampTranslation();
      applyTransform();
    }

    function onWheel(event: WheelEvent): void {
      if (!overlayOpen) {
        return;
      }

      event.preventDefault();
      zoomAt(
        event.clientX,
        event.clientY,
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
      );
    }

    function onPointerDown(event: PointerEvent): void {
      if (!overlayOpen || event.button !== 0 || scale <= fitScale + 0.0001) {
        return;
      }

      isDragging = true;
      suppressBackdropClick = false;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;

      if (stageEl && typeof stageEl.setPointerCapture === 'function') {
        try {
          stageEl.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture failures.
        }
      }

      event.preventDefault();
      applyTransform();
    }

    function onPointerMove(event: PointerEvent): void {
      if (!overlayOpen || !isDragging) {
        return;
      }

      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;

      if (Math.abs(dx) + Math.abs(dy) > 2) {
        suppressBackdropClick = true;
      }

      translateX = startTranslateX + dx;
      translateY = startTranslateY + dy;

      clampTranslation();
      applyTransform();
      event.preventDefault();
    }

    function stopDragging(event?: PointerEvent): void {
      if (!isDragging) {
        return;
      }

      isDragging = false;

      if (
        event &&
        stageEl &&
        typeof stageEl.hasPointerCapture === 'function' &&
        typeof stageEl.releasePointerCapture === 'function'
      ) {
        try {
          if (stageEl.hasPointerCapture(event.pointerId)) {
            stageEl.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Ignore capture failures.
        }
      }

      applyTransform();
    }

    function onResize(): void {
      if (!overlayOpen || naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }

      fitScale = computeFitScale();
      minScale = fitScale;
      maxScale = fitScale * MAX_ZOOM_MULTIPLIER;

      scale = clamp(scale, minScale, maxScale);
      clampTranslation();
      applyTransform();
    }

    function closeOverlay(): void {
      if (!overlayOpen) {
        return;
      }

      overlayOpen = false;
      activeImageSrc = null;
      isDragging = false;
      suppressBackdropClick = false;
      controlsHidden = false;

      if (overlayAbortController) {
        overlayAbortController.abort();
        overlayAbortController = null;
      }

      if (overlayEl?.isConnected) {
        overlayEl.remove();
      }

      naturalWidth = 0;
      naturalHeight = 0;
      scale = 1;
      fitScale = 1;
      minScale = 1;
      maxScale = 1;
      translateX = 0;
      translateY = 0;

      overlayEl = null;
      backdropEl = null;
      stageEl = null;
      shellEl = null;
      displayImgEl = null;
      closeBtnEl = null;
      toolbarEl = null;
      zoomInBtnEl = null;
      zoomOutBtnEl = null;
      resetBtnEl = null;
    }

    function buildOverlay(imageAlt: string): void {
      if (!activeImageSrc) {
        return;
      }

      overlayEl = document.createElement('div');
      overlayEl.className = 'iz-overlay';
      overlayEl.setAttribute('role', 'dialog');
      overlayEl.setAttribute('aria-modal', 'true');
      overlayEl.style.zIndex = String(OVERLAY_Z_INDEX);
      applyThemeSettings(overlayEl, currentThemeSettings);

      backdropEl = document.createElement('div');
      backdropEl.className = 'iz-backdrop';

      stageEl = document.createElement('div');
      stageEl.className = 'iz-stage';

      shellEl = document.createElement('div');
      shellEl.className = 'iz-shell';

      displayImgEl = document.createElement('img');
      displayImgEl.className = 'iz-image';
      displayImgEl.alt = imageAlt;
      displayImgEl.draggable = false;

      shellEl.appendChild(displayImgEl);
      stageEl.appendChild(shellEl);

      closeBtnEl = document.createElement('button');
      closeBtnEl.type = 'button';
      closeBtnEl.className = 'iz-btn iz-close';
      closeBtnEl.setAttribute('aria-label', 'Close image zoom');
      closeBtnEl.textContent = 'x';

      toolbarEl = document.createElement('div');
      toolbarEl.className = 'iz-toolbar';

      zoomOutBtnEl = document.createElement('button');
      zoomOutBtnEl.type = 'button';
      zoomOutBtnEl.className = 'iz-btn';
      zoomOutBtnEl.setAttribute('aria-label', 'Zoom out');
      zoomOutBtnEl.textContent = '-';

      zoomInBtnEl = document.createElement('button');
      zoomInBtnEl.type = 'button';
      zoomInBtnEl.className = 'iz-btn';
      zoomInBtnEl.setAttribute('aria-label', 'Zoom in');
      zoomInBtnEl.textContent = '+';

      resetBtnEl = document.createElement('button');
      resetBtnEl.type = 'button';
      resetBtnEl.className = 'iz-btn iz-reset';
      resetBtnEl.setAttribute('aria-label', 'Reset to fit');
      resetBtnEl.textContent = 'Fit';

      toolbarEl.append(zoomOutBtnEl, zoomInBtnEl, resetBtnEl);
      overlayEl.append(backdropEl, stageEl, closeBtnEl, toolbarEl);

      (document.body || document.documentElement).appendChild(overlayEl);
      applyControlsVisibility();

      window.requestAnimationFrame(() => {
        overlayEl?.classList.add('iz-open');
      });

      overlayAbortController = new AbortController();
      const { signal } = overlayAbortController;

      overlayEl.addEventListener(
        'wheel',
        event => {
          event.preventDefault();
        },
        { passive: false, signal },
      );

      overlayEl.addEventListener(
        'touchmove',
        event => {
          event.preventDefault();
        },
        { passive: false, signal },
      );

      overlayEl.addEventListener(
        'click',
        event => {
          const targetEl =
            event.target instanceof Element ? event.target : null;
          const clickedInsideViewer =
            !!targetEl &&
            !!targetEl.closest('.iz-shell, .iz-toolbar, .iz-close');

          if (!clickedInsideViewer && !suppressBackdropClick) {
            closeOverlay();
          }

          suppressBackdropClick = false;
        },
        { signal },
      );

      closeBtnEl.addEventListener('click', closeOverlay, { signal });
      zoomInBtnEl.addEventListener(
        'click',
        () => {
          zoomAt(window.innerWidth / 2, window.innerHeight / 2, ZOOM_STEP);
        },
        { signal },
      );
      zoomOutBtnEl.addEventListener(
        'click',
        () => {
          zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / ZOOM_STEP);
        },
        { signal },
      );
      resetBtnEl.addEventListener('click', resetView, { signal });

      stageEl.addEventListener('wheel', onWheel, { passive: false, signal });
      stageEl.addEventListener('pointerdown', onPointerDown, { signal });
      stageEl.addEventListener('pointermove', onPointerMove, { signal });
      stageEl.addEventListener('pointerup', stopDragging, { signal });
      stageEl.addEventListener('pointercancel', stopDragging, { signal });
      stageEl.addEventListener('lostpointercapture', stopDragging, { signal });
      window.addEventListener('resize', onResize, { signal });

      displayImgEl.addEventListener(
        'load',
        () => {
          if (!displayImgEl) {
            return;
          }

          naturalWidth = Math.max(displayImgEl.naturalWidth || 1, 1);
          naturalHeight = Math.max(displayImgEl.naturalHeight || 1, 1);

          fitScale = computeFitScale();
          minScale = fitScale;
          maxScale = fitScale * MAX_ZOOM_MULTIPLIER;
          scale = fitScale;
          translateX = 0;
          translateY = 0;

          clampTranslation();
          applyTransform();
        },
        { once: true, signal },
      );

      displayImgEl.addEventListener(
        'error',
        () => {
          closeOverlay();
        },
        { once: true, signal },
      );

      displayImgEl.src = activeImageSrc;
      applyTransform();
    }

    function openOverlayForImage(img: HTMLImageElement): void {
      if (overlayOpen || !isVisibleImage(img)) {
        return;
      }

      const src = resolveImageSrc(img);
      if (!src) {
        return;
      }

      activeImageSrc = src;
      overlayOpen = true;
      controlsHidden = currentShortcutSettings.hideControlsByDefault;

      buildOverlay(sanitizeImageAltText(img.alt));
    }

    function onGlobalPointerMove(event: PointerEvent): void {
      lastPointerClientX = event.clientX;
      lastPointerClientY = event.clientY;

      if (overlayOpen) {
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
        overlayOpen &&
        isToggleControlsKeyEvent(event) &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        toggleControlsVisibility();
        return;
      }

      if (overlayOpen && event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (overlayOpen || isEditableTarget(event.target)) {
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
