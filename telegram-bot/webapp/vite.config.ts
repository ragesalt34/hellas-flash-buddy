import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server is fronted by a cloudflared tunnel (HTTPS) so Telegram can load it.
// `/api` is proxied to the bot's Express server.
export default defineConfig({
  plugins: [react()],
  // Inline (empty) PostCSS config so Vite does not walk up the tree and pick up
  // the sibling project's Tailwind postcss.config.js.
  css: { postcss: {} },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
});
