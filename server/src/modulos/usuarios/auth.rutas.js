import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { consultar, consultarUno } from '../../db.js';
import { conflicto, manejar, solicitudInvalida, ErrorHttp, verificarCampos, noEncontrado } from '../../utils/errores.js';
import { edadCumplida, esFechaValida } from '../../utils/fechas.js';
import { generarToken } from '../../utils/codigos.js';
import { textoRequerido, validarContrasena, validarEmail } from '../../utils/validacion.js';
import { enviarConfirmacionCuenta } from '../../servicios/correo.js';
import { cancelarPendientesDeUsuario } from '../reservas/reservas.servicio.js';

export const rutasAuth = Router();

const publico = (u) => ({
  id: u.id_usuario,
  nombre: u.nombre,
  apellido: u.apellido,
  email: u.email,
  rol: u.rol,
});

function iniciarSesion(req, usuario) {
  return new Promise((resolver, rechazar) => {
    req.session.regenerate((error) => {
      if (error) return rechazar(error);
      req.session.idUsuario = usuario.id_usuario;
      req.session.save((e) => (e ? rechazar(e) : resolver()));
    });
  });
}

/** Sesión actual. Devuelve usuario null si no hay sesión (la cartelera es pública). */
rutasAuth.get('/sesion', (req, res) => {
  res.json({ usuario: req.usuario ? publico(req.usuario) : null, minutosSesion: config.reglas.minutosSesion });
});

/** RF-01 · CU-01: registro de espectadores. */
rutasAuth.post('/registro', manejar(async (req, res) => {
  const { nombre, apellido, email, fechaNacimiento, contrasena, aceptaPrivacidad } = req.body ?? {};
  const errores = {};
  const datos = {
    nombre: textoRequerido(errores, 'nombre', nombre, 'tu nombre', { max: 60 }),
    apellido: textoRequerido(errores, 'apellido', apellido, 'tu apellido', { max: 60 }),
    email: validarEmail(errores, 'email', email),
    contrasena: validarContrasena(errores, 'contrasena', contrasena),
  };
  if (!fechaNacimiento || !esFechaValida(fechaNacimiento)) {
    errores.fechaNacimiento = 'Ingresá tu fecha de nacimiento.';
  } else if (edadCumplida(fechaNacimiento) < config.reglas.edadMinima) {
    errores.fechaNacimiento = 'Para registrarte tenés que tener 16 años o más.';
  } else if (edadCumplida(fechaNacimiento) > 110) {
    errores.fechaNacimiento = 'Revisá la fecha de nacimiento.';
  }
  if (aceptaPrivacidad !== true) errores.aceptaPrivacidad = 'Para crear la cuenta tenés que aceptar la política de privacidad.';
  verificarCampos(errores);

  const existente = await consultarUno('SELECT id_usuario FROM usuario WHERE email = ?', [datos.email]);
  if (existente) {
    throw conflicto('Ya existe una cuenta con este correo.', {
      codigo: 'CORREO_EXISTENTE',
      campos: { email: 'Ya existe una cuenta con este correo. Probá iniciar sesión.' },
    });
  }

  const token = generarToken();
  const hash = await bcrypt.hash(datos.contrasena, 10);
  const resultado = await consultar(
    `INSERT INTO usuario (nombre, apellido, email, fecha_nacimiento, hash_contrasena, rol, correo_verificado, token_verificacion, acepto_privacidad_en)
     VALUES (?, ?, ?, ?, ?, 'ESPECTADOR', 0, ?, NOW())`,
    [datos.nombre, datos.apellido, datos.email, fechaNacimiento, hash, token],
  );

  await enviarConfirmacionCuenta({ nombre: datos.nombre, email: datos.email }, token);
  res.status(201).json({ id: resultado.insertId, email: datos.email });
}));

/** Confirmación del correo: activa la cuenta e inicia la sesión (CU-01, paso 5). */
rutasAuth.post('/verificar', manejar(async (req, res) => {
  const token = String(req.body?.token ?? '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw solicitudInvalida('El enlace de confirmación no es válido.');
  const usuario = await consultarUno('SELECT * FROM usuario WHERE token_verificacion = ?', [token]);
  if (!usuario) throw noEncontrado('El enlace ya fue usado o no es válido. Si ya confirmaste tu cuenta, iniciá sesión.');
  await consultar('UPDATE usuario SET correo_verificado = 1, token_verificacion = NULL WHERE id_usuario = ?', [usuario.id_usuario]);
  await iniciarSesion(req, usuario);
  res.json({ usuario: publico(usuario) });
}));

/** Reenvío del correo de confirmación (CU-02, A2). */
rutasAuth.post('/reenviar-confirmacion', manejar(async (req, res) => {
  const errores = {};
  const email = validarEmail(errores, 'email', req.body?.email);
  verificarCampos(errores);
  const usuario = await consultarUno('SELECT id_usuario, nombre, email, correo_verificado FROM usuario WHERE email = ?', [email]);
  if (usuario && !usuario.correo_verificado) {
    const token = generarToken();
    await consultar('UPDATE usuario SET token_verificacion = ? WHERE id_usuario = ?', [token, usuario.id_usuario]);
    await enviarConfirmacionCuenta(usuario, token);
  }
  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  res.json({ mensaje: 'Si la cuenta existe y no está confirmada, te enviamos un nuevo correo.' });
}));

/** RF-02 · CU-02: inicio de sesión. */
rutasAuth.post('/login', manejar(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const contrasena = String(req.body?.contrasena ?? req.body?.password ?? '');
  const errores = {};
  if (!email) errores.email = 'Completá tu correo electrónico.';
  if (!contrasena) errores.contrasena = 'Completá tu contraseña.';
  verificarCampos(errores);

  const usuario = await consultarUno('SELECT * FROM usuario WHERE email = ?', [email]);
  const coincide = usuario ? await bcrypt.compare(contrasena, usuario.hash_contrasena) : false;
  if (!usuario || !coincide) {
    // Mensaje genérico: no indica si falló el correo o la contraseña (RF-02).
    throw new ErrorHttp(401, 'El correo o la contraseña no son correctos.', { codigo: 'CREDENCIALES' });
  }
  if (!usuario.activo) {
    throw new ErrorHttp(403, 'Esta cuenta está desactivada. Consultá con la administración del cine.', { codigo: 'CUENTA_DESACTIVADA' });
  }
  if (!usuario.correo_verificado) {
    throw new ErrorHttp(403, 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada o pedí un nuevo correo de confirmación.', { codigo: 'CUENTA_SIN_VERIFICAR' });
  }

  await iniciarSesion(req, usuario);
  await consultar('UPDATE usuario SET ultima_actividad = NOW() WHERE id_usuario = ?', [usuario.id_usuario]);
  res.json({ usuario: publico(usuario) });
}));

/** Cierre de sesión: cancela la reserva pendiente y libera sus butacas (RF-06). */
rutasAuth.post('/logout', manejar(async (req, res) => {
  const id = req.session?.idUsuario;
  let canceladas = 0;
  if (id) canceladas = await cancelarPendientesDeUsuario(id);
  req.session.destroy(() => {
    res.clearCookie('gs.sid');
    res.json({ reservasCanceladas: canceladas });
  });
}));
