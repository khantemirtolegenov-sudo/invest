import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Фронтенд на :5184, запросы /api проксируются на backend :5185.
// Второй проект на той же машине: APP_PORT=5194 API_TARGET=http://localhost:5195 npm run dev --prefix app
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.APP_PORT || 5184),
    strictPort: true,
    proxy: { '/api': process.env.API_TARGET || 'http://localhost:5185' },
  },
});
