import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development, requests to /api/* are proxied to the
// backend on port 4000, so the frontend never needs to know the
// backend's real URL until it's deployed (see .env.production).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
