import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../', import.meta.url)) } },
  server: { host: 'localhost', port: 5173, strictPort: true },
});
