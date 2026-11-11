import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// En modo "movil" el sitio se sirve por HTTPS en la red local, para abrirlo
// desde el celular y poder usar la cámara en el control de ingreso (RF-10).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'movil' ? [basicSsl()] : [])],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
}));
