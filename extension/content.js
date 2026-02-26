(() => {
  'use strict';

  if (window.top !== window) {
    return;
  }

  const DOUBLE_CTRL_MS = 350;
  const ZOOM_STEP = 1.1;
  const MAX_ZOOM_MULTIPLIER = 8;
  const OVERLAY_Z_INDEX = 2147483000;
  const VIEWPORT_PADDING_X = 96;
  const VIEWPORT_PADDING_Y = 96;

  let lastCtrlTs = 0;
  let lastPointerClientX = 0;
  let lastPointerClientY = 0;
  let hoveredImage = null;
  let overlayOpen = false;
  let activeImageSrc = null;

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

  let overlayEl = null;
  let backdropEl = null;
  let stageEl = null;
  let shellEl = null;
  let displayImgEl = null;
  let closeBtnEl = null;
  let zoomInBtnEl = null;
  let zoomOutBtnEl = null;
  let resetBtnEl = null;
  let overlayAbortController = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function getViewportBounds() {
    return {
      width: Math.max(120, window.innerWidth - VIEWPORT_PADDING_X),
      height: Math.max(120, window.innerHeight - VIEWPORT_PADDING_Y),
    };
  }

  function isVisibleImage(img) {
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

    if (Number(style.opacity) === 0) {
      return false;
    }

    return true;
  }

  function resolveImageSrc(img) {
    if (!(img instanceof HTMLImageElement)) {
      return null;
    }

    const src = (img.currentSrc || img.src || '').trim();
    return src.length > 0 ? src : null;
  }

  function extractImageFromTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    if (target instanceof HTMLImageElement) {
      return target;
    }

    const closestImg = target.closest('img');
    return closestImg instanceof HTMLImageElement ? closestImg : null;
  }

  function resolveImageFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return extractImageFromTarget(el);
  }

  function computeFitScale() {
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

  function clampTranslation() {
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

  function updateButtonState() {
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

  function applyTransform() {
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

  function zoomAt(clientX, clientY, factor) {
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

  function resetView() {
    scale = fitScale;
    translateX = 0;
    translateY = 0;
    clampTranslation();
    applyTransform();
  }

  function onWheel(event) {
    if (!overlayOpen) {
      return;
    }

    event.preventDefault();

    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    zoomAt(event.clientX, event.clientY, factor);
  }

  function onPointerDown(event) {
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
      } catch (_err) {
        // Ignore capture failures.
      }
    }

    event.preventDefault();
    applyTransform();
  }

  function onPointerMove(event) {
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

  function stopDragging(event) {
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
      } catch (_err) {
        // Ignore capture failures.
      }
    }

    applyTransform();
  }

  function onResize() {
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

  function closeOverlay() {
    if (!overlayOpen) {
      return;
    }

    overlayOpen = false;
    activeImageSrc = null;
    isDragging = false;
    suppressBackdropClick = false;

    if (overlayAbortController) {
      overlayAbortController.abort();
      overlayAbortController = null;
    }

    if (overlayEl && overlayEl.isConnected) {
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
    zoomInBtnEl = null;
    zoomOutBtnEl = null;
    resetBtnEl = null;
  }

  function buildOverlay(imageAlt) {
    if (!activeImageSrc) {
      return;
    }

    overlayEl = document.createElement('div');
    overlayEl.className = 'iz-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.style.zIndex = String(OVERLAY_Z_INDEX);

    backdropEl = document.createElement('div');
    backdropEl.className = 'iz-backdrop';

    stageEl = document.createElement('div');
    stageEl.className = 'iz-stage';

    shellEl = document.createElement('div');
    shellEl.className = 'iz-shell';

    displayImgEl = document.createElement('img');
    displayImgEl.className = 'iz-image';
    displayImgEl.alt = imageAlt || '';
    displayImgEl.draggable = false;

    shellEl.appendChild(displayImgEl);
    stageEl.appendChild(shellEl);

    closeBtnEl = document.createElement('button');
    closeBtnEl.type = 'button';
    closeBtnEl.className = 'iz-btn iz-close';
    closeBtnEl.setAttribute('aria-label', 'Close image zoom');
    closeBtnEl.textContent = 'x';

    const toolbarEl = document.createElement('div');
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

    toolbarEl.appendChild(zoomOutBtnEl);
    toolbarEl.appendChild(zoomInBtnEl);
    toolbarEl.appendChild(resetBtnEl);

    overlayEl.appendChild(backdropEl);
    overlayEl.appendChild(stageEl);
    overlayEl.appendChild(closeBtnEl);
    overlayEl.appendChild(toolbarEl);

    const mountNode = document.body || document.documentElement;
    mountNode.appendChild(overlayEl);

    window.requestAnimationFrame(() => {
      if (overlayEl) {
        overlayEl.classList.add('iz-open');
      }
    });

    overlayAbortController = new AbortController();
    const { signal } = overlayAbortController;

    // Prevent page scroll while overlay is open without mutating page scroll styles.
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
        const targetEl = event.target instanceof Element ? event.target : null;
        const clickedInsideViewer =
          !!targetEl && !!targetEl.closest('.iz-shell, .iz-toolbar, .iz-close');

        if (!clickedInsideViewer && !suppressBackdropClick) {
          closeOverlay();
        }

        suppressBackdropClick = false;
      },
      { signal },
    );

    closeBtnEl.addEventListener(
      'click',
      () => {
        closeOverlay();
      },
      { signal },
    );

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

    resetBtnEl.addEventListener(
      'click',
      () => {
        resetView();
      },
      { signal },
    );

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

  function openOverlayForImage(img) {
    if (overlayOpen || !isVisibleImage(img)) {
      return;
    }

    const src = resolveImageSrc(img);
    if (!src) {
      return;
    }

    activeImageSrc = src;
    overlayOpen = true;

    buildOverlay(img.alt || '');
  }

  function onGlobalPointerMove(event) {
    lastPointerClientX = event.clientX;
    lastPointerClientY = event.clientY;

    if (overlayOpen) {
      return;
    }

    let candidate = extractImageFromTarget(event.target);
    if (!candidate) {
      candidate = resolveImageFromPoint(event.clientX, event.clientY);
    }

    hoveredImage = candidate && isVisibleImage(candidate) ? candidate : null;
  }

  function onGlobalKeyDown(event) {
    if (overlayOpen && event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
      return;
    }

    if (event.key !== 'Control' || event.repeat) {
      return;
    }

    const now = performance.now();
    const delta = now - lastCtrlTs;
    lastCtrlTs = now;

    if (delta > DOUBLE_CTRL_MS || overlayOpen) {
      return;
    }

    let candidate = hoveredImage;
    if (!candidate) {
      candidate = resolveImageFromPoint(lastPointerClientX, lastPointerClientY);
    }

    if (candidate && isVisibleImage(candidate)) {
      openOverlayForImage(candidate);
    }
  }

  document.addEventListener('pointermove', onGlobalPointerMove, true);
  document.addEventListener('keydown', onGlobalKeyDown, true);
})();
