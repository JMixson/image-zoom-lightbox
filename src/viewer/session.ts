import { DragController } from '@/entrypoints/content/DragController';
import { OverlayBuilder } from '@/entrypoints/content/OverlayBuilder';
import { ZoomController } from '@/entrypoints/content/ZoomController';
import type { OverlayCreateOptions, OverlayState } from '@/types/overlayTypes';
import type { ThemeSettings } from '@/utils/settings';

export type ViewerUi = { uiContainer: HTMLElement; mount(): void; remove(): void };
type SessionOptions = {
  createUi: () => Promise<ViewerUi>;
  getImageOptions: () => OverlayCreateOptions;
  onDisposed: () => void;
};

// No session represents idle. Every asynchronous continuation belongs to this instance.
export class ViewerSession {
  private phase: 'opening' | 'open' | 'closing' | 'disposed' = 'opening';
  private ui?: ViewerUi;
  private builder?: OverlayBuilder;
  private state?: OverlayState;
  private readonly zoom = new ZoomController();
  private readonly drag = new DragController(this.zoom);

  constructor(private readonly options: SessionOptions) {}

  get status() { return this.phase; }

  async open(): Promise<void> {
    try {
      const ui = await this.options.createUi();
      if (this.phase !== 'opening') {
        ui.remove();
        return;
      }
      this.ui = ui;
      const builder = this.builder = new OverlayBuilder({ mountTarget: ui.uiContainer });
      const state = this.state = builder.createState(this.options.getImageOptions());
      ui.mount();
      this.phase = 'open';

      const zoomFromCenter = (direction: 'in' | 'out') => this.zoom.zoomAt(
        state, window.innerWidth / 2, window.innerHeight / 2, this.zoom.getZoomFactor(direction),
      );
      const stopDragging = (event: PointerEvent) => this.drag.stopDragging(state, event);
      builder.mount(state, {
        onClose: () => this.close(),
        onZoomIn: () => zoomFromCenter('in'),
        onZoomOut: () => zoomFromCenter('out'),
        onReset: () => this.zoom.resetView(state),
        onWheel: event => {
          event.preventDefault();
          this.zoom.zoomAt(state, event.clientX, event.clientY, this.zoom.getZoomFactor(event.deltaY < 0 ? 'in' : 'out'));
        },
        onPointerDown: event => this.drag.handlePointerDown(state, event),
        onPointerMove: event => this.drag.handlePointerMove(state, event),
        onPointerUp: stopDragging,
        onPointerCancel: stopDragging,
        onLostPointerCapture: stopDragging,
        onResize: () => { if (this.phase === 'open') this.zoom.resize(state); },
        onImageLoad: () => {
          if (this.phase !== 'open') return;
          builder.setImageStatus(state, 'loaded');
          this.zoom.initializeLoadedImage(state);
        },
        onImageError: () => {
          if (this.phase === 'open') builder.setImageStatus(state, 'error');
        },
      });
      this.zoom.applyTransform(state);
    } catch (error) {
      this.dispose();
      console.warn('Image Zoom Lightbox could not open the viewer.', error);
    }
  }

  applyTheme(settings: ThemeSettings): void {
    if (this.state && this.phase === 'open') this.builder?.applyTheme(this.state, settings);
  }

  toggleControls(): void {
    if (this.state && this.phase === 'open') this.builder?.toggleControlsVisibility(this.state);
  }

  close(): void {
    if (this.phase === 'closing' || this.phase === 'disposed') return;
    if (this.phase === 'opening') {
      this.dispose();
      return;
    }
    this.phase = 'closing';
    this.zoom.cancelScheduledTransform(this.state!);
    void this.builder!.destroy(this.state!).then(() => this.dispose());
  }

  dispose(): void {
    if (this.phase === 'disposed') return;
    this.phase = 'disposed';
    if (this.state) {
      this.zoom.cancelScheduledTransform(this.state);
      this.builder?.dispose(this.state);
    }
    this.ui?.remove();
    this.state = undefined;
    this.builder = undefined;
    this.ui = undefined;
    this.options.onDisposed();
  }
}
