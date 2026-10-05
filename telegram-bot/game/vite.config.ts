import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const shared = fileURLToPath(new URL('../webapp/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Reuse the web app's .env (VITE_API_BASE, VITE_APP_SECRET) — one config, two clients.
  envDir: '../webapp',
  // Inline empty PostCSS config so Vite does not pick up the Tailwind config further up the tree.
  css: { postcss: {} },
  resolve: {
    alias: { '@shared': shared },
    // Shared modules live under ../webapp and would otherwise load a second React from its node_modules.
    dedupe: ['react', 'react-dom'],
  },
  // Tauri serves dist/ from its own origin; relative asset URLs keep that working.
  base: './',
  server: { port: 5174, strictPort: true, fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.ts'] },
});
