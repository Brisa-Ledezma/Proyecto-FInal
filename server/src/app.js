import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));
export const carpetaUploads = path.resolve(raiz, '../uploads');

export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/salud', (req, res) => {
    res.json({ estado: 'ok', servicio: 'Golden Screen API' });
  });

  app.use('/uploads', express.static(carpetaUploads, { maxAge: '7d' }));

  app.use('/api', rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
