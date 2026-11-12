import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { carpetaCliente } from './rutas.js';
import { pool } from './db.js';
import { servirUpload } from './middlewares/subidas.js';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { cargarUsuario, middlewareSesion } from './middlewares/sesion.js';
import { rutasAuth } from './modulos/usuarios/auth.rutas.js';
import { rutasCartelera } from './modulos/cartelera/cartelera.rutas.js';
import { rutasReservas } from './modulos/reservas/reservas.rutas.js';
import { rutasPagos } from './modulos/pagos/pagos.rutas.js';
import { rutasControl } from './modulos/entradas/control.rutas.js';
import { rutasAdmin } from './modulos/administracion/admin.rutas.js';


export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Estado del servicio y de la base. Lo usan el pipeline de despliegue, el chequeo
  // de salud de Render y el workflow que mantiene la API despierta.
  app.get('/api/salud', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ estado: 'ok', servicio: 'Golden Screen API', base: 'ok' });
    } catch {
      res.status(503).json({ estado: 'error', servicio: 'Golden Screen API', base: 'sin conexión' });
    }
  });

  // RNF-01: en producción toda solicitud HTTP se redirige a HTTPS. El proxy del
  // hosting termina el TLS y avisa el protocolo original en X-Forwarded-Proto.
  if (config.produccion) {
    app.use((req, res, next) => (req.headers['x-forwarded-proto'] === 'http'
      ? res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
      : next()));
  }

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: config.produccion
      ? { directives: { 'img-src': ["'self'", 'data:', 'blob:'] } } // blob: vista previa del afiche
      : false,
  }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/uploads/:nombre', servirUpload);

  app.use('/api', middlewareSesion, cargarUsuario);
  app.use('/api/auth', rutasAuth);
  app.use('/api', rutasCartelera);
  app.use('/api', rutasReservas);
  app.use('/api', rutasPagos);
  app.use('/api', rutasControl);
  app.use('/api/admin', rutasAdmin);

  app.use('/api', rutaNoEncontrada);

  // En producción la API también sirve el front-end compilado.
  if (config.produccion) {
    app.use(express.static(carpetaCliente, { maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(carpetaCliente, 'index.html')));
  }

  app.use(manejadorErrores);
  return app;
}
