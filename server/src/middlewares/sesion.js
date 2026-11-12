import session from 'express-session';
import crearAlmacen from 'express-mysql-session';
import { config } from '../config.js';
import { pool, consultar, consultarUno } from '../db.js';
import { noAutenticado, prohibido } from '../utils/errores.js';

const AlmacenMySQL = crearAlmacen(session);
const DURACION_MS = config.reglas.minutosSesion * 60 * 1000;

/**
 * Sesión con cookie HttpOnly que vence a los 30 minutos sin actividad (RNF-04).
 * "rolling" renueva el vencimiento en cada solicitud.
 */
export const middlewareSesion = session({
  name: 'gs.sid',
  secret: config.sessionSecret,
  store: new AlmacenMySQL({ clearExpired: true, checkExpirationInterval: 60000, expiration: DURACION_MS }, pool),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  // secure 'auto': la cookie es Secure cuando la conexión original es HTTPS (en la nube,
  // según X-Forwarded-Proto del proxy) y también se puede probar por http://localhost.
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: DURACION_MS },
});

const ultimaEscritura = new Map();

/** Carga el usuario de la sesión en req.usuario y registra su actividad (RN-02). */
export async function cargarUsuario(req, res, next) {
  try {
    const id = req.session?.idUsuario;
    if (!id) return next();
    const usuario = await consultarUno(
      'SELECT id_usuario, nombre, apellido, email, rol, activo, correo_verificado FROM usuario WHERE id_usuario = ?',
      [id],
    );
    if (!usuario || !usuario.activo) {
      req.session.destroy(() => {});
      return next();
    }
    req.usuario = usuario;

    // Se guarda la última actividad como mucho cada 20 segundos por usuario.
    const ahora = Date.now();
    if (ahora - (ultimaEscritura.get(id) ?? 0) > 20000) {
      ultimaEscritura.set(id, ahora);
      await consultar('UPDATE usuario SET ultima_actividad = NOW() WHERE id_usuario = ?', [id]);
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requerirSesion(req, res, next) {
  if (!req.usuario) return next(noAutenticado());
  next();
}

/** Control de acceso por rol aplicado en la API (RNF-03). */
export const requerirRol = (...roles) => (req, res, next) => {
  if (!req.usuario) return next(noAutenticado());
  if (!roles.includes(req.usuario.rol)) return next(prohibido());
  next();
};

export const ROLES = { ESPECTADOR: 'ESPECTADOR', ENCARGADO: 'ENCARGADO_SALA', ADMIN: 'ADMINISTRADOR' };
