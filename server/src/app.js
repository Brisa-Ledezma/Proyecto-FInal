import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { cargarUsuario, middlewareSesion } from './middlewares/sesion.js';
import { rutasAuth } from './modulos/usuarios/auth.rutas.js';
import { rutasCartelera } from './modulos/cartelera/cartelera.rutas.js';
import { rutasReservas } from './modulos/reservas/reservas.rutas.js';
import { rutasPagos } from './modulos/pagos/pagos.rutas.js';
import { rutasControl } from './modulos/entradas/control.rutas.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));
export const carpetaUploads = path.resolve(raiz, '../uploads');
const carpetaCliente = path.resolve(raiz, '../../client/dist');

export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // RNF-01: en producción toda solicitud HTTP se redirige a HTTPS.
  if (config.produccion) {
    app.use((req, res, next) => (req.secure ? next() : res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)));
  }

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: config.produccion ? undefined : false,
  }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/salud', (req, res) => res.json({ estado: 'ok', servicio: 'Golden Screen API' }));
  app.use('/uploads', express.static(carpetaUploads, { maxAge: '7d' }));

  app.use('/api', middlewareSesion, cargarUsuario);
  app.use('/api/auth', rutasAuth);
  app.use('/api', rutasCartelera);
  app.use('/api', rutasReservas);
  app.use('/api', rutasPagos);
  app.use('/api', rutasControl);

  app.use('/api', rutaNoEncontrada);

  // En producción la API también sirve el front-end compilado.
  if (config.produccion) {
    app.use(express.static(carpetaCliente, { maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(carpetaCliente, 'index.html')));
  }

  app.use(manejadorErrores);
  return app;
}
