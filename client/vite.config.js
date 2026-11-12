import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// En modo "movil" el sitio se sirve por HTTPS en la red local, para abrirlo
// desde el celular y poder usar la cámara en el control de ingreso (RF-10).
// En Docker la API no está en localhost sino en el servicio "api" (ver docker-compose.yml).
const api = process.env.API_PROXY ?? 'http://localhost:3001';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'movil' ? [basicSsl()] : [])],
  server: {
    port: 5173,
    // En Windows y macOS los cambios de archivos no llegan al contenedor por eventos.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    proxy: {
      '/api': api,
      '/uploads': api,
    },
  },
}));
