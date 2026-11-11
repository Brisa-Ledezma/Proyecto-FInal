import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { consultar, consultarUno } from '../../db.js';
import { conflicto, manejar, noEncontrado, verificarCampos } from '../../utils/errores.js';
import { idValido, textoRequerido, validarContrasena, validarEmail } from '../../utils/validacion.js';

export const rutasPersonal = Router();
const ROLES_PERSONAL = ['ENCARGADO_SALA', 'ADMINISTRADOR'];

const aCuenta = (u, idActual) => ({
  id: u.id_usuario,
  nombre: u.nombre,
  apellido: u.apellido,
  email: u.email,
  rol: u.rol,
  activo: Boolean(u.activo),
  alta: u.creado_en,
  ultimaActividad: u.ultima_actividad,
  esPropia: u.id_usuario === idActual,
});

/** CU-15, paso 2: cuentas del personal con su rol y estado. */
rutasPersonal.get('/', manejar(async (req, res) => {
  const filas = await consultar(
    "SELECT * FROM usuario WHERE rol IN ('ENCARGADO_SALA','ADMINISTRADOR') ORDER BY activo DESC, rol, apellido, nombre",
  );
  res.json(filas.map((u) => aCuenta(u, req.usuario.id_usuario)));
}));

/** RF-17 · CU-15: alta de una cuenta del personal con contraseña provisoria. */
rutasPersonal.post('/', manejar(async (req, res) => {
  const cuerpo = req.body ?? {};
  const errores = {};
  const datos = {
    nombre: textoRequerido(errores, 'nombre', cuerpo.nombre, 'el nombre', { max: 60 }),
    apellido: textoRequerido(errores, 'apellido', cuerpo.apellido, 'el apellido', { max: 60 }),
    email: validarEmail(errores, 'email', cuerpo.email),
    contrasena: validarContrasena(errores, 'contrasena', cuerpo.contrasena),
  };
  if (!ROLES_PERSONAL.includes(cuerpo.rol)) errores.rol = 'Elegí el rol de la cuenta.';
  verificarCampos(errores);

  const existe = await consultarUno('SELECT id_usuario FROM usuario WHERE email = ?', [datos.email]);
  if (existe) verificarCampos({ email: 'Ya existe una cuenta con este correo.' }, 'Ya existe una cuenta con este correo.'); // CU-15 A1

  const r = await consultar(
    `INSERT INTO usuario (nombre, apellido, email, hash_contrasena, rol, correo_verificado, activo)
     VALUES (?, ?, ?, ?, ?, 1, 1)`,
    [datos.nombre, datos.apellido, datos.email, await bcrypt.hash(datos.contrasena, 10), cuerpo.rol],
  );
  const cuenta = await consultarUno('SELECT * FROM usuario WHERE id_usuario = ?', [r.insertId]);
  res.status(201).json(aCuenta(cuenta, req.usuario.id_usuario));
}));

/** Desactiva una cuenta: desde ese momento no puede iniciar sesión (RF-17). */
rutasPersonal.post('/:id/desactivar', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  if (id === req.usuario.id_usuario) throw conflicto('No podés desactivar tu propia cuenta.', { codigo: 'CUENTA_PROPIA' }); // CU-15 A2
  const r = await consultar("UPDATE usuario SET activo = 0 WHERE id_usuario = ? AND rol IN ('ENCARGADO_SALA','ADMINISTRADOR')", [id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos esta cuenta.');
  res.json({ activo: false });
}));

rutasPersonal.post('/:id/activar', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const r = await consultar("UPDATE usuario SET activo = 1 WHERE id_usuario = ? AND rol IN ('ENCARGADO_SALA','ADMINISTRADOR')", [id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos esta cuenta.');
  res.json({ activo: true });
}));
