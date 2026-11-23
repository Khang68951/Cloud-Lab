import { fileURLToPath, URL } from 'node:url';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Lesson content (packages/content/**/*.mdx) → React components.
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react', remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // The API runs on :8787 — proxying keeps everything same-origin (no CORS).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
