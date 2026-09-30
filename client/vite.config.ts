import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend usa rutas relativas (/api/...) y Vite las proxya a la API,
// así el navegador nunca necesita conocer el puerto del backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // El preview del entorno llega con un host dinámico: lo permitimos en dev.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
