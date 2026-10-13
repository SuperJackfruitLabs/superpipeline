import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { PORTS } from './scripts/ports';

const API = PORTS.apiUrl;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: PORTS.web,
    strictPort: true,
    // Proxy API + live WebSocket to the Worker dev server (`wrangler dev`, SP_API_PORT, default :8787).
    proxy: {
      '/v1': { target: API, changeOrigin: true, ws: true },
      '/auth': { target: API, changeOrigin: true },
      // The hub token handoff (apps/api/src/auth/hub-oauth.ts). Same reason as /auth: these are
      // Worker routes, and the dev server would otherwise answer them with the SPA.
      '/hub': { target: API, changeOrigin: true },
      '/mcp': { target: API, changeOrigin: true },
      '/health': { target: API, changeOrigin: true },
    },
  },
});
