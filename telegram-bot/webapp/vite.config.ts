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
    // Hot reload talks to the page's own origin by default. Only when the dev
    // server is fronted by an HTTPS tunnel does it have to be told the public
    // port — hardcoding it made a plain http://localhost:5173 session retry
    // wss://localhost:443 forever and fill the console with connection errors.
    // Set VITE_TUNNEL=1 alongside cloudflared.
    hmr: process.env.VITE_TUNNEL ? { clientPort: 443, protocol: 'wss' as const } : undefined,
  },
});
