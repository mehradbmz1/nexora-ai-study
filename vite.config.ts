import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleDevApi } from './server/devApi.ts'

function apiPlugin(): Plugin {
  return {
    name: 'nexora-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleDevApi(req, res);
          if (!handled) next();
        } catch (err) {
          console.error('API Error:', err);
          next(err);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // Allow Cloudflare Tunnel host headers
  },
  plugins: [
    apiPlugin(),
    react(),
    tailwindcss(),
  ],
})
