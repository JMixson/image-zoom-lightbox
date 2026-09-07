import { ViewerSession } from '@/viewer/session';
import { DEFAULT_THEME_SETTINGS } from '@/utils/settings';
import css from '@/entrypoints/content/style.css?inline';

let session: ViewerSession | null = null;

async function open(broken = false, hideControls = false) {
  session?.dispose();
  const next = new ViewerSession({
    createUi: async () => {
      const host = document.createElement('viewer-fixture');
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = css;
      const uiContainer = document.createElement('div');
      shadow.append(style, uiContainer);
      return { uiContainer, mount: () => { document.body.append(host); }, remove: () => host.remove() };
    },
    getImageOptions: () => ({
      imageSrc: broken ? '/missing-image.png' : '/images/default-lightbox.jpg',
      imageAlt: 'Lightbox example', themeSettings: DEFAULT_THEME_SETTINGS,
      hideControlsByDefault: hideControls,
    }),
    onDisposed: () => { if (session === next) session = null; },
  });
  session = next;
  await next.open();
}

document.querySelector('#open')!.addEventListener('click', () => { void open(); });
document.querySelector('#error')!.addEventListener('click', () => { void open(true); });
document.querySelector('#hidden')!.addEventListener('click', () => { void open(false, true); });
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') session?.close();
  if (event.key === 'h') session?.toggleControls();
});
