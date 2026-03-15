import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Image Zoom Lightbox',
    version: '2.0.0',
    description:
      'Open an Edge-like image zoom lightbox with a configurable double-press shortcut while hovering an image.',
    permissions: ['storage'],
    action: {
      default_title: 'Image Zoom Lightbox',
    },
    icons: {
      '16': 'images/icon-16.png',
      '32': 'images/icon-32.png',
      '48': 'images/icon-48.png',
      '128': 'images/icon-128.png',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none';",
    },
    browser_specific_settings: {
      gecko: {
        id: 'image-zoom-lightbox@jasminemixson.com',
        strict_min_version: '109.0',
        // @ts-ignore - WXT doesn't support this field yet
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
